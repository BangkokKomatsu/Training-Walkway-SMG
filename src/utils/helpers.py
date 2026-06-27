"""
ฟังก์ชันช่วยทั่วไปที่ใช้ร่วมกันหลายโมดูล
(Phase 1 จะเติม logic จริงเพิ่มเติม)
"""


def get_bbox_bottom_center(bbox: tuple) -> tuple:
    """คำนวณจุดกึ่งกลางขอบล่างของ bounding box (x1, y1, x2, y2) -> (cx, y2)"""
    x1, y1, x2, y2 = bbox
    return ((x1 + x2) / 2, y2)
