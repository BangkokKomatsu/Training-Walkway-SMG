# Module 11 — ใช้งานเว็บ Monitor ระบบ

> **ระดับ:** มือใหม่ | **เวลาโดยประมาณ:** 45–60 นาที

---

## ส่วนที่ 1 — วัตถุประสงค์

เมื่อจบ module นี้ ผู้เรียนจะสามารถ:

- ใช้เว็บ monitor ดู event, กล้อง, alert, system health ได้
- เข้าใจว่าข้อมูลที่เห็นมาจากไหน (MSSQL ผ่าน data-api)
- ใช้งาน filter และค้นหา event ได้
- ดูรูปภาพ detection บนเว็บได้
- รู้ว่าต้องทำอะไรเมื่อสถานะ error

---

## ส่วนที่ 2 — สิ่งที่ต้องเตรียม

- ผ่าน Module 01–10
- Frontend รันอยู่ (`npm run dev`)
- data-api รันอยู่
- Python detection service รันอยู่ (หรือมีข้อมูล test ใน DB แล้ว)

---

## ส่วนที่ 3 — คำอธิบายเข้าใจง่าย

### เว็บ Monitor ทำหน้าที่อะไร?

เว็บนี้คือ "ศูนย์ควบคุม" สำหรับดูสถานะระบบ Walkway Detection แบบ real-time:

| หน้า | ดูอะไร |
|------|--------|
| Dashboard | สรุปตัวเลขสำคัญ (event วันนี้, กล้องออนไลน์, alert) |
| Event Log | รายการ event ทั้งหมด + รูปภาพ |
| Camera Monitor | สถานะแต่ละกล้อง, การตรวจจับล่าสุด |
| Alert Monitor | ประวัติการแจ้งเตือน Teams/Email |
| System Health | สถานะ DB, Storage, Service |

### ข้อมูลมาจากไหน?

```text
เว็บ (React) → GET /api/xxx → data-api (Node) → SP ใน MSSQL → ข้อมูล
```
เว็บ **ไม่ได้** ต่อ MSSQL ตรง ๆ ทุกอย่างผ่าน data-api

---

## ส่วนที่ 4 — Flow การทำงาน

```text
เปิดเว็บ http://localhost:5173
        ↓
หน้า Login → ใส่ Username, Password และ Company Code (รับ JWT Token)
        ↓
Dashboard แสดงสรุป
        ↓
ดู Event Log → กรองตามวัน/กล้อง
        ↓
คลิก Event → ดูรูปภาพ + รายละเอียด
        ↓
ดู Camera Monitor → สถานะกล้อง
        ↓
ดู System Health → ทุกอย่างปกติไหม
```
---

## ส่วนที่ 5 — ตัวอย่าง Code

### 5.1 Login — Authentication ด้วย JWT

เปิดเว็บ → หน้า Login จะขอข้อมูลเพื่อยืนยันตัวตน:

```text
ชื่อผู้ใช้:  [admin       ]
รหัสผ่าน:   [********    ]
รหัสบริษัท: [DEMO        ] 
[เข้าสู่ระบบ]
```
เมื่อเข้าสู่ระบบสำเร็จ ระบบจะได้รับ **JWT Token** มาเก็บไว้ที่เบราว์เซอร์ (`localStorage`) และจะแนบ Token นี้ไปกับทุก API request เพื่อยืนยันสิทธิ์ในการเข้าถึงข้อมูล (Dashboard, Event Log, Camera Monitor)

### 5.2 Dashboard — สรุปตัวเลข

```text
┌────────────────────────────────────────┐
│  Walkway Detection — DEMO              │
├──────────┬──────────┬────────┬─────────┤
│ Event    │ กล้อง    │ Alert  │ Event   │
│ วันนี้   │ ออนไลน์  │ ส่งสำเร็จ│ สัปดาห์│
│   12     │  3/3     │  11    │   47   │
└──────────┴──────────┴────────┴─────────┘
```
**ค่าที่แสดง:**
- **Event วันนี้**: จำนวน detection event ที่เกิดวันนี้
- **กล้องออนไลน์**: กล้องที่เชื่อมต่อ / ทั้งหมด
- **Alert ส่งสำเร็จ**: Teams+Email ที่ส่งได้สำเร็จ
- **Event สัปดาห์**: รวม 7 วันที่ผ่านมา

