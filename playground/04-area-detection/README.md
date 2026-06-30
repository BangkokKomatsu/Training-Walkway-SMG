---
lab:
    title: '04 - Area Detection (Playground)'
    description: 'เรียนรู้การตรวจสอบการล้ำพื้นที่ด้วย Polygon และระบบจับเวลาเพื่อคำนวณการเกิด Event (Dwell/Cooldown)'
---

# 04 - Area Detection (Playground)

ในบทเรียนนี้ เราจะนำพิกัดที่ได้จาก AI (จากบทเรียนที่แล้ว) มาวิเคราะห์ทางคณิตศาสตร์ว่าจุดนั้น **"ล้ำเข้าไปในพื้นที่หวงห้าม"** หรือไม่ โดยใช้คลาส `AreaChecker` และเราจะใช้คลาส `CameraEventTracker` เพื่อสร้างเงื่อนไขเวลา (เช่น ต้องอยู่เกิน 2 วินาทีถึงจะแจ้งเตือน) ตามกติกา 4 ขั้นตอนของระบบ

ระยะเวลาที่ใช้: ประมาณ **15** นาที

## Prerequisites
- ได้ทำการตั้งค่าพิกัด `danger_zones` ในไฟล์ `cameras.json` หรือผ่านหน้าเว็บแอดมินแล้ว (ระบบมีค่า Default ให้หากไม่ได้ตั้ง)

---

## 1. การสร้างผู้ตรวจสอบพื้นที่ (AreaChecker)

อันดับแรก เราจะโหลดพิกัดของพื้นที่อันตราย (Danger Zone) รูปหลายเหลี่ยมจากกล้อง และสร้างคลาสสำหรับเช็คพื้นที่

```python
import logging
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.camera.camera_config import load_camera_configs
from src.detection.area_checker import AreaChecker
from src.detection.detection_service import CameraEventTracker

def main() -> None:
    cameras = load_camera_configs()
    # ดึง polygon อันแรกจากกล้องตัวแรก ถ้าไม่มีให้ใช้พิกัดสมมติ
    polygon = cameras[0].danger_zones[0] if cameras and cameras[0].danger_zones else [
        (100, 100), (540, 100), (540, 380), (100, 380)
    ]
    
    area_checker = AreaChecker([polygon])
    logger.info("พื้นที่อันตราย (polygon): %s", polygon)
```

**คำอธิบายโค้ด (Line-by-Line):**
- `from src.detection.area_checker import AreaChecker`: นำเข้าคลาสที่รับผิดชอบด้านการใช้คณิตศาสตร์และ OpenCV ตรวจสอบพื้นที่
- `from src.detection.detection_service import CameraEventTracker`: นำเข้าคลาสที่รับผิดชอบด้านการจับเวลาการอยู่ต่อเนื่อง (Dwell Time)
- `polygon = ...`: โค้ดนี้ใช้ List Comprehension และ If-Else ในบรรทัดเดียว เพื่อความปลอดภัยว่าถ้า `danger_zones` หายไป โปรแกรมจะไม่พังและใช้ค่าสี่เหลี่ยมสมมติแทน
- `AreaChecker([polygon])`: ส่งพิกัด Polygon ข้ามไปให้ AreaChecker เตรียมตัวทำงาน โดยสามารถรองรับพื้นที่ได้หลายๆ Polygon พร้อมกัน (จึงส่งเป็น List)

---

## 2. การสร้างตัวจับเวลา (CameraEventTracker)

ระบบป้องกันการแจ้งเตือนรัวเกินไป (Spam) โดยใช้เงื่อนไขการจับเวลาสองแบบคือ Dwell (ระยะเวลาขั้นต่ำที่ต้องอยู่ในพื้นที่) และ Cooldown (ระยะเวลาพักก่อนการแจ้งเตือนครั้งถัดไป)

```python
    # ใช้ dwell/cooldown สั้น ๆ เพื่อให้ทดสอบเร็ว (ของจริงใช้ค่าจาก .env)
    tracker = CameraEventTracker(dwell_seconds=2, cooldown_seconds=5)
```

**คำอธิบายโค้ด (Line-by-Line):**
- `CameraEventTracker(...)`: สร้างออบเจกต์เพื่อทำหน้าที่เป็นนาฬิกาจับเวลา 
- `dwell_seconds=2`: หมายความว่าคนที่เดินเข้ามา ต้องอยู่ต่อเนื่องกัน **เกิน 2 วินาที** จึงจะถือเป็นเหตุการณ์ (Event) ถือว่าปลอดภัยถ้าเดินผ่านออกไปเร็วๆ
- `cooldown_seconds=5`: หมายความว่าหลังจากแจ้งเตือนไปแล้ว จะไม่แจ้งเตือนคนเดิมซ้ำอีกภายใน 5 วินาทีถัดมา

---

