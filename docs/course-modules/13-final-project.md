# Module 13 — Final Project: ประกอบทุกส่วนเป็นระบบจริง

> **ระดับ:** รวมทุก module | **เวลาโดยประมาณ:** 3–6 ชั่วโมง (ขึ้นกับ environment จริง)

---

## ส่วนที่ 1 — วัตถุประสงค์

เมื่อจบ module นี้ ผู้เรียนจะสามารถ:

- ประกอบทุกส่วนของระบบ (Python + MSSQL + Shared Drive + Teams + Email + Frontend) ทำงานร่วมกัน
- เปลี่ยน config ให้ตรงกับ environment จริงและระบบทำงานได้ทันที
- ทำ checklist ส่งมอบระบบได้ครบถ้วน
- แก้ปัญหาที่พบบ่อยในการ deploy
- อธิบาย data flow ทั้งระบบได้จากต้นจนจบ

---

## ส่วนที่ 2 — สิ่งที่ต้องเตรียม

- ผ่านทุก module (01–12)
- สิทธิ์เข้าถึงระบบจริง: MSSQL Server, Shared Drive, Teams, M365
- ข้อมูล config จากผู้ดูแลระบบ (IT/admin):
  - DB Server name, Database, User, Password
  - RTSP URL ของกล้อง
  - shared drive path ที่มีสิทธิ์เขียน
  - Teams channel ที่ต้องการรับแจ้งเตือน
  - Email ปลายทาง

---

## ส่วนที่ 3 — คำอธิบายเข้าใจง่าย

### ภาพรวม Data Flow ทั้งระบบ

```text
CCTV (RTSP)
    ↓ OpenCV (Module 04)
อ่าน frame
    ↓ YOLO (Module 05)
ตรวจจับ person
    ↓ AreaChecker (Module 06)
เช็ค polygon + dwell 5 วิ
    ↓
EVENT TRIGGERED
    ↓ ImageStorage (Module 08)
เซฟรูป → shared drive
    ↓ DetectionRepository (Module 07)
Insert MSSQL ผ่าน SP → ได้ event_id
    ↓ TeamsAlert (Module 09)
POST → Power Automate → Teams channel
    ↓ EmailAlert (Module 09)
SMTP → อีเมลผู้รับผิดชอบ
    ↓ UpdateAlertStatus (Module 07)
บันทึกสถานะ Teams/Email ใน MSSQL
    ↓
เว็บ React (Module 10/11) ← ผู้ใช้ monitor
    data-api → MSSQL → JSON → แสดงผล
```
---

## ส่วนที่ 4 — Flow การทำงาน

```text
1. ตั้งค่า .env ทุกค่า
        ↓
2. ทดสอบทีละส่วน (ตาม checklist §5)
        ↓
3. รัน python main.py ทดสอบ end-to-end
        ↓
4. รัน frontend + data-api ดู event ใน web
        ↓
5. ทำ checklist ส่งมอบ
        ↓
6. ส่งมอบให้ทีม admin deploy production
```
---

## ส่วนที่ 5 — ตัวอย่าง Code: วิธีเปลี่ยน Config ไปใช้ระบบจริง

### 5.1 ไฟล์ `.env` สำหรับ Production

สร้างจาก `.env.example` แล้วแก้ทุกค่าตาม environment จริง:

```dotenv
# ============================================================
# Walkway Detection System — Production Config
# สร้างจาก .env.example อย่า commit ไฟล์นี้ขึ้น Git
# ============================================================

# ---- General ----
DEVICE=cpu           # เปลี่ยนเป็น cuda ถ้ามี NVIDIA GPU
COMPANY_CODE=ABC     # รหัสบริษัทจริง (ตกลงกับ admin)

# ---- Detection ----
YOLO_MODEL_PATH=Models/yolo11n.pt
CONF_THRESHOLD=0.5           # ปรับตามผลทดสอบ

# ---- Event Logic ----
DWELL_SECONDS=5              # อยู่นานแค่ไหนถึงนับ event
ALERT_COOLDOWN_SECONDS=120   # เว้นกี่วิถึงแจ้งซ้ำ

# ---- Database ----
DB_DRIVER={ODBC Driver 17 for SQL Server}
DB_SERVER=PROD-SQL-01\SQLEXPRESS
DB_NAME=WalkwayDB
DB_USER=walkway_app
DB_PASSWORD=Pr0dP@ssw0rd!

# ---- Storage ----
IMAGE_SHARED_DRIVE=\\FILESERVER\walkway-images

# ---- Alert: Teams ----
TEAMS_WEBHOOK_URL=https://prod-xx.westeurope.logic.azure.com/workflows/...

# ---- Alert: Email ----
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=noreply@company.com
SMTP_PASSWORD=AppPassword123
ALERT_EMAIL_TO=safety@company.com,manager@company.com
```
### 5.2 ตั้งค่าพิกัดพื้นที่และกล้อง (cameras.json)

