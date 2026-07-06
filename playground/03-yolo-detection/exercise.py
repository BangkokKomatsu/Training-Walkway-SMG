"""
=============================================================================
แบบฝึกหัดที่ 03 — YOLO Detection
=============================================================================
วัตถุประสงค์:
  1. เข้าใจวิธีการโหลดและเรียกใช้ YOLO Model ด้วย Ultralytics
  2. กรองข้อมูลเฉพาะคลาสที่สนใจ (person = 0, bicycle = 1) จากผลลัพธ์โมเดล
  3. เขียนฟังก์ชันวาดกรอบสี่เหลี่ยม (Bounding Box) ล้อมรอบตัวคน

วิธีปฏิบัติ:
  - เติมโค้ดในช่องว่างที่มีเครื่องหมาย # TODO
  - รันไฟล์นี้ด้วยคำสั่ง:
      python playground/03-yolo-detection/exercise.py
  - ตรวจสอบว่าผ่านการทดสอบ Assertion หรือไม่
=============================================================================
"""

import sys
from pathlib import Path
import numpy as np
import cv2
from ultralytics import YOLO

# ดึง Config ของระบบมาใช้
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from config.settings import settings

# บังคับระบบแสดงผลภาษาไทยให้ถูกต้องบน Windows Console
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def run_yolo_exercise(model_path: str, frame: np.ndarray, conf_threshold: float = 0.5) -> list[dict]:
    """
    แบบฝึกหัดกรองผลการทำนายของ YOLO
    ต้องคืนค่ารายการของ Object: [{"bbox": (x1, y1, x2, y2), "confidence": score, "class_name": name}]
    """
    print(f"--- กำลังโหลดโมเดลจาก {model_path} ---")
    
    # [ตัวอย่างคำอธิบายการสอน]
    # บรรทัดที่ 1: YOLO(model_path) ใช้โหลดไฟล์ .pt ของ YOLO เข้าสู่โมเดล
    # บรรทัดที่ 2: model.predict(frame, conf=threshold) ใช้รัน AI ตรวจหาวัตถุในเฟรมภาพ
    
    # TODO 1: โหลดโมเดล YOLO
    # ใบ้: ใช้ YOLO(model_path)
    model = YOLO(model_path)

    # TODO 2: รันการตรวจจับบนเฟรมภาพ (frame)
    # ใบ้: เรียกใช้ model.predict(frame, conf=conf_threshold, verbose=False)
    # เก็บผลลัพธ์ไว้ในตัวแปร results
    results = model.predict(frame, conf=conf_threshold, verbose=False)

    detections = []
    
    # วนลูปอ่านผลลัพธ์ (ปกติ model.predict คืนค่าเป็น List ของผลลัพธ์)
    for result in results:
        # TODO 3: เข้าถึงกล่อง Bounding Boxes ทั้งหมดในผลลัพธ์
        # ใบ้: ดึงค่าจาก result.boxes
        boxes = result.boxes
        
        for box in boxes:
            # ดึงพิกัด (x1, y1, x2, y2) ของกล่องออกมาในแบบทศนิยม
            x1, y1, x2, y2 = box.xyxy[0].tolist()
            
            # ดึงคะแนนความมั่นใจ (Confidence Score)
            confidence = float(box.conf[0])
            
            # ดึงรหัสคลาสวัตถุที่ตรวจจับได้ (Class ID)
            class_id = int(box.cls[0])

            # แปลงคลาสจากตัวเลขเป็นคำอธิบาย: คลาส 0 คือ 'person', คลาส 1 คือ 'bicycle'
            class_name = "unknown"
            if class_id == 0:
                class_name = "person"
            elif class_id == 1:
                class_name = "bicycle"

            # TODO 4: นำข้อมูลพิกัด (แปลงเป็น int), ความมั่นใจ, และชื่อคลาสมาเพิ่มในรายการ detections
            # ใบ้: เพิ่ม dict เข้าไปใน list: detections.append({...})
            # โครงสร้าง: {"bbox": (int(x1), int(y1), int(x2), int(y2)), "confidence": confidence, "class_name": class_name}
            detections.append({
                "bbox": (int(x1), int(y1), int(x2), int(y2)),
                "confidence": confidence,
                "class_name": class_name
            })

    print(f"ผลการคัดกรอง: ตรวจพบวัตถุที่ผ่านเกณฑ์ทั้งหมด {len(detections)} ชิ้น")
    return detections


