"""
=============================================================================
แบบฝึกหัดที่ 04 — Area Detection & Dwell Time
=============================================================================
วัตถุประสงค์:
  1. ฝึกการเขียนตรรกะเรขาคณิตหาจุดพิกัดสัมผัสพื้น (Foot Bottom-Center) จาก Bounding Box
  2. เขียนตรรกะตรวจเช็คว่าจุดดังกล่าวอยู่ในโพลิกอนพื้นที่อันตรายหรือไม่
  3. ออกแบบและพัฒนาตรรกะจับเวลา Dwell Time (การแช่ตัวในโซนอันตรายต่อเนื่อง)

วิธีปฏิบัติ:
  - เติมโค้ดในช่องว่างที่มีเครื่องหมาย # TODO
  - รันไฟล์นี้ด้วยคำสั่ง:
      python playground/04-area-detection/exercise.py
  - ตรวจสอบว่าผ่านการทดสอบ Assertion หรือไม่
=============================================================================
"""

import sys
import time
from pathlib import Path
import cv2
import numpy as np

# นำเข้าเครื่องมือจากโปรเจกต์หลัก
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

# บังคับระบบแสดงผลภาษาไทยให้ถูกต้องบน Windows Console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def get_bbox_bottom_center(bbox: tuple[int, int, int, int]) -> tuple[float, float]:
    """
    TODO 1: คำนวณจุดกึ่งกลางขอบล่างของ Bounding Box (พิกัดเท้า/พื้นยืน)
    สูตร: 
      cx = (x1 + x2) / 2
      cy = y2
    """
    x1, y1, x2, y2 = bbox
    cx = 0.0
    cy = 0.0
    
    # เติมสมการคำนวณที่นี่
    cx = (x1 + x2) / 2.0
    cy = float(y2)
    
    return (cx, cy)


def is_point_in_polygon(point: tuple[float, float], polygon: list[tuple[int, int]]) -> bool:
    """
    TODO 2: ตรวจสอบว่าจุดอ้างอิงอยู่ในพื้นที่โพลิกอนอันตรายหรือไม่
    ใบ้: ใช้ฟังก์ชัน cv2.pointPolygonTest()
    พารามิเตอร์: cv2.pointPolygonTest(contour, pt, measureDist)
      - contour: numpy array ของจุดพิกัดโพลิกอน (dtype=np.int32)
      - pt: จุดพิกัดทศนิยม (x, y)
      - measureDist: กำหนดเป็น False เพื่อให้คืนสถานะ:
          >= 0 หมายถึงจุดอยู่ในโพลิกอน หรืออยู่บนเส้นขอบ
          < 0 หมายถึงจุดอยู่นอกโพลิกอน
    """
    poly_array = np.array(polygon, dtype=np.int32)
    pt = (float(point[0]), float(point[1]))
    
    # เติมคำสั่ง pointPolygonTest ที่นี่
    dist = cv2.pointPolygonTest(poly_array, pt, False)
    
    return dist >= 0


class SimpleDwellTracker:
    """
    ระบบจับเวลาแบบง่ายเพื่อเช็คการแช่ตัวในพื้นที่อันตราย (Dwell Time)
    """
    def __init__(self, dwell_seconds: float = 2.0):
        self.dwell_seconds = dwell_seconds
        self.first_seen_time = None
        self.event_triggered = False

    def update(self, is_in_zone: bool) -> bool:
        """
        TODO 3: ตรรกะตรวจเช็คเวลาแช่ตัวต่อเนื่อง
        กติกา:
          1. ถ้าคนไม่อยู่ในพื้นที่ (is_in_zone = False) -> รีเซ็ตเวลา (first_seen_time = None, event_triggered = False) คืน False
          2. ถ้าคนอยู่ในพื้นที่ (is_in_zone = True):
             - ถ้ายังไม่ได้เริ่มจับเวลา (first_seen_time เป็น None) -> ให้บันทึกเวลาปัจจุบัน (time.monotonic()) ลงใน first_seen_time
             - ถ้าเริ่มจับเวลาแล้ว -> ให้คำนวณระยะเวลา (เวลาปัจจุบัน - first_seen_time)
             - หากระยะเวลานานเกินกว่า dwell_seconds และยังไม่เคยเกิด event (event_triggered เป็น False) -> ให้เซ็ต event_triggered = True และส่งคืน True (สัญญาณ Alert)
          3. กรณีอื่น ๆ ให้คืน False
        """
        now = time.monotonic()
        
        # 1. ไม่อยู่ในพื้นที่
        if not is_in_zone:
            self.first_seen_time = None
            self.event_triggered = False
            return False

        # 2. อยู่ในพื้นที่
        # เริ่มต้นบันทึกเวลาในกรณีเข้ามาครั้งแรก
        if self.first_seen_time is None:
            self.first_seen_time = now

        # คำนวณเวลาแช่ตัว (Dwell Time)
        dwell_duration = now - self.first_seen_time
        
        if dwell_duration > self.dwell_seconds and not self.event_triggered:
            self.event_triggered = True
            return True

        return False


