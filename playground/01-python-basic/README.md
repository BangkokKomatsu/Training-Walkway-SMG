---
lab:
    title: '01 - Python Basic (Playground)'
    description: 'เรียนรู้พื้นฐานของภาษา Python เช่น ตัวแปร, โครงสร้างข้อมูล, เงื่อนไข, ลูป, และการจัดการข้อผิดพลาด'
---

# 01 - Python Basic (Playground)

ในบทเรียนนี้ คุณจะได้เรียนรู้และทบทวนพื้นฐานที่สำคัญของภาษา Python ซึ่งเป็นโครงสร้างหลักที่ใช้ในการพัฒนาระบบ Walkway Safety Monitor เช่น การประกาศตัวแปร (Variables), ประเภทข้อมูล (Data Types), เงื่อนไข (If-else), ลูป (Loops), และการจัดการข้อผิดพลาด (Try-Except)

ระยะเวลาที่ใช้: ประมาณ **15** นาที

## Prerequisites
- ติดตั้ง Python สำเร็จแล้ว

---

## 1. การตั้งค่าเริ่มต้นและการ Import (Import & Setup)

เราเริ่มต้นด้วยการนำเข้าโมดูล (Import) ที่จำเป็น และการตั้งค่าภาษาไทยใน Console เพื่อไม่ให้การแสดงผลข้อความภาษาไทยเพี้ยนใน Windows

```python
import logging
import sys

from helpers_example import Counter, greet  # import ข้ามไฟล์ (โฟลเดอร์เดียวกัน)

# Windows console ใช้ cp1252 เป็น default ทำให้ print/log ภาษาไทยพัง -> บังคับเป็น UTF-8
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)
```

**คำอธิบายโค้ด (Line-by-Line):**
- `import logging`: นำเข้าโมดูล `logging` ซึ่งใช้สำหรับพิมพ์ข้อความแจ้งเตือนหรือสถานะการทำงาน แทนการใช้ `print()` ธรรมดา 
- `import sys`: นำเข้าโมดูลสำหรับการโต้ตอบกับตัวแปรและฟังก์ชันที่เกี่ยวข้องกับระบบ (System-specific)
- `from helpers_example import Counter, greet`: ดึงคลาส `Counter` และฟังก์ชัน `greet` มาจากไฟล์ `helpers_example.py` ที่อยู่ในโฟลเดอร์เดียวกัน เพื่อสาธิตการใช้โค้ดร่วมกันหลายไฟล์
- `if hasattr(sys.stdout, "reconfigure"):`: โค้ดส่วนนี้เป็นเทคนิคแก้ไขปัญหาการแสดงผลภาษาไทยบน Windows (ซึ่งปกติมักเข้ารหัสผิด) โดยบังคับให้ Console ใช้ระบบ `utf-8` ในการแสดงผล
- `logging.basicConfig(...)`: กำหนดรูปแบบการแสดงผลของระบบ Logging ให้แสดงในระดับ `INFO` (สถานะทั่วไป) ขึ้นไป
- `logger = logging.getLogger(__name__)`: สร้างตัวแปร `logger` เพื่อใช้สำหรับเขียน log ตลอดโปรแกรมนี้

---

## 2. ตัวแปรและประเภทข้อมูล (Variables & Types)

จุดเริ่มต้นของฟังก์ชัน `main()` จะทำการสาธิตการสร้างตัวแปรและการเช็คประเภทข้อมูล (Type)

```python
def main() -> None:
    # ---- variable & type ----
    camera_no = 1                # int
    camera_name = "Camera-1"     # str
    confidence = 0.87            # float

    logger.info("camera_no=%s (type=%s)", camera_no, type(camera_no).__name__)
    logger.info("confidence=%s (type=%s)", confidence, type(confidence).__name__)
```

**คำอธิบายโค้ด (Line-by-Line):**
- `def main() -> None:`: นิยามฟังก์ชันหลักชื่อ `main` ที่ไม่ส่งค่าใดๆ กลับ (Returns `None`)
- `camera_no = 1`: กำหนดให้ตัวแปร `camera_no` มีค่าเป็น 1 (เป็นข้อมูลประเภทจำนวนเต็ม - Integer/`int`)
- `camera_name = "Camera-1"`: กำหนดให้ `camera_name` เก็บข้อความอักษร (String/`str`)
- `confidence = 0.87`: เก็บค่าความแม่นยำ ซึ่งมีจุดทศนิยม (Float/`float`)
- `type(camera_no).__name__`: คำสั่ง `type()` จะคืนค่าประเภทของตัวแปรนั้นออกมา เพื่อให้เราทราบว่าเป็น `int`, `str` หรือ `float`