### 5.3 Event Log — รายการ Event

```text
┌─────────────────────────────────────────────────────┐
│  Event Log                          [กล้อง ▼] [วัน] │
├─────┬────────────┬──────────┬──────────┬────────────┤
│  # │ กล้อง      │ พื้นที่   │ เวลา     │ ความมั่นใจ │
├─────┼────────────┼──────────┼──────────┼────────────┤
│ 47 │ Camera-1   │ ทางเดิน  │ 10:05:32 │ 87.0%      │
│ 46 │ Camera-2   │ โกดัง A  │ 09:41:15 │ 92.3%      │
└─────┴────────────┴──────────┴──────────┴────────────┘
```
**การใช้งาน:**
- กรองตาม **กล้อง**: เลือก Camera-1, Camera-2, ... ทั้งหมด
- กรองตาม **วันที่**: เลือกช่วงเวลา
- คลิก **แถว event** → ดูรายละเอียดและรูปภาพ

### 5.4 รายละเอียด Event + รูปภาพ

คลิก event ใด ๆ จะเห็น:

```text
Event #47
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
กล้อง:    Camera-1 (กล้อง 1)
พื้นที่:   ทางเดินหน้าโกดัง
เวลา:     2026-01-01 10:05:32
ความมั่นใจ: 87.0%
ประเภท:   DWELL (อยู่นาน > 5 วิ)

[รูปภาพ detection] ← มี polygon + bbox วาดไว้
                      ถ้าไม่พบรูป → "ไม่พบรูปภาพ"
```
### 5.5 Camera Monitor — สถานะกล้อง

```text
┌─────────────────────────────────────────────────────┐
│  Camera Monitor                                     │
├────────────────────┬────────────┬───────────────────┤
│  กล้อง            │ สถานะ      │ ตรวจจับล่าสุด     │
├────────────────────┼────────────┼───────────────────┤
│  Camera-1          │ ● Online   │ 10:05:32 (1 นาที) │
│  Camera-2          │ ● Online   │ 09:41:15 (30 นาที)│
│  Camera-3          │ ○ Offline  │ เมื่อวาน          │
└────────────────────┴────────────┴───────────────────┘
```
**สี indicator:**
- 🟢 Green = Online, ตรวจจับปกติ
- 🔴 Red = Offline หรือ error
- 🟡 Yellow = Warning (ไม่ได้ส่ง alert นาน)

### 5.6 Alert Monitor — ประวัติ Alert

```text
┌────────────────────────────────────────────────────────────┐
│  Alert Monitor                                             │
├─────────┬───────────┬──────────┬──────────┬───────────────┤
│ Event # │ ช่องทาง  │ สถานะ    │ เวลา     │ Response      │
├─────────┼───────────┼──────────┼──────────┼───────────────┤
│   47    │ TEAMS     │ ✅ SENT  │ 10:05:33 │ 200 Accepted  │
│   47    │ EMAIL     │ ✅ SENT  │ 10:05:34 │ SENT          │
│   46    │ TEAMS     │ ❌ FAILED│ 09:41:16 │ 429 Rate limit│
└─────────┴───────────┴──────────┴──────────┴───────────────┘
```
ถ้าเห็น `FAILED` → ต้องตรวจสอบ webhook URL หรือ SMTP config

### 5.7 System Health — สถานะระบบ

```text
┌───────────────────────────────────┐
│  System Health                    │
├───────────────┬───────────────────┤
│ Python Service │ ● Running        │
│ Database (DB)  │ ● Connected      │
│ Storage Drive  │ ● Accessible     │
│ Camera-1       │ ● Connected      │
│ Camera-2       │ ● Connected      │
│ Camera-3       │ ○ Disconnected   │
└───────────────┴───────────────────┘

Last check: 2026-01-01 10:10:00
```
**ถ้า error:**
| สถานะ | ความหมาย | ต้องทำอะไร |
|-------|---------|-----------|
| DB ❌ | Python ต่อ MSSQL ไม่ได้ | ตรวจ DB Server, network, credentials |
| Storage ❌ | shared drive เข้าไม่ได้ | ตรวจ path และ permission |
| Camera ❌ | กล้องหลุด | ตรวจ network/IP/RTSP URL |

