# Walkway Detection System + Training Course

ระบบ AI ตรวจจับคนเดินเข้าพื้นที่อันตรายจากกล้อง CCTV (RTSP) — พร้อมคอร์สสอนตั้งแต่พื้นฐานจนใช้งานจริงได้

เป้าหมาย: ผู้เรียน (มือใหม่ ทั้ง IT และไม่ใช่ IT) เรียนจบแล้ว **เปลี่ยนแค่ค่า config ก็นำไปใช้กับระบบจริงได้ทันที**

---

## ระบบนี้ทำอะไร

อ่านวิดีโอจากกล้อง CCTV → ใช้ YOLO ตรวจจับ "คน" → เช็คว่าคนเดินเข้า **พื้นที่อันตราย (polygon)** หรือไม่ →
ถ้าอยู่ในพื้นที่นั้น **ต่อเนื่องเกินกว่าเวลาที่กำหนด (Dwell Time)** → ตัดสินว่าเกิด **event** →
เซฟภาพไว้ที่ shared drive + บันทึกลงฐานข้อมูล MSSQL → แจ้งเตือนผ่าน Microsoft Teams และ Email →
ทุกคนดูผลย้อนหลัง/สถานะกล้องได้ผ่านเว็บ React (ไม่ต้องเปิดหน้าต่างที่เครื่อง server)

## Data Flow

```text
CCTV (RTSP) → Python + OpenCV → YOLO (person detection)
  → Area Checker (polygon + dwell time)
  → Event Logic (+ cooldown กันแจ้งซ้ำ)
  → เซฟรูป Shared Drive
  → Insert Event ลง MSSQL (ผ่าน Stored Procedure)
  → แจ้งเตือน Teams + Email
  → data-api (ตัวกลางบาง) → เว็บ React อ่านข้อมูลจาก MSSQL (ผ่าน SP)
  → ผู้ใช้ monitor ผลผ่านเว็บ
```

> **สำคัญ:** ฝั่ง Python (เก็บ/วิเคราะห์ข้อมูล) และฝั่งเว็บ (แสดงผล) **ไม่คุยกันตรง ๆ** —
> สื่อสารผ่านฐานข้อมูล MSSQL เป็นศูนย์กลางเท่านั้น

## โครงสร้างโปรเจกต์

ระบบถูกออกแบบในลักษณะ Clean Architecture แยกส่วนชัดเจน (ดูรายละเอียดที่ `PROJECT_STRUCTURE.md`)

```text
config/         → โหลดค่าจาก .env, ตั้งค่า cameras.json, logging
src/camera/     → อ่านวิดีโอจากกล้อง RTSP + reconnect
src/detection/  → YOLO, ตรวจ polygon, ตัดสิน event
src/alert/      → แจ้งเตือน Teams / Email
src/database/   → เชื่อมต่อ MSSQL + เรียก Stored Procedure
src/storage/    → เซฟภาพลง shared drive
src/monitoring/ → รายงานสถานะสุขภาพระบบ
src/utils/      → logger และฟังก์ชันช่วยทั่วไป
sql/            → SQL script สร้าง schema/table/SP (ฝั่ง admin)
data-api/       → Backend Node.js API (ใช้ JWT Auth) สำหรับ Frontend
frontend/       → เว็บ React + Vite + Tailwind สำหรับ monitor ผล
docs/           → เอกสารคอร์ส (course-modules) และเอกสาร admin (admin-backend)
playground/     → ที่ฝึกของผู้เรียน (01-07) สำหรับฝึกเขียนโค้ด
main.py         → จุดเริ่มต้นโปรแกรม Detection ฝั่ง Python
```

## เริ่มต้นใช้งาน (มือใหม่ทำตามได้)

### สิ่งที่ต้องมีก่อน
- Python 3.10+ และ pip
- กล้อง CCTV ที่รองรับ RTSP (หรือใช้ไฟล์วิดีโอทดสอบ)
- MSSQL Server/Express (สำหรับระบบฐานข้อมูล)
- Node.js 18+ (สำหรับ API และ Frontend)

### ขั้นตอน
1. **Clone โปรเจกต์** แล้วเข้าโฟลเดอร์นี้
2. **สร้าง virtual environment** (แนะนำ):
   ```bash
   python -m venv venv
   venv\Scripts\activate        # Windows
   ```
