-- =============================================================================
-- 02_create_tables.sql  |  รันหลัง 01_create_schema.sql
-- ตาราง: mst_role, mst_company, mst_user, mst_camera,
--         mst_detection_area, mst_config,
--         trn_detection_event, trn_alert_log, trn_system_log
-- ทุกตาราง multi-tenant มี company_code
-- =============================================================================

-- -----------------------------------------------------------------------
-- mst_role  (lookup — ไม่ผูก company เพราะ role เป็น global)
-- -----------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id
               WHERE s.name = 'smg' AND t.name = 'mst_role')
CREATE TABLE smg.mst_role (
    role_id     INT            NOT NULL IDENTITY(1,1),
    role_name   NVARCHAR(50)   NOT NULL,
    CONSTRAINT PK_mst_role PRIMARY KEY (role_id),
    CONSTRAINT UQ_mst_role_name UNIQUE (role_name)
);
GO

-- -----------------------------------------------------------------------
-- mst_company
-- -----------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id
               WHERE s.name = 'smg' AND t.name = 'mst_company')
CREATE TABLE smg.mst_company (
    company_code    NVARCHAR(20)    NOT NULL,
    company_name    NVARCHAR(200)   NOT NULL,
    is_active       BIT             NOT NULL DEFAULT 1,
    created_at      DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_mst_company PRIMARY KEY (company_code)
);
GO

-- -----------------------------------------------------------------------
-- mst_user
-- -----------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id
               WHERE s.name = 'smg' AND t.name = 'mst_user')
CREATE TABLE smg.mst_user (
    user_id         INT             NOT NULL IDENTITY(1,1),
    company_code    NVARCHAR(20)    NOT NULL,
    username        NVARCHAR(100)   NOT NULL,
    full_name       NVARCHAR(200)   NULL,
    password_hash   NVARCHAR(256)   NOT NULL,       -- bcrypt hash (rounds=10)
    role_id         INT             NOT NULL DEFAULT 2,   -- 1=admin, 2=viewer
    is_super_admin  BIT             NOT NULL DEFAULT 0,   -- 1 = เห็นข้อมูลทุกบริษัท (BKC เท่านั้น)
    is_active       BIT             NOT NULL DEFAULT 1,
    created_at      DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_mst_user PRIMARY KEY (user_id),
    CONSTRAINT UQ_mst_user_username UNIQUE (username),    -- username ต้อง unique ทั้งระบบ
    CONSTRAINT FK_mst_user_company FOREIGN KEY (company_code) REFERENCES smg.mst_company(company_code),
    CONSTRAINT FK_mst_user_role    FOREIGN KEY (role_id)       REFERENCES smg.mst_role(role_id)
);
GO

-- -----------------------------------------------------------------------
-- mst_camera
-- -----------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id
               WHERE s.name = 'smg' AND t.name = 'mst_camera')
CREATE TABLE smg.mst_camera (
    company_code    NVARCHAR(20)    NOT NULL,
    camera_no       NVARCHAR(20)    NOT NULL,
    camera_name     NVARCHAR(100)   NOT NULL,
    location_name   NVARCHAR(200)   NOT NULL,
    rtsp_url        NVARCHAR(500)   NOT NULL,   -- เก็บจาก .env จริง ตรงนี้เป็น reference
    is_active       BIT             NOT NULL DEFAULT 1,
    created_at      DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    ip_address      NVARCHAR(50)    NULL,
    rtsp_port       INT             NOT NULL DEFAULT 554,
    username        NVARCHAR(100)   NULL,
    password        NVARCHAR(100)   NULL,
    channel         INT             NOT NULL DEFAULT 1,
    brand           NVARCHAR(50)    NULL,
    stream_type     NVARCHAR(20)    NOT NULL DEFAULT 'sub',
    schedule_json   NVARCHAR(MAX)   NULL,   -- ตารางเวลาเปิด/ปิดตรวจจับของกล้อง (เก็บเป็น JSON) ดู Module 06
    CONSTRAINT PK_mst_camera PRIMARY KEY (company_code, camera_no),
    CONSTRAINT FK_mst_camera_company FOREIGN KEY (company_code) REFERENCES smg.mst_company(company_code)
);
GO

-- -----------------------------------------------------------------------
-- mst_detection_area  (polygon ต่อกล้อง — อาจมีหลาย area ต่อกล้อง)
-- -----------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id
               WHERE s.name = 'smg' AND t.name = 'mst_detection_area')
