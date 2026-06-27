# Module 02 — Python พื้นฐานสำหรับระบบ AI

> **ระดับ:** มือใหม่ | **เวลาโดยประมาณ:** 90–120 นาที

---

## ส่วนที่ 1 — วัตถุประสงค์

เมื่อจบ module นี้ ผู้เรียนจะสามารถ:

- ใช้งาน variable, type พื้นฐาน (int, float, str, bool)
- ใช้ list และ dict เก็บข้อมูลหลายรายการ
- เขียน if/else, loop (for/while)
- เขียนและเรียกใช้ function
- สร้าง class และ instance อย่างง่าย
- import module/function ข้ามไฟล์ภายในโปรเจกต์
- จัดการ error ด้วย try/except
- ใช้ logging แทน print ใน production code
- จัดการ file path ข้าม OS ด้วย `os.path`
- อ่าน/เขียนไฟล์ text
- ใช้ library ภายนอกเบื้องต้น
- เชื่อม MSSQL ด้วย pyodbc เบื้องต้น

---

## ส่วนที่ 2 — สิ่งที่ต้องเตรียม

- ผ่าน Module 01 (ติดตั้ง Python, venv, library แล้ว)
- `venv` activated อยู่
- เปิดโปรเจกต์ใน VS Code

---

## ส่วนที่ 3 — คำอธิบายเข้าใจง่าย

### Python ทำงานอย่างไร?

Python เป็น **interpreted language** หมายความว่า interpreter อ่านโค้ดทีละบรรทัดแล้วทำงานทันที ไม่ต้อง compile ก่อนเหมือน C/Java

```text
โค้ด .py → Python interpreter → ผลลัพธ์
```
### Type คืออะไร?

"Type" คือประเภทของข้อมูล Python เป็น **dynamically typed** — ตัวแปรไม่ต้องประกาศ type ล่วงหน้า interpreter รู้เองจากค่าที่กำหนด

---

## ส่วนที่ 4 — Flow การทำงาน

```text
รู้จัก variable/type
        ↓
เก็บข้อมูลหลายรายการด้วย list/dict
        ↓
ตัดสินใจด้วย if/else
        ↓
วนซ้ำด้วย loop
        ↓
จัดกลุ่ม logic ด้วย function
        ↓
จัดกลุ่ม data+method ด้วย class
        ↓
แบ่งโค้ดออกเป็นไฟล์ (import ข้ามไฟล์)
        ↓
จัดการ error ด้วย try/except
        ↓
บันทึก log ด้วย logging
        ↓
จัดการ file path + อ่าน/เขียนไฟล์
        ↓
ใช้ library ภายนอก (pyodbc เบื้องต้น)
```
---

## ส่วนที่ 5 — ตัวอย่าง Code

ดูไฟล์ `playground/01-python-basic/example.py` ประกอบ

### 5.1 Variable และ Type

```python
# int — จำนวนเต็ม
camera_no = 1
frame_count = 0

# float — จำนวนทศนิยม
confidence = 0.87
fps = 30.0

# str — ข้อความ
camera_name = "Camera-1"
company_code = "DEMO"

# bool — จริง/เท็จ
is_person_detected = True
is_connected = False

# ตรวจสอบ type
print(type(camera_no))      # <class 'int'>
print(type(confidence))     # <class 'float'>
print(type(camera_name))    # <class 'str'>
```
### 5.2 List และ Dict

```python
# list — เก็บข้อมูลหลายรายการเรียงลำดับ
detected_classes = ["person", "person", "forklift"]
camera_ids = [1, 2, 3]

# เข้าถึงด้วย index (เริ่มที่ 0)
print(detected_classes[0])   # person
print(detected_classes[-1])  # forklift (นับจากท้าย)

# เพิ่ม/ลบ
detected_classes.append("bicycle")
detected_classes.remove("forklift")

# dict — เก็บคู่ key:value (เหมือน dictionary จริง ๆ)
detection_summary = {
    "camera_no": "1",
    "person_count": 2,
    "confidence": 0.87,
    "location": "ทางเดินหน้าโกดัง",
}

# เข้าถึงด้วย key
print(detection_summary["person_count"])   # 2
print(detection_summary.get("status", "unknown"))  # ถ้าไม่มี key คืน default

# เพิ่ม/แก้ไข
detection_summary["status"] = "alert"
```
### 5.3 If / Else

