"""
เชื่อมต่อ MSSQL ด้วย pyodbc อ่านค่าจาก config/settings.py เท่านั้น
📌 ห้ามต่อ SQL ด้วย f-string/string concat ในทุกที่ที่ใช้ connection นี้
"""

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
    Raise ConnectionError ถ้าล้มเหลวทุกครั้ง
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

    last_exc: Exception | None = None
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
