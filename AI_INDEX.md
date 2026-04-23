# smartlib-amt Index (for AI + humans)

อัปเดตล่าสุด: 2026-04-23 (Codex-A)

## Where
- WSL path: `/mnt/c/smartlib-amt`
- Windows path: `C:\smartlib-amt`
- Git remote: `https://github.com/rlrclt/smartlib-amt-V2.git`
- Active branch: `main`

## Current Stack
- Frontend: Static SPA (Vanilla JS modules) ใน `public/app/`
- Hosting: Firebase Hosting (serve `public/` + SPA rewrite)
- Backend: Google Apps Script (JSONP) ใน `apps_script/`
- Database: Google Sheets (`users`, `announcements`, `books_catalog`, `books_catalog_archive`, `book_items`, `loans`)

## Key IDs / Endpoints
- GAS `scriptId`: `13IPNEQidzlM9Hwe82SnZ8lrxNZlL9T8bgWacS6LkXRGAkDv90KuLFAhn`
- GAS Web App URL (active in frontend `public/app/config.js`):
  - `https://script.google.com/macros/s/AKfycbzjQqSkP0beUmhFrGJazbtE4FiblcZjRqpb5w1ab8KNPPJ4LxxxWQoxmsa-LJzRLfK0/exec`
- Spreadsheet ID: `1uaIdRHGge04aFx_OxZJToDfZIaZQYrbAYvTE7U5302A`
- Firebase project: `smartlib-amt-v2`

## Routes (Current)
- Public/Auth:
  - `/` (landing)
  - `/signin`, `/login` (alias)
  - `/signup`
  - `/announcements`
  - `/about`, `/privacy`
  - `/logout`
- Local test (localhost only):
  - `/test-signin`
  - `/test-signup`
- Manage (ต้อง login, `groupType=manage`, และหลายหน้า require `role=admin`):
  - `/manage`
  - `/manage/announcements`
  - `/manage/books`
  - `/manage/register_books`
  - `/manage/add_book_items`
  - `/manage/view_book_items`
  - `/manage/books/select-print`
  - `/manage/print-barcodes`
- Member:
  - `/app` (placeholder)

## File Map (Important)
- Frontend core:
  - `public/app/bootstrap.js`
  - `public/app/router.js`
  - `public/app/routes/routes.js`
  - `public/app/config.js`
  - `public/app/data/api.js`
- Layouts/components:
  - `public/app/layouts/manage_shell.js`
  - `public/app/components/sidebar_manage.js`
  - `public/app/components/footer_manage.js`
- Views (manage/books + print):
  - `public/app/views/manage/books.view.js`
  - `public/app/views/manage/register_books.view.js`
  - `public/app/views/manage/add_book_items.view.js`
  - `public/app/views/manage/view_book_items.view.js`
  - `public/app/views/manage/select_print_barcodes.view.js`
  - `public/app/views/manage/print_barcodes.view.js`
- Print utilities/vendor:
  - `public/app/utils/print_cart.js`
  - `public/vendor/jsbarcode.min.js`
- Apps Script backend:
  - `apps_script/Code.gs` (gateway/router)
  - `apps_script/Module_Users.gs`
  - `apps_script/Module_Announcements.gs`
  - `apps_script/Module_Books.gs`
  - `apps_script/Utils.gs`
  - `apps_script/Email.gs`
  - `apps_script/Setup.gs`

## Barcode/Print Flow (Current)
- เลือกรหัสเล่มจาก `/manage/books/select-print`
- เก็บรายการใน cart (`localStorage` ผ่าน `print_cart.js`)
- ไปพิมพ์ที่ `/manage/print-barcodes`
- ใช้ JsBarcode (CODE128) + print CSS เฉพาะงานพิมพ์
- มี validation ฝั่งหน้าเว็บก่อนพิมพ์ (เช่น สถานะเล่ม)

## Docs / Specs (อ่านบ่อย)
- `docs/DEVELOPER_GUIDELINES.md`
- `docs/THEME_ANALYSIS.md`
- `docs/RESPONSIVE_2026.md`
- `docs/PERFORMANCE_GUIDE.md`
- `docs/SCHEMA_USERS.md`
- `docs/SCHEMA_ANNOUNCEMENTS.md`
- `docs/SCHEMA_BOOKS.md`
- `docs/SIGNUP_DESIGN.md`
- `docs/BOOKS_MANAGEMENT_DESIGN.md`
- `docs/PRINT_BARCODE_DESIGN.md`
- `docs/USERS_MANAGEMENT_DESIGN.md`
- `docs/SESSION_MANAGEMENT.md`

## Common Commands (WSL)
- Install deps: `npm install`
- Run local static server (example): `npx serve public -l 5000`
- Firebase deploy (hosting): `firebase deploy --only hosting`
- GAS push: `clasp push`
- GAS deploy version (manual): `clasp version "msg" && clasp deploy -d "msg"`

## Known Remaining Work
- [ ] Loan system end-to-end (`loans`) + UI flow
- [ ] Users management screens ตาม `USERS_MANAGEMENT_DESIGN.md`
- [ ] Print audit trail (ใครพิมพ์อะไร/เมื่อไร)
- [ ] ปรับ UX หน้า print ให้ responsive ดีขึ้นในจอแคบ (งานที่กำลังคุยล่าสุด)
