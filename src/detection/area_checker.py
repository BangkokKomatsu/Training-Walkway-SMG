"""
ตรวจสอบว่าจุดอ้างอิงของคน (จุดกึ่งกลางขอบล่างของ bounding box)
อยู่ใน polygon พื้นที่อันตรายหรือไม่ (ใช้ cv2.pointPolygonTest)

มีฟังก์ชันวาด polygon ลงเฟรม สำหรับเซฟภาพ debug/หลักฐาน event (ห้ามใช้ cv2.imshow)
"""

import cv2
import numpy as np


class AreaChecker:
    """เช็คว่าจุดอ้างอิงของคนอยู่ในพื้นที่อันตราย (polygon) หรือไม่"""

    def __init__(self, polygon: list[tuple[int, int]]):
        self.polygon = np.array(polygon, dtype=np.int32)

    def is_in_danger_zone(self, point: tuple[float, float]) -> bool:
        """point-in-polygon: True ถ้าจุดอยู่ในหรือบนขอบของ polygon"""
        result = cv2.pointPolygonTest(
            self.polygon, (float(point[0]), float(point[1])), False
        )
        return result >= 0

    def draw_polygon(self, frame, color: tuple[int, int, int] = (0, 0, 255), thickness: int = 2):
        """วาดเส้น polygon พื้นที่อันตรายลงเฟรม (สำหรับเซฟภาพ debug)"""
        cv2.polylines(frame, [self.polygon], isClosed=True, color=color, thickness=thickness)
        return frame