นอกจาก `.env` แล้ว จะต้องตั้งค่ากล้องใน `config/cameras.json` — ไฟล์นี้เป็น **array เปล่า ๆ ที่ระดับบนสุด** (ไม่มี key ห่อ เช่น `"cameras"`) และฟิลด์ RTSP URL ชื่อ `rtsp_url` (ไม่ใช่ `source` — `source` เป็นแค่ชื่อ attribute ของ Python หลังโหลดเข้า `CameraConfig` แล้ว):

```json
[
  {
    "camera_no": "CAM001",
    "camera_name": "กล้องหน้าโกดัง A",
    "location_name": "ทางเดินหน้าโกดัง A",
    "rtsp_url": "rtsp://admin:CamP@ss123@10.0.1.55:554/stream1",
    "danger_zones": [
      [[120, 95], [638, 95], [638, 410], [120, 410]]
    ]
  }
]
```

วิธีหาพิกัด:

```bash
# Step 1: รัน python เพื่อ capture เฟรมจากกล้อง
python -c "
from src.camera.camera_reader import CameraReader
import cv2, time, os
os.makedirs('captures', exist_ok=True)
cam = CameraReader('rtsp://admin:pass@10.0.1.55:554/stream1').start()
time.sleep(3)
frame = cam.get_latest_frame()
if frame is not None:
    cv2.imwrite('captures/camera_frame.jpg', frame)
    print(f'บันทึก captures/camera_frame.jpg ({frame.shape[1]}x{frame.shape[0]})')
cam.stop()
"
```
```text
Step 2: เปิดรูป captures/camera_frame.jpg ด้วย Paint หรือ GIMP
Step 3: นำเมาส์ไปชี้ที่มุมพื้นที่อันตราย บันทึกพิกัด (x, y) แต่ละมุม
Step 4: นำพิกัดไปใส่ใน `cameras.json` ในรูปแบบ `[[x1,y1], [x2,y2], ...]`
```
### 5.3 ทดสอบทีละ Component

**ทดสอบ 1 — DB Connection:**
```python
from src.database.mssql_connection import get_connection
try:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT GETDATE()")
    print("✅ DB:", cur.fetchone()[0])
    conn.close()
except Exception as e:
    print("❌ DB:", e)
```
**ทดสอบ 2 — กล้อง RTSP:**
```python
import time
from src.camera.camera_reader import CameraReader
from src.camera.camera_config import load_camera_configs

cameras = load_camera_configs()
cam = CameraReader(cameras[0].source).start()
time.sleep(3)
frame = cam.get_latest_frame()
if frame is not None:
    print(f"✅ กล้อง: {frame.shape}")
else:
    print("❌ กล้อง: ไม่มีเฟรม — ตรวจ RTSP URL")
cam.stop()
```
**ทดสอบ 3 — YOLO:**
```python
import numpy as np
from src.detection.yolo_detector import YoloDetector
from config.settings import settings

detector = YoloDetector(settings.YOLO_MODEL_PATH, settings.DEVICE, settings.CONF_THRESHOLD)
dummy = np.zeros((480, 640, 3), dtype=np.uint8)
result = detector.detect(dummy)
print("✅ YOLO โหลดสำเร็จ (dummy frame ตรวจจับ 0 คน ถือว่าปกติ)")
```
**ทดสอบ 4 — Shared Drive:**
```python
import os
from config.settings import settings

if os.path.isdir(settings.IMAGE_SHARED_DRIVE):
    test_file = os.path.join(settings.IMAGE_SHARED_DRIVE, "test_write.txt")
    try:
        with open(test_file, "w") as f:
            f.write("test")
        os.remove(test_file)
        print(f"✅ Storage: อ่าน/เขียนได้ {settings.IMAGE_SHARED_DRIVE}")
    except Exception as e:
        print(f"❌ Storage: {e}")
else:
    print(f"❌ Storage: path ไม่มีอยู่ {settings.IMAGE_SHARED_DRIVE}")
```
**ทดสอบ 5 — Teams:**
```python
from src.alert.teams_alert import send_teams_alert

test_event = {
    "company_code": "TEST", "camera_no": "TEST-1",
    "camera_name": "Test Camera", "location_name": "Test Area",
    "event_type": "TEST", "confidence": 0.99,
    "detected_at": "2026-01-01 00:00:00", "image_name": "",
    "event_id": 0,
}
success, code, msg = send_teams_alert(test_event)
print(f"{'✅' if success else '❌'} Teams: {code} {msg[:100]}")
```
**ทดสอบ 6 — Email:**
```python
from src.alert.email_alert import send_email_alert

test_event = {
    "company_code": "TEST", "camera_no": "TEST-1",
    "camera_name": "Test Camera", "location_name": "Test Area",
    "event_type": "TEST", "confidence": 0.99,
    "detected_at": "2026-01-01 00:00:00", "image_name": "",
    "event_id": 0,
}
success, msg = send_email_alert(test_event)
print(f"{'✅' if success else '❌'} Email: {msg[:100]}")
```
### 5.4 รัน End-to-End

