# Module 08 — เซฟรูปภาพลง Shared Drive

> **ระดับ:** มือใหม่-กลาง | **เวลาโดยประมาณ:** 45–60 นาที

---

## ส่วนที่ 1 — วัตถุประสงค์

เมื่อจบ module นี้ ผู้เรียนจะสามารถ:

- อธิบายโครงสร้างโฟลเดอร์และการตั้งชื่อไฟล์ในระบบนี้
- เซฟรูปภาพ detection ลง shared drive จาก Python
- เข้าใจว่า `image_path` กับ `image_name` ต่างกันยังไง
- จัดการกรณีที่เซฟรูปไม่ได้ (folder ไม่มี, permission)
- เข้าใจแนวทางจัดการพื้นที่เมื่อรูปสะสมมาก

---

## ส่วนที่ 2 — สิ่งที่ต้องเตรียม

- ผ่าน Module 01–07
- ตั้งค่า `IMAGE_SHARED_DRIVE` ใน `.env` (path ของ shared drive หรือโฟลเดอร์ทดสอบ)

---

## ส่วนที่ 3 — คำอธิบายเข้าใจง่าย

### ทำไมต้องเซฟรูป?

รูปที่เซฟเป็น "หลักฐาน" ว่ามีคนจริง ๆ เข้าพื้นที่อันตราย ใช้สำหรับ:
- ดูผ่านหน้าเว็บ (Module 11)
- แนบในรายงาน
- ตรวจสอบย้อนหลัง

### Shared Drive คืออะไร?

Network folder ที่ทุก server/เครื่องในองค์กรเข้าถึงได้ เช่น `\\server\walkway-images\` หรือ path ที่ admin mount เป็น drive ให้

Python บนเครื่อง detection เซฟรูปที่นี่ → Frontend (เว็บ) อ่านจากที่เดียวกัน

### `image_path` vs `image_name`

| | `image_path` | `image_name` |
|--|-------------|-------------|
| คืออะไร | path เต็มบนระบบไฟล์ (UNC path) | ชื่อไฟล์รูปเท่านั้น |
| ตัวอย่าง | `\\10.145.250.26\...\DEMO\CAM-01\20260422\detection__20260422_182710.jpg` | `detection__20260422_182710.jpg` |
| ใช้ทำอะไร | Python และ Backend API อ่าน/เขียนรูป | เก็บใน DB ให้ Frontend ร้องขอภาพผ่าน API |

---

## ส่วนที่ 4 — Flow การทำงาน

```text
เกิด event
        ↓
เตรียม frame (วาด polygon + bbox)
        ↓
save_detection_image(frame, company_code, camera_no)
        ↓
สร้าง path: {IMAGE_SHARED_DRIVE}/{company_code}/{camera_no}/{yyyyMMdd}/
        ↓
ตั้งชื่อไฟล์: detection__{yyyyMMdd_HHmmss}.jpg
        ↓
os.makedirs(folder, exist_ok=True)
        ↓
cv2.imwrite(image_path, frame)
        ↓
คืน (image_path, image_name)
        ↓
เก็บทั้งคู่ลง MSSQL ผ่าน insert_detection_event()
```
---

## ส่วนที่ 5 — ตัวอย่าง Code

ดูไฟล์จริงที่ [src/storage/image_storage.py](../../src/storage/image_storage.py)

### 5.1 โครงสร้างโฟลเดอร์และชื่อไฟล์

```text
shared-drive/
└── {company_code}/          ← แยกตามบริษัท
    └── {camera_no}/         ← แยกตามกล้อง
        └── yyyyMMdd/        ← แยกตามวัน
            └── detection__{yyyyMMdd_HHmmss}.jpg
```
**ตัวอย่างจริง:**
```text
\\10.145.250.26\000-CenterApp\053-SMG-Walkway\DEMO\CAM-01\20260101\
    detection__20260101_100532.jpg
    detection__20260101_143012.jpg
```
### 5.2 `save_detection_image()` — Production Function

โค้ดจาก [src/storage/image_storage.py](../../src/storage/image_storage.py):

```python
import logging
import os
from datetime import datetime
import cv2
from config.settings import settings

logger = logging.getLogger(__name__)

