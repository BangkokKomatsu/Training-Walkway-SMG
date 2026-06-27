"""
playground/06-alerts-teams-email/example.py
ตัวอย่าง: ส่ง Teams webhook และ Email SMTP M365

รันจากโฟลเดอร์ root ของโปรเจกต์:
    python playground/06-alerts-teams-email/example.py

ต้องการ:
    - ไฟล์ .env ตั้งค่า TEAMS_WEBHOOK_URL, SMTP_USER, SMTP_PASSWORD, ALERT_EMAIL_TO
    - pip install requests python-dotenv
"""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from config.settings import settings

# event ตัวอย่างสำหรับทดสอบ
SAMPLE_EVENT = {
    "event_id":     9999,
    "company_code": "DEMO",
    "camera_no":    "CAM-PG",
    "camera_name":  "Playground Camera",
    "location_name": "Test Location",
    "event_type":   "DWELL",
    "confidence":   0.9123,
    "detected_at":  "2026-06-16 14:30:00",
    "image_url":    "",
}


def demo_teams():
    """ทดสอบส่ง Teams webhook"""
    if not settings.TEAMS_WEBHOOK_URL:
        print("⚠️  TEAMS_WEBHOOK_URL ยังไม่ตั้งค่าใน .env — ข้าม Teams test")
        return

    import requests

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

    print(f"กำลังส่ง Teams webhook → {settings.TEAMS_WEBHOOK_URL[:40]}...")
    try:
        resp = requests.post(settings.TEAMS_WEBHOOK_URL, json=payload, timeout=10)
        print(f"Teams ตอบกลับ: HTTP {resp.status_code} — {resp.text[:100]}")
    except Exception as exc:
        print(f"❌ Teams ล้มเหลว: {exc}")


def demo_email():
    """ทดสอบส่ง Email ผ่าน SMTP M365"""
    if not all([settings.SMTP_USER, settings.SMTP_PASSWORD, settings.ALERT_EMAIL_TO]):
        print("⚠️  SMTP_USER / SMTP_PASSWORD / ALERT_EMAIL_TO ยังไม่ตั้งค่าใน .env — ข้าม Email test")
        return

    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    subject = "[PLAYGROUND TEST] ⚠️ Walkway Alert"
    body = (
        f"นี่คือข้อความทดสอบจาก playground\n\n"
        f"บริษัท:       {SAMPLE_EVENT['company_code']}\n"
        f"กล้อง:        {SAMPLE_EVENT['camera_name']} ({SAMPLE_EVENT['camera_no']})\n"
        f"พื้นที่:       {SAMPLE_EVENT['location_name']}\n"
        f"ความมั่นใจ:   {round(SAMPLE_EVENT['confidence'] * 100, 1)}%\n"
        f"เวลา:         {SAMPLE_EVENT['detected_at']}\n"
    )

    msg = MIMEMultipart()
    msg["From"] = settings.SMTP_USER
    msg["To"] = settings.ALERT_EMAIL_TO
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain", "utf-8"))

    print(f"กำลังส่งอีเมล {settings.SMTP_USER} → {settings.ALERT_EMAIL_TO}")
    print(f"SMTP: {settings.SMTP_HOST}:{settings.SMTP_PORT}")
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
            smtp.starttls()
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(msg)
        print("ส่งอีเมลสำเร็จ!")
    except Exception as exc:
        print(f"❌ Email ล้มเหลว: {exc}")


if __name__ == "__main__":
    print("=" * 60)
    print("Playground 06: Teams + Email Alert")
    print("=" * 60)
    print()
    demo_teams()
    print()
    demo_email()