เมื่อทุก component ผ่านแล้ว:

```bash
# activate walkway
walkway\Scripts\Activate.ps1   # Windows

# รัน Python detection service
python main.py

# ใน terminal แยก: รัน data-api
cd data-api && node index.js

# ใน terminal แยก: รัน frontend
cd frontend && npm run dev
```
เดินเข้าพื้นที่อันตราย (หรือจำลองด้วยวิดีโอ) รอ > 5 วิ แล้วตรวจสอบ:
- [ ] event ใน MSSQL
- [ ] รูปใน shared drive
- [ ] ข้อความใน Teams channel
- [ ] อีเมลใน inbox
- [ ] event ใน web dashboard

---

## ส่วนที่ 6 — แบบฝึกหัด (Final Test)

ทำตามขั้นตอนต่อไปนี้ครบทุกข้อ:

1. **ตั้งค่า .env ครบ:** ใส่ค่าจริงทุกบรรทัด ไม่มีค่าว่างเหลือ
2. **ทดสอบ 6 component:** รันทุก test ด้านบน ผ่านหมด ✅
3. **รัน python main.py:** เดินเข้าพื้นที่ > 5 วิ ดูว่า log แสดง "EVENT TRIGGERED"
4. **ตรวจ Teams:** ดูว่ามีข้อความแจ้งเตือนใน Teams channel
5. **ตรวจ Email:** ดูว่ามีอีเมลใน inbox ผู้รับ
6. **ตรวจ DB:** Query `SELECT TOP 5 * FROM smg.trn_detection_event ORDER BY created_at DESC`
7. **ตรวจรูป:** เปิด folder shared drive ดูว่ามีรูป `.jpg` สร้างขึ้น
8. **ตรวจเว็บ:** เปิดเว็บ monitor ดู event ล่าสุด + รูปภาพ

---

## ส่วนที่ 7 — Checklist ส่งมอบ

### 7A — Python Service

- [ ] `.env` ตั้งค่าครบทุก field
- [ ] `python main.py` รันได้ ไม่มี error ใน log
- [ ] กล้อง RTSP เชื่อมต่อได้ log "เชื่อมต่อกล้องสำเร็จ"
- [ ] YOLO โหลดสำเร็จ log "โหลดโมเดล YOLO สำเร็จ"
- [ ] เดินเข้าพื้นที่ > 5 วิ → log "EVENT TRIGGERED"
- [ ] รูปถูกบันทึกใน shared drive
- [ ] event ถูก insert ใน MSSQL (event_id ได้กลับมา)
- [ ] Teams ส่งสำเร็จ (HTTP 200)
- [ ] Email ส่งสำเร็จ

### 7B — Frontend + data-api

- [ ] `npm run dev` รันได้
- [ ] Login ด้วย username/password จริงได้ (ไม่มีช่อง company_code ที่หน้า login — บริษัทถูกกำหนดจาก JWT ฝั่ง server)
- [ ] Dashboard แสดงตัวเลขถูกต้อง
- [ ] Event Log แสดง event ล่าสุด
- [ ] รูปภาพแสดงได้ใน Event Detail
- [ ] Alert Monitor แสดงสถานะ SENT

### 7C — ความปลอดภัย

- [ ] `.env` ไม่ถูก commit ขึ้น Git (ตรวจ `git status`)
- [ ] `.gitignore` มี `.env`, `walkway/`, `*.pt`, `logs/`
- [ ] ไม่มี password hardcode ในโค้ด

### 7D — ส่งมอบให้ Admin

- [ ] ส่งไฟล์ `.env.example` (template ไม่มีค่าจริง)
- [ ] ส่ง `requirements.txt`
- [ ] ส่ง folder `frontend/dist/` สำหรับ deploy
- [ ] ส่งเอกสาร: RTSP URL, ชื่อ SP ที่ใช้, โครงสร้างโฟลเดอร์รูป
- [ ] Admin ทำ deploy บน server จริง (IIS + HTTPS)

