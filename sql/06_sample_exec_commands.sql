-- =============================================================================
-- 06_sample_exec_commands.sql  |  ตัวอย่าง EXEC ทุก SP
-- รันเพื่อทดสอบหลัง script 01-05 ผ่านแล้ว
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. sp_insert_detection_event  — Python เรียกตอนเกิด event
-- ---------------------------------------------------------------------------
DECLARE @new_event_id BIGINT;

EXEC smg.sp_insert_detection_event
    @company_code  = 'DEMO',
    @camera_no     = 'CAM-01',
    @camera_name   = N'กล้อง ทางเดิน A',
    @location_name = N'อาคาร 1 ทางเดินสาย A',
    @detected_class = 'person',
    @confidence    = 0.9231,
    @event_type    = 'DWELL',
    @image_path    = '\\10.145.250.26\000-CenterApp\053-SMG-Walkway\DEMO\CAM-01\20260616\detection__20260616_143022.jpg',
    @image_name    = 'detection__20260616_143022.jpg',
    @created_by    = 'system',
    @event_id      = @new_event_id OUTPUT;

SELECT @new_event_id AS inserted_event_id;
GO


-- ---------------------------------------------------------------------------
-- 2. sp_get_detection_events  — ตาราง event พร้อม filter
-- ---------------------------------------------------------------------------
-- ดู event ทั้งหมดของ DEMO เดือน มิ.ย. 2026
EXEC smg.sp_get_detection_events
    @company_code = 'DEMO',
    @date_from    = '2026-06-01',
    @date_to      = '2026-06-30',
    @camera_no    = NULL,
    @event_status = NULL,
    @event_type   = NULL,
    @page_no      = 1,
    @page_size    = 50;
GO

-- ดูเฉพาะ CAM-02 ที่ยัง NEW
EXEC smg.sp_get_detection_events
    @company_code = 'DEMO',
    @camera_no    = 'CAM-02',
    @event_status = 'NEW',
    @page_no      = 1,
    @page_size    = 20;
GO

-- ดูทั้งหมดไม่แบ่งหน้า
EXEC smg.sp_get_detection_events
    @company_code = 'DEMO',
    @page_size    = 0;
GO


-- ---------------------------------------------------------------------------
-- 3. sp_get_detection_event_detail  — รายละเอียด event เดียว
-- ---------------------------------------------------------------------------
EXEC smg.sp_get_detection_event_detail
    @event_id     = 1,
    @company_code = 'DEMO';
GO


-- ---------------------------------------------------------------------------
-- 4. sp_get_dashboard_summary  — ตัวเลขสรุป dashboard
-- ---------------------------------------------------------------------------
-- สรุปทั้งหมดของ DEMO
EXEC smg.sp_get_dashboard_summary
    @company_code = 'DEMO';
GO

-- สรุปเฉพาะสัปดาห์นี้
EXEC smg.sp_get_dashboard_summary
    @company_code = 'DEMO',
    @date_from    = '2026-06-10',
    @date_to      = '2026-06-16';
GO


-- ---------------------------------------------------------------------------
-- 5. sp_get_camera_status  — สถานะกล้องทั้งหมด
-- ---------------------------------------------------------------------------
-- ทุกกล้องของ DEMO
EXEC smg.sp_get_camera_status
    @company_code = 'DEMO';
GO

-- เฉพาะ CAM-02
EXEC smg.sp_get_camera_status
    @company_code = 'DEMO',
    @camera_no    = 'CAM-02';
GO


-- ---------------------------------------------------------------------------
-- 6. sp_update_alert_status  — Python เรียกหลังส่ง alert
-- ---------------------------------------------------------------------------
EXEC smg.sp_update_alert_status
    @event_id      = 1,
    @company_code  = 'DEMO',
    @alert_channel = 'TEAMS',
    @alert_status  = 'SENT',
    @response_code = 200,
    @response_msg  = 'Accepted';
GO

EXEC smg.sp_update_alert_status
    @event_id      = 1,
    @company_code  = 'DEMO',
    @alert_channel = 'EMAIL',
    @alert_status  = 'FAILED',
    @response_code = 550,
    @response_msg  = 'SMTP relay rejected';
GO


-- ---------------------------------------------------------------------------
-- 7. sp_insert_system_log  — health/monitor
-- ---------------------------------------------------------------------------
EXEC smg.sp_insert_system_log
    @company_code = 'DEMO',
    @camera_no    = 'CAM-01',
    @log_level    = 'INFO',
    @log_message  = N'กล้อง CAM-01 เชื่อมต่อสำเร็จ FPS=25';
GO

EXEC smg.sp_insert_system_log
    @company_code = 'DEMO',
    @camera_no    = 'CAM-03',
    @log_level    = 'ERROR',
    @log_message  = N'กล้อง CAM-03 connection timeout หลังจาก retry 3 ครั้ง';
GO

EXEC smg.sp_insert_system_log
    @company_code = 'DEMO',
    @camera_no    = NULL,
    @log_level    = 'WARNING',
    @log_message  = N'Disk usage เกิน 80% บน FILESERVER';
GO

PRINT '06_sample_exec_commands.sql completed — ทดสอบ SP ทั้งหมดสำเร็จ';
GO
