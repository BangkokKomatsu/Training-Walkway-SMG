---
lab:
    title: '07 - Frontend UI Authentication (Playground)'
    description: 'เรียนรู้กระบวนการยืนยันตัวตน (Authentication) ด้วยระบบ JWT Token และการใช้ Fetch API'
---

# 07 - Frontend UI Authentication (Playground)

ในระบบ Dashboard ของ Walkway Safety Monitor การดึงข้อมูลที่มีความอ่อนไหวจะต้องผ่านการยืนยันตัวตนก่อนเสมอ โดยเราใช้มาตรฐาน **JWT (JSON Web Token)** ในบทเรียนนี้ คุณจะได้ลองเขียน JavaScript (Node.js) เพื่อจำลองการล็อกอิน และการนำ Token ที่ได้ไปแนบใน Header เพื่อขอข้อมูลจาก Backend API

ระยะเวลาที่ใช้: ประมาณ **15** นาที

## Prerequisites
- ต้องรัน Data API Backend ทิ้งไว้ก่อน (เช่น `node data-api/server.js` หรือรันผ่านคำสั่ง `npm run dev`)
- ติดตั้ง Node.js ในเครื่องเรียบร้อยแล้ว

---

## 1. การล็อกอินเพื่อขอ JWT Token

เราจะใช้ฟังก์ชัน `fetch` ซึ่งเป็นมาตรฐานของ Web API สมัยใหม่ (และ Node.js ยุคใหม่) เพื่อยิงข้อมูลแบบ POST ไปที่ Endpoint ของการล็อกอิน

```javascript
const API_BASE = "http://localhost:3001";

async function runDemo() {
  console.log("=== 1. Login เพื่อรับ JWT Token ===");
  try {
    // Endpoint จริงคือ /api/auth/login (ไม่ใช่ /api/auth) และรับแค่ username/password เท่านั้น
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'demo_admin',
        password: 'Walkway@2024', // รหัสผ่านทดสอบ (บัญชี sample จาก CLAUDE.md)
      })
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.json();
      console.error("❌ Login ล้มเหลว:", error.message || error.error);
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.token;
    console.log("✅ Login สำเร็จ!");
    console.log("📦 ได้รับ Token:", token.substring(0, 30) + "...");
```

**คำอธิบายโค้ด (Line-by-Line):**
- `async function runDemo()`: เราครอบโค้ดด้วยฟังก์ชัน `async` เพื่อให้สามารถใช้คำสั่ง `await` สำหรับรอผลลัพธ์จากการเชื่อมต่อ Network ได้
- `fetch(`${API_BASE}/api/auth/login`, { method: 'POST', ... })`: เรียก endpoint login ที่แท้จริงของระบบ (`POST /api/auth/login` ใน `data-api/server.js`) ระบุเมธอดเป็น POST เพื่อส่งข้อมูล
- `headers: { 'Content-Type': 'application/json' }`: เป็นการบอก Server ว่าข้อมูลที่เรากำลังส่งไปเป็นก้อน JSON
- `body: JSON.stringify({ username, password })`: request body ของ endpoint นี้รับแค่ `username`/`password` เท่านั้น — **ไม่มี** field `company_code` เพราะ server หาบริษัทของ user จากผลลัพธ์ `smg.sp_login` เอง (ถ้าส่ง `company_code` ไปด้วย server จะเพิกเฉยไม่สนใจค่านั้นเลย)
- `if (!loginResponse.ok)`: ตรวจสอบสถานะการตอบกลับ หากไม่ใช่ 2xx (เช่น รหัสผ่านผิด หรือ Server พัง) มันจะเข้ามาในบล็อกนี้
- `loginResponse.json()`: แกะข้อมูล JSON ที่ Server ตอบกลับมากลับเป็นออบเจกต์ของ JavaScript อีกครั้ง
- `token = loginData.token`: ดึงค่า Token ยอมรับสิทธิ์ออกมาเก็บไว้เพื่อใช้งานในคำสั่งถัดไป

---

## 2. การใช้ Token ดึงข้อมูลหลังบ้าน (Protected Route)

หลังจากได้ Token มาแล้ว ทุกครั้งที่เราต้องการขอดูข้อมูลจาก Backend (เช่น หน้าแดชบอร์ด) เราต้องแนบ Token ไปด้วยเสมอผ่านกลไก `Authorization: Bearer`

