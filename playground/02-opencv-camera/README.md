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

## 3. การอ่านเฟรมภาพแบบ Background Thread

หัวใจสำคัญของการทำงานคือคลาส `CameraReader` ซึ่งจะทำการอ่านภาพอย่างต่อเนื่องอยู่เบื้องหลัง

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
INFO | กำลังเชื่อมต่อกล้อง: 0
INFO | เชื่อมต่อกล้องสำเร็จ: 0
INFO | เฟรมที่ 1: ขนาด (480, 640, 3)
INFO | เฟรมที่ 2: ขนาด (480, 640, 3)
...
```
