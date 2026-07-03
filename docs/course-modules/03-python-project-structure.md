# Module 03 — โครงสร้างโปรเจกต์ Python ที่ดี

> **ระดับ:** มือใหม่-กลาง | **เวลาโดยประมาณ:** 60–90 นาที

---

## ส่วนที่ 1 — วัตถุประสงค์

เมื่อจบ module นี้ ผู้เรียนจะสามารถ:

- อธิบายโครงสร้างโฟลเดอร์ของโปรเจกต์นี้และเหตุผลที่แบ่งแบบนี้
- รู้ว่าไฟล์ไหนทำหน้าที่อะไร
- รัน `python main.py` จาก root ได้อย่างเข้าใจ
- อธิบายได้ว่าทำไม `.env` ถึงจำเป็น
- เรียกใช้ตัวแปรจาก `config/settings.py` ในไฟล์อื่นได้
- บอกได้ว่าไฟล์/โฟลเดอร์ไหนไม่ควรขึ้น Git และทำไม

---

## ส่วนที่ 2 — สิ่งที่ต้องเตรียม

- ผ่าน Module 01–02
- เปิดโปรเจกต์ใน VS Code มองเห็นโฟลเดอร์ทั้งหมด

---

## ส่วนที่ 3 — คำอธิบายเข้าใจง่าย

### ทำไมต้องแบ่งโฟลเดอร์?

ลองนึกภาพ: ถ้าเขียนโค้ดทุกอย่างไว้ในไฟล์เดียว 3,000 บรรทัด — จะหาของยาก แก้ bug ได้ยาก และถ้าคนสองคนแก้ไฟล์เดียวกันพร้อมกันจะเกิด conflict

การแบ่งโฟลเดอร์ตาม "ความรับผิดชอบ" (Separation of Concerns) ทำให้:
- หาโค้ดง่าย (กล้อง → `src/camera/`, DB → `src/database/`)
- แก้ส่วนหนึ่งโดยไม่กระทบส่วนอื่น
- ทดสอบแยกส่วนได้

### Entry Point คืออะไร?

"Entry point" คือจุดเริ่มต้นเดียวของโปรแกรม ในโปรเจกต์นี้คือ `main.py` ผู้เรียนรัน `python main.py` อย่างเดียว — ไม่ต้องรู้ว่าด้านในมี module กี่ตัว

---

## ส่วนที่ 4 — Flow การทำงาน

```text
python main.py (entry point)
        ↓
config/logging_config.py → ตั้ง logging ทั้งระบบ
        ↓
config/settings.py → โหลดค่าจาก .env ครั้งเดียว
        ↓
src/detection/detection_service.py → orchestrate ทุกอย่าง
    ├── src/camera/camera_reader.py → อ่าน RTSP
    ├── src/detection/yolo_detector.py → YOLO
    ├── src/detection/area_checker.py → polygon
    ├── src/storage/image_storage.py → เซฟรูป
    ├── src/database/detection_repository.py → บันทึก DB
    └── src/alert/ → Teams + Email
```
> **หมายเหตุ:** `src/monitoring/health_reporter.py` (ฟังก์ชัน `report_health()`) มีอยู่จริงในโค้ด แต่ **ยังไม่ถูกเรียกใช้งาน** จาก `main.py` หรือ `detection_service.py` ในเวอร์ชันปัจจุบัน — ไม่ได้อยู่ใน flow การทำงานจริงข้างบนนี้ ถือเป็นโค้ดที่เตรียมไว้สำหรับต่อยอด (เช่น health check endpoint หรือ scheduled job) ยังไม่ได้ wire เข้ากับ pipeline หลัก

---

## ส่วนที่ 5 — ตัวอย่าง Code

### 5.1 โครงสร้าง repo จริง

