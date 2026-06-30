# Module 09 — แจ้งเตือน Teams และ Email

> **ระดับ:** กลาง | **เวลาโดยประมาณ:** 90–120 นาที

---

## ส่วนที่ 1 — วัตถุประสงค์

เมื่อจบ module นี้ ผู้เรียนจะสามารถ:

- สร้าง Power Automate Workflows webhook สำหรับ Teams (แบบฟรี)
- ส่ง POST request จาก Python ไปยัง webhook
- ตั้งค่าและส่ง Email ผ่าน SMTP M365
- เข้าใจ cooldown และ rate limit
- จัดการกรณีส่ง alert ล้มเหลว (ไม่ crash ระบบหลัก)
- รู้จัก Graph API เป็นทางเลือก (ภาคผนวก)

---

## ส่วนที่ 2 — สิ่งที่ต้องเตรียม

- ผ่าน Module 01–08
- บัญชี Microsoft 365 (Teams + Outlook)
- สิทธิ์สร้าง Power Automate flow ใน Teams (ตรวจสอบกับ admin IT)
- ค่า `.env`: `TEAMS_WEBHOOK_URL`, `SMTP_USER`, `SMTP_PASSWORD`, `ALERT_EMAIL_TO`

---

## ส่วนที่ 3 — คำอธิบายเข้าใจง่าย

### Teams ผ่าน Power Automate Workflows

Microsoft Teams เปลี่ยนวิธี webhook ใหม่ตั้งแต่ปี 2024:

| ❌ วิธีเก่า (ปิดแล้ว) | ✅ วิธีใหม่ที่ใช้ |
|--------------------|----------------|
| Office 365 Connector | Power Automate Workflows |
| Incoming Webhook | "Post to a channel when a webhook request is received" |
| ปิดถาวร พ.ค. 2026 | ฟรี ใช้ Standard Connector |

**Flow ทำงานยังไง:**

```text
Python ยิง POST → webhook URL (Power Automate)
    → Power Automate รับ payload
    → Post ข้อความไปยัง Teams channel
```
> **ข้อจำกัด:** Teams webhook รับได้ประมาณ 4 requests/วินาที ถ้าเกินจะได้ HTTP 429 (Too Many Requests) — แต่ `ALERT_COOLDOWN_SECONDS` ของเราป้องกันไว้แล้ว

### Email ผ่าน SMTP M365

ส่งผ่าน SMTP Server ของ Microsoft 365:
- Host: `smtp.office365.com`
- Port: `587`
- ใช้ App Password (ไม่ใช่รหัสผ่าน account ตรง ๆ)

### cooldown ป้องกัน spam

```text
คนอยู่ในพื้นที่อันตราย 10 นาที
    → event ที่ 1 (เวลา 10:00) → ส่ง Teams + Email ✅
    → event ที่ 2 (เวลา 10:01) → cooldown ยังไม่หมด → ข้าม
    → event ที่ 3 (เวลา 10:02) → ยังข้ามอยู่
    → ...
    → เวลา 10:02 (cooldown หมด 120 วิ) → ส่งซ้ำ ✅
```
---

## ส่วนที่ 4 — Flow การทำงาน

### Teams:
```text
สร้าง flow ใน Teams Workflows
    ↓
ได้ webhook URL (เก็บใน .env)
    ↓
Python: requests.post(TEAMS_WEBHOOK_URL, json=payload)
    ↓
Power Automate รับ → post message to channel
    ↓
ดู alert ใน Teams channel
```
### Email:
```text
Python: smtplib.SMTP(smtp.office365.com:587)
    ↓
smtp.starttls() → เข้ารหัส TLS
    ↓
smtp.login(SMTP_USER, SMTP_PASSWORD)
    ↓
smtp.send_message(msg)
    ↓
อีเมลถึง ALERT_EMAIL_TO
```
---

## ส่วนที่ 5 — ตัวอย่าง Code

ดูไฟล์จริงที่:
- [src/alert/teams_alert.py](../../src/alert/teams_alert.py)
- [src/alert/email_alert.py](../../src/alert/email_alert.py)

### 5.1 สร้าง Teams Webhook (Power Automate Workflows)

**ขั้นตอนสร้าง flow:**

