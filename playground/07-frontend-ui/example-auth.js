/**
 * playground/07-frontend-ui/example-auth.js
 * ตัวอย่าง: การจำลองการ Login เพื่อรับ JWT Token และนำ Token ไปดึงข้อมูลจาก Backend API
 *
 * วิธีรัน:
 * 1. ตรวจสอบให้แน่ใจว่า backend API ทำงานอยู่ (พอร์ต 3001)
 * 2. รันสคริปต์นี้: node playground/07-frontend-ui/example-auth.js
 */

const API_BASE = "http://localhost:3001";

async function runDemo() {
  console.log("=== 1. Login เพื่อรับ JWT Token ===");
  try {
    // Endpoint จริงคือ /api/auth/login (ไม่ใช่ /api/auth) และรับแค่ username/password เท่านั้น
    // company_code ไม่ใช่ field ของ request นี้ — server อ่าน company ของ user จากผลลัพธ์ sp_login เอง
    // (ดู data-api/server.js บรรทัด app.post('/api/auth/login', ...))
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
