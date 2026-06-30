# Module 04 — OpenCV และกล้อง RTSP

> **ระดับ:** มือใหม่-กลาง | **เวลาโดยประมาณ:** 60–90 นาที

---

## ส่วนที่ 1 — วัตถุประสงค์

เมื่อจบ module นี้ ผู้เรียนจะสามารถ:

- อธิบายได้ว่า RTSP คืออะไรและใช้งานยังไง
- เปิด video stream จากกล้อง RTSP หรือไฟล์วิดีโอด้วย OpenCV
- อ่าน frame ออกมาทีละเฟรม
- จัดการกรณีกล้องหลุดและ reconnect อัตโนมัติ
- เข้าใจ pattern "latest frame" ที่ใช้ใน production
- แยก config กล้องออกจากโค้ดตรรกะ

---

## ส่วนที่ 2 — สิ่งที่ต้องเตรียม

- ผ่าน Module 01–03
- `venv` activated, library ติดตั้งแล้ว
- กล้อง IP ที่รองรับ RTSP หรือ URL กล้อง RTSP (ถ้าไม่มีให้ใช้ไฟล์วิดีโอ `.mp4` แทน)

---

## ส่วนที่ 3 — คำอธิบายเข้าใจง่าย

### RTSP คืออะไร?

**RTSP (Real-Time Streaming Protocol)** คือโปรโตคอลมาตรฐานที่กล้อง IP (CCTV) ทุกยี่ห้อรองรับ ใช้สำหรับส่งวิดีโอสด ๆ ผ่านเครือข่าย

รูปแบบ URL:
```text
rtsp://<user>:<password>@<ip>:<port>/<path>

ตัวอย่างจริง:
rtsp://admin:password@192.168.1.100:554/stream1
rtsp://10.0.0.50:554/cam/realmonitor?channel=1&subtype=0
```
### OpenCV คืออะไร?

**OpenCV (Open Source Computer Vision Library)** คือ library สำหรับประมวลผลภาพ ทำได้ทั้ง:
- เปิด video stream (RTSP, webcam, ไฟล์)
- อ่าน frame ทีละเฟรม
- วาดกราฟิก (กล่อง, เส้น, polygon) ลงบน frame
- บันทึกเป็น image ไฟล์

> **สิ่งที่ห้ามทำในโปรเจกต์นี้:** `cv2.imshow()` — เปิดหน้าต่างแสดงผล GUI ไม่ทำงานบน server ที่ไม่มี display และคนนอกมองไม่เห็น เราดูผ่านเว็บ React แทน

### Frame คืออะไร?

วิดีโอคือภาพนิ่งหลายภาพฉายต่อกันเร็ว ๆ แต่ละภาพคือ "frame" กล้อง IP ส่วนใหญ่ส่ง 15–30 FPS (frame per second)

```python
# frame คือ numpy array ขนาด (height, width, 3) — BGR
frame.shape   # (480, 640, 3)
frame.dtype   # uint8 (0-255 ต่อช่อง)
```
### ทำไมต้องใช้ Thread แยก?

YOLO ใช้เวลาประมวลผลต่อเฟรม ~50–200 ms (บน CPU) ถ้า:
- **ไม่มี thread แยก:** อ่านกล้อง → รอ YOLO → อ่านกล้อง → รอ YOLO (delay สะสม)
- **มี thread แยก:** thread หนึ่งอ่านกล้องตลอด เก็บเฟรมล่าสุด thread หลักหยิบไปทำ YOLO ได้ทันที

---

## ส่วนที่ 4 — Flow การทำงาน

```text
CameraReader.start()
        ↓
thread แยก (_read_loop) ทำงานเบื้องหลัง
    ├── เปิด RTSP stream ด้วย cv2.VideoCapture
    ├── ถ้าเปิดไม่ได้ → รอ delay → ลองใหม่ (backoff)
    ├── cap.read() → ได้ (ret=True, frame)
    ├── ถ้า ret=False → reconnect
    └── เก็บ frame ล่าสุดใน _latest_frame (thread-safe)
        ↓
thread หลัก (detection loop):
    └── camera.get_latest_frame() → copy frame ล่าสุดออกมาใช้
```
---