---

## 3. โครงสร้างข้อมูล List และ Dictionary

การใช้งาน List (สำหรับเก็บรายการเรียงตามลำดับ) และ Dictionary (สำหรับเก็บข้อมูลแบบ Key-Value)

```python
    # ---- list / dict ----
    detected_classes = ["person", "person", "forklift"]
    detection_summary = {"person": 0, "forklift": 0}

    for cls in detected_classes:
        detection_summary[cls] += 1

    logger.info("สรุปจำนวนที่ตรวจจับได้: %s", detection_summary)
```

**คำอธิบายโค้ด (Line-by-Line):**
- `detected_classes = [...]`: สร้างตัวแปรประเภท List (อาเรย์) เพื่อจำลองผลลัพธ์ว่าตรวจจับอะไรได้บ้างในภาพ
- `detection_summary = {...}`: สร้างตัวแปรประเภท Dictionary เพื่อใช้เก็บสถิติผลลัพธ์ (คีย์คือชื่อคลาส, ค่าคือตัวเลขจำนวน)
- `for cls in detected_classes:`: ลูป `for` จะดึงค่าออกจาก List ทีละ 1 ตัวมาไว้ในตัวแปร `cls`
- `detection_summary[cls] += 1`: นำชื่อที่จับได้ไปใช้เป็น Key ของ Dictionary แล้วบวกค่าเพิ่มไปทีละ 1 

---

## 4. เงื่อนไข If-Else (Conditionals)

ตรวจสอบผลรวมที่นับได้จาก Dictionary เพื่อตัดสินใจว่าจะแสดงข้อความแบบไหน

```python
    # ---- if / else ----
    if detection_summary["person"] > 0:
        logger.info("พบคนในภาพ %d คน", detection_summary["person"])
    else:
        logger.info("ไม่พบคนในภาพ")
```

**คำอธิบายโค้ด (Line-by-Line):**
- `if detection_summary["person"] > 0:`: คำสั่งตรวจสอบเงื่อนไข หากค่าจำนวนที่เก็บอยู่ในคีย์ `person` มากกว่า 0 ให้ทำในบล็อกคำสั่งต่อไป
- `logger.info(...)`: สั่งพิมพ์รายงานผลลัพธ์ลงบน Console
- `else:`: หากเงื่อนไขใน `if` ด้านบนไม่เป็นความจริง (ก็คือไม่มีคนเลย หรือเป็น 0) ระบบจะข้ามมาทำงานในส่วนนี้แทน

---

## 5. การใช้ฟังก์ชันและคลาส (Functions & Classes)

เรียกใช้โมดูลที่ Import มาจากไฟล์อื่น (`helpers_example.py`)

```python
    # ---- function ----
    print(greet(camera_name))

    # ---- class (import ข้ามไฟล์จาก helpers_example.py) ----
    counter = Counter()
    for _ in detected_classes:
        counter.increment()
    logger.info("Counter นับได้ %d ครั้ง", counter.count)
```

**คำอธิบายโค้ด (Line-by-Line):**
- `greet(camera_name)`: โยนตัวแปร String เข้าไปในฟังก์ชัน `greet()` เพื่อให้คืนค่าคำทักทายออกมา จากนั้นจึงสั่ง `print()` พิมพ์ออกหน้าจอ
- `counter = Counter()`: เป็นการสร้าง **ออบเจกต์ (Object)** จากคลาส (Class) `Counter` ที่เรา Import เข้ามา
- `for _ in detected_classes:`: ทำการวนลูป (ใช้ `_` แทนตัวแปรที่ไม่ได้นำไปใช้)
- `counter.increment()`: สั่งให้ออบเจกต์เพิ่มจำนวนตัวเลขขึ้นทีละ 1 ทุกครั้งที่มีการวนลูป
- `counter.count`: ดึงผลลัพธ์ (Property) ตัวเลขสุดท้ายของออบเจกต์ออกมาแสดง

---

## 6. การจัดการข้อผิดพลาด (Try / Except)

การใช้ระบบ Try/Except เพื่อป้องกันโปรแกรมล่ม (Crash) เมื่อเจอข้อมูลที่ไม่คาดคิด

```python
    # ---- try / except ----
    raw_values = ["0.5", "0.9", "not_a_number"]
    valid_confidences = []
    
    for raw in raw_values:
        try:
            valid_confidences.append(float(raw))
        except ValueError:
            logger.warning("ค่า '%s' ไม่ใช่ตัวเลข - ข้ามไป", raw)

    logger.info("ค่า confidence ที่ใช้ได้: %s", valid_confidences)

if __name__ == "__main__":
    main()
```

