# Walkway Detection System + Training Course

ระบบ AI ตรวจจับคนเดินเข้าพื้นที่อันตรายจากกล้อง CCTV (RTSP) — พร้อมคอร์สสอนตั้งแต่พื้นฐานจนใช้งานจริงได้

เป้าหมาย: ผู้เรียน (มือใหม่ ทั้ง IT และไม่ใช่ IT) เรียนจบแล้ว **เปลี่ยนแค่ค่า config ก็นำไปใช้กับระบบจริงได้ทันที**

---

## ระบบนี้ทำอะไร

อ่านวิดีโอจากกล้อง CCTV → ใช้ YOLO ตรวจจับ "คน" → เช็คว่าคนเดินเข้า **พื้นที่อันตราย (polygon)** หรือไม่ →
ถ้าอยู่ในพื้นที่นั้น **ต่อเนื่องเกิน 5 วินาที** → ตัดสินว่าเกิด **event** →
เซฟภาพไว้ที่ shared drive + บันทึกลงฐานข้อมูล MSSQL → แจ้งเตือนผ่าน Microsoft Teams และ Email →
ทุกคนดูผลย้อนหลัง/สถานะกล้องได้ผ่านเว็บ React (ไม่ต้องเปิดหน้าต่างที่เครื่อง server)

## Data Flow

```
CCTV (RTSP) → Python + OpenCV → YOLO (person detection)
  → Area Checker (polygon + dwell time 5 วิ)
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

```
config/         → โหลดค่าจาก .env, ตั้งค่า logging
src/camera/     → อ่านวิดีโอจากกล้อง RTSP + reconnect
src/detection/  → YOLO, ตรวจ polygon, ตัดสิน event
src/alert/      → แจ้งเตือน Teams / Email
src/database/   → เชื่อมต่อ MSSQL + เรียก Stored Procedure
src/storage/    → เซฟภาพลง shared drive
src/monitoring/ → รายงานสถานะสุขภาพระบบ
src/utils/      → logger และฟังก์ชันช่วยทั่วไป
sql/            → SQL script สร้าง schema/table/SP (ฝั่ง admin)
data-api/       → ตัวกลางบาง: รับ request → เรียก SP → คืน JSON
frontend/       → เว็บ React + Vite + Tailwind สำหรับ monitor ผล
docs/           → เอกสารคอร์ส (course-modules) และเอกสาร admin (admin-backend)
playground/     → ที่ฝึกของผู้เรียน (01-07)
assets/         → รูปตัวอย่าง (ไม่มีข้อมูลจริง)
main.py         → จุดเริ่มต้นโปรแกรมทั้งหมด
```

## เริ่มต้นใช้งาน (มือใหม่ทำตามได้)

### สิ่งที่ต้องมีก่อน
- Python 3.10+ และ pip
- กล้อง CCTV ที่รองรับ RTSP (หรือไฟล์วิดีโอตัวอย่างสำหรับฝึก)
- MSSQL Server/Express (สำหรับเฟสที่เชื่อม database)
- Node.js 18+ (สำหรับเฟส frontend/data-api)

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
   แล้วแก้ค่าในไฟล์ `.env` ให้ตรงกับของจริง (กล้อง, database, webhook, ฯลฯ)
   **ห้าม commit ไฟล์ `.env` ขึ้น Git**
5. **รันโปรแกรม:**
   ```bash
   python main.py
   ```
6. (เฟสถัดไป) ตั้งค่าฐานข้อมูล ดู `sql/` และรันเว็บ frontend ดู `frontend/` + `data-api/`

## คอร์สเรียน (เรียงตามเฟส)

โปรเจกต์นี้สร้างทีละเฟส อ้างอิงไฟล์ต่อไปนี้ (อ่าน `00_MASTER_CONTEXT.md` ก่อนเสมอ):

| เฟส | เนื้อหา | ไฟล์อ้างอิง |
|----|---------|------------|
| 0 | Scaffold โครงสร้างโปรเจกต์ | `PHASE_0_scaffold.md` |
| 1 | Python core: กล้อง + YOLO + พื้นที่อันตราย + ตัดสิน event | `PHASE_1_python_core.md` |
| 2 | SQL/Stored Procedure (ฝั่ง admin) | `PHASE_2_backend_sql.md` |
| 3 | เชื่อมต่อ DB + เซฟรูป + แจ้งเตือน Teams/Email | `PHASE_3_integration.md` |
| 4 | เว็บ React + data-api | `PHASE_4_frontend.md` |
| 5 | เอกสารคอร์สสำหรับผู้เรียน | `PHASE_5_course_docs.md` |

เนื้อหาคอร์สแบบเต็มสำหรับผู้เรียนอยู่ที่ [`docs/course-modules/`](docs/course-modules/)
เอกสารฝั่ง admin (ดูแลระบบเอง) อยู่ที่ [`docs/admin-backend/`](docs/admin-backend/)

## กฎสำคัญที่ต้องรู้ก่อนแก้โค้ด

ดู [`CLAUDE.md`](CLAUDE.md) สำหรับกฎประจำโปรเจกต์ทั้งหมด (ห้ามฮาร์ดโค้ด secret, ห้ามใช้ `cv2.imshow()`,
ใช้ parameterized SQL เท่านั้น, Teams ต้องผ่าน Power Automate Workflows ฟรี ฯลฯ)
# Training-Walkway-SMG
