"""
เซฟรูปภาพที่ตรวจจับได้ลงโฟลเดอร์ปลายทาง (IMAGE_SHARED_DRIVE — เป็น shared drive จริง
หรือ local folder ในโปรเจกต์ก็ได้ ขึ้นกับค่าใน .env) ตามโครงสร้าง:

  {IMAGE_SHARED_DRIVE}\\{company_code}\\{camera_no}\\{YYYYMMDD}\\detection_{camera_no}_{YYYYMMDD_HHMMSS_fff}.jpg

ตัวอย่าง (โหมด local debug):
  DetectionImages\\BKC\\1\\20260710\\detection_1_20260710_150233_842.jpg

📌 IMAGE_SHARED_DRIVE โหลดจาก .env เท่านั้น — ห้ามฮาร์ดโค้ด path
   ตั้งเป็น local folder เพื่อ debug/สอน หรือ shared drive จริงตอน production
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
    # ชื่อไฟล์ unique ต่อรูป: ใส่ camera_no + เวลาถึงระดับมิลลิวินาที
    # กัน 2 event ในวินาทีเดียวกันเขียนทับกัน และดู debug ได้ง่ายว่ารูปมาจากกล้องไหน เวลาไหน
    ts_str   = now.strftime("%Y%m%d_%H%M%S") + f"_{now.microsecond // 1000:03d}"
    image_name = f"detection_{camera_no}_{ts_str}.jpg"

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


def save_camera_snapshot(frame, company_code: str, camera_no: str) -> str:
    """
    เซฟภาพ snapshot ล่าสุดของกล้อง 1 ตัว ไว้ให้หน้า Draw Polygon ใช้อ้างอิง
    ทับไฟล์เดิมทุกครั้ง (ไม่ใช่รูปหลักฐาน เก็บแค่ภาพเดียวต่อกล้อง ไม่ใช่ timestamped เหมือน event)

    path = {IMAGE_SHARED_DRIVE}\\_snapshots\\{company_code}\\{camera_no}.jpg
    คืน full path หรือ "" ถ้าเซฟไม่สำเร็จ
    """
    folder = os.path.join(settings.IMAGE_SHARED_DRIVE, "_snapshots", company_code)

    try:
        os.makedirs(folder, exist_ok=True)
        snapshot_path = os.path.join(folder, f"{camera_no}.jpg")
        success = cv2.imwrite(snapshot_path, frame)
        if not success:
            raise OSError("cv2.imwrite คืนค่า False — ตรวจสอบ path และ permission ของ shared drive")
    except Exception as exc:
        logger.error("เซฟ camera snapshot ไม่สำเร็จ: %s", exc)
        return ""

    logger.info("เซฟ camera snapshot สำเร็จ: %s", snapshot_path)
    return snapshot_path
