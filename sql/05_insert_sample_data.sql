-- =============================================================================
-- 05_insert_sample_data.sql  |  รันหลัง 04_create_stored_procedures.sql
-- ข้อมูลตัวอย่างสำหรับ dev/test — ห้ามนำเข้า production โดยไม่ตรวจสอบ
-- =============================================================================

-- -----------------------------------------------------------------------
-- Roles
-- -----------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM smg.mst_role WHERE role_name = 'admin')
    INSERT INTO smg.mst_role (role_name) VALUES ('admin');
IF NOT EXISTS (SELECT 1 FROM smg.mst_role WHERE role_name = 'viewer')
    INSERT INTO smg.mst_role (role_name) VALUES ('viewer');
GO

-- -----------------------------------------------------------------------
-- Companies
-- -----------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM smg.mst_company WHERE company_code = 'BKC')
    INSERT INTO smg.mst_company (company_code, company_name)
    VALUES ('BKC', N'BKC System Management (Super Admin)');

IF NOT EXISTS (SELECT 1 FROM smg.mst_company WHERE company_code = 'DEMO')
    INSERT INTO smg.mst_company (company_code, company_name)
    VALUES ('DEMO', N'Demo Manufacturing Co., Ltd.');

IF NOT EXISTS (SELECT 1 FROM smg.mst_company WHERE company_code = 'ACME')
    INSERT INTO smg.mst_company (company_code, company_name)
    VALUES ('ACME', N'ACME Industrial Co., Ltd.');
GO

-- -----------------------------------------------------------------------
-- Users  (password_hash = bcrypt rounds=10)
-- รหัสผ่าน:
--   bkc_admin  → BKC@Admin2024
--   demo_admin → Walkway@2024
--   demo_view  → Walkway@2024
--   acme_admin → Walkway@2024
--
-- สร้าง hash ใหม่ด้วย: cd data-api && npm run gen-hash <password>
-- -----------------------------------------------------------------------

-- BKC Super Admin  (is_super_admin=1 → เห็นและดูแลข้อมูลทุกบริษัท)
IF NOT EXISTS (SELECT 1 FROM smg.mst_user WHERE username = 'bkc_admin')
    INSERT INTO smg.mst_user (company_code, username, full_name, password_hash, role_id, is_super_admin)
    SELECT 'BKC', 'bkc_admin', N'BKC Administrator',
           '$2a$10$pawlgg24BErshns84toMQuD3fsHJhw2XVbL.heDqHnxxhNH2Hzo16',
           role_id, 1
    FROM smg.mst_role WHERE role_name = 'admin';

-- DEMO company users
IF NOT EXISTS (SELECT 1 FROM smg.mst_user WHERE username = 'demo_admin')
    INSERT INTO smg.mst_user (company_code, username, full_name, password_hash, role_id)
    SELECT 'DEMO', 'demo_admin', N'Demo Admin',
           '$2a$10$6EWtKoKWDhs8/NatpgPwo.no.Fv0XIDpCBi7tTf8pDFC8t7Tp/366',
           role_id FROM smg.mst_role WHERE role_name = 'admin';

IF NOT EXISTS (SELECT 1 FROM smg.mst_user WHERE username = 'demo_view')
    INSERT INTO smg.mst_user (company_code, username, full_name, password_hash, role_id)
    SELECT 'DEMO', 'demo_view', N'Demo Viewer',
           '$2a$10$6EWtKoKWDhs8/NatpgPwo.no.Fv0XIDpCBi7tTf8pDFC8t7Tp/366',
           role_id FROM smg.mst_role WHERE role_name = 'viewer';

-- ACME company users
IF NOT EXISTS (SELECT 1 FROM smg.mst_user WHERE username = 'acme_admin')
    INSERT INTO smg.mst_user (company_code, username, full_name, password_hash, role_id)
    SELECT 'ACME', 'acme_admin', N'ACME Admin',
           '$2a$10$6EWtKoKWDhs8/NatpgPwo.no.Fv0XIDpCBi7tTf8pDFC8t7Tp/366',
           role_id FROM smg.mst_role WHERE role_name = 'admin';
