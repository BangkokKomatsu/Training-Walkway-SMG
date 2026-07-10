-- =============================================================================
-- 07_login_security.sql  |  รันหลัง 04_create_stored_procedures.sql
-- เพิ่ม: การป้องกัน brute-force login (failed_login_count, locked_until + SP ที่เกี่ยวข้อง)
-- =============================================================================

-- -----------------------------------------------------------------------
-- mst_user — เพิ่ม lockout สำหรับป้องกัน brute-force login
-- -----------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('smg.mst_user') AND name = 'failed_login_count')
    ALTER TABLE smg.mst_user ADD failed_login_count INT NOT NULL DEFAULT 0;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('smg.mst_user') AND name = 'locked_until')
    ALTER TABLE smg.mst_user ADD locked_until DATETIME2 NULL;
GO


-- ===========================================================================
-- smg.sp_login  (คืน failed_login_count, locked_until ให้ data-api เช็ค lockout)
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

PRINT '07_login_security.sql completed.';
GO
