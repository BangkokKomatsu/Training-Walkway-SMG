---
lab:
    title: '03 - YOLO Detection (Playground)'
    description: 'เรียนรู้การนำเฟรมภาพมาวิเคราะห์หาบุคคลด้วยโมเดล AI (YOLO) ผ่านคลาส YoloDetector'
---

# 03 - YOLO Detection (Playground)

ในบทเรียนนี้ คุณจะได้เรียนรู้วิธีการใช้งาน **YOLO (You Only Look Once)** ซึ่งเป็นโมเดล AI สำหรับตรวจจับวัตถุ (Object Detection) ที่มีความเร็วและแม่นยำสูง เราจะใช้คลาส `YoloDetector` เพื่อวิเคราะห์ภาพนิ่งหรือภาพจากกล้อง และดึงตำแหน่ง (Bounding Box) ของคนที่พบออกมา

ระยะเวลาที่ใช้: ประมาณ **15** นาที

## Prerequisites
- ได้ทำการตั้งค่าไฟล์ `.env` เรียบร้อยแล้ว (โดยเฉพาะ `YOLO_MODEL_PATH`, `DEVICE`, และ `CONF_THRESHOLD`)
- ติดตั้งไลบรารี Ultralytics (`pip install ultralytics`)

---

## 1. การเตรียมเฟรมภาพสำหรับทดสอบ

ก่อนที่เราจะตรวจจับคน เราต้องมีภาพให้ AI วิเคราะห์ ฟังก์ชัน `_get_test_frame()` จะรับหน้าที่เลือกว่าจะใช้ภาพจากไฟล์ที่ป้อนมา (Image Path) หรือดึงภาพ 1 เฟรมจากกล้องตัวแรกในระบบ

```python
def _get_test_frame(image_path: str | None):
    # กรณี 1: ผู้ใช้ระบุไฟล์ภาพมาให้
    if image_path:
        frame = cv2.imread(image_path)
        if frame is None:
            raise FileNotFoundError(f"เปิดไฟล์ภาพไม่ได้: {image_path}")
        return frame

    # กรณี 2: ไม่ได้ระบุไฟล์ภาพ จะไปดึงจากกล้องแทน
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

    raise RuntimeError("จับเฟรมจากกล้องไม่สำเร็จ")
```

**คำอธิบายโค้ด (Line-by-Line):**
- `if image_path:`: ตรวจสอบว่าผู้ใช้รันโปรแกรมพร้อมแนบพาทของไฟล์ภาพมาด้วยหรือไม่
- `cv2.imread(image_path)`: ใช้ OpenCV อ่านไฟล์ภาพจากดิสก์ แปลงเป็นข้อมูล Array ให้ AI ใช้วิเคราะห์
- `if frame is None:`: หากระบุชื่อไฟล์ผิด หรืออ่านไฟล์ไม่ได้ `cv2.imread` จะคืนค่า `None` เราจึงต้องจัดการ Error นี้
- หากไม่ได้ระบุภาพ จะเรียกใช้ `CameraReader(source).start()` เพื่อเปิดกล้อง (เหมือนบทเรียนที่ 02)
- ลูป `for _ in range(20):` รอสูงสุดประมาณ 4 วินาที (20 รอบ x 0.2 วินาที) เพื่อรอให้ `get_latest_frame()` ดึงภาพจากกล้องมาให้ได้ 1 ภาพ แล้ว Return กลับไปให้ YOLO

---

## 2. การสร้างออบเจกต์ YoloDetector

ในส่วนของ `main()` ระบบจะเริ่มสร้างตัวตรวจจับ (Detector) โดยดึงการตั้งค่ามาจากไฟล์ `.env`

```python
def main() -> None:
    image_path = sys.argv[1] if len(sys.argv) > 1 else None
    frame = _get_test_frame(image_path)

    detector = YoloDetector(
        model_path=settings.YOLO_MODEL_PATH,
        device=settings.DEVICE,
        conf_threshold=settings.CONF_THRESHOLD,
    )
```

