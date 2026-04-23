# Developer Guidelines (For AI Implementer)

ยินดีต้อนรับสู่โปรเจกต์ smartlib-amt! เพื่อให้มั่นใจว่างานที่คุณจะเขียนต่อจากนี้มีคุณภาพ ปลอดภัย และเป็นไปตามสถาปัตยกรรมที่วางไว้ โปรดปฏิบัติตามกฎเหล็กเหล่านี้อย่างเคร่งครัด:

## 1. การจัดระเบียบโค้ด (Coding Standards)
- **Modular is King:** ห้ามเขียนโค้ดลงในไฟล์เดียวเด็ดขาด ให้ยึดโครงสร้างตาม `SPA_STRUCTURE_TH.md`
- **Data Logic Separation:** ข้อมูล Schema (คอลัมน์ต่างๆ) ต้องอ้างอิงจากโมดูลใน `apps_script/Module_*.gs` เท่านั้น
- **Clean Code:** ฟังก์ชันแต่ละฟังก์ชันควรมีหน้าที่เดียว (Single Responsibility)

## 2. ความปลอดภัยและการป้องกันข้อมูล (Safety & Security)
- **Never Reuse IDs:** รหัส `bookId` และ `barcode` ต้องห้ามนำกลับมาใช้ใหม่เด็ดขาด
- **Uniqueness Check:** ก่อนทำการ `appendRow` หรือบันทึกข้อมูลสำคัญ ต้องเช็คข้อมูลซ้ำเสมอผ่านฟังก์ชัน `check_exists`
- **Error Handling:** ในฝั่ง GAS ทุกคำสั่งที่คุยกับ Sheet ต้องมี `try-catch` และตอบกลับ Error ที่สื่อสารกับผู้ใช้ได้จริง (เช่น "ISBN ซ้ำ")

## 3. การแสดงผล (UI/UX Guidelines)
- **Modern Academic Theme:** ใช้สีโทน Sky/Blue (Tailwind `sky-500`, `blue-500`) และฟอนต์ `Bai Jamjuree`
- **Responsiveness:** หน้าจอต้องรองรับทั้ง Mobile (Bottom Nav) และ Desktop (Sidebar) ตามที่ออกแบบไว้ใน `PRINT_BARCODE_DESIGN.md` และ `USERS_MANAGEMENT_DESIGN.md`
- **No Transformation:** ห้ามใช้ `transform: scale()` กับบาร์โค้ด เพราะทำให้เบลอ

## 4. ประสิทธิภาพ (Performance)
- **Caching:** ทุกครั้งที่มีการดึงข้อมูล Catalog ต้องเช็ค `CacheService` ก่อนอ่านจาก Sheet เสมอ
- **Cache Invalidation:** ต้องสั่งล้าง Cache เมื่อมีการเพิ่ม/แก้ไข/ลบ ข้อมูล

---
*คำแนะนำถึง Implementer: หากคุณสงสัยเรื่อง Schema หรือ Logic ใดๆ โปรดเปิดดูในโฟลเดอร์ `docs/` ก่อนเริ่มงานทุกครั้ง*
