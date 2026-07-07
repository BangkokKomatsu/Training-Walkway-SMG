# 02 — Stored Procedure Design

ทุก SP อยู่ใน schema `smg`, ขึ้นต้นด้วย `smg.sp_*`  
สร้างด้วย `CREATE OR ALTER` — รันซ้ำได้ปลอดภัย

---

## 1. `smg.sp_insert_detection_event`

**ใช้เมื่อ:** Python ตรวจเจอ event (คนอยู่ในพื้นที่ครบ `DWELL_SECONDS`)

| Parameter | Type | Default | หมายเหตุ |
|---|---|---|---|
| `@company_code` | NVARCHAR(20) | — | required |
| `@camera_no` | NVARCHAR(20) | — | required |
| `@camera_name` | NVARCHAR(100) | — | snapshot ณ เวลา event |
| `@location_name` | NVARCHAR(200) | — | snapshot |
| `@detected_class` | NVARCHAR(50) | `'person'` | |
| `@confidence` | DECIMAL(5,4) | — | 0.0–1.0 |
| `@event_type` | NVARCHAR(50) | — | `'DWELL'` หรือ `'INTRUSION'` |
| `@image_path` | NVARCHAR(500) | NULL | UNC path บน shared drive |
| `@image_name` | NVARCHAR(260) | NULL | ชื่อไฟล์ เช่น detection__123.jpg |
| `@created_by` | NVARCHAR(100) | `'system'` | |
| `@event_id` | BIGINT OUTPUT | — | คืน event_id ที่เพิ่งสร้าง |

**คืน:** `@event_id OUTPUT` — Python ใช้ ID นี้เรียก `sp_update_alert_status` ต่อ

---

## 2. `smg.sp_get_detection_events`

**ใช้เมื่อ:** Frontend ดึงรายการ event ในตาราง / รายงาน

| Parameter | Type | Default | หมายเหตุ |
|---|---|---|---|
| `@company_code` | NVARCHAR(20) | — | required |
| `@camera_no` | NVARCHAR(20) | NULL | filter กล้อง |
| `@date_from` | DATE | NULL | >=  |
| `@date_to` | DATE | NULL | <= |
| `@event_status` | NVARCHAR(20) | NULL | NEW / REVIEWED / DISMISSED |
| `@event_type` | NVARCHAR(50) | NULL | DWELL / INTRUSION |
| `@page_no` | INT | 1 | เริ่มที่ 1 |
| `@page_size` | INT | 50 | 0 = คืนทั้งหมด |

**คืน:** ตาราง event เรียงตาม `detected_at DESC`

---

## 3. `smg.sp_get_detection_event_detail`

**ใช้เมื่อ:** Frontend เปิด modal รายละเอียด event เดียว

| Parameter | Type | หมายเหตุ |
|---|---|---|
| `@event_id` | BIGINT | required |
| `@company_code` | NVARCHAR(20) | ป้องกันดู event ข้ามบริษัท |

**คืน:** 2 result set
1. ข้อมูล event เต็ม (รวม `image_path`)
2. ประวัติ alert log ของ event นี้ (เรียง `sent_at`)

---

## 4. `smg.sp_get_dashboard_summary`

**ใช้เมื่อ:** Frontend โหลด dashboard หน้าหลัก

| Parameter | Type | Default |
|---|---|---|
| `@company_code` | NVARCHAR(20) | — |
| `@date_from` | DATE | NULL (ทั้งหมด) |
| `@date_to` | DATE | NULL |

**คืน:** 4 result set
1. Summary row: `total_events`, `new_count`, `reviewed_count`, `dismissed_count`, `today_count`, `month_count`, `intrusion_count`, `dwell_count`
2. แยกตามกล้อง: `company_code`, `camera_no`, `camera_name`, `location_name`, `event_count`, `last_event_at`
3. อัตราส่ง alert สำเร็จ (จาก `trn_alert_log` จริง): `total_alerts`, `success_alerts`, `failed_alerts`
4. Trend 7 วันล่าสุด: `event_date`, `camera_no`, `event_count`

