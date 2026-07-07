# 03 — SQL Runbook

## ลำดับการรัน script

รันตามลำดับเสมอ — แต่ละ script ขึ้นอยู่กับ script ก่อนหน้า

```
01_create_schema.sql              ← สร้าง schema smg
02_create_tables.sql              ← สร้างตารางทั้งหมด
03_create_indexes.sql             ← สร้าง index
04_create_stored_procedures.sql   ← สร้าง SP หลัก (event/alert/dashboard/user management ฯลฯ)
05_insert_sample_data.sql         ← ใส่ข้อมูลตัวอย่าง (dev/test เท่านั้น)
06_sample_exec_commands.sql       ← ทดสอบ EXEC ทุก SP หลัก
07_api_key_and_login_security.sql ← เพิ่มคอลัมน์ API key (mst_company) + login lockout (mst_user)
                                     ตาราง trn_api_usage_log และ SP ที่เกี่ยวข้อง
08_seed_api_keys.sql              ← Gen API key เริ่มต้นให้ทุกบริษัท (ผ่าน sp_regenerate_company_api_key)
```

Script 01–04 และ 07 รันซ้ำได้ปลอดภัย (`IF NOT EXISTS` / `CREATE OR ALTER`)  
Script 05 ตรวจ duplicate ก่อน insert — รันซ้ำไม่เพิ่มข้อมูลซ้ำ (ยกเว้น event ตัวอย่าง)  
Script 08 รันซ้ำได้ (idempotent) แต่ทุกครั้งที่รันจะ **regenerate API key ใหม่ทับของเดิม** — ระวังถ้ามีระบบภายนอกใช้คีย์เดิมอยู่แล้ว

---

## Deploy บน MSSQL Express

### ข้อกำหนด
- SQL Server Express 2019+ (หรือ Developer Edition สำหรับ dev)
- collation แนะนำ: `Thai_CI_AS` หรือ `Thai_100_CI_AS` (รองรับภาษาไทย)
- ผู้ใช้ที่รัน script ต้องมีสิทธิ์ `CREATE SCHEMA`, `CREATE TABLE`, `CREATE PROCEDURE`

### ขั้นตอน

**1. สร้าง Database**
```sql
CREATE DATABASE WalkwayDB
    COLLATE Thai_100_CI_AS;
GO
USE WalkwayDB;
GO
```

**2. รัน script 01–04 และ 07** (SSMS หรือ sqlcmd)
```bash
# sqlcmd
sqlcmd -S localhost\SQLEXPRESS -d WalkwayDB -i sql\01_create_schema.sql
sqlcmd -S localhost\SQLEXPRESS -d WalkwayDB -i sql\02_create_tables.sql
sqlcmd -S localhost\SQLEXPRESS -d WalkwayDB -i sql\03_create_indexes.sql
sqlcmd -S localhost\SQLEXPRESS -d WalkwayDB -i sql\04_create_stored_procedures.sql
sqlcmd -S localhost\SQLEXPRESS -d WalkwayDB -i sql\07_api_key_and_login_security.sql
```
`07` เพิ่มคอลัมน์ API key / login lockout และตาราง `trn_api_usage_log` — ต้องรันก่อนเปิดใช้ฟีเจอร์ `/api/public/v1/*` และก่อน login lockout จะทำงาน (ไม่รันก็ยังใช้ระบบหลักได้ปกติ แต่ `data-api` จะ migrate ให้อัตโนมัติตอน start อยู่แล้วถ้ายังไม่ได้รันมือ)

**3. ใส่ข้อมูล master จริง** (บริษัท, กล้อง, area) แทน sample data  
หรือรัน 05 เพื่อทดสอบก่อน แล้วลบ sample data ทีหลัง

**4. ตรวจสอบด้วย 06**
```bash
sqlcmd -S localhost\SQLEXPRESS -d WalkwayDB -i sql\06_sample_exec_commands.sql
```

**5. (Optional) Gen API key เริ่มต้นให้แต่ละบริษัทด้วย 08**
```bash
sqlcmd -S localhost\SQLEXPRESS -d WalkwayDB -i sql\08_seed_api_keys.sql
```
ใช้เฉพาะตอน dev/demo — คีย์จริงสำหรับ production ควร regenerate ผ่าน `POST /api/company/api-key/regenerate` แทน เพื่อให้ admin ของบริษัทนั้นเห็น plain key ครั้งเดียวตอนสร้างจริง

---

## ตั้งค่า `.env` ให้ Python เชื่อมต่อ

```env
DB_SERVER=localhost\SQLEXPRESS
DB_NAME=WalkwayDB
DB_USER=ww_app
DB_PASSWORD=your_strong_password
DB_DRIVER=ODBC Driver 17 for SQL Server
```

### สร้าง login สำหรับ application (สิทธิ์น้อยที่สุด)
```sql
-- รันใน master
CREATE LOGIN walkway_app WITH PASSWORD = 'your_strong_password';

-- รันใน WalkwayDB
USE WalkwayDB;
CREATE USER walkway_app FOR LOGIN walkway_app;
GRANT EXECUTE ON SCHEMA::smg TO walkway_app;  -- execute SP เท่านั้น
GO
```

---

## อัปเดต Stored Procedure (ไม่ต้อง drop)

`04_create_stored_procedures.sql` และ `07_api_key_and_login_security.sql` ใช้ `CREATE OR ALTER` ทั้งคู่ — แก้โค้ด SP แล้วรันไฟล์นั้นซ้ำได้เลย (SP ใน 07 รวมถึง `sp_login` เวอร์ชันล่าสุดที่มี `failed_login_count` / `locked_until` เพิ่มมาด้วย)

---

## Backup เบื้องต้น

```sql
-- Full backup (ทำก่อน deploy หรือวันละครั้ง)
BACKUP DATABASE WalkwayDB
TO DISK = 'D:\Backup\WalkwayDB_full.bak'
WITH FORMAT, COMPRESSION, STATS = 10;

-- ตรวจสอบ backup
RESTORE VERIFYONLY FROM DISK = 'D:\Backup\WalkwayDB_full.bak';
```

MSSQL Express ไม่มี SQL Server Agent — ใช้ Windows Task Scheduler รัน backup script แทน

---

## ลบ Sample Data (ก่อน Production)

```sql
USE WalkwayDB;
DELETE FROM smg.trn_alert_log;
DELETE FROM smg.trn_system_log;
DELETE FROM smg.trn_detection_event;
DELETE FROM smg.trn_api_usage_log WHERE company_code IN ('DEMO','ACME');  -- ลบก่อน mst_company (FK)
-- master data ต้องใส่ของจริงแทน
DELETE FROM smg.mst_detection_area;
DELETE FROM smg.mst_config;
DELETE FROM smg.mst_camera;
DELETE FROM smg.mst_user;
DELETE FROM smg.mst_company WHERE company_code IN ('DEMO','ACME');
GO
```
