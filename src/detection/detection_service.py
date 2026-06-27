"""
Detection Service - หัวใจของระบบ
รวม camera_reader + yolo_detector + area_checker เข้าด้วยกัน
และตัดสิน event ตามกติกา 4 ขั้น (§D ของ 00_MASTER_CONTEXT.md):

  1. หาจุดอ้างอิงคน = จุดกึ่งกลางขอบล่างของ bounding box
  2. point-in-polygon: ถ้าอยู่ในพื้นที่อันตราย -> เริ่มจับเวลา (first_seen_time)
  3. อยู่ต่อเนื่อง > DWELL_SECONDS -> เกิด event -> trigger alert
  4. ออกนอกพื้นที่ -> reset ตัวจับเวลา

Phase 3: เกิด event → เซฟรูปลง shared drive → insert MSSQL (SP) → ส่ง Teams + Email → update status
"""

import logging
import os
import time
from datetime import datetime

import cv2

from config.settings import settings
from src.camera.camera_config import CameraConfig, load_camera_configs
from src.camera.camera_reader import CameraReader
from src.detection.area_checker import AreaChecker
from src.detection.yolo_detector import YoloDetector
from src.utils.helpers import get_bbox_bottom_center

logger = logging.getLogger(__name__)

LOOP_DELAY_SECONDS = 0.03
NO_FRAME_RETRY_SECONDS = 0.1


class CameraEventTracker:
    """เก็บสถานะ dwell timer + cooldown ของกล้อง 1 ตัว ตามกติกา 4 ขั้น"""

    def __init__(self, dwell_seconds: int, cooldown_seconds: int):
        self.dwell_seconds = dwell_seconds
        self.cooldown_seconds = cooldown_seconds

        self._enter_time: float | None = None
        self._event_active = False
        self._last_alert_time: float | None = None

    def update(self, person_in_zone: bool) -> bool:
        """อัปเดตสถานะ คืน True ถ้าควร trigger event/alert ใหม่"""
        now = time.monotonic()

        if not person_in_zone:
            # ขั้น 4: ออกนอกพื้นที่ -> reset
            self._enter_time = None
            self._event_active = False
            return False

        # ขั้น 2: อยู่ในพื้นที่ -> เริ่มจับเวลาถ้ายังไม่เริ่ม
        if self._enter_time is None:
            self._enter_time = now

        dwell = now - self._enter_time

        # ขั้น 3: อยู่ต่อเนื่อง > DWELL_SECONDS -> เกิด event
        if dwell > self.dwell_seconds and not self._event_active:
            self._event_active = True

            cooldown_ok = (
                self._last_alert_time is None
                or (now - self._last_alert_time) > self.cooldown_seconds
            )
            if cooldown_ok:
                self._last_alert_time = now
                return True

        return False


def run_detection_service() -> None:
    """เริ่มต้น pipeline ตรวจจับสำหรับกล้องที่ตั้งค่าไว้"""
    camera_configs = load_camera_configs()
    camera_config = camera_configs[0]

    logger.info(
        "เริ่ม detection service: camera_no=%s, company_code=%s, source=%s",
        camera_config.camera_no,
        camera_config.company_code,
        camera_config.source,
    )

    detector = YoloDetector(
        model_path=settings.YOLO_MODEL_PATH,
        device=settings.DEVICE,
        conf_threshold=settings.CONF_THRESHOLD,
    )
    area_checker = AreaChecker(camera_config.danger_zone)
    tracker = CameraEventTracker(settings.DWELL_SECONDS, settings.ALERT_COOLDOWN_SECONDS)

    camera = CameraReader(camera_config.source).start()

    try:
        while True:
            frame = camera.get_latest_frame()
            if frame is None:
                time.sleep(NO_FRAME_RETRY_SECONDS)
                continue

            detections = detector.detect_persons(frame)
            matched = _get_person_in_zone(detections, area_checker)

            if tracker.update(matched is not None) and matched is not None:
                logger.warning(
                    "EVENT TRIGGERED: camera_no=%s อยู่ในพื้นที่อันตรายต่อเนื่องเกิน %d วินาที",
                    camera_config.camera_no,
                    settings.DWELL_SECONDS,
                )
                _handle_event(frame, matched, detections, area_checker, camera_config)

            time.sleep(LOOP_DELAY_SECONDS)
    except KeyboardInterrupt:
        logger.info("ได้รับคำสั่งหยุดการทำงาน (Ctrl+C)")
    finally:
        camera.stop()