---

## 5. `smg.sp_get_camera_status`

**ใช้เมื่อ:** Frontend แสดงสถานะกล้อง / Python monitor ตรวจสอบ

| Parameter | Type | Default |
|---|---|---|
| `@company_code` | NVARCHAR(20) | — |
| `@camera_no` | NVARCHAR(20) | NULL (ทุกกล้อง) |

**คืน:** กล้องพร้อม `last_event_id`, `last_event_status`, `last_event_at` (NULL ถ้ายังไม่เคยมี event)

---

## 6. `smg.sp_update_alert_status`

**ใช้เมื่อ:** Python ส่ง Teams/Email เสร็จแล้ว (สำเร็จหรือล้มเหลว)

| Parameter | Type | หมายเหตุ |
|---|---|---|
| `@event_id` | BIGINT | — |
| `@company_code` | NVARCHAR(20) | — |
| `@alert_channel` | NVARCHAR(20) | `TEAMS` หรือ `EMAIL` |
| `@alert_status` | NVARCHAR(20) | `SENT` หรือ `FAILED` |
| `@response_code` | INT | NULL | HTTP status code |
| `@response_msg` | NVARCHAR(500) | NULL | ข้อความ response |

**ทำ 2 อย่างใน transaction เดียว:**
1. อัปเดต `alert_teams_status` หรือ `alert_email_status` ใน `trn_detection_event`
2. Insert record ลง `trn_alert_log`

---

## 7. `smg.sp_insert_system_log`

**ใช้เมื่อ:** Python บันทึก health/monitor (กล้อง connect/disconnect, disk, error)

| Parameter | Type | Default |
|---|---|---|
| `@company_code` | NVARCHAR(20) | — |
| `@camera_no` | NVARCHAR(20) | NULL (log ระดับ system) |
| `@log_level` | NVARCHAR(10) | — | `INFO` / `WARNING` / `ERROR` |
| `@log_message` | NVARCHAR(MAX) | — |

**คืน:** ไม่คืนค่า (fire and forget)

---

## 8. `smg.sp_login`

**ใช้เมื่อ:** `data-api` (`POST /api/auth/login`) ดึงข้อมูล user ตาม username เพื่อไปเทียบรหัสผ่าน — **SP ไม่รับหรือเทียบรหัสผ่านเอง** การเทียบ bcrypt (rounds=10) ทำใน Node.js เท่านั้น

| Parameter | Type | Default | หมายเหตุ |
|---|---|---|---|
| `@username` | NVARCHAR(100) | — | required — ถ้าไม่พบ username จะไม่มีผลลัพธ์ (0 แถว) |

**คืน:** 1 row (ถ้าพบ username) — `user_id`, `company_code`, `username`, `full_name`, `password_hash` (bcrypt hash ให้ Node.js เทียบ), `role_id`, `role_name`, `is_super_admin`, `is_active`, `must_change_password`, และหลัง `07_api_key_and_login_security.sql` เพิ่ม `failed_login_count`, `locked_until` (ให้ data-api เช็ค lockout ก่อนอนุญาต login)

---

## 9. `smg.sp_get_alert_log`

**ใช้เมื่อ:** Frontend ต้องการดูประวัติการแจ้งเตือนในหน้า Alert Monitor

| Parameter | Type | Default |
|---|---|---|
| `@company_code` | NVARCHAR(20) | NULL (ทุกบริษัท — Super Admin) |
| `@alert_channel` | NVARCHAR(20) | NULL — `TEAMS` / `EMAIL` |
| `@alert_status` | NVARCHAR(20) | NULL — `SENT` / `FAILED` |
| `@date_from` | DATE | NULL |
| `@date_to` | DATE | NULL |
| `@page_no` | INT | 1 |
| `@page_size` | INT | 50 |

