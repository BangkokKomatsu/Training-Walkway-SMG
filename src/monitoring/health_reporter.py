"""
รายงานสถานะสุขภาพของระบบ:
  - Python service alive
  - DB connection
  - Storage path เข้าถึงได้
  - สถานะกล้อง (รับมาจาก CameraReader)

บันทึกลง trn_system_log ผ่าน ww.sp_insert_system_log
"""

import logging
import os
from datetime import datetime

from config.settings import settings
from src.database.detection_repository import insert_system_log
from src.database.mssql_connection import get_connection

logger = logging.getLogger(__name__)


def report_health(camera_statuses: dict[str, bool] | None = None) -> dict:
    """
    ตรวจสอบ health ทุกองค์ประกอบ แล้วบันทึกลง DB
    camera_statuses: {camera_no: is_connected} จาก CameraReader (None = ข้าม)
    คืน dict สรุปสถานะ
    """
    health = {
        "checked_at": datetime.now().isoformat(),
        "db": False,
        "storage": False,
        "cameras": camera_statuses or {},
    }

    # ตรวจ DB connection
    try:
        conn = get_connection()
        conn.close()
        health["db"] = True
        logger.info("Health: DB ปกติ")
    except Exception as exc:
        msg = f"DB health check ล้มเหลว: {exc}"
        logger.error("Health: %s", msg)
        # ถ้า DB down ก็ log แค่ Python logger — insert_system_log จะล้มเหลวเองและ handle แล้ว

    # ตรวจ storage path
    if settings.IMAGE_SHARED_DRIVE and os.path.isdir(settings.IMAGE_SHARED_DRIVE):
        health["storage"] = True
        logger.info("Health: Storage ปกติ path=%s", settings.IMAGE_SHARED_DRIVE)
    else:
        msg = f"Storage path ไม่พบหรือเข้าไม่ได้: {settings.IMAGE_SHARED_DRIVE}"
        logger.warning("Health: %s", msg)
        insert_system_log(settings.COMPANY_CODE, None, "WARNING", msg)

    # log สถานะกล้องลง DB
    for cam_no, is_ok in (camera_statuses or {}).items():
        level = "INFO" if is_ok else "ERROR"
        msg = f"กล้อง {cam_no} {'เชื่อมต่อปกติ' if is_ok else 'ไม่สามารถเชื่อมต่อได้'}"
        insert_system_log(settings.COMPANY_CODE, cam_no, level, msg)
        logger.log(logging.INFO if is_ok else logging.ERROR, "Health camera: %s", msg)

    # log system alive
    insert_system_log(
        settings.COMPANY_CODE, None, "INFO",
        f"System health check: db={'OK' if health['db'] else 'FAIL'}, "
        f"storage={'OK' if health['storage'] else 'FAIL'}"
    )

    return health
