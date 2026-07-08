"""
ตรวจสอบว่าจุดอ้างอิงของคน (จุดกึ่งกลางขอบล่างของ bounding box)
อยู่ใน polygon พื้นที่อันตรายหรือไม่ (ใช้ cv2.pointPolygonTest)

รองรับหลาย polygon ต่อกล้อง — ถ้าจุดอยู่ใน polygon ใด polygon หนึ่ง ถือว่าอยู่ในพื้นที่อันตราย
มีฟังก์ชันวาด polygon ลงเฟรม สำหรับเซฟภาพ debug/หลักฐาน event (ห้ามใช้ cv2.imshow)
"""

import cv2
import numpy as np

from src.utils.helpers import get_bbox_reference_point


class AreaChecker:
    """เช็คว่าจุดอ้างอิงของคนอยู่ในพื้นที่อันตราย (polygons) หรือไม่"""

    def __init__(
        self,
        danger_zones: list[list[tuple[int, int]]],
        reference_point: str = "bottom_center",
    ):
        """
        danger_zones: list ของ polygon แต่ละอัน = list ของจุด [(x,y), ...]
        ตัวอย่าง: [[(100,100),(500,100),(500,400),(100,400)], [(200,50),(300,50),(300,150)]]
        reference_point: จุดของ bbox ที่ใช้เช็ค polygon (ต่อกล้อง) — ดู helpers.get_bbox_reference_point
        """
        self.polygons = [np.array(zone, dtype=np.int32) for zone in danger_zones]
        self.reference_point = reference_point

    def point_from_bbox(self, bbox: tuple) -> tuple:
        """คืนจุดอ้างอิงของ bbox ตามโหมดของกล้องนี้"""
        return get_bbox_reference_point(bbox, self.reference_point)

    def is_in_danger_zone(self, point: tuple[float, float]) -> bool:
        """True ถ้าจุดอยู่ใน polygon ใด polygon หนึ่ง"""
        pt = (float(point[0]), float(point[1]))
        for polygon in self.polygons:
            if cv2.pointPolygonTest(polygon, pt, False) >= 0:
                return True
        return False

    def draw_polygons(self, frame, color: tuple[int, int, int] = (0, 0, 255), thickness: int = 2):
        """วาดเส้น polygon พื้นที่อันตรายทุกเส้นลงเฟรม"""
        for polygon in self.polygons:
            cv2.polylines(frame, [polygon], isClosed=True, color=color, thickness=thickness)
        return frame
