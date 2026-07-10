# Module 05 — YOLO ตรวจจับคน

> **ระดับ:** มือใหม่-กลาง | **เวลาโดยประมาณ:** 60–90 นาที

---

## ส่วนที่ 1 — วัตถุประสงค์

เมื่อจบ module นี้ ผู้เรียนจะสามารถ:

- อธิบาย YOLO คืออะไรและทำงานยังไงในระดับเบื้องต้น
- โหลดโมเดล YOLO pre-trained (`yolo11n.pt`) และรัน inference ได้
- กรองเฉพาะ class `person` (class id = 0) และ `bicycle` (class id = 1)
- เข้าใจ `bbox` (bounding box) และ `confidence`
- ปรับ confidence threshold เพื่อกรองการตรวจจับ
- เข้าใจ license AGPL-3.0 ของ Ultralytics เบื้องต้น

---

## ส่วนที่ 2 — สิ่งที่ต้องเตรียม

- ผ่าน Module 01–04
- `pip install ultralytics` แล้ว (อยู่ใน `requirements.txt`)
- ดาวน์โหลด `yolo11n.pt`: จะดาวน์โหลดอัตโนมัติครั้งแรกที่ใช้ หรือดาวน์โหลดเองจาก [docs.ultralytics.com/models](https://docs.ultralytics.com/models) วางไว้ที่ `Models/yolo11n.pt`
- รูปภาพหรือวิดีโอสำหรับทดสอบ

---

## ส่วนที่ 3 — คำอธิบายเข้าใจง่าย

### YOLO คืออะไร?

**YOLO (You Only Look Once)** คือ AI model สำหรับตรวจจับวัตถุในภาพ แบบ real-time ชื่อ "Look Once" หมายถึงโมเดลสแกนภาพทั้งหมดในครั้งเดียว (ไม่ใช่สแกนทีละส่วน) จึงเร็วมาก

```text
ภาพ (frame)
    ↓
YOLO model
    ↓
รายการวัตถุที่พบ:
  - person  at (100,50,300,400) confidence=0.87
  - person  at (450,80,600,420) confidence=0.92
  - chair   at (200,300,350,480) confidence=0.78
```
### Pre-trained Model คืออะไร?

โมเดลที่ถูก train มาแล้วบน dataset ขนาดใหญ่ (COCO dataset — 80 classes) โดยทีม Ultralytics เราเพียงแค่ **ดาวน์โหลดมาใช้เลย** ไม่ต้อง train ใหม่

80 classes ใน COCO dataset มี: person, car, bicycle, motorcycle, bus, truck, cat, dog, chair, table และอีกมาก

### Bounding Box (bbox) คืออะไร?

กล่องสี่เหลี่ยมที่ล้อมวัตถุที่พบในภาพ กำหนดด้วยพิกัด:
```text
(x1, y1, x2, y2) — พิกเซลในภาพ
x1, y1 = มุมบนซ้าย
x2, y2 = มุมล่างขวา
```
### Confidence คืออะไร?

ค่าความมั่นใจของโมเดล (0.0 – 1.0) ว่าสิ่งที่เห็นคือวัตถุนั้นจริง

```text
confidence = 0.95 → มั่นใจมาก (95%)
confidence = 0.51 → มั่นใจพอดี threshold
confidence = 0.30 → ไม่แน่ใจ → กรองทิ้ง
```
ตั้ง `CONF_THRESHOLD=0.5` ใน `.env` หมายความว่า รับเฉพาะ detection ที่มั่นใจ ≥ 50%

### YOLO Nano (`yolo11n`) คืออะไร?

Ultralytics ออกแบบโมเดลหลายขนาด:

| รุ่น | พารามิเตอร์ (ล้าน) | ขนาดไฟล์ .pt | ความเร็ว (CPU) | ความแม่นยำ |
|------|--------------------|--------------|----------------|-----------|
| yolo11n | ~2.6 M | ~5.4 MB | เร็วมาก | ปานกลาง |
| yolo11s | ~9.4 M | ~19 MB | เร็ว | ดี |
| yolo11m | ~20 M | ~40 MB | ปานกลาง | ดีมาก |
| yolo11l | ~25 M | ~51 MB | ช้า | สูง |
| yolo11x | ~57 M | ~114 MB | ช้ามาก | สูงสุด |

> **หมายเหตุ:** ตัวเลขคอลัมน์ "พารามิเตอร์ (ล้าน)" คือ *จำนวนพารามิเตอร์ของโมเดล* **ไม่ใช่ขนาดไฟล์** — อย่าสับสน `2.6M params` กับ `2.6 MB` ไฟล์ `yolo11n.pt` จริงมีขนาด ~5.4 MB

สำหรับ CPU และ real-time เลือก **nano (n)** ก่อน ถ้าความแม่นยำไม่พอค่อยเพิ่มเป็น small (s)

📖 อ่านเพิ่มเติม:
- [YOLO11 Overview](https://docs.ultralytics.com/models/yolo11)
- [เปรียบเทียบ performance metrics](https://docs.ultralytics.com/models/yolo11#performance-metrics)
- [Model List ทั้งหมด](https://docs.ultralytics.com/models)

### License AGPL-3.0

Ultralytics YOLO ใช้ license **AGPL-3.0** ซึ่งหมายความว่า:
- ใช้ฟรีในโปรเจกต์ **open source** (ต้อง open source โค้ดทั้งหมด)
- ถ้าใช้ใน **ผลิตภัณฑ์เชิงพาณิชย์** ต้องซื้อ Enterprise License

สำหรับ **internal use ภายในองค์กร** ที่ไม่ขายเป็นผลิตภัณฑ์ส่วนใหญ่ใช้ได้ แต่ควรตรวจสอบกับ legal ของบริษัทก่อน

📖 ดูรายละเอียด: [Ultralytics License](https://www.ultralytics.com/license)

---

## ส่วนที่ 4 — Flow การทำงาน

```text
โหลดโมเดล YOLO (ครั้งเดียวตอนเริ่ม)
        ↓
รับ frame จาก CameraReader
        ↓
model.predict(frame, conf=0.5, classes=[0, 1])   ← [0] = person, [1] = bicycle
        ↓
ได้ results: list ของ bounding box + confidence
        ↓
แปลงเป็น list[dict]:
    [{"bbox": (x1, y1, x2, y2), "confidence": 0.87}, ...]
        ↓
ส่งต่อไป AreaChecker (Module 06)
```
---

## ส่วนที่ 5 — ตัวอย่าง Code

ดูไฟล์จริงที่ [src/detection/yolo_detector.py](../../src/detection/yolo_detector.py)

📖 อ้างอิง:
- [Python Usage](https://docs.ultralytics.com/usage/python)
- [Predict Mode](https://docs.ultralytics.com/modes/predict)
- [Object Detection Task](https://docs.ultralytics.com/tasks/detect)

### 5.1 ทดสอบเบื้องต้น (playground)

```python
from ultralytics import YOLO
import cv2

# โหลดโมเดล (ดาวน์โหลดอัตโนมัติถ้าไม่มี)
model = YOLO("Models/yolo11n.pt")

# โหลดภาพทดสอบ
frame = cv2.imread("test_image.jpg")

# ตรวจจับวัตถุทุก class
results = model.predict(frame, conf=0.5, verbose=False)

for result in results:
    for box in result.boxes:
        class_id = int(box.cls[0])        # class number
        class_name = result.names[class_id]  # ชื่อ class เช่น "person"
        confidence = float(box.conf[0])
        x1, y1, x2, y2 = box.xyxy[0].tolist()

        print(f"{class_name}: conf={confidence:.2f} bbox=({int(x1)},{int(y1)},{int(x2)},{int(y2)})")
```
### 5.2 `YoloDetector` — Production Class

นี่คือโค้ดจริงใน [src/detection/yolo_detector.py](../../src/detection/yolo_detector.py):

```python
import logging
import numpy as np
from ultralytics import YOLO

logger = logging.getLogger(__name__)

PERSON_CLASS_ID = 0   # class "person" ใน COCO (index 0)
BICYCLE_CLASS_ID = 1  # class "bicycle"

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
        """รัน inference รอบแรกด้วยภาพเปล่า เพื่อให้รอบต่อไปเร็วขึ้น"""
        dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        self.model.predict(dummy_frame, device=self.device, verbose=False)

    def detect(self, frame, imgsz: int = 640) -> list[dict]:
        """
        ตรวจจับคนและจักรยานในเฟรม
        คืน: [{"bbox": (x1, y1, x2, y2), "confidence": float, "class_name": str}, ...]
        """
        results = self.model.predict(
            frame,
            device=self.device,
            conf=self.conf_threshold,
            classes=[PERSON_CLASS_ID, BICYCLE_CLASS_ID],  # จับ person และ bicycle
            imgsz=imgsz,
            verbose=False,              # ปิด output ดิบ
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
```
> **ทำไมต้องจับ `bicycle` ด้วย?** เราไม่ได้เอา bicycle มาเช็ค dwell เหมือน person — แต่ใช้เป็นเงื่อนไข "ยกเว้น" คนที่ยืนใกล้จักรยาน (เช่น กำลังขี่จักรยานผ่านพื้นที่) ไม่ให้นับเป็นการบุกรุก รายละเอียดกติกานี้อยู่ใน **Module 06** (ฟังก์ชัน `_get_unsafe_person` ใน `detection_service.py`)

**`detect()` vs `detect_persons()`:** โค้ดจริงมี 2 method — `detect(frame)` คืน **person + bicycle**, ส่วน `detect_persons(frame)` เป็น wrapper ที่กรองผลเหลือ **เฉพาะ person** (backward-compatible กับโค้ดเดิม) เวลาต้องการแค่คนก็เรียก `detect_persons()` ได้ (จะเห็นใช้ในตัวอย่างส่วนที่ 8)

### 5.3 วิธีใช้ใน detection loop

```python
from config.settings import settings
from src.detection.yolo_detector import YoloDetector

# สร้าง detector ครั้งเดียวตอนเริ่ม (โหลดโมเดลหนักมาก)
detector = YoloDetector(
    model_path=settings.YOLO_MODEL_PATH,
    device=settings.DEVICE,
    conf_threshold=settings.CONF_THRESHOLD,
)

# loop การตรวจจับ
while True:
    frame = camera.get_latest_frame()
    if frame is None:
        continue

    detections = detector.detect(frame)
    print(f"พบวัตถุ {len(detections)} ชิ้น")

    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        conf = det["confidence"]
        cls_name = det["class_name"]
        print(f"  - {cls_name}: bbox=({x1},{y1},{x2},{y2}) confidence={conf:.1%}")
```
### 5.4 วาด bounding box บน frame (สำหรับบันทึกหลักฐาน)

```python
import cv2

def draw_detections(frame, detections: list[dict]):
    """วาด bounding box ของทุก detection ลงบน frame"""
    for det in detections:
        x1, y1, x2, y2 = det["bbox"]
        conf = det["confidence"]
        cls_name = det["class_name"]
        label = f"{cls_name} {conf:.0%}"

        # วาดกล่อง (สีเขียว)
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

        # เขียน label
        cv2.putText(
            frame, label,
            (x1, y1 - 5),          # ตำแหน่งเหนือกล่อง
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6, (0, 255, 0), 2
        )
    return frame


# ใช้งาน: บันทึกเป็น jpg (ไม่ใช้ imshow)
annotated = draw_detections(frame.copy(), detections)
cv2.imwrite("detection_result.jpg", annotated)
```
### 5.5 ทดสอบกับ GPU

ถ้าเครื่องมี NVIDIA GPU:
```dotenv
# ใน .env
DEVICE=cuda
```
ตรวจสอบ CUDA:
```python
import torch
print(torch.cuda.is_available())   # True ถ้ามี GPU พร้อมใช้
print(torch.cuda.get_device_name(0))  # ชื่อ GPU
```
> ไม่มี GPU ก็ใช้ `DEVICE=cpu` ได้ แค่ช้ากว่า ดูวิธีเพิ่มความเร็วใน Module 12

---

## ส่วนที่ 6 — แบบฝึกหัด

1. **โหลดโมเดลและทดสอบ:** รัน `playground/03-yolo-detection/example.py` กับรูปที่มีคนอยู่
2. **ปรับ conf threshold:** ลองเปลี่ยน `CONF_THRESHOLD=0.3` vs `0.7` แล้วสังเกตผลต่าง
3. **นับคน:** เขียนโค้ดนับจำนวนคนที่พบในแต่ละเฟรมและ print ออกมา
4. **บันทึกภาพ:** วาด bbox บน frame แล้วบันทึกเป็น jpg
5. **ทดสอบ warmup:** เปรียบเทียบเวลา inference เฟรมแรกกับเฟรมที่สอง (มีความต่างหลัง warmup)

---

## ส่วนที่ 7 — Checklist หลังเรียน

- [ ] ดาวน์โหลด `yolo11n.pt` และวางที่ `Models/` แล้ว
- [ ] รัน inference บน frame ได้ ได้ผลลัพธ์เป็น list detections
- [ ] เข้าใจว่า class id 0 = person ใน COCO
- [ ] รู้ว่า bbox คือ (x1, y1, x2, y2) พิกเซลในภาพ
- [ ] ปรับ `CONF_THRESHOLD` ได้และเข้าใจผลกระทบ
- [ ] รู้ว่า warmup คืออะไรและทำไมต้องทำ
- [ ] อธิบาย license AGPL ได้คร่าว ๆ

---

## ส่วนที่ 8 — Common Error + วิธีแก้

### Error: `FileNotFoundError: Models/yolo11n.pt`

**วิธีแก้ 1 — ให้ดาวน์โหลดอัตโนมัติ:**
```python
# ถ้า path ไม่มีอยู่ ultralytics จะดาวน์โหลดให้อัตโนมัติ
# แต่ต้องใช้ชื่อที่ถูกต้อง
model = YOLO("yolo11n.pt")   # ดาวน์โหลดไป cache (~/.ultralytics/)
```
**วิธีแก้ 2 — ดาวน์โหลดเอง:**
ดาวน์โหลดจาก [docs.ultralytics.com/models](https://docs.ultralytics.com/models) แล้ววางที่ `Models/yolo11n.pt`
สร้างโฟลเดอร์ก่อน:
```bash
mkdir Models
```
---

### Error: `RuntimeError: CUDA out of memory`

**สาเหตุ:** VRAM ไม่พอ

**วิธีแก้:**
```dotenv
# ใน .env เปลี่ยนเป็น CPU
DEVICE=cpu
```
หรือลด `imgsz`:
```python
detections = detector.detect_persons(frame, imgsz=320)  # ลดจาก 640
```
---

### ตรวจจับไม่เจอคนทั้งที่มีในภาพ

**สาเหตุ:** `CONF_THRESHOLD` สูงเกิน หรือ `imgsz` ต่ำเกิน (คนอยู่ไกลมาก)

**วิธีแก้:**
```dotenv
# ลด threshold ลง
CONF_THRESHOLD=0.3
```
หรือเพิ่ม `imgsz`:
```python
detections = detector.detect_persons(frame, imgsz=1280)
```
---

### ตรวจจับเจอมากเกินไป (false positive)

**สาเหตุ:** `CONF_THRESHOLD` ต่ำเกิน

```dotenv
# เพิ่ม threshold
CONF_THRESHOLD=0.6
```
---

### ช้ามาก (>500ms ต่อเฟรม บน CPU)

ดูวิธีปรับ performance ใน Module 12:
- ลด `imgsz` เป็น 320 หรือ 416
- ใช้ `imgsz` ตาม aspect ratio ของกล้อง
- กรอง frame ที่ไม่จำเป็นออก

---

## ส่วนที่ 9 — ควร commit อะไร

```text
✅ commit:
├── src/detection/yolo_detector.py
├── src/detection/__init__.py
└── playground/03-yolo-detection/example.py
```
---

## ส่วนที่ 10 — ไม่ควร commit อะไร

```text
❌ ห้าม commit:
├── Models/yolo11n.pt     (~5.4 MB, ดาวน์โหลดเองได้)
├── Models/*.pt           (โมเดลทุกชนิด)
├── *.jpg, *.png          (รูปทดสอบที่มีข้อมูลจริง)
└── runs/                 (Ultralytics บันทึก result ที่นี่อัตโนมัติ)
```
> **เพิ่มใน `.gitignore`:**
> ```
> Models/
> runs/
> ```

---

### ลิงก์อ้างอิงสำหรับอ่านเพิ่มเติม

| หัวข้อ | ลิงก์ |
|--------|-------|
| Ultralytics Docs (หน้าหลัก) | <https://docs.ultralytics.com> |
| YOLO11 Overview | <https://docs.ultralytics.com/models/yolo11> |
| Quickstart | <https://docs.ultralytics.com/quickstart> |
| Python Usage | <https://docs.ultralytics.com/usage/python> |
| Predict Mode | <https://docs.ultralytics.com/modes/predict> |
| Object Detection Task | <https://docs.ultralytics.com/tasks/detect> |
| Download Models | <https://docs.ultralytics.com/models> |
| License AGPL-3.0 vs Enterprise | <https://www.ultralytics.com/license> |
| GitHub Ultralytics | <https://github.com/ultralytics/ultralytics> |
| YOLO26 (รุ่นล่าสุด) | <https://docs.ultralytics.com/models/yolo26> |
