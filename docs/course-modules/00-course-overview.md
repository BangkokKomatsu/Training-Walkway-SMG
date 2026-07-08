# ภาพรวมคอร์ส (Course Overview)

> เอกสารนี้สรุปภาพรวมทั้งคอร์สสำหรับใช้ประกอบการนำเสนอ/แนะนำคอร์ส (เช่น slide "Roadmap" ในคลาส 1 Orientation)
> ดูรายละเอียดแต่ละ Module เต็มได้ที่ [`docs/course-modules/README.md`](./README.md)

## เป้าหมายคอร์ส

**Walkway Detection System + Training Course** — สอนสร้างระบบ AI ตรวจจับคนเดิน/จักรยานเข้าพื้นที่อันตรายจาก CCTV
อ่าน RTSP → YOLO ตรวจจับ → เช็ค polygon พื้นที่อันตราย → ตัดสิน event → เซฟรูป + log ลง MSSQL → แจ้งเตือน Teams/Email → ดูผลผ่านเว็บ React

**เรียนจบแล้วผู้เรียนจะทำอะไรได้:** เปลี่ยนแค่ค่า config (`.env`, กล้อง, พื้นที่อันตราย) ก็นำระบบไปใช้งานจริงกับกล้อง CCTV ของตัวเองได้ทันที ไม่ต้องเขียนโค้ดใหม่ทั้งหมด

## กลุ่มผู้เรียน

คอร์สออกแบบมาสำหรับผู้เรียนพื้นฐานหลากหลาย — ทั้งสายที่ไม่ใช่ IT และสาย IT support ไม่จำเป็นต้องเขียนโค้ดมาก่อน (Module 02 ปูพื้นฐาน Python ให้)

## Data Flow ของระบบ (ภาพรวมที่ทุก Module อ้างอิงกลับมา)

```text
CCTV (RTSP) → Python+OpenCV → YOLO(person+bicycle) → Area Checker(polygon+dwell)
  → Event Logic(+cooldown) → เซฟรูป Shared Drive → Insert MSSQL (ผ่าน SP)
  → Teams + Email → React อ่านจาก MSSQL (ผ่าน SP) → ผู้ใช้ monitor
```

## Roadmap 14 Modules

| # | Module | สรุปสั้น |
|---|--------|----------|
| 01 | เตรียมเครื่องและ Environment | ติดตั้ง Python, VS Code, venv, library, `.env` |
| 02 | Python พื้นฐานสำหรับงาน AI | variable/type, list/dict, if/loop, function, class, try/except, logging |
| 03 | โครงสร้างโปรเจกต์ (Clean Architecture) | จัดโฟลเดอร์โปรเจกต์ตาม `src/`, `config/`, การแยกความรับผิดชอบแต่ละโมดูล |
| 04 | OpenCV ดึงภาพจากกล้อง RTSP/Video | อ่านภาพจากกล้อง, reconnect, พื้นฐาน OpenCV |
| 05 | AI ตรวจจับคนด้วย YOLO11 | โหลดโมเดล `yolo11n.pt`, ตรวจจับ person/bicycle, อ่านค่า bbox/confidence |
| 06 | พื้นที่อันตราย (Polygon) และนับเวลา (Dwell) | เช็คจุดอยู่ใน polygon, dwell timer, ตัดสิน event + cooldown |
| 07 | ต่อ Database MSSQL และ Stored Procedure | `pyodbc`, เรียก SP, บันทึก event ลง MSSQL |
| 08 | เซฟรูปภาพลง Shared Drive | จัดโฟลเดอร์เก็บรูปตาม company/camera/วันที่ |
| 09 | แจ้งเตือน Teams และ Email | Power Automate webhook, SMTP M365, Graph API |
| 10 | React + Vite + Tailwind Frontend | สร้างเว็บ dashboard อ่านข้อมูลผ่าน `data-api` |
| 11 | ใช้งานเว็บ Monitor ระบบ | ใช้งานหน้าเว็บที่สร้างเสร็จ, ดู event/รูปภาพ |
| 12 | CPU/GPU Performance Tuning | ปรับความเร็วรันโมเดลบน CPU/GPU |
| 13 | Final Project: ประกอบทุกส่วนเป็นระบบจริง | เชื่อมทุกส่วนที่เรียนมาให้ทำงานเป็นระบบเดียวจริง |
| 14 | Unit Testing และการวิเคราะห์ AI (Model Debugging) | เขียนเทส, debug โมเดล/pipeline |

## แนวทางการเรียน (Learning Path)

- **Module 01–02** เป็นพื้นฐานบังคับก่อนเริ่ม Module อื่นทั้งหมด (environment + Python)
- **Module 03–08** เรียงตาม Data Flow จริงของระบบ (กล้อง → AI → ตัดสิน event → เก็บข้อมูล/รูป)
- **Module 09–11** ต่อยอดเป็นฝั่งแจ้งเตือนและ frontend — ทำคู่ขนานกับฝั่ง Python ได้ถ้ามีทีม
- **Module 12, 14** เป็นหัวข้อเสริมความลึก (performance, testing) ทำหลัง core pipeline ทำงานได้แล้ว
- **Module 13** คือ capstone — ใช้ยืนยันว่าทุกส่วนที่เรียนมาประกอบกันเป็นระบบทำงานจริงได้
