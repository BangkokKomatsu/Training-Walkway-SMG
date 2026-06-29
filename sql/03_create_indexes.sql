-- =============================================================================
-- 03_create_indexes.sql  |  รันหลัง 02_create_tables.sql
-- Index บน column ที่ใช้ filter บ่อย: company_code, camera_no, detected_at, event_status
-- =============================================================================

-- trn_detection_event — ใช้ filter บ่อยสุด
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_event_company_detected')
    CREATE NONCLUSTERED INDEX IX_event_company_detected
        ON smg.trn_detection_event (company_code, detected_at DESC)
        INCLUDE (camera_no, event_status, event_type);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_event_camera')
    CREATE NONCLUSTERED INDEX IX_event_camera
        ON smg.trn_detection_event (company_code, camera_no, detected_at DESC);
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_event_status')
    CREATE NONCLUSTERED INDEX IX_event_status
        ON smg.trn_detection_event (company_code, event_status, detected_at DESC);
GO

-- trn_alert_log — join กับ event
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_alert_event')
    CREATE NONCLUSTERED INDEX IX_alert_event
        ON smg.trn_alert_log (event_id, alert_channel);
GO

-- trn_system_log — query ตาม company + เวลา
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_syslog_company')
    CREATE NONCLUSTERED INDEX IX_syslog_company
        ON smg.trn_system_log (company_code, logged_at DESC)
        INCLUDE (log_level, camera_no);
GO

-- mst_detection_area — query ตาม camera
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_area_camera')
    CREATE NONCLUSTERED INDEX IX_area_camera
        ON smg.mst_detection_area (company_code, camera_no)
        INCLUDE (area_name, polygon_json, is_active);
GO

PRINT '03_create_indexes.sql completed.';
GO
