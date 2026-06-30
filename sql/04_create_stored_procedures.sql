-- =============================================================================
-- 04_create_stored_procedures.sql  |  รันหลัง 03_create_indexes.sql
-- Stored Procedures ทั้งหมด — ใช้ CREATE OR ALTER (SQL Server 2016+)
-- ทุก SP ใช้ parameterized อย่างเดียว ห้ามต่อ string SQL เด็ดขาด
-- =============================================================================


-- ===========================================================================
-- smg.sp_insert_detection_event
-- Python เรียกเมื่อเกิด event — คืน event_id ที่เพิ่งสร้าง
-- ===========================================================================
CREATE OR ALTER PROCEDURE smg.sp_insert_detection_event
    @company_code       NVARCHAR(20),
    @camera_no          NVARCHAR(20),
    @camera_name        NVARCHAR(100),
    @location_name      NVARCHAR(200),
    @detected_class     NVARCHAR(50)    = 'person',
    @confidence         DECIMAL(5,4),
    @event_type         NVARCHAR(50),       -- 'INTRUSION' | 'DWELL'
    @image_path         NVARCHAR(500)   = NULL,   -- full UNC path
    @image_name         NVARCHAR(260)   = NULL,   -- ชื่อไฟล์เท่านั้น เช่น detection__20260422_182710.jpg
    @created_by         NVARCHAR(100)   = 'system',
    @event_id           BIGINT          OUTPUT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO smg.trn_detection_event
        (company_code, camera_no, camera_name, location_name,
         detected_class, confidence, event_type,
         image_path, image_name, created_by, detected_at)
    VALUES
        (@company_code, @camera_no, @camera_name, @location_name,
         @detected_class, @confidence, @event_type,
         @image_path, @image_name, @created_by, SYSUTCDATETIME());

    SET @event_id = SCOPE_IDENTITY();
END;
GO


-- ===========================================================================
-- smg.sp_get_detection_events
-- ตาราง event + filter — ใช้ใน dashboard / รายงาน
-- @page_no เริ่มที่ 1, @page_size = 0 คืนทั้งหมด
-- ===========================================================================
CREATE OR ALTER PROCEDURE smg.sp_get_detection_events
    @company_code   NVARCHAR(20)    = NULL,   -- NULL = ทุกบริษัท (Super Admin)
    @camera_no      NVARCHAR(20)    = NULL,
    @date_from      DATE            = NULL,
    @date_to        DATE            = NULL,
    @event_status   NVARCHAR(20)    = NULL,   -- NEW|REVIEWED|DISMISSED
    @event_type     NVARCHAR(50)    = NULL,
    @page_no        INT             = 1,
    @page_size      INT             = 50
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        event_id, company_code, camera_no, camera_name, location_name,
        detected_class, confidence, event_type, event_status,
        detected_at, image_name,
        alert_teams_status, alert_email_status,
        created_at, created_by
    FROM smg.trn_detection_event
    WHERE
        (@company_code IS NULL OR company_code = @company_code)
        AND (@camera_no    IS NULL OR camera_no    = @camera_no)
        AND (@event_status IS NULL OR event_status = @event_status)
        AND (@event_type   IS NULL OR event_type   = @event_type)
        AND (@date_from    IS NULL OR CAST(detected_at AS DATE) >= @date_from)
        AND (@date_to      IS NULL OR CAST(detected_at AS DATE) <= @date_to)
    ORDER BY detected_at DESC
    OFFSET  (CASE WHEN @page_size = 0 THEN 0 ELSE (@page_no - 1) * @page_size END) ROWS
    FETCH NEXT (CASE WHEN @page_size = 0 THEN 2147483647 ELSE @page_size END) ROWS ONLY;
END;
GO


-- ===========================================================================
-- smg.sp_get_detection_event_detail
-- รายละเอียด event เดียว + ประวัติ alert
-- ===========================================================================
CREATE OR ALTER PROCEDURE smg.sp_get_detection_event_detail
    @event_id       BIGINT,
    @company_code   NVARCHAR(20)    = NULL   -- NULL = Super Admin (ไม่จำกัดบริษัท)
AS
BEGIN
    SET NOCOUNT ON;

    -- event หลัก
    SELECT
        e.event_id, e.company_code, e.camera_no, e.camera_name, e.location_name,
        e.detected_class, e.confidence, e.event_type, e.event_status,
        e.detected_at, e.image_path, e.image_name,
        e.alert_teams_status, e.alert_email_status,
        e.created_at, e.created_by
    FROM smg.trn_detection_event e
    WHERE e.event_id = @event_id AND (@company_code IS NULL OR e.company_code = @company_code);

    -- ประวัติ alert
    SELECT
        log_id, alert_channel, alert_status,
        response_code, response_msg, sent_at
    FROM smg.trn_alert_log
    WHERE event_id = @event_id
    ORDER BY sent_at;
END;
GO


