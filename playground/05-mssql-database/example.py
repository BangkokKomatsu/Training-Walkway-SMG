"""
playground/05-mssql-database/example.py
ตัวอย่าง: เชื่อม MSSQL ด้วย pyodbc และเรียก Stored Procedure แบบ parameterized

รันจากโฟลเดอร์ root ของโปรเจกต์:
    python playground/05-mssql-database/example.py

ต้องการ:
    - ไฟล์ .env ตั้งค่า DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD
    - MSSQL พร้อมและรัน script 01-04 แล้ว
    - pip install pyodbc python-dotenv
"""

import os
import sys

# เพิ่ม root ของโปรเจกต์ใน path เพื่อ import config/settings ได้
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from config.settings import settings


def demo_connection():
    """ทดสอบ: เปิด connection และ ping DB"""
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
    print(f"กำลังเชื่อมต่อ: SERVER={settings.DB_SERVER}, DB={settings.DB_NAME}")
    conn = pyodbc.connect(conn_str, timeout=10)
    cursor = conn.cursor()
    cursor.execute("SELECT @@VERSION")
    version = cursor.fetchone()[0]
    print(f"เชื่อมต่อสำเร็จ!\nSQL Server version: {version[:60]}...")
    conn.close()


def demo_insert_event():
    """ทดสอบ: เรียก smg.sp_insert_detection_event และรับ event_id กลับ"""
    import pyodbc

    conn_str = (
        f"DRIVER={settings.DB_DRIVER};SERVER={settings.DB_SERVER};"
        f"DATABASE={settings.DB_NAME};UID={settings.DB_USER};PWD={settings.DB_PASSWORD};"
        "TrustServerCertificate=yes;Encrypt=yes;"
    )

    # ✅ parameterized เท่านั้น — ห้ามต่อ SQL ด้วย f-string
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
        "DEMO",                         # company_code
        "CAM-PG",                       # camera_no
        "Playground Camera",            # camera_name
        "Test Location",                # location_name
        "person",                       # detected_class
        0.9123,                         # confidence
        "DWELL",                        # event_type
        None,                           # image_path
        None,                           # image_name
        "playground",                   # created_by
    ]

    conn = pyodbc.connect(conn_str, timeout=10)
    try:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        row = cursor.fetchone()
        event_id = int(row[0]) if row else None
        conn.commit()
        print(f"insert สำเร็จ! event_id = {event_id}")
        return event_id
    finally:
        conn.close()


def demo_get_events():
    """ทดสอบ: เรียก smg.sp_get_detection_events และแสดงผล"""
    import pyodbc

    conn_str = (
        f"DRIVER={settings.DB_DRIVER};SERVER={settings.DB_SERVER};"
        f"DATABASE={settings.DB_NAME};UID={settings.DB_USER};PWD={settings.DB_PASSWORD};"
        "TrustServerCertificate=yes;Encrypt=yes;"
    )

    sql = """
        EXEC smg.sp_get_detection_events
            @company_code = ?,
            @page_size    = ?
    """
    conn = pyodbc.connect(conn_str, timeout=10)
    try:
        cursor = conn.cursor()
        cursor.execute(sql, ["DEMO", 5])
        rows = cursor.fetchall()
        print(f"\nEvent ล่าสุด 5 รายการของ DEMO:")
        for row in rows:
            print(f"  event_id={row.event_id}  camera={row.camera_no}  "
                  f"status={row.event_status}  at={row.detected_at}")
    finally:
        conn.close()


if __name__ == "__main__":
    print("=" * 60)
    print("Playground 05: MSSQL + Stored Procedure")
    print("=" * 60)

    try:
        demo_connection()
        print()
        demo_insert_event()
        print()
        demo_get_events()
    except Exception as exc:
        print(f"\n❌ Error: {exc}")
        print("ตรวจสอบ: ค่า DB_* ใน .env ถูกต้องไหม? MSSQL เปิดอยู่ไหม? รัน script 01-04 แล้วหรือยัง?")
