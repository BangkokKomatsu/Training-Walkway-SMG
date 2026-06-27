"""
02 - OpenCV Camera
สาธิต: เปิดกล้อง/วิดีโอด้วย CameraReader (อ่านเฟรมในเทรดแยก + reconnect อัตโนมัติ)

รัน: python playground/02-opencv-camera/example.py
ตั้งค่าแหล่งวิดีโอที่ใช้ทดสอบใน .env -> CAMERA_RTSP_URL
  - ใส่ "0" เพื่อเปิด webcam เครื่อง (ถ้ามี)
  - หรือใส่ path ไฟล์วิดีโอ เช่น assets/sample-images/sample.mp4

ห้ามใช้ cv2.imshow() - สคริปต์นี้แค่ print ขนาดเฟรมที่อ่านได้
"""

import logging
import sys
import time
from pathlib import Path

# เพิ่ม root โปรเจกต์เข้า sys.path เพื่อ import config/ และ src/ ได้ (ดู docs/course-modules/03)
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from config.settings import settings  # noqa: E402
from src.camera.camera_reader import CameraReader  # noqa: E402

# Windows console ใช้ cp1252 เป็น default ทำให้ print/log ภาษาไทยพัง -> บังคับเป็น UTF-8
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    source = settings.CAMERA_RTSP_URL or "0"
    logger.info("เปิดกล้อง/วิดีโอจาก: %s", source)

    camera = CameraReader(source).start()

    try:
        for i in range(10):
            frame = camera.get_latest_frame()
            if frame is None:
                logger.info("ยังไม่มีเฟรม กำลังรอ...")
            else:
                logger.info("เฟรมที่ %d: ขนาด %s", i + 1, frame.shape)
            time.sleep(0.5)
    finally:
        camera.stop()


if __name__ == "__main__":
    main()
