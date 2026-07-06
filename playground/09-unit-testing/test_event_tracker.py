"""
=============================================================================
Unit Test — test_event_tracker.py
=============================================================================
วัตถุประสงค์:
  - ทดสอบระบบวิเคราะห์เวลาแช่ตัวบุกรุก (CameraEventTracker)
  - เรียนรู้วิธีการเขียนเทสโดยการ "Mock" หรือจำลองเวลาไหลผ่าน (Time Mocking)
  - เรียนรู้วิธีการใช้ unittest.mock.patch เพื่อเร่งความเร็วการเทสโดยไม่ต้องใช้ time.sleep() จริง
=============================================================================
"""

import sys
from pathlib import Path
from unittest.mock import patch

# นำเข้าโมดูลที่ต้องการทดสอบจาก src/
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from src.detection.detection_service import CameraEventTracker


def test_tracker_dwell_time_trigger():
    """
    ทดสอบการบันทึกสถานะบุกรุก Dwell Time:
    เมื่ออยู่ต่อเนื่องนานเกิน dwell_seconds (เช่น 5 วินาที) จะต้องสะกิดเตือน (Trigger True)
    """
    tracker = CameraEventTracker(dwell_seconds=5, cooldown_seconds=60)

    # ใช้ patch ของ mock เพื่อควบคุมค่าผลลัพธ์ของ time.monotonic() อัตโนมัติ
    with patch("time.monotonic") as mock_time:
        # 1. จำลองเวลาเริ่มต้นที่วินาทีที่ 100.0 (คนเดินเข้าเขตเป็นเฟรมแรก)
        mock_time.return_value = 100.0
        triggered_1 = tracker.update(person_in_zone=True)
        assert triggered_1 is False, "เฟรมแรกที่เพิ่งเดินเข้าเขตอันตราย ห้ามส่งแจ้งเตือนทันที"

        # 2. จำลองเวลาผ่านไป 3.0 วินาที (เวลาของคอมพิวเตอร์ไหลไปเป็น 103.0)
        mock_time.return_value = 103.0
        triggered_2 = tracker.update(person_in_zone=True)
        assert triggered_2 is False, "อยู่ในพื้นที่มาแล้ว 3 วินาที (ยังไม่ถึงเกณฑ์ 5 วินาที) ห้ามเตือน"

        # 3. จำลองเวลาผ่านไปรวม 6.0 วินาที (เวลาเป็น 106.0 ซึ่งเกินเกณฑ์ 5 วินาทีแล้ว)
        mock_time.return_value = 106.0
        triggered_3 = tracker.update(person_in_zone=True)
        assert triggered_3 is True, "อยู่ในพื้นที่นานต่อเนื่อง 6 วินาที (>5 วิ) ต้องแจ้งเตือนสำเร็จ"

        # 4. เฟรมถัดมา ยังอยู่ต่อเนื่อง แต่เพิ่งเตือนไปในเฟรมที่แล้ว
        mock_time.return_value = 107.0
        triggered_4 = tracker.update(person_in_zone=True)
        assert triggered_4 is False, "เฟรมถัดไปยังอยู่ต่อเนื่องและเพิ่งแจ้งเตือนไปในรอบการบุกรุกเดียวกัน ห้ามส่งซ้ำรัว ๆ"


def test_tracker_exit_resets_timer():
    """
    ทดสอบตรรกะว่าการเดินออกจากโซนจะรีเซ็ตตัวจับเวลาเริ่มต้นใหม่
    """
    tracker = CameraEventTracker(dwell_seconds=5, cooldown_seconds=60)

    with patch("time.monotonic") as mock_time:
        # เฟรมแรกเข้าโซน ณ วินาทีที่ 100.0
        mock_time.return_value = 100.0
        tracker.update(person_in_zone=True)

        # เฟรมถัดมา วินาทีที่ 103.0 เดินออกจากเขต (person_in_zone = False)
        mock_time.return_value = 103.0
        tracker.update(person_in_zone=False)

        # เฟรมต่อมา วินาทีที่ 104.0 เดินกลับเข้ามาใหม่ -> ระบบต้องเริ่มนับเวลาใหม่ที่วินาทีที่ 104.0
        mock_time.return_value = 104.0
        tracker.update(person_in_zone=True)

        # วินาทีที่ 108.0 (ห่างจากจุดเข้าใหม่แค่ 4 วินาที แม้เวลารวมจะห่างจากเฟรมแรก 8 วินาทีแล้ว)
        mock_time.return_value = 108.0
        triggered = tracker.update(person_in_zone=True)
        assert triggered is False, "ตรรกะรีเซ็ตค่าเวลาล้มเหลว: คนออกจากโซนไปแล้วแต่เวลารอบก่อนไม่โดนรีเซ็ต"


def test_tracker_cooldown_behavior():
    """
    ทดสอบการทำงานของ Alert Cooldown:
    หลังจากเตือนไปครั้งแรกแล้ว หากออกแล้วเข้ามาใหม่ จะต้องไม่แจ้งซ้ำจนกว่าจะผ่านพ้น cooldown_seconds (เช่น 60 วินาที)
    """
    tracker = CameraEventTracker(dwell_seconds=5, cooldown_seconds=60)

    with patch("time.monotonic") as mock_time:
        # 1. รันเพื่อให้เกิดการแจ้งเตือนครั้งแรก ณ วินาทีที่ 100.0 และเตือน ณ 106.0
        mock_time.return_value = 100.0
        tracker.update(person_in_zone=True)
        
        mock_time.return_value = 106.0
        tracker.update(person_in_zone=True)  # แจ้งเตือนครั้งแรกสำเร็จ (last_alert_time = 106.0)
        
        # เดินออกจากโซนเพื่อรีเซ็ต event_active
        mock_time.return_value = 110.0
        tracker.update(person_in_zone=False)

        # 2. จำลองคนเดินเข้ามาใหม่ ณ วินาทีที่ 120.0 และแช่อยู่จนถึง 126.0 (ห่างจากเตือนครั้งแรกแค่ 20 วินาที)
        # เนื่องจากระยะห่างจากเตือนครั้งแรก (126.0 - 106.0 = 20s) น้อยกว่า Cooldown (60s) -> ต้องข้ามการเตือน (False)
        mock_time.return_value = 120.0
        tracker.update(person_in_zone=True)
        
        mock_time.return_value = 126.0
        triggered_during_cooldown = tracker.update(person_in_zone=True)
        assert triggered_during_cooldown is False, "ระบบหลุดส่งเตือนซ้ำระว่างช่วง Cooldown"

        # เดินออกจากโซนเพื่อรีเซ็ต event_active อีกรอบ
        mock_time.return_value = 130.0
        tracker.update(person_in_zone=False)

        # 3. จำลองคนเดินเข้ามาใหม่ ณ วินาทีที่ 180.0 และแช่อยู่จนถึง 186.0 (ห่างจากเตือนครั้งแรก 186.0 - 106.0 = 80 วินาที)
        # เนื่องจากห่างเกิน Cooldown 60 วินาทีแล้ว -> ต้องยอมให้เกิดการแจ้งเตือนรอบสอง (True)
        mock_time.return_value = 180.0
        tracker.update(person_in_zone=True)

        mock_time.return_value = 186.0
        triggered_after_cooldown = tracker.update(person_in_zone=True)
        assert triggered_after_cooldown is True, "หมดเวลา Cooldown และเข้าใหม่แล้วแต่ระบบยังคงบล็อกแจ้งเตือน"
