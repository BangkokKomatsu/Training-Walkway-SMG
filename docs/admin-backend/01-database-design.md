# 01 — Database Design

## Schema

ทุกอย่างอยู่ใน schema `smg` บน MSSQL Express

---

## ER Diagram (ความสัมพันธ์)

```
mst_role ──┐
           ├── mst_user ──── mst_company ──┬── mst_camera ──── mst_detection_area
           │                               ├── mst_config
           │                               └── trn_detection_event ──── trn_alert_log
           │
           └── trn_system_log (ไม่มี FK ไป company — เพื่อให้ log ได้แม้ data ผิดพลาด)
```

---

## ตารางและความสัมพันธ์

### Master tables

| ตาราง | PK | หน้าที่ |
|---|---|---|
| `mst_role` | `role_id` | admin / viewer — global ไม่ผูก company |
| `mst_company` | `company_code` | บริษัทของ deployment นี้ (1 deployment = 1 บริษัท) |
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

---

## บทบาทของ `company_code`

- ทุก table ที่เก็บข้อมูลบริษัทมี `company_code` เป็น column และทุก SP รับ `@company_code` เป็น parameter
- ระบบเป็นแบบ **single-tenant self-host** — 1 deployment (DB + server) = 1 บริษัท `company_code` จึงเป็นค่าคงที่ค่าเดียวของ deployment นั้น
- `data-api` อ่าน `company_code` จาก JWT ของผู้ใช้แล้วส่งเป็น `@company_code` ให้ SP ทุกครั้ง (server บังคับฝั่งเดียว) — ผู้ใช้เลือกบริษัทเองไม่ได้

---

## เหตุผลการออกแบบ

- **PK กล้อง = composite (company_code, camera_no)** — `camera_no` ซ้ำได้ข้ามบริษัท (ทุกบริษัทมี CAM-01 ได้)
- **`trn_detection_event` เก็บ `camera_name` / `location_name` ซ้ำ** — snapshot ณ เวลา event (แม้เปลี่ยนชื่อกล้องทีหลัง ข้อมูลเก่ายังถูกต้อง)
- **`trn_system_log` ไม่มี FK** — log ต้องเขียนได้แม้ข้อมูล master ยังไม่ครบ
- **`polygon_json` เป็น `NVARCHAR(MAX)`** — Python โหลด JSON array โดยตรง ไม่ต้องแปลง
- **ไม่มี soft-delete** — ใช้ `is_active = 0` แทน ง่ายกว่า cascade

---

## คอลัมน์เสริม login lockout (07_login_security.sql)

`07_login_security.sql` เพิ่มคอลัมน์ผ่าน `ALTER TABLE` ให้ตารางที่มีอยู่แล้ว (ไม่ได้อยู่ใน `CREATE TABLE` ของ `02_create_tables.sql`):

| ตาราง | คอลัมน์ที่เพิ่ม | หน้าที่ |
|---|---|---|
| `mst_user` | `failed_login_count`, `locked_until` | นับ login ผิดติดกัน — ผิดครบ 5 ครั้งล็อก account 15 นาที (ดู `sp_record_failed_login`) |

---

## คอลัมน์เสริม Camera Snapshot Sync (09_add_camera_snapshot_sync.sql)

ปุ่ม "Sync ภาพล่าสุด" ในหน้า Draw Polygon (frontend) ใช้กลไก request-flag ผ่าน DB แทนการให้
Python กับ frontend คุยกันตรงๆ:

| ตาราง | คอลัมน์ที่เพิ่ม | หน้าที่ |
|---|---|---|
| `mst_camera` | `snapshot_requested_at` | data-api set เมื่อ admin กด Sync (`POST /api/cameras/:camera_no/snapshot/sync`) |
| `mst_camera` | `last_snapshot_at` | Python (`detection_service.py::_camera_loop`) set หลัง capture snapshot สำเร็จ ผ่าน `smg.sp_update_camera_snapshot_time` |

เช็คว่า capture เสร็จหรือยัง = เทียบ `last_snapshot_at > snapshot_requested_at` เท่านั้น ไม่ต้องเคลียร์ flag แยก
ไฟล์ภาพจริงเก็บที่ `{IMAGE_SHARED_DRIVE}\_snapshots\{company_code}\{camera_no}.jpg` (ทับไฟล์เดิมทุกครั้ง)

`data-api` มี 3 endpoint ใหม่ (`server.js`, ใกล้ polygon routes):

- `POST /api/cameras/:camera_no/snapshot/sync` — ตั้ง flag คำขอ
- `GET /api/cameras/:camera_no/snapshot` — คืน `{ mode: 'bkc'|'local'|'none', snapshot_url, last_snapshot_at }`
- `GET /api/cameras/:camera_no/snapshot/raw` — เสิร์ฟไฟล์ตรง (เฉพาะ `mode: 'local'` — ไม่ได้ตั้งค่า `BKC_IMAGE_API_KEY`)

`mode: 'bkc'` ใช้ `getBkcSignedUrl()` เดิม (เหมือนรูป event) ถ้าตั้งค่า `BKC_IMAGE_API_KEY`;
ถ้าไม่ตั้งค่า data-api จะ fallback ไปอ่านไฟล์ local ตรงจาก `IMAGE_SHARED_DRIVE` (env var ใหม่ใน `data-api/.env`)

---

## Indexes (อยู่ใน 03_create_indexes.sql)

| Index | Table | Column |
|---|---|---|
| `IX_event_company_detected` | `trn_detection_event` | `company_code, detected_at DESC` |
| `IX_event_camera` | `trn_detection_event` | `company_code, camera_no, detected_at DESC` |
| `IX_event_status` | `trn_detection_event` | `company_code, event_status, detected_at DESC` |
| `IX_alert_event` | `trn_alert_log` | `event_id, alert_channel` |
| `IX_syslog_company` | `trn_system_log` | `company_code, logged_at DESC` |
| `IX_area_camera` | `mst_detection_area` | `company_code, camera_no` |