```text
walkway-detection-system/
├── main.py                     ← รัน: python main.py
├── requirements.txt
├── .env.example                ← template (ขึ้น Git)
├── .env                        ← ค่าจริง (ห้ามขึ้น Git!)
├── .gitignore
│
├── config/                     ← การตั้งค่าระบบ
│   ├── __init__.py
│   ├── settings.py             ← โหลด .env ครั้งเดียว
│   └── logging_config.py       ← ตั้ง logging
│
├── src/                        ← โค้ดหลักของระบบ
│   ├── __init__.py
│   ├── camera/                 ← อ่าน RTSP กล้อง
│   │   ├── __init__.py
│   │   ├── camera_reader.py    ← CameraReader class
│   │   └── camera_config.py    ← CameraConfig dataclass
│   ├── detection/              ← ตรวจจับ AI
│   │   ├── __init__.py
│   │   ├── yolo_detector.py    ← YoloDetector class
│   │   ├── area_checker.py     ← AreaChecker class
│   │   └── detection_service.py← orchestrate ทั้งหมด
│   ├── alert/                  ← แจ้งเตือน
│   │   ├── __init__.py
│   │   ├── teams_alert.py      ← Power Automate webhook
│   │   └── email_alert.py      ← SMTP M365
│   ├── database/               ← เชื่อม MSSQL
│   │   ├── __init__.py
│   │   ├── mssql_connection.py ← get_connection()
│   │   └── detection_repository.py ← CRUD ผ่าน SP
│   ├── storage/
│   │   ├── __init__.py
│   │   └── image_storage.py    ← เซฟรูป shared drive
│   ├── monitoring/
│   │   ├── __init__.py
│   │   └── health_reporter.py  ← รายงานสถานะ
│   └── utils/
│       ├── __init__.py
│       ├── helpers.py          ← ฟังก์ชันช่วยทั่วไป
│       └── logger.py
│
├── sql/                        ← SQL script (admin)
├── data-api/                   ← Node/Express บาง (เรียก SP → JSON)
├── frontend/                   ← React + Vite + Tailwind
├── docs/
│   ├── course-modules/         ← เอกสารสำหรับผู้เรียน
│   └── admin-backend/          ← เอกสาร admin
└── playground/                 ← ตัวอย่างให้ลองเล่น
```
### 5.2 `main.py` — Entry Point

```python
"""
Entry point เดียวของระบบ Walkway Detection
รัน: python main.py
"""

import logging

from config.logging_config import setup_logging
from config.settings import settings
from src.detection.detection_service import run_detection_service


def main() -> None:
    setup_logging()                          # ตั้ง logging ก่อน
    logger = logging.getLogger(__name__)

    logger.info("=== Walkway Detection System ===")
    logger.info(
        "Company: %s | Device: %s",
        settings.COMPANY_CODE,
        settings.DEVICE,
    )

    run_detection_service()                  # เริ่มทำงาน


if __name__ == "__main__":
    main()
```
**ทำไม `if __name__ == "__main__"`?**

Python จะรันบรรทัดนี้เฉพาะเมื่อรันไฟล์ตรง ๆ ถ้าไฟล์อื่น `import main` จะไม่ trigger `main()` โดยอัตโนมัติ เป็น best practice เสมอ

### 5.3 `config/settings.py` — ศูนย์กลาง Config

```python
"""
โหลดค่าตั้งค่าทั้งหมดจากไฟล์ .env มาไว้ในที่เดียว
ไฟล์อื่น ๆ ใน src/ ต้อง import ค่าจากที่นี่เท่านั้น ห้ามอ่าน os.getenv() กระจัดกระจาย
"""
import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    DEVICE: str = os.getenv("DEVICE", "cpu")
    COMPANY_CODE: str = os.getenv("COMPANY_CODE", "DEMO")
    CAMERA_CONFIG_SOURCE: str = os.getenv("CAMERA_CONFIG_SOURCE", "")
    CAMERAS_CONFIG_PATH: str = os.getenv("CAMERAS_CONFIG_PATH", "config/cameras.json")
    CAMERA_RTSP_USER: str = os.getenv("CAMERA_RTSP_USER", "")
    CAMERA_RTSP_PASSWORD: str = os.getenv("CAMERA_RTSP_PASSWORD", "")
    SCHEDULE_SOURCE: str = os.getenv("SCHEDULE_SOURCE", "")
    # ... (ดูไฟล์จริงที่ config/settings.py)


settings = Settings()  # instance เดียวสำหรับทั้งโปรเจกต์
```
**วิธีใช้ใน module อื่น:**
```python
# ใน src/camera/camera_reader.py
from config.settings import settings

conf = settings.CONF_THRESHOLD
device = settings.DEVICE
```
**ทำไมถึงดีกว่า `os.getenv()` กระจัดกระจาย?**

