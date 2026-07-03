# Module 06 — Walkway Area Detection (พื้นที่อันตรายและการตัดสิน Event)

> **ระดับ:** กลาง | **เวลาโดยประมาณ:** 90–120 นาที

---

## ส่วนที่ 1 — วัตถุประสงค์

เมื่อจบ module นี้ ผู้เรียนจะสามารถ:

- อธิบายระบบพิกัดภาพ (pixel coordinate) ได้
- กำหนด polygon พื้นที่อันตรายด้วยพิกัดพิกเซล
- วาด polygon ด้วย OpenCV บน frame
- ตรวจสอบว่าจุดอยู่ใน polygon หรือไม่ (point-in-polygon)
- เข้าใจกติกาตัดสิน event + dwell 5 วิ (รวมเงื่อนไขยกเว้นด้านความปลอดภัย)
- แยกความแตกต่างระหว่าง `DWELL_SECONDS` และ `ALERT_COOLDOWN_SECONDS`
- เก็บ area config แยกกล้อง
- เข้าใจว่า polygon และตารางเวลากล้องถูกสร้าง/จัดการผ่านเว็บได้อย่างไร (ไม่ต้องแก้ JSON มือ)

---

## ส่วนที่ 2 — สิ่งที่ต้องเตรียม

- ผ่าน Module 01–05
- เข้าใจ bounding box จาก YOLO (Module 05)
- มีรูปจากกล้องที่จะกำหนด polygon (ถ้ามี)

---

## ส่วนที่ 3 — คำอธิบายเข้าใจง่าย

### ระบบพิกัดภาพ

ภาพ (frame) ที่ได้จากกล้องมีพิกัดแบบนี้:

```text
(0,0) ─────────────────────────── (width-1, 0)
  │                                         │
  │         ภาพ (frame)                     │
  │                                         │
(0, height-1) ─────────────── (width-1, height-1)
```
- `x` เพิ่มขึ้นจากซ้ายไปขวา
- `y` เพิ่มขึ้นจากบนลงล่าง (ต่างจากคณิตศาสตร์ที่ y เพิ่มขึ้น)

ตัวอย่างภาพ 640×480:
- มุมบนซ้าย: (0, 0)
- มุมล่างขวา: (639, 479)
- กลางภาพ: (320, 240)

### Polygon พื้นที่อันตราย

เราวาด "ขอบเขตพื้นที่ห้ามเข้า" ด้วย polygon (รูปหลายเหลี่ยม) กำหนดโดยระบุพิกัดของจุดมุมแต่ละจุด:

```text
พื้นที่สี่เหลี่ยม:
(100,100) ─── (540,100)
    │                │
(100,380) ─── (540,380)

polygon = [(100,100), (540,100), (540,380), (100,380)]
```
ในระบบจริงอาจเป็นรูปทรงซับซ้อนกว่า เช่น รูป L, รูปห้าเหลี่ยม เพื่อให้ตรงกับพื้นที่จริงในภาพกล้อง

### จุดอ้างอิงคน

เราไม่ใช้ bbox ทั้งหมดตัดสิน แต่ใช้ **จุดกึ่งกลางขอบล่างของ bbox** (center-bottom) เป็นจุดอ้างอิงว่า "คนยืนอยู่ที่ไหน"

```text
┌──────────────────┐  ← (x1, y1) มุมบนซ้าย
│                  │
│     บนตัวคน      │
│                  │
└─────────┬────────┘  ← (x2, y2) มุมล่างขวา
          │
          └── จุดอ้างอิง = ((x1+x2)/2, y2) = กลางขาคน/พื้น
```
ทำไมใช้จุดนี้? เพราะ:
- สะท้อนตำแหน่งจริงที่คนยืน (เท้าแตะพื้น)
- กรณีคนซ้อนกัน bbox อาจทับกัน แต่จุดขาแยกกัน
- polygon กำหนดบนพื้นโรงงาน ตรงกับ perspective กล้องมองลงมา

---

