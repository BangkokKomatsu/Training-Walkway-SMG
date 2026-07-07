# Module 01 — ติดตั้งและตั้งค่า Environment

> **ระดับ:** มือใหม่ | **เวลาโดยประมาณ:** 60–90 นาที

---

## ส่วนที่ 1 — วัตถุประสงค์

เมื่อจบ module นี้ ผู้เรียนจะสามารถ:

- ติดตั้ง Python 3.10+ และ VS Code พร้อม extension ที่จำเป็น
- สร้าง virtual environment และติดตั้ง library ตาม `requirements.txt`
- สร้างไฟล์ `.env` เพื่อเก็บค่า config โดยไม่ให้ขึ้น Git
- สร้างไฟล์ `.gitignore` ที่ถูกต้อง
- รัน `python main.py` ให้ได้
- debug เบื้องต้นใน VS Code

---

## ส่วนที่ 2 — สิ่งที่ต้องเตรียม

| รายการ | รายละเอียด |
|--------|-----------|
| เครื่องคอมพิวเตอร์ | Windows 10/11 (หรือ macOS/Ubuntu) |
| การเชื่อมต่ออินเทอร์เน็ต | สำหรับดาวน์โหลด Python, VS Code, library |
| สิทธิ์ติดตั้งซอฟต์แวร์ | ต้องเป็น administrator หรือมีสิทธิ์ติดตั้ง |
| พื้นที่ disk ว่าง | ≥ 5 GB (รวม library AI/OpenCV) |

---

## ส่วนที่ 3 — คำอธิบายเข้าใจง่าย

### Python คืออะไร?

Python คือภาษาโปรแกรมที่อ่านง่าย ใกล้เคียงภาษาอังกฤษ เหมาะสำหรับงาน AI, ประมวลผลภาพ, และเชื่อมต่อฐานข้อมูล เราจะใช้ Python เป็นหัวใจของระบบตรวจจับคน

### Virtual Environment (venv) คืออะไร ทำไมต้องสร้าง?

`venv` คือฟีเจอร์มาตรฐานของ Python (`python -m venv`) ที่สร้าง "กล่องเครื่องมือส่วนตัว" แยกสำหรับแต่ละโปรเจกต์
library ที่ติดตั้งในกล่องนี้จะไม่ปนกับ Python ที่ติดตั้งในเครื่อง (global) และไม่ปนกับโปรเจกต์อื่น ทำให้:

- ไม่เกิดปัญหา version conflict (โปรเจกต์นี้ต้องการ `opencv` คนละเวอร์ชันกับโปรเจกต์อื่นก็ได้)
- ทีมทุกคนติดตั้งไลบรารีชุดเดียวกันตรงกับ `requirements.txt` เป๊ะ ๆ ลด "เครื่องผมรันได้ แต่เครื่องคุณรันไม่ได้"
- ลบทิ้งได้ปลอดภัย ไม่กระทบ Python ตัวหลักของเครื่อง (สร้างใหม่ได้เสมอจาก `requirements.txt`)

```text
โปรเจกต์ A          โปรเจกต์ B
└── walkway/          └── venv/
    ├── opencv 4.9       ├── opencv 4.8   ← คนละ version ก็ได้
    └── numpy 1.26       └── numpy 2.0
```

> ในคอร์สนี้เราจะตั้งชื่อ virtual environment ของโปรเจกต์ว่า **`walkway`** (แทนชื่อ default `venv`) เพื่อให้รู้ทันทีว่าเป็น environment ของโปรเจกต์ไหนเวลาเปิดหลาย terminal พร้อมกัน
### ทำไมต้องมี `.env`?

ไฟล์ `.env` เก็บ "ความลับ" ของระบบ เช่น รหัสผ่าน DB, URL กล้อง, webhook URL โดยไม่ต้องเขียนลงในโค้ด ถ้าเขียนลงในโค้ดแล้วอัปโหลด GitHub ทุกคนจะเห็นรหัสผ่านของเรา

### `.gitignore` คืออะไร?

เป็นไฟล์ที่บอก Git ว่า "ไฟล์/โฟลเดอร์ไหนไม่ต้องอัปโหลด" เช่น `.env`, `walkway/`, `*.log`

---

## ส่วนที่ 4 — Flow การทำงาน

