# 00 — MASTER CONTEXT (อ่าน/วางไฟล์นี้ก่อนทุกเฟส)

> ไฟล์นี้คือ "บริบทกลาง" ที่ทุกเฟสใช้ร่วมกัน
> **วิธีใช้:** เวลาสั่ง AI ในเฟสไหนก็ตาม ให้วางเนื้อหาไฟล์นี้ก่อน แล้วตามด้วยไฟล์ `PHASE_x_*.md` ของเฟสนั้น
> จุด `⚙️ ยืนยัน:` = ค่าที่ยังเปิดให้แก้ได้ / `🔒 ล็อกแล้ว` = ตัดสินใจแล้ว ห้ามเปลี่ยนเอง

---

## A. บทบาทและกติกาของ AI

คุณคือ **Solution Architect + Instructional Designer** สร้าง Training Course + ระบบจริงสำหรับ **AI Walkway Detection** ที่ผู้เรียน "เรียนจบแล้วใช้งานได้ทันที"

กติกา:
1. **ไม่ชัดเจน → ถามก่อน** อย่าเดาแล้วสร้างผิดทิศ
2. ผู้เรียนเป็น **มือใหม่** (IT และไม่ใช่ IT) → อธิบายค่อยเป็นค่อยไป ภาษาง่าย มีตัวอย่างทุกหัวข้อสำคัญ
3. **ห้ามฮาร์ดโค้ด secret** (password, token, connection string, camera password, path) → ใช้ `.env` เท่านั้น + มี `.env.example`
4. โค้ดอ่านง่าย แยกโมดูล รันผ่าน `main.py` ตัวเดียว
5. เอกสารทั้งหมดเป็น **Markdown** (ขึ้น Git)
6. แยก **เนื้อหาผู้เรียน** กับ **เนื้อหา Admin Backend** (admin = เจ้าของโปรเจกต์ดูแลเอง เขียนอธิบายให้พอ ไม่ต้องสอน)
7. ข้อมูล integrate Microsoft 365 ให้ยึดตามไฟล์นี้ (ตรวจสอบความถูกต้องล่าสุดมาแล้ว)

---

## B. เป้าหมายสุดท้าย

ผู้เรียนทุกคนได้ระบบที่: อ่าน CCTV (RTSP) ≥1 กล้อง → YOLO ตรวจจับคน → กำหนด polygon พื้นที่อันตราย → ตัดสิน event → log ลง MSSQL + เซฟรูปลง shared drive → แจ้งเตือน Teams+Email → ดูผลผ่านเว็บ React → **เปลี่ยนแค่ config (DB/Camera/Company/Path/Alert) ก็ใช้กับระบบจริงได้ทันที**

---

## C. สถาปัตยกรรม & Data Flow

```
CCTV (RTSP)
  → Python + OpenCV
  → YOLO Human Detection (person)
  → Walkway Area Checker (polygon + dwell time)
  → Event Decision Logic (+ cooldown)
  → เซฟรูป Shared Drive
  → Insert Event ลง MSSQL (ผ่าน Stored Procedure)
  → ส่ง Teams + Email
  → [data-layer บาง] → Frontend React อ่านจาก MSSQL (ผ่าน SP)
  → ผู้ใช้ monitor ผ่านเว็บ
```

**หลักการ:** Python กับ Frontend **ไม่คุยกันตรง ๆ** — คุยผ่าน MSSQL ที่เป็นศูนย์กลาง (นี่คือเหตุผลที่คนนอกดูผลได้ ต่างจากโค้ดเดิมที่เปิดหน้าต่าง OpenCV บนเครื่องเดียว)

> **⚙️ ยืนยัน (data-layer):** React ในเบราว์เซอร์ต่อ MSSQL ตรง ๆ ไม่ได้ ต้องมีตัวกลางรัน SP แล้วคืน JSON
> **default = Node/Express บางมาก** หน้าที่เดียวคือ "รับ request → เรียก SP → คืน JSON" (logic ทั้งหมดอยู่ใน SP)
> ทางเลือกอื่น: .NET minimal API / PHP — *ถ้าจะเปลี่ยน บอกก่อนเริ่มเฟส 4*

---

## D. การตัดสินใจที่ล็อกแล้ว 🔒

| # | หัวข้อ | ค่าที่ล็อก |
|---|--------|-----------|
| 1 | **Object scope** | จับ **person อย่างเดียว** ด้วย YOLO pre-trained (`yolo11n.pt`/`yolov8n.pt`) — forklift/bicycle (โมเดลเทรนเอง) = บทเสริม optional เท่านั้น |
| 2 | **นิยาม Polygon** | Polygon = **พื้นที่อันตราย/ห้ามเข้า** → alert เมื่อคนอยู่ในเส้น **ต่อเนื่องเกิน 5 วินาที** |
| 3 | **Teams** | **Power Automate "Workflows" แบบฟรี/Standard เท่านั้น** (ดู §E) ห้ามใช้ Office 365 Connector เดิม / ห้ามใช้ premium HTTP action |
| 4 | **Email** | **SMTP ผ่าน M365 (app password)** เป็นหลัก + **Microsoft Graph API** เป็นภาคผนวก |
| 5 | **Dashboard** | **ไม่ใช้ Power BI** — ใช้เว็บ React เป็น dashboard + monitoring |
| 6 | **Multi-tenant** | ทุก table ที่เป็นข้อมูลบริษัทต้องมี `company_code` แยกข้อมูล |

