# Module 12 — CPU/GPU Performance Tuning

> **ระดับ:** กลาง-สูง | **เวลาโดยประมาณ:** 60–90 นาที

---

## ส่วนที่ 1 — วัตถุประสงค์

เมื่อจบ module นี้ ผู้เรียนจะสามารถ:

- อธิบายความแตกต่างระหว่าง CPU และ GPU สำหรับ AI inference
- ระบุจุดที่ทำให้ระบบช้าและแก้ได้
- ปรับพารามิเตอร์ต่าง ๆ เพื่อให้ระบบลื่นขึ้นบน CPU
- เข้าใจ trade-off ของแต่ละวิธีปรับ
- เลือกโมเดล YOLO ที่เหมาะกับ hardware

---

## ส่วนที่ 2 — สิ่งที่ต้องเตรียม

- ผ่าน Module 01–11
- ระบบรัน Python detection ได้แล้ว
- เข้าใจ `CONF_THRESHOLD`, `DWELL_SECONDS`, `ALERT_COOLDOWN_SECONDS` แล้ว

---

## ส่วนที่ 3 — คำอธิบายเข้าใจง่าย

### GPU vs CPU สำหรับ AI

| | GPU | CPU |
|--|-----|-----|
| ความเร็ว inference | 5–50 ms/frame | 100–500 ms/frame |
| Real-time (30 FPS) | ✅ ทำได้สบาย | ⚠️ ต้องปรับ |
| ราคา | สูง | ถูก (มาในเครื่องแล้ว) |
| เหมาะกับ | production สูง | ทดสอบ, กล้องน้อย |
| ตั้งค่า | `DEVICE=cuda` | `DEVICE=cpu` |

**สรุป:** GPU เหมาะ real-time กล้องเยอะ — CPU ใช้ได้แต่ต้องปรับ

### YOLO Model Size

