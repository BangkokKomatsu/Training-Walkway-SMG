# Module 07 — MSSQL Database และ Stored Procedure

> **ระดับ:** กลาง | **เวลาโดยประมาณ:** 90–120 นาที

---

## ส่วนที่ 1 — วัตถุประสงค์

เมื่อจบ module นี้ ผู้เรียนจะสามารถ:

- เชื่อมต่อ MSSQL จาก Python ด้วย `pyodbc`
- เรียกใช้ Stored Procedure (SP) จาก Python
- ใช้ parameterized query อย่างถูกต้อง (ป้องกัน SQL injection)
- เข้าใจว่า `company_code` ทำหน้าที่อะไรในระบบ
- จัดการ error การเชื่อมต่อและ retry ได้

---

## ส่วนที่ 2 — สิ่งที่ต้องเตรียม

- ผ่าน Module 01–06
- MSSQL Server และ database ที่ admin ได้ตั้งค่าไว้แล้ว (schema `smg` + SP ทั้งหมด)
- ค่า DB config ใน `.env` (DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD)
- ติดตั้ง **ODBC Driver 17 for SQL Server** บนเครื่อง

---

## ส่วนที่ 3 — คำอธิบายเข้าใจง่าย

### MSSQL ในระบบนี้ทำหน้าที่อะไร?

MSSQL เป็น "ศูนย์กลางข้อมูล" ของทั้งระบบ:
- Python บันทึก event เข้า MSSQL
- React (frontend) อ่านข้อมูลจาก MSSQL ผ่าน data-api
- **Python และ Frontend ไม่คุยกันตรง ๆ** — คุยผ่าน MSSQL เท่านั้น

### Stored Procedure (SP) คืออะไร?

SP คือ "ฟังก์ชัน SQL" ที่บันทึกไว้ใน database พร้อมใช้งาน ในระบบนี้ logic ทั้งหมดอยู่ใน SP Python แค่เรียก SP พร้อม parameter ไม่ต้องเขียน SQL ยาว ๆ

ประโยชน์:
- Python ไม่ต้องรู้โครงสร้าง table ละเอียด
- Admin เปลี่ยน logic SP ได้โดยไม่ต้องแก้ Python
- ปลอดภัยกว่า (ควบคุม permission ที่ DB ได้)

### `company_code` คืออะไร?

ระบบนี้รองรับหลายบริษัท (multi-tenant) บน database เดียวกัน `company_code` คือรหัสบริษัท (เช่น `"DEMO"`, `"ABC"`, `"XYZ"`) ที่แยกข้อมูลของแต่ละบริษัทออกจากกัน

```sql
-- บริษัท ABC เห็นเฉพาะข้อมูลตัวเอง
SELECT * FROM smg.trn_detection_event WHERE company_code = 'ABC'

-- บริษัท XYZ ก็เห็นเฉพาะของตัวเอง
SELECT * FROM smg.trn_detection_event WHERE company_code = 'XYZ'
```
### ทำไม Parameterized Query จึงสำคัญ?

**SQL Injection คืออะไร?**

ถ้าสร้าง SQL ด้วยการ concat string:
```python
# ❌ อันตราย — SQL Injection
company = "'; DROP TABLE smg.trn_detection_event; --"
sql = f"SELECT * FROM smg.trn_detection_event WHERE company_code = '{company}'"
# SQL จะกลายเป็น:
# SELECT * FROM smg.trn_detection_event WHERE company_code = '';
# DROP TABLE smg.trn_detection_event; --'
# → ลบ table ทั้งหมด!
```
**แก้ด้วย Parameterized Query:**
```python
# ✅ ปลอดภัย
cursor.execute(
    "SELECT * FROM smg.trn_detection_event WHERE company_code = ?",
    [company]   # ? placeholder — DB จัดการ escape ให้
)
```
---

## ส่วนที่ 4 — Flow การทำงาน