GO

-- -----------------------------------------------------------------------
-- Cameras
-- -----------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM smg.mst_camera WHERE company_code = 'DEMO' AND camera_no = 'CAM-01')
    INSERT INTO smg.mst_camera (company_code, camera_no, camera_name, location_name, rtsp_url)
    VALUES ('DEMO', 'CAM-01', N'กล้อง ทางเดิน A', N'อาคาร 1 ทางเดินสาย A',
            'rtsp://user:pass@192.168.1.101:554/stream1');

IF NOT EXISTS (SELECT 1 FROM smg.mst_camera WHERE company_code = 'DEMO' AND camera_no = 'CAM-02')
    INSERT INTO smg.mst_camera (company_code, camera_no, camera_name, location_name, rtsp_url)
    VALUES ('DEMO', 'CAM-02', N'กล้อง โซน Forklift', N'อาคาร 2 โซน Forklift',
            'rtsp://user:pass@192.168.1.102:554/stream1');

IF NOT EXISTS (SELECT 1 FROM smg.mst_camera WHERE company_code = 'DEMO' AND camera_no = 'CAM-03')
    INSERT INTO smg.mst_camera (company_code, camera_no, camera_name, location_name, rtsp_url)
    VALUES ('DEMO', 'CAM-03', N'กล้อง ประตูหน้า', N'ประตูหน้าโรงงาน',
            'rtsp://user:pass@192.168.1.103:554/stream1');

IF NOT EXISTS (SELECT 1 FROM smg.mst_camera WHERE company_code = 'ACME' AND camera_no = 'CAM-01')
    INSERT INTO smg.mst_camera (company_code, camera_no, camera_name, location_name, rtsp_url)
    VALUES ('ACME', 'CAM-01', N'ACME กล้อง สายพาน', N'โซนสายพานลำเลียง',
            'rtsp://user:pass@10.0.0.201:554/stream1');
GO

-- -----------------------------------------------------------------------
-- Detection Areas (polygon ตัวอย่าง — พิกัด pixel สมมติ 1920x1080)
-- -----------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM smg.mst_detection_area WHERE company_code = 'DEMO' AND camera_no = 'CAM-01' AND area_name = N'พื้นที่อันตราย A1')
    INSERT INTO smg.mst_detection_area (company_code, camera_no, area_name, polygon_json)
    VALUES ('DEMO', 'CAM-01', N'พื้นที่อันตราย A1',
            '[[100,200],[500,200],[500,600],[100,600]]');

IF NOT EXISTS (SELECT 1 FROM smg.mst_detection_area WHERE company_code = 'DEMO' AND camera_no = 'CAM-02' AND area_name = N'โซน Forklift หลัก')
    INSERT INTO smg.mst_detection_area (company_code, camera_no, area_name, polygon_json)
    VALUES ('DEMO', 'CAM-02', N'โซน Forklift หลัก',
            '[[200,150],[900,150],[900,700],[200,700]]');

IF NOT EXISTS (SELECT 1 FROM smg.mst_detection_area WHERE company_code = 'DEMO' AND camera_no = 'CAM-02' AND area_name = N'โซน Forklift สำรอง')
    INSERT INTO smg.mst_detection_area (company_code, camera_no, area_name, polygon_json)
    VALUES ('DEMO', 'CAM-02', N'โซน Forklift สำรอง',
            '[[1000,150],[1700,150],[1700,500],[1000,500]]');
GO

-- -----------------------------------------------------------------------
-- Config
-- -----------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM smg.mst_config WHERE company_code = 'DEMO' AND config_key = 'DWELL_SECONDS')
    INSERT INTO smg.mst_config (company_code, config_key, config_value, description)
    VALUES ('DEMO', 'DWELL_SECONDS', '5', N'วินาทีที่ต้องอยู่ในพื้นที่ก่อนนับเป็น event');

