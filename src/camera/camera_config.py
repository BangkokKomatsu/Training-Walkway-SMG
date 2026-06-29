import json
import logging
import os
from dataclasses import dataclass, field

from config.settings import settings

logger = logging.getLogger(__name__)


@dataclass
class CameraConfig:
    camera_no: str
    camera_name: str
    location_name: str
    company_code: str
    source: str
    danger_zones: list[list[tuple[int, int]]] = field(default_factory=list)


def load_camera_configs() -> list[CameraConfig]:
    """โหลดรายการกล้องทั้งหมดจาก cameras.json"""
    config_path = settings.CAMERAS_CONFIG_PATH

    if not os.path.isfile(config_path):
        raise FileNotFoundError(f"ไม่พบไฟล์ config กล้อง: {config_path}")

    return _load_from_json(config_path)


def _load_from_json(path: str) -> list[CameraConfig]:
    """อ่าน cameras.json แล้วแปลงเป็น list ของ CameraConfig"""
    with open(path, encoding="utf-8") as f:
        raw_list = json.load(f)

    configs: list[CameraConfig] = []
    for entry in raw_list:
        if not entry.get("enabled", True):
            logger.info("ข้ามกล้อง %s (enabled=false)", entry.get("camera_no"))
            continue

        zones = []
        for polygon_points in entry.get("danger_zones", []):
            zones.append([(int(x), int(y)) for x, y in polygon_points])

        rtsp_url = entry["rtsp_url"].format(
            user=settings.CAMERA_RTSP_USER,
            password=settings.CAMERA_RTSP_PASSWORD,
        )

        configs.append(CameraConfig(
            camera_no=str(entry["camera_no"]),
            camera_name=entry.get("camera_name", f"Camera-{entry['camera_no']}"),
            location_name=entry.get("location_name", ""),
            company_code=entry.get("company_code", settings.COMPANY_CODE),
            source=rtsp_url,
            danger_zones=zones,
        ))

    logger.info("โหลดกล้องจาก %s สำเร็จ: %d ตัว", path, len(configs))
    return configs


