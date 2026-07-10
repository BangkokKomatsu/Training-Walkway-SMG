# คลาส 2: Project Structure + Camera + YOLO — Outline สำหรับทำสไลด์

> **รูปแบบ:** ออนไลน์ | **เวลารวม:** 3 ชั่วโมง | **ผู้เรียน:** 10–25 คน | **ระดับ:** มือใหม่ผสม | **เน้น hands-on**
> เอกสารนี้เป็น **content outline แบบ slide-by-slide** ไว้ไปสร้าง PowerPoint/Canva เอง ไม่ใช่สไลด์สำเร็จรูป
> อ้างอิงเนื้อหาจาก [`03-python-project-structure.md`](../course-modules/03-python-project-structure.md), [`04-opencv-camera-basic.md`](../course-modules/04-opencv-camera-basic.md), [`05-yolo-human-detection.md`](../course-modules/05-yolo-human-detection.md)

## ⏱️ Timeline สรุป

| ช่วง | เวลา | สัดส่วน |
|---|---|---|
| 0. Recap & เป้าหมาย | 10 นาที | slide 1–4 |
| 1. Module 03 — โครงสร้างโปรเจกต์ | 35 นาที | slide 5–13 |
| 2. Module 04 — OpenCV + กล้อง (hands-on) | 50 นาที | slide 14–24 |
| ☕ พัก | 15 นาที | — |
| 3. Module 05 — YOLO (hands-on) | 60 นาที | slide 25–37 |
| 4. รวมร่าง + สรุป + Q&A | 10 นาที | slide 38–41 |
| **รวม** | **180 นาที** | |

⚠️ **ไฮไลต์ที่ห้ามตัด:** hands-on "เปิดกล้องเห็นภาพ" (slide 18) และ "รัน YOLO เห็น bbox" (slide 31, 35)
⚠️ ยังไม่แตะ Database/Polygon/Alert วันนี้ — อยู่คลาสถัดไป (Module 06–09)

---

## ช่วงที่ 0 — Recap & เป้าหมาย (10 นาที)

### Slide 1 — Title
- Walkway Detection System — Training Course
- **คลาส 2: Project Structure + Camera + YOLO**
- วันที่ / ผู้สอน / ช่องถามคำถาม (Teams chat)

### Slide 2 — ทวน Class 1 (เช็คความพร้อม)
- Class 1 จบแล้วทุกคนควรมี: ✅ venv `walkway` + library ครบ · ✅ รัน `python main.py` เห็น log ได้ · ✅ อ่าน Python พื้นฐานออก
- **Speaker note:** ถามใน chat "ใครยังรัน `python main.py` ไม่ผ่านบ้าง" — เก็บตกก่อนเริ่ม ไม่งั้น hands-on วันนี้จะติด

### Slide 3 — เป้าหมายวันนี้ (จบคลาสแล้วทำอะไรได้)
1. **เข้าใจโครงสร้างโปรเจกต์** — รู้ว่าไฟล์ไหนอยู่ที่ไหน ทำอะไร
2. **เปิดกล้อง/วิดีโอได้** — อ่านภาพจาก RTSP / webcam / ไฟล์ ด้วย OpenCV
3. **รัน YOLO ได้** — โหลดโมเดล ตรวจจับคน+จักรยาน เห็น bounding box จริง

### Slide 4 — วันนี้อยู่ตรงไหนของระบบ
```text
CCTV (RTSP) → Python+OpenCV → YOLO(person+bicycle) → Area Checker(polygon+dwell)
   └──────── วันนี้เรียน 3 กล่องนี้ ────────┘        (Module 06 คลาสหน้า)
   → Event → เซฟรูป → MSSQL → Teams/Email → เว็บ React
```
- **Speaker note:** ย้ำว่าวันนี้คือ "ต้นน้ำ" ของ pipeline — ได้ภาพ + ตรวจเจอคน ที่เหลือคือเอาผลไปตัดสิน/เก็บ/แจ้ง

---

## ช่วงที่ 1 — Module 03: โครงสร้างโปรเจกต์ (35 นาที)

> อ้างอิงเต็ม: [`03-python-project-structure.md`](../course-modules/03-python-project-structure.md) — แปะลิงก์ใน chat

