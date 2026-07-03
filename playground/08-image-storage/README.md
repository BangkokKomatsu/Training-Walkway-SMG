---
lab:
    title: '08 - Image Storage (Playground)'
    description: 'เรียนรู้การเซฟรูปภาพ detection ลง shared drive ด้วยฟังก์ชัน save_detection_image() และโครงสร้างโฟลเดอร์/ชื่อไฟล์ของระบบ'
---

# 08 - Image Storage (Playground)

เมื่อระบบตรวจพบคนในพื้นที่อันตราย นอกจากจะบันทึก log ลง MSSQL แล้ว ยังต้อง **เซฟรูปภาพหลักฐาน** ไว้ด้วย เพื่อให้ผู้ดูแลระบบเปิดดูย้อนหลังผ่านหน้าเว็บได้ ในบทเรียนนี้ คุณจะได้ลองเรียกใช้ฟังก์ชันจริงของระบบ `save_detection_image()` และดูว่าไฟล์ถูกจัดเก็บเป็นโครงสร้างแบบไหน

ระยะเวลาที่ใช้: ประมาณ **15** นาที

## Prerequisites
- ติดตั้งไลบรารี OpenCV และ NumPy (`pip install opencv-python numpy`)
- ไม่จำเป็นต้องมี shared drive จริง — ถ้ายังไม่ได้ตั้งค่า `IMAGE_SHARED_DRIVE` ใน `.env` สคริปต์จะเซฟรูปลงโฟลเดอร์ทดสอบในเครื่องให้อัตโนมัติ

---

## 1. Fallback ไปใช้โฟลเดอร์ทดสอบถ้ายังไม่ได้ตั้งค่า .env

`save_detection_image()` อ่านค่า path ปลายทางจาก `settings.IMAGE_SHARED_DRIVE` เท่านั้น (ห้ามฮาร์ดโค้ด path — ดู CLAUDE.md ข้อ 5) เพื่อให้แบบฝึกหัดนี้รันได้ทันทีโดยไม่ต้องแก้ `.env` ก่อน เราตั้งค่า environment variable แบบ fallback ไว้ **ก่อน** import `config.settings`

```python
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

_TEST_DRIVE = os.path.join(os.path.dirname(__file__), "test-shared-drive")
os.environ.setdefault("IMAGE_SHARED_DRIVE", _TEST_DRIVE)

from config.settings import settings
from src.storage.image_storage import save_detection_image
```

**คำอธิบายโค้ด (Line-by-Line):**
- `_TEST_DRIVE = ...`: กำหนดโฟลเดอร์ทดสอบไว้ในโฟลเดอร์เดียวกับสคริปต์นี้ (`playground/08-image-storage/test-shared-drive/`)
- `os.environ.setdefault(...)`: ตั้งค่า environment variable **เฉพาะตอนที่ยังไม่มีค่านี้อยู่เลย** — ถ้าคุณตั้ง `IMAGE_SHARED_DRIVE` ไว้ใน `.env` แล้ว ค่านั้นจะไม่ถูกทับ (ระบบจะเซฟไปที่ path จริงตามที่คุณตั้งไว้แทน)
- ต้องเรียก `setdefault()` **ก่อน** `from config.settings import settings` เสมอ เพราะ `config/settings.py` อ่านค่า `.env`/environment variable แค่ครั้งเดียวตอน import (ดู Module 02 §5.11)
- `from src.storage.image_storage import save_detection_image`: import ฟังก์ชันจริงของระบบมาใช้ตรง ๆ — ไม่มีการเขียนซ้ำ logic เอง

---

## 2. เตรียมภาพจำลอง (Dummy Frame)

เนื่องจากบทเรียนนี้ไม่ได้ต่อกล้องจริง เราจะสร้างภาพเปล่าสีพื้นแทน frame ที่ปกติจะมาจาก YOLO/OpenCV

```python
import cv2
import numpy as np

def _make_dummy_frame() -> np.ndarray:
    frame = np.zeros((480, 640, 3), dtype=np.uint8)
    frame[:] = (255, 100, 0)  # BGR = สีส้มอมฟ้า
    cv2.putText(
        frame, "TEST DETECTION", (50, 240),
        cv2.FONT_HERSHEY_SIMPLEX, 1.3, (255, 255, 255), 3,
    )
    return frame
```

**คำอธิบายโค้ด (Line-by-Line):**
- `np.zeros((480, 640, 3), dtype=np.uint8)`: สร้างภาพเปล่าสีดำ ขนาด 640x480 พิกเซล 3 ช่องสี (เหมือนขนาดเฟรมกล้องทั่วไป)
- `frame[:] = (255, 100, 0)`: เติมสีทั้งภาพ (OpenCV ใช้ลำดับสี BGR ไม่ใช่ RGB)
- `cv2.putText(...)`: เขียนข้อความลงบนภาพ เพื่อให้เห็นชัดว่านี่คือภาพทดสอบ ไม่ใช่ภาพจากกล้องจริง

---

## 3. เรียกฟังก์ชันจริง save_detection_image()