## ส่วนที่ 4 — Flow การทำงาน (กติกาตัดสิน Event)

```text
ได้ detections จาก YOLO (person + bicycle)
        ↓
ขั้น 1: หาจุดอ้างอิง = จุดกึ่งกลางขอบล่างของ bbox (เฉพาะ person)
        ↓
ขั้น 2: point-in-polygon → คนอยู่ในพื้นที่อันตรายไหม?
    ├── ไม่อยู่ → ขั้น 5: reset timer → ไม่มี event
    └── อยู่ → ไปขั้น 3
        ↓
ขั้น 3: อยู่ใกล้ bicycle ไหม? (< BICYCLE_PROXIMITY_PX = 70 พิกเซล)
    ├── ใกล้ → ถือว่าปลอดภัย (กำลังขี่จักรยานผ่าน) → ไม่นับเวลา
    └── ไม่ใกล้ → เริ่มจับเวลา (first_seen_time)
        ↓
ขั้น 4: อยู่ต่อเนื่อง > DWELL_SECONDS (5 วิ)?
    ├── ไม่ถึง → รอต่อ
    └── ถึงแล้ว → EVENT TRIGGERED!
        ├── เช็ค cooldown → ถ้าเพิ่งแจ้งไป ข้าม
        └── ถ้าผ่าน cooldown → บันทึก + ส่ง alert
        ↓
ขั้น 5: คนออกจากพื้นที่ → reset timer
```

> **ทำไมต้องยกเว้นคนที่อยู่ใกล้ bicycle?** ระบบนี้ตรวจจับ "คนเดินเข้าพื้นที่อันตราย" เป็นหลัก แต่ในโรงงานจริง คนที่ขี่จักรยาน (หรือกำลังใช้งานอุปกรณ์ เช่น forklift ในบทเสริม) ผ่านหรือทำงานใกล้พื้นที่ ไม่ควรถูกนับเป็น "คนบุกรุกเดินเท้า" แบบเดียวกัน — โค้ดจริงเช็คเรื่องนี้ในฟังก์ชัน `_get_unsafe_person()` ที่ `src/detection/detection_service.py` โดยใช้ `is_boxes_close()` จาก `src/utils/helpers.py` เทียบระยะห่างระหว่าง bbox ของ person กับ bbox ของ bicycle ที่ตรวจพบในเฟรมเดียวกัน ถ้าใกล้กว่า `BICYCLE_PROXIMITY_PX` (70 พิกเซล) ถือว่าปลอดภัย ไม่เริ่ม/ไม่นับเวลา dwell

---

## ส่วนที่ 5 — ตัวอย่าง Code

ดูไฟล์จริงที่:
- [src/detection/area_checker.py](../../src/detection/area_checker.py)
- [src/detection/detection_service.py](../../src/detection/detection_service.py)
- [src/utils/helpers.py](../../src/utils/helpers.py)

### 5.1 กำหนด Polygon ใน `config/cameras.json` หรือฐานข้อมูล

ระบบของเราเก็บพื้นที่อันตรายแยกตามกล้อง (เพราะแต่ละกล้องมีมุมมองไม่เหมือนกัน) 
และรองรับหลายพื้นที่ต่อกล้อง (เช่น ซ้ายของภาพ 1 พื้นที่ ขวาอีก 1 พื้นที่)

```json
{
  "camera_no": "1",
  "camera_name": "Camera-1",
  "danger_zones": [
    [
      [100, 100],
      [540, 100],
      [540, 380],
      [100, 380]
    ]
  ]
}
```
> **วิธีหาพิกัด:** เปิดรูปจากกล้องใน Paint หรือ Photoshop แล้วนำเมาส์ไปวางที่จุดมุมพื้นที่ จะเห็น pixel coordinate ที่ต้องการ
### 5.2 `AreaChecker` — ตรวจสอบ Point-in-Polygon

นี่คือโค้ดจริงใน [src/detection/area_checker.py](../../src/detection/area_checker.py):