## 3. จำลองจุดพิกัด (Simulating Reference Points)

เนื่องจากในไฟล์นี้เราไม่มี YOLO AI ของจริง เราจะใช้คณิตศาสตร์สร้าง "จุดจำลอง" ขึ้นมา 2 จุด คือจุดที่อยู่ตรงกลางพื้นที่ และจุดที่อยู่นอกพื้นที่

```python
    # จุดอ้างอิงคนจำลอง: กลางพื้นที่อันตราย และจุดนอกพื้นที่
    center_x = (min(p[0] for p in polygon) + max(p[0] for p in polygon)) // 2
    center_y = (min(p[1] for p in polygon) + max(p[1] for p in polygon)) // 2
    
    inside_point = (center_x, center_y)
    outside_point = (min(p[0] for p in polygon) - 50, min(p[1] for p in polygon) - 50)

    steps = [
        (inside_point, 3.5),   # เดินเข้าไปอยู่ในพื้นที่ 3.5 วิ (> dwell 2 วิ -> ควร trigger)
        (outside_point, 1.0),  # เดินออกนอกพื้นที่ -> reset ตัวจับเวลา
    ]
```

**คำอธิบายโค้ด (Line-by-Line):**
- `min(p[0]...) + max(p[0]...) // 2`: หาค่ากึ่งกลางแกน X และ Y ของ Polygon เพื่อรับประกันว่าจุดนี้จะอยู่ตรงกลางเสมอ (In-center point)
- `inside_point`: พิกัดสมมติแทนคน 1 คนที่กำลังยืนอยู่ **ใน** พื้นที่
- `outside_point`: พิกัดสมมติแทนคน 1 คนที่กำลังยืนอยู่ **นอก** พื้นที่
- `steps`: สร้างเหตุการณ์สมมติว่าคนจะเดินเข้าไป 3.5 วินาที และเดินออกมาอีก 1 วินาที

---

## 4. รันลูปจำลองเวลา (Simulation Loop)

นำเหตุการณ์สมมติไปรันในลูป และให้ `tracker` ประเมินผล

```python
    for point, duration in steps:
        in_zone = area_checker.is_in_danger_zone(point)
        logger.info("จุด %s -> in_danger_zone=%s (จำลองอยู่ %.1f วิ)", point, in_zone, duration)

        start = time.monotonic()
        while time.monotonic() - start < duration:
            # อัปเดต tracker ทุกๆ 0.2 วินาที ว่าตอนนี้คนยังอยู่ในโซนหรือไม่
            if tracker.update(in_zone):
                logger.warning(
                    "EVENT TRIGGERED! คนอยู่ในพื้นที่อันตรายต่อเนื่องเกิน %d วินาที",
                    tracker.dwell_seconds,
                )
            time.sleep(0.2)
```

**คำอธิบายโค้ด (Line-by-Line):**
- `in_zone = area_checker.is_in_danger_zone(point)`: ฟังก์ชันนี้เรียกใช้ `cv2.pointPolygonTest` ตรวจสอบจุดว่าอยู่ในพื้นที่หรือไม่ และคืนค่า True/False
- `start = time.monotonic()`: บันทึกเวลาปัจจุบัน (เป็นวินาที) แบบที่มีความแม่นยำสูง
- `while time.monotonic() - start < duration:`: ลูปจำลองเวลา ว่าผ่านไปถึงเป้าหมายที่ตั้งไว้หรือยัง
- `tracker.update(in_zone)`: สำคัญที่สุด! ฟังก์ชันนี้จะรับสถานะ `True/False` ไปประมวลผล หากมันสะสมเวลาต่อเนื่องกันจนเกิน `dwell_seconds` (2 วินาที) มันจะตอบกลับมาเป็น **True (Trigger Event)** ทันที

---

## การรันทดสอบ

1. เปิด Terminal
2. รันคำสั่งด้านล่างเพื่อจำลองคนเดินเข้าพื้นที่:
```bash
python playground/04-area-detection/example.py
```
3. ผลลัพธ์ที่คาดหวังใน Console: คุณจะเห็นว่าในช่วงวินาทีแรกยังไม่มีอะไรเกิดขึ้น แต่พอผ่านไป 2 วินาที จะมีข้อความเตือนภัยสีเหลืองขึ้นมา และเมื่อเดินออกนอกพื้นที่ ระบบจะจับเวลาใหม่

```text
INFO | พื้นที่อันตราย (polygon): [(100, 100), (540, 100), (540, 380), (100, 380)]
INFO | จุด (320, 240) -> in_danger_zone=True (จำลองอยู่ 3.5 วิ)
WARNING | EVENT TRIGGERED! คนอยู่ในพื้นที่อันตรายต่อเนื่องเกิน 2 วินาที
INFO | จุด (50, 50) -> in_danger_zone=False (จำลองอยู่ 1.0 วิ)
```