if __name__ == "__main__":
    # กำหนดโพลิกอนพื้นที่อันตรายรูปสี่เหลี่ยม
    danger_zone = [(100, 100), (400, 100), (400, 300), (100, 300)]
    
    # กำหนดกล่อง Bounding Box ตัวอย่าง (x1, y1, x2, y2)
    sample_bbox = (150, 80, 250, 280)  # ขอบล่าง y2=280 อยู่ในโพลิกอน
    
    # 1. ทดสอบการคำนวณจุดล่างสุดของตัวคน
    bottom_center = get_bbox_bottom_center(sample_bbox)
    print(f"กล่อง BBox {sample_bbox} -> จุดเท้าสัมผัสพื้น = {bottom_center}")

    # 2. ตรวจเช็คจุดสัมผัสพื้นอยู่ในเขตโพลิกอนหรือไม่
    in_zone = is_point_in_polygon(bottom_center, danger_zone)
    print(f"จุดเท้า {bottom_center} -> อยู่ในพื้นที่อันตรายหรือไม่ = {in_zone}")

    # 3. รันแบบจำลองการแช่ตัวในพื้นที่อันตราย 3 วินาที (Dwell Threshold = 1.5 วินาที)
    tracker = SimpleDwellTracker(dwell_seconds=1.5)
    print("\n--- เริ่มจำลองเวลาแช่ตัว (Dwell Time Simulation) ---")
    
    simulation_steps = [True, True, True, False]  # อยู่, อยู่, อยู่, ออก
    event_status = []
    
    for i, state in enumerate(simulation_steps, start=1):
        triggered = tracker.update(state)
        event_status.append(triggered)
        print(f"วิที่ {i}: ตรวจพบคนในเขต={state} | ผลลัพธ์แจ้งเตือน (Alert Triggered)={triggered}")
        time.sleep(0.6)  # รอ 0.6 วิ (จำลองเวลาไหลไป)

    # === ระบบตรวจคำตอบอัตโนมัติ (Self-Checking) ===
    print("\n=== เริ่มขั้นตอนการตรวจคำตอบ (Verification) ===")
    try:
        # ทดสอบการหาจุดล่างสุด
        assert bottom_center == (200.0, 280.0), f"ข้อ 1 ผิดพลาด: คำนวณจุดเท้าสัมผัสพื้นได้ {bottom_center} ซึ่งไม่ถูกต้อง"
        print("✅ ข้อ 1 ผ่าน: คำนวณพิกัดจุด Foot Center ถูกต้องแม่นยำ")
        
        # ทดสอบการเช็คพื้นที่
        assert is_point_in_polygon((200, 200), danger_zone) is True, "ข้อ 2 ผิดพลาด: พิกัด (200, 200) อยู่ในโพลิกอนแต่เช็คได้ False"
        assert is_point_in_polygon((50, 50), danger_zone) is False, "ข้อ 2 ผิดพลาด: พิกัด (50, 50) อยู่นอกโพลิกอนแต่เช็คได้ True"
        print("✅ ข้อ 2 ผ่าน: ระบบการตรวจสอบจุดในเส้น Polygon ทำงานถูกต้องครบทุกทิศทาง")
        
        # ทดสอบจำลอง dwell
        assert event_status[0] is False, "ตรรกะตรวจเช็ค Dwell ผิด: เฟรมแรกเพิ่งเข้าพื้นที่ห้ามเตือนทันที"
        assert event_status[2] is True, "ตรรกะตรวจเช็ค Dwell ผิด: แช่ตัวต่อเนื่องเกิน 1.5 วินาทีแล้ว แต่ไม่มีการ Alert"
        assert event_status[3] is False, "ตรรกะตรวจเช็ค Dwell ผิด: ออกนอกเขตแล้วแต่ไม่เคลียร์สถานะ"
        print("✅ ข้อ 3 ผ่าน: ระบบประมวลเวลา Dwell Time และตัวจับเวลาสะสมทำงานถูกต้องตามเงื่อนไข")
        
        print("\n🎉 ยินดีด้วย! คุณผ่านแบบฝึกหัด Area Detection & Dwell Time เรียบร้อยแล้ว")
    except AssertionError as e:
        print(f"❌ ตรวจสอบพบจุดผิดพลาด: {e}")
        print("คำแนะนำ: ตรวจสอบโค้ดในส่วน # TODO และทำใหม่อีกครั้ง")