```python
import cv2
import numpy as np

class AreaChecker:
    """เช็คว่าจุดอ้างอิงของคนอยู่ในพื้นที่อันตราย (polygons) หรือไม่"""

    def __init__(self, danger_zones: list[list[tuple[int, int]]]):
        """
        danger_zones: list ของ polygon แต่ละอัน = list ของจุด [(x,y), ...]
        """
        self.polygons = [np.array(zone, dtype=np.int32) for zone in danger_zones]

    def is_in_danger_zone(self, point: tuple[float, float]) -> bool:
        """True ถ้าจุดอยู่ใน polygon ใด polygon หนึ่ง"""
        pt = (float(point[0]), float(point[1]))
        for polygon in self.polygons:
            if cv2.pointPolygonTest(polygon, pt, False) >= 0:
                return True
        return False

    def draw_polygons(self, frame, color: tuple[int, int, int] = (0, 0, 255), thickness: int = 2):
        """วาดเส้น polygon พื้นที่อันตรายทุกเส้นลงเฟรม"""
        for polygon in self.polygons:
            cv2.polylines(frame, [polygon], isClosed=True, color=color, thickness=thickness)
        return frame
```
### 5.3 จุดอ้างอิงคน — `get_bbox_bottom_center`

โค้ดจาก [src/utils/helpers.py](../../src/utils/helpers.py):

```python
def get_bbox_bottom_center(bbox: tuple) -> tuple:
    """คำนวณจุดกึ่งกลางขอบล่างของ bounding box"""
    x1, y1, x2, y2 = bbox
    cx = (x1 + x2) / 2  # กลางแนวนอน
    return (cx, y2)       # y2 = ขอบล่าง (ระดับพื้น/เท้า)
```
### 5.4 `CameraEventTracker` — กติกา 4 ขั้น + 2 ตัวจับเวลา

โค้ดจาก [src/detection/detection_service.py](../../src/detection/detection_service.py):

```python
import time


class CameraEventTracker:
    """
    เก็บสถานะ dwell timer + cooldown ของกล้อง 1 ตัว

    สองตัวจับเวลา (อย่าสับสน):
    - DWELL_SECONDS: อยู่ในพื้นที่นานแค่ไหนถึงนับเป็น event
    - ALERT_COOLDOWN_SECONDS: แจ้งไปแล้ว เว้นนานแค่ไหนถึงแจ้งซ้ำ
    """

    def __init__(self, dwell_seconds: int, cooldown_seconds: int):
        self.dwell_seconds = dwell_seconds
        self.cooldown_seconds = cooldown_seconds

        self._enter_time: float | None = None    # เวลาที่คนเข้าพื้นที่
        self._event_active = False               # เกิด event แล้วหรือยัง
        self._last_alert_time: float | None = None  # ส่ง alert ล่าสุดเมื่อไร

    def update(self, person_in_zone: bool) -> bool:
        """
        อัปเดตสถานะทุก frame
        คืน True ถ้าควร trigger event/alert ใหม่ตอนนี้
        """
        now = time.monotonic()  # ใช้ monotonic clock ไม่กระทบถ้าเวลาเครื่องเปลี่ยน

        # ขั้น 4: คนออกจากพื้นที่ → reset
        if not person_in_zone:
            self._enter_time = None
            self._event_active = False
            return False

        # ขั้น 2: คนอยู่ในพื้นที่ → เริ่มจับเวลาถ้ายังไม่เริ่ม
        if self._enter_time is None:
            self._enter_time = now

        dwell = now - self._enter_time

        # ขั้น 3: อยู่เกิน DWELL_SECONDS → เกิด event
        if dwell > self.dwell_seconds and not self._event_active:
            self._event_active = True

            # เช็ค cooldown: ถ้าแจ้งไปไม่นาน ข้าม
            cooldown_ok = (
                self._last_alert_time is None
                or (now - self._last_alert_time) > self.cooldown_seconds
            )
            if cooldown_ok:
                self._last_alert_time = now
                return True   # ← trigger alert!

        return False
```
### 5.5 ภาพรวม Detection Loop (รวม YOLO + Area)

