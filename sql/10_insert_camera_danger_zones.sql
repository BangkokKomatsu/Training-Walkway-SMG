-- =============================================================================
-- 10_insert_camera_danger_zones.sql  |  รันหลัง 02_create_tables.sql
-- Insert พิกัด polygon จริงจาก config/cameras.json (danger_zones) ลง
-- smg.mst_detection_area — ต้องมีกล้องนั้นใน smg.mst_camera อยู่แล้ว (FK)
-- ถ้ายังไม่มีกล้อง ให้เพิ่มกล้องผ่านหน้า Add Camera ก่อน แล้วรัน script นี้ใหม่
-- =============================================================================

-- Camera 1: กล้อง อาคาร 1 (อาคาร 1 ทางเดิน A)
IF EXISTS (SELECT 1 FROM smg.mst_camera WHERE company_code = 'DEMO' AND camera_no = '1')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM smg.mst_detection_area WHERE company_code = 'DEMO' AND camera_no = '1' AND area_name = N'อาคาร 1 ทางเดิน A')
        INSERT INTO smg.mst_detection_area (company_code, camera_no, area_name, polygon_json)
        VALUES ('DEMO', '1', N'อาคาร 1 ทางเดิน A',
                '[[60,399],[49,294],[43,169],[335,82],[400,110],[481,152],[499,184],[499,284],[497,399]]');
END
ELSE
    PRINT N'ข้าม: ไม่พบกล้อง DEMO/1 ใน mst_camera — เพิ่มกล้องนี้ก่อนแล้วรัน script ใหม่';

-- Camera 8: กล้อง อาคาร 2 (อาคาร 2 ทางเดิน B) — 2 โซน
IF EXISTS (SELECT 1 FROM smg.mst_camera WHERE company_code = 'DEMO' AND camera_no = '8')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM smg.mst_detection_area WHERE company_code = 'DEMO' AND camera_no = '8' AND area_name = N'อาคาร 2 ทางเดิน B (โซน 1)')
        INSERT INTO smg.mst_detection_area (company_code, camera_no, area_name, polygon_json)
        VALUES ('DEMO', '8', N'อาคาร 2 ทางเดิน B (โซน 1)',
                '[[121,398],[263,398],[334,398],[243,242],[211,188],[103,202],[109,284]]');

    IF NOT EXISTS (SELECT 1 FROM smg.mst_detection_area WHERE company_code = 'DEMO' AND camera_no = '8' AND area_name = N'อาคาร 2 ทางเดิน B (โซน 2)')
        INSERT INTO smg.mst_detection_area (company_code, camera_no, area_name, polygon_json)
        VALUES ('DEMO', '8', N'อาคาร 2 ทางเดิน B (โซน 2)',
                '[[103,168],[193,161],[165,111],[156,94],[101,98],[101,122]]');
END
ELSE
    PRINT N'ข้าม: ไม่พบกล้อง DEMO/8 ใน mst_camera — เพิ่มกล้องนี้ก่อนแล้วรัน script ใหม่';

-- Camera 28: กล้อง โซน Forklift (โซน Forklift หลัก) — 3 โซน
IF EXISTS (SELECT 1 FROM smg.mst_camera WHERE company_code = 'DEMO' AND camera_no = '28')
BEGIN
    IF NOT EXISTS (SELECT 1 FROM smg.mst_detection_area WHERE company_code = 'DEMO' AND camera_no = '28' AND area_name = N'โซน Forklift หลัก (โซน 1)')
        INSERT INTO smg.mst_detection_area (company_code, camera_no, area_name, polygon_json)
        VALUES ('DEMO', '28', N'โซน Forklift หลัก (โซน 1)',
                '[[4,318],[83,342],[171,353],[191,239],[204,177],[128,174],[116,198],[2,189],[2,253]]');

    IF NOT EXISTS (SELECT 1 FROM smg.mst_detection_area WHERE company_code = 'DEMO' AND camera_no = '28' AND area_name = N'โซน Forklift หลัก (โซน 2)')
        INSERT INTO smg.mst_detection_area (company_code, camera_no, area_name, polygon_json)
        VALUES ('DEMO', '28', N'โซน Forklift หลัก (โซน 2)',
                '[[274,395],[270,326],[231,324],[233,243],[237,193],[346,203],[438,210],[469,250],[497,291],[496,397],[370,398]]');

    IF NOT EXISTS (SELECT 1 FROM smg.mst_detection_area WHERE company_code = 'DEMO' AND camera_no = '28' AND area_name = N'โซน Forklift หลัก (โซน 3)')
        INSERT INTO smg.mst_detection_area (company_code, camera_no, area_name, polygon_json)
        VALUES ('DEMO', '28', N'โซน Forklift หลัก (โซน 3)',
                '[[237,154],[320,158],[395,163],[345,114],[311,77],[238,74],[238,109]]');
END
ELSE
    PRINT N'ข้าม: ไม่พบกล้อง DEMO/28 ใน mst_camera — เพิ่มกล้องนี้ก่อนแล้วรัน script ใหม่';
GO
