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

## Indexes (อยู่ใน 03_create_indexes.sql)

| Index | Table | Column |
|---|---|---|
| `IX_event_company_detected` | `trn_detection_event` | `company_code, detected_at DESC` |
| `IX_event_camera` | `trn_detection_event` | `company_code, camera_no, detected_at DESC` |
| `IX_event_status` | `trn_detection_event` | `company_code, event_status, detected_at DESC` |
| `IX_alert_event` | `trn_alert_log` | `event_id, alert_channel` |
| `IX_syslog_company` | `trn_system_log` | `company_code, logged_at DESC` |
| `IX_area_camera` | `mst_detection_area` | `company_code, camera_no` |