---

## ส่วนที่ 8 — Common Error + วิธีแก้

### ระบบรันได้ แต่ไม่มี event ใน DB

**ตรวจสอบตามลำดับ:**
1. `danger_zones` ใน `cameras.json` ถูกต้อง? (ลอง print ออกมา)
2. `DWELL_SECONDS=5` หรือเปล่า? (คนต้องอยู่ > 5 วิจริง ๆ)
3. ดูใน log มี "EVENT TRIGGERED" หรือไม่
4. ถ้ามี → ดู log ต่อ มี error ที่ `insert_detection_event` ไหม

---

### Teams ไม่ได้รับข้อความ แต่ Email ได้

**สาเหตุ:** webhook URL ผิด หรือ flow ถูกลบ

ดู log: `Teams webhook ตอบ 4xx: ...` → สร้าง flow ใหม่

---

### รูปภาพใน web ขึ้น 403 Forbidden

**สาเหตุ:** data-api ไม่มีสิทธิ์อ่าน shared drive หรือ route `/api/events/:id/image` ไม่ถูก configure

ตรวจสอบ data-api config และ permission ของโฟลเดอร์ให้ Backend อ่านได้

---

### Frontend แสดงข้อมูลเก่า (ไม่ refresh)

**สาเหตุ:** ต้อง refresh หน้าเว็บด้วยตนเอง (ยังไม่มี auto-refresh)

ถ้าต้องการ auto-refresh ใส่ `setInterval` ใน component:
```javascript
useEffect(() => {
  const load = () => api.getDashboard(companyCode).then(setData).catch(console.error)
  load()
  const timer = setInterval(load, 30000)   // refresh ทุก 30 วิ
  return () => clearInterval(timer)
}, [companyCode])
```
---

### กล้องหลุดบ่อยเกินไป (reconnect ถี่)

**สาเหตุ:** network ไม่เสถียร หรือ RTSP URL ผิด format

```json
// ลอง URL แบบอื่นใน cameras.json
"source": "rtsp://admin:pass@10.0.1.55:554/h264/ch1/main/av_stream"
"source": "rtsp://10.0.1.55/live"
```
ตรวจสอบใน VLC Media Player ก่อน

---

## ส่วนที่ 9 — ควร commit อะไร

```text
✅ commit สุดท้ายก่อนส่งมอบ:
├── main.py
├── config/
├── src/
├── frontend/src/
├── docs/course-modules/         ← เอกสารครบทุก module
├── .env.example                 ← template ไม่มีค่าจริง
├── .gitignore
└── requirements.txt
```
---

## ส่วนที่ 10 — ไม่ควร commit อะไร

```text
❌ ห้าม commit:
├── .env                     ← secret ทั้งหมด
├── walkway/
├── node_modules/
├── dist/
├── *.log
├── *.pt
├── รูปภาพ detection จริง
└── captures/                ← รูป capture กล้อง
```
---

### สรุป — สิ่งที่ผู้เรียนได้จากคอร์สนี้

หลังจบคอร์สนี้ ผู้เรียนมี:

1. **ระบบ AI ตรวจจับคน** ที่ทำงานจริงบน CPU หรือ GPU
2. **Database** เก็บทุก event พร้อม alert status
3. **แจ้งเตือน** ผ่าน Teams (Power Automate) และ Email (M365)
4. **เว็บ Dashboard** ดูสถานะ real-time
5. **ความรู้** เปลี่ยน config แล้วใช้กับกล้อง/พื้นที่ใหม่ได้ทันที

**เปลี่ยน config แค่นี้ก็ใช้ระบบจริงได้ทันที:**
```dotenv
COMPANY_CODE=ชื่อบริษัทจริง
DB_SERVER=DB จริง
IMAGE_SHARED_DRIVE=path จริง
TEAMS_WEBHOOK_URL=webhook จริง
SMTP_USER/PASSWORD=M365 จริง
```
และตั้งค่า `config/cameras.json` (array เปล่า ๆ ที่ระดับบนสุด ฟิลด์ RTSP ชื่อ `rtsp_url`):
```json
[
  {
    "camera_no": "CAM-01",
    "rtsp_url": "URL กล้องจริง",
    "danger_zones": [[[x1, y1], [x2, y2], ...]]
  }
]
```
> **ยินดีด้วย!** คุณสร้างระบบ AI Walkway Detection จากศูนย์จนใช้งานได้จริงแล้ว 🎉