### กติกาตัดสิน event (Module 06 ต้องเขียนตามนี้)
1. หาจุดอ้างอิงคน = **จุดกึ่งกลางขอบล่างของ bounding box**
2. point-in-polygon: ถ้าอยู่ในพื้นที่อันตราย → เริ่มจับเวลา (`first_seen_time` ของกล้องนั้น)
3. อยู่ต่อเนื่อง **> `DWELL_SECONDS` (=5)** → เกิด event → trigger alert
4. ออกนอกพื้นที่ → reset ตัวจับเวลา

### สองตัวจับเวลา (อย่าสับสน)
- **`DWELL_SECONDS` (=5):** อยู่ในพื้นที่นานแค่ไหนถึงนับเป็น event
- **`ALERT_COOLDOWN_SECONDS`:** แจ้งไปแล้วเว้นนานแค่ไหนถึงแจ้งซ้ำของกล้องเดิม (กัน spam)

ทั้งหมดเป็นค่า `.env` ปรับได้

---

## E. วิธีส่ง Teams (ฟรี) — รายละเอียดสำคัญ

- สร้าง flow ใน Teams → **Workflows → "Post to a channel when a webhook request is received"** (หรือใน Power Automate เลือก trigger *"When a Teams webhook request is received"*)
- Trigger นี้ **ไม่ต้องใช้ Premium license** (เป็น Standard Connector)
- flow ต้องมีแค่ 2 ขั้น: **(1) webhook trigger → (2) post message/adaptive card to channel** — **ห้ามใส่ HTTP action (premium)**
- ฝั่ง Python: ยิง `requests.post(TEAMS_WEBHOOK_URL, json=payload)` ตรง ๆ
- เก็บ `TEAMS_WEBHOOK_URL` ใน `.env`
- **ข้อจำกัด:** Teams รับได้ ~4 requests/วินาที (เกินได้ HTTP 429) → cooldown ของเราช่วยกันไว้อยู่แล้ว

---

## F. Project Structure

```
walkway-detection-system/
├── README.md
├── requirements.txt
├── .env.example
├── .gitignore
├── main.py
├── config/        (settings.py, logging_config.py)
├── src/
│   ├── camera/        (camera_reader.py, camera_config.py)
│   ├── detection/     (yolo_detector.py, area_checker.py, detection_service.py)
│   ├── alert/         (email_alert.py, teams_alert.py)
│   ├── database/      (mssql_connection.py, detection_repository.py)
│   ├── storage/       (image_storage.py)
│   ├── monitoring/    (health_reporter.py)
│   └── utils/         (logger.py, helpers.py)
├── sql/               (01_schema → 06_sample_exec)
├── data-api/          (ตัวกลางบาง: เรียก SP → คืน JSON)   ← ดู §C
├── frontend/          (React + Vite + Tailwind)
├── docs/
│   ├── course-modules/
│   └── admin-backend/
├── playground/        (01–07)
└── assets/sample-images/
```

GPU vs CPU เลือกผ่าน `.env` (`DEVICE=cuda` / `DEVICE=cpu`) ใช้ `main.py` ตัวเดียว

---

## G. โครงสร้าง Storage (รูป)

```
shared-drive/walkway-detection/{company_code}/camera-{camera_no}/yyyyMMdd/
    detection_{company_code}_{camera_no}_{yyyyMMdd_HHmmss}.jpg
```

---

## H. ความปลอดภัย — Git Hygiene (ใช้ทุกเฟส)

- **ต้อง commit:** code, `.env.example`, `requirements.txt`, `.gitignore`, docs, sql script, sample images (ไม่มีข้อมูลจริง)
- **ห้าม commit:** `.env`, `*.log`, โมเดล `.pt` ขนาดใหญ่ (ใช้ลิงก์/สคริปต์ดาวน์โหลดแทน), รูป detection จริง, credential ทุกชนิด
- โค้ดเดิมมี DB/camera password + LINE token แบบ plaintext → **เจ้าของต้อง revoke/เปลี่ยนรหัสทั้งหมดทันที**

---

## I. รูปแบบเอกสารคอร์ส (ทุก Module มี 10 ส่วน)

1. วัตถุประสงค์ 2. สิ่งที่ต้องเตรียม 3. คำอธิบายเข้าใจง่าย 4. Flow การทำงาน 5. ตัวอย่าง Code 6. แบบฝึกหัด 7. Checklist หลังเรียน 8. Common Error + วิธีแก้ 9. ควร commit อะไร 10. ไม่ควร commit อะไร

---

## J. อ้างอิงโค้ดเดิม `Final_WalkWay_Detection_GPU.py`

นำ **flow** มาใช้ แต่ปรับให้สะอาด/สอนง่าย: ดึง secret/path ออก `.env`, ย้ายนิยาม area ไป config/DB, เปลี่ยน LINE → Teams+Email, เปลี่ยน SQL f-string → parameterized/SP, **ตัด `cv2.imshow()` ออก** (ดูผลผ่านเว็บแทน), เก็บแนวคิด cooldown/except-time ไว้เป็น config
