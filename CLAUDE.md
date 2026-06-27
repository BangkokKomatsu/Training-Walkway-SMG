# CLAUDE.md

ไฟล์นี้คือ **กฎประจำโปรเจกต์** สำหรับ AI agent ทุกครั้งที่ทำงานใน repo นี้
อ่านไฟล์นี้ก่อนแก้โค้ดเสมอ และทำตามอย่างเคร่งครัด

---

## 1. โปรเจกต์นี้คืออะไร

**Walkway Detection System + Training Course** — ระบบ AI ตรวจจับคนเดินเข้าพื้นที่อันตรายจาก CCTV
อ่าน RTSP → YOLO ตรวจจับคน → เช็ค polygon พื้นที่อันตราย → ตัดสิน event → เซฟรูป + log ลง MSSQL → แจ้งเตือน Teams/Email → ดูผลผ่านเว็บ React

เป้าหมาย: ผู้เรียน (มือใหม่ มีทั้ง IT/ไม่ใช่ IT) เรียนจบแล้ว **เปลี่ยนแค่ config ก็ใช้ระบบจริงได้ทันที**

---

## 2. Data Flow

```
CCTV (RTSP) → Python+OpenCV → YOLO(person) → Area Checker(polygon+dwell)
  → Event Logic(+cooldown) → เซฟรูป Shared Drive → Insert MSSQL (ผ่าน SP)
  → Teams + Email → [data-api บาง] → React อ่านจาก MSSQL (ผ่าน SP) → ผู้ใช้ monitor
```

**สำคัญ:** Python กับ Frontend **ไม่คุยกันตรง ๆ** — คุยผ่าน MSSQL เป็นศูนย์กลางเท่านั้น

---

## 3. โครงสร้าง repo (ของอยู่ที่ไหน)

```
config/      → โหลด .env, logging        src/storage/    → เซฟรูป shared drive
src/camera/  → อ่าน RTSP + reconnect     src/monitoring/ → health report
src/detection/ → yolo, area, service     src/utils/      → logger, helpers
src/alert/   → teams, email              sql/            → table + SP + sample (admin)
src/database/→ connection + repository   data-api/       → ตัวกลาง: เรียก SP → คืน JSON
frontend/    → React+Vite+Tailwind       docs/           → course-modules + admin-backend
playground/  → ตัวอย่างให้ผู้เรียนลอง     main.py         → entry point เดียว
```

---

## 4. การตัดสินใจที่ล็อกแล้ว — ห้ามเปลี่ยนเอง 🔒

1. **จับ `person` อย่างเดียว** ด้วย YOLO pre-trained `yolo11n.pt` (forklift/bicycle = บทเสริม optional เท่านั้น)
   - 📖 YOLO11 Docs: <https://docs.ultralytics.com/models/yolo11>
   - 📖 Ultralytics Docs (หน้าหลัก): <https://docs.ultralytics.com>
   - *(YOLO26 ออกมาแล้ว ม.ค. 2026 — ใช้ได้เช่นกัน แต่คอร์สอ้างอิง YOLO11 เป็นหลัก)*
2. **Polygon = พื้นที่อันตราย/ห้ามเข้า** → alert เมื่อคนอยู่ในเส้น **ต่อเนื่อง > `DWELL_SECONDS` (5 วิ)**
   - จุดอ้างอิงคน = จุดกึ่งกลางขอบล่างของ bounding box
   - ออกนอกพื้นที่ → reset ตัวจับเวลา
3. **Teams = Power Automate "Workflows" webhook (ฟรี/Standard) เท่านั้น**
4. **Email = SMTP M365 (app password)** หลัก + **Graph API** ภาคผนวก
5. **ไม่ใช้ Power BI** — เว็บ React คือ dashboard + monitoring
6. ทุก table/query ข้อมูลบริษัทต้องมี **`company_code`** แยกข้อมูล
7. Backend **ไม่เป็น REST API** — logic อยู่ใน **Stored Procedure**; `data-api/` เป็นแค่ตัวกลางบางที่เรียก SP → คืน JSON

**สองตัวจับเวลา (อย่าสับสน):** `DWELL_SECONDS` = อยู่ในพื้นที่นานแค่ไหนถึงนับ event · `ALERT_COOLDOWN_SECONDS` = แจ้งแล้วเว้นนานแค่ไหนถึงแจ้งซ้ำ

---

## 5. ห้ามทำเด็ดขาด ❌