```text
python main.py รัน
        ↓
เกิด event (คนอยู่ในพื้นที่ > 5 วิ)
        ↓
detection_repository.insert_detection_event(event_dict)
        ↓
get_connection()  ← เชื่อมต่อ MSSQL (retry 3 ครั้ง)
        ↓
EXEC smg.sp_insert_detection_event @param1=?, @param2=?, ...
        ↓
SP บันทึกลง table smg.trn_detection_event
        ↓
SP คืน @event_id OUTPUT → Python ได้ event_id
        ↓
update_alert_status(event_id, "TEAMS", "SENT")
        ↓
EXEC smg.sp_update_alert_status
```
---

## ส่วนที่ 5 — ตัวอย่าง Code

ดูไฟล์จริงที่:
- [src/database/mssql_connection.py](../../src/database/mssql_connection.py)
- [src/database/detection_repository.py](../../src/database/detection_repository.py)

### 5.1 ติดตั้ง ODBC Driver

**Windows:**
ดาวน์โหลด **Microsoft ODBC Driver 17 for SQL Server** จาก Microsoft และติดตั้ง

ตรวจสอบ:
```python
import pyodbc
print(pyodbc.drivers())
# ต้องเห็น: ['ODBC Driver 17 for SQL Server']
```
### 5.2 `get_connection()` — เชื่อมต่อ MSSQL

โค้ดจาก [src/database/mssql_connection.py](../../src/database/mssql_connection.py):

```python
import logging
import time
import pyodbc
from config.settings import settings

logger = logging.getLogger(__name__)

_MAX_RETRIES = 3
_RETRY_DELAY = 2  # วินาที


def get_connection() -> pyodbc.Connection:
    """
    เปิด connection ไปยัง MSSQL retry สูงสุด 3 ครั้ง
    """
    conn_str = (
        f"DRIVER={settings.DB_DRIVER};"
        f"SERVER={settings.DB_SERVER};"
        f"DATABASE={settings.DB_NAME};"
        f"UID={settings.DB_USER};"
        f"PWD={settings.DB_PASSWORD};"
        "TrustServerCertificate=yes;"
        "Encrypt=yes;"
    )

    last_exc = None
    for attempt in range(1, _MAX_RETRIES + 1):
        try:
            conn = pyodbc.connect(conn_str, timeout=10)
            return conn
        except pyodbc.Error as exc:
            last_exc = exc
            logger.warning("DB connect ล้มเหลว (ครั้งที่ %d/%d): %s", attempt, _MAX_RETRIES, exc)
            if attempt < _MAX_RETRIES:
                time.sleep(_RETRY_DELAY)

    raise ConnectionError(
        f"ไม่สามารถเชื่อมต่อ MSSQL ได้หลังจาก {_MAX_RETRIES} ครั้ง"
    ) from last_exc
```
**ค่า `.env` ที่ต้องตั้ง:**
```dotenv
DB_DRIVER={ODBC Driver 17 for SQL Server}
DB_SERVER=your-sql-server\SQLEXPRESS
DB_NAME=WalkwayDB
DB_USER=walkway_app
DB_PASSWORD=YourSecurePassword123
```
### 5.3 `insert_detection_event()` — บันทึก Event

```python
import logging
from .mssql_connection import get_connection

logger = logging.getLogger(__name__)


def insert_detection_event(event: dict) -> int:
    """
    เรียก smg.sp_insert_detection_event
    คืน event_id ที่เพิ่งสร้าง

    event dict ต้องมี key:
        company_code, camera_no, camera_name, location_name,
        detected_class, confidence, event_type,
        image_path, image_name, created_by
    """
    sql = """
        DECLARE @event_id BIGINT;
        EXEC smg.sp_insert_detection_event
            @company_code   = ?,
            @camera_no      = ?,
            @camera_name    = ?,
            @location_name  = ?,
            @detected_class = ?,
            @confidence     = ?,
            @event_type     = ?,
            @image_path     = ?,
            @image_name     = ?,
            @created_by     = ?,
            @event_id       = @event_id OUTPUT;
        SELECT @event_id;
    """
    params = [
        event["company_code"],
        event["camera_no"],
        event["camera_name"],
        event["location_name"],
        event.get("detected_class", "person"),
        event["confidence"],
        event["event_type"],
        event.get("image_path"),
        event.get("image_name"),
        event.get("created_by", "system"),
    ]

    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        row = cursor.fetchone()
        conn.commit()
        return int(row[0]) if row else None
    finally:
        conn.close()   # ปิดทุกครั้ง แม้จะ error
```
> **ทำไม `DECLARE @event_id` + `SELECT @event_id`?**  
> pyodbc ไม่รองรับ OUTPUT parameter โดยตรงผ่าน `?` placeholder จึงต้องใช้ DECLARE ตัวแปรใน SQL แล้ว SELECT ออกมา

