"""
การตั้งค่าเฉพาะของกล้องแต่ละตัว: source (RTSP/ไฟล์วิดีโอ), camera_no, company_code, polygon พื้นที่อันตราย

Phase 1: โหลดกล้องเดียวจากค่าใน .env (ผ่าน config/settings.py)
Phase 2+: จะเปลี่ยนมาโหลดจากตาราง mst_camera / mst_detection_area ใน MSSQL แทน
          (โครงสร้าง CameraConfig ออกแบบเป็น list ไว้แล้ว เพื่อรองรับหลายกล้องในอนาคต)
"""

from dataclasses import dataclass

from config.settings import settings


@dataclass
class CameraConfig:
    camera_no: str
    camera_name: str
    location_name: str
    company_code: str
    source: str  # RTSP URL หรือ path ไฟล์วิดีโอสำหรับทดสอบ
    danger_zone: list[tuple[int, int]]  # polygon พื้นที่อันตราย [(x, y), ...]


def load_camera_configs() -> list[CameraConfig]:
    """คืนรายการกล้องทั้งหมดที่ระบบต้องอ่าน (Phase 1: กล้องเดียวจาก .env)"""
    return [
        CameraConfig(
            camera_no=settings.CAMERA_NO,
            camera_name=settings.CAMERA_NAME,
            location_name=settings.LOCATION_NAME or settings.CAMERA_NAME,
            company_code=settings.COMPANY_CODE,
            source=settings.CAMERA_RTSP_URL,
            danger_zone=settings.danger_zone_polygon,
        )
    ]
