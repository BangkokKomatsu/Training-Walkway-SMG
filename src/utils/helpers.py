"""
ฟังก์ชันช่วยทั่วไปที่ใช้ร่วมกันหลายโมดูล
"""

import cv2


def get_bbox_bottom_center(bbox: tuple) -> tuple:
    """คำนวณจุดกึ่งกลางขอบล่างของ bounding box (x1, y1, x2, y2) -> (cx, y2)"""
    x1, y1, x2, y2 = bbox
    return ((x1 + x2) / 2, y2)


def is_boxes_close(box1: tuple, box2: tuple, threshold: int = 70) -> bool:
    """
    เช็คว่า 2 bounding box อยู่ใกล้กันหรือไม่ (วัดระยะห่างแนวนอน)
    ใช้ตรวจว่า person อยู่ใกล้ bicycle → ถือว่าปลอดภัย (กำลังขี่จักรยาน)
    """
    x1, y1, x2, y2 = box1
    x1_b, y1_b, x2_b, y2_b = box2
    distance = min(abs(x1 - x2_b), abs(x1_b - x2))
    return distance < threshold


def draw_label(frame, text: str, x: int, y: int, color: tuple[int, int, int]) -> None:
    """วาด label text พร้อมพื้นหลังสีบน frame (ใช้ cv2 ไม่ต้องพึ่ง cvzone)"""
    font = cv2.FONT_HERSHEY_SIMPLEX
    scale = 0.5
    thickness = 1
    (tw, th), baseline = cv2.getTextSize(text, font, scale, thickness)

    lx = max(0, x)
    ly = max(th + 4, y)

    cv2.rectangle(frame, (lx, ly - th - 4), (lx + tw + 4, ly + baseline), color, -1)
    cv2.putText(frame, text, (lx + 2, ly - 2), font, scale, (255, 255, 255), thickness)