**คืน:** 2 result set
1. รายการประวัติการแจ้งเตือน (Teams / Email) พร้อม `camera_no`, `camera_name`, `event_type`, `detected_at` (join กับ `trn_detection_event`) เรียงตาม `sent_at DESC`
2. `total` — จำนวนแถวทั้งหมดตาม filter (สำหรับ pagination)

---

## 10. `smg.sp_get_company_list`

**ใช้เมื่อ:** Super Admin โหลด dropdown บริษัท

| Parameter | Type | Default |
|---|---|---|
| ไม่มี | | |

**คืน:** `company_code`, `company_name` ของบริษัทที่ `is_active = 1` เท่านั้น

---

## 11. `smg.sp_change_password`

**ใช้เมื่อ:** ผู้ใช้เปลี่ยนรหัสผ่านตัวเอง (`POST /api/auth/change-password`) — บังคับครั้งแรกหรือเปลี่ยนเองภายหลัง bcrypt hash ทำใน Node.js แล้วส่ง hash มาบันทึกเท่านั้น

| Parameter | Type | Default |
|---|---|---|
| `@user_id` | INT | — |
| `@new_password_hash` | NVARCHAR(256) | — |

**คืน:** ไม่คืนค่า — ตั้ง `must_change_password = 0` ให้ด้วย

---

## 12. `smg.sp_get_role_list`

**ใช้เมื่อ:** โหลด dropdown role สำหรับหน้า admin จัดการ user (`GET /api/roles`)

**Parameter:** ไม่มี — **คืน:** `role_id`, `role_name` เรียงตาม `role_id`

---

## 13. `smg.sp_user_list`

**ใช้เมื่อ:** หน้า admin จัดการ user (`GET /api/users`)

| Parameter | Type | Default |
|---|---|---|
| `@company_code` | NVARCHAR(20) | NULL (ทุกบริษัท — Super Admin) |

**คืน:** `user_id`, `company_code`, `username`, `full_name`, `role_id`, `role_name`, `is_super_admin`, `is_active`, `must_change_password`, `created_at`

---

## 14. `smg.sp_user_create`

**ใช้เมื่อ:** Admin สร้าง user ใหม่ (`POST /api/users`) — `password_hash` เป็น temp password ที่ hash แล้วจาก Node.js, `must_change_password` ถูกบังคับเป็น 1 เสมอ (ฮาร์ดโค้ดใน SP)

| Parameter | Type | Default | หมายเหตุ |
|---|---|---|---|
| `@company_code` | NVARCHAR(20) | — | required |
| `@username` | NVARCHAR(100) | — | required |
| `@full_name` | NVARCHAR(200) | NULL | |
| `@password_hash` | NVARCHAR(256) | — | bcrypt hash จาก Node.js |
| `@role_id` | INT | — | required |
| `@is_super_admin` | BIT | 0 | |
| `@user_id` | INT OUTPUT | — | คืน user_id ที่เพิ่งสร้าง |

**คืน:** `@user_id OUTPUT`

---

## 15. `smg.sp_user_update`

**ใช้เมื่อ:** Admin แก้ไขข้อมูล user (`POST /api/users/:id/update`) — ไม่รวม `username` / `company_code` / `password`

| Parameter | Type | Default |
|---|---|---|
| `@user_id` | INT | — |
| `@full_name` | NVARCHAR(200) | NULL |
| `@role_id` | INT | — |
| `@is_active` | BIT | — |

**คืน:** ไม่คืนค่า

---

## 16. `smg.sp_user_reset_password`

**ใช้เมื่อ:** Admin สุ่มรหัสผ่านใหม่ให้ user (`POST /api/users/:id/reset-password`) — บังคับเปลี่ยนตอน login ครั้งถัดไปเสมอ (ตั้ง `must_change_password = 1`)