def save_detection_image(frame, company_code: str, camera_no: str) -> tuple[str, str]:
    """
    เซฟรูปลง shared drive กลาง
    คืน (image_path, image_name) หรือ ("", "") ถ้าล้มเหลว
    """
    now = datetime.now()
    date_str = now.strftime("%Y%m%d")
    ts_str   = now.strftime("%Y%m%d_%H%M%S")
    image_name = f"detection__{ts_str}.jpg"

    folder = os.path.join(
        settings.IMAGE_SHARED_DRIVE,
        company_code,
        camera_no,
        date_str,
    )

    try:
        os.makedirs(folder, exist_ok=True)
        image_path = os.path.join(folder, image_name)
        success = cv2.imwrite(image_path, frame)
        if not success:
            raise OSError("cv2.imwrite คืนค่า False — ตรวจสอบ path และ permission ของ shared drive")
    except Exception as exc:
        logger.error("เซฟรูปไม่สำเร็จ: %s", exc)
        return "", ""

    logger.info("เซฟรูปสำเร็จ: %s", image_path)
    return image_path, image_name
```
### 5.3 ตั้งค่า `.env`

```dotenv
# Windows path (ใช้ forward slash หรือ double backslash)
IMAGE_SHARED_DRIVE=D:/shared
# หรือ
IMAGE_SHARED_DRIVE=D:\\shared

# macOS / Linux
IMAGE_SHARED_DRIVE=/mnt/shared

# Network share (Windows)
IMAGE_SHARED_DRIVE=\\\\fileserver\\walkway-images
```
### 5.4 ทดสอบเบื้องต้น

```python
import cv2
import numpy as np

# สร้าง dummy frame (สีน้ำเงิน)
dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
dummy_frame[:] = (255, 100, 0)  # สีน้ำเงิน (BGR)

# เพิ่มข้อความ
cv2.putText(dummy_frame, "TEST DETECTION", (50, 240),
            cv2.FONT_HERSHEY_SIMPLEX, 2, (255, 255, 255), 3)

# ทดสอบบันทึก
from src.storage.image_storage import save_detection_image
image_path, image_name = save_detection_image(dummy_frame, "DEMO", "CAM-01")

if image_path:
    print(f"บันทึกสำเร็จ:")
    print(f"  path: {image_path}")
    print(f"  name: {image_name}")
else:
    print("บันทึกล้มเหลว — ดู log")