📖 อ่านเพิ่มเติม:
- [เปรียบเทียบ Model Size](https://docs.ultralytics.com/models/yolo11#performance-metrics)
- [Predict Mode config](https://docs.ultralytics.com/modes/predict)

| Model | ขนาด | Speed CPU | mAP50 |
|-------|------|-----------|-------|
| yolo11n | 2.6 MB | เร็วสุด | 39.5 |
| yolo11s | 9.4 MB | เร็ว | 47.0 |
| yolo11m | 20 MB | ปานกลาง | 51.5 |
| yolo11l | 25 MB | ช้า | 53.4 |
| yolo11x | 56 MB | ช้ามาก | 54.7 |

**แนะนำ:** เริ่มที่ `yolo11n` (nano) ก่อน ถ้าพลาด (miss detection) มากค่อยเพิ่มเป็น `yolo11s`

---

## ส่วนที่ 4 — Flow การปรับ Performance

```text
วัด baseline: ใช้เวลา inference เท่าไรต่อเฟรม?
        ↓
เลือกวิธีปรับตาม hardware:
    ├── GPU: ตั้ง DEVICE=cuda → ได้เร็วทันที
    └── CPU: ปรับ 7 วิธีด้านล่าง
        ↓
วัดซ้ำ เปรียบเทียบ
        ↓
ตรวจสอบว่า detection ยังถูกต้อง (ไม่พลาดมากเกิน)
```
---

## ส่วนที่ 5 — ตัวอย่าง Code + วิธีปรับ

📖 อ้างอิง:
- [Predict Mode (imgsz, conf, device)](https://docs.ultralytics.com/modes/predict)

### 5.1 วัด Inference Time

```python
import time
import cv2
from ultralytics import YOLO

model = YOLO("Models/yolo11n.pt")
frame = cv2.imread("test_frame.jpg")

# warmup
model.predict(frame, verbose=False)

# วัดเวลา
times = []
for _ in range(10):
    t0 = time.perf_counter()
    results = model.predict(frame, conf=0.5, classes=[0, 1], verbose=False)
    t1 = time.perf_counter()
    times.append((t1 - t0) * 1000)

avg = sum(times) / len(times)
print(f"Avg inference time: {avg:.1f} ms ({1000/avg:.1f} FPS theoretical)")
```
### 5.2 วิธีที่ 1 — ลด `imgsz` (resize ก่อน inference)

YOLO resize frame ให้ได้ขนาด `imgsz` ก่อนประมวลผล ยิ่งเล็กยิ่งเร็ว

```python
# default imgsz=640
results = model.predict(frame, imgsz=640, ...)   # baseline

# ลดเป็น 416 หรือ 320
results = model.predict(frame, imgsz=416, ...)   # เร็วขึ้น ~30-40%
results = model.predict(frame, imgsz=320, ...)   # เร็วขึ้น ~50-60% แต่พลาดคนไกล
```
**Trade-off:** ยิ่งเล็กยิ่งเร็ว แต่ตรวจจับคนที่อยู่ไกล/เล็กในภาพได้แย่ลง

ตั้งใน `.env`:
```dotenv
# ไม่มี .env ตรง ๆ สำหรับ imgsz แต่แก้ใน detection_service.py
# detector.detect_persons(frame, imgsz=416)
```
### 5.3 วิธีที่ 2 — Skip Frame

ไม่ต้อง inference ทุกเฟรม กล้อง 30 FPS → inference แค่ 5–10 FPS พอ:

```python
import time

frame_count = 0
DETECT_EVERY_N_FRAMES = 3   # detect ทุก 3 เฟรม

while True:
    frame = camera.get_latest_frame()
    if frame is None:
        time.sleep(0.05)
        continue

    frame_count += 1
    if frame_count % DETECT_EVERY_N_FRAMES != 0:
        time.sleep(0.01)
        continue   # ข้ามเฟรมนี้

    detections = detector.detect(frame)
    # ...
```
**Trade-off:** ประหยัด CPU มาก แต่ latency ตรวจจับเพิ่มขึ้น (max 3 เฟรม × 33ms = ~100ms)  
สำหรับกรณีใช้งาน dwell > 5 วิ ไม่มีผลมาก

### 5.4 วิธีที่ 3 — ลด FPS Detection

ควบคุมด้วย sleep:

```python
DETECT_FPS = 5   # ต้องการ detect 5 ครั้ง/วิ
SLEEP_PER_LOOP = 1.0 / DETECT_FPS  # = 0.2 วิ

while True:
    t0 = time.perf_counter()

    frame = camera.get_latest_frame()
    if frame is not None:
        detections = detector.detect(frame)
        # process...

    elapsed = time.perf_counter() - t0
    remaining = SLEEP_PER_LOOP - elapsed
    if remaining > 0:
        time.sleep(remaining)
```
### 5.5 วิธีที่ 4 — Resize Frame ก่อนส่ง YOLO

ถ้ากล้อง 4K/1080p แต่พื้นที่อันตรายเล็ก ลอง resize frame ก่อน:

```python
import cv2

def preprocess_frame(frame, target_width=640):
    """ลด resolution ก่อนส่ง YOLO (ถ้า frame ใหญ่มาก)"""
    h, w = frame.shape[:2]
    if w <= target_width:
        return frame, 1.0  # ไม่ต้อง resize

    scale = target_width / w
    new_h = int(h * scale)
    resized = cv2.resize(frame, (target_width, new_h), interpolation=cv2.INTER_LINEAR)
    return resized, scale

# ใช้งาน
resized_frame, scale = preprocess_frame(frame, target_width=640)
detections = detector.detect(resized_frame)

# scale bbox กลับมาพิกัดเดิม
for det in detections:
    x1, y1, x2, y2 = det["bbox"]
    det["bbox"] = (int(x1/scale), int(y1/scale), int(x2/scale), int(y2/scale))
```
### 5.6 วิธีที่ 5 — เพิ่ม `CONF_THRESHOLD`

ถ้า detection เยอะเกิน (เจอคนที่ไม่ควรเจอ) เพิ่ม threshold ลด false positive:

```dotenv
CONF_THRESHOLD=0.6   # เพิ่มจาก 0.5
```
**ผล:** YOLO ยังทำงานเท่าเดิม แต่กรองผลที่ไม่มั่นใจออก → ลด load ที่ area_checker

### 5.7 วิธีที่ 6 — ใช้โมเดล Nano

ถ้ายังใช้ `yolo11m` หรือใหญ่กว่า → เปลี่ยนเป็น `yolo11n`:

```dotenv
YOLO_MODEL_PATH=Models/yolo11n.pt
```
### 5.8 วิธีที่ 7 — ลด save/alert ซ้ำ (Cooldown)

ถ้าต้องเซฟรูปและ insert DB ทุก event ช้ามาก → เพิ่ม cooldown:

```dotenv
ALERT_COOLDOWN_SECONDS=300   # 5 นาที แทน 2 นาที
```
**ผล:** ลด IO (disk write, DB insert) ลงอีก

### 5.9 วิธีที่ 8 — ROI (Region of Interest)

ถ้า polygon เล็ก และกล้องมี frame ใหญ่ → crop เฉพาะส่วน polygon + margin ก่อนส่ง YOLO:

```python
def crop_to_roi(frame, polygon_points, margin=50):
    """Crop frame ให้เหลือเฉพาะส่วน ROI (polygon bounding box + margin)"""
    import numpy as np
    pts = np.array(polygon_points)
    x_min = max(0, pts[:, 0].min() - margin)
    y_min = max(0, pts[:, 1].min() - margin)
    x_max = min(frame.shape[1], pts[:, 0].max() + margin)
    y_max = min(frame.shape[0], pts[:, 1].max() + margin)

    roi = frame[y_min:y_max, x_min:x_max]
    return roi, (x_min, y_min)   # คืน roi + offset สำหรับ scale bbox กลับ

# ใช้งาน
roi_frame, (offset_x, offset_y) = crop_to_roi(frame, cam_config.danger_zones[0])
detections = detector.detect(roi_frame)

# แปลง bbox จาก ROI coordinates กลับเป็น full frame
for det in detections:
    x1, y1, x2, y2 = det["bbox"]
    det["bbox"] = (x1 + offset_x, y1 + offset_y, x2 + offset_x, y2 + offset_y)
```
**Trade-off:** เร็วมากถ้า ROI เล็ก แต่ตรวจจับได้เฉพาะในพื้นที่ที่ crop

### 5.10 สรุปตาราง Trade-off

| วิธี | ผลลัพธ์ | Trade-off |
|------|---------|-----------|
| GPU (`DEVICE=cuda`) | เร็วมาก 10–50x | ราคา hardware |
| ลด `imgsz` | เร็ว 30–60% | พลาดคนเล็ก/ไกล |
| Skip frame | ประหยัด CPU | latency เพิ่ม |
| ลด FPS detect | ลด CPU load | latency เพิ่ม |
| resize frame | เร็ว | accuracy ลด |
| เพิ่ม conf threshold | กรอง false positive | พลาดคนที่มั่นใจน้อย |
| เปลี่ยนเป็น nano | เร็วขึ้น | accuracy ลดนิดหน่อย |
| เพิ่ม cooldown | ลด IO | alert ถี่น้อยลง |
| ROI crop | เร็วมาก | ตรวจจับได้แค่ในพื้นที่ |

---

## ส่วนที่ 6 — แบบฝึกหัด

1. **วัด baseline:** รันโค้ดวัด inference time ดูว่า avg กี่ ms
2. **ปรับ imgsz:** ลองเปลี่ยน `imgsz=320` vs `640` วัดเวลาใหม่
3. **ทดสอบ skip frame:** ใส่ `DETECT_EVERY_N_FRAMES=3` แล้วดูว่า CPU load ลดลง
4. **เปรียบเทียบโมเดล:** ลองเปลี่ยนจาก `yolo11n.pt` เป็น `yolo11s.pt` วัด accuracy vs speed
5. **Monitor CPU:** เปิด Task Manager ดู CPU % ขณะรันระบบ แล้วลองปรับ cooldown เพิ่มดูว่าลดลง

---

## ส่วนที่ 7 — Checklist หลังเรียน

- [ ] อธิบายความต่าง GPU vs CPU สำหรับ inference ได้
- [ ] วัด inference time ของระบบได้
- [ ] รู้ความหมายของ `imgsz` และผลต่อความเร็ว/accuracy
- [ ] ปรับ `YOLO_MODEL_PATH` เปลี่ยน model size ได้
- [ ] เข้าใจ trade-off ของแต่ละวิธีปรับ
- [ ] รู้ว่า cooldown ช่วยลด IO ได้ด้วย

---

## ส่วนที่ 8 — Common Error + วิธีแก้

### CPU 100% ตลอดเวลา

**วิธีแก้ (ทำตามลำดับ):**
1. เพิ่ม `time.sleep(0.03)` ใน loop หลัก (มีอยู่แล้วใน `detection_service.py`)
2. ใช้ skip frame: `DETECT_EVERY_N_FRAMES=3`
3. ลด `imgsz=320`
4. ซื้อ GPU (ถ้าจำเป็น)

---

### ระบบ detect ช้า / lag

**ตรวจสอบ:**
```python
import time
t0 = time.perf_counter()
detections = detector.detect(frame, imgsz=640)
print(f"Detect time: {(time.perf_counter()-t0)*1000:.0f} ms")
```
ถ้า > 200ms บน CPU → ลด `imgsz` หรือเพิ่ม skip frame

---

### `torch.cuda.is_available()` คืน False ทั้งที่มี GPU

**สาเหตุ:** ติดตั้ง PyTorch version CPU อยู่

```bash
# ลบและติดตั้งใหม่เป็น CUDA version
pip uninstall torch torchvision
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```
---

### Memory leak — RAM เพิ่มขึ้นเรื่อย ๆ

**สาเหตุ:** ไม่ได้ release ตัวแปร frame หรือ loop YOLO results

```python
# ลบ results หลังใช้งาน
results = model.predict(frame, ...)
# process results...
del results   # explicit cleanup
```
---

## ส่วนที่ 9 — ควร commit อะไร

```text
✅ commit:
└── config/settings.py    (ถ้าเพิ่ม setting ใหม่)
    src/detection/detection_service.py  (ถ้าปรับ loop logic)
```
---

## ส่วนที่ 10 — ไม่ควร commit อะไร

```text
❌ ห้าม commit:
├── .env                      (DEVICE=cuda, CONF_THRESHOLD)
└── Models/*.pt               (โมเดลไฟล์ใหญ่)
```
---

### ลิงก์อ้างอิง

| หัวข้อ | ลิงก์ |
|--------|-------|
| Model Size Comparison | <https://docs.ultralytics.com/models/yolo11#performance-metrics> |
| Predict Mode (imgsz, conf, device) | <https://docs.ultralytics.com/modes/predict> |