```python
import time
from src.utils.helpers import get_bbox_bottom_center, is_boxes_close
from src.detection.yolo_detector import YoloDetector
from src.detection.area_checker import AreaChecker
from src.detection.detection_service import CameraEventTracker
from config.settings import settings

BICYCLE_PROXIMITY_PX = 70   # person ใกล้ bicycle กว่านี้ = ปลอดภัย (ดูส่วนที่ 4)

# ตั้งค่า
detector = YoloDetector(settings.YOLO_MODEL_PATH, settings.DEVICE, settings.CONF_THRESHOLD)
area_checker = AreaChecker(cam_config.danger_zones)  # list ของ polygon จาก cameras.json หรือ DB
tracker = CameraEventTracker(settings.DWELL_SECONDS, settings.ALERT_COOLDOWN_SECONDS)

# loop หลัก
while True:
    frame = camera.get_latest_frame()
    if frame is None:
        time.sleep(0.1)
        continue

    # YOLO detect ทั้ง person และ bicycle ในเฟรมเดียวกัน
    all_detections = detector.detect(frame)
    persons = [d for d in all_detections if d["class_name"] == "person"]
    bicycles = [d for d in all_detections if d["class_name"] == "bicycle"]

    # หาคนที่ "ไม่ปลอดภัย" คนแรก — อยู่ในพื้นที่อันตราย + ไม่ได้อยู่ใกล้ bicycle
    unsafe_person = None
    for person in persons:
        ref_point = get_bbox_bottom_center(person["bbox"])
        if not area_checker.is_in_danger_zone(ref_point):
            continue  # อยู่นอกพื้นที่ ปลอดภัยอยู่แล้ว

        near_bicycle = any(
            is_boxes_close(person["bbox"], b["bbox"], BICYCLE_PROXIMITY_PX)
            for b in bicycles
        )
        if near_bicycle:
            continue  # ยืน/ขี่ใกล้จักรยาน ถือว่าปลอดภัย ไม่นับเวลา

        unsafe_person = person
        break  # คนแรกที่ "ไม่ปลอดภัย" จริง ๆ

    # อัปเดต event tracker
    if tracker.update(unsafe_person is not None):
        # EVENT TRIGGERED!
        print(f"🚨 คนอยู่ในพื้นที่อันตราย > {settings.DWELL_SECONDS} วิ!")
        # บันทึก + ส่ง alert (ดู Module 07–09)

    time.sleep(0.03)
```
> โค้ดนี้เป็นเวอร์ชันย่อสำหรับสอน ของจริงอยู่ใน `_get_unsafe_person()` + `_camera_loop()` ที่ `src/detection/detection_service.py`
### 5.6 วาด polygon + bbox บน frame ก่อนบันทึก

```python
import cv2

def prepare_evidence_frame(frame, detections, area_checker):
    """เตรียม frame สำหรับบันทึกเป็นหลักฐาน: วาด polygon + bbox ทุกคน"""
    save_frame = frame.copy()

    # วาด polygon พื้นที่อันตราย (สีแดง) ทุก polygon
    area_checker.draw_polygons(save_frame, color=(0, 0, 255), thickness=2)

    # วาด bbox ของทุกคนที่พบ (สีเขียว)
    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        cv2.rectangle(save_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

        # วาดจุดอ้างอิง
        cx = int((x1 + x2) / 2)
        cy = y2
        cv2.circle(save_frame, (cx, cy), 5, (255, 0, 0), -1)  # จุดสีน้ำเงิน

    return save_frame

# บันทึกเป็นไฟล์รูปหลักฐาน (ใช้ cv2.imwrite ไม่ต้องเปิดหน้าต่าง)
# ระหว่างพัฒนา ยังใช้ cv2.imshow() คู่กันได้เพื่อดู live view (ดู Module 04-05)
evidence = prepare_evidence_frame(frame, detections, area_checker)
cv2.imwrite("evidence.jpg", evidence)
```
---

