"""
เซฟรูปภาพที่ตรวจจับได้ลง shared drive กลาง (BKC server) ตามโครงสร้าง:

  {IMAGE_SHARED_DRIVE}\\{company_code}\\{camera_no}\\{YYYYMMDD}\\detection__{YYYYMMDD_HHmmss}.jpg

ตัวอย่าง:
  \\\\10.145.250.26\\000-CenterApp\\053-SMG-Walkway\\DEMO\\CAM-01\\20260422\\detection__20260422_182710.jpg

📌 IMAGE_SHARED_DRIVE โหลดจาก .env เท่านั้น — ห้ามฮาร์ดโค้ด path
"""

import logging
import os
from datetime import datetime

import cv2

from config.settings import settings

logger = logging.getLogger(__name__)


def save_detection_image(frame, company_code: str, camera_no: str) -> tuple[str, str]:
    """
    เซฟรูปลง shared drive กลาง
    คืน (image_path, image_name) หรือ ("", "") ถ้าล้มเหลว

    image_path = full UNC path  (เก็บใน DB เพื่อให้ Python อ้างอิง)
    image_name = ชื่อไฟล์เท่านั้น  (เก็บใน DB เพื่อให้ frontend แสดง)
    """
    now = datetime.now()
    date_str = now.strftime("%Y%m%d")
    ts_str   = now.strftime("%Y%m%d_%H%M%S")
    image_name = f"detection__{ts_str}.jpg"

    folder = os.path.join(
        settings.IMAGE_SHARED_DRIVE,
        company_code,
        camera_no,
        date_str,
    )

    try:
        os.makedirs(folder, exist_ok=True)
        image_path = os.path.join(folder, image_name)
        success = cv2.imwrite(image_path, frame)
        if not success:
            raise OSError("cv2.imwrite คืนค่า False — ตรวจสอบ path และ permission ของ shared drive")
    except Exception as exc:
        logger.error("เซฟรูปไม่สำเร็จ: %s", exc)
        return "", ""

    logger.info("เซฟรูปสำเร็จ: %s", image_path)
    return image_path, image_name