### Slide 5 — ทำไมต้องแบ่งโฟลเดอร์?
- นึกภาพโค้ด 3,000 บรรทัดในไฟล์เดียว → หาของยาก แก้ bug ยาก คน 2 คนแก้ชนกัน
- **Separation of Concerns** = แบ่งตาม "ความรับผิดชอบ": กล้อง→`src/camera/`, AI→`src/detection/`, DB→`src/database/`
- ผลดี: หาโค้ดง่าย · แก้ส่วนหนึ่งไม่กระทบส่วนอื่น · ทดสอบแยกส่วนได้

### Slide 6 — โครงสร้าง repo จริง
```text
walkway-detection-system/
├── main.py              ← รัน: python main.py (entry point เดียว)
├── requirements.txt · .env.example · .env(ห้ามขึ้น Git) · .gitignore
├── config/              ← settings.py (โหลด .env), logging_config.py
├── src/
│   ├── camera/          ← camera_reader.py, camera_config.py   (Module 04)
│   ├── detection/       ← yolo_detector.py, area_checker.py, detection_service.py (05,06)
│   ├── alert/           ← teams_alert.py, email_alert.py       (Module 09)
│   ├── database/        ← mssql_connection.py, detection_repository.py (07)
│   ├── storage/         ← image_storage.py                     (Module 08)
│   └── utils/           ← helpers.py, logger.py
├── Models/              ← yolo11n.pt (โมเดล — ไม่ขึ้น Git)
├── sql/ · data-api/ · frontend/ · docs/ · playground/
```
- **Speaker note:** ชี้ให้เห็นว่าแต่ละโฟลเดอร์ map กับ Module ที่จะเรียน — วันนี้แตะ `config/`, `src/camera/`, `src/detection/`

### Slide 7 — Entry Point = `main.py`
```python
from config.logging_config import setup_logging
from config.settings import settings
from src.detection.detection_service import run_detection_service

def main() -> None:
    setup_logging()                     # ตั้ง logging ก่อน
    logger = logging.getLogger(__name__)
    logger.info("Company: %s | Device: %s", settings.COMPANY_CODE, settings.DEVICE)
    run_detection_service()             # เริ่มทำงาน

if __name__ == "__main__":
    main()
```
- **`if __name__ == "__main__"`:** รันเฉพาะเมื่อสั่งไฟล์นี้ตรง ๆ ถ้าไฟล์อื่น `import main` จะไม่ auto-run — best practice
- **ทำไมต้องรู้:** ผู้เรียนรัน `python main.py` อย่างเดียว ไม่ต้องรู้ว่าข้างในมีกี่ module

### Slide 8 — `config/settings.py` — ศูนย์กลาง Config
```python
@dataclass(frozen=True)
class Settings:
    DEVICE: str = os.getenv("DEVICE", "cpu")
    COMPANY_CODE: str = os.getenv("COMPANY_CODE", "DEMO")
    CONF_THRESHOLD: float = float(os.getenv("CONF_THRESHOLD", "0.5"))
    # ... (ดูไฟล์จริง config/settings.py)

settings = Settings()   # instance เดียวทั้งโปรเจกต์
```
```python
# วิธีใช้ในไฟล์อื่น
from config.settings import settings
device = settings.DEVICE
```
- **กฎเหล็ก:** ทุกไฟล์ใน `src/` อ่านค่าจาก `settings` เท่านั้น **ห้าม `os.getenv()` กระจัดกระจาย**

### Slide 9 — ทำไม `settings.py` ดีกว่า `os.getenv()` เกลื่อน
| วิธีเก่า (กระจัดกระจาย) | วิธีดี (settings.py) |
|---|---|
| แก้ชื่อตัวแปร .env ต้องไล่แก้ทุกไฟล์ | แก้ที่เดียว |
| ไม่รู้ว่า default คืออะไร | default ชัดเจนในที่เดียว |
| ยาก test | inject settings ได้ง่าย |

