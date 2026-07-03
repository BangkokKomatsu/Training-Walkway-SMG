---
lab:
    title: '06 - Alerts via Teams and Email (Playground)'
    description: 'เรียนรู้การส่งแจ้งเตือนผ่าน Microsoft Teams Webhook และผ่าน Email ด้วยโปรโตคอล SMTP ของ M365'
---

# 06 - Alerts via Teams and Email (Playground)

เมื่อระบบตรวจพบว่ามีพนักงานเดินล้ำเข้าไปในพื้นที่อันตรายจนครบลำดับขั้นตอน (Event Triggered) ระบบจำเป็นต้องส่งแจ้งเตือน (Alert) ออกไปหาผู้ดูแลระบบ (Safety Officer) แบบ Real-time ในบทเรียนนี้ คุณจะได้ลองเขียนสคริปต์ส่งข้อความผ่านแอป Microsoft Teams และส่ง Email ด้วย Python

ระยะเวลาที่ใช้: ประมาณ **15** นาที

## Prerequisites
- ตั้งค่าตัวแปรในไฟล์ `.env` ครบถ้วน ได้แก่ `TEAMS_WEBHOOK_URL`, `SMTP_USER`, `SMTP_PASSWORD`, และ `ALERT_EMAIL_TO`
- ติดตั้งไลบรารีที่จำเป็น: `pip install requests`

---

## 1. การส่งแจ้งเตือนผ่าน Microsoft Teams (Webhook)

Teams รองรับการส่งข้อความเข้ากลุ่ม (Channel) ง่ายๆ ด้วยการยิง HTTP POST Request ไปที่ URL ที่เรียกว่า "Webhook" (สามารถไปสร้างได้ในตั้งค่ากลุ่มของ Microsoft Teams)

```python
def demo_teams():
    import requests
    
    # 1. เตรียมข้อมูล Payload 
    payload = {
        **SAMPLE_EVENT,
        "confidence": round(SAMPLE_EVENT["confidence"] * 100, 1),
        "message": (
            f"⚠️ [PLAYGROUND TEST] ตรวจพบคนในพื้นที่อันตราย\n"
            f"กล้อง: {SAMPLE_EVENT['camera_name']} ({SAMPLE_EVENT['camera_no']})\n"
            f"พื้นที่: {SAMPLE_EVENT['location_name']}\n"
            f"ความมั่นใจ: {round(SAMPLE_EVENT['confidence'] * 100, 1)}%\n"
            f"เวลา: {SAMPLE_EVENT['detected_at']}"
        ),
    }

    # 2. ยิง Request
    try:
        resp = requests.post(settings.TEAMS_WEBHOOK_URL, json=payload, timeout=10)
        print(f"Teams ตอบกลับ: HTTP {resp.status_code} — {resp.text[:100]}")
    except Exception as exc:
        print(f"❌ Teams ล้มเหลว: {exc}")
```

**คำอธิบายโค้ด (Line-by-Line):**
- `import requests`: เรียกใช้ไลบรารีสำหรับทำ HTTP Request ซึ่งเป็นวิธียอดนิยมที่สุดของ Python
- `payload = { ... }`: เตรียมข้อมูลที่จะส่งไปให้ Teams โดยจัดให้อยู่ในรูปของ Dictionary
- `**SAMPLE_EVENT`: เป็นการก็อปปี้คีย์-แวลู (Unpack) ทุกตัวที่มีใน `SAMPLE_EVENT` ลงมาใน payload เพื่อไม่ให้พิมพ์ซ้ำ
- `f"..."`: รูปแบบ f-string ช่วยให้เราแทรกตัวแปรลงในข้อความได้ง่ายๆ
- `requests.post(..., json=payload, timeout=10)`: ยิงข้อมูลไปยัง Webhook URL พร้อมแนบ payload ไปในรูปแบบ JSON และเราตั้ง Timeout ไว้ 10 วินาทีเพื่อป้องกันระบบค้างหาก Teams มีปัญหาขัดข้อง
- `resp.status_code`: รหัสสถานะตอบกลับ เช่น 200 (สำเร็จ), 400 (ส่งข้อมูลผิดพลาด), หรือ 401 (ไม่มีสิทธิ์)

---

## 2. การส่งแจ้งเตือนผ่าน Email (SMTP)

การส่ง Email จะใช้โปรโตคอลมาตรฐานที่ชื่อว่า SMTP เราสามารถใช้บัญชี Microsoft 365 ของบริษัทในการส่งออกได้