## ส่วนที่ 5 — ตัวอย่าง Code

ดูไฟล์จริงที่ [src/camera/camera_reader.py](../../src/camera/camera_reader.py) และ [src/camera/camera_config.py](../../src/camera/camera_config.py)

### 5.1 เปิดกล้องแบบง่าย (playground)

```python
import cv2

# เปิดจาก RTSP
cap = cv2.VideoCapture("rtsp://admin:password@192.168.1.100:554/stream1")

# หรือเปิดจากไฟล์วิดีโอ (สำหรับทดสอบ)
# cap = cv2.VideoCapture("test_video.mp4")

# หรือเปิดจาก webcam (index 0)
# cap = cv2.VideoCapture(0)

# ลด buffer เพื่อลด latency
cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

if not cap.isOpened():
    print("เปิดกล้องไม่ได้!")
else:
    ret, frame = cap.read()
    if ret:
        print(f"อ่านเฟรมสำเร็จ: {frame.shape}")  # (height, width, 3)
        # บันทึกเป็นรูป (แทนการ imshow)
        cv2.imwrite("test_frame.jpg", frame)
        print("บันทึก test_frame.jpg แล้ว")
    else:
        print("อ่านเฟรมไม่ได้")

cap.release()
```
### 5.2 `CameraReader` — Production Class

นี่คือโค้ดจริงใน [src/camera/camera_reader.py](../../src/camera/camera_reader.py):

```python
import logging
import threading
import time
import cv2

logger = logging.getLogger(__name__)


class CameraReader:
    """เปิด stream วิดีโอและอ่านเฟรมล่าสุดให้ผู้ใช้ดึงไปประมวลผล"""

    def __init__(self, source: str, reconnect_delay: float = 2.0, max_reconnect_delay: float = 30.0):
        self.source = source
        self.reconnect_delay = reconnect_delay       # รอ 2 วิก่อน retry แรก
        self.max_reconnect_delay = max_reconnect_delay  # รอสูงสุด 30 วิ

        self._cap = None
        self._latest_frame = None
        self._lock = threading.Lock()   # ป้องกัน 2 thread อ่าน/เขียนพร้อมกัน
        self._running = False
        self._thread = None

    def start(self) -> "CameraReader":
        """เริ่ม thread อ่านกล้องเบื้องหลัง"""
        self._running = True
        self._thread = threading.Thread(target=self._read_loop, daemon=True)
        self._thread.start()
        return self  # คืน self เพื่อ chain: camera = CameraReader(url).start()

    def stop(self) -> None:
        """หยุด thread และปิด stream"""
        self._running = False
        if self._thread is not None:
            self._thread.join(timeout=2)
        if self._cap is not None:
            self._cap.release()
            self._cap = None

    def get_latest_frame(self):
        """คืนเฟรมล่าสุด (copy) หรือ None"""
        with self._lock:
            if self._latest_frame is None:
                return None
            return self._latest_frame.copy()   # copy เพื่อให้ thread หลักแก้ไขได้ปลอดภัย

    def _open_capture(self) -> cv2.VideoCapture:
        # รองรับกรณี source เป็นเลข webcam index (string "0", "1", ...)
        source = int(self.source) if isinstance(self.source, str) and self.source.isdigit() else self.source
        cap = cv2.VideoCapture(source)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        return cap

    def _read_loop(self) -> None:
        delay = self.reconnect_delay

        while self._running:
            # ถ้ายังไม่ได้เปิด หรือหลุดไป → เชื่อมต่อใหม่
            if self._cap is None or not self._cap.isOpened():
                logger.info("กำลังเชื่อมต่อกล้อง: %s", self.source)
                self._cap = self._open_capture()

                if not self._cap.isOpened():
                    logger.warning(
                        "เชื่อมต่อกล้องไม่สำเร็จ จะลองใหม่ใน %.1f วินาที", delay
                    )
                    self._cap.release()
                    self._cap = None
                    time.sleep(delay)
                    delay = min(delay * 2, self.max_reconnect_delay)  # backoff
                    continue

                logger.info("เชื่อมต่อกล้องสำเร็จ: %s", self.source)
                delay = self.reconnect_delay  # reset delay เมื่อสำเร็จ

            ret, frame = self._cap.read()

            if not ret:
                logger.warning("อ่านเฟรมไม่สำเร็จ (กล้องหลุด) — กำลังเชื่อมต่อใหม่")
                self._cap.release()
                self._cap = None
                time.sleep(delay)
                continue

            with self._lock:
                self._latest_frame = frame   # เก็บเฟรมล่าสุด
```
**Backoff คืออะไร?**

