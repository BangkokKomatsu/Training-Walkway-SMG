---
lab:
    title: '02 - OpenCV Camera (Playground)'
    description: 'เรียนรู้การเปิดสตรีมวิดีโอจากกล้อง CCTV ผ่าน RTSP ด้วย OpenCV และการใช้งาน CameraReader'
---

# 02 - OpenCV Camera (Playground)

ในบทเรียนนี้ คุณจะได้เรียนรู้วิธีการเชื่อมต่อและดึงภาพวิดีโอ (Video Stream) จากกล้อง CCTV หรือเว็บแคมโดยใช้ไลบรารี **OpenCV** นอกจากนี้ จะได้เห็นวิธีการเรียกใช้คลาส `CameraReader` ที่ถูกออกแบบมาให้อ่านเฟรมภาพจากกล้องใน Thread แยก เพื่อป้องกันปัญหาภาพค้าง (Lag) และมีระบบ Auto-reconnect หากสัญญาณหลุด

ระยะเวลาที่ใช้: ประมาณ **15** นาที

## Prerequisites
- ได้ทำการตั้งค่าไฟล์ `.env` หรือ `cameras.json` เรียบร้อยแล้ว (หรือใช้กล้องเว็บแคมหมายเลข `0`)
- ติดตั้งไลบรารี OpenCV (`pip install opencv-python`)

---

## 1. การตั้งค่าระบบ (Setup & Imports)

ในส่วนแรกของสคริปต์ จะเป็นการเพิ่มพาธของโปรเจกต์เพื่อให้เราสามารถ Import โค้ดที่อยู่ในโฟลเดอร์ `src` และตั้งค่า Logging

```python
import logging
import sys
import time
from pathlib import Path

# เพิ่ม root โปรเจกต์เข้า sys.path เพื่อ import config/ และ src/ ได้
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from src.camera.camera_config import load_camera_configs
from src.camera.camera_reader import CameraReader

# บังคับเป็น UTF-8 สำหรับ Windows Console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)
```

**คำอธิบายโค้ด (Line-by-Line):**
- `from pathlib import Path`: ใช้สำหรับจัดการพาธของไฟล์และโฟลเดอร์แบบข้ามระบบปฏิบัติการ
- `sys.path.insert(0, str(Path(__file__).resolve().parents[2]))`: บรรทัดนี้สำคัญมาก! มันทำหน้าที่หาพาธของโปรเจกต์ (ย้อนกลับไป 2 โฟลเดอร์จากไฟล์นี้) แล้วเพิ่มเข้าไปใน `sys.path` ทำให้โปรแกรมมองเห็นโฟลเดอร์ `src` และสามารถ Import โมดูลหลักได้
- `from src.camera.camera_reader import CameraReader`: ดึงคลาส `CameraReader` ที่อยู่ใน `src` มาใช้งาน 

---

## 2. การรับค่าที่มาของกล้อง (Camera Source)

ส่วนแรกของฟังก์ชัน `main()` จะทำการตรวจสอบว่าผู้ใช้ป้อนที่อยู่ของกล้องเข้ามาผ่าน Argument หรือไม่ หากไม่ป้อน จะโหลดคอนฟิกกล้องตัวแรกจากระบบ

```python
def main() -> None:
    if len(sys.argv) > 1:
        source = sys.argv[1]
    else:
        cameras = load_camera_configs()
        source = cameras[0].source if cameras else "0"
        
    logger.info("เปิดกล้อง/วิดีโอจาก: %s", source)
```

**คำอธิบายโค้ด (Line-by-Line):**
- `sys.argv`: คือลิสต์ของตัวแปรที่ถูกส่งเข้ามาตอนเรารันคำสั่งใน Terminal เช่น `python example.py 0` คำว่า `0` จะอยู่ใน `sys.argv[1]`
- `if len(sys.argv) > 1:`: เช็คว่ามีการป้อนที่อยู่กล้อง (RTSP URL หรือ Path วิดีโอ หรือเลข 0) มาหรือไม่
- `load_camera_configs()`: ฟังก์ชันจาก `src` ที่ไปดึงการตั้งค่ากล้องทั้งหมดจาก JSON หรือ MSSQL 
- `source = cameras[0].source`: ดึงพารามิเตอร์ `source` (RTSP URL) ของกล้องตัวแรกสุดมาใช้งาน
- `if cameras else "0"`: หากหาไม่พบ ให้ใช้ `"0"` เป็นค่าเริ่มต้น (ซึ่งคือกล้อง WebCam ของคอมพิวเตอร์)

