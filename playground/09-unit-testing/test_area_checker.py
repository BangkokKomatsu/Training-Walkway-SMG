"""
=============================================================================
Unit Test — test_area_checker.py
=============================================================================
วัตถุประสงค์:
  - ทดสอบระบบวิเคราะห์เรขาคณิตโพลิกอน (AreaChecker) แบบระบุพิกัด
  - เรียนรู้วิธีการส่งข้อมูลจำลองผ่าน Unit Testing เพื่อเช็คความแม่นยำเรขาคณิต
  - ป้องกันปัญหาบั๊กจุดคำนวณหลุดจากเส้นขอบเขตอันตราย
=============================================================================
"""

import sys
from pathlib import Path

# นำเข้าโมดูลที่ต้องการทดสอบจาก src/
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from src.detection.area_checker import AreaChecker


def test_area_checker_inside():
    """
    ทดสอบกรณีพิกัดเป้าหมายอยู่ภายในพื้นที่โพลิกอนอันตราย
    """
    # โพลิกอนสี่เหลี่ยมจัตุรัสขนาด 100x100
    polygon = [(100, 100), (200, 100), (200, 200), (100, 200)]
    checker = AreaChecker([polygon])
    
    # จุด (150, 150) อยู่กึ่งกลางพื้นที่ -> ควรได้ True
    assert checker.is_in_danger_zone((150, 150)) is True


def test_area_checker_outside():
    """
    ทดสอบกรณีพิกัดเป้าหมายอยู่นอกพื้นที่โพลิกอนอันตราย
    """
    polygon = [(100, 100), (200, 100), (200, 200), (100, 200)]
    checker = AreaChecker([polygon])
    
    # จุด (50, 50) อยู่นอกพื้นที่ (บนซ้าย) -> ควรได้ False
    assert checker.is_in_danger_zone((50, 50)) is False
    
    # จุด (250, 150) อยู่นอกพื้นที่ (ด้านขวา) -> ควรได้ False
    assert checker.is_in_danger_zone((250, 150)) is False


def test_area_checker_multiple_zones():
    """
    ทดสอบกรณีกำหนดพื้นที่อันตรายไว้หลายโซนพร้อมกัน (Multiple Polygons)
    """
    zone_1 = [(10, 10), (50, 10), (50, 50), (10, 50)]
    zone_2 = [(100, 100), (150, 100), (150, 150), (100, 150)]
    
    # ส่งลิสต์ของโพลิกอนเข้าไปสองตัว
    checker = AreaChecker([zone_1, zone_2])
    
    # จุดที่ 1 อยู่ใน zone_1 -> ควรได้ True
    assert checker.is_in_danger_zone((20, 20)) is True
    
    # จุดที่ 2 อยู่ใน zone_2 -> ควรได้ True
    assert checker.is_in_danger_zone((120, 120)) is True
    
    # จุดที่ 3 อยู่นอกทั้งสองโซน -> ควรได้ False
    assert checker.is_in_danger_zone((80, 80)) is False