```text
1. ติดตั้ง Python 3.10+
        ↓
2. ติดตั้ง VS Code + Extensions
        ↓
3. Clone/เปิด repo โปรเจกต์
        ↓
4. สร้าง virtual environment ชื่อ walkway
        ↓
5. activate walkway
        ↓
6. pip install -r requirements.txt
        ↓
7. สร้างไฟล์ .env จาก .env.example
        ↓
8. ตรวจสอบ .gitignore
        ↓
9. รัน python main.py → เห็น log ออกมา ✅
```
---

## ส่วนที่ 5 — ตัวอย่าง Code และขั้นตอน

### 5.1 ติดตั้ง Python

ดาวน์โหลดจาก <https://www.python.org/downloads/> เลือก version 3.10 หรือใหม่กว่า

> **สำคัญ:** ระหว่างติดตั้ง Windows ต้องติ๊ก ✅ **"Add Python to PATH"** ก่อนกด Install

ตรวจสอบหลังติดตั้ง:

```bash
python --version
# Python 3.10.x หรือใหม่กว่า

pip --version
# pip 23.x ...
```
### 5.2 ติดตั้ง VS Code

ดาวน์โหลดจาก <https://code.visualstudio.com/>

Extension ที่ต้องติดตั้ง (เปิด VS Code → กด `Ctrl+Shift+X` ค้นหาชื่อ):

| Extension | ทำอะไร |
|-----------|--------|
| **Python** (Microsoft) | syntax highlight, IntelliSense, run/debug |
| **Pylance** (Microsoft) | type checking, autocomplete ขั้นสูง |
| **Python Indent** | จัดย่อหน้า Python อัตโนมัติ |
| **GitLens** | ดู Git history ในไฟล์ |
| **ENV** (IronGeek) | highlight ไฟล์ .env |

### 5.3 สร้าง Virtual Environment

เปิด terminal ใน VS Code (`Ctrl+\``) แล้วรัน (ตั้งชื่อ environment ว่า `walkway`):

```bash
# อยู่ใน root ของโปรเจกต์
python -m venv walkway
```
**Activate walkway (ต้องทำทุกครั้งที่เปิด terminal ใหม่ ก่อนรัน `python main.py`):**

```bash
# Windows (PowerShell)
walkway\Scripts\Activate.ps1

# Windows (Command Prompt)
walkway\Scripts\activate.bat

# macOS / Linux
source walkway/bin/activate
```
**เช็คว่าตอนนี้อยู่ใน environment `walkway` แล้วหรือยัง:** ดูที่หน้า prompt ของ terminal — ถ้า activate สำเร็จจะมีคำว่า `(walkway)` ขึ้นนำหน้าเสมอ

```text
(walkway) PS D:\walkway-detection> _
```

> ⚠️ **ลืม activate บ่อย ๆ ตอนเปิด terminal ใหม่:** ถ้าไม่เห็น `(walkway)` นำหน้า prompt แปลว่ายังไม่ได้อยู่ใน environment นี้ — รันคำสั่ง `python main.py` หรือ `pip install` ตรงนี้จะไปใช้ Python ตัว global ของเครื่องแทน (อาจไม่มี library ที่ติดตั้งไว้ หรือ error `ModuleNotFoundError`) ให้กลับไป activate ก่อนเสมอ
>
> ถ้าใช้ VS Code: กด `Ctrl+Shift+P` → พิมพ์ `Python: Select Interpreter` → เลือกตัวที่ path มีคำว่า `walkway` เพื่อให้ VS Code ใช้ interpreter เดียวกับที่ activate ไว้ (ทั้ง terminal ที่เปิดใหม่และตอนกด Run/Debug F5)
>
> **ออกจาก environment:** พิมพ์คำสั่ง `deactivate` (prompt จะหาย `(walkway)` ออกไป)
### 5.4 ติดตั้ง Library

```bash
pip install -r requirements.txt
```
ไฟล์ `requirements.txt` ของโปรเจกต์นี้มีเนื้อหาประมาณ:

```text
opencv-python>=4.9
ultralytics>=8.3
pyodbc>=5.1
python-dotenv>=1.0
requests>=2.31
```
> **หมายเหตุ:** `ultralytics` คือ library ของ YOLO ซึ่งจะดาวน์โหลด PyTorch มาด้วย อาจใช้เวลา 5–10 นาที