1. เปิด **Microsoft Teams** → ไปที่ channel ที่ต้องการรับแจ้งเตือน
2. คลิก **"..."** (More options) → เลือก **"Workflows"**
3. ค้นหา template **"Post to a channel when a webhook request is received"**
4. คลิก **"Add"** → ตั้งชื่อ flow → **"Next"**
5. เลือก Team และ Channel ที่ต้องการ → **"Create flow"**
6. หลังสร้าง copy **webhook URL** (จะมี URL ยาว ๆ)
7. เก็บ URL นั้นใน `.env`:

```dotenv
TEAMS_WEBHOOK_URL=https://prod-xx.westeurope.logic.azure.com/workflows/...
```
> **สำคัญ:** flow มีแค่ 2 ขั้น: (1) webhook trigger → (2) post message to channel
> ห้ามเพิ่ม HTTP action (premium) ใน flow

### 5.2 `send_teams_alert()` — Python code

โค้ดจาก [src/alert/teams_alert.py](../../src/alert/teams_alert.py):

```python
import logging
import requests
from config.settings import settings

logger = logging.getLogger(__name__)

_TIMEOUT = 10  # วินาที


def send_teams_alert(event: dict) -> tuple[bool, int, str]:
    """
    ส่ง POST ไปยัง Power Automate webhook
    คืน (success: bool, http_status_code: int, response_text: str)
    """
    if not settings.TEAMS_WEBHOOK_URL:
        logger.warning("TEAMS_WEBHOOK_URL ไม่ได้ตั้งค่า — ข้ามการส่ง Teams")
        return False, 0, "TEAMS_WEBHOOK_URL not configured"

    confidence_pct = round(float(event.get("confidence", 0)) * 100, 1)

    payload = {
        "company_code":  event.get("company_code", ""),
        "camera_no":     event.get("camera_no", ""),
        "camera_name":   event.get("camera_name", ""),
        "location_name": event.get("location_name", ""),
        "event_type":    event.get("event_type", ""),
        "confidence":    confidence_pct,
        "detected_at":   event.get("detected_at", ""),
        "image_name":    event.get("image_name", ""),
        "image_path":    event.get("image_path", ""),
        "message": (
            f"⚠️ ตรวจพบคนในพื้นที่อันตราย\n"
            f"บริษัท: {event.get('company_code')}\n"
            f"กล้อง: {event.get('camera_name')} ({event.get('camera_no')})\n"
            f"พื้นที่: {event.get('location_name')}\n"
            f"ความมั่นใจ: {confidence_pct}%\n"
            f"เวลา: {event.get('detected_at')}"
        ),
    }

    try:
        resp = requests.post(settings.TEAMS_WEBHOOK_URL, json=payload, timeout=_TIMEOUT)

        if resp.status_code == 429:
            logger.warning("Teams rate limit (HTTP 429)")
        elif not resp.ok:
            logger.error("Teams webhook ตอบ %d: %s", resp.status_code, resp.text[:200])
        else:
            logger.info("ส่ง Teams สำเร็จ")

        return resp.ok, resp.status_code, resp.text[:200]

    except requests.RequestException as exc:
        logger.error("ส่ง Teams ล้มเหลว: %s", exc)
        return False, 0, str(exc)
```
**ทดสอบส่ง Teams:**
```python
event = {
    "company_code": "DEMO",
    "camera_no": "1",
    "camera_name": "Camera-1",
    "location_name": "ทางเดินหน้าโกดัง",
    "event_type": "DWELL",
    "confidence": 0.87,
    "detected_at": "2026-01-01 10:00:00",
    "image_name": "test.jpg",
    "image_path": "\\\\10.145.250.26\\...\\test.jpg",
}

from src.alert.teams_alert import send_teams_alert
success, code, msg = send_teams_alert(event)
print(f"Teams: success={success}, code={code}, msg={msg}")
```
### 5.3 ตั้งค่า SMTP M365 App Password

**ขั้นตอน:**
1. ล็อกอินที่ <https://account.microsoft.com/security>
2. เปิด **Advanced security options**
3. เปิด **Two-step verification** (ถ้ายังไม่ได้เปิด)
4. เปิด **App passwords** → **Create new app password**
5. ตั้งชื่อ เช่น "Walkway Detection" → copy password ที่ได้

```dotenv
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=noreply@yourcompany.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx     ← App Password (ไม่ใช่รหัสผ่าน M365)
ALERT_EMAIL_TO=safety-team@yourcompany.com
```
> **ถ้า IT ปิด SMTP Auth:** ใช้ Graph API แทน (ดูภาคผนวกด้านล่าง)

