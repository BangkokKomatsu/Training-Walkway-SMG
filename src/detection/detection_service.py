"""
Detection Service - หัวใจของระบบ
รวม camera_reader + yolo_detector + area_checker เข้าด้วยกัน
และตัดสิน event ตามกติกา 4 ขั้น (§D ของ 00_MASTER_CONTEXT.md):

  1. หาจุดอ้างอิงคน = จุดกึ่งกลางขอบล่างของ bounding box
  2. point-in-polygon: ถ้าอยู่ในพื้นที่อันตราย -> เริ่มจับเวลา (first_seen_time)
  3. อยู่ต่อเนื่อง > DWELL_SECONDS -> เกิด event -> trigger alert
  4. ออกนอกพื้นที่ -> reset ตัวจับเวลา

logic เพิ่มเติม:
  - person อยู่ใกล้ bicycle (< 70px) → ถือว่าปลอดภัย (กำลังขี่จักรยาน) ไม่นับเวลา
  - bbox สีเขียว = ปลอดภัย (นอกพื้นที่อันตราย), สีแดง = ในพื้นที่อันตราย
  - วาด label ชื่อ class + confidence บน bbox ทุกอัน

รองรับหลายกล้องพร้อมกัน — แต่ละกล้องรันใน thread แยก, ใช้ YOLO model เดียวกัน (thread-safe)
"""

import logging
import threading
import time
from datetime import datetime

import cv2

from config.settings import settings
from src.camera.camera_config import CameraConfig, load_camera_configs
from src.camera.camera_reader import CameraReader
from src.detection.area_checker import AreaChecker
from src.detection.yolo_detector import YoloDetector
from src.utils.helpers import get_bbox_bottom_center, is_boxes_close, draw_label

logger = logging.getLogger(__name__)

LOOP_DELAY_SECONDS = 0.03
NO_FRAME_RETRY_SECONDS = 0.1

COLOR_SAFE = (0, 255, 0)      # เขียว — นอกพื้นที่อันตราย
COLOR_DANGER = (0, 0, 255)    # แดง — ในพื้นที่อันตราย
BICYCLE_PROXIMITY_PX = 70     # ระยะห่างที่ถือว่า person อยู่ใกล้ bicycle (pixel)


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
            self._enter_time = None
            self._event_active = False
            return False

        if self._enter_time is None:
            self._enter_time = now

        dwell = now - self._enter_time

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


# Hardcoded schedule configuration for demo/learning
# Keyed by camera_no or use "default" as fallback
HARDCODED_SCHEDULES = {
    "default": [
        {
            "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
            "start_time": "08:00",
            "end_time": "17:00"
        }
    ],
    # Example: CAM-01 has Mon-Wed-Fri schedule
    "CAM-01": [
        {
            "days": ["Monday", "Wednesday", "Friday"],
            "start_time": "09:00",
            "end_time": "18:00"
        }
    ]
}


def is_camera_in_schedule(cam_config: CameraConfig) -> bool:
    """ตรวจสอบว่ากล้องนี้อยู่ในช่วงเวลาทำงานที่ต้องตรวจจับหรือไม่"""
    source = settings.SCHEDULE_SOURCE.lower()
    
    # Get rules based on SCHEDULE_SOURCE
    if source == "hardcoded":
        # Use JSON schedule rules if available, else fallback to hardcoded dict
        rules = cam_config.schedule_rules
        if not rules:
            rules = HARDCODED_SCHEDULES.get(cam_config.camera_no, HARDCODED_SCHEDULES.get("default", []))
    else:  # "db" or "json"
        rules = cam_config.schedule_rules

    # If no rules are set, it means active 24/7
    if not rules:
        return True

    # Get current day (Monday, Tuesday, ...) and time (HH:MM)
    now = datetime.now()
    current_day = now.strftime("%A")  # Full name e.g., "Monday"
    current_time = now.strftime("%H:%M")

    for rule in rules:
        days = rule.get("days", [])
        start_time = rule.get("start_time", "00:00")
        end_time = rule.get("end_time", "23:59")
        
        # Check if today is matching and current time is in range
        if current_day in days and start_time <= current_time <= end_time:
            return True
            
    return False


