"""
03 - YOLO Detection
สาธิต: ใช้ YoloDetector ตรวจจับคน (person) จากภาพนิ่งหรือวิดีโอ

รัน: python playground/03-yolo-detection/example.py [path/to/image.jpg]
ถ้าไม่ระบุไฟล์ภาพ จะลองเปิดกล้อง/วิดีโอจาก .env (CAMERA_RTSP_URL) แล้วจับ 1 เฟรมมาทดสอบ

📖 อ่านเพิ่มเติม: https://docs.ultralytics.com/modes/predict
"""

import logging
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import cv2  # noqa: E402

from config.settings import settings  # noqa: E402
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

    logger.info("ไม่ได้ระบุไฟล์ภาพ - จะลองจับเฟรมจากกล้อง/วิดีโอใน .env")
    camera = CameraReader(settings.CAMERA_RTSP_URL or "0").start()
    try:
        for _ in range(20):
            frame = camera.get_latest_frame()
            if frame is not None:
                return frame
            time.sleep(0.2)
    finally:
        camera.stop()

    raise RuntimeError("จับเฟรมจากกล้องไม่สำเร็จ ลองระบุไฟล์ภาพแทน เช่น: example.py sample.jpg")


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


if __name__ == "__main__":
    main()
