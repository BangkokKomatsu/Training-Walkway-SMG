# Module 14 — Unit Testing และการวิเคราะห์ AI (Model Debugging)

> **ระดับ:** กลาง-สูง | **เวลาโดยประมาณ:** 60–90 นาที

---

## ส่วนที่ 1 — วัตถุประสงค์

เมื่อจบ module นี้ ผู้เรียนจะสามารถ:

- อธิบายความหมายและประโยชน์ของ Unit Testing ในระบบ AIoT ได้
- เขียนสคริปต์ทดสอบอัตโนมัติเบื้องต้นด้วยเฟรมเวิร์ก `pytest`
- ใช้เทคนิคการจำลองเวลา (Time Mocking) เพื่อทดสอบตรรกะแบบไม่ต้อง sleep จริง
- ดีบั๊กความแม่นยำของโมเดล AI และวิเคราะห์จัดการค่าผิดพลาด (False Positive / False Negative)

---

## ส่วนที่ 2 — สิ่งที่ต้องเตรียม

- ผ่าน Module 01–13
- ติดตั้ง `pytest` ใน virtual environment เรียบร้อยแล้ว (`pip install pytest`)
- เข้าใจตรรกะ Dwell Time และ Cooldown จาก Module 06

---

## ส่วนที่ 3 — คำอธิบายเข้าใจง่าย

### Unit Testing คืออะไร?
Unit Testing คือ **"เครื่องตรวจสอบโค้ดอัตโนมัติย่อย ๆ"** ที่ใช้เช็คว่าฟังก์ชันหรือโมดูลที่เราเขียนยังคงทำงานถูกต้องหรือไม่หลังจากที่เราไปแก้ไขส่วนอื่น ๆ ของระบบ ช่วยป้องกันไม่ให้เกิดปัญหา "แก้ส่วนหนึ่งแล้วพังอีกส่วนหนึ่งโดยไม่รู้ตัว" (Regression)

### ทำไมระบบ AIoT ต้องเทสด้วยวิธี Mock?
ระบบของเรามีส่วนประกอบที่ต้องดึงค่าภายนอก เช่น เวลาเครื่อง (`time.monotonic()`), การดึงภาพกล้อง RTSP, การเซฟรูป และการต่อฐานข้อมูล
- หากเราเขียนเทสเพื่อลองจับเวลา 5 วินาทีจริง ๆ คอมพิวเตอร์ต้องนอนหลับ `time.sleep(5)` จริง ทำให้ระบบเทสทำงานช้ามาก
- หากระบบอินเทอร์เน็ตล่ม เทสการส่งอีเมลหรือการแจ้งเตือน MS Teams ก็จะพังไปด้วย
- **การ Mock** คือการจำลองส่วนประกอบเหล่านั้นขึ้นมาเพื่อควบคุมผลลัพธ์ เช่น สั่งให้ระบบเวลาหลอกตอบว่าเวลาผ่านไปแล้ว 5 วินาทีทันที เพื่อเช็คตรรกะของฟังก์ชันประมวลผลได้อย่างรวดเร็ว

### การวิเคราะห์จัดการค่าผิดพลาดของ AI (Model Debugging)
เมื่อโมเดล AI ตรวจสอบภาพ อาจมีข้อผิดพลาด 2 รูปแบบหลัก:
1. **False Positive (แจ้งเตือนทั้งที่ไม่มีเหตุ):** AI เห็นเสาไฟ, ล้อรถ หรือสิ่งของต่าง ๆ แล้วเข้าใจผิดว่าเป็นคน (Detected as Person) ทำให้สัญญาณเตือนดังโดยใช่เหตุ
2. **False Negative (คนเดินเข้าเขตแต่ไม่เตือน):** AI มองข้ามคนไปเนื่องจากภาพมืด, มุมกล้องผิดเพี้ยน หรือเกิดการบดบัง (Occlusion) ทำให้ระบบไม่บันทึกความปลอดภัย

---

## ส่วนที่ 4 — Flow การทำงาน

```text
เขียนฟังก์ชันย่อย (Helper/Checker) ในโค้ดหลัก
         ↓
สร้างสคริปต์เทสในไฟล์ test_*.py
         ↓
รันคำสั่ง pytest เพื่อให้ระบบไล่กด Assert เช็คคำตอบ
         ↓
วิเคราะห์ผลลัพธ์ AI หน้างาน (รันจริง) -> ตรวจพบ False Alert
         ↓
ดีบั๊ก AI: ปรับ CONF_THRESHOLD หรือกำหนดกฎข้อยกเว้นพื้นที่บดบัง
```

---

## ส่วนที่ 5 — ตัวอย่าง Code และขั้นตอน

ดูโฟลเดอร์ปฏิบัติจริงที่: [playground/09-unit-testing/](../../playground/09-unit-testing/)

### 5.1 การเขียนเทสแบบเปรียบเทียบค่าทั่วไป
ในการเขียนเทสด้วย `pytest` เราจะใช้คีย์เวิร์ด `assert` เพื่อยืนยันคำตอบ หากคำตอบเป็นจริง เทสจะผ่าน (Pass) แต่หากเป็นเท็จ ระบบจะแจ้งเตือนความล้มเหลว (Fail)

```python
# ตัวอย่างใน test_helpers.py
from src.utils.helpers import get_bbox_bottom_center

def test_get_bbox_bottom_center():
    bbox = (100, 100, 200, 300)
    result = get_bbox_bottom_center(bbox)
    
    # ยืนยันว่าค่ากึ่งกลางคือ (100+200)/2 = 150.0 และขอบล่างคือ 300
    assert result == (150.0, 300)
```

### 5.2 การ Mock เวลา (Time Mocking)
ตัวอย่างการจำลองการจับเวลาของ `CameraEventTracker` โดยใช้ `patch` หลอกฟังก์ชัน `time.monotonic` ของระบบ:

```python
# ตัวอย่างใน test_event_tracker.py
from unittest.mock import patch
from src.detection.detection_service import CameraEventTracker

def test_tracker_dwell_time_trigger():
    tracker = CameraEventTracker(dwell_seconds=5, cooldown_seconds=60)
    
    with patch("time.monotonic") as mock_time:
        # วินาทีที่ 0.0: คนเดินเข้าเขตห้าม
        mock_time.return_value = 0.0
        assert tracker.update(person_in_zone=True) is False
        
        # วินาทีที่ 6.0: ผ่านไปแล้ว 6 วินาที (เกิน dwell_seconds) -> ระบบต้องคืนค่า True เพื่อยิงเตือน
        mock_time.return_value = 6.0
        assert tracker.update(person_in_zone=True) is True
```

### 5.3 วิธีดีบั๊กปรับปรุงค่าความผิดพลาดของ AI (Model Debugging)
กรณีรันระบบจริงแล้วกล้องเจอ False Alarm (เห็นขยะหรือแสงไฟเป็นคน):
- **วิธีที่ 1:** ปรับเพิ่มค่า `CONF_THRESHOLD` ใน `.env` เช่น จาก `0.5` เป็น `0.65` เพื่อบังคับให้ AI มั่นใจจริง ๆ เท่านั้นจึงจะแสดงกรอบ (แต่ระวัง: อาจทำให้ตรวจคนในที่มืดหรือไกล ๆ ได้ยากขึ้น)
- **วิธีที่ 2:** ตรวจพิกัดจุดเท้าที่เกิด False Alarm แล้วขยับโพลิกอนหลบพิกัดที่เกิดแสงสะท้อนบ่อยครั้ง
- **วิธีที่ 3 (Class Exclusion):** ละเว้นพิกัดบอดที่มีการขับขี่พาหนะ (เช่น การประยุกต์ใช้ Proximity Rule ระหว่างคนกับรถโฟล์คลิฟต์)

---

## ส่วนที่ 6 — แบบฝึกหัด

1. **ติดตั้งและรันเทส:** เปิด Terminal แล้วพิมพ์รัน `pytest playground/09-unit-testing/` สังเกตว่าเทสผ่านทั้งหมดกี่วินาที
2. **แก้ไขตรรกะให้พัง (Breaking Test):** ทดลองเปิดไฟล์ [helpers.py](../../src/utils/helpers.py) แล้วจงใจเปลี่ยนตรรกะในฟังก์ชัน `get_bbox_bottom_center` ให้หารผิด (เช่น เปลี่ยนจาก `/ 2` เป็น `/ 3`) จากนั้นสั่งรัน `pytest` และสังเกตข้อความแจ้งเตือนที่ฟ้องระบบเทสพัง
3. **เขียนเทสเพิ่ม:** เพิ่มฟังก์ชันเทส `test_is_boxes_close_boundary()` ใน [test_helpers.py](../../playground/09-unit-testing/test_helpers.py) เพื่อเช็คกรณีกล่องห่างกันพอดิบพอดีที่ 70 พิกเซลพอดี (Boundary Test)

---

## ส่วนที่ 7 — Checklist หลังเรียน

- [ ] สามารถสั่งรันคำสั่ง `pytest` บน Terminal ได้สำเร็จโดยไม่เกิด ImportError
- [ ] อธิบายความแตกต่างระหว่างตรรกะตรวจจับแบบปกติ กับตรรกะตรวจจับที่เพิ่มการ Mock ได้
- [ ] รู้วิธีการเขียนฟังก์ชันทดสอบโดยให้ชื่อฟังก์ชันมีคำนำหน้าว่า `test_`
- [ ] รู้วิธีจัดการ False Positive ด้วยการแก้ไขค่าปรับเกณฑ์ (CONF_THRESHOLD)

---

## ส่วนที่ 8 — Common Error + วิธีแก้

### Error: `ModuleNotFoundError: No module named 'src'`
**สาเหตุ:** ตัว Python รันหาโฟลเดอร์โมดูลหลักของระบบไม่เจอ
**วิธีแก้:** ตรวจสอบว่าในไฟล์เทสมีบรรทัดดึงสิทธิ์ Path หรือไม่:
```python
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
```

---

## ส่วนที่ 9 — คำถามท้ายบท

1. หากต้องการเทสตรรกะการ Insert ข้อมูลลงฐานข้อมูลแบบไม่บันทึกจริง ๆ ลงตารางฐานข้อมูล เราควรทำอย่างไร?
   *(แนวคำตอบ: ใช้การทำ Mocking Connection หรือใช้ Database Rollback/Transaction หรือการรันบนฐานข้อมูลสำหรับทดสอบ (Sandbox/Test Database))*
2. ข้อใดคือวิธีแก้ปัญหาเมื่อระบบแจ้งเตือน "คนเดินบุกรุก" บ่อยเกินไปเพราะแสงอาทิตย์สะท้อนแผ่นเหล็กบนพื้นโรงงาน?
   *(แนวคำตอบ: ปรับพิกัดโพลิกอนหลบจุดที่แสงสะท้อน หรือเพิ่มค่า dwell_seconds เพื่อป้องกันกรณีจุดแสงวูบผ่านหน้าจอเสี้ยววินาที)*

---

## ส่วนที่ 10 — ลิงก์อ่านเพิ่มเติม

- [pytest Documentation (ภาษาอังกฤษ)](https://docs.pytest.org/)
- [Mocking time.monotonic in Python Python](https://docs.python.org/3/library/unittest.mock.html)
- [Evaluating YOLO Models Performance Metrics](https://docs.ultralytics.com/modes/val/)
