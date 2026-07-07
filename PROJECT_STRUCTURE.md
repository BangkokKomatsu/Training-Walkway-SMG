# Project Structure — Training-WalkWay-SMG

โครงสร้างไฟล์/โฟลเดอร์ของระบบตรวจจับคนเดินเข้าพื้นที่อันตรายด้วย AI แบบสมบูรณ์ (Production-Ready + Training Course)
โปรเจกต์นี้ถูกออกแบบตามหลัก Clean Architecture โดยแบ่งการทำงานแต่ละส่วนแยกจากกันอย่างชัดเจน

```text
Training-WalkWay-SMG/
├── CLAUDE.md                      # กฎประจำโปรเจกต์ (local only — ไม่ commit ขึ้น Git)
├── README.md                      # อธิบายการเริ่มต้นใช้งานระบบ
├── PROJECT_STRUCTURE.md           # ไฟล์อธิบายโครงสร้าง (ไฟล์นี้)
├── main.py                        # จุดเริ่มต้นของระบบ Python ตรวจจับ AI
├── requirements.txt               # รายการ Dependencies สำหรับ Python
├── .env.example                   # ตัวอย่างไฟล์ตั้งค่า (นำไปสร้างเป็น .env)
├── .gitignore
│
├── config/                        # จัดการการตั้งค่า .env, logging และกล้อง
│   ├── cameras.json               # ค่าพิกัดพื้นที่อันตราย (Polygon) และ RTSP ของกล้อง
│   ├── logging_config.py
│   └── settings.py
│
├── src/                           # Source Code หลัก (ระบบ Detection)
│   ├── camera/                    # ระบบดึงภาพจาก RTSP Stream
│   │   ├── camera_config.py
│   │   └── camera_reader.py
│   ├── detection/                 # ระบบ AI ประมวลผลภาพ
│   │   ├── area_checker.py        # คำนวณ Point in Polygon
│   │   ├── detection_service.py   # ระบบควบคุม Flow หลักและจับเวลา Dwell
│   │   └── yolo_detector.py       # โหลดและรัน YOLO11 Model
│   ├── alert/                     # ระบบแจ้งเตือนไปยังภายนอก
│   │   ├── email_alert.py         # ส่งผ่าน SMTP
│   │   └── teams_alert.py         # ส่งผ่าน Webhook
│   ├── storage/                   # ระบบจัดเก็บหลักฐาน
│   │   └── image_storage.py       # บันทึกรูปลง Shared Drive
│   ├── database/                  # ระบบบันทึกข้อมูล (SQL Server)
│   │   ├── detection_repository.py
│   │   └── mssql_connection.py
│   ├── monitoring/                # ระบบตรวจสอบสุขภาพการทำงาน
│   │   └── health_reporter.py
│   └── utils/                     # เครื่องมือช่วยเหลือทั่วไป
│       ├── helpers.py
│       └── logger.py
│
├── sql/                           # ไฟล์สำหรับผู้ดูแลระบบ Database (Admin)
│   ├── 01_create_schema.sql
│   ├── 02_create_tables.sql
│   ├── 03_create_indexes.sql
│   ├── 04_create_stored_procedures.sql
│   ├── 05_insert_sample_data.sql
│   ├── 06_sample_exec_commands.sql
│   ├── 07_api_key_and_login_security.sql   # ตาราง/SP สำหรับ API Key + login security
│   └── 08_seed_api_keys.sql                # seed ตัวอย่าง API Key
│
├── data-api/                      # Backend API (Node.js) ให้บริการ Frontend
│   ├── server.js                  # ระบบ API ให้บริการและ JWT Authentication
│   ├── db.js                      # การเชื่อมต่อ MSSQL (connection pool)
│   ├── package.json
│   ├── .env.example
│   └── README.md
│
├── frontend/                      # Web Dashboard (React + Vite + Tailwind)
│   ├── src/
│   │   ├── components/            # UI components (รวม components/ui, components/layout)
│   │   ├── context/                # AuthContext (จัดการ JWT/company state)
│   │   ├── hooks/
│   │   ├── pages/                 # หน้าต่าง ๆ (Dashboard, Event, Monitoring, ...)
│   │   ├── services/               # เรียก data-api (api.js)
│   │   └── utils/
│   └── README.md
│
├── docs/                          # เอกสารคู่มือของโปรเจกต์
│   ├── course-modules/            # บทเรียนสำหรับผู้ใช้งานและผู้ฝึกอบรม (14 บท, 01-14)
│   ├── course-slides/             # สไลด์ประกอบบทเรียน (.pptx บางโมดูล)
│   ├── admin-backend/             # คู่มือสำหรับ Admin และ Database
│   └── code-overview.html         # หน้าเว็บแสดงแผนภาพและโฟลว์การทำงาน
│
├── playground/                    # พื้นที่ทดลองเขียนโค้ดและเรียนรู้แบบ Sandbox (01-09)
│   ├── 01-python-basic/
│   ├── 02-opencv-camera/
│   ├── 03-yolo-detection/
│   ├── 04-area-detection/
│   ├── 05-mssql-database/
│   ├── 06-alerts-teams-email/
│   ├── 07-frontend-ui/
│   ├── 08-image-storage/
│   └── 09-unit-testing/
│
├── assets/
│   └── sample-images/             # รูปตัวอย่างประกอบบทเรียน
│
├── Models/                        # โฟลเดอร์เก็บโมเดล AI (.pt) — ห้าม commit ตาม CLAUDE.md §5
│   └── yolo11n.pt                 # ดาวน์โหลด/ใส่เอง ดูวิธีใน Module 05
│
└── Final_WalkWay_Detection_GPU.py  # สคริปต์ต้นฉบับเดิม (legacy/reference, ใช้ cvzone) — ไม่ใช่ production path
```

## สถานะปัจจุบัน

- โครงสร้างและโค้ดหลักของระบบ (`config/`, `src/*`, `sql/`, `data-api/`, `frontend/`) พัฒนาเสร็จและใช้งานได้ครบ flow
- บทเรียนใน `docs/course-modules/` (14 โมดูล) และคู่มือ admin ใน `docs/admin-backend/` เขียนอธิบายครบถ้วน
- `playground/01-09` มีทั้ง README/lab instructions และไฟล์ตัวอย่างให้ผู้เรียนฝึกรัน
- `Models/*.pt` มีอยู่ในเครื่องแต่ถูก ignore จาก git ตาม `.gitignore` (ต้องดาวน์โหลด/คัดลอกเองตามคู่มือ)
- `CLAUDE.md` เก็บไว้ใช้งานในเครื่อง (local) เท่านั้น ไม่ commit ขึ้น Git ตาม `.gitignore`
