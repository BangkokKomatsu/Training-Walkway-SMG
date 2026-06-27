# PHASE 5 — Course Documents (Modules + Performance + Final Project)

> **วิธีใช้:** วาง `00_MASTER_CONTEXT.md` ก่อน แล้วตามด้วยไฟล์นี้
> เฟสนี้เขียน **เอกสารคอร์สสำหรับผู้เรียน** โดยอ้างอิงโค้ด/SQL/frontend ที่สร้างในเฟส 1–4
> แนะนำสั่งเขียน **ทีละโมดูล** (หรือทีละ 2–3 โมดูล) เพื่อให้แต่ละบทลึกพอ

## 🔒 หลักการ
- ผู้เรียนมือใหม่ → ค่อยเป็นค่อยไป มีตัวอย่างทุกบท
- ทุก Module มี **10 ส่วน** (ตาม §I ของ master)
- แยกชัดจากเนื้อหา admin (เฟส 2)

## Modules ที่ต้องเขียน (`docs/course-modules/`)
1. `01-setup-environment.md` — ติดตั้ง Python, VS Code, extension, virtualenv, library, `requirements.txt`, `.env`, `.gitignore`, รัน, debug
2. `02-python-basic.md` — variable, type, list/dict, if/else, loop, function, class, import ข้ามไฟล์, try/except, logging, file path, อ่าน/เขียนไฟล์, library ภายนอก, pyodbc เบื้องต้น
3. `03-python-project-structure.md` — โครงสร้างที่ดี, แยกไฟล์/คลาส, รันที่ `main.py`, ทำไมต้อง `.env`, เรียกตัวแปรข้ามไฟล์, อะไรไม่ขึ้น Git
4. `04-opencv-camera-basic.md` — RTSP คืออะไร, เปิดกล้อง, อ่าน frame, กล้องหลุด/reconnect, แยก config กล้อง
5. `05-yolo-human-detection.md` — YOLO pre-trained, จับ person, bbox/confidence, conf threshold, license AGPL สั้น ๆ
   > 📖 ลิงก์ที่ต้องแนบในบทนี้ (ให้ผู้เรียนอ่านเพิ่มเติม):
   > - Ultralytics Docs หน้าหลัก: <https://docs.ultralytics.com>
   > - YOLO11 Overview: <https://docs.ultralytics.com/models/yolo11>
   > - Quickstart (ติดตั้ง + รันครั้งแรก): <https://docs.ultralytics.com/quickstart>
   > - Python Usage: <https://docs.ultralytics.com/usage/python>
   > - Predict Mode: <https://docs.ultralytics.com/modes/predict>
   > - Object Detection Task: <https://docs.ultralytics.com/tasks/detect>
   > - Download Models: <https://docs.ultralytics.com/models>
   > - License (AGPL-3.0 vs Enterprise): <https://www.ultralytics.com/license>
   > - GitHub: <https://github.com/ultralytics/ultralytics>
   > - (ข้อมูลเพิ่มเติม) YOLO26 รุ่นล่าสุด: <https://docs.ultralytics.com/models/yolo26>
6. `06-walkway-area-detection.md` — พิกัดภาพ, polygon, วาดด้วย OpenCV, point-in-polygon, **กติกาตัดสิน event 4 ขั้น + dwell 5 วิ (§D master)**, เก็บ area แยกกล้อง
7. `07-mssql-database-and-stored-procedure.md` — เชื่อม MSSQL, เรียก SP จาก Python, parameterized, อธิบาย `company_code` (มุมผู้เรียน — ไม่ลึกเท่า admin)
8. `08-image-storage-shared-drive.md` — โครงสร้างโฟลเดอร์/ชื่อไฟล์ (§G), เก็บ path/url ใน DB, กรณีไฟล์หาย, จัดการพื้นที่/archive
9. `09-alert-teams-email.md` — **Teams ผ่าน Power Automate Workflows (ฟรี) เท่านั้น** (step สร้าง flow + ยิง POST), Email ผ่าน SMTP M365 (+ ภาคผนวก Graph), cooldown, จัดการ fail, rate limit 4/วิ
10. `10-react-vite-tailwind-frontend.md` — เริ่ม React+Vite+Tailwind, โครงหน้า, เรียก data-api, component ตัวอย่าง
11. `11-monitoring-website.md` — ใช้เว็บ monitor: event, camera status, last detection/alert, service/DB/storage status, error ล่าสุด, รูปล่าสุด
12. `12-cpu-gpu-performance-tuning.md` — GPU เหมาะ real-time; CPU ทำให้ลื่น: resize frame, skip frame, ลด FPS detect, แยก thread, ลด resolution, โมเดล nano, conf threshold, ลด save/alert ซ้ำ, cooldown, ROI เท่าที่จำเป็น
    > 📖 ลิงก์ที่ต้องแนบในบทนี้:
    > - เปรียบเทียบ Model Size (nano/small/medium): <https://docs.ultralytics.com/models/yolo11#performance-metrics>
    > - Predict Mode config (imgsz, conf, device ฯลฯ): <https://docs.ultralytics.com/modes/predict>
13. `13-final-project.md` — ประกอบทุกส่วนเป็นระบบเดียว (ดู §B/§C master) + checklist ส่งมอบ + วิธีเปลี่ยน config ไปใช้ระบบจริง

## Deployment (เขียนสั้น ๆ ใน module 10 หรือ 13)
- build Vite → `dist/` → ทีม admin deploy IIS HTTPS เอง (ไม่สอน IIS ละเอียด)
- config (URL/DB/company_code) แยกไว้ที่ env/config

## ✅ Acceptance checklist
- [ ] ทุก module ครบ 10 ส่วน
- [ ] โค้ดในเอกสารตรงกับ repo จริง (เฟส 1–4) copy ไปรันได้
- [ ] module 06 อธิบาย dwell 5 วิ + พื้นที่อันตรายถูกต้อง
- [ ] module 09 สอน Teams แบบ Power Automate ฟรีเท่านั้น
- [ ] final project: เปลี่ยน config แล้วใช้ระบบจริงได้ตามที่อธิบาย
- [ ] แยกเนื้อหาผู้เรียน vs admin ชัดเจน
