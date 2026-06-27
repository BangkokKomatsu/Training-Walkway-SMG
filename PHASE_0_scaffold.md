# PHASE 0 — Scaffold (โครงสร้างโปรเจกต์ + ไฟล์ตั้งต้น)

> **วิธีใช้:** วาง `00_MASTER_CONTEXT.md` ก่อน แล้วตามด้วยไฟล์นี้

## 🔒 Locked decisions ที่ใช้ในเฟสนี้
- person only / Teams = Power Automate ฟรี / Email = SMTP+Graph / ไม่ใช้ Power BI / ทุก table มี `company_code`
- โครงสร้างตาม §F ของ master / Git hygiene ตาม §H

## เป้าหมายเฟส
สร้าง **โครงร่าง repo เปล่า** ที่พร้อมให้เฟสถัด ๆ ไปเติมโค้ด — ยังไม่ต้องมี logic จริง

## สิ่งที่ต้องสร้าง
1. **โครงสร้างโฟลเดอร์/ไฟล์ทั้งหมด** ตาม §F (สร้างไฟล์เปล่าหรือมี placeholder/docstring สั้น ๆ บอกว่าไฟล์นี้ทำอะไร)
2. **`README.md`** ระดับ root: อธิบายระบบโดยรวม, data flow (§C), prerequisite, วิธีเริ่มต้นแบบ step-by-step สำหรับมือใหม่, ลิงก์ไปแต่ละ module/เฟส
3. **`.env.example`** — ครอบคลุมทุกค่าที่ระบบจะใช้ (ใส่ค่าตัวอย่าง/placeholder เท่านั้น) อย่างน้อย:
   ```
   DEVICE=cpu                       # cuda | cpu
   COMPANY_CODE=DEMO
   # Camera
   CAMERA_RTSP_URL=rtsp://user:pass@ip:554/Streaming/Channels/102
   # Detection
   YOLO_MODEL_PATH=models/yolo11n.pt
   CONF_THRESHOLD=0.5
   DWELL_SECONDS=5
   ALERT_COOLDOWN_SECONDS=120
   # Database (MSSQL)
   DB_DRIVER={ODBC Driver 17 for SQL Server}
   DB_SERVER=
   DB_NAME=
   DB_USER=
   DB_PASSWORD=
   # Storage
   IMAGE_SHARED_DRIVE=\\server\share\walkway-detection
   # Alert - Teams (Power Automate Workflows webhook, ฟรี)
   TEAMS_WEBHOOK_URL=
   # Alert - Email (SMTP M365)
   SMTP_HOST=smtp.office365.com
   SMTP_PORT=587
   SMTP_USER=
   SMTP_PASSWORD=
   ALERT_EMAIL_TO=
   ```
4. **`.gitignore`** ที่ถูกต้อง: `.env`, `*.log`, `__pycache__/`, `venv/`, `*.pt`, `node_modules/`, `dist/`, รูป detection จริง ฯลฯ
5. **`requirements.txt`** เวอร์ชัน pin ได้: opencv-python, ultralytics, torch, numpy, pyodbc, requests, python-dotenv (+ ที่จำเป็น)
6. **`config/settings.py`** — โหลดค่า `.env` ด้วย python-dotenv รวมเป็น object/constant เดียว ให้ไฟล์อื่น import ไปใช้ (ตัวอย่างการ "เรียกตัวแปรข้ามไฟล์")
7. **`config/logging_config.py`** — ตั้ง logging มาตรฐาน (console + file, UTF-8)
8. **`main.py`** — โครง entry point: อ่าน config → เลือก device → (placeholder) เรียก detection_service

## ✅ Acceptance checklist
- [ ] `pip install -r requirements.txt` ติดตั้งผ่าน
- [ ] `python main.py` รันได้ (แม้ยังไม่ทำงานจริง) ไม่ error import
- [ ] ไม่มี secret จริงในไฟล์ใด ๆ — มีแต่ `.env.example`
- [ ] `.gitignore` กัน `.env`, `*.pt`, `*.log` ครบ
- [ ] README มือใหม่อ่านแล้วรู้ว่าจะเริ่มยังไง
