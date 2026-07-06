"""
=============================================================================
แบบฝึกหัดที่ 06 — Teams & Email Alert Payload Configuration
=============================================================================
วัตถุประสงค์:
  1. เข้าใจวิธีการประกอบ JSON Payload สำหรับนำไปส่งยิงเข้า Teams Webhook
  2. เรียนรู้วิธีการใช้ SMTP ในการเชื่อมต่อส่งข้อความภาษาไทย UTF-8
  3. ฝึกฝนการทำตรรกะ Cooldown สกัดการส่งสแปมแจ้งเตือน (Alert Spamming)

วิธีปฏิบัติ:
  - เติมโค้ดในช่องว่างที่มีเครื่องหมาย # TODO
  - รันไฟล์นี้ด้วยคำสั่ง:
      python playground/06-alerts-teams-email/exercise.py
  - ตรวจสอบว่าผ่านการทดสอบ Assertion หรือไม่
=============================================================================
"""

import sys
import time
from pathlib import Path
import requests

# นำเข้าเครื่องมือจากโปรเจกต์หลัก
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from config.settings import settings

# บังคับระบบแสดงผลภาษาไทยให้ถูกต้องบน Windows Console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def construct_teams_payload(event: dict) -> dict:
    """
    TODO 1: ประกอบ JSON Payload ที่จะส่งไปยัง MS Teams Webhook
    ตรรกะ:
      - ส่งข้อมูลกล้อง พื้นที่ และระดับความมั่นใจ
      - confidence ในดิคชันนารี event เป็นทศนิยม (เช่น 0.85) แต่ Teams ต้องการพิมพ์ % ให้ผู้เรียนคูณ 100
    """
    confidence_pct = round(event.get("confidence", 0.0) * 100.0, 1)
    
    # TODO: เติมคีย์และข้อความที่ต้องการส่งใน dictionary ด้านล่างนี้
    payload = {
        "text": f"⚠️ ตรวจพบคนบุกรุกพื้นที่อันตราย\nกล้อง: {event.get('camera_name')} | พื้นที่: {event.get('location_name')} | ความมั่นใจ: {confidence_pct}%"
    }
    
    return payload


def send_teams_alert_post(webhook_url: str, payload: dict) -> bool:
    """
    TODO 2: ยิง POST Request ส่งข้อมูล JSON ไปยัง Webhook URL
    ใบ้: ใช้ requests.post(url, json=payload, timeout=10)
    """
    if not webhook_url:
        return False
        
    try:
        # TODO: เติมคำสั่งส่ง request ที่นี่
        resp = requests.post(webhook_url, json=payload, timeout=10)
        return resp.status_code == 200 or resp.status_code == 202
    except Exception as e:
        print(f"❌ ส่ง Teams ล้มเหลว: {e}")
        return False


def is_alert_cooldown_active(last_sent_time: float | None, cooldown_seconds: float) -> bool:
    """
    TODO 3: ตรรกะตรวจสอบ Cooldown
    กติกา:
      - ถ้ายังไม่เคยส่งแจ้งเตือนเลย (last_sent_time เป็น None) -> คืน False (Cooldowm ไม่ทำงาน ส่งได้เลย)
      - ถ้าเคยส่งมาแล้ว -> หาความห่างของเวลาปัจจุบัน (time.monotonic()) กับ last_sent_time
      - ถ้าความห่างน้อยกว่า cooldown_seconds -> คืน True (Cooldown ทำงานอยู่ ห้ามส่งซ้ำ)
      - ถ้าความห่างมากกว่าหรือเท่ากับ cooldown_seconds -> คืน False (Cooldown สิ้นสุดแล้ว ส่งใหม่ได้)
    """
    now = time.monotonic()
    
    # TODO: เขียนเงื่อนไขเช็ค cooldown ที่นี่
    if last_sent_time is None:
        return False
        
    elapsed = now - last_sent_time
    if elapsed < cooldown_seconds:
        return True
        
    return False


if __name__ == "__main__":
    # ข้อมูลเหตุการณ์ตัวอย่าง
    sample_event = {
        "camera_name": "Front Walkway Cam",
        "location_name": "Production Zone A",
        "confidence": 0.9234,
        "detected_at": "2026-07-06 14:00:00"
    }

    # 1. ทดสอบการประกอบ payload
    teams_json = construct_teams_payload(sample_event)
    print("โครงสร้าง JSON ที่ประกอบได้สำหรับ Teams:")
    print(teams_json)

    # 2. ทดลองประมวลผลตรรกะ Cooldown
    print("\n--- เริ่มทดสอบตรรกะ Cooldown (Cooldown Logic Test) ---")
    cooldown_limit = 2.0
    t_last = time.monotonic()  # จำลองการส่งรอบแรก ณ วินาทีนี้
    
    # เช็คทันที (ไม่พ้น 2 วินาที)
    cooldown_active_1 = is_alert_cooldown_active(t_last, cooldown_limit)
    print(f"ตรวจสอบทันที (0.0 วิผ่านไป) -> Cooldown ทำงานอยู่หรือไม่? = {cooldown_active_1} (ควรเป็น True)")
    
    # หลับรอให้พ้นเวลา 2.2 วินาที
    print("หลับรอให้พ้นเวลา 2.2 วินาที...")
    time.sleep(2.2)
    
    # เช็คอีกรอบ
    cooldown_active_2 = is_alert_cooldown_active(t_last, cooldown_limit)
    print(f"ตรวจสอบอีกครั้ง (2.2 วิผ่านไป) -> Cooldown ทำงานอยู่หรือไม่? = {cooldown_active_2} (ควรเป็น False)")

    # === ระบบตรวจคำตอบอัตโนมัติ (Self-Checking) ===
    print("\n=== เริ่มขั้นตอนการตรวจคำตอบ (Verification) ===")
    try:
        assert isinstance(teams_json, dict), "ข้อ 1 ผิดพลาด: Payload ที่ได้ไม่ใช่ Dictionary"
        assert "text" in teams_json or "message" in teams_json or len(teams_json) > 1, "ข้อ 1 ผิดพลาด: ไม่มีข้อมูลเนื้อหาใน Payload"
        print("✅ ข้อ 1 ผ่าน: ประกอบโครงสร้างข้อมูล Payload JSON ได้ตามข้อกำหนด")
        
        # เช็คตรรกะ cooldown
        assert cooldown_active_1 is True, "ข้อ 2 ผิดพลาด: ตรรกะ Cooldown ไม่ทำงานเมื่อระยะเวลาสั้นเกินไป"
        assert cooldown_active_2 is False, "ข้อ 2 ผิดพลาด: ตรรกะ Cooldown บล็อกการส่งทั้งที่หมดเวลา Cooldown แล้ว"
        print("✅ ข้อ 2 ผ่าน: ระบบสกัดกั้น Cooldown และอนุญาตส่งซ้ำเมื่อหมดเวลาทำงานอย่างมีประสิทธิภาพ")
        
        print("\n🎉 ยินดีด้วย! คุณผ่านแบบฝึกหัด Alerts Configuration เรียบร้อยแล้ว")
    except AssertionError as e:
        print(f"❌ ตรวจสอบพบจุดผิดพลาด: {e}")
        print("คำแนะนำ: ตรวจสอบโค้ดในส่วน # TODO และทำใหม่อีกครั้ง")