def run_detection_service() -> None:
    """เริ่มต้น pipeline ตรวจจับ — รองรับหลายกล้องพร้อมกัน"""
    camera_configs = load_camera_configs()

    if not camera_configs:
        logger.error("ไม่พบ config กล้อง — ตรวจสอบ cameras.json หรือ .env")
        return

    detector = YoloDetector(
        model_path=settings.YOLO_MODEL_PATH,
        device=settings.DEVICE,
        conf_threshold=settings.CONF_THRESHOLD,
    )

    if len(camera_configs) == 1:
        logger.info("โหมดกล้องเดียว: %s", camera_configs[0].camera_no)
        _camera_loop(detector, camera_configs[0], stop_event=None)
    else:
        logger.info("โหมดหลายกล้อง: %d ตัว", len(camera_configs))
        _run_multi_camera(detector, camera_configs)


def _run_multi_camera(detector: YoloDetector, cam_configs: list[CameraConfig]) -> None:
    """รัน detection loop แบบสลับกล้องทีละ N ตัว ทุกๆ M วินาที"""
    max_concurrent = settings.MAX_CONCURRENT_CAMERAS
    rotation_interval = settings.ROTATION_INTERVAL_SECONDS
    total_cameras = len(cam_configs)
    
    # กรณีจำนวนกล้องมีน้อยกว่าหรือเท่ากับที่กำหนด ให้รันพร้อมกันตามปกติไปเลย
    if total_cameras <= max_concurrent:
        logger.info("จำนวนกล้อง (%d) <= ขีดจำกัดพร้อมกัน (%d) — รันพร้อมกันทั้งหมด", total_cameras, max_concurrent)
        _run_all_simultaneously(detector, cam_configs)
        return

    logger.info(
        "ระบบเริ่มทำงานโหมดสลับกล้อง (รันพร้อมกันไม่เกิน %d ตัว ทุกๆ %d วินาทีจากทั้งหมด %d ตัว)", 
        max_concurrent, rotation_interval, total_cameras
    )
                
    current_index = 0
    global_stop = threading.Event()
    
    try:
        while not global_stop.is_set():
            # 1. คัดกรองกล้องที่จะนำมารันในรอบนี้
            active_configs = []
            for i in range(max_concurrent):
                idx = (current_index + i) % total_cameras
                if cam_configs[idx] not in active_configs:
                    active_configs.append(cam_configs[idx])
            
            logger.info(
                "=== [เริ่มรอบการทำงาน] เปิดใช้งานกล้อง: %s ===", 
                ", ".join([c.camera_no for c in active_configs])
            )
            
            local_stop = threading.Event()
            threads = []
            
            # ใช้ try...finally เพื่อให้แน่ใจว่าลูป Thread จะถูกเคลียร์/หยุดสนิทเสมอ
            try:
                for cam_config in active_configs:
                    t = threading.Thread(
                        target=_camera_loop,
                        args=(detector, cam_config, local_stop),
                        name=f"cam-{cam_config.camera_no}",
                        daemon=True,
                    )
                    threads.append(t)
                    t.start()
                    logger.info("เริ่ม thread กล้อง %s", cam_config.camera_no)
                
                # 2. นอนรอจนครบระยะเวลาสลับกล้อง
                start_time = time.monotonic()
                while time.monotonic() - start_time < rotation_interval:
                    time.sleep(0.5)
                    
            finally:
                # 3. ส่งสัญญาณหยุดการทำงาน และปิดกล้องกลุ่มนี้เพื่อสลับไปกลุ่มถัดไป
                logger.info("=== [สลับกล้อง] กำลังปิดการเชื่อมต่อกล้องกลุ่มปัจจุบัน... ===")
                local_stop.set()
                for t in threads:
                    t.join(timeout=5)
            
            # 4. เลื่อน Index ไปยังกล้องกลุ่มถัดไป
            current_index = (current_index + max_concurrent) % total_cameras
            
    except KeyboardInterrupt:
        logger.info("ได้รับคำสั่งหยุดการทำงาน (Ctrl+C) — กำลังหยุดระบบ")
        global_stop.set()


