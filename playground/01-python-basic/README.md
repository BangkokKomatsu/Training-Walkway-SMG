---
lab:
    title: '01 - Python Basic (Playground)'
    description: 'เรียนรู้พื้นฐานของภาษา Python เช่น ตัวแปร, โครงสร้างข้อมูล, เงื่อนไข, ลูป, และการจัดการข้อผิดพลาด'
---

# 01 - Python Basic (Playground)

ในบทเรียนนี้ คุณจะได้เรียนรู้และทบทวนพื้นฐานที่สำคัญของภาษา Python ซึ่งเป็นโครงสร้างหลักที่ใช้ในการพัฒนาระบบ Walkway Safety Monitor เช่น การประกาศตัวแปร (Variables), ประเภทข้อมูล (Data Types), เงื่อนไข (If-else), ลูป (Loops), และการจัดการข้อผิดพลาด (Try-Except)

ระยะเวลาที่ใช้: ประมาณ **15** นาที

## Prerequisites
- ติดตั้ง Python สำเร็จแล้ว

---

## 1. การตั้งค่าเริ่มต้นและการ Import (Import & Setup)

เราเริ่มต้นด้วยการนำเข้าโมดูล (Import) ที่จำเป็น และการตั้งค่าภาษาไทยใน Console เพื่อไม่ให้การแสดงผลข้อความภาษาไทยเพี้ยนใน Windows

```python
import logging
import sys

from helpers_example import Counter, greet  # import ข้ามไฟล์ (โฟลเดอร์เดียวกัน)

# Windows console ใช้ cp1252 เป็น default ทำให้ print/log ภาษาไทยพัง -> บังคับเป็น UTF-8
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

logging.basicConfig(level=logging.INFO, format="%(levelname)s | %(message)s")
logger = logging.getLogger(__name__)
```

**คำอธิบายโค้ด (Line-by-Line):**
- `import logging`: นำเข้าโมดูล `logging` ซึ่งใช้สำหรับพิมพ์ข้อความแจ้งเตือนหรือสถานะการทำงาน แทนการใช้ `print()` ธรรมดา 
- `import sys`: นำเข้าโมดูลสำหรับการโต้ตอบกับตัวแปรและฟังก์ชันที่เกี่ยวข้องกับระบบ (System-specific)
- `from helpers_example import Counter, greet`: ดึงคลาส `Counter` และฟังก์ชัน `greet` มาจากไฟล์ `helpers_example.py` ที่อยู่ในโฟลเดอร์เดียวกัน เพื่อสาธิตการใช้โค้ดร่วมกันหลายไฟล์
- `if hasattr(sys.stdout, "reconfigure"):`: โค้ดส่วนนี้เป็นเทคนิคแก้ไขปัญหาการแสดงผลภาษาไทยบน Windows (ซึ่งปกติมักเข้ารหัสผิด) โดยบังคับให้ Console ใช้ระบบ `utf-8` ในการแสดงผล
- `logging.basicConfig(...)`: กำหนดรูปแบบการแสดงผลของระบบ Logging ให้แสดงในระดับ `INFO` (สถานะทั่วไป) ขึ้นไป
- `logger = logging.getLogger(__name__)`: สร้างตัวแปร `logger` เพื่อใช้สำหรับเขียน log ตลอดโปรแกรมนี้

---

## 2. ตัวแปรและประเภทข้อมูล (Variables & Types)

จุดเริ่มต้นของฟังก์ชัน `main()` จะทำการสาธิตการสร้างตัวแปรและการเช็คประเภทข้อมูล (Type)

```python
def main() -> None:
    # ---- variable & type ----
    camera_no = 1                # int
    camera_name = "Camera-1"     # str
    confidence = 0.87            # float

    logger.info("camera_no=%s (type=%s)", camera_no, type(camera_no).__name__)
    logger.info("confidence=%s (type=%s)", confidence, type(confidence).__name__)
```

**คำอธิบายโค้ด (Line-by-Line):**
- `def main() -> None:`: นิยามฟังก์ชันหลักชื่อ `main` ที่ไม่ส่งค่าใดๆ กลับ (Returns `None`)
- `camera_no = 1`: กำหนดให้ตัวแปร `camera_no` มีค่าเป็น 1 (เป็นข้อมูลประเภทจำนวนเต็ม - Integer/`int`)
- `camera_name = "Camera-1"`: กำหนดให้ `camera_name` เก็บข้อความอักษร (String/`str`)
- `confidence = 0.87`: เก็บค่าความแม่นยำ ซึ่งมีจุดทศนิยม (Float/`float`)
- `type(camera_no).__name__`: คำสั่ง `type()` จะคืนค่าประเภทของตัวแปรนั้นออกมา เพื่อให้เราทราบว่าเป็น `int`, `str` หรือ `float`

---

## 3. โครงสร้างข้อมูล List และ Dictionary

การใช้งาน List (สำหรับเก็บรายการเรียงตามลำดับ) และ Dictionary (สำหรับเก็บข้อมูลแบบ Key-Value)

```python
    # ---- list / dict ----
    detected_classes = ["person", "person", "forklift"]
    detection_summary = {"person": 0, "forklift": 0}

    for cls in detected_classes:
        detection_summary[cls] += 1

    logger.info("สรุปจำนวนที่ตรวจจับได้: %s", detection_summary)
```