-- ===========================================================================
-- smg.sp_get_dashboard_summary
-- ตัวเลขสรุป dashboard: รวม event, แยก status, แยก camera, วันนี้
-- ===========================================================================
CREATE OR ALTER PROCEDURE smg.sp_get_dashboard_summary
    @company_code   NVARCHAR(20)    = NULL,   -- NULL = ทุกบริษัท (Super Admin)
    @date_from      DATE = NULL,
    @date_to        DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. summary รวม
    SELECT
        COUNT(*)                                            AS total_events,
        SUM(CASE WHEN event_status = 'NEW'       THEN 1 ELSE 0 END) AS new_count,
        SUM(CASE WHEN event_status = 'REVIEWED'  THEN 1 ELSE 0 END) AS reviewed_count,
        SUM(CASE WHEN event_status = 'DISMISSED' THEN 1 ELSE 0 END) AS dismissed_count,
        SUM(CASE WHEN CAST(detected_at AS DATE) = CAST(SYSUTCDATETIME() AS DATE) THEN 1 ELSE 0 END) AS today_count,
        SUM(CASE WHEN MONTH(detected_at) = MONTH(SYSUTCDATETIME()) AND YEAR(detected_at) = YEAR(SYSUTCDATETIME()) THEN 1 ELSE 0 END) AS month_count,
        SUM(CASE WHEN event_type = 'INTRUSION'   THEN 1 ELSE 0 END) AS intrusion_count,
        SUM(CASE WHEN event_type = 'DWELL'       THEN 1 ELSE 0 END) AS dwell_count
    FROM smg.trn_detection_event
    WHERE
        (@company_code IS NULL OR company_code = @company_code)
        AND (@date_from IS NULL OR CAST(detected_at AS DATE) >= @date_from)
        AND (@date_to   IS NULL OR CAST(detected_at AS DATE) <= @date_to);

    -- 2. แยกตามกล้อง
    SELECT
        company_code, camera_no, camera_name, location_name,
        COUNT(*)   AS event_count,
        MAX(detected_at) AS last_event_at
    FROM smg.trn_detection_event
    WHERE
        (@company_code IS NULL OR company_code = @company_code)
        AND (@date_from IS NULL OR CAST(detected_at AS DATE) >= @date_from)
        AND (@date_to   IS NULL OR CAST(detected_at AS DATE) <= @date_to)
    GROUP BY company_code, camera_no, camera_name, location_name
    ORDER BY event_count DESC;

    -- 3. อัตราส่ง alert สำเร็จ (จาก log จริง)
    SELECT
        COUNT(*) AS total_alerts,
        SUM(CASE WHEN alert_status = 'SENT' THEN 1 ELSE 0 END) AS success_alerts,
        SUM(CASE WHEN alert_status = 'FAILED' THEN 1 ELSE 0 END) AS failed_alerts
    FROM smg.trn_alert_log
    WHERE
        (@company_code IS NULL OR company_code = @company_code);

    -- 4. Trend 7 วันล่าสุด
    SELECT 
        CAST(detected_at AS DATE) AS event_date,
        camera_no,
        COUNT(*) AS event_count
    FROM smg.trn_detection_event
    WHERE 
        (@company_code IS NULL OR company_code = @company_code)
        AND detected_at >= DATEADD(day, -6, CAST(SYSUTCDATETIME() AS DATE))
    GROUP BY CAST(detected_at AS DATE), camera_no
    ORDER BY event_date ASC, camera_no ASC;
END;
GO


-- ===========================================================================
-- smg.sp_get_camera_status
-- สถานะกล้องทั้งหมดของบริษัท + event ล่าสุดของแต่ละกล้อง
-- ===========================================================================
CREATE OR ALTER PROCEDURE smg.sp_get_camera_status
    @company_code   NVARCHAR(20)    = NULL,   -- NULL = ทุกบริษัท (Super Admin)
    @camera_no      NVARCHAR(20)    = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        c.company_code,
        c.camera_no,
        c.camera_name,
        c.location_name,
        c.is_active,
        c.rtsp_url,
        c.ip_address,
        c.rtsp_port,
        c.username,
        c.password,
        c.channel,
        c.brand,
        c.stream_type,
        last_ev.last_event_at,
        last_ev.last_event_status,
        last_ev.last_event_id
    FROM smg.mst_camera c
    OUTER APPLY (
        SELECT TOP 1
            event_id   AS last_event_id,
            event_status AS last_event_status,
            detected_at  AS last_event_at
        FROM smg.trn_detection_event
        WHERE company_code = c.company_code AND camera_no = c.camera_no
        ORDER BY detected_at DESC
    ) last_ev
    WHERE
        (@company_code IS NULL OR c.company_code = @company_code)
        AND (@camera_no IS NULL OR c.camera_no = @camera_no)
    ORDER BY c.camera_no;
END;
GO


