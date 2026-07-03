"""
03 - YOLO Detection
สาธิต: ใช้ YoloDetector ตรวจจับคน (person) จากภาพนิ่งหรือวิดีโอ

รัน: python playground/03-yolo-detection/example.py [path/to/image.jpg]
ถ้าไม่ระบุไฟล์ภาพ จะลองเปิดกล้องตัวแรกจาก cameras.json แล้วจับ 1 เฟรมมาทดสอบ

หลังตรวจจับเสร็จ จะวาด bounding box ของคนที่พบลงบนภาพ แล้วเซฟเป็นไฟล์ evidence (.jpg)
ไว้ที่ playground/03-yolo-detection/output/ — เหมือนขั้นตอน "บันทึกหลักฐาน" ที่ระบบจริงทำ
(ดู docs/course-modules/05-yolo-human-detection.md §5.4)

📖 อ่านเพิ่มเติม: https://docs.ultralytics.com/modes/predict
"""

import logging
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import cv2  # noqa: E402

from config.settings import settings  # noqa: E402
from src.camera.camera_config import load_camera_configs  # noqa: E402
from src.camera.camera_reader import CameraReader  # noqa: E402
from src.detection.yolo_detector import YoloDetector  # noqa: E402

# Windows console ใช้ cp1252 เป็น default ทำให้ print/log ภาษาไทยพัง -> บังคับเป็น UTF-8
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)


def _get_test_frame(image_path: str | None):
    if image_path:
        frame = cv2.imread(image_path)
        if frame is None:
            raise FileNotFoundError(f"เปิดไฟล์ภาพไม่ได้: {image_path}")
        return frame

    logger.info("ไม่ได้ระบุไฟล์ภาพ - จะลองจับเฟรมจากกล้องตัวแรกใน cameras.json")
    cameras = load_camera_configs()
    source = cameras[0].source if cameras else "0"
    camera = CameraReader(source).start()
    try:
        for _ in range(20):
            frame = camera.get_latest_frame()
            if frame is not None:
                return frame
            time.sleep(0.2)
    finally:
        camera.stop()

    raise RuntimeError("จับเฟรมจากกล้องไม่สำเร็จ ลองระบุไฟล์ภาพแทน เช่น: example.py sample.jpg")


def draw_detections(frame, detections: list[dict]):
    """
    วาด bounding box + label ของทุก detection ลงบน frame (สำเนา ไม่แก้ frame ต้นฉบับ)
    ดูตัวอย่างเดียวกันใน docs/course-modules/05-yolo-human-detection.md §5.4
    """
    annotated = frame.copy()
    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        label = f"{det['class_name']} {det['confidence']:.0%}"

        # วาดกล่องสี่เหลี่ยมล้อมกรอบคน (สีเขียว, ความหนา 2 พิกเซล)
        cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)

        # เขียน label (ชื่อคลาส + confidence) เหนือกรอบเล็กน้อย
        cv2.putText(
            annotated, label,
            (x1, max(y1 - 5, 0)),
            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2,
        )
    return annotated


def save_evidence_image(annotated_frame) -> str:
    """
    เซฟภาพที่วาด bounding box แล้วลงโฟลเดอร์ output/ ในเครื่อง (แค่สาธิต - ของจริงเซฟลง shared drive
    ผ่าน save_detection_image() ดู playground/08-image-storage)
    """
    output_dir = os.path.join(os.path.dirname(__file__), "output")
    os.makedirs(output_dir, exist_ok=True)

    output_path = os.path.join(output_dir, "detection_result.jpg")
    success = cv2.imwrite(output_path, annotated_frame)
    if not success:
        raise OSError(f"cv2.imwrite คืนค่า False - เซฟไฟล์ไม่สำเร็จ: {output_path}")
    return output_path


def main() -> None:
    image_path = sys.argv[1] if len(sys.argv) > 1 else None
    frame = _get_test_frame(image_path)

    detector = YoloDetector(
        model_path=settings.YOLO_MODEL_PATH,
        device=settings.DEVICE,
        conf_threshold=settings.CONF_THRESHOLD,
    )

    detections = detector.detect_persons(frame)

    logger.info("พบคนทั้งหมด %d คน", len(detections))
    for i, det in enumerate(detections, start=1):
        logger.info("  %d. bbox=%s, confidence=%.2f", i, det["bbox"], det["confidence"])

    # วาด bounding box + เซฟภาพหลักฐาน (evidence image) — เฉพาะตอนพบคนอย่างน้อย 1 คน
    if detections:
        annotated = draw_detections(frame, detections)
        output_path = save_evidence_image(annotated)
        logger.info("บันทึกภาพหลักฐาน (evidence image) แล้วที่: %s", output_path)
    else:
        logger.info("ไม่พบคนในภาพ - ข้ามขั้นตอนวาด/เซฟภาพหลักฐาน")


if __name__ == "__main__":
    main()