IF NOT EXISTS (SELECT 1 FROM smg.mst_config WHERE company_code = 'DEMO' AND config_key = 'ALERT_COOLDOWN_SECONDS')
    INSERT INTO smg.mst_config (company_code, config_key, config_value, description)
    VALUES ('DEMO', 'ALERT_COOLDOWN_SECONDS', '300', N'วินาทีที่เว้นระหว่างการแจ้งเตือนซ้ำ');
GO

-- -----------------------------------------------------------------------
-- Sample Detection Events (20 events ข้ามหลายวัน สำหรับทดสอบ frontend)
-- -----------------------------------------------------------------------
DECLARE @eid BIGINT;

-- วันที่ 10 มิ.ย. 2026
EXEC smg.sp_insert_detection_event
    @company_code='DEMO', @camera_no='CAM-01', @camera_name=N'กล้อง ทางเดิน A',
    @location_name=N'อาคาร 1 ทางเดินสาย A', @confidence=0.9231, @event_type='DWELL',
    @image_name='detection__20260610_081522.jpg', @created_by='system', @event_id=@eid OUTPUT;
UPDATE smg.trn_detection_event SET detected_at='2026-06-10 08:15:22', event_status='REVIEWED',
    alert_teams_status='SENT', alert_email_status='SENT' WHERE event_id=@eid;

EXEC smg.sp_insert_detection_event
    @company_code='DEMO', @camera_no='CAM-02', @camera_name=N'กล้อง โซน Forklift',
    @location_name=N'อาคาร 2 โซน Forklift', @confidence=0.8754, @event_type='INTRUSION',
    @image_name='detection__20260610_094205.jpg', @created_by='system', @event_id=@eid OUTPUT;
UPDATE smg.trn_detection_event SET detected_at='2026-06-10 09:42:05', event_status='REVIEWED',
    alert_teams_status='SENT', alert_email_status='SENT' WHERE event_id=@eid;

EXEC smg.sp_insert_detection_event
    @company_code='DEMO', @camera_no='CAM-01', @camera_name=N'กล้อง ทางเดิน A',
    @location_name=N'อาคาร 1 ทางเดินสาย A', @confidence=0.7654, @event_type='DWELL',
    @image_name='detection__20260610_142211.jpg', @created_by='system', @event_id=@eid OUTPUT;
UPDATE smg.trn_detection_event SET detected_at='2026-06-10 14:22:11', event_status='DISMISSED',
    alert_teams_status='SENT', alert_email_status='FAILED' WHERE event_id=@eid;

-- วันที่ 12 มิ.ย. 2026
EXEC smg.sp_insert_detection_event
    @company_code='DEMO', @camera_no='CAM-02', @camera_name=N'กล้อง โซน Forklift',
    @location_name=N'อาคาร 2 โซน Forklift', @confidence=0.9512, @event_type='INTRUSION',
    @image_name='detection__20260612_070533.jpg', @created_by='system', @event_id=@eid OUTPUT;
UPDATE smg.trn_detection_event SET detected_at='2026-06-12 07:05:33', event_status='REVIEWED',
    alert_teams_status='SENT', alert_email_status='SENT' WHERE event_id=@eid;

EXEC smg.sp_insert_detection_event
    @company_code='DEMO', @camera_no='CAM-03', @camera_name=N'กล้อง ประตูหน้า',
    @location_name=N'ประตูหน้าโรงงาน', @confidence=0.8123, @event_type='DWELL',
    @image_name='detection__20260612_101849.jpg', @created_by='system', @event_id=@eid OUTPUT;
UPDATE smg.trn_detection_event SET detected_at='2026-06-12 10:18:49', event_status='NEW',
    alert_teams_status='SENT', alert_email_status='PENDING' WHERE event_id=@eid;

