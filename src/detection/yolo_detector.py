"""
ตัวตรวจจับคน (person) และจักรยาน (bicycle) ด้วย YOLO pre-trained model (yolo11n.pt)

ทั้ง person (class 0) และ bicycle (class 1) อยู่ใน COCO dataset ที่ yolo11n.pt ใช้อยู่แล้ว
ไม่ต้องเทรนโมเดลเพิ่ม

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

PERSON_CLASS_ID = 0
BICYCLE_CLASS_ID = 1


class YoloDetector:
    """โหลดโมเดล YOLO และตรวจจับคน+จักรยานในแต่ละเฟรม"""

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

    def detect(self, frame, imgsz: int = 640) -> list[dict]:
        """
        ตรวจจับ person + bicycle ในเฟรม คืนค่า list ของ dict:
            {"bbox": (x1, y1, x2, y2), "confidence": float, "class_name": str}
        """
        results = self.model.predict(
            frame,
            device=self.device,
            conf=self.conf_threshold,
            classes=[PERSON_CLASS_ID, BICYCLE_CLASS_ID],
            imgsz=imgsz,
            verbose=False,
        )

        detections = []
        for result in results:
            for box in result.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                confidence = float(box.conf[0])
                class_id = int(box.cls[0])
                class_name = "person" if class_id == PERSON_CLASS_ID else "bicycle"

                detections.append({
                    "bbox": (int(x1), int(y1), int(x2), int(y2)),
                    "confidence": confidence,
                    "class_name": class_name,
                })

        return detections

    def detect_persons(self, frame, imgsz: int = 640) -> list[dict]:
        """ตรวจจับเฉพาะ person (backward-compatible กับโค้ดเดิม)"""
        all_detections = self.detect(frame, imgsz)
        return [d for d in all_detections if d["class_name"] == "person"]