| วิธีเก่า (กระจัดกระจาย) | วิธีดี (settings.py) |
|------------------------|---------------------|
| แก้ชื่อตัวแปร .env ทีต้องไล่แก้ทุกไฟล์ | แก้แค่ settings.py ที่เดียว |
| ไม่รู้ว่า default คืออะไร | มี default ชัดเจนในที่เดียว |
| ยากต่อการ test | inject settings ได้ง่าย |

### 5.4 `__init__.py` คืออะไร?

ไฟล์ `__init__.py` (อาจว่างเปล่า) บอก Python ว่า "โฟลเดอร์นี้คือ package" ทำให้ import ได้:

```python
# ถ้าไม่มี __init__.py ใน src/camera/
from src.camera.camera_reader import CameraReader   # ❌ ImportError

# ถ้ามี __init__.py
from src.camera.camera_reader import CameraReader   # ✅
```
### 5.5 ทำไม `.env` ถึงจำเป็น

**สถานการณ์จริง:**
```text
ทีมพัฒนา (Dev):
  DB_SERVER=dev-sql-01
  CAMERA_RTSP_URL=rtsp://192.168.0.100/test

Production:
  DB_SERVER=prod-sql-cluster
  CAMERA_RTSP_URL=rtsp://10.0.1.50/stream1
```
ถ้าไม่ใช้ `.env` ต้องแก้โค้ดทุกครั้งที่ deploy ซึ่งเสี่ยง และต้องระวังไม่ให้ push password จริงขึ้น Git

**กับ `.env`:** เปลี่ยนแค่ไฟล์ `.env` บนเครื่อง production — โค้ดเหมือนกันทุกที่

### 5.6 `config/logging_config.py` — ตั้ง Logging ทั้งระบบ

```python
"""
ตั้งค่า logging มาตรฐาน: console + ไฟล์ logs/walkway.log (UTF-8)
"""
import logging, os, sys

LOG_DIR = "logs"
LOG_FILE = os.path.join(LOG_DIR, "walkway.log")


def setup_logging(level: int = logging.INFO) -> None:
    os.makedirs(LOG_DIR, exist_ok=True)

    # บังคับ UTF-8 บน Windows
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )

    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    file_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
    file_handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    root_logger.handlers.clear()
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
```
**ผลลัพธ์ log:**
```text
2026-01-01 10:00:00 | INFO     | __main__ | === Walkway Detection System ===
2026-01-01 10:00:01 | INFO     | src.camera.camera_reader | เชื่อมต่อกล้องสำเร็จ
2026-01-01 10:00:05 | WARNING  | src.alert.teams_alert | Teams rate limit (HTTP 429)
```
ชื่อ `%(name)s` คือ `__name__` ของแต่ละ module ทำให้รู้ทันทีว่า log มาจากที่ไหน

---

## ส่วนที่ 6 — แบบฝึกหัด

1. **ตรวจสอบโครงสร้าง:** เปิด VS Code แล้ว "Explorer" ด้านซ้าย ลองคลิกเปิดแต่ละไฟล์ อ่าน docstring ด้านบน
2. **ทดสอบ import:** สร้างไฟล์ `test_settings.py` ที่ root แล้ว:
   ```python
   from config.settings import settings
   print(settings.COMPANY_CODE)
   print(settings.DEVICE)
   ```
   รัน `python test_settings.py` ดูว่าค่าถูกต้อง
