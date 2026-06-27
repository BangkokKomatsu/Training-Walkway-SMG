"""
01 - Python Basic
สาธิต: variable, type, list/dict, if/else, loop, function, class,
       import ข้ามไฟล์, try/except, logging

รัน: python playground/01-python-basic/example.py
"""

import logging
import sys

from helpers_example import Counter, greet  # import ข้ามไฟล์ (โฟลเดอร์เดียวกัน)

# Windows console ใช้ cp1252 เป็น default ทำให้ print/log ภาษาไทยพัง -> บังคับเป็น UTF-8
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    # ---- variable & type ----
    camera_no = 1                # int
    camera_name = "Camera-1"      # str
    confidence = 0.87             # float

    logger.info("camera_no=%s (type=%s)", camera_no, type(camera_no).__name__)
    logger.info("confidence=%s (type=%s)", confidence, type(confidence).__name__)

    # ---- list / dict ----
    detected_classes = ["person", "person", "forklift"]
    detection_summary = {"person": 0, "forklift": 0}

    for cls in detected_classes:
        detection_summary[cls] += 1

    logger.info("สรุปจำนวนที่ตรวจจับได้: %s", detection_summary)

    # ---- if / else ----
    if detection_summary["person"] > 0:
        logger.info("พบคนในภาพ %d คน", detection_summary["person"])
    else:
        logger.info("ไม่พบคนในภาพ")

    # ---- function ----
    print(greet(camera_name))

    # ---- class (import ข้ามไฟล์จาก helpers_example.py) ----
    counter = Counter()
    for _ in detected_classes:
        counter.increment()
    logger.info("Counter นับได้ %d ครั้ง", counter.count)

    # ---- try / except ----
    raw_values = ["0.5", "0.9", "not_a_number"]
    valid_confidences = []
    for raw in raw_values:
        try:
            valid_confidences.append(float(raw))
        except ValueError:
            logger.warning("ค่า '%s' ไม่ใช่ตัวเลข - ข้ามไป", raw)

    logger.info("ค่า confidence ที่ใช้ได้: %s", valid_confidences)


if __name__ == "__main__":
    main()
