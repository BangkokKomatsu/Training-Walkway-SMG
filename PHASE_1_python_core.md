# PHASE 1 — Python Core Detection (กล้อง + YOLO + พื้นที่ + ตัดสิน event)

> **วิธีใช้:** วาง `00_MASTER_CONTEXT.md` ก่อน แล้วตามด้วยไฟล์นี้
> เฟสนี้ทำให้ระบบ "ตรวจจับและตัดสิน event ได้" — **ยังไม่ต่อ DB / ยังไม่ส่ง alert** (เฟส 3)

## 🔒 Locked decisions ที่ใช้ในเฟสนี้
- จับ **person อย่างเดียว** ด้วย YOLO pre-trained
- Polygon = **พื้นที่อันตราย** → event เมื่ออยู่ในเส้นต่อเนื่อง **> `DWELL_SECONDS` (5 วิ)**
- จุดอ้างอิงคน = จุดกึ่งกลางขอบล่างของ bbox
- GPU/CPU เลือกผ่าน `.env`, **ตัด `cv2.imshow` ออก** (debug ให้ใช้การ save frame/log แทน)

## สิ่งที่ต้องสร้าง

### 1. `src/camera/camera_reader.py`
- เปิด RTSP ด้วย OpenCV, `CAP_PROP_BUFFERSIZE=1`
- จัดการกล้องหลุด + **reconnect อัตโนมัติ** (retry + backoff)
- **แยก thread อ่านกล้อง** ออกจาก thread ประมวลผล (frame queue / latest-frame) — เพื่อ performance CPU
- คืน frame ล่าสุดให้ผู้ใช้ดึงไปประมวลผล

### 2. `src/camera/camera_config.py`
- โครงสร้างเก็บข้อมูลกล้อง (rtsp url, camera_no, company_code, polygon) จาก config/DB
- ออกแบบให้รองรับหลายกล้อง แต่สาธิต 1 กล้อง

### 3. `src/detection/yolo_detector.py`
- โหลด YOLO pre-trained, เลือก device จาก config, warmup
- ฟังก์ชัน `detect_persons(frame) -> list[bbox, conf]` (กรองเฉพาะ class person + conf threshold)
- รองรับ resize/skip-frame เป็น option (เชื่อมกับ performance tuning เฟส performance)

> 📖 **อ่านเพิ่มเติม:**
> - YOLO11 Overview: <https://docs.ultralytics.com/models/yolo11>
> - Predict Mode (bbox/conf ทำงานยังไง): <https://docs.ultralytics.com/modes/predict>
> - Python Usage: <https://docs.ultralytics.com/usage/python>
> - Download โมเดล (yolo11n.pt ฯลฯ): <https://docs.ultralytics.com/models>
> - License AGPL-3.0 vs Enterprise: <https://www.ultralytics.com/license>

### 4. `src/detection/area_checker.py`
- เก็บ/โหลด polygon ต่อกล้อง
- `point_in_area(point, polygon) -> bool` (ใช้ `cv2.pointPolygonTest`)
- คำนวณจุดอ้างอิง = กึ่งกลางขอบล่าง bbox
- ฟังก์ชันวาด polygon ลง frame (ไว้ debug/บันทึกรูป)

### 5. `src/detection/detection_service.py` (หัวใจ)
- รวม camera_reader + yolo_detector + area_checker
- Logic ตัดสิน event ตาม **กติกา 4 ขั้น (§D ของ master)**:
  - อยู่ในพื้นที่อันตราย → เริ่มจับเวลา
  - ต่อเนื่อง > `DWELL_SECONDS` → เกิด event
  - ออกนอกพื้นที่ → reset
- เผื่อ hook ไว้เรียก (storage/repository/alert) ในเฟส 3 — ตอนนี้แค่ **log ว่าเกิด event** + (optional) save frame ลงโฟลเดอร์ชั่วคราว
- รองรับ cooldown (โครงไว้ ใช้จริงเฟส 3)

### 6. ปรับ `main.py`
- ต่อ flow: config → camera → detection_service.run()

## Playground (ผู้เรียนทดลอง)
- `playground/01-python-basic/` — variable/list/dict/if/loop/function/class/import ข้ามไฟล์/try-except/logging
- `playground/02-opencv-camera/` — เปิด webcam, อ่าน RTSP, จัดการ frame หลุด
- `playground/03-yolo-detection/` — detect person จากภาพนิ่ง/วิดีโอ
- `playground/04-area-detection/` — วาด polygon + เช็ค point-in-area + จับเวลา dwell

## ✅ Acceptance checklist
- [ ] รัน `main.py` แล้วอ่านกล้อง/วิดีโอตัวอย่างได้ (ไม่มีหน้าต่าง GUI)
- [ ] detect เฉพาะ person, วาด/ทดสอบ polygon ได้
- [ ] คนอยู่ในพื้นที่ > 5 วิ → log "event triggered"; ออกก่อน 5 วิ → ไม่ trigger
- [ ] กล้องหลุดแล้ว reconnect เองได้
- [ ] CPU mode รันลื่นพอควร (มี resize/skip-frame/threading)
- [ ] ไม่มี secret/path ฮาร์ดโค้ด