EXEC smg.sp_insert_detection_event
    @company_code='DEMO', @camera_no='CAM-01', @camera_name=N'กล้อง ทางเดิน A',
    @location_name=N'อาคาร 1 ทางเดินสาย A', @confidence=0.9045, @event_type='INTRUSION',
    @image_name='detection__20260612_135500.jpg', @created_by='system', @event_id=@eid OUTPUT;
UPDATE smg.trn_detection_event SET detected_at='2026-06-12 13:55:00', event_status='REVIEWED',
    alert_teams_status='SENT', alert_email_status='SENT' WHERE event_id=@eid;

-- วันที่ 14 มิ.ย. 2026
EXEC smg.sp_insert_detection_event
    @company_code='DEMO', @camera_no='CAM-02', @camera_name=N'กล้อง โซน Forklift',
    @location_name=N'อาคาร 2 โซน Forklift', @confidence=0.8832, @event_type='DWELL',
    @image_name='detection__20260614_083015.jpg', @created_by='system', @event_id=@eid OUTPUT;
UPDATE smg.trn_detection_event SET detected_at='2026-06-14 08:30:15', event_status='NEW',
    alert_teams_status='PENDING', alert_email_status='PENDING' WHERE event_id=@eid;

EXEC smg.sp_insert_detection_event
    @company_code='DEMO', @camera_no='CAM-03', @camera_name=N'กล้อง ประตูหน้า',
    @location_name=N'ประตูหน้าโรงงาน', @confidence=0.7201, @event_type='INTRUSION',
    @image_name='detection__20260614_110244.jpg', @created_by='system', @event_id=@eid OUTPUT;
UPDATE smg.trn_detection_event SET detected_at='2026-06-14 11:02:44', event_status='REVIEWED',
    alert_teams_status='SENT', alert_email_status='SENT' WHERE event_id=@eid;

EXEC smg.sp_insert_detection_event
    @company_code='DEMO', @camera_no='CAM-01', @camera_name=N'กล้อง ทางเดิน A',
    @location_name=N'อาคาร 1 ทางเดินสาย A', @confidence=0.9654, @event_type='DWELL',
    @image_name='detection__20260614_154422.jpg', @created_by='system', @event_id=@eid OUTPUT;
UPDATE smg.trn_detection_event SET detected_at='2026-06-14 15:44:22', event_status='DISMISSED',
    alert_teams_status='FAILED', alert_email_status='SENT' WHERE event_id=@eid;

-- วันที่ 15 มิ.ย. 2026
EXEC smg.sp_insert_detection_event
    @company_code='DEMO', @camera_no='CAM-02', @camera_name=N'กล้อง โซน Forklift',
    @location_name=N'อาคาร 2 โซน Forklift', @confidence=0.9112, @event_type='INTRUSION',
    @image_name='detection__20260615_075510.jpg', @created_by='system', @event_id=@eid OUTPUT;
UPDATE smg.trn_detection_event SET detected_at='2026-06-15 07:55:10', event_status='NEW',
    alert_teams_status='SENT', alert_email_status='SENT' WHERE event_id=@eid;

EXEC smg.sp_insert_detection_event
    @company_code='DEMO', @camera_no='CAM-01', @camera_name=N'กล้อง ทางเดิน A',
    @location_name=N'อาคาร 1 ทางเดินสาย A', @confidence=0.8406, @event_type='DWELL',
    @image_name='detection__20260615_091233.jpg', @created_by='system', @event_id=@eid OUTPUT;
UPDATE smg.trn_detection_event SET detected_at='2026-06-15 09:12:33', event_status='NEW',
    alert_teams_status='SENT', alert_email_status='SENT' WHERE event_id=@eid;

EXEC smg.sp_insert_detection_event
    @company_code='DEMO', @camera_no='CAM-03', @camera_name=N'กล้อง ประตูหน้า',
    @location_name=N'ประตูหน้าโรงงาน', @confidence=0.7933, @event_type='INTRUSION',
    @image_name='detection__20260615_133000.jpg', @created_by='system', @event_id=@eid OUTPUT;
