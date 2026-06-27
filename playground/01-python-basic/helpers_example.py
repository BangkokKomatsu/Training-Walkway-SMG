"""โมดูลตัวอย่างสำหรับสาธิตการ import ข้ามไฟล์ (ใช้โดย example.py ในโฟลเดอร์เดียวกัน)"""


def greet(name: str) -> str:
    return f"สวัสดี, {name}!"


class Counter:
    """ตัวอย่างคลาสง่าย ๆ - นับจำนวนครั้งที่เรียก increment()"""

    def __init__(self):
        self.count = 0

    def increment(self) -> int:
        self.count += 1
        return self.count
