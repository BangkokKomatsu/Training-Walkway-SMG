# Playground 09 — Unit Testing & AI Model Debugging

บทปฏิบัติการเรียนรู้การเขียนระบบทดสอบย่อยอัตโนมัติ (Unit Testing) และการปรับแต่งประสิทธิภาพคัดกรองโมเดล AI ในโปรเจกต์ Walkway Detection

---

## สารบัญไฟล์ภายในแล็บ
1. [test_helpers.py](file:///d:/Project_Thitiwut/Training-WalkWay-SMG/playground/09-unit-testing/test_helpers.py) — เรียนรู้วิธีการเขียนเทสให้ฟังก์ชันช่วยเหลือทั่วไป เช่น การหาจุดอ้างอิงและระยะห่าง bbox
2. [test_area_checker.py](file:///d:/Project_Thitiwut/Training-WalkWay-SMG/playground/09-unit-testing/test_area_checker.py) — เรียนรู้วิธีการเขียนเทสตรวจสอบเรขาคณิตของโพลิกอน (Point-in-Polygon)
3. [test_event_tracker.py](file:///d:/Project_Thitiwut/Training-WalkWay-SMG/playground/09-unit-testing/test_event_tracker.py) — เรียนรู้วิธีการเขียนเทสเงื่อนไขจับเวลา Dwell Time และ Cooldown (จำลองสถานการณ์เวลาหมุนไป)

---

## ขั้นตอนการติดตั้งและทดสอบ

1. **ติดตั้ง pytest:**
   หากยังไม่ได้ติดตั้ง ให้ติดตั้งผ่าน requirements หรือพิมพ์:
   ```bash
   pip install pytest
   ```

2. **สั่งรัน Unit Tests ทั้งหมด:**
   พิมพ์คำสั่งรันระบบทดสอบอัตโนมัติผ่าน Terminal จาก root ของโปรเจกต์:
   ```bash
   pytest playground/09-unit-testing/
   ```

3. **สั่งรันพร้อมแสดงรายละเอียดเพิ่มเติม (Verbose Mode):**
   ```bash
   pytest -v playground/09-unit-testing/
   ```
