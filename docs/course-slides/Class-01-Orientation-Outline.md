# คลาส 1: Orientation & Environment Setup — Outline สำหรับทำสไลด์

> **รูปแบบ:** ออนไลน์ | **เวลารวม:** 3 ชั่วโมง | **ผู้เรียน:** 10–25 คน (ไม่มี TA) | **ระดับ:** มือใหม่ผสม (non-IT + IT support)
> เอกสารนี้เป็น **content outline แบบ slide-by-slide** ไว้ให้ไปสร้างเป็น PowerPoint/Canva เอง ไม่ใช่สไลด์สำเร็จรูป
> อ้างอิงเนื้อหาจาก [`01-setup-environment.md`](../course-modules/01-setup-environment.md), [`02-python-basic.md`](../course-modules/02-python-basic.md) และ `CLAUDE.md`

## ⏱️ Timeline สรุป

สไลด์จริงแบ่งเป็น **4 ส่วนหลัก**: Overview, Preparation, Installation, Basic Python

| ช่วง | เวลา | สัดส่วน |
|---|---|---|
| 1. Overview (Kickoff + Use Case Introduction) | 30 นาที | slide 1–12 |
| 2. Preparation (เดิม Prerequisite Review) | 10 นาที | slide 13–15 |
| 3. Installation (เดิม Install Live-Along) | 65 นาที | slide 16–29 |
| 4. Basic Python (เดิม Python พื้นฐาน) | 65 นาที | slide 30–46 |
| buffer/พัก | 10 นาที | — |
| **รวม** | **180 นาที** | |

⚠️ **ไม่สอน Git ในคลาสนี้** (ตัดออกทั้งหมดตามที่ตกลง — เก็บไว้สอนคลาสถัดไปถ้าจำเป็น)
⚠️ **ถ้า live install บานปลาย:** ให้ยืดเวลาคลาส หรือนัด Class 1 รอบ 2 ต่อ — **ไม่ตัด** Use Case/Prerequisite/Python basic ออก

---

## ช่วงที่ 1 — Overview (30 นาที)

### 1.1 Kickoff (15 นาที)

### Slide 1 — Title
- ชื่อคอร์ส: Walkway Detection System — Training Course
- คลาส 1: Orientation & Environment Setup
- วันที่ / ผู้สอน / ช่องทางถามคำถาม (Teams chat)

### Slide 2 — แนะนำตัวผู้สอน
- ชื่อ, บทบาท, ประสบการณ์ที่เกี่ยวข้องกับ AI/Computer Vision/โปรเจกต์นี้
- **Speaker note:** สั้น กระชับ ไม่เกิน 2 นาที

### Slide 3 — แนะนำผู้เรียน
- กิจกรรม: พิมพ์ใน chat หรือ unmute บอก "ชื่อ + แผนก + ทำไมมาเรียนคอร์สนี้"
- **Speaker note:** จำกัดเวลา ~5 นาทีรวม (10-15 วิ/คน) เพราะคนเยอะ (10-25 คน) — บอกกติกาก่อนเริ่มว่าให้พิมพ์สั้น ๆ

### Slide 4 — เป้าหมายของคอร์ส
- "เรียนจบแล้ว **เปลี่ยนแค่ config ก็ใช้ระบบจริงได้ทันที**"
- ระบบ AI ตรวจจับคนเดิน/รถเข้าพื้นที่อันตรายจาก CCTV แจ้งเตือนอัตโนมัติ

### Slide 5 — Roadmap คอร์สทั้ง 14 Modules
- ตารางรายชื่อ Module 01–14 (ดึงจาก [`docs/course-modules/README.md`](../course-modules/README.md))
- ไฮไลต์ว่าคลาส 1 วันนี้ = ปฐมนิเทศ + เริ่ม Module 01 (setup) + preview Module 02 (python basic)

### Slide 6 — กติกาการเรียนออนไลน์
- เปิดกล้อง/ไมค์ตอนแนะนำตัว, mute เมื่อไม่พูด
- ถามคำถามผ่าน chat ได้ตลอดเวลา (ไม่ต้องรอช่วง Q&A)
- คลาสนี้มีการบันทึกวิดีโอไว้ทบทวน
- มีพักเบรกระหว่างคลาส (แจ้งเวลาพักคร่าว ๆ)

### Slide 7 — เช็คความพร้อมเครื่องก่อนเริ่ม install
- Checklist (ให้ผู้เรียนเช็คของตัวเองก่อนเริ่ม):
  - [ ] Windows 10/11 (หรือ macOS/Ubuntu)
  - [ ] พื้นที่ disk ว่าง ≥ 5 GB
  - [ ] มีสิทธิ์ติดตั้งโปรแกรม (admin) บนเครื่อง
  - [ ] อินเทอร์เน็ตเสถียร (จะโหลด PyTorch ~ใหญ่)
- **Speaker note:** ถามในห้องว่าใครติดปัญหาสิทธิ์ admin ยกมือ/พิมพ์ chat — จะได้รู้ก่อนเข้า install jam

---

### 1.2 Use Case Introduction (15 นาที)