### 5.4 `send_email_alert()` — Python code

โค้ดจาก [src/alert/email_alert.py](../../src/alert/email_alert.py):

```python
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from config.settings import settings

logger = logging.getLogger(__name__)


def send_email_alert(event: dict) -> tuple[bool, str]:
    """
    ส่งอีเมลผ่าน SMTP M365
    คืน (success: bool, message: str)
    """
    if not all([settings.SMTP_USER, settings.SMTP_PASSWORD, settings.ALERT_EMAIL_TO]):
        logger.warning("Email config ไม่ครบ — ข้ามการส่ง")
        return False, "Email not configured"

    confidence_pct = round(float(event.get("confidence", 0)) * 100, 1)
    subject = f"⚠️ Walkway Alert: ตรวจพบคนในพื้นที่อันตราย — {event.get('camera_name', '')}"

    body_lines = [
        f"บริษัท:       {event.get('company_code', '')}",
        f"กล้อง:        {event.get('camera_name', '')} ({event.get('camera_no', '')})",
        f"พื้นที่:       {event.get('location_name', '')}",
        f"ประเภท event: {event.get('event_type', '')}",
        f"ความมั่นใจ:   {confidence_pct}%",
        f"เวลา:         {event.get('detected_at', '')}",
    ]
    if event.get("image_name"):
        body_lines.append(f"ชื่อไฟล์รูป:  {event['image_name']}")
    if event.get("image_path"):
        body_lines.append(f"ที่เก็บรูป:   {event['image_path']}")

    msg = MIMEMultipart()
    msg["From"] = settings.SMTP_USER
    msg["To"] = settings.ALERT_EMAIL_TO
    msg["Subject"] = subject
    msg.attach(MIMEText("\n".join(body_lines), "plain", "utf-8"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
            smtp.starttls()                               # เข้ารหัส TLS
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(msg)

        logger.info("ส่งอีเมลสำเร็จ → %s", settings.ALERT_EMAIL_TO)
        return True, "SENT"

    except Exception as exc:
        logger.error("ส่งอีเมลล้มเหลว: %s", exc)
        return False, str(exc)
```
### 5.5 วิธีที่ระบบเรียก alert (จาก detection_service)

```python
# ใน detection_service._handle_event()

# ส่ง Teams
teams_ok, teams_code, teams_msg = False, 0, "not sent"
try:
    teams_ok, teams_code, teams_msg = send_teams_alert(event)
except Exception as exc:
    logger.error("send_teams_alert ล้มเหลว: %s", exc)
    teams_msg = str(exc)

# บันทึกสถานะ Teams
update_alert_status(
    event_id, company_code,
    "TEAMS", "SENT" if teams_ok else "FAILED",
    teams_code, teams_msg,
)

# ส่ง Email
email_ok, email_msg = False, "not sent"
try:
    email_ok, email_msg = send_email_alert(event)
except Exception as exc:
    logger.error("send_email_alert ล้มเหลว: %s", exc)
    email_msg = str(exc)

# บันทึกสถานะ Email
update_alert_status(
    event_id, company_code,
    "EMAIL", "SENT" if email_ok else "FAILED",
    None, email_msg,
)
```
> **สังเกต:** แต่ละขั้นมี `try/except` แยก ถ้า Teams ล้มเหลว Email ยังส่งได้ตามปกติ ระบบหลักไม่ crash

---

### ภาคผนวก: Email ผ่าน Microsoft Graph API

ใช้เมื่อ admin ปิด SMTP Auth บน M365 tenant

**ต้องการ (admin ตั้งค่าใน Azure):**
1. App Registration บน Azure AD (Entra ID)
2. Permission: `Mail.Send` (Application)
3. ค่า: Tenant ID, Client ID, Client Secret

```dotenv
GRAPH_TENANT_ID=your-tenant-id
GRAPH_CLIENT_ID=your-client-id
GRAPH_CLIENT_SECRET=your-client-secret
GRAPH_SENDER_EMAIL=noreply@yourcompany.com
```
**Python code (`send_email_via_graph`)** ดูได้ที่ [src/alert/email_alert.py](../../src/alert/email_alert.py) (ท้ายไฟล์)

```bash
# ต้องติดตั้งเพิ่ม
pip install msal
```
---