## ส่วนที่ 6 — การจัดการกล้องและ Polygon พื้นที่ผ่านเว็บ

ตอนนี้เราเข้าใจแล้วว่า polygon คืออะไร และโค้ด Python (`AreaChecker`, `CameraEventTracker`) เอาไปใช้ตัดสิน event ยังไง แต่ในทางปฏิบัติ **ไม่มีใครอยากมานั่งเปิด `cameras.json` แล้วพิมพ์พิกัด `[x, y]` เอง** ทีละจุด — ระบบจริงมีหน้าเว็บให้ admin จัดการกล้องและวาด polygon ได้เองแบบไม่ต้องแตะ JSON เลย ส่วนนี้จะพาไปดูว่าของที่ Python "อ่าน" (`danger_zones`, `schedule_rules`) ถูก "สร้าง" มาจากไหน

### 6.1 หน้าเว็บจัดการกล้อง (Camera Management UI)

หน้า [frontend/src/pages/CameraMonitorPage.jsx](../../frontend/src/pages/CameraMonitorPage.jsx) มีปุ่ม **"Add Camera"** เปิดฟอร์มให้กรอก:

- `camera_no`, `camera_name`, `location_name`
- **ยี่ห้อกล้อง (brand):** Hikvision / Dahua / Panasonic / Generic
- ถ้าเลือกยี่ห้อที่รองรับ → กรอกแค่ `ip_address`, `rtsp_port`, `username`, `password`, `channel`, `stream_type` (main/sub)
- ถ้าเลือก **Generic** → กรอก RTSP URL เต็มเองได้เลย (`custom_rtsp_url`)

จุดที่น่าสนใจ: ผู้ใช้**ไม่ต้องรู้วิธีต่อ RTSP URL ของแต่ละยี่ห้อ** ฝั่ง backend (`data-api/server.js`) มีฟังก์ชัน `generateRtspUrl()` ประกอบ URL ให้อัตโนมัติตามยี่ห้อ:

