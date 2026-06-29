# Module 06 — Walkway Area Detection (พื้นที่อันตรายและการตัดสิน Event)

> **ระดับ:** กลาง | **เวลาโดยประมาณ:** 90–120 นาที

---

## ส่วนที่ 1 — วัตถุประสงค์

เมื่อจบ module นี้ ผู้เรียนจะสามารถ:

- อธิบายระบบพิกัดภาพ (pixel coordinate) ได้
- กำหนด polygon พื้นที่อันตรายด้วยพิกัดพิกเซล
- วาด polygon ด้วย OpenCV บน frame
- ตรวจสอบว่าจุดอยู่ใน polygon หรือไม่ (point-in-polygon)
- เข้าใจกติกาตัดสิน event 4 ขั้น + dwell 5 วิ
- แยกความแตกต่างระหว่าง `DWELL_SECONDS` และ `ALERT_COOLDOWN_SECONDS`
- เก็บ area config แยกกล้อง

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

## ส่วนที่ 4 — Flow การทำงาน (กติกาตัดสิน Event 4 ขั้น)

```text
ได้ detections จาก YOLO
        ↓
ขั้น 1: หาจุดอ้างอิง = จุดกึ่งกลางขอบล่างของ bbox
        ↓
ขั้น 2: point-in-polygon → คนอยู่ในพื้นที่อันตรายไหม?
    ├── ไม่อยู่ → ขั้น 4: reset timer → ไม่มี event
    └── อยู่ → เริ่มจับเวลา (first_seen_time)
        ↓
ขั้น 3: อยู่ต่อเนื่อง > DWELL_SECONDS (5 วิ)?
    ├── ไม่ถึง → รอต่อ
    └── ถึงแล้ว → EVENT TRIGGERED!
        ├── เช็ค cooldown → ถ้าเพิ่งแจ้งไป ข้าม
        └── ถ้าผ่าน cooldown → บันทึก + ส่ง alert
        ↓
ขั้น 4: คนออกจากพื้นที่ → reset timer
```
---

## ส่วนที่ 5 — ตัวอย่าง Code

ดูไฟล์จริงที่:
- [src/detection/area_checker.py](../../src/detection/area_checker.py)
- [src/detection/detection_service.py](../../src/detection/detection_service.py)
- [src/utils/helpers.py](../../src/utils/helpers.py)

### 5.1 กำหนด Polygon ใน `.env`

```dotenv
# รูปแบบ: "x1,y1;x2,y2;x3,y3;..."
# ตัวอย่าง: สี่เหลี่ยม
DANGER_ZONE_POLYGON=100,100;540,100;540,380;100,380

# ตัวอย่าง: รูปห้าเหลี่ยม (พื้นที่ซับซ้อนกว่า)
DANGER_ZONE_POLYGON=100,200;300,100;500,100;600,300;350,400
```
> **วิธีหาพิกัด:** เปิดรูปจากกล้องใน Paint หรือ Photoshop แล้วนำเมาส์ไปวางที่จุดมุมพื้นที่ จะเห็น pixel coordinate ที่ต้องการ

**การแปลงพิกัดใน `config/settings.py`:**

```python
@property
def danger_zone_polygon(self) -> list[tuple[int, int]]:
    """แปลง 'x1,y1;x2,y2;...' → [(x1,y1), (x2,y2), ...]"""
    points = []
    for pair in self.DANGER_ZONE_POLYGON_RAW.split(";"):
        x_str, y_str = pair.split(",")
        points.append((int(x_str.strip()), int(y_str.strip())))
    return points
```
### 5.2 `AreaChecker` — ตรวจสอบ Point-in-Polygon

นี่คือโค้ดจริงใน [src/detection/area_checker.py](../../src/detection/area_checker.py):

```python
import cv2
import numpy as np


class AreaChecker:
    """เช็คว่าจุดอ้างอิงของคนอยู่ในพื้นที่อันตราย (polygon) หรือไม่"""

    def __init__(self, polygon: list[tuple[int, int]]):
        # แปลงเป็น numpy array ที่ OpenCV ต้องการ
        self.polygon = np.array(polygon, dtype=np.int32)

    def is_in_danger_zone(self, point: tuple[float, float]) -> bool:
        """
        ตรวจ point-in-polygon ด้วย cv2.pointPolygonTest
        คืน True ถ้าจุดอยู่ในหรือบนขอบ polygon
        """
        result = cv2.pointPolygonTest(
            self.polygon,
            (float(point[0]), float(point[1])),
            False   # False = แค่บอกว่าใน/นอก ไม่ต้องบอกระยะ
        )
        # result >= 0 คือ ใน polygon (>0 = ใน, =0 = บนขอบ, <0 = นอก)
        return result >= 0

    def draw_polygon(self, frame, color=(0, 0, 255), thickness=2):
        """วาดเส้น polygon ลงบน frame สำหรับบันทึกเป็นหลักฐาน"""
        cv2.polylines(
            frame,
            [self.polygon],
            isClosed=True,      # ปิดรูป (เชื่อมจุดแรกกับจุดสุดท้าย)
            color=color,        # BGR สีแดง = (0, 0, 255)
            thickness=thickness
        )
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
from src.utils.helpers import get_bbox_bottom_center
from src.detection.yolo_detector import YoloDetector
from src.detection.area_checker import AreaChecker
from src.detection.detection_service import CameraEventTracker
from config.settings import settings

# ตั้งค่า
detector = YoloDetector(settings.YOLO_MODEL_PATH, settings.DEVICE, settings.CONF_THRESHOLD)
area_checker = AreaChecker(cam_config.danger_zones)  # list ของ polygon จาก cameras.json
tracker = CameraEventTracker(settings.DWELL_SECONDS, settings.ALERT_COOLDOWN_SECONDS)

# loop หลัก
while True:
    frame = camera.get_latest_frame()
    if frame is None:
        time.sleep(0.1)
        continue

    # YOLO detect persons
    detections = detector.detect_persons(frame)

    # หาคนในพื้นที่อันตราย
    person_in_zone = None
    for det in detections:
        ref_point = get_bbox_bottom_center(det["bbox"])
        if area_checker.is_in_danger_zone(ref_point):
            person_in_zone = det
            break  # คนแรกที่พบในพื้นที่

    # อัปเดต event tracker
    if tracker.update(person_in_zone is not None):
        # EVENT TRIGGERED!
        print(f"🚨 คนอยู่ในพื้นที่อันตราย > {settings.DWELL_SECONDS} วิ!")
        # บันทึก + ส่ง alert (ดู Module 07–09)

    time.sleep(0.03)
```
### 5.6 วาด polygon + bbox บน frame ก่อนบันทึก