```python
def demo_email():
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    subject = "[PLAYGROUND TEST] ⚠️ Walkway Alert"
    body = (
        f"นี่คือข้อความทดสอบจาก playground\n\n"
        f"พื้นที่:       {SAMPLE_EVENT['location_name']}\n"
        f"เวลา:         {SAMPLE_EVENT['detected_at']}\n"
    )

    # 1. จัดเตรียมโครงสร้างจดหมาย (MIME)
    msg = MIMEMultipart()
    msg["From"] = settings.SMTP_USER
    msg["To"] = settings.ALERT_EMAIL_TO
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain", "utf-8"))

    # 2. ส่งจดหมายผ่าน SMTP Server
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
            smtp.starttls()
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(msg)
        print("ส่งอีเมลสำเร็จ!")
    except Exception as exc:
        print(f"❌ Email ล้มเหลว: {exc}")
```

**คำอธิบายโค้ด (Line-by-Line):**
- `import smtplib`: โมดูลดั้งเดิมของ Python สำหรับติดต่อสื่อสารผ่าน SMTP
- `from email.mime...`: ใช้สำหรับสร้างโครงสร้างของเนื้อหาในอีเมล (MIME) ที่รองรับการแนบไฟล์ และข้อความแบบ UTF-8 (ไทย)
- `msg = MIMEMultipart()`: เริ่มต้นสร้างหัวกระดาษของจดหมาย ระบุผู้ส่ง (`From`), ผู้รับ (`To`) และหัวข้อ (`Subject`)
- `msg.attach(...)`: นำข้อความใน `body` แนบเข้าไปในจดหมายแบบ text/plain
- `with smtplib.SMTP(...) as smtp:`: เปิดการเชื่อมต่อไปยังเซิร์ฟเวอร์ SMTP (เช่น smtp.office365.com พอร์ต 587) โดยใช้ `with` เมื่อทำงานจบจะสั่งปิด Connection ให้อัตโนมัติ
- `smtp.starttls()`: **สำคัญมาก!** ยกระดับการเชื่อมต่อให้เป็นการเข้ารหัส (TLS/SSL) เพื่อไม่ให้รหัสผ่านรั่วไหล
- `smtp.login(...)`: ล็อกอินด้วยบัญชีอีเมลบริษัท
- `smtp.send_message(msg)`: สั่งส่งอีเมล

---

## 3. สาธิต Cooldown เต็มวงจร (Full Alert Lifecycle)

ตัวอย่างข้างบนส่งแจ้งเตือนแบบ "ยิงแล้วจบ" (fire-and-forget) แต่ระบบจริงมีอีก 2 อย่างที่ทำเพิ่มเสมอ: (1) เช็ค **cooldown** ก่อนส่งทุกครั้งเพื่อกัน spam และ (2) **บันทึกสถานะ** การส่งแต่ละครั้งลง MSSQL ด้วย `update_alert_status()` — ฟังก์ชันนี้จะสาธิตให้เห็นวงจรเต็ม ๆ โดยส่ง event เดิมซ้ำ 2 ครั้งติดกันทันที

```python
from src.alert.teams_alert import send_teams_alert
from src.database.detection_repository import update_alert_status

def demo_cooldown():
    last_sent_at = {}
    event_id = SAMPLE_EVENT["event_id"]

    def try_send(label: str):
        now = datetime.now()
        last = last_sent_at.get(event_id)

        # เช็ค cooldown ก่อนส่งทุกครั้ง
        if last is not None:
            elapsed = (now - last).total_seconds()
            if elapsed < settings.ALERT_COOLDOWN_SECONDS:
                print(f"[{label}] ⏭  ข้าม — ส่งไปแล้วเมื่อ {elapsed:.1f} วิก่อน (ยังไม่พ้น cooldown)")
                return

        # พ้น cooldown แล้ว → ส่งจริง
        ok, code, text = send_teams_alert(SAMPLE_EVENT)
        last_sent_at[event_id] = now
        print(f"[{label}] ✅ ส่งจริง — HTTP {code}")

        # บันทึกสถานะลง MSSQL
        update_alert_status(
            event_id, SAMPLE_EVENT["company_code"],
            "TEAMS", "SENT" if ok else "FAILED",
            code, text,
        )

    try_send("รอบที่ 1")
    try_send("รอบที่ 2 (ทันที)")
```