---

## 3. เปิดกล้องแบบ raw ด้วย `cv2.VideoCapture` (ก่อนเข้าคลาส)

ก่อนไปดูคลาส `CameraReader` ที่ระบบจริงใช้ ควรเห็นวิธีอ่านเฟรมแบบพื้นฐานที่สุดของ OpenCV ก่อน — เปิดกล้องตรง ๆ ด้วย `cv2.VideoCapture` ไม่มี Thread แยก ไม่มี auto-reconnect ใด ๆ

```python
def demo_bare_videocapture(source) -> None:
    logger.info("=== เปิดกล้องแบบ raw ด้วย cv2.VideoCapture (ไม่มี auto-reconnect) ===")

    cap = cv2.VideoCapture(source)
    # ลด buffer เหลือ 1 เฟรม ป้องกันภาพหน่วง (ไม่งั้นเฟรมเก่าจะค้างอยู่ใน buffer)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    if not cap.isOpened():
        logger.warning("เปิดกล้องแบบ raw ไม่สำเร็จ: %s", source)
        return

    for i in range(5):
        ok, frame = cap.read()
        if not ok:
            logger.warning("[raw] อ่านเฟรมที่ %d ไม่สำเร็จ", i + 1)
            continue
        logger.info("[raw] เฟรมที่ %d: ขนาด %s", i + 1, frame.shape)

        # cv2.imshow() ใช้ได้ปกติใน playground/ (ดู CLAUDE.md ข้อ 5)
        # เปิดคอมเมนต์ 2 บรรทัดด้านล่างถ้าอยากเห็นภาพจริงบนหน้าจอ (กด 'q' เพื่อออกก่อนครบ 5 เฟรม)
        # cv2.imshow("raw capture", frame)
        # if cv2.waitKey(1) & 0xFF == ord("q"):
        #     break

    cap.release()
    # cv2.destroyAllWindows()  # เปิดคอมเมนต์นี้คู่กับ cv2.imshow() ด้านบนเสมอ
    logger.info("ปิดกล้องแบบ raw แล้ว")
```

**คำอธิบายโค้ด (Line-by-Line):**
- `cv2.VideoCapture(source)`: เปิดกล้อง/วิดีโอ/RTSP ตรง ๆ ด้วย OpenCV เพียวๆ ไม่มีการห่อหุ้ม (wrap) ใด ๆ — นี่คือวิธีพื้นฐานที่สุดที่ทุกคลาสในโปรเจกต์ (รวมถึง `CameraReader`) ใช้อยู่ข้างใน
- `cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)`: บอก OpenCV ให้เก็บ buffer แค่ 1 เฟรม เพราะค่า default ของบาง backend จะสะสมเฟรมเก่าไว้ ทำให้ภาพที่อ่านได้ "ล่าช้า" กว่าเวลาจริง
- `cap.isOpened()`: เช็คว่ากล้องเปิดสำเร็จหรือไม่ก่อนเข้าลูปอ่านเฟรม
- `cap.read()`: คืนค่าเป็น tuple `(ok, frame)` — `ok` คือ `True/False` ว่าอ่านสำเร็จไหม, `frame` คือภาพ (จะเป็น `None` ถ้า `ok=False`)
- `cap.release()`: ปิดการเชื่อมต่อกล้อง **ต้องเรียกเสมอ** เมื่อใช้งานเสร็จ ไม่งั้นอาจมีปัญหากล้องถูกเครื่องอื่น/โปรเซสอื่นใช้ไม่ได้ (device busy)
- `cv2.imshow(...)` (คอมเมนต์ไว้): ถ้าอยากเห็นภาพจริงบนหน้าจอสามารถเปิดใช้ได้เลย เพราะ `cv2.imshow()` **อนุญาตใน `playground/`** (ห้ามใช้เฉพาะตอน deploy บน server ที่ไม่มีจอ/headless เท่านั้น — ดู CLAUDE.md ข้อ 5)

