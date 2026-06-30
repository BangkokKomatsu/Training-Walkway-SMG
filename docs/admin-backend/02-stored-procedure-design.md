# 02 — Stored Procedure Design

ทุก SP อยู่ใน schema `ww`, ขึ้นต้นด้วย `ww.sp_*`  
สร้างด้วย `CREATE OR ALTER` — รันซ้ำได้ปลอดภัย

---

## 1. `ww.sp_insert_detection_event`

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
| `@image_url` | NVARCHAR(500) | NULL | URL สำหรับ frontend แสดงรูป |
| `@created_by` | NVARCHAR(100) | `'system'` | |
| `@event_id` | BIGINT OUTPUT | — | คืน event_id ที่เพิ่งสร้าง |

**คืน:** `@event_id OUTPUT` — Python ใช้ ID นี้เรียก `sp_update_alert_status` ต่อ

---

## 2. `ww.sp_get_detection_events`

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

## 3. `ww.sp_get_detection_event_detail`

**ใช้เมื่อ:** Frontend เปิด modal รายละเอียด event เดียว

| Parameter | Type | หมายเหตุ |
|---|---|---|
| `@event_id` | BIGINT | required |
| `@company_code` | NVARCHAR(20) | ป้องกันดู event ข้ามบริษัท |

**คืน:** 2 result set
1. ข้อมูล event เต็ม (รวม `image_path`)
2. ประวัติ alert log ของ event นี้ (เรียง `sent_at`)

---

## 4. `ww.sp_get_dashboard_summary`

**ใช้เมื่อ:** Frontend โหลด dashboard หน้าหลัก

| Parameter | Type | Default |
|---|---|---|
| `@company_code` | NVARCHAR(20) | — |
| `@date_from` | DATE | NULL (ทั้งหมด) |
| `@date_to` | DATE | NULL |

**คืน:** 2 result set
1. Summary row: `total_events`, `new_count`, `reviewed_count`, `dismissed_count`, `today_count`, `alert_failed_count`
2. แยกตามกล้อง: `camera_no`, `camera_name`, `location_name`, `event_count`, `last_event_at`

---

## 5. `ww.sp_get_camera_status`

**ใช้เมื่อ:** Frontend แสดงสถานะกล้อง / Python monitor ตรวจสอบ

| Parameter | Type | Default |
|---|---|---|
| `@company_code` | NVARCHAR(20) | — |
| `@camera_no` | NVARCHAR(20) | NULL (ทุกกล้อง) |

**คืน:** กล้องพร้อม `last_event_id`, `last_event_status`, `last_event_at` (NULL ถ้ายังไม่เคยมี event)

---

## 6. `ww.sp_update_alert_status`

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

## 7. `ww.sp_insert_system_log`

**ใช้เมื่อ:** Python บันทึก health/monitor (กล้อง connect/disconnect, disk, error)

| Parameter | Type | Default |
|---|---|---|
| `@company_code` | NVARCHAR(20) | — |
| `@camera_no` | NVARCHAR(20) | NULL (log ระดับ system) |
| `@log_level` | NVARCHAR(10) | — | `INFO` / `WARNING` / `ERROR` |
| `@log_message` | NVARCHAR(MAX) | — |

**คืน:** ไม่คืนค่า (fire and forget)

---

## 8. `ww.sp_login`

**ใช้เมื่อ:** Frontend ต้องการ Authenticate ผู้ใช้เพื่อรับ JWT Token

| Parameter | Type | Default |
|---|---|---|
| `@username` | NVARCHAR(50) | — |
| `@password_hash` | NVARCHAR(255) | — | (ระบบทดสอบอาจใช้ Plaintext หรือ Hash ก็ได้) |
| `@company_code` | NVARCHAR(20) | — |

**คืน:** `user_id`, `role`, `company_code` หาก login สำเร็จ

---

## 9. `ww.sp_get_alert_log`

**ใช้เมื่อ:** Frontend ต้องการดูประวัติการแจ้งเตือนในหน้า Alert Monitor

| Parameter | Type | Default |
|---|---|---|
| `@company_code` | NVARCHAR(20) | — |
| `@page_no` | INT | 1 |
| `@page_size` | INT | 50 |

**คืน:** รายการประวัติการแจ้งเตือน (Teams / Email) เรียงตาม `sent_at DESC`

---

## 10. `ww.sp_get_company_list`

**ใช้เมื่อ:** Frontend / Backend ต้องการตรวจสอบรายชื่อบริษัททั้งหมดที่ระบบรองรับ

| Parameter | Type | Default |
|---|---|---|
| ไม่มี | | |

**คืน:** `company_code`, `company_name`, `is_active` ของทุกบริษัท