```javascript
// data-api/server.js (ย่อ)
function generateRtspUrl({ brand, ip_address, rtsp_port, username, password, channel, stream_type, custom_rtsp_url }) {
  switch (brand?.toLowerCase()) {
    case 'hikvision':
      return `rtsp://${userPass}${ip_address}:${port}/Streaming/Channels/${chan}${isSub ? '02' : '01'}`;
    case 'dahua':
      return `rtsp://${userPass}${ip_address}:${port}/cam/realmonitor?channel=${chan}&subtype=${isSub ? '1' : '0'}`;
    case 'panasonic':
      return `rtsp://${userPass}${ip_address}:${port}/MediaInput/h264/stream_${isSub ? '2' : '1'}`;
    default:
      return custom_rtsp_url || `rtsp://${userPass}${ip_address}:${port}/live`;
  }
}
```
กด **Save** แล้ว frontend เรียก `POST /api/cameras` (สร้างใหม่) หรือ `POST /api/cameras/:camera_no/update` (แก้ไข) — ฝั่ง server เขียนแถวลง `smg.mst_camera` โดยตรง (ดู 6.5 ด้านล่างว่าทำไมไม่ผ่าน stored procedure) พร้อม RTSP URL ที่ประกอบเสร็จแล้ว

### 6.2 วาด Polygon ด้วยเมาส์ (Visual Polygon Editor)

แทนที่จะพิมพ์พิกัดเอง หน้าเว็บมี **canvas ขนาดล็อก 500×400** (ตรงกับขนาดที่ `_camera_loop()` ย่อเฟรมด้วย `cv2.resize(frame, (500, 400))` ก่อนตรวจจับ — พิกัดที่วาดในเว็บจึงตรงกับพิกัดที่ Python ใช้เป๊ะ ๆ) ทำงานง่าย ๆ แบบนี้:

- **คลิก** บน canvas → เพิ่มจุดมุม polygon ทีละจุด (มีเส้นประ preview ไปยังตำแหน่งเมาส์)
- **Undo Point** → ลบจุดล่าสุดออก
- **Clear** → ล้างจุดทั้งหมด เริ่มวาดใหม่
- **Save Restricted Zone** → ต้องมีอย่างน้อย 3 จุดถึงปิด polygon ได้

เมื่อกด Save, frontend แปลง points เป็น `[[x,y],[x,y],...]` แล้วเรียก `POST /api/cameras/:camera_no/polygons` → server เขียน (insert หรือ update) แถวลงตาราง `smg.mst_detection_area` คอลัมน์ `polygon_json` — **นี่คือค่าเดียวกับที่ `_load_from_db()` อ่านกลับมาสร้างเป็น `danger_zones` ให้ `AreaChecker` ใช้** ปิด loop ระหว่าง "คนวาดในเว็บ" กับ "Python ใช้ตรวจจับ" พอดี

### 6.3 กำหนดตารางเวลาทำงานของกล้อง (Camera Scheduling)

บางกล้องไม่จำเป็นต้องตรวจจับตลอด 24 ชั่วโมง เช่น กล้องหน้าโกดังที่มีคนทำงานแค่กะกลางวัน จันทร์-ศุกร์ ฟอร์ม Add/Edit Camera มีส่วน **"Detection Schedules"** ให้ติ๊กวันในสัปดาห์ + เลือกเวลาเริ่ม/สิ้นสุด แล้วกด "Add Rule" ได้หลาย rule ต่อกล้อง — เก็บเป็น array `schedule_rules` เช่น:

```json
[
  { "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "start_time": "08:00", "end_time": "17:00" }
]
```
ค่านี้ถูก stringify เป็น JSON แล้วส่งเป็นฟิลด์ `schedule_json` ตอนสร้าง/แก้กล้อง เก็บลงคอลัมน์ `schedule_json` ของ `smg.mst_camera` (ถ้าไม่ตั้ง rule เลย = ตรวจจับ 24/7)

ฝั่ง Python, ฟังก์ชัน `is_camera_in_schedule()` ใน `src/detection/detection_service.py` เป็นตัวเช็คว่ากล้องนี้ "ควรทำงานตอนนี้ไหม": ถ้า `SCHEDULE_SOURCE=hardcoded` จะใช้ `cam_config.schedule_rules` ก่อน ถ้าไม่มีค่อย fallback ไปที่ dict คงที่ `HARDCODED_SCHEDULES` (มีไว้สำหรับ demo/ตอนยังไม่ได้ตั้งค่าอะไร) ส่วนกรณี `SCHEDULE_SOURCE` เป็น `"db"` หรือ `"json"` จะใช้ `cam_config.schedule_rules` ตรง ๆ

ที่สำคัญกว่านั้นคือผลของมันต่อ detection loop: ใน `_camera_loop()` ถ้า `is_camera_in_schedule()` คืน `False` และกล้องกำลังเชื่อมต่ออยู่ ระบบจะ **ปิดการเชื่อมต่อ (`camera.stop()`)** และ sleep 5 วิ ก่อนเช็คตารางใหม่ — พอถึงเวลาตามตาราง จะ**เชื่อมต่อกล้องใหม่**อัตโนมัติ (`CameraReader(cam_config.source).start()`) วิธีนี้ช่วยประหยัด CPU/network สำหรับกล้องที่ไม่ต้องตรวจจับตลอดเวลา

### 6.4 โหลด config กล้องจากฐานข้อมูลจริง (Production)

ที่ผ่านมาตัวอย่างในคอร์สนี้อ่านจาก `config/cameras.json` แต่นั่นเหมาะกับตอนเรียน/ทดสอบเท่านั้น ระบบจริงควรตั้ง `.env`:

```dotenv
CAMERA_CONFIG_SOURCE=db
```
ให้ `load_camera_configs()` (ใน `src/camera/camera_config.py`) เรียก `_load_from_db()` แทนการเปิดไฟล์ JSON ฟังก์ชันนี้ **ทำงานได้จริงแล้ว** ไม่ใช่แค่โครงร่าง:

1. Query `smg.mst_camera` เอากล้องที่ active ของ `company_code` ปัจจุบัน (`rtsp_url`, `username`, `password`, `schedule_json`)
2. แทนค่า `{user}`/`{password}` ใน `rtsp_url` ด้วย username/password เฉพาะกล้อง (ถ้ามี) หรือ fallback เป็น `CAMERA_RTSP_USER`/`CAMERA_RTSP_PASSWORD` จาก `.env`
3. Query `smg.mst_detection_area` เอา `polygon_json` ทุกแถวของกล้องนั้น แปลงเป็น `danger_zones`
4. Parse `schedule_json` เป็น `schedule_rules`

พูดง่าย ๆ คือ **ในระบบจริง admin จัดการกล้องทั้งหมดผ่านหน้าเว็บ (6.1–6.3) แล้ว Python service แค่มาอ่านจากฐานข้อมูล** ไม่ต้องมีใครไปแก้ `cameras.json` ด้วยมืออีกเลย

### 6.5 หมายเหตุ: Camera CRUD ไม่ผ่าน Stored Procedure

ต่างจากส่วนใหญ่ของระบบที่ logic การอ่าน/เขียนข้อมูลอยู่ใน stored procedure (`smg.sp_*`) — endpoint สร้าง/แก้ไข/ลบกล้อง (`POST /api/cameras`, `POST /api/cameras/:camera_no/update`, `POST /api/cameras/:camera_no/delete`) ใน `data-api/server.js` เขียน SQL แบบ **parameterized query ตรง ๆ** (`INSERT`/`UPDATE`/`DELETE` ผ่าน `.input(...)`) ไม่ได้เรียก stored procedure

นี่ยัง**ปลอดภัย**อยู่ (parameterized ทุกค่า ไม่มี string concat แบบ f-string ที่เสี่ยง SQL injection) เพียงแต่เป็น pattern ที่ต่างจากส่วนอื่นของระบบ (เช่น `GET /api/cameras` ที่ยังเรียก `smg.sp_get_camera_status` ตามปกติ) — ผู้เรียนควรรู้ไว้ว่านี่เป็นข้อยกเว้นที่ตั้งใจ ไม่ใช่ความผิดพลาด

---

## ส่วนที่ 7 — แบบฝึกหัด

1. **กำหนด polygon:** ใช้รูปจากกล้องจริง (หรือรูปทดสอบ) หาพิกัดมุม 4 จุดของพื้นที่อันตราย แล้วใส่ใน `config/cameras.json`
2. **ทดสอบ point-in-polygon:** สร้าง `AreaChecker` แล้วทดสอบด้วยพิกัดจุดต่าง ๆ ว่าอยู่ใน/นอก polygon
3. **ทดสอบ dwell timer:** จำลองสถานการณ์คนเข้า-อยู่-ออก โดยเรียก `tracker.update()` หลายครั้ง ดูว่า return True เมื่อไร
4. **วาด polygon:** เปิดรูปทดสอบ วาด polygon ด้วย `area_checker.draw_polygons()` แล้วบันทึกเป็น jpg
5. **รัน playground:** ดูตัวอย่างใน `playground/04-area-detection/example.py`

---

## ส่วนที่ 8 — Checklist หลังเรียน

- [ ] เข้าใจระบบพิกัดภาพ (x เพิ่มขวา, y เพิ่มลง)
- [ ] กำหนด polygon ใน `config/cameras.json` ได้
- [ ] เข้าใจว่าจุดอ้างอิงคน = กึ่งกลางขอบล่างของ bbox
- [ ] ทดสอบ `is_in_danger_zone()` และได้ผลถูกต้อง
- [ ] อธิบายกติกาตัดสิน event ได้ครบ (รวมเงื่อนไขยกเว้น bicycle)
- [ ] แยกความแตกต่างระหว่าง `DWELL_SECONDS` กับ `ALERT_COOLDOWN_SECONDS` ได้
- [ ] วาด polygon และ bbox ลงบน frame แล้วบันทึกได้
- [ ] รู้ว่า admin จัดการกล้อง + วาด polygon + ตั้งตารางเวลาผ่านเว็บได้ ไม่ต้องแก้ JSON มือ
- [ ] รู้ว่า `CAMERA_CONFIG_SOURCE=db` ทำให้ระบบอ่าน config กล้องจากฐานข้อมูลแทน JSON

---

## ส่วนที่ 9 — Common Error + วิธีแก้

### polygon ไม่ถูกต้อง — parse error

```json
[
  [100, 100], [540, 100], [540, 380], [100, 380]
]
```
ตรวจสอบ JSON syntax อย่างระมัดระวัง หากลืม `]` หรือ `,` จะเกิด Error ทันที
---

### คนอยู่ในพื้นที่ชัดเจน แต่ `is_in_danger_zone` คืน False

**สาเหตุ:** polygon กำหนดผิด ต้องเป็นพิกัดในภาพจากกล้องนั้น ๆ ไม่ใช่พิกัดจากภาพอื่น

**วิธีตรวจสอบ:**
```python
# ดู frame size ก่อน
print(frame.shape)   # (height, width, 3)

