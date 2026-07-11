# Python Architecture — Training-WalkWay-SMG

เอกสารนี้อธิบาย **สถาปัตยกรรมฝั่ง Python** (`main.py`, `config/`, `src/`) โดยละเอียด — ใครทำหน้าที่อะไร
เรียกกันอย่างไร และทำไมถึงออกแบบแบบนี้ ส่วนโครงสร้างไฟล์แบบ tree ทั้งโปรเจกต์ (รวม frontend/data-api/sql) ดูที่
[`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md)

> กติกาที่ล็อกไว้แล้ว (ห้ามเปลี่ยนเอง) อยู่ใน [`CLAUDE.md`](CLAUDE.md) §4 — เอกสารนี้อธิบาย "โค้ดจัดวางยังไง"
> ไม่ใช่ "ตัดสินใจอะไรไปแล้วบ้าง"

---

## 1. ภาพรวม — 3 ชั้น (layers)

```
┌─────────────────────────────────────────────────────────────┐
│  main.py                     ← entry point เดียวของระบบ        │
└───────────────────────────┬─────────────────────────────────┘
                             │
┌───────────────────────────▼─────────────────────────────────┐
│  config/                     ← ชั้นตั้งค่า (โหลดครั้งเดียว)      │
│    settings.py     → ค่าจาก .env ทั้งหมด (single source)      │
│    logging_config.py → ตั้ง logging (console + ไฟล์ log)      │
│    cameras.json    → รายชื่อกล้อง + polygon + schedule        │
└───────────────────────────┬─────────────────────────────────┘
                             │
┌───────────────────────────▼─────────────────────────────────┐
│  src/                        ← ชั้น logic หลัก แยกตามหน้าที่     │
│                                                                │
│   camera/  →  detection/  →  storage/ + database/ + alert/    │
│   (รับภาพ)    (วิเคราะห์+ตัดสิน)   (บันทึกหลักฐาน + แจ้งเตือน)     │
│                                                                │
│   monitoring/  → เช็คสุขภาพระบบ (ทำงานคู่ขนาน ไม่อยู่ใน critical path)│
│   utils/       → helper function ที่ใช้ร่วมกันหลายโมดูล          │
└─────────────────────────────────────────────────────────────┘
```

**กฎการ import ระหว่างชั้น:**
- `main.py` → import `config` + `src.detection.detection_service` เท่านั้น (ไม่ import อย่างอื่นตรง ๆ)
- ทุกไฟล์ใน `src/` อ่านค่าตั้งค่าจาก `from config.settings import settings` เท่านั้น — **ห้าม** `os.getenv()` กระจัดกระจาย
- `detection_service.py` เป็นตัวประสาน (orchestrator) — import จากทุกโมดูลย่อยของ `src/`
- โมดูลย่อย (`camera/`, `alert/`, `database/`, `storage/`) **ไม่ import ข้ามกันเอง** (ยกเว้น `camera_config.py` เรียก `database` เฉพาะตอนโหลด config จาก DB) — กันไม่ให้เกิด circular import และคงความเป็นโมดูลอิสระ

---

## 2. โครงสร้างไฟล์แบบ Tree (Python เท่านั้น)

```text
Training-WalkWay-SMG/
├── main.py                        # entry point เดียว — setup_logging() แล้วเรียก run_detection_service()
├── requirements.txt                # รายการ Python dependencies
├── .env                            # ค่าตั้งค่าจริง (ไม่ commit — ดู .env.example)
│
├── config/                         # ชั้นตั้งค่า โหลดจาก .env ครั้งเดียว
│   ├── __init__.py
│   ├── settings.py                 # dataclass `Settings` → ทุกไฟล์ import `from config.settings import settings`
│   ├── logging_config.py           # setup_logging() — console + logs/walkway.log (UTF-8)
│   └── cameras.json                # รายชื่อกล้อง + danger_zones (polygon) + schedule_rules (โหมด CAMERA_CONFIG_SOURCE=json)
│
├── src/                             # Source Code หลัก (ระบบ Detection)
│   ├── __init__.py
│   │
│   ├── camera/                     # ระบบดึงภาพจาก RTSP Stream
│   │   ├── __init__.py
│   │   ├── camera_config.py        # CameraConfig (dataclass) + load_camera_configs() (จาก JSON หรือ DB)
│   │   └── camera_reader.py        # CameraReader — thread อ่านเฟรมล่าสุด + reconnect อัตโนมัติ
│   │
│   ├── detection/                  # ระบบ AI ประมวลผลภาพ
│   │   ├── __init__.py
│   │   ├── area_checker.py         # AreaChecker — คำนวณ Point-in-Polygon (cv2.pointPolygonTest)
│   │   ├── detection_service.py    # หัวใจระบบ — ควบคุม flow หลัก, dwell timer, cooldown, threading
│   │   └── yolo_detector.py        # YoloDetector — โหลด/รัน YOLO11 (yolo11n.pt) ตรวจ person+bicycle
│   │
│   ├── alert/                      # ระบบแจ้งเตือนไปยังภายนอก
│   │   ├── __init__.py
│   │   ├── email_alert.py          # send_email_alert() ผ่าน SMTP M365 + send_email_via_graph() (สำรอง)
│   │   └── teams_alert.py          # send_teams_alert() ผ่าน Power Automate Workflows webhook
│   │
│   ├── storage/                    # ระบบจัดเก็บหลักฐาน
│   │   ├── __init__.py
│   │   └── image_storage.py        # save_detection_image() / save_camera_snapshot() ลง Shared Drive
│   │
│   ├── database/                   # ระบบบันทึกข้อมูล (SQL Server)
│   │   ├── __init__.py
│   │   ├── detection_repository.py # เรียก smg.sp_* เท่านั้น (parameterized query)
│   │   └── mssql_connection.py     # get_connection() ผ่าน pyodbc พร้อม retry
│   │
│   ├── monitoring/                 # ระบบตรวจสอบสุขภาพการทำงาน
│   │   ├── __init__.py
│   │   └── health_reporter.py      # report_health() เช็ค DB/storage/กล้อง แล้ว log ลง trn_system_log
│   │
│   └── utils/                      # เครื่องมือช่วยเหลือทั่วไป
│       ├── __init__.py
│       ├── helpers.py              # get_bbox_reference_point(), is_boxes_close(), draw_label()
│       └── logger.py               # get_logger(name) wrapper รอบ logging.getLogger()
│
└── Models/                          # โฟลเดอร์เก็บโมเดล AI (.pt) — ห้าม commit
    └── yolo11n.pt                   # โมเดล YOLO11 pre-trained (ดาวน์โหลด/ใส่เอง)
```

> โฟลเดอร์อื่นที่ไม่ใช่ Python (`sql/`, `data-api/`, `frontend/`, `docs/`, `playground/`) ดูภาพรวมทั้งหมดได้ที่
> [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md)

---

## 3. `main.py` — Entry Point

```python
def main() -> None:
    setup_logging()              # config/logging_config.py
    run_detection_service()      # src/detection/detection_service.py
```

หน้าที่เดียวคือ **ตั้ง logging แล้วส่งต่อให้ `detection_service`** ทั้งหมด — ไม่มี business logic ในไฟล์นี้
รันด้วย `python main.py`

---

## 4. `config/` — ชั้นตั้งค่า

| ไฟล์ | หน้าที่ |
|---|---|
| `settings.py` | โหลด `.env` ผ่าน `python-dotenv` เข้า dataclass `Settings` (frozen) ตัวเดียว `settings` — ทุกไฟล์ import ตัวนี้ตัวเดียว |
| `logging_config.py` | `setup_logging()` — ตั้ง log format เดียวกันทั้งระบบ, เขียนออก console + `logs/walkway.log` (UTF-8, กันปัญหาภาษาไทยพังบน Windows console) |
| `cameras.json` | รายชื่อกล้อง + `danger_zones` (polygon) + `schedule_rules` — ใช้เมื่อ `CAMERA_CONFIG_SOURCE=json` (ทางเลือกอื่นคือโหลดจาก DB) |

`Settings` แบ่งเป็นกลุ่มตามหมวดที่ใช้: General, Camera, Detection (YOLO), Event Logic
(`DWELL_SECONDS` / `ALERT_COOLDOWN_SECONDS`), Database, Storage, Alert (Teams/Email), data-api internal call

---

## 5. `src/` — รายละเอียดแต่ละโมดูล

### 5.1 `camera/` — รับภาพจากกล้อง

| ไฟล์ | คลาส/ฟังก์ชันหลัก | หน้าที่ |
|---|---|---|
| `camera_config.py` | `CameraConfig` (dataclass), `load_camera_configs()` | โหลดรายชื่อกล้องจาก JSON หรือ DB (`CAMERA_CONFIG_SOURCE`) คืนเป็น list ของ `CameraConfig` |
| `camera_reader.py` | `CameraReader` | เปิด RTSP stream ด้วย `cv2.VideoCapture`, อ่านเฟรมใน thread แยก (**latest-frame pattern** — เก็บเฟรมล่าสุดตัวเดียว ไม่สะสมคิว), reconnect อัตโนมัติเมื่อกล้องหลุด (retry + backoff) |

`CameraConfig` เก็บ `danger_zones`, `schedule_rules`, `reference_point` (จุดของ bbox ที่ใช้เช็ค polygon —
ปรับได้ต่อกล้อง เพราะบางมุมกล้องจุดกึ่งกลางเท้าไม่เหมาะ)

### 5.2 `detection/` — วิเคราะห์ภาพและตัดสิน event

| ไฟล์ | คลาส/ฟังก์ชันหลัก | หน้าที่ |
|---|---|---|
| `yolo_detector.py` | `YoloDetector` | โหลดโมเดล `yolo11n.pt` ครั้งเดียว, `detect(frame)` คืน list ของ person+bicycle detections (thread-safe ใช้ร่วมกันได้ทุกกล้อง) |
| `area_checker.py` | `AreaChecker` | `point_from_bbox()` หาจุดอ้างอิงคน, `is_in_danger_zone()` เช็ค point-in-polygon ด้วย `cv2.pointPolygonTest`, `draw_polygons()` วาดเส้นพื้นที่ลงเฟรม (เซฟหลักฐาน ไม่ใช่ imshow) |
| `detection_service.py` | `CameraEventTracker`, `run_detection_service()` | **หัวใจของระบบ** — ประสานทุกโมดูลเข้าด้วยกัน ดูรายละเอียด §6 |

### 5.3 `storage/` — เก็บรูปหลักฐาน

`image_storage.py`:
- `save_detection_image(frame, company_code, camera_no)` → เซฟรูป event ลง
  `{IMAGE_SHARED_DRIVE}/{company_code}/{camera_no}/{YYYYMMDD}/detection_..._{timestamp}.jpg`
- `save_camera_snapshot(...)` → เซฟภาพนิ่งของกล้อง (ใช้ตอนหน้าเว็บ "Draw Polygon" ขอ sync ภาพล่าสุด)

`IMAGE_SHARED_DRIVE` มาจาก `.env` เท่านั้น (local folder ตอนเรียน หรือ shared drive จริงตอน production)

### 5.4 `database/` — บันทึกและอ่านข้อมูลจาก MSSQL

| ไฟล์ | หน้าที่ |
|---|---|
| `mssql_connection.py` | `get_connection()` — เปิด connection ด้วย `pyodbc`, retry สูงสุด 3 ครั้ง, raise `ConnectionError` ถ้าล้มเหลวทุกครั้ง |
| `detection_repository.py` | เรียก **Stored Procedure เท่านั้น** (`smg.sp_*`) ผ่าน parameterized query — `insert_detection_event`, `update_alert_status`, `insert_system_log`, `has_pending_snapshot_request`, `update_camera_snapshot_time` |

ห้ามต่อ SQL ด้วย f-string/string concat เด็ดขาด (ดู CLAUDE.md §5) — ทุก query ใช้ `?` placeholder ของ `pyodbc`

### 5.5 `alert/` — แจ้งเตือนออกไปภายนอก

| ไฟล์ | ฟังก์ชันหลัก | หน้าที่ |
|---|---|---|
| `teams_alert.py` | `send_teams_alert(event)` | ยิง `requests.post()` ตรงไปที่ Power Automate Workflows webhook (`TEAMS_WEBHOOK_URL`), เรียก `_get_image_url()` ขอ signed URL จาก data-api ก่อนแนบรูป |
| `email_alert.py` | `send_email_alert(event)`, `send_email_via_graph(event)` | ส่งอีเมลผ่าน SMTP M365 (หลัก) หรือ Microsoft Graph API (ภาคผนวก สำรองไว้กรณี M365 ปิด SMTP auth) |

### 5.6 `monitoring/` — สุขภาพระบบ

`health_reporter.py` → `report_health(camera_statuses)` เช็ค DB connection, storage path เข้าถึงได้ไหม,
สถานะกล้องแต่ละตัว แล้วบันทึกลง `trn_system_log` ผ่าน `insert_system_log` — เรียกแยกจาก detection loop หลัก

### 5.7 `utils/` — helper ใช้ร่วมกัน

`helpers.py` — ฟังก์ชันล้วน ไม่มี state:
- `get_bbox_reference_point(bbox, mode)` — คำนวณจุดอ้างอิงของ bbox ตาม 8 โหมด (`bottom_center`, `bottom_left`, `left_center`, ...)
- `is_boxes_close(box1, box2, threshold)` — เช็คระยะห่าง bbox (ใช้ตรวจ person ใกล้ bicycle)
- `draw_label(frame, text, x, y, color)` — วาด label + พื้นหลังบนเฟรมด้วย `cv2` ล้วน (ไม่พึ่ง `cvzone`)

`logger.py` — `get_logger(name)` wrapper รอบ `logging.getLogger()`

---

## 6. `detection_service.py` — โฟลว์การทำงานแบบละเอียด

### 6.1 `run_detection_service()` — จุดเริ่ม

1. `load_camera_configs()` → ได้ list ของ `CameraConfig`
2. สร้าง `YoloDetector` **ตัวเดียว** ใช้ร่วมกันทุกกล้อง (โหลดโมเดลครั้งเดียว ประหยัด GPU/CPU memory)
3. เรียก `_run_multi_camera()` — ตัดสินว่าจะรันกล้องทั้งหมดพร้อมกัน หรือสลับกลุ่ม (rotation) ตาม `MAX_CONCURRENT_CAMERAS`

### 6.2 Threading model

- แต่ละกล้องรันใน **thread แยก** (`_camera_loop`) — อ่านเฟรม → detect → ตัดสิน event → ส่งเฟรมแสดงผลกลับ
- ถ้าจำนวนกล้อง > `MAX_CONCURRENT_CAMERAS` → `_run_multi_camera()` จะ**สลับกลุ่มกล้อง**ทุก ๆ `ROTATION_INTERVAL_SECONDS`
  (`_run_all_simultaneously()` ใช้เมื่อกล้องน้อยกว่าหรือเท่าขีดจำกัด)
- **OpenCV HighGUI ไม่ thread-safe** — `cv2.imshow()`/`waitKey()`/`destroyWindow()` เรียกได้จาก **main thread เท่านั้น**
  worker thread เขียนเฟรมล่าสุดใส่ dict กลาง (`display_frames`, ป้องกันด้วย `threading.Lock`)
  แล้ว `_pump_display()` (เรียกจาก main thread) เป็นคนเดียวที่ imshow จริง

### 6.3 ต่อกล้อง 1 ตัว — `_camera_loop()` วนซ้ำ

```
เช็ค schedule (is_camera_in_schedule)
  ├─ นอกเวลาทำงาน → ปิดกล้อง/หน้าต่าง, sleep 5s, วนใหม่
  └─ ในเวลาทำงาน  → เชื่อมต่อกล้อง (ถ้ายังไม่ได้เชื่อม)
        │
        ▼
   อ่านเฟรมล่าสุด (CameraReader.get_latest_frame)
        │
        ▼
   เช็คคำขอ "sync snapshot" จากหน้า Draw Polygon (throttle 1s)
        │
        ▼
   YoloDetector.detect(frame) → แยก persons / bicycles
        │
        ▼
   _get_unsafe_person(persons, bicycles, area_checker)
     - อยู่ใน danger zone? (AreaChecker.is_in_danger_zone)
     - ใกล้ bicycle ไหม? (is_boxes_close < 70px) → ถ้าใกล้ = ปลอดภัย (ขี่จักรยานผ่าน)
        │
        ▼
   CameraEventTracker.update(matched is not None)
     - dwell timer: อยู่ต่อเนื่อง > DWELL_SECONDS ถึงจะ trigger
     - cooldown: แจ้งแล้วเว้น ALERT_COOLDOWN_SECONDS ถึงจะแจ้งซ้ำ
        │
        ▼ (ถ้า trigger)
   _handle_event(...)
        │
        ▼
   วาด bbox/polygon สีแดง/เขียว + ส่งเฟรมให้ main thread แสดงผล
```

`CameraEventTracker` เก็บ state ของกล้อง 1 ตัว: `_enter_time` (เวลาที่เริ่มอยู่ในโซน), `_event_active`,
`_last_alert_time` — คำนวณด้วย `time.monotonic()` (กันปัญหานาฬิการะบบเปลี่ยน)

### 6.4 `_handle_event()` — pipeline เมื่อเกิด event จริง

```
1. วาด polygon+bbox ลงเฟรม แล้วเซฟรูป      → save_detection_image()
2. insert event ลง DB                      → insert_detection_event()  (ถ้าล้มเหลว → หยุด ไม่ส่ง alert)
3. ส่ง Teams alert                          → send_teams_alert()
4. update สถานะ alert (Teams) ลง DB         → update_alert_status()
5. ส่ง Email alert                          → send_email_alert()
6. update สถานะ alert (Email) ลง DB         → update_alert_status()
```

ทุกขั้นตอนหลังจาก insert event ครอบด้วย `try/except` แยกกัน — ขั้นไหนล้มเหลว (เช่น Teams webhook ล่ม)
จะ log error แต่ **ไม่ทำให้ service ทั้งตัว crash** และไม่บล็อกขั้นถัดไป

---

## 7. Cross-cutting concerns

- **Logging:** ทุกไฟล์ใช้ `logging.getLogger(__name__)` มาตรฐาน Python — ตั้งค่ารวมที่เดียวใน `config/logging_config.py`
  เรียก `setup_logging()` ครั้งเดียวใน `main.py`
- **Config:** ทุกค่าที่เปลี่ยนได้ (path, credential, threshold, URL) มาจาก `.env` ผ่าน `config/settings.py`
  เท่านั้น ไม่มีค่าฮาร์ดโค้ดกระจายอยู่ใน `src/`
- **Error isolation:** ความล้มเหลวของ 1 กล้อง (reconnect, detect ผิดพลาด) หรือ 1 alert channel
  ไม่ทำให้กล้องอื่น/ทั้งระบบหยุดทำงาน — ทุกจุดเสี่ยงมี `try/except` + log
- **Thread safety:** `YoloDetector` ใช้ร่วมกันได้หลาย thread (stateless ต่อ call), `display_frames` +
  `threading.Lock` ป้องกัน race condition ระหว่าง worker thread กับ main thread

---

## 8. อ่านเพิ่มเติม

- ภาพรวมทั้งโปรเจกต์ (รวม frontend/data-api/sql): [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md)
- กติกาที่ล็อกไว้ + ห้ามทำ: [`CLAUDE.md`](CLAUDE.md)
- YOLO11 Docs: <https://docs.ultralytics.com/models/yolo11>
- Predict Mode (bbox/conf ทำงานยังไง): <https://docs.ultralytics.com/modes/predict>