CREATE TABLE smg.mst_detection_area (
    area_id         INT             NOT NULL IDENTITY(1,1),
    company_code    NVARCHAR(20)    NOT NULL,
    camera_no       NVARCHAR(20)    NOT NULL,
    area_name       NVARCHAR(100)   NOT NULL,
    polygon_json    NVARCHAR(MAX)   NOT NULL,   -- JSON [[x,y],[x,y],...]
    is_active       BIT             NOT NULL DEFAULT 1,
    created_at      DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_mst_detection_area PRIMARY KEY (area_id),
    CONSTRAINT FK_mst_area_camera FOREIGN KEY (company_code, camera_no)
        REFERENCES smg.mst_camera(company_code, camera_no)
);
GO

-- -----------------------------------------------------------------------
-- mst_config  (key-value config ระดับบริษัท)
-- -----------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id
               WHERE s.name = 'smg' AND t.name = 'mst_config')
CREATE TABLE smg.mst_config (
    company_code    NVARCHAR(20)    NOT NULL,
    config_key      NVARCHAR(100)   NOT NULL,
    config_value    NVARCHAR(500)   NOT NULL,
    description     NVARCHAR(500)   NULL,
    updated_at      DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_mst_config PRIMARY KEY (company_code, config_key),
    CONSTRAINT FK_mst_config_company FOREIGN KEY (company_code) REFERENCES smg.mst_company(company_code)
);
GO

-- -----------------------------------------------------------------------
-- trn_detection_event  (event log หลัก)
-- -----------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id
               WHERE s.name = 'smg' AND t.name = 'trn_detection_event')
CREATE TABLE smg.trn_detection_event (
    event_id            BIGINT          NOT NULL IDENTITY(1,1),
    company_code        NVARCHAR(20)    NOT NULL,
    camera_no           NVARCHAR(20)    NOT NULL,
    camera_name         NVARCHAR(100)   NOT NULL,
    location_name       NVARCHAR(200)   NOT NULL,
    detected_class      NVARCHAR(50)    NOT NULL DEFAULT 'person',
    confidence          DECIMAL(5,4)    NOT NULL,           -- 0.0000–1.0000
    event_type          NVARCHAR(50)    NOT NULL,           -- 'INTRUSION' | 'DWELL'
    event_status        NVARCHAR(20)    NOT NULL DEFAULT 'NEW',  -- NEW|REVIEWED|DISMISSED
    detected_at         DATETIME2       NOT NULL,
    image_path          NVARCHAR(500)   NULL,       -- full UNC path (Python ใช้)
    image_name          NVARCHAR(260)   NULL,       -- ชื่อไฟล์เท่านั้น เช่น detection__20260422_182710.jpg
    alert_teams_status  NVARCHAR(20)    NOT NULL DEFAULT 'PENDING', -- PENDING|SENT|FAILED|SKIPPED
    alert_email_status  NVARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    created_at          DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    created_by          NVARCHAR(100)   NOT NULL DEFAULT 'system',
    CONSTRAINT PK_trn_detection_event PRIMARY KEY (event_id),
    CONSTRAINT FK_event_company FOREIGN KEY (company_code) REFERENCES smg.mst_company(company_code)
);
GO

-- -----------------------------------------------------------------------
-- trn_alert_log  (บันทึกผลการส่ง alert แต่ละครั้ง)
-- -----------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id
               WHERE s.name = 'smg' AND t.name = 'trn_alert_log')
CREATE TABLE smg.trn_alert_log (
    log_id          BIGINT          NOT NULL IDENTITY(1,1),
    event_id        BIGINT          NOT NULL,
    company_code    NVARCHAR(20)    NOT NULL,
    alert_channel   NVARCHAR(20)    NOT NULL,   -- TEAMS | EMAIL
    alert_status    NVARCHAR(20)    NOT NULL,   -- SENT | FAILED
    response_code   INT             NULL,
    response_msg    NVARCHAR(500)   NULL,
    sent_at         DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_trn_alert_log PRIMARY KEY (log_id),
    CONSTRAINT FK_alert_event FOREIGN KEY (event_id) REFERENCES smg.trn_detection_event(event_id)
);
GO

-- -----------------------------------------------------------------------
-- trn_system_log  (health / monitor)
-- -----------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.tables t JOIN sys.schemas s ON t.schema_id = s.schema_id
               WHERE s.name = 'smg' AND t.name = 'trn_system_log')
CREATE TABLE smg.trn_system_log (
    log_id          BIGINT          NOT NULL IDENTITY(1,1),
    company_code    NVARCHAR(20)    NOT NULL,
    camera_no       NVARCHAR(20)    NULL,
    log_level       NVARCHAR(10)    NOT NULL,   -- INFO | WARNING | ERROR
    log_message     NVARCHAR(MAX)   NOT NULL,
    logged_at       DATETIME2       NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT PK_trn_system_log PRIMARY KEY (log_id)
);
GO

PRINT '02_create_tables.sql completed.';
GO