# ถ้า frame คือ 720p (1280x720) แต่ polygon ใส่พิกัดของ 1080p (1920x1080)
# ต้อง scale polygon ด้วย
scale_x = 1280 / 1920
scale_y = 720 / 1080
```
---

### Event ถูก trigger ทุก frame หลัง 5 วิ (ส่ง alert spam)

**สาเหตุ:** ลืมตรวจสอบ cooldown หรือ `ALERT_COOLDOWN_SECONDS` น้อยเกิน

```dotenv
ALERT_COOLDOWN_SECONDS=120   # รอ 2 นาทีก่อนส่งซ้ำ
```
---

### Event ไม่ถูก reset เมื่อคนออก

**สาเหตุ:** `tracker.update(False)` ไม่ถูกเรียก ตรวจสอบว่า detection loop ส่ง `person_in_zone is not None` ถูกต้อง

---

## ส่วนที่ 10 — ควร commit อะไร

```text
✅ commit:
├── src/detection/area_checker.py
├── src/detection/detection_service.py
├── src/utils/helpers.py
└── playground/04-area-detection/example.py
```
---

## ส่วนที่ 11 — ไม่ควร commit อะไร

```text
❌ ห้าม commit:
├── .env                (มีพิกัด polygon + secret อื่น)
├── evidence.jpg        (รูปหลักฐาน)
└── *.jpg, *.png        (รูปทดสอบที่มีข้อมูลจริง)
```
---

### ตารางสรุปกติกา Event (สำคัญมาก)

| ขั้น | สถานการณ์ | การกระทำ |
|------|-----------|---------|
| 1 | ได้ detection จาก YOLO | หาจุดอ้างอิง = กลางล่าง bbox (เฉพาะ person) |
| 2 | จุดอ้างอิงอยู่ใน polygon | ตรวจสอบต่อว่าอยู่ใกล้ bicycle ไหม |
| 3 | อยู่ใกล้ bicycle (< BICYCLE_PROXIMITY_PX = 70px) | ถือว่าปลอดภัย (กำลังขี่จักรยานผ่าน) — ไม่นับเวลา |
| 4 | ไม่ได้อยู่ใกล้ bicycle และอยู่ต่อเนื่อง > DWELL_SECONDS | เกิด event → เช็ค cooldown → alert |
| 5 | คนออกจาก polygon | reset ตัวจับเวลาทั้งหมด |

> **DWELL_SECONDS** = ต้องอยู่นานแค่ไหนถึงนับ event (default=5)  
> **ALERT_COOLDOWN_SECONDS** = หลังแจ้งแล้วเว้นนานแค่ไหนถึงแจ้งซ้ำ (default=120)