### Slide 10 — ทำไม `.env` ถึงจำเป็น
```text
Dev:         DB_SERVER=dev-sql-01     CAMERA_RTSP_USER=test
Production:  DB_SERVER=prod-cluster   CAMERA_RTSP_USER=prod
```
- ไม่มี `.env` → ต้องแก้โค้ดทุกครั้งที่ deploy (เสี่ยง + อาจ push password ขึ้น Git)
- มี `.env` → โค้ดเหมือนกันทุกที่ เปลี่ยนแค่ไฟล์ `.env` บนแต่ละเครื่อง
- **ห้าม commit `.env`** — อยู่ใน `.gitignore` แล้ว (ทวนจาก Class 1)

### Slide 11 — `__init__.py` คืออะไร
- ไฟล์ (อาจว่างเปล่า) ที่บอก Python ว่า "โฟลเดอร์นี้คือ package" → ทำให้ `import` ได้
```python
from src.camera.camera_reader import CameraReader   # ✅ ถ้ามี __init__.py
                                                     # ❌ ImportError ถ้าไม่มี
```

### Slide 12 — Logging (ทวน + ต่อยอด)
```text
2026-01-01 10:00:00 | INFO    | __main__                  | === Walkway Detection System ===
2026-01-01 10:00:01 | INFO    | src.camera.camera_reader  | เชื่อมต่อกล้องสำเร็จ
2026-01-01 10:00:05 | WARNING | src.alert.teams_alert     | Teams rate limit (HTTP 429)
```
- `%(name)s` = `__name__` ของแต่ละ module → รู้ทันทีว่า log มาจากไฟล์ไหน
- log ออกทั้ง console **และ** ไฟล์ `logs/walkway.log` (ย้อนดูได้)

### Slide 13 — 🖐️ Demo: รัน `main.py` + ไล่ flow
- รัน `python main.py` → ดู log (อย่าตกใจ WARNING เรื่อง DB/กล้องที่ยังไม่ตั้ง — ปกติ)
- ใน VS Code: `Ctrl+Click` ที่ `run_detection_service` → กระโดดไปดูไฟล์นั้น ทำต่อไปเรื่อย ๆ เพื่อเห็นว่าเรียกอะไรบ้าง
- **Common error:** `ModuleNotFoundError: No module named 'config'` → รันจากผิดโฟลเดอร์ **ต้องรันจาก root เสมอ** (ไม่ใช่ `cd src` แล้วรัน)

---

## ช่วงที่ 2 — Module 04: OpenCV + กล้อง RTSP (50 นาที · hands-on)

> อ้างอิงเต็ม: [`04-opencv-camera-basic.md`](../course-modules/04-opencv-camera-basic.md) · playground: `playground/02-opencv-camera/`

### Slide 14 — RTSP คืออะไร
- **RTSP (Real-Time Streaming Protocol)** = โปรโตคอลมาตรฐานที่กล้อง IP/CCTV ทุกยี่ห้อรองรับ ส่งวิดีโอสดผ่านเครือข่าย
```text
rtsp://<user>:<password>@<ip>:<port>/<path>
ตัวอย่าง: rtsp://admin:password@192.168.1.100:554/stream1
```

### Slide 15 — OpenCV คืออะไร
- **OpenCV** = library ประมวลผลภาพ: เปิด stream (RTSP/webcam/ไฟล์) · อ่าน frame · วาด (กล่อง/เส้น/polygon) · บันทึกรูป
- 💡 **`cv2.imshow()` ใช้ได้ในคอร์สนี้** (`src/`, `playground/`) — ตั้งใจให้เห็น live view ว่า YOLO จับถูกไหม bbox ตรงไหม **ยกเว้น** ตอน deploy บน server ไม่มีจอ (headless) จะ crash

### Slide 16 — Frame คืออะไร
- วิดีโอ = ภาพนิ่งหลายภาพฉายต่อกันเร็ว ๆ · แต่ละภาพ = 1 frame · กล้อง IP ส่วนใหญ่ 15–30 FPS
```python
frame.shape   # (480, 640, 3)  → (สูง, กว้าง, 3 ช่องสี)
frame.dtype   # uint8 (0-255)   → OpenCV ใช้ BGR ไม่ใช่ RGB
```

