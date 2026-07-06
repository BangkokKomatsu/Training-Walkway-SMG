"""
=============================================================================
Unit Test — test_helpers.py
=============================================================================
วัตถุประสงค์:
  - เรียนรู้วิธีการเขียนเทสฟังก์ชันช่วยเหลือ (Helper Functions) ด้วย pytest
  - ฝึกฝนการใช้คำสั่ง assert เพื่อตรวจจับผลลัพธ์การคำนวณที่ผิดพลาด
  - ตรวจสอบความถูกต้องของพิกัด Foot Center และเงื่อนไข Bounding Box ใกล้ชิดกัน
=============================================================================
"""

import sys
from pathlib import Path

# นำเข้าโมดูลที่ต้องการทดสอบจาก src/
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from src.utils.helpers import get_bbox_bottom_center, is_boxes_close


def test_get_bbox_bottom_center():
    """
    ทดสอบฟังก์ชันหาจุดกึ่งกลางขอบล่างของกล่องวัตถุ
    """
    # [คำอธิบายการสอน]
    # การตั้งชื่อฟังก์ชันทดสอบของ pytest จะต้องขึ้นต้นด้วยคำว่า 'test_' เสมอ
    # pytest จะค้นหาฟังก์ชันเหล่านี้โดยอัตโนมัติเมื่อรัน
    
    # กรณีกล่องสี่เหลี่ยมสมมาตรธรรมดา
    bbox_1 = (100, 100, 200, 300)
    expected_1 = (150.0, 300)
    assert get_bbox_bottom_center(bbox_1) == expected_1, "การหาจุดล่างสุดของกล่องสมมาตรธรรมดาผิดพลาด"

    # กรณีกล่องที่มีจุดพิกัดทศนิยม
    bbox_2 = (10, 20, 15, 50)
    expected_2 = (12.5, 50)
    assert get_bbox_bottom_center(bbox_2) == expected_2, "การหาจุดล่างสุดของกล่องที่มีทศนิยมผิดพลาด"


def test_is_boxes_close_true():
    """
    ทดสอบกรณี Bounding Boxes สองกล่องอยู่ใกล้กันจริง (ระยะห่าง < threshold)
    """
    box_person = (100, 100, 150, 300)
    box_bicycle = (180, 100, 250, 300)  # ระยะห่างขอบแนวนอน: min(|100-250|, |180-150|) = min(150, 30) = 30px
    
    # ห่าง 30px ซึ่งน้อยกว่าค่าเกณฑ์ (threshold) 70px -> ควรเป็น True
    assert is_boxes_close(box_person, box_bicycle, threshold=70) is True


def test_is_boxes_close_false():
    """
    ทดสอบกรณี Bounding Boxes สองกล่องอยู่ห่างกันมาก (ระยะห่าง >= threshold)
    """
    box_person = (100, 100, 150, 300)
    box_bicycle = (300, 100, 400, 300)  # ระยะห่างขอบแนวนอน: min(|100-400|, |300-150|) = min(300, 150) = 150px
    
    # ห่าง 150px ซึ่งมากกว่าเกณฑ์ 70px -> ควรเป็น False
    assert is_boxes_close(box_person, box_bicycle, threshold=70) is False