### 5.5 สร้างไฟล์ `.env`

Copy จาก template ที่มีอยู่แล้ว:

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```
จากนั้นเปิดไฟล์ `.env` แล้วแก้ไขค่าให้ตรงกับระบบจริง:

```dotenv
# ---- General ----
DEVICE=cpu
COMPANY_CODE=DEMO

# ---- Camera ----
CAMERA_CONFIG_SOURCE=json
CAMERAS_CONFIG_PATH=config/cameras.json
CAMERA_RTSP_USER=admin
CAMERA_RTSP_PASSWORD=Komatsu@2016!
SCHEDULE_SOURCE=hardcoded

# ---- Detection (YOLO) ----
YOLO_MODEL_PATH=Models/yolo11n.pt
CONF_THRESHOLD=0.5

# ---- Event Logic ----
DWELL_SECONDS=5
ALERT_COOLDOWN_SECONDS=120

# ---- Database (MSSQL) ----
DB_DRIVER={ODBC Driver 17 for SQL Server}
DB_SERVER=
DB_NAME=
DB_USER=
DB_PASSWORD=

# ---- Storage ----
IMAGE_SHARED_DRIVE=

# ---- Alert: Teams ----
TEAMS_WEBHOOK_URL=

# ---- Alert: Email (SMTP M365) ----
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
ALERT_EMAIL_TO=
```
> **ทดสอบเบื้องต้น:** ถ้ายังไม่มี DB/กล้องจริง ให้เว้นว่างไว้ก่อนได้ ระบบจะ log warning แต่ไม่ crash

### 5.6 ตรวจสอบ `.gitignore`

เปิดไฟล์ `.gitignore` ในโปรเจกต์ ต้องมีบรรทัดเหล่านี้อย่างน้อย:

```gitignore
# Secret / Config
.env

# Virtual environment
walkway/
venv/
.venv/

# Python cache
__pycache__/
*.pyc
*.pyo

# Logs
logs/
*.log

# YOLO model (ขนาดใหญ่ ไม่ต้องขึ้น Git)
*.pt
Models/

# Build output
dist/
node_modules/

# รูปภาพ detection จริง (ข้อมูลสำคัญ)
assets/detection-images/
```
### 5.7 รัน `python main.py`

> **ก่อนรันทุกครั้ง ต้องเช็คว่า activate environment `walkway` แล้ว** — ดูที่หน้า prompt ต้องเห็น `(walkway)` นำหน้าก่อนเสมอ (ถ้าเพิ่งเปิด terminal ใหม่ ให้ activate ตามขั้นตอนใน 5.3 ก่อน) ไม่งั้นโปรแกรมจะหา library อย่าง `cv2`/`ultralytics` ไม่เจอ เพราะไปใช้ Python ตัว global แทน

```bash
python main.py
```
ถ้าทุกอย่างถูกต้อง จะเห็น log ออกมาทาง console:

```text
2026-01-01 10:00:00 | INFO     | __main__ | === Walkway Detection System ===
2026-01-01 10:00:00 | INFO     | __main__ | Company: DEMO | Camera: 1 | Device: cpu
2026-01-01 10:00:00 | INFO     | src.detection.yolo_detector | กำลังโหลดโมเดล YOLO: Models/yolo11n.pt (device=cpu)
```
> **กรณียังไม่มีโมเดล:** ดาวน์โหลด `yolo11n.pt` ก่อน ดูวิธีใน Module 05

### 5.8 Debug ใน VS Code

1. เปิดไฟล์ `main.py`
2. คลิกเลขบรรทัดที่ต้องการตั้ง breakpoint (จะเห็นจุดแดงขึ้น)
3. กด `F5` → เลือก **Python File**
4. โปรแกรมจะหยุดที่ breakpoint ให้ดูค่าตัวแปรใน panel ซ้ายมือ

---

## ส่วนที่ 6 — แบบฝึกหัด

1. **ติดตั้งและตรวจสอบ:** รัน `python --version` และ `pip --version` แล้ว screenshot ผลลัพธ์
2. **สร้าง walkway:** สร้าง virtual environment ชื่อ `walkway` แล้ว activate ให้เห็น `(walkway)` ใน terminal
3. **แก้ไข .env:** ใส่ค่า `COMPANY_CODE=ชื่อบริษัทคุณ` แล้วรัน `python main.py` ดูว่า log แสดงชื่อถูกต้อง
4. **ทดสอบ .gitignore:** รัน `git status` ดูว่าไฟล์ `.env` ไม่ปรากฏในรายการ "Untracked files"

---

## ส่วนที่ 7 — Checklist หลังเรียน

- [ ] รัน `python --version` แล้วเห็น Python 3.10 หรือใหม่กว่า
- [ ] สร้าง walkway และ activate สำเร็จ (เห็น `(walkway)` ใน terminal)
- [ ] `pip install -r requirements.txt` สำเร็จไม่มี error
- [ ] มีไฟล์ `.env` (copy จาก `.env.example`)
- [ ] ไฟล์ `.gitignore` มีบรรทัด `.env` และ `walkway/`
- [ ] รัน `python main.py` แล้วเห็น log ออกมา (ไม่ว่าจะ warning หรือ info ก็นับ)
- [ ] ตั้ง breakpoint ใน VS Code และรัน debug โหมดได้

---

## ส่วนที่ 8 — Common Error + วิธีแก้

### Error: `python` ไม่ถูกจำ / `'python' is not recognized`

**สาเหตุ:** Python ไม่ได้ถูก add to PATH ตอนติดตั้ง

**วิธีแก้:**
```bash
# ลองใช้ python3 แทน
python3 --version