```python
image_path, image_name = save_detection_image(frame, company_code="DEMO", camera_no="CAM-PLAYGROUND")
```

**คำอธิบายโค้ด (Line-by-Line):**
- `save_detection_image(frame, company_code, camera_no)`: ฟังก์ชันเดียวกับที่ `src/detection/detection_service.py` เรียกใช้จริงตอนเกิด event ใน production
- ฟังก์ชันนี้จะสร้างโฟลเดอร์ `{IMAGE_SHARED_DRIVE}/{company_code}/{camera_no}/{yyyyMMdd}/` อัตโนมัติ (ถ้ายังไม่มี) แล้วเซฟไฟล์ชื่อ `detection__{yyyyMMdd_HHmmss}.jpg` ลงไป
- คืนค่าเป็น tuple `(image_path, image_name)`:
  - `image_path` = path เต็ม (ใช้เก็บใน DB ให้ Python/Backend อ้างอิงไฟล์)
  - `image_name` = ชื่อไฟล์อย่างเดียว (ใช้เก็บใน DB ให้ frontend เอาไปขอรูปผ่าน API)
- ถ้าเซฟไม่สำเร็จ (เช่น path ไม่มีสิทธิ์เขียน) ฟังก์ชันจะคืน `("", "")` แทนที่จะโยน exception ออกมา — ต้องเช็ค `if not image_path:` เสมอ

---

## 4. ยืนยันว่าไฟล์ถูกเขียนจริง

การที่ฟังก์ชันคืนค่า path มาไม่ได้แปลว่าไฟล์ถูกเขียนสำเร็จจริงเสมอไป เราจึงอ่านไฟล์กลับมาตรวจสอบอีกชั้น

```python
print(f"os.path.exists(image_path) = {os.path.exists(image_path)}")
print(f"ขนาดไฟล์ = {os.path.getsize(image_path):,} bytes")

reloaded = cv2.imread(image_path)
if reloaded is not None:
    print(f"cv2.imread() อ่านกลับมาได้ ขนาดภาพ = {reloaded.shape}")
```

**คำอธิบายโค้ด (Line-by-Line):**
- `os.path.exists(image_path)`: เช็คว่าไฟล์มีอยู่จริงบนดิสก์
- `os.path.getsize(image_path)`: ขนาดไฟล์เป็น byte — ถ้าเป็น 0 แปลว่าไฟล์เสีย/เขียนไม่สมบูรณ์
- `cv2.imread(image_path)`: ลองเปิดไฟล์ภาพกลับมาอีกครั้ง ถ้าเปิดไม่ได้ (คืนค่า `None`) แปลว่าไฟล์ jpg เสีย

---

## การรันทดสอบ

1. เปิด Terminal ที่ root ของโปรเจกต์
2. รันคำสั่ง

```bash
python playground/08-image-storage/example.py
```

3. ผลลัพธ์ที่คาดหวังใน Console (กรณียังไม่ได้ตั้งค่า `IMAGE_SHARED_DRIVE` ใน `.env`):

```text
============================================================
Playground 08: Image Storage (save_detection_image)
============================================================
IMAGE_SHARED_DRIVE = D:\Project_Thitiwut\Training-WalkWay-SMG\playground\08-image-storage\test-shared-drive

บันทึกสำเร็จ!
  image_path (เก็บใน DB ให้ Python/Backend อ้างอิงไฟล์) = D:\...\test-shared-drive\DEMO\CAM-PLAYGROUND\20260703\detection__20260703_143012.jpg
  image_name (เก็บใน DB ให้ frontend ขอรูปผ่าน API)     = detection__20260703_143012.jpg

ตรวจสอบไฟล์ที่เซฟไว้:
  os.path.exists(image_path) = True
  ขนาดไฟล์ = 14,832 bytes
  cv2.imread() อ่านกลับมาได้ ขนาดภาพ = (480, 640, 3)
```

4. เปิดโฟลเดอร์ `playground/08-image-storage/test-shared-drive/` ดูด้วยตาตัวเอง — ต้องเห็นโครงสร้าง `DEMO/CAM-PLAYGROUND/yyyyMMdd/detection__....jpg` ตรงกับที่ Module 08 สอน

## ลองต่อยอด (แบบฝึกหัดเพิ่มเติม)

- ลองตั้งค่า `IMAGE_SHARED_DRIVE=D:\shared` (หรือ path จริงที่เขียนได้) ใน `.env` แล้วรันใหม่ ดูว่าไฟล์ไปเซฟที่ path นั้นแทนโฟลเดอร์ทดสอบ
- ลองเปลี่ยน `company_code`/`camera_no` เป็นค่าอื่น ดูว่าโครงสร้างโฟลเดอร์เปลี่ยนตามยังไง
- ลองตั้ง `IMAGE_SHARED_DRIVE` เป็น path ที่ไม่มีสิทธิ์เขียน (เช่น `C:\Windows\System32\test`) ดูว่า `save_detection_image()` คืนค่า `("", "")` แทนที่จะ crash