### 5.4 `update_alert_status()` — อัปเดตสถานะ Alert

```python
def update_alert_status(
    event_id: int,
    company_code: str,
    channel: str,      # "TEAMS" หรือ "EMAIL"
    status: str,       # "SENT" หรือ "FAILED"
    response_code: int | None = None,
    response_msg: str | None = None,
) -> None:
    sql = """
        EXEC smg.sp_update_alert_status
            @event_id      = ?,
            @company_code  = ?,
            @alert_channel = ?,
            @alert_status  = ?,
            @response_code = ?,
            @response_msg  = ?
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, [event_id, company_code, channel, status, response_code, response_msg])
        conn.commit()
    finally:
        conn.close()
```
### 5.5 ทดสอบเบื้องต้น (ไม่ต้องมีกล้องจริง)

```python
# playground/05-mssql-database/example.py

from src.database.mssql_connection import get_connection

def test_connection():
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # ทดสอบ query ง่าย ๆ
        cursor.execute("SELECT GETDATE() AS server_time")
        row = cursor.fetchone()
        print(f"DB time: {row.server_time}")

        conn.close()
        print("เชื่อมต่อ DB สำเร็จ ✅")
    except Exception as e:
        print(f"เชื่อมต่อ DB ล้มเหลว: {e}")

test_connection()
```
### 5.6 ตัวอย่างการเรียก SP โดยตรง

```python
# ตัวอย่างบันทึก event จาก Python
from src.database.detection_repository import insert_detection_event, update_alert_status

event = {
    "company_code": "DEMO",
    "camera_no": "1",
    "camera_name": "Camera-1",
    "location_name": "ทางเดินหน้าโกดัง",
    "detected_class": "person",
    "confidence": 0.87,
    "event_type": "DWELL",
    "image_path": "/shared/walkway-detection/DEMO/camera-1/20260101/detection_DEMO_1_20260101_100000.jpg",
    "image_name": "detection_DEMO_1_20260101_100000.jpg",
    "created_by": "system",
}

# บันทึก event
event_id = insert_detection_event(event)
print(f"บันทึก event สำเร็จ event_id={event_id}")

# อัปเดตสถานะ Teams
update_alert_status(event_id, "DEMO", "TEAMS", "SENT", 200, "Accepted")
print("อัปเดต Teams status สำเร็จ")
```

### 5.7 Stored Procedures สำหรับ Frontend Dashboard (Backend API)

นอกจาก SP ที่เรียกโดย Python สำหรับสร้าง Event แล้ว ยังมี SP อื่น ๆ ที่ถูกใช้โดย **Node.js Data API** เพื่อดึงข้อมูลมาแสดงผลใน Frontend Dashboard (`React`) เช่น:

- `smg.sp_login`: ตรวจสอบรหัสผ่านสำหรับ JWT Auth
- `smg.sp_get_dashboard_summary`: ดึงสถิติจำนวน Event วันนี้, สัปดาห์นี้, เดือนนี้
- `smg.sp_get_detection_events`: ค้นหาประวัติ Event พร้อมระบบ Pagination
- `smg.sp_get_camera_status`: ดึงข้อมูลกล้องทั้งหมดพร้อมสถานะปัจจุบัน
- `smg.sp_get_alert_log`: ดูบันทึกการส่งการแจ้งเตือน (Teams/Email)

*รายละเอียดและโครงสร้างของ SP เหล่านี้สามารถดูเพิ่มเติมได้ใน `docs/admin-backend/02-stored-procedure-design.md`*
---

