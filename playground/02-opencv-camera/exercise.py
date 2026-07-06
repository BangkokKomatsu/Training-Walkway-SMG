"""
=============================================================================
แบบฝึกหัดที่ 02 — OpenCV Camera
=============================================================================
วัตถุประสงค์: 
  1. เข้าใจหลักการเขียนโค้ดเปิดกล้อง/ไฟล์วิดีโอด้วย cv2.VideoCapture
  2. คำนวณความเร็วเฟรมต่อวินาที (FPS) ได้จริงทีละบรรทัด
  3. ฝึกจัดการกรณีที่อ่านเฟรมภาพไม่สำเร็จ (Error/End of stream)

วิธีปฏิบัติ:
  - เติมโค้ดลงในช่องว่างที่มีเครื่องหมาย # TODO
  - รันไฟล์นี้ด้วยคำสั่ง:
      python playground/02-opencv-camera/exercise.py
  - ตรวจสอบว่าผ่านการทดสอบ Assertion หรือไม่
=============================================================================
"""

import sys
import time
from pathlib import Path
import cv2

# นำเข้าเครื่องมือจากโปรเจกต์หลัก
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from src.camera.camera_config import load_camera_configs

# บังคับระบบแสดงผลภาษาไทยให้ถูกต้องบน Windows Console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def run_camera_exercise(video_source: str, max_frames: int = 20) -> list:
    """
    แบบฝึกหัดอ่านภาพและคำนวณ FPS
    คืนค่ารายการของ tuple: (เฟรมที่อ่านได้, เวลาประมวลผลของเฟรมนั้น)
    """
    print(f"--- เริ่มทำแบบฝึกหัด: อ่านกล้องจาก {video_source} ---")
    
    # [ตัวอย่างคำอธิบายการสอน]
    # บรรทัดที่ 1: cv2.VideoCapture(source) ใช้สร้างออบเจกต์เชื่อมต่อไปยังกล้อง RTSP หรือไฟล์วิดีโอ
    # บรรทัดที่ 2: cap.set(cv2.CAP_PROP_BUFFERSIZE, 1) ตั้งให้มี buffer ค้างแค่ 1 รูป ป้องกันภาพหน่วง
    
    # TODO 1: สร้าง VideoCapture เชื่อมต่อไปยังแหล่งวิดีโอ (video_source)
    # ใบ้: ใช้ cv2.VideoCapture(video_source)
    cap = cv2.VideoCapture(video_source)
    
    # TODO 2: ตั้งค่า BUFFERSIZE ให้เป็น 1 เพื่อป้องกันภาพหน่วง
    # ใบ้: ใช้ cap.set(cv2.CAP_PROP_BUFFERSIZE, ค่าที่ต้องการ)
    if cap is not None:
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    # ตรวจสอบว่าเปิดแหล่งวิดีโอสำเร็จหรือไม่
    if cap is None or not cap.isOpened():
        print("❌ ข้อผิดพลาด: ไม่สามารถเปิดแหล่งวิดีโอได้")
        return []

    processed_data = []
    frame_idx = 0

    try:
        while frame_idx < max_frames:
            # เริ่มจับเวลาก่อนอ่านและประมวลผลเฟรมนี้
            t_start = time.perf_counter()

            # TODO 3: อ่านเฟรมภาพจากกล้อง
            # ใบ้: cap.read() จะคืนค่า tuple สองตัว คือ (สถานะการอ่านสำเร็จหรือไม่, ภาพที่อ่านได้)
            # ตัวแปร ok เก็บสถานะ (bool), ตัวแปร frame เก็บรูปภาพ (numpy array)
            ok, frame = cap.read()

            # ตรวจสอบว่าอ่านเฟรมภาพสำเร็จหรือไม่
            if not ok or frame is None:
                print(f"⚠️ ไม่สามารถอ่านเฟรมที่ {frame_idx + 1} ได้ (วิดีโออาจจบหรือกล้องหลุด)")
                break

            # จำลองภาระการทำงานประมวลผลเฟรมภาพ (เช่น รัน AI สั้น ๆ)
            time.sleep(0.02)  # สมมติประมวลผล 20ms

            # จบเวลาหลังจากประมวลผลเสร็จ
            t_end = time.perf_counter()
            duration = t_end - t_start
            
            frame_idx += 1
            processed_data.append((frame, duration))

            # คำนวณความเร็ว FPS ปัจจุบันของเฟรมนี้
            # FPS = 1 / วินาทีที่ใช้
            fps_current = 1.0 / duration
            print(f"เฟรมที่ {frame_idx:02d}: ขนาดภาพ={frame.shape} | เวลาที่ใช้={duration*1000:.1f} ms | FPS={fps_current:.1f}")

    finally:
        # TODO 4: ปล่อยสิทธิ์การใช้งานกล้อง เพื่อให้โปรแกรมอื่นเรียกใช้ต่อได้
        # ใบ้: เรียกใช้เมธอด release() ของตัวแปร cap
        if cap is not None:
            cap.release()
        print("🔒 ปล่อยสิทธิ์การใช้งานกล้องเรียบร้อย")

    return processed_data


if __name__ == "__main__":
    # ตรวจสอบค่ากล้องจากระบบหรือวิดีโอจำลอง
    cameras = load_camera_configs()
    source = cameras[0].source if cameras else "0"
    
    # รันแบบฝึกหัดเพื่อทดสอบผลลัพธ์
    results = run_camera_exercise(source, max_frames=5)
    
    # === ระบบตรวจคำตอบอัตโนมัติ (Self-Checking) ===
    print("\n=== เริ่มขั้นตอนการตรวจคำตอบ (Verification) ===")
    
    try:
        assert len(results) > 0, "ทำแบบฝึกหัดไม่สำเร็จ: รายการผลลัพธ์ว่างเปล่า (อาจเปิดกล้องหรือไฟล์วิดีโอไม่ได้)"
        print("✅ ข้อ 1 & 2 ผ่าน: สามารถเชื่อมต่อกล้องและเปิดวิดีโออ่านเฟรมได้สำเร็จ")
        
        first_frame, first_duration = results[0]
        assert first_frame is not None, "เฟรมแรกเป็นค่าว่าง (None)"
        assert hasattr(first_frame, "shape"), "เฟรมไม่ใช่ numpy array (ไม่มี attribute shape)"
        print(f"✅ ข้อ 3 ผ่าน: เฟรมภาพถูกต้อง ขนาดเฟรม {first_frame.shape}")
        
        assert first_duration > 0.0, "เวลาที่ใช้น้อยกว่าหรือเท่ากับศูนย์วินาที"
        print("✅ ข้อ 4 ผ่าน: การคำนวณระยะเวลา (Duration) และคำนวณ FPS ทำงานถูกต้อง")
        
        print("\n🎉 ยินดีด้วย! คุณผ่านแบบฝึกหัด OpenCV Camera เรียบร้อยแล้ว")
    except AssertionError as e:
        print(f"❌ ตรวจสอบพบจุดผิดพลาด: {e}")
        print("คำแนะนำ: ตรวจสอบโค้ดในส่วน # TODO และทำใหม่อีกครั้ง")
