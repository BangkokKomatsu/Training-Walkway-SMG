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
    const loginResponse = await fetch(`${API_BASE}/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'password', // รหัสผ่านทดสอบ
        company_code: 'DEMO'
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
    const dashboardResponse = await fetch(`${API_BASE}/api/dashboard?company_code=DEMO`, {
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
    console.log(`- Event วันนี้: ${dashboardData.today_events || 0}`);
    console.log(`- กล้องออนไลน์: ${dashboardData.cameras_online || 0} / ${dashboardData.cameras_total || 0}`);
    console.log(`- Event ทั้งหมด: ${dashboardData.total_events || 0}`);

  } catch (err) {
    console.error("❌ ไม่สามารถเชื่อมต่อ Backend API ได้", err.message);
    console.error("กรุณาตรวจสอบว่า `node data-api/server.js` รันอยู่หรือไม่");
  }
}

runDemo();