3. **ติดตั้ง dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
4. **สร้างไฟล์ `.env`** จากตัวอย่าง:
   ```bash
   copy .env.example .env
   ```
   จากนั้นแก้ไขค่าในไฟล์ `.env` ให้ตรงกับระบบจริง (เช่น ค่า MSSQL, Teams Webhook, รหัสอีเมล)
   **ห้าม commit ไฟล์ `.env` ขึ้น Git เด็ดขาด**
5. **ตั้งค่ากล้องใน `config/cameras.json`:**
   ไฟล์นี้ใช้สำหรับตั้งค่ารายชื่อกล้องและกำหนด **พื้นที่อันตราย (Danger Zone)** คุณสามารถเปิดไฟล์นี้ขึ้นมาแก้ไขได้เลย:
   - `camera_no`: รหัสกล้อง (เช่น `CAM-01`)
   - `rtsp_url`: RTSP URL หรือพาธวิดีโอ (เช่น `rtsp://admin:pass@ip/stream` หรือ `0` สำหรับกล้องเว็บแคม)
   - `danger_zones`: กำหนดพิกัดโพลิกอน (Polygon) บนหน้าจอของพื้นที่อันตราย เช่น `[[100, 200], [500, 200], [500, 600], [100, 600]]` (หากคนเข้าไปในโซนนี้จะนับเวลาเพื่อเกิด Event)
   
6. **รันโปรแกรมระบบตรวจจับ (Python):**
   เปิด Terminal และพิมพ์คำสั่งนี้เพื่อเริ่มระบบวิเคราะห์วิดีโอ (ทำงานเบื้องหลัง):
   ```bash
   python main.py
   ```
   
7. **รันระบบ Backend (Data API) และ Frontend (Web Dashboard):**
   ในระบบของเรา Data API (Node.js) จะทำหน้าที่เป็นตัวกลางในการดึงข้อมูลจาก SQL มาแสดงให้หน้าเว็บอย่างปลอดภัย:
   - **ตั้งค่าฐานข้อมูล (ถ้ายังไม่ทำ):** รันสคริปต์ในโฟลเดอร์ `sql/` เรียงตามลำดับ 01-04
   - **เปิดการทำงาน Data API:**
     เปิด Terminal ใหม่ > พิมพ์ `cd data-api` > `npm install` > `npm run dev` (API จะรันที่พอร์ต 3001)
     *หมายเหตุ: ข้อมูลใน API จะถูกปกป้องด้วย JWT Authentication เสมอ*
   - **เปิดการทำงาน Frontend Dashboard:**
     เปิด Terminal ใหม่ > พิมพ์ `cd frontend` > `npm install` > `npm run dev`
     เมื่อรันเสร็จแล้ว คุณสามารถเข้าดูระบบผ่าน Browser ที่ http://localhost:5173

## คอร์สเรียนและคู่มือ

ระบบนี้มาพร้อมกับเอกสารบทเรียนและแบบฝึกหัดสำหรับ OJT (On-the-Job Training):
- **สำหรับผู้เรียน:** เปิดดูที่ [`docs/course-modules/`](docs/course-modules/) ซึ่งมีบทเรียน 13 โมดูลและแบบฝึกหัดใน `playground/`
- **สำหรับผู้ดูแลระบบ:** เปิดดูที่ [`docs/admin-backend/`](docs/admin-backend/) สำหรับการจัดการฐานข้อมูลและ API
- **ดูภาพรวมโค้ดแบบแผนภาพ:** เปิดไฟล์ [`docs/code-overview.html`](docs/code-overview.html) ในเว็บบราวเซอร์ของคุณ

## กฎสำคัญที่ต้องรู้ก่อนแก้โค้ด

ดู [`CLAUDE.md`](CLAUDE.md) สำหรับกฎประจำโปรเจกต์ทั้งหมด (ห้ามฮาร์ดโค้ด secret, ห้ามใช้ `cv2.imshow()`,
ใช้ parameterized SQL เท่านั้น, Teams ต้องผ่าน Power Automate Workflows ฟรี ฯลฯ)
