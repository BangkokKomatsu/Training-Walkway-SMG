---
lab:
    title: '05 - MSSQL Database (Playground)'
    description: 'เรียนรู้การเชื่อมต่อฐานข้อมูล Microsoft SQL Server ผ่าน Python ด้วยไลบรารี pyodbc และเรียกใช้งาน Stored Procedure'
---

# 05 - MSSQL Database (Playground)

ในระบบ Walkway Safety Monitor การจัดการข้อมูลและการดึงข้อมูลจะกระทำผ่าน **Stored Procedure** เท่านั้น เพื่อความรวดเร็วและป้องกันการโจมตีแบบ SQL Injection บทเรียนนี้จะสอนการเชื่อมต่อ Python เข้ากับฐานข้อมูล Microsoft SQL Server (MSSQL) ผ่านไลบรารี `pyodbc`

ระยะเวลาที่ใช้: ประมาณ **20** นาที

## Prerequisites
- ติดตั้ง MSSQL เรียบร้อยและรัน Script หมายเลข 01-04 ในโฟลเดอร์ `sql/` แล้ว
- ไฟล์ `.env` มีการตั้งค่า `DB_SERVER`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` เรียบร้อย
- ติดตั้งไลบรารี ODBC (`pip install pyodbc`)

---

## 1. สร้าง Connection String และตรวจสอบการเชื่อมต่อ

เราจะเริ่มจากการประกอบ **Connection String** ซึ่งเป็นข้อความที่ใช้บอก Python ว่าจะเชื่อมต่อไปที่เครื่องไหน ฐานข้อมูลชื่ออะไร และใช้รหัสผ่านอะไร

```python
import os
import sys

# เพิ่ม root ของโปรเจกต์ใน path เพื่อ import config/settings ได้
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from config.settings import settings

def demo_connection():
    import pyodbc

    conn_str = (
        f"DRIVER={settings.DB_DRIVER};"
        f"SERVER={settings.DB_SERVER};"
        f"DATABASE={settings.DB_NAME};"
        f"UID={settings.DB_USER};"
        f"PWD={settings.DB_PASSWORD};"
        "TrustServerCertificate=yes;"
        "Encrypt=yes;"
    )
    
    conn = pyodbc.connect(conn_str, timeout=10)
    cursor = conn.cursor()
    cursor.execute("SELECT @@VERSION")
    version = cursor.fetchone()[0]
    
    print(f"เชื่อมต่อสำเร็จ!\nSQL Server version: {version[:60]}...")
    conn.close()
```

**คำอธิบายโค้ด (Line-by-Line):**
- `conn_str = (...)`: สร้างชุดข้อความยาวๆ เพื่อใช้ล็อกอินเข้า Database โดยดึงตัวแปรจากไฟล์ `.env` (เช่น ไดรเวอร์ที่ใช้, ไอพีของเซิร์ฟเวอร์, ชื่อ Database)
- `TrustServerCertificate=yes;Encrypt=yes;`: บังคับให้ใช้การเข้ารหัสข้อมูล (Encryption) แต่ยอมรับ Certificate ที่ไม่ได้จดทะเบียน (มักใช้ในระบบ Local)
- `pyodbc.connect(conn_str, timeout=10)`: สั่งพยายามล็อกอิน หากใช้เวลาเกิน 10 วินาทีจะตัดการเชื่อมต่อ (Timeout)
- `cursor = conn.cursor()`: สร้างตัวชี้ (Cursor) ซึ่งเป็นออบเจกต์ที่มีหน้าที่รันคำสั่ง SQL
- `cursor.execute("SELECT @@VERSION")`: รันคำสั่ง SQL ง่ายๆ เพื่อถามเวอร์ชันของเซิร์ฟเวอร์
- `version = cursor.fetchone()[0]`: ดึงผลลัพธ์บรรทัดแรก (`fetchone()`) และคอลัมน์แรก (`[0]`) มาเก็บไว้
- `conn.close()`: ปิดการเชื่อมต่อเสมอหลังใช้งานเสร็จ

---

## 2. การเพิ่มข้อมูลด้วย Parameterized Query

ในระบบ เราเรียกใช้ **Stored Procedure** (`sp_insert_detection_event`) แทนการเขียน `INSERT INTO` โค้ดตรงๆ ใน Python

```python
def demo_insert_event():
    import pyodbc
    conn_str = f"DRIVER={settings.DB_DRIVER};SERVER={settings.DB_SERVER};..."
    
    sql = """
        DECLARE @event_id BIGINT;
        EXEC smg.sp_insert_detection_event
            @company_code   = ?,
            @camera_no      = ?,
            @camera_name    = ?,
            ...
            @created_by     = ?,
            @event_id       = @event_id OUTPUT;
        SELECT @event_id;
    """
    
    params = ["DEMO", "CAM-PG", "Playground Camera", "Test Location", "person", 0.9123, "DWELL", None, None, "playground"]

    conn = pyodbc.connect(conn_str, timeout=10)
    try:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        row = cursor.fetchone()
        event_id = int(row[0]) if row else None
        conn.commit()
        print(f"insert สำเร็จ! event_id = {event_id}")
    finally:
        conn.close()