## ส่วนที่ 6 — แบบฝึกหัด

1. **สร้าง Teams flow:** ทำตามขั้นตอนในส่วนที่ 5.1 สร้าง flow ใน Teams channel ทดสอบ
2. **ส่งข้อความทดสอบ:** รันโค้ดใน `playground/06-alerts-teams-email/example.py` ดูว่าข้อความปรากฏใน Teams
3. **ส่ง Email ทดสอบ:** ตั้งค่า SMTP แล้วส่ง email ทดสอบ ดูใน inbox
4. **ทดสอบ cooldown:** ส่ง event 2 ครั้งติดกัน ดูว่าครั้งที่ 2 ถูก skip (ดูใน log)
5. **ทดสอบ failure:** ตั้ง webhook URL ผิด ดูว่าระบบ log error แต่ไม่ crash

---

## ส่วนที่ 7 — Checklist หลังเรียน

- [ ] สร้าง Power Automate Workflows flow สำเร็จ ได้ webhook URL
- [ ] `TEAMS_WEBHOOK_URL` ตั้งใน `.env` แล้ว
- [ ] ส่ง Teams alert จาก Python ได้ ข้อความปรากฏใน channel
- [ ] ตั้งค่า SMTP M365 ใน `.env` แล้ว
- [ ] ส่ง Email จาก Python ได้
- [ ] เข้าใจว่า cooldown ป้องกัน spam ยังไง
- [ ] รู้ว่า rate limit ของ Teams คือ ~4 req/วิ
- [ ] เข้าใจว่าทำไม alert failure ต้องไม่ crash ระบบหลัก

---

## ส่วนที่ 8 — Common Error + วิธีแก้

### Error: Teams ตอบ `400 Bad Request` หรือ `401 Unauthorized`

**สาเหตุ:** webhook URL หมดอายุ หรือ flow ถูกลบ

**วิธีแก้:** สร้าง flow ใหม่และ update `TEAMS_WEBHOOK_URL` ใน `.env`

---

### Error: Teams ตอบ `429 Too Many Requests`

**สาเหตุ:** ส่งถี่เกิน 4 requests/วิ

**วิธีแก้:** เพิ่ม `ALERT_COOLDOWN_SECONDS` ใน `.env` (ค่า default 120 วิ น่าจะพอ)

---

### Error: `SMTPAuthenticationError: (535, b'5.7.3 Authentication unsuccessful')`

**สาเหตุ 1:** ใช้รหัสผ่าน account ธรรมดา ไม่ใช่ App Password

**วิธีแก้:** สร้าง App Password จาก Microsoft account security settings

**สาเหตุ 2:** Two-factor authentication ยังไม่ได้เปิด (App Password ต้องเปิด MFA ก่อน)

**สาเหตุ 3:** IT admin ปิด SMTP Auth บน tenant — ต้องใช้ Graph API แทน

---

### Error: `smtplib.SMTPConnectError: (421, b'4.3.2 Service not available')`

**สาเหตุ:** smtp.office365.com ไม่ตอบ หรือ port 587 ถูก firewall บล็อก

```bash
# ทดสอบ
Test-NetConnection -ComputerName smtp.office365.com -Port 587   # PowerShell
```
---

### ส่ง Teams ได้ แต่ข้อความในช่อง Teams ดูแปลก/ไม่ครบ

**สาเหตุ:** Power Automate flow อาจ map field ผิด

**วิธีแก้:** เปิด flow → ดู "Post a message" action → ตรวจสอบว่า body ใช้ field จาก trigger ถูกต้อง

---

## ส่วนที่ 9 — ควร commit อะไร

```text
✅ commit:
├── src/alert/teams_alert.py
├── src/alert/email_alert.py
├── src/alert/__init__.py
└── playground/06-alerts-teams-email/example.py
```
---

## ส่วนที่ 10 — ไม่ควร commit อะไร

```text
❌ ห้าม commit:
├── .env                (TEAMS_WEBHOOK_URL, SMTP_PASSWORD, Graph secrets)
└── ไฟล์ที่มี webhook URL หรือ password แบบ hardcode
```
> **เตือน:** Webhook URL คือ secret ถ้า URL หลุดออกไป ใครก็ POST message เข้า Teams ของคุณได้ ต้อง revoke flow แล้วสร้างใหม่ทันที