## ส่วนที่ 6 — แบบฝึกหัด

1. **ทดสอบ connection:** รัน `playground/05-mssql-database/example.py` ดูว่าเชื่อมต่อ DB ได้
2. **เรียก SP:** ทดลอง insert event ทดสอบ (ด้วย `company_code="TEST"`) แล้วดูใน DB
3. **ตรวจ SQL injection:** ทดลองใส่ค่า `'; DROP TABLE test; --` เป็น company_code กับ parameterized query ดูว่าปลอดภัยจริง (จะถูก escape อัตโนมัติ)
4. **ทดสอบ retry:** ปิด DB Server ชั่วคราวแล้วดู log — ต้องเห็น warning retry 3 ครั้ง

---

## ส่วนที่ 7 — Checklist หลังเรียน

- [ ] ติดตั้ง ODBC Driver 17 แล้ว (`pyodbc.drivers()` เห็น driver)
- [ ] ตั้งค่า `.env` (DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD) แล้ว
- [ ] ทดสอบ connection สำเร็จ (เห็น server time)
- [ ] เข้าใจว่าใช้ `?` placeholder ไม่ใช้ f-string
- [ ] เรียก `insert_detection_event()` แล้วได้ event_id กลับมา
- [ ] เข้าใจว่า `company_code` แยกข้อมูลแต่ละบริษัท
- [ ] รู้ว่าทำไม `try/finally: conn.close()` สำคัญ

---

## ส่วนที่ 8 — Common Error + วิธีแก้

### Error: `pyodbc.InterfaceError: ('IM002', '[IM002] [Microsoft][ODBC Driver Manager] Data source name not found')`

**สาเหตุ:** ไม่ได้ติดตั้ง ODBC Driver

**วิธีแก้:** ดาวน์โหลดและติดตั้ง ODBC Driver 17 for SQL Server จาก Microsoft

---

### Error: `pyodbc.OperationalError: Login timeout expired`

**สาเหตุ:**
1. DB_SERVER ไม่ถูกต้องหรือ network ไม่ถึง
2. Port 1433 ถูก firewall บล็อก

**วิธีแก้:**
```bash
# ทดสอบ network
Test-NetConnection -ComputerName your-server -Port 1433   # PowerShell
```
---

### Error: `Login failed for user 'walkway_app'`

**สาเหตุ:** DB_USER หรือ DB_PASSWORD ผิด หรือ user ไม่มี permission

**วิธีแก้:** ให้ admin ตรวจสอบ login และ permission ใน MSSQL

---

### Error: `ProgrammingError: No results. Previous SQL was not a query.`

**สาเหตุ:** SP ไม่คืนค่า (ไม่มี `SELECT @event_id`)

ตรวจสอบ SQL ว่ามี `SELECT @event_id;` ต่อท้าย SP หรือใช้ `cursor.nextset()`:
```python
cursor.execute(sql, params)
while cursor.description is None:
    if not cursor.nextset():
        break
row = cursor.fetchone()
```
---

### ข้อมูลถูก insert ซ้ำ (duplicate)

**สาเหตุ:** ไม่ได้ตรวจ cooldown หรือ event_active ใน tracker

ตรวจสอบว่า `CameraEventTracker.update()` คืน `True` เฉพาะเมื่อควร trigger event จริง ๆ

---

## ส่วนที่ 9 — ควร commit อะไร

```text
✅ commit:
├── src/database/mssql_connection.py
├── src/database/detection_repository.py
├── src/database/__init__.py
└── playground/05-mssql-database/example.py
```
---

## ส่วนที่ 10 — ไม่ควร commit อะไร

```text
❌ ห้าม commit:
├── .env                (DB_USER, DB_PASSWORD)
└── ไฟล์ที่มี connection string แบบ hardcode
```
> **หมายเหตุสำหรับผู้เรียน:** SQL table/SP design เป็นหน้าที่ admin — ดูได้ที่ `docs/admin-backend/` แต่ไม่จำเป็นต้องเข้าใจทุกรายละเอียด ผู้เรียนแค่รู้จัก SP ที่ Python เรียกเพียงพอ