**คำอธิบายโค้ด (Line-by-Line):**
- `sys.argv[1] if len(sys.argv) > 1 else None`: รับชื่อไฟล์ภาพจาก Argument หากไม่มีให้ส่งค่า `None` เพื่อไปเข้าเงื่อนไขดึงภาพจากกล้อง
- `YoloDetector(...)`: สร้างคลาสสำหรับโหลดโมเดล โดยรับพารามิเตอร์ดังนี้:
  - `model_path`: ตำแหน่งไฟล์ `.pt` ของ YOLO
  - `device`: เลือกว่าจะประมวลผลบน "cpu" หรือการ์ดจอ "cuda" หรือ "mps" (Mac)
  - `conf_threshold`: ระดับความแม่นยำขั้นต่ำ เช่น 0.5 หมายถึงต้องมั่นใจ 50% ขึ้นไปถึงจะยอมรับว่าเป็นคน

> **Note**: การสร้าง `YoloDetector` จะใช้เวลาสักพักในการโหลดโมเดลเข้า RAM หรือ VRAM ดังนั้นในระบบจริง เราจะสร้างคลาสนี้ไว้แค่ครั้งเดียวตอนเปิดระบบ

---

## 3. การประมวลผลและดึงผลลัพธ์ (Inference)

ส่งภาพ `frame` ไปให้ `detector` วิเคราะห์

```python
    detections = detector.detect_persons(frame)

    logger.info("พบคนทั้งหมด %d คน", len(detections))
    
    for i, det in enumerate(detections, start=1):
        logger.info("  %d. bbox=%s, confidence=%.2f", i, det["bbox"], det["confidence"])
```

**คำอธิบายโค้ด (Line-by-Line):**
- `detector.detect_persons(frame)`: เป็นฟังก์ชันที่เราเขียนครอบเอาไว้ใน `YoloDetector` เพื่อสั่งรัน AI และคัดกรองเฉพาะคลาส "คน" ออกมา คืนค่ามาเป็นลิสต์ของ Dictionary
- `len(detections)`: นับจำนวนคนทั้งหมดที่ถูกตรวจจับได้ในรูปนี้
- `for i, det in enumerate(detections, start=1):`: วนลูปแสดงรายละเอียดของคนทีละคน โดย `enumerate` จะสร้างตัวเลขลำดับ (`i`) เริ่มจาก 1
- `det["bbox"]`: ข้อมูลพิกัดกรอบสี่เหลี่ยม (Bounding Box) ที่คลุมตัวคน ในรูปแบบ `(x1, y1, x2, y2)`
- `det["confidence"]`: ความมั่นใจของ AI ต่อการตรวจจับนี้ มีค่าตั้งแต่ 0.0 ถึง 1.0

---

## การรันทดสอบ

1. เปิด Terminal
2. ลองรันคำสั่งโดย **ไม่ระบุภาพ** (ระบบจะดึงภาพ 1 เฟรมจากกล้องตัวแรกสุดมาทดสอบ):
```bash
python playground/03-yolo-detection/example.py
```
3. ลองรันคำสั่งโดย **ระบุภาพที่ต้องการ** (ถ้าคุณมีไฟล์ภาพจำลอง เช่น `test.jpg`):
```bash
python playground/03-yolo-detection/example.py test.jpg
```
4. ผลลัพธ์ที่คาดหวังใน Console:
```text
INFO | ไม่ได้ระบุไฟล์ภาพ - จะลองจับเฟรมจากกล้องตัวแรกใน cameras.json
INFO | เปิดกล้อง/วิดีโอจาก: 0
INFO | กำลังเชื่อมต่อกล้อง: 0
INFO | เชื่อมต่อกล้องสำเร็จ: 0
INFO | กำลังโหลดโมเดล YOLO: models/yolo11n.pt (device=cpu)
INFO | โหลดโมเดล YOLO สำเร็จ
INFO | พบคนทั้งหมด 2 คน
INFO |   1. bbox=(100, 50, 200, 300), confidence=0.89
INFO |   2. bbox=(400, 80, 480, 290), confidence=0.75
```