### Slide 17 — เปิดกล้องแบบง่าย (playground)
```python
import cv2
cap = cv2.VideoCapture("rtsp://admin:pass@192.168.1.100:554/stream1")
# cap = cv2.VideoCapture("test_video.mp4")   # ไฟล์วิดีโอ
# cap = cv2.VideoCapture(0)                   # webcam
cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)           # ลด latency

if not cap.isOpened():
    print("เปิดกล้องไม่ได้!")
else:
    ret, frame = cap.read()
    if ret:
        print(f"อ่านเฟรมสำเร็จ: {frame.shape}")
        cv2.imwrite("test_frame.jpg", frame)  # บันทึกเป็นรูป
cap.release()
```

### Slide 18 — 🖐️ Hands-on #1: เปิดกล้องเห็นภาพจริง
- รัน `playground/02-opencv-camera/example.py` ด้วยแหล่งภาพของตัวเอง (webcam `0` / วิดีโอ / RTSP)
- แก้ให้บันทึกเฟรมแรกเป็น `frame_001.jpg` แล้วเปิดดู
- ✅ **เช็คพอยต์:** ทุกคนต้องเห็น `frame.shape` ใน console + ได้ไฟล์รูป
- **Speaker note:** คนไม่มีกล้อง/วิดีโอให้ใช้ webcam `0` ก่อน — ถ้าไม่มีเลย จับคู่ดูหน้าจอเพื่อน

### Slide 19 — ทำไมต้องใช้ Thread แยก
- YOLO ใช้เวลา ~50–200  ms/เฟรม (CPU)
- **ไม่มี thread แยก:** อ่านกล้อง → รอ YOLO → อ่านกล้อง → รอ YOLO (delay สะสม เฟรมค้าง)
- **มี thread แยก:** thread หนึ่งอ่านกล้องตลอด เก็บ "เฟรมล่าสุด" · thread หลักหยิบไปทำ YOLO ได้ทันที

### Slide 20 — `CameraReader` — Production Class
```python
class CameraReader:
    def __init__(self, source, reconnect_delay=2.0, max_reconnect_delay=30.0): ...
    def start(self):                       # เริ่ม thread อ่านกล้องเบื้องหลัง
        self._thread = threading.Thread(target=self._read_loop, daemon=True)
        self._thread.start(); return self
    def get_latest_frame(self):            # คืนเฟรมล่าสุด (copy) หรือ None
        with self._lock:
            return None if self._latest_frame is None else self._latest_frame.copy()
```
- `_lock` (threading.Lock) กัน 2 thread อ่าน/เขียนเฟรมพร้อมกัน · `.copy()` ให้ thread หลักแก้เฟรมได้ปลอดภัย
- ใช้จริง: `camera = CameraReader(url).start()`

### Slide 21 — Reconnect + Backoff
```python
# ใน _read_loop: ถ้าเปิดไม่ได้/หลุด → รอ delay → ลองใหม่
delay = min(delay * 2, self.max_reconnect_delay)   # backoff
```
```text
ครั้งที่ 1: รอ 2 วิ → ครั้งที่ 2: รอ 4 วิ → ครั้งที่ 3: รอ 8 วิ ... สูงสุด 30 วิ
```
- **ทำไมต้อง backoff:** กล้องหลุดแล้ว retry ถี่ ๆ กิน CPU+network เปล่า — รอนานขึ้นเรื่อย ๆ ดีกว่า · สำเร็จเมื่อไหร่ reset กลับ 2 วิ

### Slide 22 — `CameraConfig` — แยก config กล้องออกจากโค้ด
```python
@dataclass
class CameraConfig:
    camera_no: str; camera_name: str; location_name: str; company_code: str
    source: str                                  # RTSP URL หรือไฟล์วิดีโอ
    danger_zones: list[list[tuple[int,int]]]     # หลาย polygon ต่อกล้อง (Module 06)
    schedule_rules: list[dict]                    # ตารางเวลาทำงาน (Module 06)
```
- `load_camera_configs()` อ่านจาก **ไฟล์ `cameras.json`** หรือ **MSSQL** ขึ้นกับ `CAMERA_CONFIG_SOURCE` (`db`/ไฟล์)
- **Speaker note:** `danger_zones` เป็น list-of-list เพราะ 1 กล้องมีพื้นที่อันตรายได้หลายเส้น (ลงลึก Module 06)