### Slide 8 — ปัญหาที่ต้องแก้
- อุบัติเหตุจากคนเดิน/forklift เข้าพื้นที่อันตรายในโรงงาน/คลังสินค้า
- การเฝ้าระวังด้วยคนดู CCTV ตลอดเวลาทำไม่ได้จริง → ต้องใช้ AI ช่วยเฝ้าดูแทน

### Slide 9 — ระบบนี้ทำอะไร
- จับวัตถุ 2 ประเภทด้วย YOLO11: **person** และ **bicycle** (COCO class 0, 1)
- กำหนด **polygon = พื้นที่อันตราย/ห้ามเข้า**
- แจ้งเตือนเมื่อมีคน/จักรยานอยู่ในพื้นที่ต่อเนื่อง **> 5 วินาที (DWELL_SECONDS)**

### Slide 10 — Data Flow Diagram
```text
CCTV (RTSP) → Python+OpenCV → YOLO(person+bicycle) → Area Checker(polygon+dwell)
  → Event Logic(+cooldown) → เซฟรูป Shared Drive → Insert MSSQL (ผ่าน SP)
  → Teams + Email → React อ่านจาก MSSQL → ผู้ใช้ monitor
```
- **Speaker note:** เน้นย้ำว่า Python กับ Frontend **ไม่คุยกันตรง ๆ** คุยผ่าน MSSQL เป็นศูนย์กลางเท่านั้น

### Slide 11 — ตัวอย่างผลลัพธ์
- Screenshot ตัวอย่าง: ภาพ detection ที่มี bbox + polygon, ตัวอย่างข้อความแจ้งเตือนใน Teams, หน้าเว็บ dashboard
- **Speaker note:** ถ้ายังไม่มี data จริง ใช้ mockup/ภาพจาก frontend dev

### Slide 12 — จบคอร์สนี้แล้วผู้เรียนจะทำอะไรได้
- เชื่อมโยงกับ Module 13 (Final Project) — ประกอบทุกส่วนเป็นระบบทำงานจริงได้เอง
- เปลี่ยนแค่ `.env` → ใช้กับกล้อง/พื้นที่ของตัวเองได้จริง

---

## ช่วงที่ 2 — Preparation (10 นาที)

### Slide 13 — พื้นฐานที่ควรมี (ไม่ต้องมีมาก่อนก็เรียนได้)
- ใช้คอมพิวเตอร์/ติดตั้งโปรแกรมเป็น
- เข้าใจแนวคิด CCTV/กล้องวงจรปิดเบื้องต้น (ไม่ต้องรู้ RTSP มาก่อน จะสอนใน Module 04)
- **ไม่จำเป็น** ต้องเขียนโค้ดมาก่อน — สายที่ไม่ใช่ IT เรียนได้

### Slide 14 — เครื่องมือที่จะติดตั้งวันนี้ (ภาพรวม)
- Python 3.10+
- VS Code + Extensions (Python, Pylance, Python Indent, GitLens, ENV)
- Virtual environment ชื่อ `walkway`
- Library หลัก: `opencv-python`, `ultralytics`, `torch`, `numpy`, `pandas`, `pyodbc`, `requests`, `python-dotenv`
- ⚠️ **ไม่ติดตั้ง/สอน Git ในคลาสนี้**

### Slide 15 — สิ่งที่ "ไม่ต้องรู้มาก่อน" (กันคนที่ไม่ใช่ IT กังวล)
- ไม่ต้องเคยเขียน Python มาก่อน (ช่วงท้ายคลาสจะปูพื้นฐานให้)
- ไม่ต้องเคยยุ่งกับ AI/Machine Learning มาก่อน
- ติดปัญหาระหว่าง install ถามได้ตลอด ไม่ต้องอาย

---

## ช่วงที่ 3 — Installation (65 นาที)

> อ้างอิงเต็มที่ [`01-setup-environment.md`](../course-modules/01-setup-environment.md) — ให้แปะลิงก์นี้ใน chat ให้ผู้เรียนเปิดตามได้

### Slide 16 — ภาพรวม 9 ขั้นตอนติดตั้ง
```text
1. ติดตั้ง Python 3.10+ → 2. ติดตั้ง VS Code + Extensions → 3. เปิด repo
→ 4. สร้าง venv "walkway" → 5. activate walkway → 6. pip install -r requirements.txt
→ 7. สร้าง .env จาก .env.example → 8. เช็ค .gitignore → 9. รัน python main.py ✅
```
- **ทำไมต้องเรียงลำดับนี้:** แต่ละขั้นตอนพึ่งพาขั้นก่อนหน้า (เช่น venv ต้องมี Python ก่อน, pip install ต้อง activate venv ก่อน) — สลับลำดับแล้วจะ error

