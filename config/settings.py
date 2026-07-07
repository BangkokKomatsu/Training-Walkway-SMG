"""
โหลดค่าตั้งค่าทั้งหมดจากไฟล์ .env มาไว้ในที่เดียว
ไฟล์อื่น ๆ ใน src/ ต้อง import ค่าจากที่นี่เท่านั้น ห้ามอ่าน os.getenv() กระจัดกระจาย

วิธีใช้:
    from config.settings import settings
    print(settings.DEVICE)
"""

import os
from dataclasses import dataclass

from dotenv import load_dotenv

# โหลดค่าจากไฟล์ .env (ถ้าไม่มีไฟล์ .env จะใช้ค่า default ด้านล่างแทน)
load_dotenv()


@dataclass(frozen=True)
class Settings:
    # ---- General ----
    DEVICE: str = os.getenv("DEVICE", "cpu")
    COMPANY_CODE: str = os.getenv("COMPANY_CODE", "DEMO")

    # ---- Camera ----
    CAMERA_CONFIG_SOURCE: str = os.getenv("CAMERA_CONFIG_SOURCE", "")  # 'json' หรือ 'db'
    CAMERAS_CONFIG_PATH: str = os.getenv("CAMERAS_CONFIG_PATH", "config/cameras.json")
    CAMERA_RTSP_USER: str = os.getenv("CAMERA_RTSP_USER", "")
    CAMERA_RTSP_PASSWORD: str = os.getenv("CAMERA_RTSP_PASSWORD", "")
    SCHEDULE_SOURCE: str = os.getenv("SCHEDULE_SOURCE", "")  # 'db' หรือ 'hardcoded'
    MAX_CONCURRENT_CAMERAS: int = int(os.getenv("MAX_CONCURRENT_CAMERAS", "2"))
    ROTATION_INTERVAL_SECONDS: int = int(os.getenv("ROTATION_INTERVAL_SECONDS", "60"))

    # ---- Detection (YOLO) ----
    YOLO_MODEL_PATH: str = os.getenv("YOLO_MODEL_PATH", "Models/yolo11n.pt")
    CONF_THRESHOLD: float = float(os.getenv("CONF_THRESHOLD", "0.5"))

    # ---- Event Logic ----
    DWELL_SECONDS: int = int(os.getenv("DWELL_SECONDS", "5"))
    ALERT_COOLDOWN_SECONDS: int = int(os.getenv("ALERT_COOLDOWN_SECONDS", "120"))

    # ---- Database (MSSQL) ----
    DB_DRIVER: str = os.getenv("DB_DRIVER", "{ODBC Driver 17 for SQL Server}")
    DB_SERVER: str = os.getenv("DB_SERVER", "")
    DB_NAME: str = os.getenv("DB_NAME", "")
    DB_USER: str = os.getenv("DB_USER", "")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")

    # ---- Storage ----
    IMAGE_SHARED_DRIVE: str = os.getenv("IMAGE_SHARED_DRIVE", "")

    # ---- Alert: Teams ----
    ENABLE_TEAMS_ALERT: bool = os.getenv("ENABLE_TEAMS_ALERT", "true").lower() == "true"
    TEAMS_WEBHOOK_URL: str = os.getenv("TEAMS_WEBHOOK_URL", "")

    # ---- Alert: Email (SMTP M365) ----
    ENABLE_EMAIL_ALERT: bool = os.getenv("ENABLE_EMAIL_ALERT", "true").lower() == "true"
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.office365.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    ALERT_EMAIL_TO: str = os.getenv("ALERT_EMAIL_TO", "")


# instance เดียวให้ทั้งโปรเจกต์ import ไปใช้
settings = Settings()
