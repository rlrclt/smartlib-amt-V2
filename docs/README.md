# Documentation Index (smartlib-amt)

ยินดีต้อนรับสู่ส่วนเอกสารประกอบระบบ smartlib-amt รายการด้านล่างนี้คือดัชนีสำหรับอ้างอิงในการพัฒนาและการจัดการระบบ:

---

## 🏗️ สถาปัตยกรรม (Architecture)
* [SPA Structure (Thai)](SPA_STRUCTURE_TH.md): โครงสร้างไฮบริดระหว่าง Firebase Hosting และ Google Apps Script

## 📝 ฐานข้อมูลและ Schema (Data Schemas)
* [Users Schema](SCHEMA_USERS.md): โครงสร้างข้อมูลสมาชิก กฎ Validation และการจัดการ Role
* [Books Schema](SCHEMA_BOOKS.md): โครงสร้างข้อมูลหนังสือ (Catalog & Items) และความสัมพันธ์แบบ Master-Detail

## 🛠️ การออกแบบฟีเจอร์ (Feature Designs)
* [Signup Design](SIGNUP_DESIGN.md): ขั้นตอนการสมัครสมาชิกและการยืนยันตัวตน (Email Verification)
* [Books Management](BOOKS_MANAGEMENT_DESIGN.md): แผนผังระบบจัดการหนังสือ, การรับเข้า, และการยืม-คืน
* [Barcode Printing](PRINT_BARCODE_DESIGN.md): มาตรฐานการพิมพ์บาร์โค้ดสำหรับสติ๊กเกอร์ติดหนังสือ

## 🔐 ระบบความปลอดภัย (Security & Auth)
* [Session Management](SESSION_MANAGEMENT.md): แผนผังระบบจัดการเซสชันแบบ 1 บัญชี 1 อุปกรณ์
* [Auth Standards](AUTH_GAS.md): มาตรฐานความปลอดภัยและการออกแบบระบบ Auth บน GAS

## 🚀 ประสิทธิภาพ (Performance)
* [Performance Guide](PERFORMANCE_GUIDE.md): เทคนิคการเพิ่มความเร็วด้วย CacheService และการแยก Archive Sheet

---
*หากคุณกำลังมองหาภาพรวมทั้งหมดของโปรเจกต์ โปรดดูที่ [AI_INDEX.md](../AI_INDEX.md)*
