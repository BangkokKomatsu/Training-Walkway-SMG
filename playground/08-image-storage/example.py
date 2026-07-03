"""
playground/08-image-storage/example.py
ตัวอย่าง: เซฟรูป detection ด้วยฟังก์ชันจริงของระบบ save_detection_image()
ดูโค้ดต้นฉบับที่ src/storage/image_storage.py

รันจากโฟลเดอร์ root ของโปรเจกต์:
    python playground/08-image-storage/example.py

หมายเหตุ:
    - ถ้าตั้งค่า IMAGE_SHARED_DRIVE ไว้ใน .env แล้ว สคริปต์นี้จะเซฟรูปไปที่นั่นจริง ๆ
    - ถ้ายังไม่ได้ตั้งค่า จะ fallback มาใช้โฟลเดอร์ทดสอบในเครื่อง
      playground/08-image-storage/test-shared-drive/ แทน (ไม่ต้องมี shared drive จริงก็รันได้)
    - pip install opencv-python numpy python-dotenv

อ้างอิง: docs/course-modules/08-image-storage-shared-drive.md
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

# Windows console ใช้ cp1252 เป็น default ทำให้ print/log ภาษาไทยพัง -> บังคับเป็น UTF-8
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# ต้องตั้งค่า env var นี้ "ก่อน" import config.settings เพราะ settings ถูกโหลดค่าตอน import ครั้งแรกเท่านั้น
# os.environ.setdefault = ตั้งค่าเฉพาะตอนที่ยังไม่มีค่านี้อยู่ (ถ้า .env ตั้ง IMAGE_SHARED_DRIVE ไว้แล้ว จะไม่ทับ)
_TEST_DRIVE = os.path.join(os.path.dirname(__file__), "test-shared-drive")
os.environ.setdefault("IMAGE_SHARED_DRIVE", _TEST_DRIVE)

import cv2  # noqa: E402
import numpy as np  # noqa: E402

from config.settings import settings  # noqa: E402
from src.storage.image_storage import save_detection_image  # noqa: E402


def _make_dummy_frame() -> np.ndarray:
    """สร้างภาพจำลอง (พื้นสี + ข้อความ) แทนภาพจริงจากกล้อง เพื่อไม่ต้องพึ่งกล้องจริง"""
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    frame[:] = (255, 100, 0)  # BGR = สีส้มอมฟ้า
    cv2.putText(
        frame, "TEST DETECTION", (50, 240),
        cv2.FONT_HERSHEY_SIMPLEX, 1.3, (255, 255, 255), 3,
    )
    return frame


def main() -> None:
    print("=" * 60)
    print("Playground 08: Image Storage (save_detection_image)")
    print("=" * 60)
    print(f"IMAGE_SHARED_DRIVE = {settings.IMAGE_SHARED_DRIVE}")
    print()

    frame = _make_dummy_frame()

    # เรียกฟังก์ชันจริงของระบบตรง ๆ - เหมือนที่ src/detection/detection_service.py เรียกใช้ตอนเกิด event จริง
    image_path, image_name = save_detection_image(frame, company_code="DEMO", camera_no="CAM-PLAYGROUND")

    if not image_path:
        print("❌ บันทึกล้มเหลว — ดู log ข้อความ error ด้านบน")
        return

    print("บันทึกสำเร็จ!")
    print(f"  image_path (เก็บใน DB ให้ Python/Backend อ้างอิงไฟล์) = {image_path}")
    print(f"  image_name (เก็บใน DB ให้ frontend ขอรูปผ่าน API)     = {image_name}")

    # อ่านค่ากลับมายืนยันว่าไฟล์ถูกเขียนจริง (ไม่ใช่แค่คำนวณ path เฉย ๆ)
    print()
    print("ตรวจสอบไฟล์ที่เซฟไว้:")
    print(f"  os.path.exists(image_path) = {os.path.exists(image_path)}")
    print(f"  ขนาดไฟล์ = {os.path.getsize(image_path):,} bytes")

    reloaded = cv2.imread(image_path)
    if reloaded is not None:
        print(f"  cv2.imread() อ่านกลับมาได้ ขนาดภาพ = {reloaded.shape}")
    else:
        print("  ⚠️ cv2.imread() อ่านกลับมาไม่ได้ - ไฟล์อาจเสีย")


if __name__ == "__main__":
    main()