ถ้ากล้องหลุด ไม่ควร retry ถี่ๆ ตลอด (กิน CPU + network) แต่ให้รอนานขึ้นเรื่อย ๆ:
```text
ครั้งที่ 1: รอ 2 วิ
ครั้งที่ 2: รอ 4 วิ
ครั้งที่ 3: รอ 8 วิ
...
จนถึง max 30 วิ
```
### 5.3 `CameraConfig` — แยก Config กล้อง

```python
from dataclasses import dataclass
from config.settings import settings


@dataclass
class CameraConfig:
    camera_no: str
    camera_name: str
    location_name: str
    company_code: str
    source: str                          # RTSP URL หรือไฟล์วิดีโอ
    danger_zone: list[tuple[int, int]]   # polygon พื้นที่อันตราย


def load_camera_configs() -> list[CameraConfig]:
    """โหลดรายการกล้องจาก JSON หรือ MSSQL ขึ้นอยู่กับการตั้งค่า"""
    source_type = settings.CAMERA_CONFIG_SOURCE
    
    if source_type == "mssql":
        # อ่านจาก Database ผ่าน Stored Procedure
        pass 
    else:
        # อ่านจากไฟล์ cameras.json 
        config_path = settings.CAMERAS_CONFIG_PATH
        with open(config_path, encoding="utf-8") as f:
            raw_list = json.load(f)
        # ... แปลงเป็น CameraConfig (ดูโค้ดเต็มใน src/camera/camera_config.py)
```
### 5.4 วิธีใช้ใน Detection Loop

```python
from src.camera.camera_config import load_camera_configs
from src.camera.camera_reader import CameraReader
import time

camera_configs = load_camera_configs()
camera_config = camera_configs[0]

# เริ่มอ่านกล้อง (thread แยก)
camera = CameraReader(camera_config.source).start()

try:
    while True:
        frame = camera.get_latest_frame()

        if frame is None:
            time.sleep(0.1)   # ยังไม่มีเฟรม รอสักครู่
            continue

        # ส่ง frame ไปประมวลผล YOLO ต่อ...
        print(f"เฟรม shape: {frame.shape}")
        time.sleep(0.03)  # ~30 FPS processing

except KeyboardInterrupt:
    print("หยุดการทำงาน")
finally:
    camera.stop()
```
### 5.5 ทดสอบด้วยไฟล์วิดีโอ (ถ้าไม่มีกล้อง RTSP)

ในไฟล์ `config/cameras.json` เปลี่ยนค่า `source`:
```json
{
  "camera_no": "1",
  "source": "playground/02-opencv-camera/test_video.mp4"
}
```
หรือใช้ webcam:
```json
{
  "camera_no": "1",
  "source": "0"
}
```
> `CameraReader` รองรับทั้ง 3 แบบโดยอัตโนมัติ

---

## ส่วนที่ 6 — แบบฝึกหัด

