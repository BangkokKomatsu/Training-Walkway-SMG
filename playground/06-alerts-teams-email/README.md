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
```