# หรือติดตั้ง Python ใหม่แล้วติ๊ก "Add Python to PATH"
```
---

### Error: `walkway\Scripts\Activate.ps1 cannot be loaded ... execution policy`

**สาเหตุ:** Windows ปิด script execution policy

**วิธีแก้:**
```powershell
# รัน PowerShell ในฐานะ Administrator แล้วพิมพ์:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
---

### Error: `ModuleNotFoundError: No module named 'cv2'`

**สาเหตุ:** ยังไม่ได้ activate walkway หรือยังไม่ได้ `pip install`

**วิธีแก้:**
```bash
# ตรวจสอบว่า activate แล้วหรือยัง (ต้องเห็น (walkway) ใน terminal)
# ถ้ายังไม่ได้ activate:
walkway\Scripts\Activate.ps1

# แล้วค่อย install ใหม่
pip install -r requirements.txt
```
---

### Error: `ERROR: Could not install packages due to an OSError`

**สาเหตุ:** path ยาวเกิน Windows limit หรือ permission ไม่พอ

**วิธีแก้:**
```bash
# เปิดใช้ long path บน Windows (รัน PowerShell ในฐานะ Admin):
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
    -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force

# หรือย้ายโปรเจกต์ไปอยู่ path สั้นกว่า เช่น C:\projects\walkway
```
---

### Error: ไฟล์ `.env` ไม่ถูกอ่าน / ค่าเป็น None

**สาเหตุ:** รัน Python จากโฟลเดอร์ผิด (ต้องรันจาก root ของโปรเจกต์)

**วิธีแก้:**
```bash
# ตรวจสอบว่าอยู่ folder ถูกต้อง
dir .env       # Windows: ต้องเห็นไฟล์ .env
ls .env        # macOS/Linux

# ถ้าไม่เห็น แสดงว่า cd ไปผิด folder
```
---

## ส่วนที่ 9 — ควร commit อะไร

```text
✅ commit สิ่งเหล่านี้:
├── .env.example          (template ไม่มีค่าจริง)
├── .gitignore
├── requirements.txt
├── main.py
├── config/
├── src/
└── docs/
```
---

## ส่วนที่ 10 — ไม่ควร commit อะไร

```text
❌ ห้าม commit:
├── .env                  (มีรหัสผ่าน/secret จริง)
├── walkway/              (ขนาดใหญ่ สร้างใหม่ได้จาก requirements.txt)
├── __pycache__/          (Python สร้างอัตโนมัติ)
├── *.log                 (log ทำงาน)
├── *.pt                  (โมเดล YOLO ขนาดใหญ่)
└── logs/                 (folder log)
```
> **จำไว้:** ถ้า commit `.env` ไปแล้ว ต้อง revoke/เปลี่ยนรหัสผ่านทั้งหมดทันที เพราะแม้จะลบ commit ทีหลัง Git history ยังจำอยู่
