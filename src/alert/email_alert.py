"""
ส่งอีเมลแจ้งเตือนผ่าน SMTP M365 (app password)
📌 ค่า SMTP_USER / SMTP_PASSWORD / ALERT_EMAIL_TO เก็บใน .env เท่านั้น

--- ภาคผนวก: Microsoft Graph API ---
ดู send_email_via_graph() ด้านล่าง ใช้แทน SMTP ได้ถ้า M365 ปิด SMTP auth
"""

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
        logger.warning("Email config ไม่ครบ (SMTP_USER / SMTP_PASSWORD / ALERT_EMAIL_TO) — ข้ามการส่ง")
        return False, "Email not configured"

    confidence_pct = round(float(event.get("confidence", 0)) * 100, 1)

    subject = (
        f"⚠️ Walkway Alert: ตรวจพบคนในพื้นที่อันตราย — {event.get('camera_name', '')}"
    )
    body_lines = [
        f"บริษัท:       {event.get('company_code', '')}",
        f"กล้อง:        {event.get('camera_name', '')} ({event.get('camera_no', '')})",
        f"พื้นที่:       {event.get('location_name', '')}",
        f"ประเภท event: {event.get('event_type', '')}",
        f"ความมั่นใจ:   {confidence_pct}%",
        f"เวลา:         {event.get('detected_at', '')}",
    ]
    if event.get("image_url"):
        body_lines.append(f"ลิงก์รูปภาพ:  {event['image_url']}")

    msg = MIMEMultipart()
    msg["From"] = settings.SMTP_USER
    msg["To"] = settings.ALERT_EMAIL_TO
    msg["Subject"] = subject
    msg.attach(MIMEText("\n".join(body_lines), "plain", "utf-8"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15) as smtp:
            smtp.starttls()
            smtp.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            smtp.send_message(msg)
        logger.info("ส่งอีเมลสำเร็จ → %s event_id=%s", settings.ALERT_EMAIL_TO, event.get("event_id"))
        return True, "SENT"
    except Exception as exc:
        logger.error("ส่งอีเมลล้มเหลว: %s", exc)
        return False, str(exc)


# =============================================================================
# ภาคผนวก: ส่งผ่าน Microsoft Graph API
# ใช้แทน SMTP ได้เมื่อ admin ปิด SMTP AUTH บน M365 tenant
#
# ต้องการ:
#   1. App Registration บน Azure AD (Entra ID)
#   2. ให้ permission: Mail.Send (Application)
#   3. เพิ่ม env ใน .env:
#        GRAPH_TENANT_ID=
#        GRAPH_CLIENT_ID=
#        GRAPH_CLIENT_SECRET=
#        GRAPH_SENDER_EMAIL=   (mailbox ที่ app จะส่งในนาม)
#
# pip install msal requests (ถ้ายังไม่มี)
# =============================================================================

def send_email_via_graph(event: dict) -> tuple[bool, str]:
    """
    ส่งอีเมลผ่าน Microsoft Graph API (ภาคผนวก — ใช้เมื่อ SMTP AUTH ถูกปิด)
    ต้องติดตั้ง: pip install msal
    ต้องตั้งค่า .env: GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET, GRAPH_SENDER_EMAIL
    """
    import os

    try:
        import msal
        import requests as req
    except ImportError:
        logger.error("ภาคผนวก Graph API ต้องติดตั้ง: pip install msal requests")
        return False, "msal not installed"

    tenant_id    = os.getenv("GRAPH_TENANT_ID", "")
    client_id    = os.getenv("GRAPH_CLIENT_ID", "")
    client_secret = os.getenv("GRAPH_CLIENT_SECRET", "")
    sender_email = os.getenv("GRAPH_SENDER_EMAIL", "")
    to_email     = settings.ALERT_EMAIL_TO

    if not all([tenant_id, client_id, client_secret, sender_email, to_email]):
        logger.warning("Graph API config ไม่ครบ — ข้ามการส่ง")
        return False, "Graph API not configured"

    # 1. ขอ access token
    app = msal.ConfidentialClientApplication(
        client_id,
        authority=f"https://login.microsoftonline.com/{tenant_id}",
        client_credential=client_secret,
    )
    token_result = app.acquire_token_for_client(scopes=["https://graph.microsoft.com/.default"])
    if "access_token" not in token_result:
        logger.error("Graph API get token ล้มเหลว: %s", token_result.get("error_description"))
        return False, token_result.get("error_description", "token error")

    # 2. ส่งอีเมล
    confidence_pct = round(float(event.get("confidence", 0)) * 100, 1)
    body_text = (
        f"บริษัท: {event.get('company_code')}\n"
        f"กล้อง: {event.get('camera_name')} ({event.get('camera_no')})\n"
        f"พื้นที่: {event.get('location_name')}\n"
        f"ประเภท: {event.get('event_type')}\n"
        f"ความมั่นใจ: {confidence_pct}%\n"
        f"เวลา: {event.get('detected_at')}"
    )
    payload = {
        "message": {
            "subject": f"⚠️ Walkway Alert: {event.get('camera_name')}",
            "body": {"contentType": "Text", "content": body_text},
            "toRecipients": [{"emailAddress": {"address": to_email}}],
        }
    }

    url = f"https://graph.microsoft.com/v1.0/users/{sender_email}/sendMail"
    headers = {"Authorization": f"Bearer {token_result['access_token']}"}

    try:
        resp = req.post(url, json=payload, headers=headers, timeout=15)
        if resp.status_code == 202:
            logger.info("Graph API ส่งอีเมลสำเร็จ event_id=%s", event.get("event_id"))
            return True, "SENT"
        logger.error("Graph API ตอบ %d: %s", resp.status_code, resp.text[:200])
        return False, resp.text[:200]
    except Exception as exc:
        logger.error("Graph API ส่งอีเมลล้มเหลว: %s", exc)
        return False, str(exc)
