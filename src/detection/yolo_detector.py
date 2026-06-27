"""
ตัวตรวจจับคน (person) ด้วย YOLO pre-trained model (yolo11n.pt)

ตามข้อล็อก §4.1 ของ CLAUDE.md: จับเฉพาะ class "person" (class id = 0 ใน COCO)

📖 อ่านเพิ่มเติม:
- YOLO11 Overview: https://docs.ultralytics.com/models/yolo11
- Predict Mode (bbox/conf ทำงานยังไง): https://docs.ultralytics.com/modes/predict
- Python Usage: https://docs.ultralytics.com/usage/python
- License AGPL-3.0 vs Enterprise: https://www.ultralytics.com/license
"""

import logging

import numpy as np
from ultralytics import YOLO

logger = logging.getLogger(__name__)

PERSON_CLASS_ID = 0  # class "person" ใน COCO dataset (yolo11n.pt ใช้ COCO classes)


class YoloDetector:
    """โหลดโมเดล YOLO และตรวจจับคนในแต่ละเฟรม"""

    def __init__(self, model_path: str, device: str = "cpu", conf_threshold: float = 0.5):
        self.device = device
        self.conf_threshold = conf_threshold

        logger.info("กำลังโหลดโมเดล YOLO: %s (device=%s)", model_path, device)
        self.model = YOLO(model_path)
        self.model.to(device)
        self._warmup()
        logger.info("โหลดโมเดล YOLO สำเร็จ")

    def _warmup(self) -> None:
        """รัน inference รอบแรกด้วยภาพเปล่า เพื่อให้รอบจริงเร็วขึ้น"""
        dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        self.model.predict(dummy_frame, device=self.device, verbose=False)

    def detect_persons(self, frame, imgsz: int = 640) -> list[dict]:
        """
        ตรวจจับคนในเฟรม คืนค่า list ของ dict:
            {"bbox": (x1, y1, x2, y2), "confidence": float}
        กรองเฉพาะ class person และ confidence >= conf_threshold
        """
        results = self.model.predict(
            frame,
            device=self.device,
            conf=self.conf_threshold,
            classes=[PERSON_CLASS_ID],
            imgsz=imgsz,
            verbose=False,
        )

        detections = []
        for result in results:
            for box in result.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                confidence = float(box.conf[0])
                detections.append({
                    "bbox": (int(x1), int(y1), int(x2), int(y2)),
                    "confidence": confidence,
                })

        return detections