```python
person_count = 2
confidence = 0.87

if person_count > 0 and confidence >= 0.5:
    print("ตรวจพบคน — ส่ง alert")
elif person_count > 0:
    print("ตรวจพบคนแต่ confidence ต่ำ — ข้ามไป")
else:
    print("ไม่พบคน")
```
### 5.4 Loop

```python
# for loop — วนตาม list
cameras = ["Camera-1", "Camera-2", "Camera-3"]
for cam in cameras:
    print(f"ตรวจสอบ: {cam}")

# for loop ด้วย enumerate (ได้ index ด้วย)
for idx, cam in enumerate(cameras):
    print(f"{idx}: {cam}")

# while loop — วนจนกว่าเงื่อนไขจะเป็น False
attempt = 0
max_retries = 3
while attempt < max_retries:
    print(f"พยายามเชื่อมต่อครั้งที่ {attempt + 1}")
    attempt += 1
    # ถ้าสำเร็จก็ break
    # break
```
### 5.5 Function

```python
def calculate_confidence_percent(confidence: float) -> str:
    """แปลง confidence (0.0-1.0) เป็นเปอร์เซ็นต์พร้อม format"""
    pct = round(confidence * 100, 1)
    return f"{pct}%"


def get_bbox_bottom_center(bbox: tuple) -> tuple:
    """คำนวณจุดกึ่งกลางขอบล่างของ bounding box"""
    x1, y1, x2, y2 = bbox
    cx = (x1 + x2) / 2
    return (cx, y2)


# เรียกใช้
result = calculate_confidence_percent(0.87)
print(result)   # 87.0%

point = get_bbox_bottom_center((100, 50, 300, 400))
print(point)    # (200.0, 400)
```
> ฟังก์ชัน `get_bbox_bottom_center` นี้คือฟังก์ชันจริงในไฟล์ [src/utils/helpers.py](../../src/utils/helpers.py) ที่ระบบใช้อ้างอิงตำแหน่งคน

### 5.6 Class

```python
class CameraEventTracker:
    """เก็บสถานะ dwell timer ของกล้อง 1 ตัว"""

    def __init__(self, dwell_seconds: int):
        self.dwell_seconds = dwell_seconds
        self._enter_time = None

    def enter_zone(self, timestamp: float) -> None:
        """บันทึกเวลาที่คนเข้าพื้นที่ (ถ้ายังไม่ได้บันทึก)"""
        if self._enter_time is None:
            self._enter_time = timestamp

    def reset(self) -> None:
        """คนออกจากพื้นที่ — reset timer"""
        self._enter_time = None

    def is_event_triggered(self, now: float) -> bool:
        """ตรวจว่าอยู่เกิน dwell_seconds แล้วหรือยัง"""
        if self._enter_time is None:
            return False
        return (now - self._enter_time) > self.dwell_seconds


# ใช้งาน
tracker = CameraEventTracker(dwell_seconds=5)
tracker.enter_zone(timestamp=1000.0)
print(tracker.is_event_triggered(now=1004.0))  # False (4 วิ)
print(tracker.is_event_triggered(now=1006.0))  # True  (6 วิ > 5 วิ)
```
### 5.7 Import ข้ามไฟล์

โครงสร้างไฟล์:
```text
playground/01-python-basic/
    example.py
    helpers_example.py
```
**helpers_example.py:**
```python
def greet(name: str) -> str:
    return f"สวัสดี {name}!"


class Counter:
    def __init__(self):
        self.count = 0

    def increment(self):
        self.count += 1
```
**example.py:**
```python
# import จากไฟล์เดียวกัน folder
from helpers_example import Counter, greet

print(greet("Camera-1"))    # สวัสดี Camera-1!

counter = Counter()
counter.increment()
counter.increment()
print(counter.count)        # 2
```
**import จากโมดูลในโปรเจกต์ (แบบที่ระบบใช้จริง):**
```python
# ใน src/detection/yolo_detector.py
from config.settings import settings        # import settings
from src.utils.helpers import get_bbox_bottom_center   # import function
```
> **หลักการ:** Python หา module จาก root ของโปรเจกต์ (ที่รัน `python main.py`) ดังนั้นการรันจาก root ทำให้ import path ถูกต้องเสมอ