### Slide 23 — ทดสอบด้วยไฟล์/webcam (ไม่มี RTSP ก็เรียนได้)
```json
// config/cameras.json — ฟิลด์ชื่อ rtsp_url เสมอ
{ "camera_no": "1", "rtsp_url": "playground/02-opencv-camera/test_video.mp4" }
{ "camera_no": "1", "rtsp_url": "0" }   // webcam
```
- `CameraReader` รองรับทั้ง RTSP / ไฟล์ / webcam โดยอัตโนมัติ (แปลง `"0"` เป็น int ให้เอง)

### Slide 24 — Common Errors กล้อง
| อาการ | สาเหตุ | วิธีแก้ |
|---|---|---|
| `isOpened()` = False | IP/port/user/pass ผิด, network ไม่ถึง | `ping <ip>`, `Test-NetConnection -Port 554`, ลอง URL ใน **VLC** ก่อน |
| เฟรมหน่วง/ดีเลย์ | buffer เต็ม | ตั้ง `CAP_PROP_BUFFERSIZE=1` (มีในโค้ดแล้ว) |
| `ret=False` ทันที | กล้องเปิดได้แต่ยังไม่มีสัญญาณ | `time.sleep(1)` หลัง open ก่อน read |
| สีเพี้ยน | OpenCV ใช้ BGR ไม่ใช่ RGB | `cv2.cvtColor(frame, COLOR_BGR2RGB)` ตอนโชว์ด้วย matplotlib |

---

## ☕ พัก 15 นาที

---

## ช่วงที่ 3 — Module 05: YOLO ตรวจจับคน (60 นาที · hands-on)