| Parameter | Type | Default |
|---|---|---|
| `@user_id` | INT | — |
| `@new_password_hash` | NVARCHAR(256) | — |

**คืน:** ไม่คืนค่า

---

## API key + login security (07_api_key_and_login_security.sql)

SP กลุ่มนี้เพิ่มเข้ามาพร้อมฟีเจอร์ external read-only API (`/api/public/v1/*`) และการป้องกัน brute-force login — ดูตารางที่เกี่ยวข้องใน [01 — Database Design](01-database-design.md)

### 17. `smg.sp_record_failed_login`

เรียกทุกครั้งที่ login ผิด — `@username NVARCHAR(100)` — ผิดครบ 5 ครั้งติดกัน ล็อก account 15 นาที (ค่าคงที่ในตัว SP ไม่มี parameter ปรับ)

### 18. `smg.sp_reset_login_lockout`

เรียกหลัง login สำเร็จ — `@user_id INT` — เคลียร์ `failed_login_count` และ `locked_until`

### 19. `smg.sp_regenerate_company_api_key`

Admin กด "Regenerate" (`POST /api/company/api-key/regenerate`) — `@company_code NVARCHAR(20)`, `@api_key_hash NVARCHAR(64)` — data-api สร้าง key จริง + SHA-256 hash แล้วส่ง hash มาเก็บ; key จริงคืนให้ผู้ใช้เห็นครั้งเดียวตอน response ของ data-api เท่านั้น ไม่เก็บ plain text ใน DB

### 20. `smg.sp_get_company_api_key_info`

โหลดสถานะ key ของบริษัทตัวเอง (`GET /api/company/api-key`) — `@company_code NVARCHAR(20)` — **คืน:** `company_code`, `api_key_created_at`, `api_key_is_active` (ไม่คืน hash)

### 21. `smg.sp_verify_api_key`

data-api เรียกทุก request เข้า `/api/public/v1/*` เพื่อแปลง key → company_code — `@api_key_hash NVARCHAR(64)` — **คืน:** `company_code`, `company_name` เฉพาะ key ที่ active และบริษัท active

### 22. `smg.sp_log_api_usage`

บันทึกทุกครั้งที่ `/api/public/v1/*` ถูกเรียก (fire-and-forget หลังตอบ response) — `@company_code`, `@endpoint NVARCHAR(200)`, `@http_method NVARCHAR(10)`, `@status_code INT`, `@ip_address NVARCHAR(50) = NULL`

### 23. `smg.sp_get_api_usage_summary`

สรุปจำนวนครั้งเรียก `/api/public/v1/*` แยกตาม endpoint (`GET /api/company/usage`) — `@company_code NVARCHAR(20) = NULL` (Super Admin ดูทุกบริษัท), `@date_from DATE = NULL`, `@date_to DATE = NULL`

### 24. `smg.sp_get_billing_overview`

Super Admin ดูภาพรวมทุกบริษัทเพื่อคิดค่าบริการ (`GET /api/admin/billing-overview`) — ไม่มี parameter — **คืน:** `company_code`, `company_name`, `is_active`, `api_key_is_active`, `api_key_created_at`, `active_camera_count` ต่อบริษัท (snapshot ปัจจุบัน ไม่ prorate)

### 25. `smg.sp_get_camera_list_public`

รายชื่อกล้องสำหรับ `/api/public/v1/cameras` เท่านั้น — `@company_code NVARCHAR(20)` — ตัด `rtsp_url` / `ip_address` / `username` / `password` ออก (ต่างจาก `sp_get_camera_status` ที่มี credential กล้องเต็ม ห้ามส่งออกนอกระบบ)

### 26. `smg.sp_purge_api_usage_log`

ลบ log เก่ากว่า `@retention_days INT = 180` วัน — รันผ่าน SQL Agent job รายวัน หรือรันมือ (MSSQL Express ไม่มี Agent — ดู [03 — SQL Runbook](03-sql-runbook.md))
