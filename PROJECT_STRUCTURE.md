# Project Structure — Training-WalkWay-SMG

โครงสร้างไฟล์/โฟลเดอร์ปัจจุบันของ repo นี้ (อัปเดตล่าสุดตามสภาพไฟล์จริง)
ดูคำอธิบายภาพรวมของแต่ละโฟลเดอร์ได้ที่ [CLAUDE.md](CLAUDE.md) §3 และรายละเอียดทั้งระบบที่ [00_MASTER_CONTEXT.md](00_MASTER_CONTEXT.md)

```
Training-WalkWay-SMG/
├── 00_MASTER_CONTEXT.md          # บริบท/สถาปัตยกรรมรวมของทั้งระบบ
├── CLAUDE.md                      # กฎประจำโปรเจกต์สำหรับ AI agent
├── PHASE_0_scaffold.md            # แผนงานเฟส 0: scaffold โปรเจกต์
├── PHASE_1_python_core.md         # แผนงานเฟส 1: python core (camera/detection/alert/storage)
├── PHASE_2_backend_sql.md         # แผนงานเฟส 2: SQL schema + stored procedures
├── PHASE_3_integration.md         # แผนงานเฟส 3: เชื่อม python + db + alert
├── PHASE_4_frontend.md            # แผนงานเฟส 4: data-api + frontend
├── PHASE_5_course_docs.md         # แผนงานเฟส 5: เอกสารคอร์ส/playground
├── README.md                      # README หลักของโปรเจกต์
├── main.py                        # entry point เดียวของระบบ python
├── requirements.txt               # python dependencies
├── .env.example                   # ตัวอย่างไฟล์ config (ห้าม commit .env จริง)
├── .gitignore
├── AI Walkway Detection OJT Program (1).pdf
├── AI Walkway Detection OJT Program (2).pdf
│
├── config/                        # โหลด .env + ตั้งค่า logging
│   ├── __init__.py
│   ├── logging_config.py
│   └── settings.py
│
├── src/                           # source code หลัก (แยกตามหน้าที่)
│   ├── __init__.py
│   ├── camera/                    # อ่าน RTSP + reconnect
│   │   ├── __init__.py
│   │   ├── camera_config.py
│   │   └── camera_reader.py
│   ├── detection/                 # YOLO, area checker, detection service
│   │   ├── __init__.py
│   │   ├── area_checker.py
│   │   ├── detection_service.py
│   │   └── yolo_detector.py
│   ├── alert/                     # แจ้งเตือน Teams/Email
│   │   ├── __init__.py
│   │   ├── email_alert.py
│   │   └── teams_alert.py
│   ├── storage/                   # เซฟรูปลง shared drive
│   │   ├── __init__.py
│   │   └── image_storage.py
│   ├── database/                  # connection + repository (เรียก SP)
│   │   ├── __init__.py
│   │   ├── detection_repository.py
│   │   └── mssql_connection.py
│   ├── monitoring/                # health report
│   │   ├── __init__.py
│   │   └── health_reporter.py
│   └── utils/                     # logger, helpers
│       ├── __init__.py
│       ├── helpers.py
│       └── logger.py
│
├── sql/                           # SQL schema + stored procedures (admin)
│   ├── 01_create_schema.sql
│   ├── 02_create_tables.sql
│   ├── 03_create_indexes.sql
│   ├── 04_create_stored_procedures.sql
│   ├── 05_insert_sample_data.sql
│   └── 06_sample_exec_commands.sql
│
├── data-api/                      # ตัวกลาง: เรียก SP → คืน JSON ให้ frontend
│   └── README.md
│
├── frontend/                      # React + Vite + Tailwind (dashboard/monitoring)
│   └── README.md
│
├── docs/                          # เอกสารคอร์ส + เอกสาร admin
│   ├── course-modules/            # เนื้อหาสำหรับผู้เรียน (Phase 5)
│   │   └── README.md
│   └── admin-backend/             # เอกสารสำหรับ admin (sql, data-api)
│       └── README.md
│
├── playground/                    # พื้นที่ทดลองโค้ดให้ผู้เรียน (มีแค่ README ในแต่ละโฟลเดอร์)
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
