"""
เซฟรูปภาพที่ตรวจจับได้ลง shared drive ตามโครงสร้าง §G:
  {IMAGE_SHARED_DRIVE}/walkway-detection/{company_code}/camera-{camera_no}/yyyyMMdd/
  detection_{company_code}_{camera_no}_{yyyyMMdd_HHmmss}.jpg

📌 ค่า IMAGE_SHARED_DRIVE โหลดจาก .env เท่านั้น (ห้ามฮาร์ดโค้ด path)
"""

import logging
import os
from datetime import datetime

import cv2

from config.settings import settings

logger = logging.getLogger(__name__)


def save_detection_image(frame, company_code: str, camera_no: str) -> tuple[str, str]:
    """
    เซฟรูปลง shared drive
    คืน (image_path_absolute, image_url_relative) หรือ ("", "") ถ้าล้มเหลว
    """
    now = datetime.now()
    date_str = now.strftime("%Y%m%d")
    ts_str = now.strftime("%Y%m%d_%H%M%S")
    filename = f"detection_{company_code}_{camera_no}_{ts_str}.jpg"

    folder = os.path.join(
        settings.IMAGE_SHARED_DRIVE,
        "walkway-detection",
        company_code,
        f"camera-{camera_no}",
        date_str,
    )

    try:
        os.makedirs(folder, exist_ok=True)
        image_path = os.path.join(folder, filename)
        success = cv2.imwrite(image_path, frame)
        if not success:
            raise OSError("cv2.imwrite คืนค่า False")
    except Exception as exc:
        logger.error("เซฟรูปไม่สำเร็จ path=%s — %s", os.path.join(folder, filename), exc)
        return "", ""

    # image_url = relative path สำหรับ frontend/DB อ้างอิง
    image_url = f"/images/{company_code}/camera-{camera_no}/{date_str}/{filename}"
    logger.info("เซฟรูปสำเร็จ: %s", image_path)
    return image_path, image_url