### Slide 17 — Step 1: ติดตั้ง Python
- ดาวน์โหลดจาก <https://www.python.org/downloads/> (3.10 หรือใหม่กว่า)
- ⚠️ **สำคัญที่สุด:** ติ๊ก ✅ **"Add Python to PATH"** ก่อนกด Install
- **ทำไมต้อง 3.10+:** โค้ดในโปรเจกต์ใช้ syntax ใหม่ (เช่น `float | None` type hint) ที่เวอร์ชันเก่ากว่านี้รันไม่ได้ และ `ultralytics`/`torch` เวอร์ชันที่ใช้ก็ requires 3.9+ ขึ้นไป
- **ทำไมต้อง Add to PATH:** ถ้าไม่ติ๊ก เครื่องจะไม่รู้จักคำสั่ง `python` ใน terminal เลย ต้องพิมพ์ path เต็มทุกครั้ง (เช่น `C:\Users\...\python.exe`) ซึ่งไม่สะดวกและ VS Code ก็จะหา interpreter ไม่เจอด้วย
- macOS: แนะนำใช้ `brew install python@3.11` แทนการโหลดจากเว็บ (จัดการ PATH ให้อัตโนมัติ)

### Slide 18 — ตรวจสอบการติดตั้ง Python
```bash
python --version   # Python 3.10.x หรือใหม่กว่า
pip --version       # pip 23.x ...
where python         # Windows: ดูว่า python.exe อยู่ path ไหน
which python         # macOS/Linux
```
- ถ้าเครื่องมี Python หลายเวอร์ชัน (เช่นเคยลงงานอื่นไว้) ใช้ Python Launcher เจาะจงเวอร์ชันได้:
```bash
py -3.10 --version   # Windows เท่านั้น
```
- **Troubleshooting:** ถ้าเจอ `'python' is not recognized` → ลืมติ๊ก Add to PATH → ถอนออกแล้วติดตั้งใหม่ (หรือแก้ PATH เองใน System Environment Variables)
- **Troubleshooting:** ถ้า `python --version` ขึ้นเวอร์ชันเก่ากว่าที่เพิ่งลง → มี Python เก่าอยู่ก่อนและ PATH ชี้ไปตัวเก่า ต้องจัดลำดับ PATH ใหม่

