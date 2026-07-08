-- =============================================================================
-- Update schedule_json ให้กล้องจริงตาม config/cameras.json (schedule_rules)
-- company_code = 'BKC'  (ตรงกับกล้องจริงในตาราง smg.mst_camera: camera_no 1, 8, 108)
-- ใช้ UPDATE (ไม่ใช่ INSERT) เพราะกล้องต้องมีอยู่แล้วใน smg.mst_camera — idempotent, รันซ้ำได้ปลอดภัย
-- =============================================================================

-- Camera 1: Camera No.1 (อาคารสำนักงาน 1) — จันทร์-ศุกร์ 08:00-20:00
IF EXISTS (SELECT 1 FROM smg.mst_camera WHERE company_code = 'BKC' AND camera_no = '1')
    UPDATE smg.mst_camera
    SET schedule_json = N'[{"days":["Monday","Tuesday","Wednesday","Thursday","Friday"],"start_time":"08:00","end_time":"20:00"}]'
    WHERE company_code = 'BKC' AND camera_no = '1';
ELSE
    PRINT N'ข้าม: ไม่พบกล้อง BKC/1 ใน mst_camera — เพิ่มกล้องนี้ก่อนแล้วรัน script ใหม่';

-- Camera 8: Camera No.8 (ทางเดินข้าง F1) — ทุกวัน 00:00-23:59
IF EXISTS (SELECT 1 FROM smg.mst_camera WHERE company_code = 'BKC' AND camera_no = '8')
    UPDATE smg.mst_camera
    SET schedule_json = N'[{"days":["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"],"start_time":"00:00","end_time":"23:59"}]'
    WHERE company_code = 'BKC' AND camera_no = '8';
ELSE
    PRINT N'ข้าม: ไม่พบกล้อง BKC/8 ใน mst_camera — เพิ่มกล้องนี้ก่อนแล้วรัน script ใหม่';

-- Camera 108: Camera No.108 (ทางเดิน Casting) — cameras.json ไม่มี schedule_rules
-- = ตรวจจับ 24/7 (ดู is_camera_in_schedule ใน src/detection/detection_service.py: rules ว่าง = active ตลอด)
-- ตั้ง schedule_json = NULL ให้ตรงความหมายเดียวกัน (เผื่อเคยมีค่าเก่าค้างอยู่)
IF EXISTS (SELECT 1 FROM smg.mst_camera WHERE company_code = 'BKC' AND camera_no = '108')
    UPDATE smg.mst_camera
    SET schedule_json = NULL
    WHERE company_code = 'BKC' AND camera_no = '108';
ELSE
    PRINT N'ข้าม: ไม่พบกล้อง BKC/108 ใน mst_camera — เพิ่มกล้องนี้ก่อนแล้วรัน script ใหม่';
GO

-- ตรวจผลหลังรัน:
-- SELECT company_code, camera_no, camera_name, schedule_json
-- FROM smg.mst_camera WHERE company_code = 'BKC' ORDER BY camera_no;
