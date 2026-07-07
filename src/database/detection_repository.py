"""
ฟังก์ชัน business layer — เรียก smg.sp_* เท่านั้น
ห้ามต่อ SQL ด้วย f-string/string concat เด็ดขาด (ป้องกัน SQL Injection)

OUTPUT parameter ของ MSSQL ใช้ pattern: DECLARE @out ... EXEC sp ... @out OUTPUT; SELECT @out
เพราะ pyodbc ไม่รองรับ OUTPUT parameter โดยตรงผ่าน ? placeholder
"""

import logging

from .mssql_connection import get_connection

logger = logging.getLogger(__name__)


def insert_detection_event(event: dict) -> int:
    """
    เรียก smg.sp_insert_detection_event และคืน event_id ที่เพิ่งสร้าง
    event dict ต้องมี key: company_code, camera_no, camera_name, location_name,
                           confidence, event_type
    """
    sql = """
        DECLARE @event_id BIGINT;
        EXEC smg.sp_insert_detection_event
            @company_code   = ?,
            @camera_no      = ?,
            @camera_name    = ?,
            @location_name  = ?,
            @detected_class = ?,
            @confidence     = ?,
            @event_type     = ?,
            @image_path     = ?,
            @image_name     = ?,
            @created_by     = ?,
            @event_id       = @event_id OUTPUT;
        SELECT @event_id;
    """
    params = [
        event["company_code"],
        event["camera_no"],
        event["camera_name"],
        event["location_name"],
        event.get("detected_class", "person"),
        event["confidence"],
        event["event_type"],
        event.get("image_path"),
        event.get("image_name"),
        event.get("created_by", "system"),
    ]

    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, params)
        row = cursor.fetchone()
        conn.commit()
        return int(row[0]) if row else None
    finally:
        conn.close()


def update_alert_status(
    event_id: int,
    company_code: str,
    channel: str,
    status: str,
    response_code: int | None = None,
    response_msg: str | None = None,
) -> None:
    """เรียก smg.sp_update_alert_status — channel: 'TEAMS' | 'EMAIL', status: 'SENT' | 'FAILED'"""
    sql = """
        EXEC smg.sp_update_alert_status
            @event_id      = ?,
            @company_code  = ?,
            @alert_channel = ?,
            @alert_status  = ?,
            @response_code = ?,
            @response_msg  = ?
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, [event_id, company_code, channel, status, response_code, response_msg])
        conn.commit()
    finally:
        conn.close()


def insert_system_log(
    company_code: str,
    camera_no: str | None,
    log_level: str,
    log_message: str,
) -> None:
    """เรียก smg.sp_insert_system_log — log_level: 'INFO' | 'WARNING' | 'ERROR'"""
    sql = """
        EXEC smg.sp_insert_system_log
            @company_code = ?,
            @camera_no    = ?,
            @log_level    = ?,
            @log_message  = ?
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, [company_code, camera_no, log_level, log_message])
        conn.commit()
    except Exception as exc:
        # system log ต้องไม่ทำให้ระบบหลักพัง
        logger.error("insert_system_log ล้มเหลว: %s", exc)
    finally:
        conn.close()


def has_pending_snapshot_request(company_code: str, camera_no: str) -> bool:
    """
    เช็คว่า data-api ตั้งคำขอ "Sync ภาพล่าสุด" ค้างอยู่ไหม (snapshot_requested_at ใหม่กว่า last_snapshot_at)
    เป็น read-only เลยใช้ raw parameterized SELECT ตรงๆ ไม่ผ่าน SP (ตาม pattern เดียวกับ camera_config.py)
    """
    sql = """
        SELECT 1
        FROM smg.mst_camera
        WHERE company_code = ? AND camera_no = ?
          AND snapshot_requested_at IS NOT NULL
          AND (last_snapshot_at IS NULL OR snapshot_requested_at > last_snapshot_at)
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, [company_code, camera_no])
        return cursor.fetchone() is not None
    finally:
        conn.close()


def update_camera_snapshot_time(company_code: str, camera_no: str) -> None:
    """เรียก smg.sp_update_camera_snapshot_time หลัง capture snapshot สำเร็จ"""
    sql = """
        EXEC smg.sp_update_camera_snapshot_time
            @company_code = ?,
            @camera_no    = ?
    """
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(sql, [company_code, camera_no])
        conn.commit()
    finally:
        conn.close()