### 5.8 Log ล่าสุดใน Health page

```text
System Log
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10:10:00 INFO   System health check: db=OK, storage=OK
10:09:00 ERROR  กล้อง 3 ไม่สามารถเชื่อมต่อได้
10:05:32 INFO   Event #47 บันทึกสำเร็จ
10:05:30 INFO   ตรวจพบคน Camera-1 confidence=87%
```
---

## ส่วนที่ 6 — แบบฝึกหัด

1. **เปิดเว็บ:** รัน frontend + data-api + Python service แล้วเปิด <http://localhost:5173>
2. **เดิน test:** เดินเข้าพื้นที่อันตราย (ถ้ามีกล้อง) รอ 5 วิ แล้วดูว่า event ปรากฏใน Event Log
3. **ดูรูปภาพ:** คลิก event แล้วดูรูปที่บันทึก — ต้องเห็น polygon และ bbox
4. **ดู Alert:** ดู Alert Monitor ว่า Teams/Email ส่งสำเร็จหรือไม่
5. **จำลอง error:** ปิด Python service แล้วดู System Health — ต้องเห็น warning

---

## ส่วนที่ 7 — Checklist หลังเรียน

- [ ] Login ด้วย company_code และดู Dashboard ได้
- [ ] ดู Event Log และ filter ตามกล้อง/วันได้
- [ ] คลิก event ดูรูปภาพได้ (หรือเห็น placeholder ถ้าไม่มีรูป)
- [ ] ดู Camera Monitor รู้ว่ากล้องไหน Online/Offline
- [ ] ดู Alert Monitor รู้ว่า Teams/Email ส่งสำเร็จหรือ FAILED
- [ ] ดู System Health รู้ว่าองค์ประกอบใด OK หรือ error

---

## ส่วนที่ 8 — Common Error + วิธีแก้

### หน้าเว็บขาว หรือ "Cannot connect to API"

**สาเหตุ:** data-api ไม่ได้รัน

```bash
# รัน data-api (ใน terminal แยก)
cd data-api
npm install
npm start
# หรือ node index.js
```
---

### Event Log ว่าง ทั้งที่ระบบทำงาน

**สาเหตุ 1:** `company_code` ที่ login ไม่ตรงกับที่ Python บันทึก

ตรวจสอบ: ใน `.env` ตั้ง `COMPANY_CODE=DEMO` และ login ด้วย `DEMO`

**สาเหตุ 2:** Python ยังไม่เชื่อม DB หรือ insert ล้มเหลว

ดูใน `logs/walkway.log` หา error เกี่ยวกับ `insert_detection_event`

---

### รูปภาพไม่ขึ้น (ไม่ใช่ "ไม่พบรูป")

**สาเหตุ:** Backend (data-api) ไม่สามารถอ่านไฟล์จาก Shared Drive ได้ หรือ API Route ไม่ถูกต้อง

ตรวจสอบ data-api configuration และลองทดสอบ API ภาพโดยตรงที่ `/api/events/{event_id}/image`
ตรวจสอบสิทธิ์การเข้าถึงโฟลเดอร์ของ data-api ว่าสามารถเข้าถึง UNC path ได้หรือไม่

---

### Camera Monitor แสดง "ไม่มีข้อมูล"

**สาเหตุ:** ยังไม่มีข้อมูลกล้องใน DB (ต้องผ่านการบันทึก event ก่อน)

ให้รัน Python service สักพักเพื่อให้ระบบ health check log กล้อง

---

## ส่วนที่ 9 — ควร commit อะไร

```text
✅ commit:
└── (module นี้เป็นการใช้งาน ไม่มีโค้ดใหม่ — แต่ถ้าแก้ component ก็ commit ปกติ)
    frontend/src/pages/
    frontend/src/components/
```
---

## ส่วนที่ 10 — ไม่ควร commit อะไร

```text
❌ ห้าม commit:
├── frontend/node_modules/
├── frontend/dist/
├── frontend/.env.local
└── screenshots/             (รูป UI ทดสอบ)
```