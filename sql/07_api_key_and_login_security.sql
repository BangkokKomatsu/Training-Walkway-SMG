-- =============================================================================
-- 07_api_key_and_login_security.sql  |  รันหลัง 04_create_stored_procedures.sql
-- เพิ่ม: API key ต่อบริษัท (สำหรับ external read-only API + billing),
--        usage log, และการป้องกัน brute-force login
-- =============================================================================

-- -----------------------------------------------------------------------
-- mst_company — เพิ่ม API key (เก็บเป็น SHA-256 hash เท่านั้น ไม่เก็บ plain text)
-- -----------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('smg.mst_company') AND name = 'api_key_hash')
    ALTER TABLE smg.mst_company ADD api_key_hash NVARCHAR(64) NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('smg.mst_company') AND name = 'api_key_created_at')
    ALTER TABLE smg.mst_company ADD api_key_created_at DATETIME2 NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('smg.mst_company') AND name = 'api_key_is_active')
    ALTER TABLE smg.mst_company ADD api_key_is_active BIT NOT NULL DEFAULT 0;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_company_api_key_hash')
    CREATE UNIQUE NONCLUSTERED INDEX IX_company_api_key_hash
        ON smg.mst_company (api_key_hash)
        WHERE api_key_hash IS NOT NULL;
GO

-- -----------------------------------------------------------------------
-- mst_user — เพิ่ม lockout สำหรับป้องกัน brute-force login
-- -----------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('smg.mst_user') AND name = 'failed_login_count')
    ALTER TABLE smg.mst_user ADD failed_login_count INT NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('smg.mst_user') AND name = 'locked_until')
    ALTER TABLE smg.mst_user ADD locked_until DATETIME2 NULL;
GO

