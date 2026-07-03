"""
01 - Python Basic (เสริม): File I/O + python-dotenv + pyodbc
สาธิต: อ่าน/เขียนไฟล์ข้อความด้วย os.path, โหลด config ด้วย python-dotenv,
       และรูปแบบ (pattern) connection string ของ pyodbc

รัน: python playground/01-python-basic/file_io_config_example.py

หมายเหตุ: แบบฝึกหัดนี้ไม่ต้องมี MSSQL จริงก็รันผ่านได้ทั้งไฟล์ —
          ส่วน pyodbc แค่โชว์วิธีประกอบ connection string เป็นหลัก

อ้างอิง: docs/course-modules/02-python-basic.md §5.10-5.12
"""

import logging
import os
import sys
from pathlib import Path

# เพิ่ม root โปรเจกต์เข้า sys.path เพื่อ import config/settings ได้ (เหมือน playground อื่น ๆ)
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from config.settings import settings  # noqa: E402

# Windows console ใช้ cp1252 เป็น default ทำให้ print/log ภาษาไทยพัง -> บังคับเป็น UTF-8
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)


def demo_file_io() -> None:
    """สาธิต os.path + อ่าน/เขียนไฟล์ข้อความ (เหมือนที่ Module 02 §5.10 สอน)"""
    logger.info("=== 1. File I/O ด้วย os.path ===")

    # os.path.join ประกอบ path ให้ถูกต้องไม่ว่าจะรันบน Windows หรือ Linux (/ กับ \\)
    output_dir = os.path.join(os.path.dirname(__file__), "output")
    os.makedirs(output_dir, exist_ok=True)  # exist_ok=True = ไม่ error ถ้ามีโฟลเดอร์อยู่แล้ว

    log_path = os.path.join(output_dir, "playground_log.txt")

    # เขียนไฟล์ (mode "w" = เขียนทับใหม่ทุกครั้งที่รัน)
    with open(log_path, "w", encoding="utf-8") as f:
        f.write("playground 01 - file_io_config_example demo\n")
        f.write(f"company_code (default จาก settings) = {settings.COMPANY_CODE}\n")

    logger.info("เขียนไฟล์แล้ว: %s", log_path)

    # อ่านไฟล์กลับมาเพื่อยืนยันว่าเขียนสำเร็จจริง
    with open(log_path, "r", encoding="utf-8") as f:
        content = f.read()

    logger.info("อ่านไฟล์กลับมาได้:\n%s", content.strip())


def demo_dotenv_config() -> None:
    """
    สาธิต python-dotenv + os.getenv() — pattern เดียวกับที่ config/settings.py ใช้จริง

    ⚠️ ข้อควรระวัง: โค้ดจริงในโปรเจกต์นี้ **ห้าม** เรียก os.getenv() กระจัดกระจายแบบนี้
    ทุกไฟล์ต้อง import ค่าจาก config/settings.py ที่เดียว (ดู CLAUDE.md ข้อ 6)
    ตัวอย่างนี้แค่โชว์ "กลไกเบื้องหลัง" ว่า settings.py ทำงานยังไงตอนโหลดค่า
    """
    logger.info("=== 2. python-dotenv + os.getenv() ===")

    from dotenv import load_dotenv

    load_dotenv()  # อ่านไฟล์ .env ที่ root โปรเจกต์ (ถ้ามี) เข้า environment variables ของโปรเซสนี้

    # os.getenv(key, default) — คืนค่า default ถ้าไม่พบตัวแปรนั้นในระบบเลย
    device_raw = os.getenv("DEVICE", "cpu")
    company_raw = os.getenv("COMPANY_CODE", "DEMO")
    logger.info("os.getenv('DEVICE', 'cpu') = %s", device_raw)
    logger.info("os.getenv('COMPANY_CODE', 'DEMO') = %s", company_raw)

    # เทียบกับค่าที่ config/settings.py โหลดไว้ล่วงหน้าแล้ว (ค่าควรตรงกัน)
    logger.info("settings.DEVICE (จาก config/settings.py) = %s", settings.DEVICE)
    logger.info("settings.COMPANY_CODE (จาก config/settings.py) = %s", settings.COMPANY_CODE)


def demo_pyodbc_pattern() -> None:
    """
    สาธิตรูปแบบ (pattern) ของ pyodbc connection string ที่ src/database/mssql_connection.py ใช้จริง

    หมายเหตุ: ไม่ต้องมี MSSQL จริงก็ทำแบบฝึกหัดนี้ผ่านได้ —
    ถ้า DB_SERVER ยังไม่ตั้งค่าใน .env จะข้ามขั้นตอนลอง connect จริงไปเฉย ๆ (ไม่ error)
    ดูตัวอย่างที่เชื่อมต่อ MSSQL จริงแบบเต็มได้ที่ playground/05-mssql-database
    """
    logger.info("=== 3. pyodbc connection string (pattern) ===")

    # ประกอบ connection string จากค่าใน config/settings.py เท่านั้น (ห้าม hardcode ค่าใด ๆ)
    conn_str_display = (
        f"DRIVER={settings.DB_DRIVER};"
        f"SERVER={settings.DB_SERVER or '<ยังไม่ตั้งค่า DB_SERVER ใน .env>'};"
        f"DATABASE={settings.DB_NAME or '<ยังไม่ตั้งค่า DB_NAME ใน .env>'};"
        f"UID={settings.DB_USER or '<ยังไม่ตั้งค่า DB_USER ใน .env>'};"
        "PWD=***;"  # ไม่ print รหัสผ่านจริงออกจอ ต่อให้เป็น playground ก็ตาม
        "TrustServerCertificate=yes;Encrypt=yes;"
    )
    logger.info("ตัวอย่าง connection string ที่ประกอบได้:\n  %s", conn_str_display)

    if not settings.DB_SERVER:
        logger.warning(
            "DB_SERVER ยังไม่ตั้งค่าใน .env — ข้ามการลอง connect จริง "
            "(แบบฝึกหัดนี้ไม่บังคับว่าต้องมี MSSQL รันอยู่)"
        )
        return

    try:
        import pyodbc

        real_conn_str = (
            f"DRIVER={settings.DB_DRIVER};SERVER={settings.DB_SERVER};"
            f"DATABASE={settings.DB_NAME};UID={settings.DB_USER};PWD={settings.DB_PASSWORD};"
            "TrustServerCertificate=yes;Encrypt=yes;"
        )
        conn = pyodbc.connect(real_conn_str, timeout=5)
        conn.close()
        logger.info("เชื่อมต่อ MSSQL จริงสำเร็จ! (ดูตัวอย่างเต็มใน playground/05-mssql-database)")
    except Exception as exc:
        logger.warning("ต่อ MSSQL จริงไม่สำเร็จ (ไม่เป็นไร แบบฝึกหัดนี้แค่โชว์ pattern): %s", exc)


if __name__ == "__main__":
    demo_file_io()
    print()
    demo_dotenv_config()
    print()
    demo_pyodbc_pattern()
