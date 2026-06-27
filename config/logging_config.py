"""
ตั้งค่า logging มาตรฐานของระบบ (console + ไฟล์ log, UTF-8)

วิธีใช้:
    from config.logging_config import setup_logging
    setup_logging()

    import logging
    logger = logging.getLogger(__name__)
    logger.info("เริ่มระบบ")
"""

import logging
import os
import sys

LOG_DIR = "logs"
LOG_FILE = os.path.join(LOG_DIR, "walkway.log")


def setup_logging(level: int = logging.INFO) -> None:
    """ตั้งค่า logging ให้พิมพ์ออก console และเขียนลงไฟล์ logs/walkway.log"""
    os.makedirs(LOG_DIR, exist_ok=True)

    # Windows console ใช้ cp1252 เป็น default ทำให้ log ภาษาไทยพัง/ขึ้น \uXXXX -> บังคับเป็น UTF-8
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