```javascript
    console.log("\n=== 2. ใช้ Token ดึงข้อมูล Dashboard ===");
    // company scoping ไม่ได้ส่งเป็น query param (?company_code=...) — server อ่าน company_code
    // ของ user ธรรมดาจาก JWT โดยอัตโนมัติ ไม่ต้องส่งอะไรเพิ่ม
    // ถ้า login ด้วยบัญชี Super Admin (company_code=BKC, is_super_admin=1) ถึงจะส่ง header
    // 'x-company': 'DEMO' เพิ่มเพื่อขอดูข้อมูลของบริษัทอื่นแทน
    const dashboardResponse = await fetch(`${API_BASE}/api/dashboard`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}` // แนบ Token ใน Header
      }
    });

    if (!dashboardResponse.ok) {
      console.error("❌ ไม่สามารถดึงข้อมูล Dashboard ได้ (อาจเกิดจาก Token ผิด/หมดอายุ)");
      return;
    }

    const dashboardData = await dashboardResponse.json();
    console.log("✅ ข้อมูล Dashboard:");
    console.log(`- Event วันนี้: ${dashboardData.events_today || 0}`);
    console.log(`- Event เดือนนี้: ${dashboardData.events_month || 0}`);
    console.log(`- กล้องออนไลน์: ${dashboardData.cameras_online || 0} / ${dashboardData.cameras_total || 0}`);
    console.log(`- Event ทั้งหมด: ${dashboardData.total_events || 0}`);

  } catch (err) {
    console.error("❌ ไม่สามารถเชื่อมต่อ Backend API ได้", err.message);
    console.error("กรุณาตรวจสอบว่า `node data-api/server.js` รันอยู่หรือไม่");
  }
}

runDemo();
```

**คำอธิบายโค้ด (Line-by-Line):**
- `fetch(`${API_BASE}/api/dashboard`, { method: 'GET' })`: ดึงข้อมูลจาก API ปลายทางด้วยเมธอด GET — **ไม่มี** query param `?company_code=...` เพราะ endpoint นี้ไม่รับ company scoping ผ่าน query string เลย
- `'Authorization': 'Bearer ' + token`: นี่คือหัวใจสำคัญของการยืนยันตัวตนแบบ JWT เราต้องส่ง Token ไปใน HTTP Header ทุกครั้ง หากลืมส่ง Backend จะปฏิเสธคำขอทันที
- company scoping ที่แท้จริง: middleware `requireAuth` ใน `data-api/server.js` จะตั้งค่า `req.companyCode` ให้อัตโนมัติจาก `company_code` ใน JWT ของ user ธรรมดา — เฉพาะ **Super Admin** เท่านั้น (`is_super_admin: true`, `company_code: 'BKC'`) ถึงจะสามารถส่ง header เพิ่ม เช่น `headers: { 'x-company': 'DEMO' }` เพื่อขอดูข้อมูลของบริษัทอื่นแทนบริษัทตัวเอง
- `dashboardResponse.json()`: แกะแพ็กเกจข้อมูลแดชบอร์ดออกมา
- `dashboardData.events_today || 0`: ชื่อ field จริงจาก `GET /api/dashboard` คือ `events_today` (ไม่ใช่ `today_events`) — เป็นการป้องกันค่า `undefined` หรือ `null` หาก Backend ไม่ได้ส่งตัวเลขกลับมา ก็จะแสดงผลเป็น 0 แทน
- `catch (err) { ... }`: บล็อกนี้จะทำงานหากโปรแกรมเราติดต่อ Server ไม่ได้เลย (เช่น ลืมเปิดรัน Server หรือเน็ตหลุด) ซึ่งต่างจาก `if (!ok)` ที่ติดต่อได้แต่ผลลัพธ์เป็น Error

---

## การรันทดสอบ

1. ตรวจสอบให้แน่ใจว่าคุณเปิด Data API ทิ้งไว้แล้ว (พอร์ต 3001)
2. เปิด Terminal **แท็บใหม่** แล้วพิมพ์คำสั่ง:
```bash
node playground/07-frontend-ui/example-auth.js
```
3. ผลลัพธ์ที่คาดหวังใน Console:
```text
=== 1. Login เพื่อรับ JWT Token ===
✅ Login สำเร็จ!
📦 ได้รับ Token: eyJhbGciOiJIUzI1NiIsInR5cCI6Ik...

=== 2. ใช้ Token ดึงข้อมูล Dashboard ===
✅ ข้อมูล Dashboard:
- Event วันนี้: 0
- กล้องออนไลน์: 1 / 1
- Event ทั้งหมด: 35
```
