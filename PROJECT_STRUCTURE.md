# Project Structure — Training-WalkWay-SMG

โครงสร้างไฟล์/โฟลเดอร์ของระบบตรวจจับคนเดินเข้าพื้นที่อันตรายด้วย AI แบบสมบูรณ์ (Production-Ready + Training Course)
โปรเจกต์นี้ถูกออกแบบตามหลัก Clean Architecture โดยแบ่งการทำงานแต่ละส่วนแยกจากกันอย่างชัดเจน

```text
Training-WalkWay-SMG/
├── 00_MASTER_CONTEXT.md          # บริบท/สถาปัตยกรรมรวมของทั้งระบบ
├── CLAUDE.md                      # กฎประจำโปรเจกต์
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
│   └── 06_sample_exec_commands.sql
│
├── data-api/                      # Backend API (Node.js) ให้บริการ Frontend
│   ├── server.js                  # ระบบ API ให้บริการและ JWT Authentication
│   └── README.md
│
├── frontend/                      # Web Dashboard (React + Vite + Tailwind)
│   ├── src/                       # หน้าต่างแสดงผล (Dashboard, Event, Monitoring)
│   └── README.md
│
├── docs/                          # เอกสารคู่มือของโปรเจกต์
│   ├── course-modules/            # บทเรียนสำหรับผู้ใช้งานและผู้ฝึกอบรม (13 บท)
│   ├── admin-backend/             # คู่มือสำหรับ Admin และ Database
│   └── code-overview.html         # หน้าเว็บแสดงแผนภาพและโฟลว์การทำงาน
│
├── playground/                    # พื้นที่ทดลองเขียนโค้ดและเรียนรู้แบบ Sandbox
│   ├── 01-python-basic/
│   ├── 02-opencv-camera/
│   ├── 03-yolo-detection/
│   ├── 04-area-detection/
│   ├── 05-mssql-database/
│   ├── 06-alerts-teams-email/
│   └── 07-frontend-ui/
│
├── assets/
│   └── sample-images/             # รูปตัวอย่างประกอบบทเรียน
│
└── Models/                        # โฟลเดอร์เก็บโมเดล AI (ต้องดาวน์โหลด/ใส่เอง)
    └── yolo11n.pt
```

## สถานะปัจจุบัน

- โครงสร้างและโค้ดของระบบพัฒนาเสร็จสมบูรณ์ร้อยเปอร์เซ็นต์
- บทเรียน, แบบฝึกหัดใน `playground/`, และคู่มือที่จำเป็นใน `docs/` ถูกเขียนอธิบายอย่างครบถ้วน
- พร้อมสำหรับการนำไป Deploy หรือใช้ฝึกอบรมบุคลากร (OJT) ต่อได้ทันที)
│   ├── 01-python-basic/           # variable, type, list/dict, if/else, loop, function, class, import, try/except, logging
│   │   └── README.md
│   ├── 02-opencv-camera/          # อ่าน RTSP/วิดีโอด้วย OpenCV
│   │   └── README.md
│   ├── 03-yolo-detection/         # ตรวจจับคนด้วย YOLO
│   │   └── README.md
│   ├── 04-area-detection/         # polygon + dwell time
│   │   └── README.md
│   ├── 05-mssql-database/         # เชื่อม MSSQL + insert ผ่าน SP
│   │   └── README.md
│   ├── 06-alerts-teams-email/     # Teams (Power Automate) + Email (SMTP M365)
│   │   └── README.md
│   └── 07-frontend-ui/            # React อ่านข้อมูลจาก data-api
│       └── README.md
│
├── assets/
│   └── sample-images/             # ตัวอย่างรูปภาพ (README อธิบายการใช้งาน)
│       └── README.md
│
├── Models/                        # ไฟล์โมเดล YOLO (.pt) — ห้าม commit ตาม CLAUDE.md §5
│   ├── BKC_PPE_Detection_V29-16-May.pt
│   ├── folklift_person_detect_v2.pt
│   └── yolo11n.pt
│
└── Final_WalkWay_Detection_GPU.py  # สคริปต์ต้นฉบับเดิม (legacy/reference)
```

## สถานะปัจจุบัน

- โครงสร้างหลัก (`config/`, `src/*`, `sql/`, `data-api/`, `frontend/`, `docs/`) ถูก scaffold ไว้ครบแล้ว
  แต่หลายไฟล์ยังเป็น README/placeholder รอเนื้อหาตามลำดับเฟสใน §8 ของ [CLAUDE.md](CLAUDE.md)
- โฟลเดอร์ `playground/01-07` ทุกโฟลเดอร์ตอนนี้มีแค่ `README.md` — ยังไม่มีไฟล์ตัวอย่าง/exercise ให้ผู้เรียนลองรัน
- `Models/*.pt` และ `*.pdf` มีอยู่ในเครื่องแต่ถูก ignore จาก git ตาม `.gitignore`
