"""
โหลดค่าตั้งค่าทั้งหมดจากไฟล์ .env มาไว้ในที่เดียว
ไฟล์อื่น ๆ ใน src/ ต้อง import ค่าจากที่นี่เท่านั้น ห้ามอ่าน os.getenv() กระจัดกระจาย

วิธีใช้:
    from config.settings import settings
    print(settings.CAMERA_RTSP_URL)
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
    CAMERA_RTSP_URL: str = os.getenv("CAMERA_RTSP_URL", "")
    CAMERA_NO: str = os.getenv("CAMERA_NO", "1")
    CAMERA_NAME: str = os.getenv("CAMERA_NAME", "Camera-1")
    LOCATION_NAME: str = os.getenv("LOCATION_NAME", "")

    # ---- Detection (YOLO) ----
    YOLO_MODEL_PATH: str = os.getenv("YOLO_MODEL_PATH", "Models/yolo11n.pt")
    CONF_THRESHOLD: float = float(os.getenv("CONF_THRESHOLD", "0.5"))

    # ---- Walkway Danger Zone (polygon) ----
    # รูปแบบ: "x1,y1;x2,y2;x3,y3;..." (พิกัดพิกเซลบนภาพจากกล้อง)
    DANGER_ZONE_POLYGON_RAW: str = os.getenv(
        "DANGER_ZONE_POLYGON", "100,100;540,100;540,380;100,380"
    )

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
    TEAMS_WEBHOOK_URL: str = os.getenv("TEAMS_WEBHOOK_URL", "")

    # ---- Alert: Email (SMTP M365) ----
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.office365.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    ALERT_EMAIL_TO: str = os.getenv("ALERT_EMAIL_TO", "")

    @property
    def danger_zone_polygon(self) -> list[tuple[int, int]]:
        """แปลง DANGER_ZONE_POLYGON_RAW ('x1,y1;x2,y2;...') เป็น list ของจุด [(x1, y1), (x2, y2), ...]"""
        points = []
        for pair in self.DANGER_ZONE_POLYGON_RAW.split(";"):
            x_str, y_str = pair.split(",")
            points.append((int(x_str.strip()), int(y_str.strip())))
        return points


# instance เดียวให้ทั้งโปรเจกต์ import ไปใช้
settings = Settings()
