-- =============================================================================
-- 10_insert_camera_danger_zones.sql  |  รันหลัง 02_create_tables.sql
-- Insert พิกัด polygon จริงจาก config/cameras.json (danger_zones) ลง
-- smg.mst_detection_area — ต้องมีกล้องนั้นใน smg.mst_camera อยู่แล้ว (FK)
--
-- company_code = 'BKC'  (ตรงกับกล้องจริงในตาราง smg.mst_camera: camera_no 1, 8, 108)
-- แต่ละ INSERT กัน insert ซ้ำด้วย IF NOT EXISTS (idempotent — รันซ้ำได้ปลอดภัย)
-- =============================================================================

-- Camera 1: Camera No.1 (อาคารสำนักงาน 1) — 1 โซน
IF EXISTS (SELECT 1 FROM smg.mst_camera WHERE company_code = 'BKC' AND camera_no = '1')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM smg.mst_detection_area WHERE company_code = 'BKC' AND camera_no = '1' AND area_name = N'อาคารสำนักงาน 1')
        INSERT INTO smg.mst_detection_area (company_code, camera_no, area_name, polygon_json)
        VALUES ('BKC', '1', N'อาคารสำนักงาน 1',
                '[[60,399],[49,294],[43,169],[335,82],[400,110],[481,152],[499,184],[499,284],[497,399]]');
END
ELSE
    PRINT N'ข้าม: ไม่พบกล้อง BKC/1 ใน mst_camera — เพิ่มกล้องนี้ก่อนแล้วรัน script ใหม่';

-- Camera 8: Camera No.8 (ทางเดินข้าง F1) — 2 โซน
IF EXISTS (SELECT 1 FROM smg.mst_camera WHERE company_code = 'BKC' AND camera_no = '8')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM smg.mst_detection_area WHERE company_code = 'BKC' AND camera_no = '8' AND area_name = N'ทางเดินข้าง F1 (โซน 1)')
        INSERT INTO smg.mst_detection_area (company_code, camera_no, area_name, polygon_json)
        VALUES ('BKC', '8', N'ทางเดินข้าง F1 (โซน 1)',
                '[[121,398],[263,398],[334,398],[243,242],[211,188],[103,202],[109,284]]');

    IF NOT EXISTS (SELECT 1 FROM smg.mst_detection_area WHERE company_code = 'BKC' AND camera_no = '8' AND area_name = N'ทางเดินข้าง F1 (โซน 2)')
        INSERT INTO smg.mst_detection_area (company_code, camera_no, area_name, polygon_json)
        VALUES ('BKC', '8', N'ทางเดินข้าง F1 (โซน 2)',
                '[[103,168],[193,161],[165,111],[156,94],[101,98],[101,122]]');
END
ELSE
    PRINT N'ข้าม: ไม่พบกล้อง BKC/8 ใน mst_camera — เพิ่มกล้องนี้ก่อนแล้วรัน script ใหม่';

-- Camera 108: Camera No.108 (ทางเดิน Casting) — 3 โซน
IF EXISTS (SELECT 1 FROM smg.mst_camera WHERE company_code = 'BKC' AND camera_no = '108')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM smg.mst_detection_area WHERE company_code = 'BKC' AND camera_no = '108' AND area_name = N'ทางเดิน Casting (โซน 1)')
        INSERT INTO smg.mst_detection_area (company_code, camera_no, area_name, polygon_json)
        VALUES ('BKC', '108', N'ทางเดิน Casting (โซน 1)',
                '[[4,318],[83,342],[171,353],[191,239],[204,177],[128,174],[116,198],[2,189],[2,253]]');

    IF NOT EXISTS (SELECT 1 FROM smg.mst_detection_area WHERE company_code = 'BKC' AND camera_no = '108' AND area_name = N'ทางเดิน Casting (โซน 2)')
        INSERT INTO smg.mst_detection_area (company_code, camera_no, area_name, polygon_json)
        VALUES ('BKC', '108', N'ทางเดิน Casting (โซน 2)',
                '[[274,395],[270,326],[231,324],[233,243],[237,193],[346,203],[438,210],[469,250],[497,291],[496,397],[370,398]]');

    IF NOT EXISTS (SELECT 1 FROM smg.mst_detection_area WHERE company_code = 'BKC' AND camera_no = '108' AND area_name = N'ทางเดิน Casting (โซน 3)')
        INSERT INTO smg.mst_detection_area (company_code, camera_no, area_name, polygon_json)
        VALUES ('BKC', '108', N'ทางเดิน Casting (โซน 3)',
                '[[237,154],[320,158],[395,163],[345,114],[311,77],[238,74],[238,109]]');
END
ELSE
    PRINT N'ข้าม: ไม่พบกล้อง BKC/108 ใน mst_camera — เพิ่มกล้องนี้ก่อนแล้วรัน script ใหม่';
GO

-- ตรวจผลหลังรัน:
-- SELECT company_code, camera_no, area_name, polygon_json
-- FROM smg.mst_detection_area WHERE company_code = 'BKC' ORDER BY camera_no, area_id;
