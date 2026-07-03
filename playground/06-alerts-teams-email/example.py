"""
playground/06-alerts-teams-email/example.py
ตัวอย่าง: ส่ง Teams webhook, Email SMTP M365 และสาธิต Cooldown เต็มวงจร (Full Alert Lifecycle)

รันจากโฟลเดอร์ root ของโปรเจกต์:
    python playground/06-alerts-teams-email/example.py

ต้องการ:
    - ไฟล์ .env ตั้งค่า TEAMS_WEBHOOK_URL, SMTP_USER, SMTP_PASSWORD, ALERT_EMAIL_TO
    - pip install requests python-dotenv
    - (ถ้าอยากเห็นขั้นตอนบันทึกสถานะลง DB ด้วย ต้องตั้งค่า DB_SERVER/DB_NAME/DB_USER/DB_PASSWORD ด้วย
       แต่ถ้าไม่ตั้งค่า สคริปต์ก็ยังรันผ่านได้ปกติ แค่ข้ามขั้นตอนบันทึก DB ไป)
"""

import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from config.settings import settings
from src.alert.teams_alert import send_teams_alert  # noqa: E402
from src.database.detection_repository import update_alert_status  # noqa: E402

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
    "image_name":   "",
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


def demo_cooldown():
    """
    สาธิต cooldown เต็มวงจร (Full Alert Lifecycle): ส่ง event เดิมซ้ำ 2 ครั้งติดกันทันที
    ครั้งที่ 2 ต้องถูก "ข้าม" เพราะยังไม่พ้นเวลา ALERT_COOLDOWN_SECONDS (กัน spam แจ้งเตือนรัว ๆ)

    ใน production จริง (src/detection/detection_service.py) ระบบเก็บเวลาที่แจ้งเตือนล่าสุด
    ของแต่ละ event ไว้ในหน่วยความจำ แล้วเช็คก่อนส่งทุกครั้ง — ที่นี่เราจำลอง logic เดียวกัน
    ด้วย dict ธรรมดา (`last_sent_at`) เพื่อให้เห็นภาพง่าย ๆ
    """
    print(f"ALERT_COOLDOWN_SECONDS = {settings.ALERT_COOLDOWN_SECONDS} วินาที")

    last_sent_at = {}  # จำลอง cache เวลาแจ้งเตือนล่าสุดต่อ event_id (ของจริงอาจเก็บใน memory/Redis)
    event_id = SAMPLE_EVENT["event_id"]

    def try_send(label: str):
        now = datetime.now()
        last = last_sent_at.get(event_id)

        # เช็ค cooldown ก่อนส่งทุกครั้ง — ถ้ายังไม่พ้นเวลาที่กำหนดไว้ ให้ข้ามการส่งไปเลย
        if last is not None:
            elapsed = (now - last).total_seconds()
            if elapsed < settings.ALERT_COOLDOWN_SECONDS:
                print(f"[{label}] ⏭  ข้าม — ส่งไปแล้วเมื่อ {elapsed:.1f} วิก่อน (ยังไม่พ้น cooldown)")
                return

        # พ้น cooldown แล้ว (หรือยังไม่เคยส่งมาก่อน) → ส่งจริงผ่านฟังก์ชันเดียวกับที่ระบบใช้จริง
        ok, code, text = send_teams_alert(SAMPLE_EVENT)
        last_sent_at[event_id] = now
        print(f"[{label}] ✅ ส่งจริง — HTTP {code} ({'สำเร็จ' if ok else 'ล้มเหลว'})")

        # บันทึกสถานะการแจ้งเตือนลง MSSQL ด้วย update_alert_status() (เหมือนที่ detection_service.py ทำ)
        if settings.DB_SERVER:
            try:
                update_alert_status(
                    event_id, SAMPLE_EVENT["company_code"],
                    "TEAMS", "SENT" if ok else "FAILED",
                    code, text,
                )
                print(f"[{label}]    บันทึกสถานะลง MSSQL สำเร็จ (update_alert_status)")
            except Exception as exc:
                print(f"[{label}]    ⚠️ update_alert_status ล้มเหลว (DB ต่อไม่ได้?): {exc}")
        else:
            print(f"[{label}]    ⚠️ DB_SERVER ยังไม่ตั้งค่าใน .env — ข้ามขั้นตอนบันทึกสถานะลง DB")

    try_send("รอบที่ 1")
    try_send("รอบที่ 2 (ทันที)")


if __name__ == "__main__":
    print("=" * 60)
    print("Playground 06: Teams + Email Alert")
    print("=" * 60)
    print()
    demo_teams()
    print()
    demo_email()
    print()
    print("=" * 60)
    print("Playground 06b: Cooldown + update_alert_status() (Full Alert Lifecycle)")
    print("=" * 60)
    print()
    demo_cooldown()
