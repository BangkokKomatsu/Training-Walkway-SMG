"""
02 - OpenCV Camera
สาธิต: เปิดกล้อง/วิดีโอด้วย CameraReader (อ่านเฟรมในเทรดแยก + reconnect อัตโนมัติ)

รัน: python playground/02-opencv-camera/example.py [rtsp://... | path/to/video.mp4 | 0]
  - ถ้าไม่ระบุ argument จะใช้กล้องตัวแรกจาก Config (JSON หรือ MSSQL ตาม .env)
  - ใส่ "0" เพื่อเปิด webcam เครื่อง (ถ้ามี)

หมายเหตุ: cv2.imshow() ใช้ได้ปกติใน playground/ (ดู CLAUDE.md ข้อ 5) — สคริปต์นี้เลือกแค่ print
ขนาดเฟรมที่อ่านได้ผ่าน log เพื่อให้ผลลัพธ์อ่านง่าย แต่ถ้าอยากเห็นภาพจริงบนหน้าจอ
ก็เปิดคอมเมนต์ cv2.imshow() ในฟังก์ชัน demo_bare_videocapture() ด้านล่างได้เลย
(cv2.imshow() ห้ามใช้เฉพาะตอน deploy บน server ที่ไม่มีจอ/headless เท่านั้น)
"""

import logging
import sys
import time
from pathlib import Path

import cv2  # noqa: E402

# เพิ่ม root โปรเจกต์เข้า sys.path เพื่อ import config/ และ src/ ได้ (ดู docs/course-modules/03)
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.camera.camera_config import load_camera_configs  # noqa: E402
from src.camera.camera_reader import CameraReader  # noqa: E402

# Windows console ใช้ cp1252 เป็น default ทำให้ print/log ภาษาไทยพัง -> บังคับเป็น UTF-8
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)


def demo_bare_videocapture(source) -> None:
    """
    ขั้นเบื้องต้นที่สุด: เปิดกล้องด้วย cv2.VideoCapture ตรง ๆ (ยังไม่มี Thread แยก, ยังไม่มี auto-reconnect)
    ดูตรงนี้ก่อนว่า OpenCV อ่านเฟรมพื้นฐานยังไง ก่อนไปดูคลาส CameraReader ที่ครอบไว้ให้ใช้งานง่ายขึ้น (ด้านล่าง)
    """
    logger.info("=== เปิดกล้องแบบ raw ด้วย cv2.VideoCapture (ไม่มี auto-reconnect) ===")

    cap = cv2.VideoCapture(source)
    # ลด buffer เหลือ 1 เฟรม ป้องกันภาพหน่วง (ไม่งั้นเฟรมเก่าจะค้างอยู่ใน buffer แล้วเราอ่านช้ากว่าความเป็นจริง)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    if not cap.isOpened():
        logger.warning("เปิดกล้องแบบ raw ไม่สำเร็จ: %s", source)
        return

    for i in range(5):
        ok, frame = cap.read()
        if not ok:
            logger.warning("[raw] อ่านเฟรมที่ %d ไม่สำเร็จ", i + 1)
            continue
        logger.info("[raw] เฟรมที่ %d: ขนาด %s", i + 1, frame.shape)

        # cv2.imshow() ใช้ได้ปกติใน playground/ — เปิดคอมเมนต์ 2 บรรทัดด้านล่างถ้าอยากเห็นภาพจริงบนหน้าจอ
        # (กด 'q' ค้างไว้ในหน้าต่างวิดีโอเพื่อออกก่อนครบ 5 เฟรม)
        # cv2.imshow("raw capture", frame)
        # if cv2.waitKey(1) & 0xFF == ord("q"):
        #     break

    cap.release()
    # cv2.destroyAllWindows()  # เปิดคอมเมนต์นี้คู่กับ cv2.imshow() ด้านบนเสมอ
    logger.info("ปิดกล้องแบบ raw แล้ว")


def main() -> None:
    if len(sys.argv) > 1:
        source = sys.argv[1]
    else:
        cameras = load_camera_configs()
        source = cameras[0].source if cameras else "0"
    logger.info("เปิดกล้อง/วิดีโอจาก: %s", source)

    # ขั้นที่ 1: ดูวิธีอ่านเฟรมแบบพื้นฐานที่สุดก่อน (ไม่มี Thread แยก ไม่มี reconnect)
    demo_bare_videocapture(source)

    # ขั้นที่ 2: ของจริงที่ระบบใช้ - CameraReader อ่านเฟรมใน Thread แยก + auto-reconnect
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
