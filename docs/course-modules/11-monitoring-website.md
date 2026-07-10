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
หน้า Login → ใส่ Username + Password เท่านั้น (รับ JWT Token — บริษัทถูกกำหนดจาก JWT ฝั่ง server)
        ↓
Dashboard แสดงสรุป
        ↓
ดู Event Log → กรองตามวัน/กล้อง/สถานะ + เลือกหลาย event เพื่อ bulk resolve/reject
        ↓
คลิก Event → ดูรูปภาพ + รายละเอียด (+ ปิดเคส ถ้าเปิดใช้งาน)
        ↓
ดู Camera Monitor → สถานะกล้อง + จัดการกล้อง (เพิ่ม/แก้ไข/ลบ/วาด polygon)
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
[เข้าสู่ระบบ]
```
**ไม่มีช่องกรอกรหัสบริษัท** — login ใช้แค่ username/password เท่านั้น ระบบเป็นแบบ single-tenant (หนึ่ง deployment = หนึ่งบริษัท) บริษัทที่ผู้ใช้เห็นข้อมูลถูกกำหนดฝั่ง server จาก JWT โดยอัตโนมัติ

เมื่อเข้าสู่ระบบสำเร็จ ระบบจะได้รับ **JWT Token** มาเก็บไว้ที่เบราว์เซอร์ (`localStorage`) และจะแนบ Token นี้ไปกับทุก API request เพื่อยืนยันสิทธิ์ในการเข้าถึงข้อมูล (Dashboard, Event Log, Camera Monitor)

> กลไกเบื้องหลังทั้งหมด — bcrypt hashing, JWT issuance/verification/expiry, และการโหลดรูปภาพผ่าน data-api พร้อมแนบ token — อธิบายละเอียดใน **Module 10 หัวข้อ 5.6 Authentication & Authorization**

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
│  Event Log                [สถานะ ▼] [กล้อง ▼] [วัน] │
├──┬─────┬────────────┬──────────┬──────────┬─────────┤
│☐│  # │ กล้อง      │ พื้นที่   │ เวลา     │ ความมั่นใจ │
├──┼─────┼────────────┼──────────┼──────────┼─────────┤
│☑│ 47 │ Camera-1   │ ทางเดิน  │ 10:05:32 │ 87.0%   │
│☑│ 46 │ Camera-2   │ โกดัง A  │ 09:41:15 │ 92.3%   │
└──┴─────┴────────────┴──────────┴──────────┴─────────┘
      [เลือกทั้งหมด]      [Resolve ที่เลือก] [Reject ที่เลือก]
```
**การใช้งาน:**

- กรองตาม **สถานะ**: New / Resolved / Rejected
- กรองตาม **กล้อง**: เลือก Camera-1, Camera-2, ... ทั้งหมด
- กรองตาม **วันที่**: เลือกช่วงเวลา
- ค้นหาด้วยข้อความ (free-text search)
- คลิก **แถว event** → ดูรายละเอียดและรูปภาพ
- **ติ๊กเลือกหลาย event** ที่ checkbox ซ้ายมือ → กด "เลือกทั้งหมด" ได้ด้วย → แถบ bulk action ลอยขึ้นมาให้ Resolve/Reject event ที่เลือกพร้อมกันทีเดียว (ไม่ต้องเปิดทีละ event)

### 5.4 รายละเอียด Event + รูปภาพ

คลิก event ใด ๆ จะเห็น:

```text
Event #47
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
บริษัท:   DEMO
กล้อง:    Camera-1 (กล้อง 1)
พื้นที่:   ทางเดินหน้าโกดัง
เวลา:     2026-01-01 10:05:32
ความมั่นใจ: 87.0%

[รูปภาพ detection] ← มี polygon + bbox วาดไว้
                      ถ้าไม่พบรูป → "Detection Frame Unavailable"
```
หน้ารายละเอียด event จริงแสดงข้อมูล **Camera Source, Company ID, Restricted Area, Timestamp, AI Confidence** เท่านั้น — ไม่มีฟิลด์ "ประเภท event" (INTRUSION/DWELL) แยกต่อ event สถิติ intrusion/dwell มีให้ดูแบบภาพรวมที่หน้า Dashboard เท่านั้น

รูปภาพที่เห็นถูก data-api อ่านจาก `IMAGE_SHARED_DRIVE` แล้ว stream กลับมาให้ frontend fetch พร้อมแนบ token (ดู Module 10 หัวข้อ 5.6.3) — ตอนเรียนคอร์ส แค่ตั้ง `IMAGE_SHARED_DRIVE` เป็น local path เช่น `C:\DetectionImages` รูป detection จริงก็จะแสดงบนเว็บได้เลย ถ้าหาไฟล์ไม่เจอ (ถูกลบ/drive ไม่ได้ mount) ระบบจะแสดงข้อความ "Detection Frame Unavailable" แทนที่จะ error

