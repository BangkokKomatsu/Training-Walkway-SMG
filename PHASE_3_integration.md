# PHASE 3 — Integration (Storage + DB Repository + Alert + Health)

> **วิธีใช้:** วาง `00_MASTER_CONTEXT.md` ก่อน แล้วตามด้วยไฟล์นี้
> เฟสนี้ทำให้ฝั่ง Python **ทำงาน end-to-end**: เกิด event → เซฟรูป → log ลง DB → ส่ง Teams+Email
> ต้องทำ **เฟส 1 (core)** และ **เฟส 2 (SQL/SP)** เสร็จก่อน

## 🔒 Locked decisions ที่ใช้ในเฟสนี้
- insert ผ่าน **Stored Procedure** เท่านั้น (parameterized)
- **Teams = Power Automate webhook ฟรี** (ยิง POST ตรง, ห้าม premium HTTP action) — รายละเอียด §E ของ master
- **Email = SMTP M365 (app password)** หลัก + **Graph API** ภาคผนวก
- รูปเซฟตามโครงสร้าง §G, ใช้ `DWELL_SECONDS` + `ALERT_COOLDOWN_SECONDS`

## สิ่งที่ต้องสร้าง

### 1. `src/storage/image_storage.py`
- เซฟรูป event ลง shared drive ตามโครงสร้าง §G
- ตั้งชื่อไฟล์ `detection_{company_code}_{camera_no}_{yyyyMMdd_HHmmss}.jpg`
- คืนทั้ง `image_path` (absolute) และ `image_url`/relative path สำหรับเก็บใน DB
- จัดการกรณีโฟลเดอร์ยังไม่มี (สร้าง), เขียนไม่สำเร็จ (log)

### 2. `src/database/mssql_connection.py`
- เชื่อม MSSQL ด้วย `pyodbc` อ่าน config จาก `.env`
- **parameterized เท่านั้น** + helper เรียก stored procedure
- จัดการ connection error/retry

### 3. `src/database/detection_repository.py`
- ฟังก์ชันระดับ business: `insert_detection_event(...)` → เรียก `ww.sp_insert_detection_event`
- `update_alert_status(...)` → เรียก `ww.sp_update_alert_status`
- ไม่มี SQL ดิบในชั้นนี้ — เรียกผ่าน SP

### 4. `src/alert/teams_alert.py`
- ส่ง POST ไปยัง `TEAMS_WEBHOOK_URL` (Adaptive Card หรือ MessageCard)
- ข้อความมี: บริษัท, กล้อง, พื้นที่, เวลา, confidence, ลิงก์รูป
- จัดการ fail (รวม HTTP 429 จาก rate limit) → log + คืนสถานะ
- **ห้ามใส่ token/credential ใน code**

### 5. `src/alert/email_alert.py`
- SMTP M365 (app password) ส่งอีเมลแจ้งเตือน (แนบรูปหรือลิงก์)
- จัดการ fail → log + คืนสถานะ
- มี **ภาคผนวก/ตัวอย่างแยก** สำหรับส่งผ่าน **Microsoft Graph API**

### 6. `src/monitoring/health_reporter.py`
- รายงานสถานะ: Python service alive, last run time, DB connection, storage path, camera connection
- เขียนลง `trn_system_log` ผ่าน `ww.sp_insert_system_log` (frontend จะอ่านไปแสดงหน้า health)

### 7. เชื่อมเข้า `detection_service.py`
- เมื่อเกิด event (ผ่าน dwell) และพ้น cooldown:
  เซฟรูป → insert event (เก็บ image_path/url) → ส่ง Teams + Email → update alert status → set last_alert_time

## Playground
- `playground/05-mssql-log/` — insert log + รัน SP จาก Python
- `playground/06-email-teams-alert/` — ส่ง Email + ยิง Teams webhook ทดสอบ

## ✅ Acceptance checklist
- [ ] เกิด event จริง → มีรูปใน shared drive + แถวใน `trn_detection_event` + ข้อความเข้า Teams + อีเมลถึงปลายทาง
- [ ] ส่ง Teams/Email fail → ระบบไม่ crash, มี log, สถานะถูกบันทึก
- [ ] cooldown กันแจ้งซ้ำถี่ได้จริง
- [ ] ทุก credential อยู่ใน `.env`
- [ ] insert ผ่าน SP (parameterized) ทั้งหมด