-- ===========================================================================
-- smg.sp_update_alert_status
-- Python เรียกหลังส่ง Teams/Email — อัปเดต event + บันทึก alert log
-- ===========================================================================
CREATE OR ALTER PROCEDURE smg.sp_update_alert_status
    @event_id       BIGINT,
    @company_code   NVARCHAR(20),
    @alert_channel  NVARCHAR(20),   -- TEAMS | EMAIL
    @alert_status   NVARCHAR(20),   -- SENT | FAILED
    @response_code  INT             = NULL,
    @response_msg   NVARCHAR(500)   = NULL
AS
BEGIN
    SET NOCOUNT ON;

    -- อัปเดต column ใน event ตามช่องทาง
    IF @alert_channel = 'TEAMS'
        UPDATE smg.trn_detection_event
        SET alert_teams_status = @alert_status
        WHERE event_id = @event_id AND company_code = @company_code;
    ELSE IF @alert_channel = 'EMAIL'
        UPDATE smg.trn_detection_event
        SET alert_email_status = @alert_status
        WHERE event_id = @event_id AND company_code = @company_code;

    -- บันทึก log ทุกครั้ง
    INSERT INTO smg.trn_alert_log
        (event_id, company_code, alert_channel, alert_status, response_code, response_msg)
    VALUES
        (@event_id, @company_code, @alert_channel, @alert_status, @response_code, @response_msg);
END;
GO


-- ===========================================================================
-- smg.sp_insert_system_log
-- Python เรียกบันทึก health/monitor log
-- ===========================================================================
CREATE OR ALTER PROCEDURE smg.sp_insert_system_log
    @company_code   NVARCHAR(20),
    @camera_no      NVARCHAR(20)    = NULL,
    @log_level      NVARCHAR(10),   -- INFO | WARNING | ERROR
    @log_message    NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO smg.trn_system_log (company_code, camera_no, log_level, log_message)
    VALUES (@company_code, @camera_no, @log_level, @log_message);
END;
GO

-- ===========================================================================
-- smg.sp_login
-- data-api เรียกเพื่อดึงข้อมูล user สำหรับตรวจสอบ password (bcrypt ทำใน Node.js)
-- คืน 1 row — ถ้าไม่พบ username จะไม่มีผลลัพธ์
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
        u.is_active
    FROM smg.mst_user u
    JOIN smg.mst_role r ON u.role_id = r.role_id
    WHERE u.username = @username;
END;
GO


-- ===========================================================================
-- smg.sp_get_alert_log
-- ดึง alert log พร้อม pagination — ใช้ใน data-api /api/alerts
-- ===========================================================================
CREATE OR ALTER PROCEDURE smg.sp_get_alert_log
    @company_code   NVARCHAR(20)    = NULL,   -- NULL = ทุกบริษัท (Super Admin)
    @alert_channel  NVARCHAR(20)    = NULL,   -- TEAMS | EMAIL
    @alert_status   NVARCHAR(20)    = NULL,   -- SENT | FAILED
    @date_from      DATE            = NULL,
    @date_to        DATE            = NULL,
    @page_no        INT             = 1,
    @page_size      INT             = 50
AS
BEGIN
    SET NOCOUNT ON;

    -- result set หลัก
    SELECT
        a.log_id,
        a.event_id,
        a.company_code,
        a.alert_channel,
        a.alert_status,
        a.response_code,
        a.response_msg,
        a.sent_at,
        e.camera_no,
        e.camera_name,
        e.event_type,
        e.detected_at
    FROM smg.trn_alert_log a
    JOIN smg.trn_detection_event e ON a.event_id = e.event_id
    WHERE
        (@company_code IS NULL OR a.company_code = @company_code)
        AND (@alert_channel IS NULL OR a.alert_channel = @alert_channel)
        AND (@alert_status  IS NULL OR a.alert_status  = @alert_status)
        AND (@date_from     IS NULL OR CAST(a.sent_at AS DATE) >= @date_from)
        AND (@date_to       IS NULL OR CAST(a.sent_at AS DATE) <= @date_to)
    ORDER BY a.sent_at DESC
    OFFSET ((@page_no - 1) * @page_size) ROWS
    FETCH NEXT @page_size ROWS ONLY;

    -- total count
    SELECT COUNT(*) AS total
    FROM smg.trn_alert_log a
    WHERE
        (@company_code IS NULL OR a.company_code = @company_code)
        AND (@alert_channel IS NULL OR a.alert_channel = @alert_channel)
        AND (@alert_status  IS NULL OR a.alert_status  = @alert_status)
        AND (@date_from     IS NULL OR CAST(a.sent_at AS DATE) >= @date_from)
        AND (@date_to       IS NULL OR CAST(a.sent_at AS DATE) <= @date_to);
END;
GO


-- ===========================================================================
-- smg.sp_get_company_list
-- Super Admin ใช้โหลด dropdown บริษัท
-- ===========================================================================
CREATE OR ALTER PROCEDURE smg.sp_get_company_list
AS
BEGIN
    SET NOCOUNT ON;
    SELECT company_code, company_name
    FROM smg.mst_company
    WHERE is_active = 1
    ORDER BY company_code;
END;
GO


PRINT '04_create_stored_procedures.sql completed.';
GO