> **ถ้าเปิดใช้งาน** ตัวแปร `VITE_CLOSE_CASE_MODE=true` ในไฟล์ `.env.local` ของ frontend หน้านี้จะมี panel เพิ่มเติมให้ "ปิดเคส" (resolve/reject พร้อมแนบรูปหลักฐานและคำอธิบาย) — ถ้าไม่ได้ตั้งค่าไว้ panel นี้จะไม่แสดงเลย

### 5.5 Camera Monitor — สถานะกล้อง + จัดการกล้อง

```text
┌─────────────────────────────────────────────────────┐
│  Camera Monitor      [ทั้งหมด|Online|Offline] [ค้นหา]│
│                                      [+ เพิ่มกล้อง]  │
├────────────────────┬────────────┬───────────┬───────┤
│  กล้อง            │ สถานะ      │ ตรวจจับล่าสุด │ จัดการ│
├────────────────────┼────────────┼───────────┼───────┤
│  Camera-1          │ ● Online   │ 10:05:32  │ ✎ 🗑 📐│
│  Camera-2          │ ● Online   │ 09:41:15  │ ✎ 🗑 📐│
│  Camera-3          │ ○ Offline  │ เมื่อวาน  │ ✎ 🗑 📐│
└────────────────────┴────────────┴───────────┴───────┘
```
**สี indicator:**

- 🟢 Green = Online, ตรวจจับปกติ
- 🔴 Red = Offline หรือ error
- 🟡 Yellow = Warning (ไม่ได้ส่ง alert นาน)

**หน้านี้ไม่ใช่แค่ตารางอ่านอย่างเดียว** — เป็นหน้าจัดการกล้องแบบเต็มรูปแบบ:

- **[+ เพิ่มกล้อง]** เปิด modal ให้กรอกยี่ห้อ (Hikvision/Dahua/Panasonic/generic), IP, credentials — ระบบสร้าง RTSP URL ให้อัตโนมัติตามยี่ห้อ พร้อมตั้งตารางเวลาเปิด/ปิดตรวจจับ (Detection Schedule)
- **✎ แก้ไข** และ **🗑 ลบ** กล้องแต่ละตัวได้
- **📐 วาดโซน** เปิด canvas ให้คลิกปักจุด polygon พื้นที่อันตรายของกล้องนั้นได้เอง โดยไม่ต้องแก้ไฟล์ JSON เอง

รายละเอียดกลไกเบื้องหลังทั้งหมด (การสร้าง RTSP URL ตามยี่ห้อ, การเก็บตารางเวลาเป็น `schedule_json`, และวิธีที่ Python service อ่านค่าที่ตั้งจากหน้านี้ไปใช้จริง) อธิบายละเอียดใน **Module 06 ส่วนที่ 6 — การจัดการกล้องและ Polygon พื้นที่ผ่านเว็บ**

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
┌───────────────────────────────────────┐
│  System Health                        │
├─────────────────────┬─────────────────┤
│ Python Service       │ ● Running      │
│ Database (DB)        │ ● Connected    │
│ Storage Drive         │ ● Accessible   │
│ Camera-1              │ ● Connected    │
│ Camera-2              │ ● Connected    │
│ Camera-3              │ ○ Disconnected │
│ Alert Webhook Delivery│ ● OK (24 ชม.)  │
└─────────────────────┴─────────────────┘

Last check: 2026-01-01 10:10:00

