# data-api

ตัวกลางบาง (Node/Express) — หน้าที่เดียวคือ "รับ request → เรียก Stored Procedure → คืน JSON"
ไม่มี business logic ที่นี่ (logic ทั้งหมดอยู่ใน SQL Stored Procedure ดู `sql/`)

จะถูกเติม endpoint จริงในเฟส 4 (`/api/events`, `/api/dashboard`, `/api/cameras`, `/api/alerts`, `/api/health`)