> **สังเกต:** ฟังก์ชันนี้ยังไม่มี auto-reconnect ถ้าสาย RTSP หลุดกลางทาง `cap.read()` จะคืน `ok=False` ไปเรื่อย ๆ โดยไม่พยายามเชื่อมต่อใหม่ให้เอง — นี่คือปัญหาที่คลาส `CameraReader` ในหัวข้อถัดไปถูกสร้างขึ้นมาแก้

---

## 4. การอ่านเฟรมภาพแบบ Background Thread (Production Class)

หัวใจสำคัญของการทำงานจริงในระบบคือคลาส `CameraReader` ซึ่งจะทำการอ่านภาพอย่างต่อเนื่องอยู่เบื้องหลัง (Thread แยก) และมี auto-reconnect ให้อัตโนมัติ — แก้ปัญหาที่ `cv2.VideoCapture` แบบ raw ด้านบนยังไม่มี

```python
    camera = CameraReader(source).start()

    try:
        for i in range(10):
            frame = camera.get_latest_frame()
            if frame is None:
                logger.info("ยังไม่มีเฟรม กำลังรอ...")
            else:
                logger.info("เฟรมที่ %d: ขนาด %s", i + 1, frame.shape)
            time.sleep(0.5)
    finally:
        camera.stop()
```

**คำอธิบายโค้ด (Line-by-Line):**
- `CameraReader(source).start()`: สร้างออบเจกต์ของคลาส `CameraReader` พร้อมส่งพารามิเตอร์ `source` เข้าไป และคำสั่ง `.start()` จะเป็นการสั่งให้มันเริ่มเปิดกล้องทำงานใน **Background Thread**
- `try: ... finally:`: เป็นโครงสร้างแบบควบคุมข้อผิดพลาด หากเกิดข้อผิดพลาดใด ๆ ขึ้นระหว่างรัน `try` ตัวโปรแกรมจะมั่นใจได้ว่าจะไปที่บล็อก `finally` เสมอ เพื่อสั่ง `camera.stop()` ปิดการเชื่อมต่อกล้องอย่างปลอดภัย
- `for i in range(10):`: สร้างลูปทำซ้ำ 10 รอบ เพื่อจำลองการทำงานดึงภาพมาประมวลผล
- `camera.get_latest_frame()`: ไปขอภาพ (Frame) เฟรมล่าสุดที่ CameraReader อ่านได้
- `if frame is None:`: ในจังหวะที่กล้องเพิ่งเชื่อมต่อ อาจจะยังไม่มีภาพส่งมาถึง ทำให้ได้ค่าเป็น None เราจึงต้องเช็คดักเอาไว้
- `frame.shape`: ออบเจกต์เฟรมของ OpenCV จริงๆ แล้วคืออาเรย์ (Numpy Array) คำสั่ง `.shape` จะคืนค่าขนาดความกว้าง ความสูง และจำนวนสี เช่น `(480, 640, 3)`
- `time.sleep(0.5)`: หน่วงเวลา 0.5 วินาทีในแต่ละรอบ เพื่อให้เห็นการทำงานช้าๆ

---

## การรันทดสอบ

1. เปิด Terminal
2. รันคำสั่งโดยใช้กล้องที่มีอยู่ในคอนฟิก:
```bash
python playground/02-opencv-camera/example.py
```
3. หรือรันคำสั่งโดยระบุเป็นกล้อง WebCam (เลข `0`):
```bash
python playground/02-opencv-camera/example.py 0
```
4. ผลลัพธ์ที่คาดหวังใน Console:

```text
INFO | เปิดกล้อง/วิดีโอจาก: 0
INFO | === เปิดกล้องแบบ raw ด้วย cv2.VideoCapture (ไม่มี auto-reconnect) ===
INFO | [raw] เฟรมที่ 1: ขนาด (480, 640, 3)
INFO | [raw] เฟรมที่ 2: ขนาด (480, 640, 3)
...
INFO | ปิดกล้องแบบ raw แล้ว
INFO | กำลังเชื่อมต่อกล้อง: 0
INFO | เชื่อมต่อกล้องสำเร็จ: 0
INFO | เฟรมที่ 1: ขนาด (480, 640, 3)
INFO | เฟรมที่ 2: ขนาด (480, 640, 3)
...
```
