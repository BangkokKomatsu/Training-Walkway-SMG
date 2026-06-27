# PHASE 2 — Backend / SQL (Tables + Stored Procedures) [ADMIN]

> **วิธีใช้:** วาง `00_MASTER_CONTEXT.md` ก่อน แล้วตามด้วยไฟล์นี้
> เฟสนี้เป็น **เนื้อหา Admin** (เจ้าของโปรเจกต์ดูแลเอง) — เขียนอธิบายให้ admin พอ ไม่ต้องสอนผู้เรียนทั่วไป

## 🔒 Locked decisions ที่ใช้ในเฟสนี้
- **Backend ไม่เป็น API** — เน้น **MSSQL Stored Procedure**
- ส่งมอบเป็น **SQL script ที่ copy ไปรันเองได้** + **ตัวอย่าง `EXEC`**
- ทุก table ข้อมูลบริษัทมี `company_code`

## สิ่งที่ต้องสร้าง

### SQL scripts ใน `sql/`
1. `01_create_schema.sql` — สร้าง schema `ww`
2. `02_create_tables.sql` — ตาราง:
   - `mst_company`, `mst_camera`, `mst_detection_area`
   - `trn_detection_event` (event log)
   - `trn_alert_log`, `trn_system_log`
   - `mst_user` / `mst_role` (อย่างง่าย), `mst_config` (ถ้าจำเป็น)
   - ทุกตารางที่เกี่ยวกับบริษัทมี `company_code`
3. `03_create_indexes.sql` — index บน `company_code`, `camera_no`, `detected_at`, `event_status`
4. `04_create_stored_procedures.sql` — SP อย่างน้อย:
   ```
   ww.sp_insert_detection_event       -- Python เรียกตอนเกิด event
   ww.sp_get_detection_events         -- ตาราง event + filter
   ww.sp_get_detection_event_detail   -- รายละเอียด event
   ww.sp_get_dashboard_summary        -- ตัวเลขสรุป dashboard
   ww.sp_get_camera_status            -- สถานะกล้อง
   ww.sp_update_alert_status          -- อัปเดตผลส่ง Teams/Email
   ww.sp_insert_system_log            -- health/monitor
   ```
   ทุก SP รองรับ filter: `company_code`, `camera_no`, `date range`, `event_status`
5. `05_insert_sample_data.sql` — master data ตัวอย่าง (บริษัท/กล้อง/area/user) + event ตัวอย่างไว้ทดสอบ frontend
6. `06_sample_exec_commands.sql` — ตัวอย่าง `EXEC` ครบทุก SP เช่น:
   ```sql
   EXEC ww.sp_get_detection_events
       @company_code = 'DEMO',
       @date_from = '2026-06-01',
       @date_to   = '2026-06-30',
       @camera_no = NULL,
       @event_status = NULL;
   ```

### Event Log fields (อย่างน้อย)
```
company_code, event_id, camera_no, camera_name, location_name,
detected_class, confidence, event_type, event_status, detected_at,
image_path, image_url, alert_teams_status, alert_email_status,
created_at, created_by
```

### เอกสาร admin ใน `docs/admin-backend/`
1. `01-database-design.md` — ER diagram (อธิบายความสัมพันธ์), เหตุผลการออกแบบ, role ของ `company_code`
2. `02-stored-procedure-design.md` — แต่ละ SP รับ/คืนอะไร, ใช้เมื่อไร
3. `03-sql-runbook.md` — ลำดับการรัน script (01→06), วิธี deploy บน MSSQL Express, การ backup เบื้องต้น

## ✅ Acceptance checklist
- [ ] รัน script 01→06 ตามลำดับบน MSSQL Express ได้ไม่ error
- [ ] ทุก SP ทดสอบด้วย `EXEC` ตัวอย่างแล้วคืนผลถูกต้อง
- [ ] filter ด้วย `company_code` แยกข้อมูลได้จริง
- [ ] insert ผ่าน parameterized (กัน SQL injection) — ไม่มีต่อ string ดิบ
