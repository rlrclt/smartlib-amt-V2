# Project Init Summary: SmartLib-AMT

อัปเดตล่าสุด: 2026-04-26

เอกสารสรุปภาพรวมโปรเจกต์แบบอ่านเร็ว สำหรับใช้เป็นจุดเริ่มต้นของคนใหม่หรือ AI ที่เข้ามาต่องาน

## 1. ภาพรวม
- โปรเจกต์นี้เป็นระบบห้องสมุดแบบ SPA สำหรับเว็บ
- Frontend โฮสต์บน Firebase Hosting
- Backend ใช้ Google Apps Script เป็น API แบบ JSONP
- ข้อมูลหลักเก็บใน Google Sheets

## 2. เทคโนโลยีหลัก
- Frontend: Vanilla JS modules + Tailwind CDN
- Routing: SPA client-side router
- Backend: Google Apps Script
- Database: Google Sheets
- Hosting: Firebase Hosting

## 3. โครงสร้างระบบ
### 3.1 ฝั่ง Frontend
- อยู่ใน `public/app/`
- แบ่งเป็น `routes/`, `layouts/`, `views/`, `components/`, `data/`, `utils/`
- ใช้ shell แยกสำหรับ `manage` และ `member`

### 3.2 ฝั่ง Backend
- อยู่ใน `apps_script/`
- มี `Code.gs` เป็น gateway/router
- มีโมดูลแยกตามโดเมนงาน เช่น users, books, loans, fines, settings, notifications

### 3.3 ฝั่งข้อมูล
- ใช้ Google Sheets หลายตาราง
- ตารางหลักที่ใช้งานตอนนี้: `users`, `announcements`, `books_catalog`, `books_catalog_archive`, `book_items`, `loans`, `fines`, `reservations`, `settings_locations`, `settings_policies`

## 4. Route หลัก
### 4.1 Public / Auth
- `/`
- `/signin`, `/login`
- `/signup`
- `/announcements`
- `/about`
- `/privacy`
- `/logout`

### 4.2 Manage
- `/manage`
- `/manage/announcements`
- `/manage/books`
- `/manage/register_books`
- `/manage/add_book_items`
- `/manage/view_book_items`
- `/manage/books/select-print`
- `/manage/print-barcodes`
- `/manage/users`
- `/manage/loans`
- `/manage/fines`
- `/manage/settings`

### 4.3 Member
- `/app`
- `/app/books`
- `/app/loans`
- `/app/fines`
- `/app/loan-self`
- `/app/reservations`
- `/app/profile`

## 5. สิ่งที่ระบบทำได้
- สมัครสมาชิกและเข้าสู่ระบบ
- จัดการหนังสือและรหัสเล่ม
- ยืม-คืนแบบ staff-assisted
- ยืม-คืนแบบ self-service พร้อม geofencing
- ดูรายการยืมและค่าปรับของสมาชิก
- จัดการค่าปรับจากฝั่งเจ้าหน้าที่
- แจ้งเตือนภายในระบบ
- แก้ไขโปรไฟล์สมาชิก

## 6. การทำงานของ backend
- ใช้ JSONP ผ่าน Apps Script Web App
- route ถูก dispatch จาก `Code.gs`
- มี validation ตาม groupType/role
- แยกสิทธิ์ `member` กับ `manage` ชัดเจน

## 7. คำสั่งที่ใช้บ่อย
- ติดตั้ง dependency: `npm install`
- รัน local server: `npx serve public -l 5000`
- push GAS: `clasp push`
- build frontend: `npm run build`
- deploy hosting: `firebase deploy --only hosting`

## 8. หมายเหตุสำคัญ
- ห้าม re-scaffold frontend หรือรัน `firebase init` ซ้ำ
- การ deploy GAS ควรทำแบบ manual และตรวจสอบก่อนทุกครั้ง
- ถ้าจะแก้ route หรือ schema ให้ดู `AI_INDEX.md` คู่กับ docs design ที่เกี่ยวข้อง

## 9. เอกสารอ้างอิง
- `AI_INDEX.md`
- `docs/DEVELOPER_GUIDELINES.md`
- `docs/RESPONSIVE_2026.md`
- `docs/LOAN_SYSTEM_DESIGN.md`
- `docs/FINES_SYSTEM_DESIGN.md`
- `docs/USERS_MANAGEMENT_DESIGN.md`
- `docs/PROFILE_NOTIFICATION_PLAN.md`