3. **ไล่ flow:** เปิด `main.py` แล้วกด `Ctrl+Click` ที่ `run_detection_service` เพื่อไปดูไฟล์นั้น ทำเช่นนี้ไปเรื่อย ๆ จนเข้าใจว่า detection_service เรียกอะไรบ้าง
4. **ทดสอบ logging:** เพิ่มบรรทัด `logger.info("ทดสอบจาก main")` ใน `main()` แล้วรู หา log ในไฟล์ `logs/walkway.log`

---

## ส่วนที่ 7 — Checklist หลังเรียน

- [ ] อธิบายหน้าที่ของแต่ละโฟลเดอร์ใน `src/` ได้
- [ ] รู้ว่า entry point คือ `main.py` และรันจาก root เสมอ
- [ ] import `settings` จาก `config.settings` ได้และได้ค่าถูกต้อง
- [ ] เข้าใจว่า `.env` เก็บอะไรและทำไมไม่ขึ้น Git
- [ ] เห็นว่า log ออกทั้ง console และไฟล์ `logs/walkway.log`
- [ ] รู้ว่า `__init__.py` มีไว้ทำไม

---

## ส่วนที่ 8 — Common Error + วิธีแก้

### Error: `ModuleNotFoundError: No module named 'config'`

**สาเหตุ:** รันไฟล์จาก directory ที่ผิด

```bash
# ❌ ผิด — รันจาก src/
cd src
python detection/detection_service.py

# ✅ ถูก — รันจาก root เสมอ
cd walkway-detection-system
python main.py
```
---

### Error: ค่าจาก settings เป็น `""` (string ว่าง) ทั้งที่ตั้งใน .env แล้ว

**สาเหตุ:** ไฟล์ `.env` อยู่ผิดที่ ต้องอยู่ที่ root เดียวกับ `main.py`

```bash
# ตรวจสอบ
dir .env           # Windows — ต้องเห็น .env
python -c "from dotenv import load_dotenv; load_dotenv(); import os; print(os.getenv('COMPANY_CODE'))"
```
---

### `logs/` โฟลเดอร์ไม่ถูกสร้าง

**สาเหตุ:** permission ไม่พอหรือ path ผิด

```bash
# สร้างด้วยตนเอง
mkdir logs
python main.py
```
---

### ไฟล์ `.env` หายหลัง `git pull`

**สาเหตุ:** `.env` ถูกเพิ่มใน `.gitignore` ถูกต้องแล้ว (ควรหาย) — ต้องสร้างใหม่จาก `.env.example` บนเครื่อง production แต่ละเครื่อง

```bash
copy .env.example .env   # Windows
# แล้วแก้ค่าให้ตรงกับ server นั้น
```
---

## ส่วนที่ 9 — ควร commit อะไร

```text
✅ commit:
├── main.py
├── config/settings.py
├── config/logging_config.py
├── config/__init__.py
├── src/**/*.py               (โค้ดทุกไฟล์ใน src/)
├── .env.example              (template ไม่มีค่าจริง)
├── .gitignore
└── requirements.txt
```
---

## ส่วนที่ 10 — ไม่ควร commit อะไร

```text
❌ ห้าม commit:
├── .env                  ← secret / รหัสผ่าน
├── venv/                 ← ขนาดใหญ่ สร้างใหม่ได้
├── __pycache__/          ← Python auto-generate
├── *.pyc, *.pyo          ← Python compiled
├── logs/                 ← log ใช้งาน (อาจมีข้อมูลสำคัญ)
├── *.log
└── *.pt                  ← YOLO model ขนาดใหญ่
```
> **กฎง่าย ๆ:** "ถ้า generate ใหม่ได้ หรือมีข้อมูลสำคัญ — ไม่ขึ้น Git"