# ---------------------------------------------------------------------------
# internal helpers
# ---------------------------------------------------------------------------

def _get_person_in_zone(detections: list[dict], area_checker: AreaChecker) -> dict | None:
    """คืน detection dict ของคนแรกที่อยู่ในพื้นที่อันตราย หรือ None ถ้าไม่มี"""
    for detection in detections:
        reference_point = get_bbox_bottom_center(detection["bbox"])
        if area_checker.is_in_danger_zone(reference_point):
            return detection
    return None


def _handle_event(
    frame,
    matched_detection: dict,
    all_detections: list[dict],
    area_checker: AreaChecker,
    camera_config: CameraConfig,
) -> None:
    """
    Phase 3 event pipeline:
    เซฟรูป → insert DB → ส่ง Teams → ส่ง Email → update alert status
    ทุกขั้นตอนมี try/except — ขั้นใดล้มเหลวก็ log แต่ไม่ crash service
    """
    from src.storage.image_storage import save_detection_image
    from src.database.detection_repository import insert_detection_event, update_alert_status
    from src.alert.teams_alert import send_teams_alert
    from src.alert.email_alert import send_email_alert

    detected_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 1. วาด polygon + bbox บนเฟรมก่อนเซฟ
    save_frame = frame.copy()
    area_checker.draw_polygon(save_frame)
    for det in all_detections:
        x1, y1, x2, y2 = det["bbox"]
        cv2.rectangle(save_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

    # 2. เซฟรูปลง shared drive
    image_path, image_url = save_detection_image(
        save_frame, camera_config.company_code, camera_config.camera_no
    )

    event = {
        "company_code":  camera_config.company_code,
        "camera_no":     camera_config.camera_no,
        "camera_name":   camera_config.camera_name,
        "location_name": camera_config.location_name,
        "detected_class": "person",
        "confidence":    matched_detection["confidence"],
        "event_type":    "DWELL",
        "image_path":    image_path,
        "image_url":     image_url,
        "detected_at":   detected_at,
        "created_by":    "system",
    }

    # 3. insert event ลง MSSQL ผ่าน SP
    event_id = None
    try:
        event_id = insert_detection_event(event)
        event["event_id"] = event_id
        logger.info("insert_detection_event สำเร็จ event_id=%s", event_id)
    except Exception as exc:
        logger.error("insert_detection_event ล้มเหลว — ข้ามการส่ง alert: %s", exc)
        return  # ไม่มี event_id ไม่ส่ง alert

    # 4. ส่ง Teams
    teams_ok, teams_code, teams_msg = False, 0, "not sent"
    try:
        teams_ok, teams_code, teams_msg = send_teams_alert(event)
    except Exception as exc:
        logger.error("send_teams_alert ล้มเหลว: %s", exc)
        teams_msg = str(exc)

    try:
        update_alert_status(
            event_id, camera_config.company_code,
            "TEAMS", "SENT" if teams_ok else "FAILED",
            teams_code, teams_msg,
        )
    except Exception as exc:
        logger.error("update_alert_status TEAMS ล้มเหลว: %s", exc)

    # 5. ส่ง Email
    email_ok, email_msg = False, "not sent"
    try:
        email_ok, email_msg = send_email_alert(event)
    except Exception as exc:
        logger.error("send_email_alert ล้มเหลว: %s", exc)
        email_msg = str(exc)

    try:
        update_alert_status(
            event_id, camera_config.company_code,
            "EMAIL", "SENT" if email_ok else "FAILED",
            None, email_msg,
        )
    except Exception as exc:
        logger.error("update_alert_status EMAIL ล้มเหลว: %s", exc)