```

**คำอธิบายโค้ด (Line-by-Line):**
- `sql = """ ... """`: เราเขียนคำสั่งภาษา SQL สำหรับเรียกใช้ Stored Procedure (EXEC) 
- `?`: เครื่องหมายคำถาม คือตัวแทนรับข้อมูล (Placeholder) **ห้าม**ใช้การต่อ String (`f"{var}"`) ในโค้ด SQL เด็ดขาดเพื่อป้องกัน SQL Injection
- `@event_id OUTPUT`: Stored Procedure นี้ถูกเขียนมาให้ส่งค่าไอดี (`event_id`) กลับออกมาเมื่อ Insert สำเร็จ
- `params = [...]`: เก็บตัวแปรต่างๆ ไว้ใน List เพื่อเอาไปโยนเข้าแทนที่เครื่องหมาย `?` ตามลำดับ 
- `cursor.execute(sql, params)`: รันคำสั่งพร้อมโยนพารามิเตอร์เข้าไป
- `conn.commit()`: เมื่อแก้ไขข้อมูล (Insert/Update/Delete) **ต้องสั่ง Commit** ทุกครั้ง มิฉะนั้นข้อมูลจะไม่ถูกบันทึกเมื่อเราปิด Connection

---

## 3. การดึงข้อมูลหลายผลลัพธ์ (Multiple Result Sets)

ฟังก์ชัน `demo_get_dashboard_summary()` จะแสดงวิธีดึงข้อมูลเมื่อ Stored Procedure คืนค่ากลับมาหลายตารางพร้อมกัน (เช่น หน้าแดชบอร์ดที่มีทั้ง Summary รวม และสรุปตามกล้องแต่ละตัว)

```python
def demo_get_dashboard_summary():
    # ... (ส่วนเชื่อมต่อ) ...
    sql = "EXEC smg.sp_get_dashboard_summary @company_code = ?"
    
    conn = pyodbc.connect(conn_str, timeout=10)
    try:
        cursor = conn.cursor()
        cursor.execute(sql, ["DEMO"])
        
        # Result Set 1: Summary Row
        summary = cursor.fetchone()
        if summary:
            print(f"Total Events: {summary.total_events}, Today: {summary.today_count}")
        
        # Result Set 2: Camera Summary
        if cursor.nextset():
            for row in cursor.fetchall():
                print(f"Camera {row.camera_no}: {row.event_count} events")
                
    finally:
        conn.close()
```

**คำอธิบายโค้ด (Line-by-Line):**
- `cursor.fetchone()`: ดึงตารางที่ 1 (Result Set 1) ซึ่งคือข้อมูลสรุปภาพรวมทั้งหมด มีบรรทัดเดียว
- `summary.total_events`: ออบเจกต์ของ pyodbc อนุญาตให้เราดึงข้อมูลคอลัมน์จากชื่อมันได้เลย
- `cursor.nextset()`: สั่งให้ Cursor เลื่อนไปอ่านตารางผลลัพธ์ที่ 2 ที่ Stored Procedure พ่นออกมา
- `cursor.fetchall()`: ดึงข้อมูลที่เหลือในตารางที่ 2 ทุกบรรทัดออกมาเป็น List เพื่อให้เราวนลูปนำข้อมูลไปแสดงผล

---

## การรันทดสอบ

1. เปิด Terminal
2. รันคำสั่งด้านล่างเพื่อรันตัวอย่างฐานข้อมูล:
```bash
python playground/05-mssql-database/example.py
```
3. ผลลัพธ์ที่คาดหวัง:
```text
============================================================
Playground 05: MSSQL + Stored Procedure
============================================================

กำลังเชื่อมต่อ: SERVER=localhost, DB=WalkwaySMG
เชื่อมต่อสำเร็จ!
SQL Server version: Microsoft SQL Server 2022 (RTM)...

insert สำเร็จ! event_id = 1234

Event ล่าสุด 5 รายการของ DEMO:
  event_id=1234  camera=CAM-PG  status=NEW  at=2026-06-16 14:30:00

Dashboard Summary (DEMO):
  Total Events: 1, Today: 0, New: 1
Camera Summaries:
  Camera CAM-PG (Playground Camera): 1 events
```