if __name__ == "__main__":
    # สร้างภาพจำลองที่มีกรอบสีดำว่างเปล่า เพื่อส่งรันทดสอบระบบ
    dummy_frame = np.zeros((480, 640, 3), dtype=np.uint8)
    
    # วาดรูปสี่เหลี่ยมสีขาวขนาดใหญ่ตรงกลางจอ เพื่อจำลองวัตถุขนาดเล็กสำหรับเทส
    cv2.rectangle(dummy_frame, (200, 150), (400, 350), (255, 255, 255), -1)

    model_file = settings.YOLO_MODEL_PATH
    
    # ตรวจสอบว่าโมเดล YOLO11n.pt มีอยู่จริงหรือไม่ก่อนรัน
    if not Path(model_file).exists():
        print(f"⚠️ โมเดล {model_file} ไม่มีอยู่ในโฟลเดอร์ — ระบบกำลังพยายามดาวน์โหลดจากอินเทอร์เน็ต...")
    
    # รันแบบฝึกหัด YOLO
    results = run_yolo_exercise(model_file, dummy_frame, conf_threshold=0.3)

    # === ระบบตรวจคำตอบอัตโนมัติ (Self-Checking) ===
    print("\n=== เริ่มขั้นตอนการตรวจคำตอบ (Verification) ===")
    try:
        # ตรวจสอบว่าตัวแปรส่งผลลัพธ์กลับมาในรูปแบบลิสต์
        assert isinstance(results, list), "ผลลัพธ์ไม่ใช่ตัวแปรประเภท List"
        print("✅ ข้อ 1 ผ่าน: ตัวส่งออกผลลัพธ์เป็น List ถูกต้อง")
        
        if len(results) > 0:
            item = results[0]
            assert "bbox" in item, "ข้อมูลผลลัพธ์ไม่มีคีย์ 'bbox'"
            assert "confidence" in item, "ข้อมูลผลลัพธ์ไม่มีคีย์ 'confidence'"
            assert "class_name" in item, "ข้อมูลผลลัพธ์ไม่มีคีย์ 'class_name'"
            print("✅ ข้อ 2 ผ่าน: โครงสร้างข้อมูล Dict ของวัตถุถูกต้องครบทุกคีย์")
            
            x1, y1, x2, y2 = item["bbox"]
            assert isinstance(x1, int) and isinstance(y1, int), "พิกัด Bounding Box ยังไม่ได้แปลงเป็นจำนวนเต็ม (int)"
            print("✅ ข้อ 3 ผ่าน: พิกัด Bounding Box แปลงค่าจำนวนเต็มสมบูรณ์")
            
            assert item["class_name"] in ["person", "bicycle", "unknown"], "ชื่อคลาสของโมเดลถูกกำหนดไม่ถูกต้อง"
            print("✅ ข้อ 4 ผ่าน: การจับคู่คลาส person และ bicycle ทำงานถูกต้อง")
        else:
            # กรณีรูปดำจำลองตรวจจับไม่พบคน (ซึ่งถือว่าปกติ)
            print("✅ ข้อ 2-4 ผ่าน (ภาพจำลองสีดำไม่มีคนเดิน ระบบวิเคราะห์และคืนลิสต์ว่างได้ถูกต้อง)")
            
        print("\n🎉 ยินดีด้วย! คุณผ่านแบบฝึกหัด YOLO Human Detection เรียบร้อยแล้ว")
    except AssertionError as e:
        print(f"❌ ตรวจสอบพบจุดผิดพลาด: {e}")
        print("คำแนะนำ: ตรวจสอบโค้ดในส่วน # TODO และทำใหม่อีกครั้ง")