> อ้างอิงเต็ม: [`05-yolo-human-detection.md`](../course-modules/05-yolo-human-detection.md) · playground: `playground/03-yolo-detection/`
> 📖 [YOLO11 Overview](https://docs.ultralytics.com/models/yolo11) · [Predict Mode](https://docs.ultralytics.com/modes/predict) · [Python Usage](https://docs.ultralytics.com/usage/python)

### Slide 25 — YOLO คืออะไร
- **YOLO (You Only Look Once)** = AI ตรวจจับวัตถุในภาพแบบ real-time · "Look Once" = สแกนทั้งภาพครั้งเดียว จึงเร็ว
```text
ภาพ → YOLO → person (100,50,300,400) conf=0.87 · person (450,80,600,420) conf=0.92
```

### Slide 26 — Pre-trained Model + COCO
- โมเดลที่ train มาแล้วบน **COCO dataset (80 classes)** โดย Ultralytics — เรา **ดาวน์โหลดมาใช้เลย ไม่ต้อง train**
- 80 classes มี: person(0), **bicycle(1)**, car, motorcycle, bus, truck, dog, chair ...
- โปรเจกต์นี้ใช้แค่ **class 0 = person** และ **class 1 = bicycle**

### Slide 27 — bbox + confidence
```text
bounding box (x1,y1,x2,y2) = พิกเซล   x1,y1=มุมบนซ้าย  x2,y2=มุมล่างขวา
confidence 0.0–1.0 = ความมั่นใจ       0.95 มั่นใจมาก · 0.30 ไม่แน่ใจ → กรองทิ้ง
```
- `CONF_THRESHOLD=0.5` = รับเฉพาะ detection ที่มั่นใจ ≥ 50%

### Slide 28 — YOLO11 มีหลายขนาด (เลือก nano ก่อน)
| รุ่น | พารามิเตอร์ (ล้าน) | ขนาดไฟล์ .pt | ความเร็ว CPU | ความแม่นยำ |
|---|---|---|---|---|
| **yolo11n** | ~2.6 M | **~5.4 MB** | เร็วมาก | ปานกลาง |
| yolo11s | ~9.4 M | ~19 MB | เร็ว | ดี |
| yolo11m | ~20 M | ~40 MB | ปานกลาง | ดีมาก |
| yolo11l / x | ~25 / 57 M | ใหญ่ขึ้น | ช้า | สูง/สูงสุด |
- CPU + real-time → เริ่มที่ **nano (n)** ก่อน ถ้าแม่นไม่พอค่อยขยับเป็น small (s)
- ⚠️ **หมายเหตุผู้สอน:** ตัวเลข "ล้าน" คือ *จำนวนพารามิเตอร์* ไม่ใช่ขนาดไฟล์ — ไฟล์ `yolo11n.pt` จริง ≈ 5.4 MB (อย่าสับสน 2.6M params กับ 2.6MB)

### Slide 29 — License AGPL-3.0 (รู้ไว้)
- ใช้ฟรีในโปรเจกต์ **open source** (ต้องเปิดโค้ด) · ใช้ในผลิตภัณฑ์เชิงพาณิชย์ต้องซื้อ **Enterprise License**
- internal use ในองค์กรที่ไม่ขายเป็นผลิตภัณฑ์ ส่วนใหญ่ใช้ได้ — แต่ควรเช็ค legal ของบริษัท · 📖 [Ultralytics License](https://www.ultralytics.com/license)

### Slide 30 — ทดสอบเบื้องต้น (playground)
```python
from ultralytics import YOLO
import cv2
model = YOLO("Models/yolo11n.pt")          # โหลดโมเดล (auto-download ครั้งแรก)
frame = cv2.imread("test_image.jpg")
results = model.predict(frame, conf=0.5, verbose=False)
for result in results:
    for box in result.boxes:
        class_name = result.names[int(box.cls[0])]
        confidence = float(box.conf[0])
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        print(f"{class_name}: conf={confidence:.2f} bbox=({int(x1)},{int(y1)},{int(x2)},{int(y2)})")
```

### Slide 31 — 🖐️ Hands-on #2: รัน YOLO เห็นผลจริง
- รัน `playground/03-yolo-detection/example.py` กับรูป/เฟรมที่มีคน
- ✅ **เช็คพอยต์:** console ต้อง print `person: conf=... bbox=...` อย่างน้อย 1 แถว
- **Speaker note:** เฟรมแรกช้า (โหลดโมเดล + warmup) เป็นปกติ — รอสักครู่

### Slide 32 — `YoloDetector` — Production Class
```python
PERSON_CLASS_ID, BICYCLE_CLASS_ID = 0, 1

class YoloDetector:
    def __init__(self, model_path, device="cpu", conf_threshold=0.5):
        self.model = YOLO(model_path); self.model.to(device); self._warmup()
    def detect(self, frame, imgsz=640) -> list[dict]:
        results = self.model.predict(frame, device=self.device, conf=self.conf_threshold,
                                     classes=[PERSON_CLASS_ID, BICYCLE_CLASS_ID],
                                     imgsz=imgsz, verbose=False)
        # → [{"bbox": (x1,y1,x2,y2), "confidence": 0.87, "class_name": "person"}, ...]
```
- **`_warmup()`** = รัน inference รอบแรกด้วยภาพเปล่า ให้รอบจริงเร็วขึ้น
- **`classes=[0,1]`** = ให้ YOLO คืนเฉพาะ person + bicycle (กรอง class อื่นทิ้งตั้งแต่ต้น)

### Slide 33 — `detect()` vs `detect_persons()`
- `detect(frame)` → คืน **person + bicycle**
- `detect_persons(frame)` → wrapper กรองเหลือ **เฉพาะ person** (backward-compatible)
- **จับ bicycle ไปทำไม?** ไม่ได้เอา bicycle มานับ dwell — ใช้เป็นเงื่อนไข "ยกเว้น" คนที่กำลังขี่จักรยานผ่าน ไม่ให้นับเป็นบุกรุก (กติกาเต็มอยู่ **Module 06** — `_get_unsafe_person`)

### Slide 34 — วาด bounding box บนเฟรม (เก็บหลักฐาน)
```python
def draw_detections(frame, detections):
    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        label = f'{det["class_name"]} {det["confidence"]:.0%}'
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)      # กล่องเขียว
        cv2.putText(frame, label, (x1, y1-5), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0,255,0), 2)
    return frame

annotated = draw_detections(frame.copy(), detections)
cv2.imwrite("detection_result.jpg", annotated)     # เซฟเป็น jpg
```

### Slide 35 — 🖐️ Hands-on #3: วาด bbox + ปรับ threshold
1. วาด bbox บนเฟรมของตัวเอง แล้วเซฟ `detection_result.jpg` → เปิดดู
2. ลองเปลี่ยน `CONF_THRESHOLD=0.3` เทียบ `0.7` แล้วสังเกตจำนวนกล่องที่ได้
- ✅ **เช็คพอยต์:** ทุกคนได้ภาพที่มีกรอบเขียวล้อมคน — **นี่คือไฮไลต์ของวันนี้**

### Slide 36 — GPU vs CPU
```dotenv
DEVICE=cpu     # default (ทุกเครื่องรันได้)
DEVICE=cuda    # ถ้ามี NVIDIA GPU (เร็วขึ้นมาก)
```
```python
import torch
print(torch.cuda.is_available())        # True = มี GPU พร้อมใช้
```
- ไม่มี GPU ก็ใช้ CPU ได้ แค่ช้ากว่า — วิธีเพิ่มความเร็วอยู่ **Module 12**

### Slide 37 — Common Errors YOLO
| อาการ | สาเหตุ | วิธีแก้ |
|---|---|---|
| `FileNotFoundError: Models/yolo11n.pt` | ไม่มีไฟล์ | ใช้ `YOLO("yolo11n.pt")` ให้ auto-download หรือโหลดวางเอง + `mkdir Models` |
| `CUDA out of memory` | VRAM ไม่พอ | `DEVICE=cpu` หรือลด `imgsz=320` |
| ตรวจไม่เจอคนทั้งที่มี | threshold สูงไป / คนไกล | ลด `CONF_THRESHOLD=0.3` หรือเพิ่ม `imgsz=1280` |
| เจอมั่ว (false positive) | threshold ต่ำไป | เพิ่ม `CONF_THRESHOLD=0.6` |
| ช้า >500ms/เฟรม (CPU) | ภาพใหญ่ | ลด `imgsz=320/416` (Module 12) |

---

## ช่วงที่ 4 — รวมร่าง + สรุป (10 นาที)

### Slide 38 — 🧩 รวมร่าง: camera → YOLO (ต่อ 2 module เข้าด้วยกัน)
```python
from src.camera.camera_reader import CameraReader
from src.detection.yolo_detector import YoloDetector
from config.settings import settings

camera = CameraReader(settings_source).start()
detector = YoloDetector(settings.YOLO_MODEL_PATH, settings.DEVICE, settings.CONF_THRESHOLD)

while True:
    frame = camera.get_latest_frame()
    if frame is None:
        continue
    detections = detector.detect(frame)          # ← Module 04 ป้อน Module 05
    print(f"พบวัตถุ {len(detections)} ชิ้น")
```
- **Speaker note:** นี่คือหัวใจที่ทั้งวันประกอบร่างกัน — กล้องป้อนเฟรม, YOLO ตรวจ · ที่เหลือ (polygon/dwell/event) คือ Module 06

### Slide 39 — Preview Module 06 (คลาสหน้า)
- เอา bbox ที่ได้วันนี้ → หา "จุดกึ่งกลางขอบล่าง" ของคน → เช็คว่าอยู่ใน **polygon พื้นที่อันตราย** ไหม
- อยู่ต่อเนื่อง > `DWELL_SECONDS` (5 วิ) → ตัดสินเป็น **event** · bicycle ใช้ยกเว้นคนขี่จักรยานผ่าน

### Slide 40 — สรุป + Checklist + การบ้าน
- ✅ วันนี้ทำได้: เข้าใจโครงสร้าง · เปิดกล้อง/วิดีโออ่านเฟรม · รัน YOLO เห็น bbox · ปรับ threshold
- **การบ้าน:** ทำ `playground/02` และ `playground/03` (`exercise.py`) ให้ครบ + อ่าน [Module 06](../course-modules/06-walkway-area-detection.md) ล่วงหน้า

### Slide 41 — Q&A + นัดหมาย
- ช่องถามคำถามนอกคลาส (Teams channel)
- คลาสถัดไป: Module 06 (Polygon + Dwell + Event Logic)