### Slide 19 — Step 2: ติดตั้ง VS Code
- ดาวน์โหลดจาก <https://code.visualstudio.com/>
- **ทำไมใช้ VS Code:** เบา ฟรี รองรับ Python ดีมาก (debug, IntelliSense, terminal ในตัว) ต่างจาก Notepad ที่แก้โค้ดได้อย่างเดียวไม่ช่วยตรวจ error
- เปิดโปรเจกต์ด้วย **File → Open Folder** (ไม่ใช่ Open File) เพื่อให้ VS Code เห็นทั้งโปรเจกต์ (Explorer panel ซ้ายมือจะขึ้นทุกไฟล์/โฟลเดอร์)
- แนะนำ 3 ส่วนหลักของหน้าจอที่จะใช้บ่อยวันนี้: **Explorer** (ซ้าย, ดูไฟล์), **Editor** (กลาง, แก้โค้ด), **Terminal** (ล่าง, พิมพ์คำสั่ง — เปิดด้วย `` Ctrl+` ``)

### Slide 20 — Step 3: ติดตั้ง Extensions
| Extension | ทำอะไร | ทำไมต้องมี |
|---|---|---|
| Python (Microsoft) | syntax highlight, IntelliSense, run/debug | ตัวหลัก ขาดไม่ได้ ถ้าไม่ลงจะกด Run/Debug ไม่ได้เลย |
| Pylance | type checking, autocomplete ขั้นสูง | เตือน error ก่อนรันจริง เช่น พิมพ์ชื่อตัวแปรผิด |
| Python Indent | จัดย่อหน้าอัตโนมัติ | Python ใช้ indent แทน `{}` พิมพ์มือผิดบ่อยมาก |
| GitLens | ดู Git history ในไฟล์ | ติดตั้งไว้ก่อน ยังไม่สอนใช้วันนี้ (ไม่มี Git session) |
| ENV (IronGeek) | highlight ไฟล์ .env | กันพิมพ์ผิด/มองไม่เห็น syntax error ใน `.env` |
- วิธีติดตั้ง: `Ctrl+Shift+X` → พิมพ์ชื่อ → กด Install ทีละตัว

### Slide 21 — Step 4: สร้าง Virtual Environment
```bash
python -m venv walkway
```
- **ทำไมต้องมี venv:** ถ้าไม่มี — library ทุกโปรเจกต์ในเครื่องใช้ปนกันหมด (global) โปรเจกต์ A ต้องการ opencv 4.9 แต่โปรเจกต์ B ต้องการ 4.8 จะชนกัน
- เปรียบเทียบก่อน/หลังสร้าง venv:
```text
ก่อนสร้าง venv:              หลังสร้าง venv (walkway):
python (global)               python (global)     ← ไม่แตะ
└── library ปนทุกโปรเจกต์      └── walkway/
                                   ├── Scripts/ (python.exe ของ venv นี้)
                                   └── Lib/site-packages/ (library เฉพาะโปรเจกต์นี้)
```
- ลบ `walkway/` ทิ้งได้เสมอ แล้วสร้างใหม่จาก `requirements.txt` — ไม่กระทบ Python หลักของเครื่อง

### Slide 22 — Step 5: Activate walkway
```bash
# Windows PowerShell
walkway\Scripts\Activate.ps1

# Windows Command Prompt
walkway\Scripts\activate.bat

# macOS / Linux
source walkway/bin/activate
```
- เช็คว่าสำเร็จ: ต้องเห็น `(walkway)` นำหน้า prompt
```text
ก่อน activate:              หลัง activate:
PS D:\walkway-detection>    (walkway) PS D:\walkway-detection>
```
- ใน VS Code: `Ctrl+Shift+P` → `Python: Select Interpreter` → เลือกตัวที่มีคำว่า `walkway` (ต้องเลือกทั้ง terminal ที่เปิดใหม่ และตอนกด Run/Debug F5)
- ออกจาก environment: พิมพ์ `deactivate`
- **Troubleshooting:** ถ้าเจอ execution policy error → รัน PowerShell as Admin → `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
- ⚠️ **ต้อง activate ทุกครั้งที่เปิด terminal ใหม่** — ถ้าลืม จะ `pip install`/`python main.py` ไปโดนตัว global แทน

### Slide 23 — Step 6: ติดตั้ง Library
```bash
pip install -r requirements.txt
```
- ใช้เวลา **5–10 นาที** (PyTorch ไฟล์ใหญ่ ~700MB) — ระหว่างรอ เปิด Q&A/พักสายตา
- ตัวอย่าง output ระหว่างติดตั้ง (ปกติ ไม่ใช่ error):
```text
Collecting torch==2.5.1
  Downloading torch-2.5.1-cp310-cp310-win_amd64.whl (203.1 MB)
     ---------------------------------------- 203.1/203.1 MB 12.3 MB/s
Successfully installed torch-2.5.1 ...
```
- ตรวจสอบว่าติดตั้งครบหลังเสร็จ:
```bash
pip list
# ต้องเห็น opencv-python, ultralytics, torch, numpy, pandas, pyodbc, requests, python-dotenv, cvzone, pytest
```
- ถ้าบางตัว fail ระหว่างทาง ลองติดตั้งทีละตัวที่เหลือ: `pip install ultralytics==8.3.40`
- ⚠️ หมายเหตุ: มี `cvzone` ใน requirements.txt ด้วย แต่ใช้เฉพาะไฟล์ legacy `Final_WalkWay_Detection_GPU.py` เท่านั้น **ไม่ใช้ใน production path** ของคอร์สนี้

### Slide 24 — Step 7: สร้างไฟล์ .env
```bash
copy .env.example .env
```
- ค่าสำคัญที่ต้องแก้วันนี้ (ที่เหลือปล่อยว่างได้):

| Key | ตัวอย่างค่า | อธิบาย |
|---|---|---|
| `DEVICE` | `cpu` | ใช้ CPU รันโมเดล (เปลี่ยนเป็น `cuda` ถ้ามีการ์ดจอ NVIDIA) |
| `COMPANY_CODE` | `DEMO` | รหัสบริษัทของผู้เรียน แยกข้อมูลแต่ละคน |
| `YOLO_MODEL_PATH` | `Models/yolo11n.pt` | ตำแหน่งไฟล์โมเดล (จะโหลดใน Module 05) |
| `DWELL_SECONDS` | `5` | เวลาที่ต้องอยู่ในพื้นที่ก่อนนับ event |

- ตัวอย่างค่าที่เขียน**ผิด**บ่อย vs **ถูก**:
```dotenv
# ❌ ผิด — มีเว้นวรรครอบ = และใส่ quote โดยไม่จำเป็น
COMPANY_CODE = "DEMO"

# ✅ ถูก — ไม่มีเว้นวรรค ไม่ต้องใส่ quote
COMPANY_CODE=DEMO
```
- ค่าที่ยังว่างได้ (DB/กล้องจริง) — ระบบไม่ crash แค่ log warning

### Slide 25 — Step 8: เช็ค .gitignore
- ต้องมีอย่างน้อย:
```gitignore
.env
walkway/
__pycache__/
*.log
*.pt
```
- ทดสอบว่าทำงานถูกต้อง:
```bash
git status
# .env ต้อง "ไม่" ปรากฏในลิสต์ Untracked files — ถ้าเห็น .env ในนี้ แปลว่า .gitignore ยังไม่ครอบคลุม
```
- **ทำไมสำคัญ:** ถ้า commit `.env` หลุดไป Git — รหัสผ่าน/webhook URL รั่วไปกับทุกคนที่ clone repo ได้ ต้องเปลี่ยนรหัสผ่าน**ทั้งหมด**ทันที แม้จะลบ commit ทีหลัง ประวัติ Git ก็ยังจำไว้
- ถ้าเผลอ commit ไปแล้ว (ก่อนใส่ .gitignore): `git rm --cached .env` เพื่อเอาออกจากการติดตาม (แล้วรีบเปลี่ยนรหัสผ่านทุกตัวที่อยู่ในไฟล์นั้น)

### Slide 26 — Step 9: รัน python main.py (สคริปต์ทดสอบ)
```bash
python main.py
```
- ตัวอย่าง log ที่ถูกต้อง (แสดงว่า setup สำเร็จ):
```text
2026-01-01 10:00:00 | INFO    | __main__ | === Walkway Detection System ===
2026-01-01 10:00:00 | INFO    | __main__ | Company: DEMO | Camera: 1 | Device: cpu
2026-01-01 10:00:00 | INFO    | src.detection.yolo_detector | กำลังโหลดโมเดล YOLO: Models/yolo11n.pt
2026-01-01 10:00:01 | WARNING | src.database.connection | ไม่พบการตั้งค่า DB_SERVER — ข้าม (ปกติถ้ายังไม่มี DB)
```
- **อย่าตกใจกับ WARNING:** ถ้ายังไม่ตั้งค่า DB/กล้องจริง ระบบจะ log warning ไม่ crash — เป็นเรื่องปกติของวันนี้
- หยุดโปรแกรม: กด `Ctrl+C` ใน terminal
- ✅ นี่คือ "ทดสอบเล็กน้อย" ที่ยืนยันว่า setup ทั้งหมดถูกต้อง

### Slide 27 — Debug เบื้องต้นใน VS Code
1. เปิด `main.py` → คลิกเลขบรรทัด (ซ้ายของโค้ด) ตั้ง breakpoint — จะเห็นจุดแดง
2. กด `F5` → เลือก **Python File**
3. โปรแกรมหยุดที่ breakpoint → เอาเมาส์ชี้ตัวแปรจะเห็นค่าปัจจุบัน หรือดูที่ panel **Variables** ซ้ายมือ
- Debug toolbar ที่ใช้บ่อย:

| ปุ่ม | ทำอะไร |
|---|---|
| Continue (F5) | รันต่อจนกว่าจะเจอ breakpoint ถัดไป |
| Step Over (F10) | รันบรรทัดถัดไป ไม่เข้าไปในฟังก์ชันที่เรียก |
| Step Into (F11) | เข้าไปดูข้างในฟังก์ชันที่เรียกบรรทัดนั้น |
| Stop (Shift+F5) | หยุด debug session |
- **ทำไมต้องรู้:** เวลาโค้ด error ใน Module ถัดไป (เช่น YOLO ตรวจไม่เจอคน) debug ช่วยดูค่าตัวแปรจริงระหว่างรัน แทนการเดา/ใส่ `print` ทั่วโค้ด

### Slide 28 — สรุป Common Errors (กันเวลา troubleshooting บานปลาย)
| Error | สาเหตุ | วิธีแก้ |
|---|---|---|
| `'python' is not recognized` | ไม่ได้ Add to PATH | ติดตั้งใหม่ ติ๊กให้ถูก |
| `Activate.ps1 ... execution policy` | Windows ปิด script policy | `Set-ExecutionPolicy RemoteSigned` |
| `ModuleNotFoundError: No module named 'cv2'` | ลืม activate walkway | activate แล้วค่อย pip install |
| `Could not install packages ... OSError` | path ยาวเกิน / permission | เปิด LongPathsEnabled หรือย้าย path สั้นลง |
| `.env` อ่านไม่ได้ / ค่าเป็น None | รันผิด folder | ต้องรันจาก root ของโปรเจกต์ |
| `pip install` ค้างนาน/timeout | อินเทอร์เน็ต/proxy บริษัทบล็อก | ลอง `pip install --default-timeout=100 -r requirements.txt` หรือเช็ค VPN/proxy |

### Slide 29 — เอกสารอ้างอิง
- [Module 01 — เตรียมเครื่องและ Environment](../course-modules/01-setup-environment.md) (เนื้อหาเต็มของช่วงนี้)
- [Ultralytics Docs](https://docs.ultralytics.com) / [YOLO Quickstart](https://docs.ultralytics.com/quickstart)
- `.env.example`, `requirements.txt` ในโปรเจกต์

---

## ช่วงที่ 4 — Basic Python (65 นาที)

> อ้างอิงเต็มที่ [`02-python-basic.md`](../course-modules/02-python-basic.md) — วันนี้สอนแบบพอใช้งานได้จริงกับโปรเจกต์นี้ ไม่ลงลึกเท่าตัวเอกสารเต็ม (เนื้อหาละเอียดกว่าดูเองได้ทีหลัง)

### Slide 30 — ทำไมต้องรู้ Python ก่อนไป Module 03 เป็นต้นไป
- Module ถัดไปทั้งหมด (OpenCV, YOLO, Area Checker) เขียนด้วย Python — ต้องอ่านโค้ดออกก่อน
- ไม่ต้องเขียนเก่ง แค่ "อ่านออก + แก้ค่าที่จำเป็นได้" ก็เพียงพอสำหรับคอร์สนี้

### Slide 31 — Python ทำงานอย่างไร
```text
โค้ด .py → Python interpreter → ผลลัพธ์ (ไม่ต้อง compile ก่อนเหมือน C/Java)
```
- **Interpreted** = รันทีละบรรทัดทันที ต่างจาก C/Java ที่ต้อง compile เป็นไฟล์ .exe ก่อน → แก้โค้ดแล้วรันได้เลย เหมาะกับการทดลอง/debug เร็ว
- **Dynamically typed** = ตัวแปรไม่ต้องประกาศ type ล่วงหน้า (ต่างจาก Java ที่ต้องเขียน `int x = 5;`)
```python
x = 5        # Python รู้เองว่าเป็น int
x = "hello"  # เปลี่ยน type ของตัวแปรเดิมได้เลย ไม่ error
```

### Slide 32 — Variable + Type
```python
camera_no = 1              # int   — จำนวนเต็ม
frame_count = 0
confidence = 0.87          # float — จำนวนทศนิยม
fps = 30.0
camera_name = "Camera-1"   # str   — ข้อความ
is_person_detected = True  # bool  — จริง/เท็จ

print(type(camera_no))     # <class 'int'>
print(type(confidence))    # <class 'float'>
```
- แปลง type ไปมา (พบบ่อยตอนอ่านค่าจาก `.env` ที่เป็น string เสมอ):
```python
dwell_str = "5"
dwell_seconds = int(dwell_str)      # "5" -> 5
pct_text = f"{confidence * 100}%"   # 0.87 -> "87.0%" (f-string)
```
- **ทำไมต้องรู้:** ค่าที่อ่านจาก `.env`/ไฟล์ config เป็น **string เสมอ** ต้อง `int()`/`float()` แปลงก่อนเอาไปคำนวณ ไม่งั้นได้ error หรือผลลัพธ์ผิด

### Slide 33 — List
```python
detected_classes = ["person", "person", "bicycle"]
camera_ids = [1, 2, 3]

print(detected_classes[0])    # person
print(detected_classes[-1])   # bicycle (นับจากท้าย)
print(len(detected_classes))  # 3 (จำนวนสมาชิก)

detected_classes.append("person")   # เพิ่มท้าย list
detected_classes.remove("bicycle")  # ลบตัวแรกที่ตรงกับค่านี้

print("person" in detected_classes)  # True — เช็คว่ามีอยู่ไหม
```
- เรียงลำดับ/หั่นบางส่วน (ใช้บ่อยตอนดู confidence สูงสุด):
```python
confidences = [0.42, 0.91, 0.67]
confidences.sort(reverse=True)   # [0.91, 0.67, 0.42] มากไปน้อย
top_two = confidences[:2]        # slice เอา 2 ตัวแรก -> [0.91, 0.67]
```
- **ทำไมต้องรู้:** ผลตรวจจับจาก YOLO ในแต่ละเฟรมเป็น list ของวัตถุที่เจอ — ต้องวนดู/กรอง/เรียงลำดับด้วยความสามารถเหล่านี้

### Slide 34 — Dict
```python
detection_summary = {
    "camera_no": "1",
    "person_count": 2,
    "confidence": 0.87,
    "location": "ทางเดินหน้าโกดัง",
}

print(detection_summary["person_count"])           # 2
print(detection_summary.get("status", "unknown"))  # ไม่มี key ก็ไม่ crash คืน default แทน

detection_summary["status"] = "alert"   # เพิ่ม/แก้ไข key
```
- วนดูทุก key/value และ dict ซ้อนกัน (โครงสร้างจริงของ config กล้อง):
```python
for key, value in detection_summary.items():
    print(f"{key}: {value}")

camera_config = {
    "camera_no": 1,
    "area": {"x1": 100, "y1": 50, "x2": 400, "y2": 600},  # dict ซ้อนใน dict
}
print(camera_config["area"]["x1"])   # 100
```
- **ทำไมต้องรู้:** ไฟล์ config กล้อง (`config/cameras.json`) และผลลัพธ์ event ที่จะ insert ลง MSSQL เก็บอยู่ในรูป dict/JSON แบบนี้ทั้งหมด

### Slide 35 — If / Else
```python
person_count = 2
confidence = 0.87

if person_count > 0 and confidence >= 0.5:
    print("ตรวจพบคน — ส่ง alert")
elif person_count > 0:
    print("ตรวจพบคนแต่ confidence ต่ำ — ข้ามไป")
else:
    print("ไม่พบคน")
```
- ตัวดำเนินการเปรียบเทียบที่ใช้บ่อย: `==` (เท่ากับ), `!=` (ไม่เท่ากับ), `>=`/`<=`, `and`/`or`/`not`
```python
is_in_zone = True
seconds_in_zone = 6

if is_in_zone and seconds_in_zone > 5:
    print("เกิน dwell time — trigger event")

# ternary แบบบรรทัดเดียว (ใช้เวลาต้องการความสั้น)
status = "alert" if seconds_in_zone > 5 else "normal"
```
- **ทำไมต้องรู้:** นี่คือหัวใจของ Event Logic ทั้งระบบ — "คนอยู่ในพื้นที่ + เกินเวลาที่กำหนด" คือเงื่อนไข if/else ตรง ๆ ที่จะเจอใน Module 06

### Slide 36 — Loop
```python
cameras = ["Camera-1", "Camera-2", "Camera-3"]

for cam in cameras:
    print(f"ตรวจสอบ: {cam}")

for idx, cam in enumerate(cameras):     # ได้ index ด้วย
    print(f"{idx}: {cam}")

attempt = 0
while attempt < 3:                      # วนจนกว่าเงื่อนไขเป็น False
    print(f"พยายามเชื่อมต่อครั้งที่ {attempt + 1}")
    attempt += 1
```
- `break`/`continue` และ loop ซ้อนกัน (วนหลายกล้อง แต่ละกล้องมีหลาย object ที่ตรวจเจอ):
```python
for cam in cameras:
    for obj in ["person", "bicycle"]:
        if obj == "bicycle":
            continue          # ข้าม ไม่ต้องประมวลผลจักรยานรอบนี้
        print(f"{cam}: พบ {obj}")
        break                 # เจอ person แล้วพอ ไม่ต้องดูต่อ
```
- **ทำไมต้องรู้:** ระบบต้องวนตรวจทุกกล้อง ทุกเฟรม ทุกวัตถุที่ตรวจเจอ — เขียนโค้ดจริงเป็น loop ซ้อน loop แบบนี้เสมอ

### Slide 37 — Function (ของจริงจากโปรเจกต์)
```python
def calculate_confidence_percent(confidence: float) -> str:
    """แปลง confidence (0.0-1.0) เป็นเปอร์เซ็นต์พร้อม format"""
    pct = round(confidence * 100, 1)
    return f"{pct}%"

def get_bbox_bottom_center(bbox: tuple) -> tuple:
    """คำนวณจุดกึ่งกลางขอบล่างของ bounding box"""
    x1, y1, x2, y2 = bbox
    cx = (x1 + x2) / 2
    return (cx, y2)

result = calculate_confidence_percent(0.87)   # "87.0%"
point = get_bbox_bottom_center((100, 50, 300, 400))  # (200.0, 400)
```
- ค่า default parameter (กัน error เวลาไม่ได้ส่งค่าครบ):
```python
def format_alert(camera_name: str, confidence: float, level: str = "warning") -> str:
    return f"[{level.upper()}] {camera_name} confidence={confidence}"

print(format_alert("Camera-1", 0.87))              # ใช้ level default = "warning"
print(format_alert("Camera-1", 0.87, "critical"))   # override level
```
- **Speaker note:** `get_bbox_bottom_center` คือของจริงใน [`src/utils/helpers.py`](../../src/utils/helpers.py) ที่ระบบใช้อ้างอิงตำแหน่งคน — ทำให้เห็นว่า Python พื้นฐานที่เพิ่งสอนใช้ในของจริงยังไง

### Slide 38 — Class เบื้องต้น (ของจริงจากโปรเจกต์)
```python
class CameraEventTracker:
    """เก็บสถานะ dwell timer ของกล้อง 1 ตัว"""

    def __init__(self, dwell_seconds: int):
        self.dwell_seconds = dwell_seconds
        self._enter_time = None

    def enter_zone(self, timestamp: float) -> None:
        if self._enter_time is None:
            self._enter_time = timestamp

    def reset(self) -> None:
        self._enter_time = None

    def is_event_triggered(self, now: float) -> bool:
        if self._enter_time is None:
            return False
        return (now - self._enter_time) > self.dwell_seconds
```
- ใช้งานจริง เทียบ 2 สถานการณ์ (ยังไม่ถึงเวลา vs เกินเวลา):
```python
tracker = CameraEventTracker(dwell_seconds=5)
tracker.enter_zone(timestamp=1000.0)

print(tracker.is_event_triggered(now=1004.0))  # False (4 วิ ยังไม่ถึง 5)
print(tracker.is_event_triggered(now=1006.0))  # True  (6 วิ > 5 วิ -> trigger event)

tracker.reset()                                # คนออกจากพื้นที่ -> reset
print(tracker.is_event_triggered(now=1010.0))  # False (reset แล้ว)
```
- **ทำไมต้องใช้ class ตรงนี้:** ต้องมีกล้องหลายตัวพร้อมกัน แต่ละตัว "จำ" เวลาที่คนเข้าโซนของตัวเองแยกกัน — สร้าง `CameraEventTracker` 1 instance ต่อ 1 กล้องได้เลย ไม่ต้องใช้ตัวแปร global ปนกัน

### Slide 39 — Import ข้ามไฟล์
```python
# ใน src/detection/yolo_detector.py
from config.settings import settings
from src.utils.helpers import get_bbox_bottom_center
```
- หลักการ: Python หา module จาก root ของโปรเจกต์ (ที่รัน `python main.py`) เสมอ → รันจาก root ทำให้ import ถูก path
- import ข้ามไฟล์ในโฟลเดอร์เดียวกัน (ตัวอย่างง่าย ๆ):
```python
# helpers_example.py
def greet(name: str) -> str:
    return f"สวัสดี {name}!"

# example.py
from helpers_example import greet
print(greet("Camera-1"))   # สวัสดี Camera-1!
```
- **Common error:** รันจากผิดโฟลเดอร์ → `ModuleNotFoundError: No module named 'config'` (แก้โดยรันจาก root เท่านั้น เดี๋ยวลงรายละเอียดโครงสร้างโฟลเดอร์เต็มใน Module 03)

### Slide 40 — Try / Except
```python
def parse_confidence(raw: str) -> float | None:
    """แปลง string เป็น float อย่างปลอดภัย"""
    try:
        return float(raw)
    except ValueError:
        print(f"ค่า '{raw}' ไม่ใช่ตัวเลข")
        return None
```
- ดักหลาย exception + `finally` (ใช้บ่อยตอนต่อ database):
```python
try:
    conn = pyodbc.connect(conn_str, timeout=10)
    cursor = conn.cursor()
    cursor.execute("SELECT 1")
except pyodbc.OperationalError as exc:
    print(f"เชื่อมต่อ DB ล้มเหลว: {exc}")
except pyodbc.Error as exc:
    print(f"DB error อื่น: {exc}")
finally:
    if conn:
        conn.close()   # ทำเสมอไม่ว่าจะ error หรือไม่ — ปิด connection กัน leak
```
- **ทำไมต้องรู้:** กล้องหลุดบ้าง DB ต่อไม่ติดบ้างเป็นเรื่องปกติในระบบจริง — ถ้าไม่ดัก error โปรแกรมทั้งระบบจะ crash เพราะกล้องตัวเดียวมีปัญหา

### Slide 41 — Logging (ใช้แทน print)
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
logger = logging.getLogger(__name__)

logger.debug("debug detail: frame=%d", 1234)      # ไม่แสดงถ้า level=INFO
logger.info("ตรวจจับ person confidence=%.1f%%", 87.0)
logger.warning("กล้องหลุด กำลัง reconnect...")
logger.error("เซฟรูปล้มเหลว: %s", "/path/to/img.jpg")
```
- ระดับ log เรียงจากน้อยไปมาก (`DEBUG < INFO < WARNING < ERROR`) — ตั้ง `level=INFO` แปลว่า `DEBUG` จะถูกซ่อนไว้ ใช้กรองว่าจะโชว์อะไรบ้าง
- **ทำไมไม่ใช้ print:** `print` ไม่มีเวลา ไม่มีระดับความสำคัญ และหายไปเมื่อปิด terminal — `logging` เก็บไฟล์ log ไว้ย้อนดูได้ (`logs/walkway.log`) จำเป็นมากตอนหาสาเหตุปัญหาระบบจริงที่รันทิ้งไว้ 24 ชม.

### Slide 42 — File Path และอ่าน/เขียนไฟล์
```python
import os

base_dir, company, camera, date = "shared-drive", "DEMO", "camera-1", "20260101"
folder = os.path.join(base_dir, "walkway-detection", company, camera, date)
# shared-drive/walkway-detection/DEMO/camera-1/20260101 (Windows จะใช้ \ ให้อัตโนมัติ)

os.makedirs(folder, exist_ok=True)          # exist_ok=True = ไม่ error ถ้ามีอยู่แล้ว
print(os.path.exists(folder))               # True
```
- เขียน/อ่านไฟล์ text จริง:
```python
log_path = os.path.join(folder, "log.txt")

with open(log_path, "w", encoding="utf-8") as f:
    f.write("detection event log\n")
    f.write("camera: Camera-1\n")

with open(log_path, "r", encoding="utf-8") as f:
    print(f.read())
```
- **ทำไมใช้ `os.path.join` แทนต่อ string เอง (`base_dir + "/" + company`):** Windows ใช้ `\` แต่ macOS/Linux ใช้ `/` — `os.path.join` จัดการให้ถูกต้องไม่ว่าจะรันบน OS ไหน

### Slide 43 — Teaser: pyodbc (เดี๋ยวเจอเต็มใน Module 07)
```python
import pyodbc

conn = pyodbc.connect(conn_str, timeout=10)
cursor = conn.cursor()

# ✅ parameterized query — ปลอดภัยจาก SQL injection
cursor.execute(
    "SELECT camera_no, camera_name FROM smg.mst_camera WHERE company_code = ?",
    ["DEMO"],
)
for row in cursor.fetchall():
    print(f"กล้อง: {row.camera_no} — {row.camera_name}")

conn.commit()
conn.close()
```
- ใช้ `?` placeholder เสมอ ห้ามต่อ string เอง:
```python
# ❌ ห้าม — เสี่ยง SQL injection
cursor.execute(f"SELECT ... WHERE company_code = '{company_code}'")
```
- **ทำไมต้องรู้ตอนนี้:** ทุกครั้งที่ระบบจะบันทึก event ลง MSSQL จะเขียนโค้ดแบบนี้ — เห็นหน้าตาไว้ก่อนจะได้ไม่งงตอน Module 07

### Slide 44 — แบบฝึกหัด Warm-up ท้ายคลาส
1. สร้างตัวแปร `company_code`, `camera_count`, `confidence` แล้ว print type
2. เขียนฟังก์ชัน `format_event_message(camera_name, confidence)` คืน string เช่น `"ตรวจพบคน กล้อง Camera-1 ความมั่นใจ 87.0%"`
3. สร้าง class `SimpleCounter` มี method `increment()`, `reset()` และ property `count`
4. ลองรัน `playground/01-python-basic/example.py` ดูผลลัพธ์

### Slide 45 — สรุปคลาส 1 + การบ้านก่อน Module 02 เต็ม
- Checklist ที่ควรทำได้แล้ววันนี้: ติดตั้งครบ, รัน `main.py` เห็น log, เข้าใจ data flow, เขียน Python พื้นฐานได้
- การบ้าน: อ่าน [Module 02 เต็ม](../course-modules/02-python-basic.md) มาล่วงหน้า + ลองทำแบบฝึกหัด slide 44 ให้ครบ

### Slide 46 — Q&A
- ช่องทางถามคำถามนอกคลาส (Teams channel/group ที่ใช้)
- นัดหมายคลาสถัดไป (Module 02 เต็ม / Module 03)