UPDATE smg.trn_detection_event SET detected_at='2026-06-15 13:30:00', event_status='REVIEWED',
    alert_teams_status='SENT', alert_email_status='SENT' WHERE event_id=@eid;

-- วันที่ 16 มิ.ย. 2026 (วันนี้)
EXEC smg.sp_insert_detection_event
    @company_code='DEMO', @camera_no='CAM-02', @camera_name=N'กล้อง โซน Forklift',
    @location_name=N'อาคาร 2 โซน Forklift', @confidence=0.9321, @event_type='INTRUSION',
    @image_name='detection__20260616_070000.jpg', @created_by='system', @event_id=@eid OUTPUT;

EXEC smg.sp_insert_detection_event
    @company_code='DEMO', @camera_no='CAM-01', @camera_name=N'กล้อง ทางเดิน A',
    @location_name=N'อาคาร 1 ทางเดินสาย A', @confidence=0.8901, @event_type='DWELL',
    @image_name='detection__20260616_090000.jpg', @created_by='system', @event_id=@eid OUTPUT;

EXEC smg.sp_insert_detection_event
    @company_code='DEMO', @camera_no='CAM-03', @camera_name=N'กล้อง ประตูหน้า',
    @location_name=N'ประตูหน้าโรงงาน', @confidence=0.9678, @event_type='DWELL',
    @image_name='detection__20260616_110000.jpg', @created_by='system', @event_id=@eid OUTPUT;

-- ACME company event ตัวอย่าง
EXEC smg.sp_insert_detection_event
    @company_code='ACME', @camera_no='CAM-01', @camera_name=N'ACME กล้อง สายพาน',
    @location_name=N'โซนสายพานลำเลียง', @confidence=0.8510, @event_type='INTRUSION',
    @image_name='detection__20260615_162000.jpg', @created_by='system', @event_id=@eid OUTPUT;
UPDATE smg.trn_detection_event SET detected_at='2026-06-15 16:20:00', event_status='NEW',
    alert_teams_status='SENT', alert_email_status='SENT' WHERE event_id=@eid;
GO

-- sample alert logs
INSERT INTO smg.trn_alert_log (event_id, company_code, alert_channel, alert_status, response_code, response_msg, sent_at)
SELECT TOP 1 event_id, 'DEMO', 'TEAMS', 'SENT', 200, 'OK', '2026-06-10 08:15:25'
FROM smg.trn_detection_event WHERE company_code='DEMO' ORDER BY event_id;

INSERT INTO smg.trn_alert_log (event_id, company_code, alert_channel, alert_status, response_code, response_msg, sent_at)
SELECT TOP 1 event_id, 'DEMO', 'EMAIL', 'SENT', 200, 'OK', '2026-06-10 08:15:26'
FROM smg.trn_detection_event WHERE company_code='DEMO' ORDER BY event_id;
GO

-- sample system logs
INSERT INTO smg.trn_system_log (company_code, camera_no, log_level, log_message, logged_at)
VALUES
    ('DEMO', 'CAM-01', 'INFO',    N'กล้อง CAM-01 เชื่อมต่อสำเร็จ', '2026-06-16 07:00:00'),
    ('DEMO', 'CAM-02', 'INFO',    N'กล้อง CAM-02 เชื่อมต่อสำเร็จ', '2026-06-16 07:00:01'),
    ('DEMO', 'CAM-03', 'WARNING', N'กล้อง CAM-03 FPS ต่ำกว่ากำหนด (18 fps)', '2026-06-16 07:05:30'),
    ('DEMO', 'CAM-03', 'ERROR',   N'กล้อง CAM-03 connection timeout — retry 1/3', '2026-06-16 09:00:00'),
    ('DEMO', 'CAM-03', 'INFO',    N'กล้อง CAM-03 reconnected', '2026-06-16 09:00:05'),
    ('DEMO', NULL,     'INFO',    N'System health check OK', '2026-06-16 10:00:00');
GO

PRINT '05_insert_sample_data.sql completed.';
GO
