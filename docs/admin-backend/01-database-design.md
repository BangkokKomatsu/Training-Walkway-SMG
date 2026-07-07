# 01 — Database Design

## Schema

ทุกอย่างอยู่ใน schema `smg` บน MSSQL Express

---

## ER Diagram (ความสัมพันธ์)

```
mst_role ──┐
           ├── mst_user ──── mst_company ──┬── mst_camera ──── mst_detection_area
           │                               ├── mst_config
           │                               ├── trn_detection_event ──── trn_alert_log
           │                               └── trn_api_usage_log (external API-key usage log — §07)
           │
           └── trn_system_log (ไม่มี FK ไป company — เพื่อให้ log ได้แม้ data ผิดพลาด)
```

---

## ตารางและความสัมพันธ์

### Master tables

| ตาราง | PK | หน้าที่ |
|---|---|---|
| `mst_role` | `role_id` | admin / viewer — global ไม่ผูก company |
| `mst_company` | `company_code` | บริษัทลูกค้า — root ของ multi-tenant |
| `mst_user` | `user_id` | ผู้ใช้ระบบ ผูกกับ company + role |
| `mst_camera` | `(company_code, camera_no)` | กล้อง CCTV ต่อบริษัท |
| `mst_detection_area` | `area_id` | polygon อันตรายต่อกล้อง (1 กล้อง มีได้หลาย area) |
| `mst_config` | `(company_code, config_key)` | ค่า config runtime ต่อบริษัท |

### Transaction tables

| ตาราง | PK | หน้าที่ |
|---|---|---|
| `trn_detection_event` | `event_id` | event log หลัก — Python insert ทุกครั้งที่ตรวจเจอ |
| `trn_alert_log` | `log_id` | ประวัติการส่ง Teams/Email ต่อ event |
| `trn_system_log` | `log_id` | health / monitor log |
| `trn_api_usage_log` | `log_id` | log ทุกครั้งที่บริษัทเรียก `/api/public/v1/*` ด้วย API key (สร้างใน `07_api_key_and_login_security.sql`) — เก็บ 180 วันแล้ว purge ด้วย `sp_purge_api_usage_log` |

---

## บทบาทของ `company_code`

- ทุก table ที่เก็บข้อมูลบริษัทมี `company_code` เป็น column
- ทุก SP รับ `@company_code` เป็น parameter — ไม่มี SP ที่ดึงข้อมูลข้ามบริษัทได้
- ระบบรองรับหลายบริษัทในฐานข้อมูลเดียว (multi-tenant) โดย application ส่ง `company_code` มาจาก `.env`

---

## เหตุผลการออกแบบ

- **PK กล้อง = composite (company_code, camera_no)** — `camera_no` ซ้ำได้ข้ามบริษัท (ทุกบริษัทมี CAM-01 ได้)
- **`trn_detection_event` เก็บ `camera_name` / `location_name` ซ้ำ** — snapshot ณ เวลา event (แม้เปลี่ยนชื่อกล้องทีหลัง ข้อมูลเก่ายังถูกต้อง)
- **`trn_system_log` ไม่มี FK** — log ต้องเขียนได้แม้ข้อมูล master ยังไม่ครบ
- **`polygon_json` เป็น `NVARCHAR(MAX)`** — Python โหลด JSON array โดยตรง ไม่ต้องแปลง
- **ไม่มี soft-delete** — ใช้ `is_active = 0` แทน ง่ายกว่า cascade

---

## คอลัมน์เสริม API key + login lockout (07_api_key_and_login_security.sql)

`07_api_key_and_login_security.sql` เพิ่มคอลัมน์ผ่าน `ALTER TABLE` ให้ตารางที่มีอยู่แล้ว (ไม่ได้อยู่ใน `CREATE TABLE` ของ `02_create_tables.sql`):

| ตาราง | คอลัมน์ที่เพิ่ม | หน้าที่ |
|---|---|---|
| `mst_company` | `api_key_hash`, `api_key_created_at`, `api_key_is_active` | API key ต่อบริษัทสำหรับ `/api/public/v1/*` — เก็บเป็น **SHA-256 hash เท่านั้น** ไม่เก็บ plain text |
| `mst_user` | `failed_login_count`, `locked_until` | นับ login ผิดติดกัน — ผิดครบ 5 ครั้งล็อก account 15 นาที (ดู `sp_record_failed_login`) |

พร้อมสร้างตาราง `trn_api_usage_log` ใหม่ (ดูตารางด้านบน)

---

## Indexes (อยู่ใน 03_create_indexes.sql + 07_api_key_and_login_security.sql)

| Index | Table | Column |
|---|---|---|
| `IX_event_company_detected` | `trn_detection_event` | `company_code, detected_at DESC` |
| `IX_event_camera` | `trn_detection_event` | `company_code, camera_no, detected_at DESC` |
| `IX_event_status` | `trn_detection_event` | `company_code, event_status, detected_at DESC` |
| `IX_alert_event` | `trn_alert_log` | `event_id, alert_channel` |
| `IX_syslog_company` | `trn_system_log` | `company_code, logged_at DESC` |
| `IX_area_camera` | `mst_detection_area` | `company_code, camera_no` |
| `IX_company_api_key_hash` | `mst_company` | `api_key_hash` (unique, filtered ไม่ NULL) |
| `IX_api_usage_company_called` | `trn_api_usage_log` | `company_code, called_at DESC` |
| `IX_api_usage_called_at` | `trn_api_usage_log` | `called_at` (ใช้ตอน purge) |
