"""
04 - Area Detection
สาธิต: เช็ค point-in-area (polygon พื้นที่อันตราย) + จับเวลา dwell (DWELL_SECONDS)

รัน: python playground/04-area-detection/example.py

จำลองคน 1 คนเดินเข้าไปกลางพื้นที่อันตรายแล้วเดินออก ดูว่า dwell timer / event
ทำงานตามกติกา 4 ขั้น (§D ของ 00_MASTER_CONTEXT.md) ถูกต้องหรือไม่
"""

import logging
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.camera.camera_config import load_camera_configs  # noqa: E402
from src.detection.area_checker import AreaChecker  # noqa: E402
from src.detection.detection_service import CameraEventTracker  # noqa: E402

# Windows console ใช้ cp1252 เป็น default ทำให้ print/log ภาษาไทยพัง -> บังคับเป็น UTF-8
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    cameras = load_camera_configs()
    polygon = cameras[0].danger_zones[0] if cameras and cameras[0].danger_zones else [
        (100, 100), (540, 100), (540, 380), (100, 380)
    ]
    area_checker = AreaChecker([polygon])
    logger.info("พื้นที่อันตราย (polygon): %s", polygon)

    # ใช้ dwell/cooldown สั้น ๆ เพื่อให้ทดสอบเร็ว (ของจริงใช้ค่าจาก .env)
    tracker = CameraEventTracker(dwell_seconds=2, cooldown_seconds=5)

    # จุดอ้างอิงคนจำลอง: กลางพื้นที่อันตราย และจุดนอกพื้นที่
    center_x = (min(p[0] for p in polygon) + max(p[0] for p in polygon)) // 2
    center_y = (min(p[1] for p in polygon) + max(p[1] for p in polygon)) // 2
    inside_point = (center_x, center_y)
    outside_point = (min(p[0] for p in polygon) - 50, min(p[1] for p in polygon) - 50)

    steps = [
        (inside_point, 3.5),   # เดินเข้าไปอยู่ในพื้นที่ 3.5 วิ (> dwell 2 วิ -> ควร trigger)
        (outside_point, 1.0),  # เดินออกนอกพื้นที่ -> reset ตัวจับเวลา
    ]

    for point, duration in steps:
        in_zone = area_checker.is_in_danger_zone(point)
        logger.info("จุด %s -> in_danger_zone=%s (จำลองอยู่ %.1f วิ)", point, in_zone, duration)

        start = time.monotonic()
        while time.monotonic() - start < duration:
            if tracker.update(in_zone):
                logger.warning(
                    "EVENT TRIGGERED! คนอยู่ในพื้นที่อันตรายต่อเนื่องเกิน %d วินาที",
                    tracker.dwell_seconds,
                )
            time.sleep(0.2)


if __name__ == "__main__":
    main()