**คำอธิบายโค้ด (Line-by-Line):**
- `raw_values = [...]`: ตัวอย่างข้อมูลที่มีทั้งข้อความที่แปลงเป็นตัวเลขได้ (`"0.5"`) และไม่ได้ (`"not_a_number"`)
- `try:`: บอกให้ Python ลองทำคำสั่งในบล็อกนี้ดู
- `valid_confidences.append(float(raw))`: พยายามแปลง String (`raw`) ให้เป็น Float ถ้าทำได้ จะเพิ่มเข้าไปใน List (`valid_confidences`)
- `except ValueError:`: ถ้าการแปลง `float()` เกิดความผิดพลาด (เพราะข้อความเป็นตัวอักษร) โปรแกรมจะกระโดดมาที่นี่แทนที่จะแครช
- `logger.warning(...)`: พิมพ์ข้อความเตือนว่าเจอปัญหา แต่โปรแกรมจะยังคงเดินหน้าลูปต่อไป
- `if __name__ == "__main__":`: เป็นรูปแบบมาตรฐานของไฟล์ Python แปลว่า "หากถูกรันโดยตรงผ่าน Terminal (ไม่ได้ถูกนำไป import ในไฟล์อื่น) ให้รันฟังก์ชัน `main()`"

---

## 7. เสริม: File I/O, python-dotenv และ pyodbc เบื้องต้น (ไฟล์แยก)

นอกจากพื้นฐานภาษา Python แล้ว ก่อนไปเรียนบทถัดไป ๆ (กล้อง, YOLO, MSSQL) ควรทำความคุ้นเคยกับ 3 เรื่องนี้ก่อน เพราะทั้งโปรเจกต์ใช้ซ้ำตลอด — ดูโค้ดเต็มได้ที่ `file_io_config_example.py`

### 7.1 อ่าน/เขียนไฟล์ด้วย `os.path`

```python
output_dir = os.path.join(os.path.dirname(__file__), "output")
os.makedirs(output_dir, exist_ok=True)

log_path = os.path.join(output_dir, "playground_log.txt")
with open(log_path, "w", encoding="utf-8") as f:
    f.write("playground 01 - file_io_config_example demo\n")

with open(log_path, "r", encoding="utf-8") as f:
    content = f.read()
```