**คำอธิบายโค้ด (Line-by-Line):**
- `from src.alert.teams_alert import send_teams_alert`: ใช้ฟังก์ชันจริงของระบบตรง ๆ (ตัวเดียวกับที่ `demo_teams()` ทำเอง) แทนการเขียน payload ซ้ำเอง
- `last_sent_at = {}`: จำลอง cache เก็บเวลาที่แจ้งเตือนล่าสุดของแต่ละ `event_id` — ของจริงในระบบเก็บไว้ใน memory ของ `detection_service.py` ตอนโปรแกรมรันอยู่
- `elapsed = (now - last).total_seconds()`: คำนวณว่าผ่านมากี่วินาทีแล้วนับจากครั้งล่าสุดที่ส่ง
- `if elapsed < settings.ALERT_COOLDOWN_SECONDS:`: ถ้ายังไม่ผ่านเวลา cooldown (ค่า default 120 วิ) ให้ `return` ออกทันที — **ข้ามการส่งไปเลย ไม่ยิง webhook ซ้ำ**
- `last_sent_at[event_id] = now`: อัปเดตเวลาส่งล่าสุด **หลัง**ส่งสำเร็จ (หรือพยายามส่ง) เพื่อให้รอบถัดไปนับ cooldown ต่อจากจุดนี้
- `update_alert_status(event_id, company_code, "TEAMS", "SENT"/"FAILED", code, text)`: บันทึกผลการส่งแต่ละครั้งลง MSSQL ผ่าน `smg.sp_update_alert_status` — ใช้ดูย้อนหลังได้ว่า event นี้แจ้งเตือนสำเร็จ/ล้มเหลวกี่ครั้ง ผ่านช่องทางไหนบ้าง
- เรียก `try_send()` 2 ครั้งติดกันทันที (ไม่มี `time.sleep`) เพื่อจำลองว่าเกิด event ซ้ำเร็ว ๆ — รอบที่ 2 ต้องถูกข้ามเพราะ `elapsed` ใกล้ 0 วิ ซึ่งน้อยกว่า `ALERT_COOLDOWN_SECONDS` เสมอ

> **หมายเหตุ:** ถ้ายังไม่ได้ตั้งค่า `DB_SERVER` ใน `.env` ฟังก์ชันจะข้ามขั้นตอน `update_alert_status()` ไปเฉย ๆ (ไม่ error) เพื่อให้แบบฝึกหัดนี้รันได้แม้ไม่มี MSSQL

---

## การรันทดสอบ

1. เปิด Terminal
2. รันคำสั่งด้านล่างเพื่อรันตัวอย่างแจ้งเตือน:
```bash
python playground/06-alerts-teams-email/example.py
```
3. หากคุณตั้งค่าใน `.env` ไว้เรียบร้อย ผลลัพธ์ที่คาดหวังคือ:
```text
============================================================
Playground 06: Teams + Email Alert
============================================================

กำลังส่ง Teams webhook → https://your-webhook-url...
Teams ตอบกลับ: HTTP 200 — 1

กำลังส่งอีเมล my_email@domain.com → target_email@domain.com
SMTP: smtp.office365.com:587
ส่งอีเมลสำเร็จ!

============================================================
Playground 06b: Cooldown + update_alert_status() (Full Alert Lifecycle)
============================================================

ALERT_COOLDOWN_SECONDS = 120 วินาที
[รอบที่ 1] ✅ ส่งจริง — HTTP 200 (สำเร็จ)
[รอบที่ 1]    บันทึกสถานะลง MSSQL สำเร็จ (update_alert_status)
[รอบที่ 2 (ทันที)] ⏭  ข้าม — ส่งไปแล้วเมื่อ 0.0 วิก่อน (ยังไม่พ้น cooldown)
```

## ลองต่อยอด (แบบฝึกหัดเพิ่มเติม)

- ลองตั้งค่า `ALERT_COOLDOWN_SECONDS=2` ใน `.env` แล้วแก้ `demo_cooldown()` ให้ `time.sleep(3)` ก่อนเรียก `try_send("รอบที่ 2")` ดูว่ารอบที่ 2 ส่งสำเร็จแทนที่จะถูกข้าม
- ลองเพิ่มการแจ้งเตือนผ่าน Email เข้าไปใน `demo_cooldown()` ด้วย (เรียก `send_email_alert()` แบบเดียวกับ Teams) แล้วบันทึกสถานะด้วย `update_alert_status(..., "EMAIL", ...)` แยกจาก Teams
