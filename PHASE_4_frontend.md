# PHASE 4 — Frontend (React + Vite + Tailwind) + Data Layer

> **วิธีใช้:** วาง `00_MASTER_CONTEXT.md` ก่อน แล้วตามด้วยไฟล์นี้
> ต้องทำ **เฟส 2 (SQL/SP)** เสร็จก่อน (frontend อ่านข้อมูลผ่าน SP)

## 🔒 / ⚙️ Decisions ที่ใช้ในเฟสนี้
- 🔒 ไม่ใช้ Power BI — เว็บนี้คือ dashboard + monitoring หลัก
- 🔒 ทุก query แยกด้วย `company_code`
- ⚙️ **Data layer (ยืนยันก่อนเริ่ม):** React ต่อ MSSQL ตรงไม่ได้ → default = **Node/Express บางมาก** ใน `data-api/` หน้าที่เดียวคือ "รับ request → เรียก SP → คืน JSON" (logic อยู่ใน SP). เปลี่ยนเป็น .NET/อื่นได้ถ้าแจ้ง

## สิ่งที่ต้องสร้าง

### A. Data layer `data-api/` (บางมาก)
- endpoint ต่อ 1 SP เช่น `/api/events`, `/api/events/:id`, `/api/dashboard`, `/api/cameras`, `/api/alerts`, `/api/health`
- แต่ละ endpoint แค่ map query param → `EXEC ww.sp_...` → คืน JSON (ไม่มี business logic)
- อ่าน DB config จาก env, parameterized, ใส่ `company_code` ทุก query
- (deploy: ทีม admin จัดการเอง — แค่ทำให้รันได้)

### B. Frontend `frontend/` (React + Vite + Tailwind)

**หน้า:**
1. Login / เลือกบริษัท (อย่างง่าย — *ระบุข้อจำกัด: ไม่มี auth จริง เหมาะ intranet หลัง IIS, เปิดช่องใส่ auth ภายหลัง*)
2. Main Dashboard — event วันนี้/เดือนนี้, alert สำเร็จ/ล้มเหลว, จำนวนกล้อง, online/offline, event ล่าสุด
3. Event Log — ตาราง + filter (วันที่/company/กล้อง/สถานะ) + search
4. Event Detail — รูป, ข้อมูลกล้อง, เวลา, confidence, area, alert status, path
5. Camera Monitor — รายการกล้อง, online/offline, last seen, location, company_code
6. Alert Monitor — Teams/Email สำเร็จไหม + error message
7. System Health — Python service, last run, DB, storage, camera connection

**Components:** `DashboardCard`, `EventTable`, `EventDetailModal`, `CameraStatusCard`, `AlertStatusBadge`, `FilterPanel`, `ImagePreview`, `HealthStatusPanel`

**Services:** `frontend/src/services/` เรียก data-api (base URL อยู่ใน config/env, ไม่ฮาร์ดโค้ด)

### C. Design guideline
Clean / Modern / **Industrial-Safety**, card layout, status badge, recent-activity timeline, image preview, filter bar ใช้ง่าย, responsive (desktop + tablet), ใช้สีไม่เยอะ
**ต้องดูเป็น product จริง ไม่ดูเหมือน AI generate พื้น ๆ** — ใส่ใจ typography, spacing, hierarchy, empty state, loading state, กรณีรูปหาย

## Playground
- `playground/07-frontend-ui/` — ตัวอย่าง component + เรียก data-api + filter event

## ✅ Acceptance checklist
- [ ] `npm run dev` รันได้, ทุกหน้าโหลด data จาก SP ผ่าน data-api
- [ ] filter/search ทำงาน, แยกข้อมูลตาม company_code
- [ ] event detail แสดงรูป + จัดการกรณีรูปหาย
- [ ] responsive desktop/tablet
- [ ] `npm run build` ได้ `dist/` พร้อม deploy IIS
- [ ] base URL / config แยกออกจาก code
- [ ] หน้าตาดู professional ไม่ generic