```python
import cv2

def prepare_evidence_frame(frame, detections, area_checker):
    """เตรียม frame สำหรับบันทึกเป็นหลักฐาน: วาด polygon + bbox ทุกคน"""
    save_frame = frame.copy()

    # วาด polygon พื้นที่อันตราย (สีแดง)
    area_checker.draw_polygon(save_frame, color=(0, 0, 255), thickness=2)

    # วาด bbox ของทุกคนที่พบ (สีเขียว)
    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        cv2.rectangle(save_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

        # วาดจุดอ้างอิง
        cx = int((x1 + x2) / 2)
        cy = y2
        cv2.circle(save_frame, (cx, cy), 5, (255, 0, 0), -1)  # จุดสีน้ำเงิน

    return save_frame

# บันทึกเป็นหลักฐาน (ห้ามใช้ imshow)
evidence = prepare_evidence_frame(frame, detections, area_checker)
cv2.imwrite("evidence.jpg", evidence)
```
---

## ส่วนที่ 6 — แบบฝึกหัด

1. **กำหนด polygon:** ใช้รูปจากกล้องจริง (หรือรูปทดสอบ) หาพิกัดมุม 4 จุดของพื้นที่อันตราย แล้วใส่ใน `.env`
2. **ทดสอบ point-in-polygon:** สร้าง `AreaChecker` แล้วทดสอบด้วยพิกัดจุดต่าง ๆ ว่าอยู่ใน/นอก polygon
3. **ทดสอบ dwell timer:** จำลองสถานการณ์คนเข้า-อยู่-ออก โดยเรียก `tracker.update()` หลายครั้ง ดูว่า return True เมื่อไร
4. **วาด polygon:** เปิดรูปทดสอบ วาด polygon ด้วย `area_checker.draw_polygon()` แล้วบันทึกเป็น jpg
5. **รัน playground:** ดูตัวอย่างใน `playground/04-area-detection/example.py`

---

## ส่วนที่ 7 — Checklist หลังเรียน

- [ ] เข้าใจระบบพิกัดภาพ (x เพิ่มขวา, y เพิ่มลง)
- [ ] กำหนด polygon ใน `.env` ได้ในรูปแบบ `x1,y1;x2,y2;...`
- [ ] เข้าใจว่าจุดอ้างอิงคน = กึ่งกลางขอบล่างของ bbox
- [ ] ทดสอบ `is_in_danger_zone()` และได้ผลถูกต้อง
- [ ] อธิบายกติกา 4 ขั้นได้ครบ
- [ ] แยกความแตกต่างระหว่าง `DWELL_SECONDS` กับ `ALERT_COOLDOWN_SECONDS` ได้
- [ ] วาด polygon และ bbox ลงบน frame แล้วบันทึกได้

---

## ส่วนที่ 8 — Common Error + วิธีแก้

### polygon ไม่ถูกต้อง — parse error

```text
DANGER_ZONE_POLYGON=100,100;540,100;540,380;100,380  ✅
DANGER_ZONE_POLYGON=100, 100; 540, 100               ✅ (มี space ได้ — code strip แล้ว)
DANGER_ZONE_POLYGON=100 100 540 100                  ❌ (ขาด , และ ;)
```
ถ้า parse ผิดจะ error:
```text
ValueError: not enough values to unpack (expected 2, got 1)
```
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

## ส่วนที่ 9 — ควร commit อะไร

```text
✅ commit:
├── src/detection/area_checker.py
├── src/detection/detection_service.py
├── src/utils/helpers.py
└── playground/04-area-detection/example.py
```
---

## ส่วนที่ 10 — ไม่ควร commit อะไร

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
| 1 | ได้ detection จาก YOLO | หาจุดอ้างอิง = กลางล่าง bbox |
| 2 | จุดอ้างอิงอยู่ใน polygon | เริ่มจับเวลา (first_seen_time) |
| 3 | อยู่ต่อเนื่อง > DWELL_SECONDS | เกิด event → เช็ค cooldown → alert |
| 4 | คนออกจาก polygon | reset ตัวจับเวลาทั้งหมด |

> **DWELL_SECONDS** = ต้องอยู่นานแค่ไหนถึงนับ event (default=5)  
> **ALERT_COOLDOWN_SECONDS** = หลังแจ้งแล้วเว้นนานแค่ไหนถึงแจ้งซ้ำ (default=120)