### 5.8 Try / Except

```python
def parse_confidence(raw: str) -> float | None:
    """แปลง string เป็น float อย่างปลอดภัย"""
    try:
        value = float(raw)
        return value
    except ValueError:
        print(f"ค่า '{raw}' ไม่ใช่ตัวเลข")
        return None


# ตัวอย่างใช้งาน
values = ["0.87", "0.5", "not_a_number", "0.3"]
for v in values:
    result = parse_confidence(v)
    if result is not None:
        print(f"confidence: {result}")
```
**ดักหลาย exception:**
```python
try:
    conn = pyodbc.connect(conn_str, timeout=10)
    cursor = conn.cursor()
    cursor.execute("SELECT 1")
except pyodbc.OperationalError as exc:
    print(f"เชื่อมต่อ DB ล้มเหลว: {exc}")
except pyodbc.Error as exc:
    print(f"DB error อื่น: {exc}")
finally:
    # ทำเสมอ ไม่ว่าจะ error หรือไม่
    if conn:
        conn.close()
```
### 5.9 Logging (ใช้แทน print)

```python
import logging

# ตั้งค่า logging พื้นฐาน
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)

logger = logging.getLogger(__name__)  # ชื่อ module อัตโนมัติ

# ระดับ log (เรียงจากน้อยไปมาก)
logger.debug("debug detail: frame=%d", 1234)     # ไม่แสดงถ้า level=INFO
logger.info("ตรวจจับ person confidence=%.1f%%", 87.0)
logger.warning("กล้องหลุด กำลัง reconnect...")
logger.error("เซฟรูปล้มเหลว: %s", "/path/to/img.jpg")
```
> ในโปรเจกต์จริงใช้ `from config.logging_config import setup_logging` แทน `basicConfig` เพื่อให้ log ไปทั้ง console และไฟล์ `logs/walkway.log`

### 5.10 File Path และ อ่าน/เขียนไฟล์

```python
import os

# สร้าง path ข้าม OS (ไม่ต้องกังวล / หรือ \)
base_dir = "shared-drive"
company = "DEMO"
camera = "camera-1"
date = "20260101"

folder = os.path.join(base_dir, "walkway-detection", company, camera, date)
print(folder)  # shared-drive/walkway-detection/DEMO/camera-1/20260101

# สร้างโฟลเดอร์ (exist_ok=True = ไม่ error ถ้ามีอยู่แล้ว)
os.makedirs(folder, exist_ok=True)

# ตรวจสอบว่า path มีอยู่จริง
print(os.path.exists(folder))   # True
print(os.path.isdir(folder))    # True

# เขียนไฟล์ text
log_path = os.path.join(folder, "log.txt")
with open(log_path, "w", encoding="utf-8") as f:
    f.write("detection event log\n")
    f.write("camera: Camera-1\n")

# อ่านไฟล์ text
with open(log_path, "r", encoding="utf-8") as f:
    content = f.read()
    print(content)
```
### 5.11 Library ภายนอก — python-dotenv

```python
from dotenv import load_dotenv
import os

# โหลดค่าจากไฟล์ .env
load_dotenv()

# อ่านค่า (ถ้าไม่มีจะคืน None หรือ default)
camera_url = os.getenv("CAMERA_RTSP_URL", "")
company_code = os.getenv("COMPANY_CODE", "DEMO")

print(f"Company: {company_code}")
print(f"Camera URL: {camera_url}")
```
> **โปรเจกต์นี้ไม่ใช้ `os.getenv` กระจัดกระจาย** — ทุกค่าโหลดผ่าน `config/settings.py` ตัวเดียว ดูรายละเอียดใน Module 03

### 5.12 pyodbc เบื้องต้น

```python
import pyodbc

# connection string (ค่าจริงมาจาก .env เสมอ)
conn_str = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=your-server;"
    "DATABASE=your-db;"
    "UID=your-user;"
    "PWD=your-password;"
    "TrustServerCertificate=yes;"
)

try:
    conn = pyodbc.connect(conn_str, timeout=10)
    cursor = conn.cursor()

    # ✅ parameterized query — ปลอดภัยจาก SQL injection
    cursor.execute("SELECT camera_no, camera_name FROM ww.mst_camera WHERE company_code = ?",
                   ["DEMO"])

    for row in cursor.fetchall():
        print(f"กล้อง: {row.camera_no} — {row.camera_name}")

    conn.commit()
finally:
    conn.close()
```
> **ห้าม:** `cursor.execute(f"SELECT ... WHERE company_code = '{company_code}'")`  
> เพราะเสี่ยง SQL injection ใช้ `?` placeholder เสมอ

