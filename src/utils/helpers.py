"""
ฟังก์ชันช่วยทั่วไปที่ใช้ร่วมกันหลายโมดูล
"""

import cv2


def get_bbox_bottom_center(bbox: tuple) -> tuple:
    """คำนวณจุดกึ่งกลางขอบล่างของ bounding box (x1, y1, x2, y2) -> (cx, y2)"""
    x1, y1, x2, y2 = bbox
    return ((x1 + x2) / 2, y2)


# จุดอ้างอิงของคนที่จะเอาไปเช็ค polygon — เลือกได้ต่อกล้อง (บางมุมกล้องจุดเท้ากลางไม่เวิร์ก)
# "เส้นขอบซ้าย/ขวา" = ใช้จุดกึ่งกลางของเส้นนั้น (single point ก็พอ ไม่ต้องเทสต์ทั้งเส้น)
_REFERENCE_POINTS = {
    "bottom_center": lambda x1, y1, x2, y2: ((x1 + x2) / 2, y2),
    "bottom_left":   lambda x1, y1, x2, y2: (x1, y2),
    "bottom_right":  lambda x1, y1, x2, y2: (x2, y2),
    "top_left":      lambda x1, y1, x2, y2: (x1, y1),
    "top_right":     lambda x1, y1, x2, y2: (x2, y1),
    "left_center":   lambda x1, y1, x2, y2: (x1, (y1 + y2) / 2),   # เส้นขอบซ้าย
    "right_center":  lambda x1, y1, x2, y2: (x2, (y1 + y2) / 2),   # เส้นขอบขวา
    "center":        lambda x1, y1, x2, y2: ((x1 + x2) / 2, (y1 + y2) / 2),
}


def get_bbox_reference_point(bbox: tuple, mode: str = "bottom_center") -> tuple:
    """คืนจุดอ้างอิงของ bbox ตามโหมดที่เลือก (ดู keys ใน _REFERENCE_POINTS)"""
    fn = _REFERENCE_POINTS.get(mode)
    if fn is None:
        raise ValueError(
            f"reference_point ไม่รู้จัก: '{mode}' — เลือกได้: {', '.join(_REFERENCE_POINTS)}"
        )
    return fn(*bbox)


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


if __name__ == "__main__":
    # self-check: จุดอ้างอิงแต่ละโหมดของ bbox (10,20)-(30,40)
    b = (10, 20, 30, 40)
    assert get_bbox_reference_point(b) == (20, 40)                 # bottom_center (default)
    assert get_bbox_reference_point(b, "bottom_left") == (10, 40)
    assert get_bbox_reference_point(b, "bottom_right") == (30, 40)
    assert get_bbox_reference_point(b, "left_center") == (10, 30)
    assert get_bbox_reference_point(b, "right_center") == (30, 30)
    try:
        get_bbox_reference_point(b, "typo")
        assert False, "ควร raise ValueError เมื่อ mode ผิด"
    except ValueError:
        pass
    print("helpers self-check OK")
