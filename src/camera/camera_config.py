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
    """โหลดรายการกล้องทั้งหมด"""
    source = settings.CAMERA_CONFIG_SOURCE.lower()
    if source == "db":
        return _load_from_db()
    else:
        config_path = settings.CAMERAS_CONFIG_PATH
        if not os.path.isfile(config_path):
            raise FileNotFoundError(f"ไม่พบไฟล์ config กล้อง: {config_path}")
        return _load_from_json(config_path)


def _load_from_db() -> list[CameraConfig]:
    """โหลดรายการกล้องจาก Database MSSQL"""
    from src.database.mssql_connection import get_connection

    logger.info("กำลังโหลดกล้องจาก Database... (company_code: %s)", settings.COMPANY_CODE)
    conn = get_connection()
    try:
        cursor = conn.cursor()
        
        # ดึงข้อมูลกล้องทั้งหมดที่ active ของบริษัท
        cursor.execute("""
            SELECT camera_no, camera_name, location_name, company_code, rtsp_url, username, password
            FROM smg.mst_camera
            WHERE is_active = 1 AND company_code = ?
        """, (settings.COMPANY_CODE,))
        
        rows = cursor.fetchall()
        configs: list[CameraConfig] = []
        
        for row in rows:
            camera_no = str(row[0])
            camera_name = row[1] or f"Camera-{camera_no}"
            location_name = row[2] or ""
            company_code = row[3] or settings.COMPANY_CODE
            rtsp_url = row[4]
            username = row[5]
            password = row[6]
            
            # Format RTSP URL if it contains placeholders {user} and {password}
            if "{user}" in rtsp_url or "{password}" in rtsp_url:
                user = username if username else settings.CAMERA_RTSP_USER
                passwd = password if password else settings.CAMERA_RTSP_PASSWORD
                source_url = rtsp_url.format(user=user, password=passwd)
            else:
                source_url = rtsp_url
                
            # ดึง polygons (danger_zones) ของกล้องนี้
            cursor.execute("""
                SELECT polygon_json
                FROM smg.mst_detection_area
                WHERE company_code = ? AND camera_no = ? AND is_active = 1
            """, (company_code, camera_no))
            
            zone_rows = cursor.fetchall()
            zones = []
            for z_row in zone_rows:
                polygon_json = z_row[0]
                try:
                    pts = json.loads(polygon_json)
                    zones.append([(int(x), int(y)) for x, y in pts])
                except Exception as exc:
                    logger.error("ล้มเหลวในการ parse polygon_json สำหรับกล้อง %s: %s", camera_no, exc)
            
            configs.append(CameraConfig(
                camera_no=camera_no,
                camera_name=camera_name,
                location_name=location_name,
                company_code=company_code,
                source=source_url,
                danger_zones=zones,
            ))
            
        logger.info("โหลดกล้องจาก Database สำเร็จ: %d ตัว", len(configs))
        return configs
    except Exception as exc:
        logger.error("ล้มเหลวในการโหลดกล้องจาก Database: %s", exc)
        raise exc
    finally:
        conn.close()


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