**คำอธิบายโค้ด (Line-by-Line):**
- `detected_classes = [...]`: สร้างตัวแปรประเภท List (อาเรย์) เพื่อจำลองผลลัพธ์ว่าตรวจจับอะไรได้บ้างในภาพ
- `detection_summary = {...}`: สร้างตัวแปรประเภท Dictionary เพื่อใช้เก็บสถิติผลลัพธ์ (คีย์คือชื่อคลาส, ค่าคือตัวเลขจำนวน)
- `for cls in detected_classes:`: ลูป `for` จะดึงค่าออกจาก List ทีละ 1 ตัวมาไว้ในตัวแปร `cls`
- `detection_summary[cls] += 1`: นำชื่อที่จับได้ไปใช้เป็น Key ของ Dictionary แล้วบวกค่าเพิ่มไปทีละ 1 

---

## 4. เงื่อนไข If-Else (Conditionals)

ตรวจสอบผลรวมที่นับได้จาก Dictionary เพื่อตัดสินใจว่าจะแสดงข้อความแบบไหน

```python
    # ---- if / else ----
    if detection_summary["person"] > 0:
        logger.info("พบคนในภาพ %d คน", detection_summary["person"])
    else:
        logger.info("ไม่พบคนในภาพ")
```

**คำอธิบายโค้ด (Line-by-Line):**
- `if detection_summary["person"] > 0:`: คำสั่งตรวจสอบเงื่อนไข หากค่าจำนวนที่เก็บอยู่ในคีย์ `person` มากกว่า 0 ให้ทำในบล็อกคำสั่งต่อไป
- `logger.info(...)`: สั่งพิมพ์รายงานผลลัพธ์ลงบน Console
- `else:`: หากเงื่อนไขใน `if` ด้านบนไม่เป็นความจริง (ก็คือไม่มีคนเลย หรือเป็น 0) ระบบจะข้ามมาทำงานในส่วนนี้แทน

---

## 5. การใช้ฟังก์ชันและคลาส (Functions & Classes)

เรียกใช้โมดูลที่ Import มาจากไฟล์อื่น (`helpers_example.py`)

```python
    # ---- function ----
    print(greet(camera_name))

    # ---- class (import ข้ามไฟล์จาก helpers_example.py) ----
    counter = Counter()
    for _ in detected_classes:
        counter.increment()
    logger.info("Counter นับได้ %d ครั้ง", counter.count)
```

**คำอธิบายโค้ด (Line-by-Line):**
- `greet(camera_name)`: โยนตัวแปร String เข้าไปในฟังก์ชัน `greet()` เพื่อให้คืนค่าคำทักทายออกมา จากนั้นจึงสั่ง `print()` พิมพ์ออกหน้าจอ
- `counter = Counter()`: เป็นการสร้าง **ออบเจกต์ (Object)** จากคลาส (Class) `Counter` ที่เรา Import เข้ามา
- `for _ in detected_classes:`: ทำการวนลูป (ใช้ `_` แทนตัวแปรที่ไม่ได้นำไปใช้)
- `counter.increment()`: สั่งให้ออบเจกต์เพิ่มจำนวนตัวเลขขึ้นทีละ 1 ทุกครั้งที่มีการวนลูป
- `counter.count`: ดึงผลลัพธ์ (Property) ตัวเลขสุดท้ายของออบเจกต์ออกมาแสดง

---

## 6. การจัดการข้อผิดพลาด (Try / Except)

การใช้ระบบ Try/Except เพื่อป้องกันโปรแกรมล่ม (Crash) เมื่อเจอข้อมูลที่ไม่คาดคิด

```python
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
```

**คำอธิบายโค้ด (Line-by-Line):**
- `raw_values = [...]`: ตัวอย่างข้อมูลที่มีทั้งข้อความที่แปลงเป็นตัวเลขได้ (`"0.5"`) และไม่ได้ (`"not_a_number"`)
- `try:`: บอกให้ Python ลองทำคำสั่งในบล็อกนี้ดู
- `valid_confidences.append(float(raw))`: พยายามแปลง String (`raw`) ให้เป็น Float ถ้าทำได้ จะเพิ่มเข้าไปใน List (`valid_confidences`)
- `except ValueError:`: ถ้าการแปลง `float()` เกิดความผิดพลาด (เพราะข้อความเป็นตัวอักษร) โปรแกรมจะกระโดดมาที่นี่แทนที่จะแครช
- `logger.warning(...)`: พิมพ์ข้อความเตือนว่าเจอปัญหา แต่โปรแกรมจะยังคงเดินหน้าลูปต่อไป
- `if __name__ == "__main__":`: เป็นรูปแบบมาตรฐานของไฟล์ Python แปลว่า "หากถูกรันโดยตรงผ่าน Terminal (ไม่ได้ถูกนำไป import ในไฟล์อื่น) ให้รันฟังก์ชัน `main()`"

---

## การรันทดสอบ

1. เปิด Terminal (เช่น Command Prompt, PowerShell หรือ VS Code Terminal)
2. พิมพ์คำสั่งด้านล่างเพื่อรันสคริปต์
```bash
python playground/01-python-basic/example.py
```
3. หากสำเร็จ คุณจะเห็นผลลัพธ์ดังนี้ใน Console ของคุณ:
```text
INFO | camera_no=1 (type=int)
INFO | confidence=0.87 (type=float)
INFO | สรุปจำนวนที่ตรวจจับได้: {'person': 2, 'forklift': 1}
INFO | พบคนในภาพ 2 คน
Hello from Camera-1!
INFO | Counter นับได้ 3 ครั้ง
WARNING | ค่า 'not_a_number' ไม่ใช่ตัวเลข - ข้ามไป
INFO | ค่า confidence ที่ใช้ได้: [0.5, 0.9]
```
