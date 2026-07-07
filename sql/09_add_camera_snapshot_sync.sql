-- =============================================================================
-- 09_add_camera_snapshot_sync.sql  |  รันหลัง 04_create_stored_procedures.sql
-- เพิ่ม: กลไก "Sync ภาพล่าสุด" ให้หน้า Draw Polygon — data-api ตั้ง flag คำขอ,
--        Python (detection_service) เช็ค flag แล้ว capture snapshot จริงจากกล้อง
-- =============================================================================

-- -----------------------------------------------------------------------
-- mst_camera — เพิ่ม column สำหรับกลไก sync snapshot
-- snapshot_requested_at: data-api set ตอน admin กด "Sync ภาพล่าสุด"
-- last_snapshot_at:      Python set หลัง capture + เซฟไฟล์สำเร็จจริง
-- เช็คว่า capture เสร็จหรือยัง = เทียบ last_snapshot_at > snapshot_requested_at เท่านั้น
-- ไม่ต้องมีขั้นตอน "เคลียร์ flag" แยก
-- -----------------------------------------------------------------------
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('smg.mst_camera') AND name = 'snapshot_requested_at')
    ALTER TABLE smg.mst_camera ADD snapshot_requested_at DATETIME2 NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('smg.mst_camera') AND name = 'last_snapshot_at')
    ALTER TABLE smg.mst_camera ADD last_snapshot_at DATETIME2 NULL;
GO

-- ===========================================================================
-- smg.sp_update_camera_snapshot_time
-- Python เรียกหลัง capture + เซฟไฟล์ snapshot สำเร็จ — ตั้ง last_snapshot_at = ตอนนี้
-- ===========================================================================
CREATE OR ALTER PROCEDURE smg.sp_update_camera_snapshot_time
    @company_code   NVARCHAR(20),
    @camera_no      NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE smg.mst_camera
    SET last_snapshot_at = SYSUTCDATETIME()
    WHERE company_code = @company_code AND camera_no = @camera_no;
END;
GO

