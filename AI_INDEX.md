# smartlib-amt Index (for AI + humans)

## Where
- WSL path: `/mnt/c/smartlib-amt`
- Windows Git-Bash path: `C:\smartlib-amt`

## What Exists Now
- **Frontend**: Static SPA ใน `public/` (ใช้ Vanilla JS + Router แบบ Modular ใน `public/app/`)
- **Firebase Hosting**: เสิร์ฟจากโฟลเดอร์ `public/` (rewrites ไปที่ `index.html`)
- **Apps Script (Backend)**: ระบบ Modular แยกไฟล์ `Config`, `Setup`, `Modules`, `Utils`, `Email`
- **Database**: Google Sheets (ชีต `users`, `announcements`, `books_catalog`, `book_items`, `books_catalog_archive`, `sessions`, และ `db`)

## Key IDs
- **Google Apps Script `scriptId`**: `13IPNEQidzlM9Hwe82SnZ8lrxNZlL9T8bgWacS6LkXRGAkDv90KuLFAhn`
- **Google Apps Script Web App URL**: `https://script.google.com/macros/s/AKfycbyELEgEdWlz0jgWLmAL4qIMGUAJWllD2mRgHLmowTK2lAwpHRFCwaCaM3c1E22iGgOu/exec`
- **Google Sheet (DB)**: `1uaIdRHGge04aFx_OxZJToDfZIaZQYrbAYvTE7U5302A`
- **Firebase project**: `smartlib-amt-v2`

## File Map

### 🌐 Frontend (Modular SPA)
- `public/index.html`: Shell HTML (Navbar + Outlet)
- `public/app/`: โฟลเดอร์หลักของโค้ด SPA
  - `app.js`: Entry point
  - `router.js`: การจัดการ Route และ Navigation
  - `bootstrap.js`: เริ่มต้นการทำงานของระบบ
  - `views/`: หน้าจอต่างๆ
    - `manage/`: หน้าจอสำหรับเจ้าหน้าที่ (Dashboard, Announcements, Books)
  - `data/`: การจัดการข้อมูล (JSONP API)
  - `utils/`, `layouts/`, `components/`: ส่วนเสริม UI/Logic

### 🧠 Apps Script (Modular Backend)
- `apps_script/`:
  - `Config.gs`: ตั้งค่า Spreadsheet ID และ Global Config
  - `Setup.gs`: ฟังก์ชัน `setupDatabase()` สำหรับเตรียมตารางและตกแต่ง
  - `Module_Users.gs`: Schema และ Logic ของฟีเจอร์สมาชิก
  - `Module_Announcements.gs`: Schema และ Logic ของระบบประกาศ
  - `Module_Books.gs`: Schema และ Logic ของระบบหนังสือ (Catalog & Items)
  - `Utils.gs`: ฟังก์ชัน Hashing (SHA-256), Token, Random Password
  - `Email.gs`: การส่งอีเมลยืนยันตัวตน (Verification) และแจ้งรหัสผ่าน
  - `Code.gs`: API Router (`doGet`) รับส่ง JSONP

### 📄 Documentation & Specs
- `docs/SCHEMA_USERS.md`: โครงสร้างตารางผู้ใช้และกฎ Validation (Final)
- `docs/SCHEMA_ANNOUNCEMENTS.md`: โครงสร้างตารางประกาศและข่าวสาร
- `docs/SCHEMA_BOOKS.md`: โครงสร้างระบบหนังสือ (Master-Detail)
- `docs/BOOKS_MANAGEMENT_DESIGN.md`: แผนผังและรายละเอียดระบบจัดการหนังสือ
- `docs/SIGNUP_DESIGN.md`: แผนการทำงานของระบบ Signup (No Firebase Auth)
- `docs/SESSION_MANAGEMENT.md`: แผนผังระบบจัดการเซสชัน (1 Device Only)
- `docs/PERFORMANCE_GUIDE.md`: แนวทางเพิ่มประสิทธิภาพการทำงาน (Cache & Partitioning)
- `docs/AUTH_GAS.md`: มาตรฐานความปลอดภัยและการออกแบบระบบ Auth บน GAS
- `SPA_STRUCTURE_TH.md`: โครงสร้างสถาปัตยกรรม SPA ภาษาไทย

## Commands (WSL)
- **Firebase Hosting**: `firebase deploy --only hosting`
- **Apps Script (clasp)**: `clasp push`
- **Setup Table**: รันฟังก์ชัน `setupDatabase` ใน Apps Script Editor เพื่อสร้าง/อัปเดตหัวตารางทั้งหมด

## Known TODOs
- [ ] พัฒนาหน้าจอจัดการหนังสือ (`/manage/books`) เพื่อเพิ่มข้อมูลแม่และลูก
- [ ] เขียน Logic การยืม-คืนหนังสือ (Loan System)
- [ ] เขียน Logic การดึงประกาศจาก Google Sheet ไปแสดงในหน้า Quest Board (`/announcements`)
