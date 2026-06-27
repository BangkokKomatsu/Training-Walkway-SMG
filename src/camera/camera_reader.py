"""
อ่านวิดีโอจากกล้อง CCTV ผ่าน RTSP (หรือไฟล์วิดีโอสำหรับทดสอบ) ด้วย OpenCV

หลักการ:
- เปิด stream ด้วย cv2.VideoCapture, ตั้ง CAP_PROP_BUFFERSIZE=1 (ลด latency/หน่วยความจำค้าง)
- อ่านเฟรมใน thread แยกต่างหาก ไม่บล็อก thread หลักที่ประมวลผล YOLO
- เก็บ "เฟรมล่าสุด" ไว้ตัวเดียว ให้ thread ประมวลผลดึงไปใช้ (latest-frame pattern)
- ถ้าอ่านเฟรมไม่ได้ (กล้องหลุด/วิดีโอจบ) -> reconnect อัตโนมัติ (retry + backoff)

ห้ามใช้ cv2.imshow() - ดูผลผ่าน log/บันทึกไฟล์ภาพแทน
"""

import logging
import threading
import time

import cv2

logger = logging.getLogger(__name__)


class CameraReader:
    """เปิด stream วิดีโอและอ่านเฟรมล่าสุดให้ผู้ใช้ดึงไปประมวลผล"""

    def __init__(self, source: str, reconnect_delay: float = 2.0, max_reconnect_delay: float = 30.0):
        self.source = source
        self.reconnect_delay = reconnect_delay
        self.max_reconnect_delay = max_reconnect_delay

        self._cap: cv2.VideoCapture | None = None
        self._latest_frame = None
        self._lock = threading.Lock()
        self._running = False
        self._thread: threading.Thread | None = None

    def start(self) -> "CameraReader":
        """เริ่ม thread อ่านกล้องเบื้องหลัง"""
        self._running = True
        self._thread = threading.Thread(target=self._read_loop, daemon=True)
        self._thread.start()
        return self

    def stop(self) -> None:
        """หยุด thread อ่านกล้องและปิด stream"""
        self._running = False
        if self._thread is not None:
            self._thread.join(timeout=2)
        if self._cap is not None:
            self._cap.release()
            self._cap = None

    def get_latest_frame(self):
        """คืนเฟรมล่าสุด (copy) หรือ None ถ้ายังไม่มีเฟรม"""
        with self._lock:
            if self._latest_frame is None:
                return None
            return self._latest_frame.copy()

    def _open_capture(self) -> cv2.VideoCapture:
        # รองรับกรณีตั้ง source เป็นเลข webcam index ผ่าน .env (ค่าจาก .env เป็น string เสมอ)
        source = int(self.source) if isinstance(self.source, str) and self.source.isdigit() else self.source
        cap = cv2.VideoCapture(source)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        return cap

    def _read_loop(self) -> None:
        delay = self.reconnect_delay

        while self._running:
            if self._cap is None or not self._cap.isOpened():
                logger.info("กำลังเชื่อมต่อกล้อง: %s", self.source)
                self._cap = self._open_capture()

                if not self._cap.isOpened():
                    logger.warning(
                        "เชื่อมต่อกล้องไม่สำเร็จ จะลองใหม่ใน %.1f วินาที", delay
                    )
                    self._cap.release()
                    self._cap = None
                    time.sleep(delay)
                    delay = min(delay * 2, self.max_reconnect_delay)
                    continue

                logger.info("เชื่อมต่อกล้องสำเร็จ: %s", self.source)
                delay = self.reconnect_delay

            ret, frame = self._cap.read()

            if not ret:
                logger.warning("อ่านเฟรมไม่สำเร็จ (กล้องหลุด/วิดีโอจบ) - กำลังเชื่อมต่อใหม่")
                self._cap.release()
                self._cap = None
                time.sleep(delay)
                continue

            with self._lock:
                self._latest_frame = frame
