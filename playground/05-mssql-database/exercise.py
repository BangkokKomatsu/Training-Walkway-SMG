"""
=============================================================================
แบบฝึกหัดที่ 05 — MSSQL Connection & Stored Procedures
=============================================================================
วัตถุประสงค์:
  1. ฝึกการต่อ Connection String ไปยัง SQL Server ผ่านตัวแปรตั้งค่า settings
  2. เรียนรู้วิธีการส่ง Parameterized Query เพื่อความปลอดภัย (กัน SQL Injection)
  3. เรียกใช้งาน Stored Procedure และดึงข้อมูล Output Parameter กลับมาใน Python

วิธีปฏิบัติ:
  - เติมโค้ดในช่องว่างที่มีเครื่องหมาย # TODO
  - รันไฟล์นี้ด้วยคำสั่ง:
      python playground/05-mssql-database/exercise.py
  - ตรวจสอบว่าผ่านการทดสอบ Assertion หรือไม่
=============================================================================
"""

import sys
from pathlib import Path
import pyodbc

# นำเข้าเครื่องมือจากโปรเจกต์หลัก
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from config.settings import settings

# บังคับระบบแสดงผลภาษาไทยให้ถูกต้องบน Windows Console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def connect_and_insert_event() -> int | None:
    """
    ฟังก์ชันเชื่อมต่อฐานข้อมูล บันทึกข้อมูลบุกรุก และคืนค่า event_id ของแถวที่สร้างขึ้นใหม่
    """
    # [ตัวอย่างคำอธิบายการสอน]
    # บรรทัดที่ 1: pyodbc.connect(conn_str, timeout=10) ใช้เชื่อมฐานข้อมูลด้วยไดรเวอร์ ODBC
    # บรรทัดที่ 2: conn.cursor() สร้าง cursor เพื่อเอาไว้ยิงคำสั่ง SQL ไปประมวลผล
    # บรรทัดที่ 3: cursor.execute(sql, params) ใช้รันคิวรี่แบบส่งพารามิเตอร์ (ป้องกัน SQL Injection)
    # บรรทัดที่ 4: conn.commit() สั่งให้ฐานข้อมูลบันทึกธุรกรรม (Transaction) ลง Disk จริง
    
    # 1. ประกอบ Connection String
    conn_str = (
        f"DRIVER={settings.DB_DRIVER};"
        f"SERVER={settings.DB_SERVER};"
        f"DATABASE={settings.DB_NAME};"
        f"UID={settings.DB_USER};"
        f"PWD={settings.DB_PASSWORD};"
        "TrustServerCertificate=yes;"
        "Encrypt=yes;"
    )

    conn = None
    event_id = None

    try:
        # TODO 1: เขียนคำสั่งเชื่อมต่อฐานข้อมูลโดยใช้ pyodbc
        # ใบ้: ใช้ pyodbc.connect(conn_str, timeout=10)
        conn = pyodbc.connect(conn_str, timeout=10)
        
        # TODO 2: สร้างออบเจกต์ cursor จากการเชื่อมต่อ conn
        # ใบ้: เรียกใช้ conn.cursor()
        cursor = conn.cursor()

        # SQL คำสั่งเรียก Stored Procedure ของการ Insert Event บุกรุก
        # หมายเหตุ: เราใช้คำสั่ง SELECT @event_id ด้านท้ายสุดเพื่อดึงไอดีส่งกลับมา
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

        # ข้อมูลที่จะส่งเข้าไปแทนที่เครื่องหมาย ? ในคำสั่ง SQL
        params = [
            "DEMO",                       # @company_code
            "CAM-EX-05",                  # @camera_no
            "Exercise 05 Camera",         # @camera_name
            "Lab Zone 5",                 # @location_name
            "person",                     # @detected_class
            0.8850,                       # @confidence
            "INTRUSION",                  # @event_type
            None,                         # @image_path
            None,                         # @image_name
            "exercise-05",                # @created_by
        ]

        # TODO 3: ประมวลผลคำสั่ง SQL ร่วมกับพารามิเตอร์ params
        # ใบ้: ใช้ cursor.execute(sql, params)
        cursor.execute(sql, params)

        # TODO 4: อ่านผลลัพธ์ที่เป็น ID กลับมาจากผลการรัน
        # ใบ้: ใช้ cursor.fetchone() เพื่อรับแถวข้อมูลแรก จากนั้นดึง index ที่ 0 แปลงเป็น int
        row = cursor.fetchone()
        if row is not None:
            event_id = int(row[0])

        # ยืนยันการเปลี่ยนแปลงข้อมูลลงในตาราง
        if conn is not None:
            conn.commit()

        print(f"บันทึกข้อมูล Event สำเร็จ! ได้ไอดีอ้างอิง: event_id = {event_id}")

    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาดระหว่างทำงาน: {e}")
        
    finally:
        # TODO 5: ปิดการเชื่อมต่อฐานข้อมูลเสมอในบล็อก finally (กันปัญหา Connection Leak)
        # ใบ้: ถ้า conn ไม่เป็น None ให้เรียกใช้ conn.close()
        if conn is not None:
            conn.close()
        print("🔒 ปิดการเชื่อมต่อ SQL Server แล้ว")

    return event_id


if __name__ == "__main__":
    # ตรวจสอบเบื้องต้นว่ากำหนดตัวแปรคอนฟิกเชื่อม MSSQL หรือยัง
    if not all([settings.DB_SERVER, settings.DB_NAME, settings.DB_USER, settings.DB_PASSWORD]):
        print("❌ ไม่สามารถรันแบบฝึกหัดนี้ได้: กรุณาแก้ไขไฟล์ .env เพื่อระบุข้อมูลการเชื่อมต่อ MSSQL ก่อน")
        sys.exit(1)

    # รันแบบฝึกหัด
    new_event_id = connect_and_insert_event()

    # === ระบบตรวจคำตอบอัตโนมัติ (Self-Checking) ===
    print("\n=== เริ่มขั้นตอนการตรวจคำตอบ (Verification) ===")
    try:
        assert new_event_id is not None, "ทำแบบฝึกหัดไม่สำเร็จ: ไอดี event_id ที่ส่งกลับมาเป็นค่าว่าง (None)"
        assert isinstance(new_event_id, int), "ประเภทของข้อมูลไอดีที่ส่งกลับมาไม่ใช่จำนวนเต็ม (int)"
        assert new_event_id > 0, f"ค่าไอดีของเหตุการณ์ต้องมากกว่าศูนย์ (ได้พิกัดไอดีเป็น: {new_event_id})"
        
        print(f"✅ ตรวจคำตอบผ่าน! สามารถเชื่อมต่อและบันทึกข้อมูลลง SQL Server สำเร็จ (ได้ ID={new_event_id})")
        print("\n🎉 ยินดีด้วย! คุณผ่านแบบฝึกหัด Database Connection & Stored Procedures เรียบร้อยแล้ว")
    except AssertionError as e:
        print(f"❌ ตรวจสอบพบจุดผิดพลาด: {e}")
        print("คำแนะนำ: ตรวจสอบข้อมูลในไฟล์ .env และตรวจโค้ดส่วน # TODO ให้เรียบร้อย")
