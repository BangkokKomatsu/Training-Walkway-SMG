# Admin Backend & Database Documentation

เอกสารในโฟลเดอร์นี้จัดทำขึ้นสำหรับผู้ดูแลระบบ (Admin) และนักพัฒนา Backend เพื่ออธิบายโครงสร้างพื้นฐานของฐานข้อมูล Microsoft SQL Server ที่ขับเคลื่อนระบบ Walkway Safety Monitor

เอกสารเหล่านี้ **ไม่ใช่สื่อการสอนสำหรับผู้เรียน** แต่เป็นคู่มืออ้างอิง (Reference) สำหรับการออกแบบระบบ:

1. **[01 — Database Design](01-database-design.md):** อธิบายโครงสร้าง Schema (`smg`), ความสัมพันธ์ของตาราง (ER Diagram), และแนวคิดแบบ Multi-tenant (`company_code`)
2. **[02 — Stored Procedure Design](02-stored-procedure-design.md):** รวบรวมรายชื่อ พารามิเตอร์ และผลลัพธ์ของ Stored Procedure ทั้งหมดในระบบ
3. **[03 — SQL Runbook](03-sql-runbook.md):** คู่มือสำหรับแอดมินในการติดตั้งฐานข้อมูล การตั้งค่าสิทธิ์ผู้ใช้ และการเคลียร์ข้อมูลตัวอย่างก่อนขึ้น Production