1. **เปิดกล้องอย่างง่าย:** รันโค้ดจาก `playground/02-opencv-camera/example.py` ดูว่าอ่านเฟรมได้ไหม
2. **บันทึกเฟรม:** แก้โค้ดให้บันทึกเฟรมแรกเป็น `frame_001.jpg`
3. **ทดสอบ reconnect:** ตั้ง `source` ใน `config/cameras.json` เป็น URL ที่ไม่มีอยู่จริง แล้วดู log — ควรเห็น warning "เชื่อมต่อกล้องไม่สำเร็จ" และลอง retry
4. **ตรวจสอบ frame shape:** print `frame.shape` ดูว่า resolution ของกล้องที่ใช้คือเท่าไร

---

## ส่วนที่ 7 — Checklist หลังเรียน

- [ ] อธิบาย RTSP URL format ได้ (user:password@ip:port/path)
- [ ] เข้าใจว่า frame คือ numpy array shape (H, W, 3)
- [ ] รู้ว่าทำไม `ห้ามใช้ cv2.imshow()` ในโปรเจกต์นี้
- [ ] เข้าใจว่า thread แยกทำให้ระบบไม่ block
- [ ] รู้ว่า backoff reconnect ทำงานยังไง
- [ ] เปิดวิดีโอจากไฟล์หรือ RTSP แล้วอ่านเฟรมได้

---

## ส่วนที่ 8 — Common Error + วิธีแก้

### Error: `cap.isOpened()` คืน `False`

**สาเหตุที่พบบ่อย:**
1. IP/port ผิด
2. Username/password ผิด
3. Network ไม่ถึงกล้อง
4. กล้องไม่รองรับ RTSP path ที่ระบุ

**วิธีทดสอบ:**
```bash
# ทดสอบ ping กล้อง
ping 192.168.1.100

# ทดสอบ port 554 (RTSP default)
Test-NetConnection -ComputerName 192.168.1.100 -Port 554   # PowerShell
```
ลอง URL ใน VLC Media Player ก่อน: Media → Open Network Stream → ใส่ RTSP URL

---

### Error: เฟรมหน่วง / มีความล่าช้ามาก

**สาเหตุ:** buffer กล้องเต็ม เฟรมเก่าค้างอยู่

**วิธีแก้:** ตั้ง `CAP_PROP_BUFFERSIZE=1` แล้ว (มีในโค้ดแล้ว) ถ้ายังช้าลองลด resolution ในการ detect (Module 12)

---

### Error: `ret = False` ทันทีที่เริ่ม

**สาเหตุ:** กล้องเปิดได้ (`isOpened()=True`) แต่ยังไม่มีสัญญาณ

```python
# รอสักครู่หลัง open ก่อน read
import time
cap = cv2.VideoCapture(url)
time.sleep(1)   # รอ 1 วิ
ret, frame = cap.read()
```
---

### Error: ภาพออกมาเป็นสี bizarre (สีผิดเพี้ยน)

**สาเหตุ:** OpenCV ใช้ BGR ไม่ใช่ RGB

```python
# ถ้าต้องแสดงด้วย matplotlib (RGB)
import matplotlib.pyplot as plt
frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
plt.imshow(frame_rgb)
plt.show()

# แต่สำหรับ cv2.imwrite() ใช้ BGR ได้เลย ไม่ต้อง convert
```
---

## ส่วนที่ 9 — ควร commit อะไร

```text
✅ commit:
├── src/camera/camera_reader.py
├── src/camera/camera_config.py
├── src/camera/__init__.py
└── playground/02-opencv-camera/example.py
```
---

## ส่วนที่ 10 — ไม่ควร commit อะไร

```text
❌ ห้าม commit:
├── .env                    (มี RTSP URL + password กล้อง)
├── *.mp4, *.avi            (ไฟล์วิดีโอทดสอบขนาดใหญ่)
├── *.jpg, *.png            (รูปเฟรมที่บันทึก)
└── test_frame*.jpg
```