---

## ส่วนที่ 6 — แบบฝึกหัด

1. **Variable + Type:** สร้างตัวแปร `company_code`, `camera_count`, `confidence` พิมพ์ type ออกมา
2. **Dict:** สร้าง dict เก็บข้อมูลกล้อง 1 ตัว (camera_no, camera_name, location) แล้วพิมพ์ค่าแต่ละ key
3. **Function:** เขียนฟังก์ชัน `format_event_message(camera_name, confidence)` คืน string เช่น `"ตรวจพบคน กล้อง Camera-1 ความมั่นใจ 87.0%"`
4. **Class:** สร้าง class `SimpleCounter` มี method `increment()` และ `reset()` และ property `count`
5. **Try/Except:** เขียนฟังก์ชันอ่านไฟล์ ถ้าไม่พบไฟล์ให้ return `None` แทนการ crash

---

## ส่วนที่ 7 — Checklist หลังเรียน

- [ ] เขียน variable ทุก type และบอก type ได้
- [ ] สร้าง list/dict เพิ่ม/ลบ/เข้าถึงข้อมูลได้
- [ ] เขียน if/else และ for loop ได้
- [ ] เขียน function รับ parameter และคืนค่าได้
- [ ] สร้าง class มี `__init__` และ method ได้
- [ ] import function/class จากไฟล์อื่นใน folder เดียวกันได้
- [ ] ใช้ try/except ดัก error ได้
- [ ] ใช้ `logging.getLogger(__name__)` แทน print ได้
- [ ] สร้าง path ด้วย `os.path.join` ได้
- [ ] อ่านค่าจาก `.env` ด้วย `load_dotenv()` ได้

---

## ส่วนที่ 8 — Common Error + วิธีแก้

### Error: `IndentationError: expected an indented block`

**สาเหตุ:** Python ใช้ย่อหน้า (indent) แทน `{}` — ต้อง indent สม่ำเสมอ

```python
# ผิด
def greet(name):
print(f"สวัสดี {name}")   # ❌ ต้อง indent

# ถูก
def greet(name):
    print(f"สวัสดี {name}")   # ✅
```
---

### Error: `KeyError: 'camera_no'`

**สาเหตุ:** เข้าถึง key ที่ไม่มีใน dict

```python
# แก้โดยใช้ .get() พร้อม default
camera_no = data.get("camera_no", "unknown")
```
---

### Error: `ModuleNotFoundError: No module named 'config'`

**สาเหตุ:** รัน Python จาก directory ผิด ต้องรันจาก root ของโปรเจกต์

```bash
# ผิด (รันจาก src/)
cd src
python detection/yolo_detector.py   # ❌

# ถูก (รันจาก root)
python main.py   # ✅
```
---

### Error: `UnicodeEncodeError` ตอน print ภาษาไทย

**สาเหตุ:** Windows console ใช้ encoding cp1252 ไม่รองรับ UTF-8

```python
import sys
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
```
> โค้ดนี้อยู่ใน `playground/01-python-basic/example.py` แล้ว และ `config/logging_config.py` จัดการให้อัตโนมัติ

---

### Error: pyodbc `No module named 'pyodbc'`

```bash
pip install pyodbc
```
ถ้า install แล้วยัง error แสดงว่า ODBC Driver ยังไม่ได้ติดตั้ง:
ดาวน์โหลด **ODBC Driver 17 for SQL Server** จาก Microsoft

---

## ส่วนที่ 9 — ควร commit อะไร

```text
✅ commit:
├── playground/01-python-basic/example.py
├── playground/01-python-basic/helpers_example.py
└── src/utils/helpers.py   (ถ้าแก้ไข)
```
---

## ส่วนที่ 10 — ไม่ควร commit อะไร

```text
❌ ห้าม commit:
├── .env                    (secret)
├── __pycache__/            (Python auto-generate)
├── *.pyc
└── ไฟล์ทดสอบชั่วคราว เช่น test.py, scratch.py
```