-- -----------------------------------------------------------------------
-- trn_api_usage_log — log ทุกครั้งที่ external company เรียก /api/public/v1/*
-- ใช้เพื่อ monitor/security เท่านั้น ไม่ใช่ตัวเลขที่ใช้คิดเงิน (คิดเงินจากจำนวนกล้อง)
-- เก็บ 180 วันแล้ว purge ด้วย sp_purge_api_usage_log
-- -----------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id
               WHERE s.name = 'smg' AND t.name = 'trn_api_usage_log')
CREATE TABLE smg.trn_api_usage_log (
    log_id          BIGINT          NOT NULL IDENTITY(1,1),
    company_code    NVARCHAR(20)    NOT NULL,
    endpoint        NVARCHAR(200)   NOT NULL,
    http_method     NVARCHAR(10)    NOT NULL,
    status_code     INT             NOT NULL,
    ip_address      NVARCHAR(50)    NULL,
    called_at       DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_trn_api_usage_log PRIMARY KEY (log_id),
    CONSTRAINT FK_api_usage_company FOREIGN KEY (company_code) REFERENCES smg.mst_company(company_code)
);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_api_usage_company_called')
    CREATE NONCLUSTERED INDEX IX_api_usage_company_called
        ON smg.trn_api_usage_log (company_code, called_at DESC)
        INCLUDE (endpoint, status_code);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_api_usage_called_at')
    CREATE NONCLUSTERED INDEX IX_api_usage_called_at
        ON smg.trn_api_usage_log (called_at);   -- ใช้ตอน purge (ไม่กรอง company_code)
GO


-- ===========================================================================
-- smg.sp_login  (แก้ไข — เพิ่ม failed_login_count, locked_until ให้ data-api เช็ค lockout)
-- ===========================================================================
CREATE OR ALTER PROCEDURE smg.sp_login
    @username NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        u.user_id,
        u.company_code,
        u.username,
        u.full_name,
        u.password_hash,
        u.role_id,
        r.role_name,
        u.is_super_admin,
        u.is_active,
        u.must_change_password,
        u.failed_login_count,
        u.locked_until
    FROM smg.mst_user u
    JOIN smg.mst_role r ON u.role_id = r.role_id
    WHERE u.username = @username;
END;
GO


-- ===========================================================================
-- smg.sp_record_failed_login
-- เรียกทุกครั้งที่ login ผิด — ผิดครบ 5 ครั้งติดกัน ล็อก account 15 นาที
-- ===========================================================================
CREATE OR ALTER PROCEDURE smg.sp_record_failed_login
    @username NVARCHAR(100)
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @max_attempts INT = 5;
    DECLARE @lockout_minutes INT = 15;

    UPDATE smg.mst_user
    SET failed_login_count = failed_login_count + 1,
        locked_until = CASE
            WHEN failed_login_count + 1 >= @max_attempts
                THEN DATEADD(MINUTE, @lockout_minutes, SYSUTCDATETIME())
            ELSE locked_until
        END
    WHERE username = @username;
END;
GO


-- ===========================================================================
-- smg.sp_reset_login_lockout
-- เรียกหลัง login สำเร็จ — เคลียร์ตัวนับ
-- ===========================================================================
CREATE OR ALTER PROCEDURE smg.sp_reset_login_lockout
    @user_id INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE smg.mst_user
    SET failed_login_count = 0,
        locked_until = NULL
    WHERE user_id = @user_id;
END;
GO


-- ===========================================================================
-- smg.sp_regenerate_company_api_key
-- Admin กด "Regenerate" — data-api สร้าง key จริง + hash (SHA-256) แล้วส่ง hash มาเก็บ
-- key จริงโชว์ให้เห็นครั้งเดียวตอน response ของ data-api ไม่เก็บ plain text ใน DB
-- ===========================================================================
CREATE OR ALTER PROCEDURE smg.sp_regenerate_company_api_key
    @company_code   NVARCHAR(20),
    @api_key_hash   NVARCHAR(64)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE smg.mst_company
    SET api_key_hash = @api_key_hash,
        api_key_created_at = SYSUTCDATETIME(),
        api_key_is_active = 1
    WHERE company_code = @company_code;
END;
GO


-- ===========================================================================
-- smg.sp_get_company_api_key_info
-- โหลดสถานะ key ของบริษัทตัวเอง (ไม่คืน hash) — ใช้แสดงหน้า Settings
-- ===========================================================================
CREATE OR ALTER PROCEDURE smg.sp_get_company_api_key_info
    @company_code NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT company_code, api_key_created_at, api_key_is_active
    FROM smg.mst_company
    WHERE company_code = @company_code;
END;
GO


-- ===========================================================================
-- smg.sp_verify_api_key
-- data-api เรียกทุก request เข้า /api/public/v1/* เพื่อแปลง key -> company_code
-- ===========================================================================
CREATE OR ALTER PROCEDURE smg.sp_verify_api_key
    @api_key_hash NVARCHAR(64)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT company_code, company_name
    FROM smg.mst_company
    WHERE api_key_hash = @api_key_hash
        AND api_key_is_active = 1
        AND is_active = 1;
END;
GO


-- ===========================================================================
-- smg.sp_log_api_usage
-- บันทึกทุกครั้งที่ /api/public/v1/* ถูกเรียก (สำหรับ monitor/security)
-- ===========================================================================
CREATE OR ALTER PROCEDURE smg.sp_log_api_usage
    @company_code   NVARCHAR(20),
    @endpoint       NVARCHAR(200),
    @http_method    NVARCHAR(10),
    @status_code    INT,
    @ip_address     NVARCHAR(50) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    INSERT INTO smg.trn_api_usage_log (company_code, endpoint, http_method, status_code, ip_address)
    VALUES (@company_code, @endpoint, @http_method, @status_code, @ip_address);
END;
GO


-- ===========================================================================
-- smg.sp_get_api_usage_summary
-- สรุปจำนวนครั้งที่เรียก /api/public/v1/* แยกตาม endpoint — ให้ company admin ดูของตัวเอง
-- @company_code = NULL คือ Super Admin ดูทุกบริษัท
-- ===========================================================================
CREATE OR ALTER PROCEDURE smg.sp_get_api_usage_summary
    @company_code   NVARCHAR(20) = NULL,
    @date_from      DATE         = NULL,
    @date_to        DATE         = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        company_code,
        endpoint,
        COUNT(*) AS call_count,
        MAX(called_at) AS last_called_at
    FROM smg.trn_api_usage_log
    WHERE
        (@company_code IS NULL OR company_code = @company_code)
        AND (@date_from IS NULL OR CAST(called_at AS DATE) >= @date_from)
        AND (@date_to   IS NULL OR CAST(called_at AS DATE) <= @date_to)
    GROUP BY company_code, endpoint
    ORDER BY company_code, call_count DESC;
END;
GO


-- ===========================================================================
-- smg.sp_get_billing_overview
-- Super Admin ใช้ดูภาพรวมทุกบริษัทเพื่อคิดค่าบริการ — snapshot ปัจจุบัน ไม่ prorate
-- ===========================================================================
CREATE OR ALTER PROCEDURE smg.sp_get_billing_overview
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        c.company_code,
        c.company_name,
        c.is_active,
        c.api_key_is_active,
        c.api_key_created_at,
        (SELECT COUNT(*) FROM smg.mst_camera cam
            WHERE cam.company_code = c.company_code AND cam.is_active = 1) AS active_camera_count
    FROM smg.mst_company c
    ORDER BY c.company_code;
END;
GO


-- ===========================================================================
-- smg.sp_get_camera_list_public
-- รายชื่อกล้อง สำหรับ /api/public/v1/cameras เท่านั้น — ตัด rtsp_url/ip/username/password ออก
-- (sp_get_camera_status ตัวเดิมมีข้อมูล credential ของกล้อง ห้ามส่งออกนอกระบบ)
-- ===========================================================================
CREATE OR ALTER PROCEDURE smg.sp_get_camera_list_public
    @company_code NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT company_code, camera_no, camera_name, location_name, is_active
    FROM smg.mst_camera
    WHERE company_code = @company_code
    ORDER BY camera_no;
END;
GO


-- ===========================================================================
-- smg.sp_purge_api_usage_log
-- ลบ log เก่ากว่า @retention_days (default 180) — รันผ่าน SQL Agent job รายวัน หรือรันมือ
-- ===========================================================================
CREATE OR ALTER PROCEDURE smg.sp_purge_api_usage_log
    @retention_days INT = 180
AS
BEGIN
    SET NOCOUNT ON;
    DELETE FROM smg.trn_api_usage_log
    WHERE called_at < DATEADD(DAY, -@retention_days, SYSUTCDATETIME());
END;
GO

PRINT '07_api_key_and_login_security.sql completed.';
GO