def _run_all_simultaneously(detector: YoloDetector, cam_configs: list[CameraConfig]) -> None:
    """รันกล้องทั้งหมดพร้อมกันโดยไม่มีการหมุนเวียน"""
    stop_event = threading.Event()
    threads: list[threading.Thread] = []

    for cam_config in cam_configs:
        t = threading.Thread(
            target=_camera_loop,
            args=(detector, cam_config, stop_event),
            name=f"cam-{cam_config.camera_no}",
            daemon=True,
        )
        threads.append(t)
        t.start()
        logger.info("เริ่ม thread กล้อง %s", cam_config.camera_no)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("ได้รับคำสั่งหยุดการทำงาน (Ctrl+C) — กำลังหยุดทุกกล้อง")
        stop_event.set()

    for t in threads:
        t.join(timeout=5)


def _camera_loop(
    detector: YoloDetector,
    cam_config: CameraConfig,
    stop_event: threading.Event | None,
) -> None:
    """detection loop ของกล้อง 1 ตัว — ใช้ได้ทั้งแบบเดี่ยวและใน thread"""
    tag = f"[cam-{cam_config.camera_no}]"

    logger.info(
        "%s เริ่ม detection: company=%s, camera_no=%s, danger_zones=%d เส้น",
        tag, cam_config.company_code, cam_config.camera_no, len(cam_config.danger_zones),
    )

    area_checker = AreaChecker(cam_config.danger_zones)
    tracker = CameraEventTracker(settings.DWELL_SECONDS, settings.ALERT_COOLDOWN_SECONDS)
    camera = None

    try:
        while True:
            if stop_event is not None and stop_event.is_set():
                break

            # ตรวจสอบว่าอยู่ในช่วงเวลาทำงานหรือไม่
            in_schedule = is_camera_in_schedule(cam_config)
            
            if not in_schedule:
                # ถ้าอยู่นอกเวลาทำงาน และเปิดกล้องอยู่ ให้ปิดการเชื่อมต่อกล้องและหน้าต่าง
                if camera is not None:
                    logger.info("%s อยู่นอกตารางการทำงานตาม Schedule — ปิดการสตรีมเพื่อลดภาระของระบบ", tag)
                    camera.stop()
                    camera = None
                    try:
                        cv2.destroyWindow(f"Camera {cam_config.camera_no} - {cam_config.camera_name}")
                    except cv2.error:
                        pass
                
                # นอนหลับนานขึ้นเป็นเวลา 5 วินาทีก่อนวนมาตรวจสอบเวลาทำงานอีกครั้ง
                time.sleep(5.0)
                continue

            # ถ้าอยู่ในเวลาทำงานและยังไม่ได้เชื่อมต่อกล้อง ให้ทำการเชื่อมต่อกล้อง
            if camera is None:
                logger.info("%s เข้าสู่ตารางการทำงานตาม Schedule — เริ่มต้นเชื่อมต่อกล้อง...", tag)
                camera = CameraReader(cam_config.source).start()

            frame = camera.get_latest_frame()
            if frame is None:
                time.sleep(NO_FRAME_RETRY_SECONDS)
                continue

            frame = cv2.resize(frame, (500, 400), interpolation=cv2.INTER_AREA)

            # ตรวจจับ person + bicycle
            all_detections = detector.detect(frame)
            persons = [d for d in all_detections if d["class_name"] == "person"]
            bicycles = [d for d in all_detections if d["class_name"] == "bicycle"]

            # วาด polygon + bbox สี + label ลงเฟรมสำหรับแสดงผล
            display_frame = frame.copy()
            _draw_detections(display_frame, all_detections, area_checker)

            # หา person ที่อยู่ในพื้นที่อันตราย + ไม่ได้อยู่ใกล้ bicycle
            matched = _get_unsafe_person(persons, bicycles, area_checker)

            if tracker.update(matched is not None) and matched is not None:
                logger.warning(
                    "%s EVENT TRIGGERED: อยู่ในพื้นที่อันตรายต่อเนื่องเกิน %d วินาที",
                    tag, settings.DWELL_SECONDS,
                )
                _handle_event(frame, matched, all_detections, area_checker, cam_config)

            # แสดงภาพ live stream (กด q เพื่อหยุดกล้องนี้)
            window_name = f"Camera {cam_config.camera_no} - {cam_config.camera_name}"
            cv2.imshow(window_name, display_frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                logger.info("%s ผู้ใช้กด q — หยุดกล้องนี้", tag)
                break

            time.sleep(LOOP_DELAY_SECONDS)
    except KeyboardInterrupt:
        logger.info("%s ได้รับ Ctrl+C", tag)
    finally:
        if camera is not None:
            camera.stop()
        try:
            cv2.destroyWindow(f"Camera {cam_config.camera_no} - {cam_config.camera_name}")
        except cv2.error:
            pass
        logger.info("%s หยุดทำงาน", tag)


# ---------------------------------------------------------------------------
# detection logic
# ---------------------------------------------------------------------------

def _get_unsafe_person(
    persons: list[dict],
    bicycles: list[dict],
    area_checker: AreaChecker,
) -> dict | None:
    """
    คืน detection ของคนแรกที่ "ไม่ปลอดภัย" — อยู่ในพื้นที่อันตราย + ไม่ได้อยู่ใกล้ bicycle
    คืน None ถ้าทุกคนปลอดภัย (อยู่นอกพื้นที่ หรือ อยู่ใกล้ bicycle)
    """
    for person in persons:
        ref_point = get_bbox_bottom_center(person["bbox"])

        if not area_checker.is_in_danger_zone(ref_point):
            continue

        # person อยู่ในพื้นที่อันตราย — เช็คว่าอยู่ใกล้ bicycle ไหม
        near_bicycle = any(
            is_boxes_close(person["bbox"], b["bbox"], BICYCLE_PROXIMITY_PX)
            for b in bicycles
        )
        if near_bicycle:
            continue

        return person

    return None


def _get_detection_color(detection: dict, area_checker: AreaChecker, bicycles: list[dict]) -> tuple:
    """คืนสี bbox ของ detection: แดง (อันตราย) หรือ เขียว (ปลอดภัย)"""
    if detection["class_name"] == "bicycle":
        return COLOR_SAFE

    ref_point = get_bbox_bottom_center(detection["bbox"])
    if not area_checker.is_in_danger_zone(ref_point):
        return COLOR_SAFE

    near_bicycle = any(
        is_boxes_close(detection["bbox"], b["bbox"], BICYCLE_PROXIMITY_PX)
        for b in bicycles
    )
    if near_bicycle:
        return COLOR_SAFE

    return COLOR_DANGER


def _draw_detections(frame, detections: list[dict], area_checker: AreaChecker) -> None:
    """วาด polygon + bounding box สีตามพื้นที่ + label บน frame"""
    area_checker.draw_polygons(frame)

    bicycles = [d for d in detections if d["class_name"] == "bicycle"]

    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        color = _get_detection_color(det, area_checker, bicycles)
        conf_pct = round(det["confidence"] * 100)
        label = f"{det['class_name']} {conf_pct}%"

        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
        draw_label(frame, label, x1, y1, color)


# ---------------------------------------------------------------------------
# event handling
# ---------------------------------------------------------------------------

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

    # วาด polygon + bbox สี + label ลงเฟรมก่อนเซฟ
    save_frame = frame.copy()
    _draw_detections(save_frame, all_detections, area_checker)

    image_path, image_name = save_detection_image(
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
        "image_name":    image_name,
        "detected_at":   detected_at,
        "created_by":    "system",
    }

    event_id = None
    try:
        event_id = insert_detection_event(event)
        event["event_id"] = event_id
        logger.info("insert_detection_event สำเร็จ event_id=%s", event_id)
    except Exception as exc:
        logger.error("insert_detection_event ล้มเหลว — ข้ามการส่ง alert: %s", exc)
        return

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