- ❌ **ฮาร์ดโค้ด secret** (password, token, connection string, camera password, path, webhook URL) → ใช้ `.env` เท่านั้น
- ❌ **`cv2.imshow()` / เปิดหน้าต่าง GUI** → ดูผลผ่านเว็บแทน (โค้ดเดิมพังเพราะข้อนี้ — คนนอกดูไม่ได้)
- ❌ **SQL ต่อด้วย f-string / string concat** → ใช้ parameterized query หรือเรียก SP เท่านั้น (กัน SQL injection)
- ❌ **Teams ผ่าน Office 365 Connector / Incoming Webhook เดิม** → Microsoft ปิดถาวรแล้ว (พ.ค. 2026) ใช้ Power Automate Workflows
- ❌ **ใช้ premium HTTP action ใน Power Automate flow** → ฝั่ง Python ยิง `requests.post(webhook_url)` ตรง ๆ, flow แค่ trigger + post message
- ❌ **LINE Notify** → ปิดบริการแล้ว
- ❌ commit `.env`, `*.log`, `*.pt`, `node_modules/`, `dist/`, รูป detection จริง

---

## 6. Coding conventions

**Python**
- รันผ่าน `main.py` ตัวเดียว, แยกโมดูลตามโฟลเดอร์ §3
- โค้ดอ่านง่าย เหมาะมือใหม่ — ตั้งชื่อชัด, comment พอดี, ไม่ over-engineer
- ทุกค่า config โหลดจาก `config/settings.py` (ที่อ่าน `.env`) ห้ามอ่าน `os.getenv` กระจัดกระจาย
- ใช้ `logging` (ตั้งใน `config/logging_config.py`) ไม่ใช้ `print` ใน production path
- GPU/CPU เลือกผ่าน `DEVICE` ใน `.env`

**SQL**
- schema `ww`, ทุก SP ขึ้นต้น `ww.sp_*`, รองรับ filter `company_code`/`camera_no`/date range/status
- ส่งมอบเป็น script รันเองได้ + มีตัวอย่าง `EXEC`

**Frontend (React+Vite+Tailwind)**
- เรียกข้อมูลผ่าน `data-api` เท่านั้น (base URL จาก env), ไม่ต่อ DB ตรง
- หน้าตา clean / modern / industrial-safety — ดูเป็น product จริง ไม่ generic
- มี loading state, empty state, จัดการกรณีรูปหาย

---

## 7. คำสั่งที่ใช้บ่อย

```bash
# Python
pip install -r requirements.txt
python main.py

# SQL (รันตามลำดับ)
sql/01_create_schema.sql → 06_sample_exec_commands.sql

# Frontend
cd frontend && npm install && npm run dev
npm run build        # ได้ dist/ → ทีม admin deploy IIS HTTPS เอง
```

---

## 8. แผนการสร้าง (Build Order)

สร้าง/แก้ **ทีละเฟส** อ้างอิงไฟล์ `PHASE_x_*.md`:
- เฟส 0 scaffold · เฟส 1 python core · เฟส 2 SQL/SP (admin) · เฟส 3 integration · เฟส 4 frontend+data-api · เฟส 5 course docs

แต่ละเฟสมี "✅ Acceptance checklist" — ทำให้ผ่านก่อนไปต่อ

---

## 9. เนื้อหา 2 กลุ่ม — แยกให้ชัด

- **ผู้เรียนทั่วไป:** `docs/course-modules/` (อธิบายละเอียด ค่อยเป็นค่อยไป)
- **Admin (เจ้าของดูแลเอง):** `docs/admin-backend/`, `sql/`, `data-api/` (อธิบายให้ admin พอ ไม่ต้องสอน)

---

## 10. ลิงก์อ้างอิงหลัก (External References)

| หัวข้อ | ลิงก์ |
|--------|-------|
| Ultralytics Docs (หน้าหลัก) | <https://docs.ultralytics.com> |
| YOLO11 Overview | <https://docs.ultralytics.com/models/yolo11> |
| YOLO Quickstart (ติดตั้ง + รันครั้งแรก) | <https://docs.ultralytics.com/quickstart> |
| Python Usage | <https://docs.ultralytics.com/usage/python> |
| Predict Mode (bbox/conf ทำงานยังไง) | <https://docs.ultralytics.com/modes/predict> |
| Object Detection Task | <https://docs.ultralytics.com/tasks/detect> |
| Model List + Download (yolo11n.pt ฯลฯ) | <https://docs.ultralytics.com/models> |
| License AGPL-3.0 vs Enterprise | <https://www.ultralytics.com/license> |
| YOLO26 (รุ่นล่าสุด ม.ค. 2026) | <https://docs.ultralytics.com/models/yolo26> |
| GitHub ultralytics | <https://github.com/ultralytics/ultralytics> |

> **หมายเหตุสำหรับ AI agent:** เมื่อเขียนโค้ดหรือเอกสารที่เกี่ยวกับ YOLO ให้แนบลิงก์ที่เกี่ยวข้องจากตารางนี้เสมอ เพื่อให้ผู้เรียนอ่านเพิ่มเติมได้

---

## 11. เมื่อไม่แน่ใจ

**ถามก่อน อย่าเดา** — โดยเฉพาะเรื่องที่กระทบ logic ทั้งบท (นิยาม area, ตัดสิน event, schema, การ integrate M365) ดูบริบทเต็มได้ที่ `00_MASTER_CONTEXT.md`
