"""
ส่งข้อความแจ้งเตือนเข้า Microsoft Teams ผ่าน Power Automate Workflows webhook (ฟรี/Standard)

📌 วิธีตั้งค่า flow (ดู §E ของ 00_MASTER_CONTEXT.md):
   Teams → Workflows → "Post to a channel when a webhook request is received"
   flow มี 2 ขั้น: (1) webhook trigger → (2) post message to channel
   ห้ามใส่ HTTP action (premium) ในflow

📌 ค่า TEAMS_WEBHOOK_URL เก็บใน .env เท่านั้น
"""

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
        "image_url":     event.get("image_url", ""),
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
            logger.warning("Teams rate limit (HTTP 429) event_id=%s", event.get("event_id"))
        elif not resp.ok:
            logger.error("Teams webhook ตอบ %d: %s", resp.status_code, resp.text[:200])
        else:
            logger.info("ส่ง Teams สำเร็จ event_id=%s", event.get("event_id"))
        return resp.ok, resp.status_code, resp.text[:200]
    except requests.RequestException as exc:
        logger.error("ส่ง Teams ล้มเหลว: %s", exc)
        return False, 0, str(exc)