**คำอธิบายโค้ด (Line-by-Line):**
- `os.path.join(...)`: ประกอบ path ให้ถูกต้องเสมอไม่ว่าจะรันบน Windows (`\`) หรือ Linux/macOS (`/`)
- `os.makedirs(folder, exist_ok=True)`: สร้างโฟลเดอร์ถ้ายังไม่มี — `exist_ok=True` กันไม่ให้ error ถ้าโฟลเดอร์นั้นมีอยู่แล้ว
- `open(path, "w", encoding="utf-8")`: เปิดไฟล์เพื่อเขียน (`"w"` = เขียนทับใหม่) โดยระบุ `encoding="utf-8"` เสมอเพื่อไม่ให้ภาษาไทยเพี้ยน
- `with open(...) as f:`: ใช้ `with` เพื่อให้ไฟล์ถูกปิดอัตโนมัติแม้เกิด error ระหว่างทาง

### 7.2 โหลดค่า config ด้วย `python-dotenv` (pattern ของ `config/settings.py`)

```python
from dotenv import load_dotenv
import os

load_dotenv()  # อ่านไฟล์ .env ที่ root โปรเจกต์เข้า environment variables

device_raw = os.getenv("DEVICE", "cpu")
company_raw = os.getenv("COMPANY_CODE", "DEMO")
```

**คำอธิบายโค้ด (Line-by-Line):**
- `load_dotenv()`: อ่านไฟล์ `.env` แล้วเซ็ตค่าใน environment ให้อัตโนมัติ (เรียกครั้งเดียวตอนเริ่มโปรแกรมพอ)
- `os.getenv("DEVICE", "cpu")`: อ่านค่า `DEVICE` จาก environment ถ้าไม่พบให้ใช้ `"cpu"` เป็นค่า default
- ⚠️ **โปรเจกต์นี้ห้ามเรียก `os.getenv()` กระจัดกระจายแบบนี้ในโค้ดจริง** — ทุกไฟล์ต้อง `from config.settings import settings` แล้วใช้ `settings.DEVICE` แทน (ดู `config/settings.py`) ตัวอย่างนี้แค่โชว์ว่ากลไกเบื้องหลังทำงานยังไง

### 7.3 รูปแบบ Connection String ของ `pyodbc`

```python
conn_str = (
    f"DRIVER={settings.DB_DRIVER};"
    f"SERVER={settings.DB_SERVER};"
    f"DATABASE={settings.DB_NAME};"
    f"UID={settings.DB_USER};"
    f"PWD={settings.DB_PASSWORD};"
    "TrustServerCertificate=yes;Encrypt=yes;"
)
```

**คำอธิบายโค้ด (Line-by-Line):**
- ค่าทุกตัวมาจาก `config/settings.py` (ซึ่งโหลดจาก `.env`) — ห้าม hardcode server/user/password ตรง ๆ ในโค้ดเด็ดขาด
- ถ้ายังไม่ได้ตั้งค่า `DB_SERVER` ใน `.env` สคริปต์นี้จะ**ข้าม**การลอง connect จริง แล้วแค่ print ตัวอย่าง connection string ให้ดูเฉย ๆ — ไม่ต้องมี MSSQL รันอยู่ก็ทำแบบฝึกหัดนี้ผ่านได้
- ถ้าตั้งค่า DB ไว้แล้ว จะลองต่อจริงด้วย `pyodbc.connect(...)` แล้วปิด connection ทันที (ดูตัวอย่างเรียก Stored Procedure เต็ม ๆ ที่ `playground/05-mssql-database`)

---

## การรันทดสอบ

1. เปิด Terminal (เช่น Command Prompt, PowerShell หรือ VS Code Terminal)
2. พิมพ์คำสั่งด้านล่างเพื่อรันสคริปต์หลัก
```bash
python playground/01-python-basic/example.py
```
3. หากสำเร็จ คุณจะเห็นผลลัพธ์ดังนี้ใน Console ของคุณ:
```text
INFO | camera_no=1 (type=int)
INFO | confidence=0.87 (type=float)
INFO | สรุปจำนวนที่ตรวจจับได้: {'person': 2, 'forklift': 1}
INFO | พบคนในภาพ 2 คน
Hello from Camera-1!
INFO | Counter นับได้ 3 ครั้ง
WARNING | ค่า 'not_a_number' ไม่ใช่ตัวเลข - ข้ามไป
INFO | ค่า confidence ที่ใช้ได้: [0.5, 0.9]
```
4. ลองรันไฟล์เสริมเรื่อง File I/O / python-dotenv / pyodbc ด้วยคำสั่งนี้

```bash
python playground/01-python-basic/file_io_config_example.py
```

ผลลัพธ์ที่คาดหวัง (กรณียังไม่ได้ตั้งค่า `DB_SERVER` ใน `.env`):

```text
INFO | === 1. File I/O ด้วย os.path ===
INFO | เขียนไฟล์แล้ว: playground/01-python-basic/output/playground_log.txt
INFO | อ่านไฟล์กลับมาได้:
playground 01 - file_io_config_example demo
company_code (default จาก settings) = DEMO

INFO | === 2. python-dotenv + os.getenv() ===
INFO | os.getenv('DEVICE', 'cpu') = cpu
INFO | os.getenv('COMPANY_CODE', 'DEMO') = DEMO
INFO | settings.DEVICE (จาก config/settings.py) = cpu
INFO | settings.COMPANY_CODE (จาก config/settings.py) = DEMO

INFO | === 3. pyodbc connection string (pattern) ===
INFO | ตัวอย่าง connection string ที่ประกอบได้:
  DRIVER={ODBC Driver 17 for SQL Server};SERVER=<ยังไม่ตั้งค่า DB_SERVER ใน .env>;...
WARNING | DB_SERVER ยังไม่ตั้งค่าใน .env — ข้ามการลอง connect จริง (แบบฝึกหัดนี้ไม่บังคับว่าต้องมี MSSQL รันอยู่)
```

## ลองต่อยอด (แบบฝึกหัดเพิ่มเติม)

- ลองสร้างไฟล์ `.env` ที่ root โปรเจกต์ ใส่ `COMPANY_CODE=ACME` แล้วรัน `file_io_config_example.py` ใหม่ ดูว่าค่าที่ print เปลี่ยนตาม `.env` จริงไหม
- ลองตั้งค่า `DB_SERVER`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` ใน `.env` ให้ชี้ไป MSSQL ที่มีจริง (ถ้ามี) แล้วดูว่าขั้นตอนที่ 3 ต่อสำเร็จไหม