▸ Diagnostic Raw JSON Payload (คลิกเพื่อขยาย)
```
"Alert Webhook Delivery (Last 24 Hours)" คือแถวสรุปว่า Teams/Email webhook ในช่วง 24 ชั่วโมงล่าสุดส่งสำเร็จ/ล้มเหลวกี่ครั้ง ส่วน "Diagnostic Raw JSON Payload" เป็น panel แบบพับเก็บ (`<details>`) ที่ dump ค่าตรวจ health ทั้งหมดเป็น JSON ดิบ ไว้ให้แอดมิน/ผู้พัฒนาไล่ debug ได้ละเอียดกว่าตารางสรุปด้านบน

**ถ้า error:**
| สถานะ | ความหมาย | ต้องทำอะไร |
|-------|---------|-----------|
| DB ❌ | Python ต่อ MSSQL ไม่ได้ | ตรวจ DB Server, network, credentials |
| Storage ❌ | shared drive เข้าไม่ได้ | ตรวจ path และ permission |
| Camera ❌ | กล้องหลุด | ตรวจ network/IP/RTSP URL |

### 5.8 ส่วนอื่น ๆ ที่เห็นทันทีตอนเปิดเว็บ

หน้าเว็บมีองค์ประกอบเล็ก ๆ ที่ใช้บ่อยแต่ไม่ได้อยู่ในหน้าใดหน้าหนึ่งโดยเฉพาะ:

- **สลับธีมมืด/สว่าง** — ปุ่มรูปพระอาทิตย์/พระจันทร์มุมขวาบน (TopBar) สลับได้ทันที ระบบจำค่าไว้ให้ (persist) ครั้งหน้าเปิดเว็บจะเป็นธีมเดิม
- **Badge บริษัท (read-only)** — ที่ sidebar ด้านซ้ายจะมี badge แสดง `company_code` ของ deployment นี้ (มาจาก JWT) เป็นแค่ข้อมูลแสดงผล เปลี่ยนเองไม่ได้ เพราะระบบเป็น single-tenant หนึ่ง deployment ให้บริการบริษัทเดียว
- **Sidebar แบบ responsive** — บนจอเล็ก/มือถือ sidebar จะยุบเป็นเมนูแบบ drawer เปิด/ปิดด้วยปุ่มแฮมเบอร์เกอร์แทนการแสดงเต็มด้านซ้ายตลอดเวลา

> **หมายเหตุ:** เอกสารรุ่นก่อนหน้าเคยอธิบายว่าหน้า System Health มี panel "System Log" แสดง log แบบ INFO/ERROR สด ๆ — ในระบบจริงไม่มี panel นี้ มีแค่ "Diagnostic Raw JSON Payload" ที่กล่าวถึงใน §5.7 เท่านั้น ถ้าต้องการดู log จริงของฝั่ง Python ต้องเปิดไฟล์ `logs/walkway.log` บนเครื่องที่รัน service โดยตรง

---

## ส่วนที่ 6 — แบบฝึกหัด

1. **เปิดเว็บ:** รัน frontend + data-api + Python service แล้วเปิด <http://localhost:5173>
2. **เดิน test:** เดินเข้าพื้นที่อันตราย (ถ้ามีกล้อง) รอ 5 วิ แล้วดูว่า event ปรากฏใน Event Log
3. **ดูรูปภาพ:** คลิก event แล้วดูรูปที่บันทึก — ต้องเห็น polygon และ bbox
4. **ดู Alert:** ดู Alert Monitor ว่า Teams/Email ส่งสำเร็จหรือไม่
5. **จำลอง error:** ปิด Python service แล้วดู System Health — ต้องเห็น warning

---

## ส่วนที่ 7 — Checklist หลังเรียน

- [ ] Login ด้วย username/password (ไม่มีช่อง company_code) แล้วดู Dashboard ได้
- [ ] ดู Event Log, filter ตามสถานะ/กล้อง/วัน, และลอง bulk resolve/reject event ได้
- [ ] คลิก event ดูรูปภาพได้ (หรือเห็น "Detection Frame Unavailable" ถ้าไม่มีรูป)
- [ ] ดู Camera Monitor รู้ว่ากล้องไหน Online/Offline และรู้ว่าเพิ่ม/แก้ไข/ลบ/วาด polygon ได้จากหน้านี้
- [ ] ดู Alert Monitor รู้ว่า Teams/Email ส่งสำเร็จหรือ FAILED
- [ ] ดู System Health รู้ว่าองค์ประกอบใด OK หรือ error พร้อมเปิดดู Diagnostic Raw JSON ได้
- [ ] ลองสลับธีมมืด/สว่าง และสังเกต badge บริษัท (read-only) ที่ sidebar

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

**สาเหตุ 1:** `COMPANY_CODE` ที่ฝั่ง Python (`.env`) ไม่ตรงกับบริษัทของบัญชีที่ใช้ login

ตรวจสอบ: ใน `.env` ของ Python ตั้ง `COMPANY_CODE=DEMO` ให้ตรงกับ `company_code` ของบัญชีที่ใช้ login (เช่น `demo_admin`) — ระบบเป็น single-tenant ผู้ใช้เห็นเฉพาะข้อมูลบริษัทของ deployment นี้เสมอ ถ้า Python เขียน event ด้วย company_code คนละค่ากับบัญชีที่ login เว็บจะไม่เห็น event นั้น

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