```
### 5.5 กรณีไฟล์หาย (ใน Frontend)

เมื่อ Frontend ดึงรูปภาพผ่าน Data API อาจเกิดกรณีรูปหายได้ (ถูก archive, drive ไม่ได้ mount หรือลบไปแล้ว) ต้องจัดการด้วย `onError`:

```jsx
// React component
function DetectionImage({ eventId, alt }) {
  const [hasError, setHasError] = React.useState(false);

  // ดึงรูปภาพผ่าน API แทน URL ตรงๆ
  const imageUrl = `/api/events/${eventId}/image`;

  if (hasError) {
    return (
      <div className="flex items-center justify-center bg-gray-100 h-32 text-gray-400 text-sm">
        ไม่พบรูปภาพ
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={alt}
      onError={() => setHasError(true)}
      className="w-full rounded"
    />
  );
}
```

### 5.6 แนวทางจัดการพื้นที่ (Archive)

รูป detection สะสมมาก → พื้นที่เต็ม ควรทำ archive:

**แนวทางง่ายที่สุด:**
```text
สร้าง scheduled task บน Windows / cron บน Linux
ทำงานทุกคืน:
  - ย้ายรูปที่เก่ากว่า 30 วัน ไปยัง archive drive
  - หรือลบรูปที่เก่ากว่า 90 วัน
```
**Script ตัวอย่าง (Python):**
```python
import os
import shutil
from datetime import datetime, timedelta
from pathlib import Path

def archive_old_images(base_path: str, days_to_keep: int = 30, archive_path: str = None):
    """
    ย้ายรูปที่เก่ากว่า days_to_keep วัน ไปยัง archive_path
    (ถ้าไม่ระบุ archive_path จะลบทิ้ง)
    """
    cutoff = datetime.now() - timedelta(days=days_to_keep)
    base = Path(base_path)

    for company_dir in base.iterdir():
        for camera_dir in company_dir.iterdir():
            for date_dir in camera_dir.iterdir():
                # ชื่อโฟลเดอร์เป็น yyyyMMdd
                try:
                    folder_date = datetime.strptime(date_dir.name, "%Y%m%d")
                except ValueError:
                    continue

                if folder_date < cutoff:
                    if archive_path:
                        # ย้ายไป archive
                        dest = Path(archive_path) / date_dir.relative_to(base_path)
                        dest.parent.mkdir(parents=True, exist_ok=True)
                        shutil.move(str(date_dir), str(dest))
                        print(f"Archive: {date_dir}")
                    else:
                        # ลบทิ้ง
                        shutil.rmtree(date_dir)
                        print(f"Deleted: {date_dir}")
```
---

## ส่วนที่ 6 — แบบฝึกหัด

1. **ตั้งค่า path:** ตั้ง `IMAGE_SHARED_DRIVE` ในไฟล์ `.env` เป็น folder ทดสอบ
2. **ทดสอบบันทึก:** รันโค้ดทดสอบ ดูว่าไฟล์ถูกสร้างที่ถูกต้อง
3. **ตรวจสอบโครงสร้าง:** เปิด folder ดู — ต้องมี `{company_code}/{camera_no}/yyyyMMdd/`
4. **ทดสอบ failure:** ตั้ง path ที่ไม่มีสิทธิ์เขียน ดูว่า function คืน `("", "")` โดยไม่ crash
5. **ลอง archive script:** รัน script archive ทดสอบกับ folder ที่สร้างขึ้น

---

## ส่วนที่ 7 — Checklist หลังเรียน

- [ ] ตั้ง `IMAGE_SHARED_DRIVE` ใน `.env` แล้ว
- [ ] `save_detection_image()` สร้างไฟล์ในโครงสร้างที่ถูกต้อง
- [ ] ชื่อไฟล์อยู่ในรูปแบบ `detection__{timestamp}.jpg`
- [ ] เข้าใจความต่างระหว่าง `image_path` และ `image_name`
- [ ] รู้ว่าทำอย่างไรเมื่อรูปหาย (ใน frontend)
- [ ] เข้าใจแนวทาง archive รูปเก่า

---

## ส่วนที่ 8 — Common Error + วิธีแก้

### Error: `PermissionError: [WinError 5] Access is denied`

**สาเหตุ:** ไม่มีสิทธิ์เขียนที่ path นั้น

**วิธีแก้:**
```bash
# ตรวจสอบ permission ของ folder
icacls "D:\shared"   # Windows

# ให้สิทธิ์:
icacls "D:\shared" /grant "NETWORK SERVICE:(OI)(CI)F"
```
---

### Error: `cv2.imwrite คืนค่า False`

**สาเหตุ:**
1. Path มีอักขระพิเศษที่ cv2 ไม่รองรับ
2. Drive เต็ม
3. Format นามสกุลไม่รองรับ

**วิธีแก้:**
```python
# ใช้ numpy + open() แทน cv2.imwrite ถ้าจำเป็น
import cv2
import numpy as np

ret, buffer = cv2.imencode('.jpg', frame)
if ret:
    with open(image_path, 'wb') as f:
        f.write(buffer.tobytes())
```
---

### รูปเซฟได้ แต่ Frontend แสดงไม่ได้

**สาเหตุ:** Web server (Data API) ไม่สามารถอ่านไฟล์จาก Shared Drive ได้

```text
ตรวจสอบกับ admin ว่า:
  - Backend API มีสิทธิ์เข้าถึง IMAGE_SHARED_DRIVE หรือไม่
  - โครงสร้างโฟลเดอร์ตรงกับที่ DB บันทึก (image_path) หรือไม่
```
---

### พื้นที่เต็ม

**วิธีตรวจสอบ:**
```python
import shutil
total, used, free = shutil.disk_usage("D:\\shared")
print(f"ว่างเหลือ: {free / 1024**3:.1f} GB จาก {total / 1024**3:.1f} GB")
```
---

## ส่วนที่ 9 — ควร commit อะไร

```text
✅ commit:
├── src/storage/image_storage.py
└── src/storage/__init__.py
```
---

## ส่วนที่ 10 — ไม่ควร commit อะไร

```text
❌ ห้าม commit:
├── .env                        (IMAGE_SHARED_DRIVE path)
├── รูปภาพ detection จริง       (ข้อมูลสำคัญ)
└── assets/detection-images/    (ถ้ามี)
```