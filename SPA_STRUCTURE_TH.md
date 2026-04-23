# โครงสร้าง SPA (Firebase Hosting + GAS หลังบ้าน)

โปรเจกต์นี้ใช้แนวทาง "หน้าบ้านเป็น SPA บน Firebase Hosting" และ "หลังบ้านเป็น Google Apps Script (GAS)" โดยใช้ Google Sheet เป็นฐานข้อมูลแบบง่าย

เป้าหมาย: เวลาเปลี่ยนหน้า **ไม่ reload ทั้งหน้า** แต่สลับ layout/เนื้อหาในหน้าเดิม เพื่อให้ลื่นและไม่รู้สึกถึงรอยต่อ

---

## ภาพรวมสแตก (ตอนนี้)

- หน้าบ้าน (Frontend): Static SPA ในโฟลเดอร์ `public/` (deploy ได้เลย ไม่ต้อง build)
- โฮสติ้ง: Firebase Hosting (`firebase.json` ชี้ `public/`)
- หลังบ้าน (Backend): GAS Web App (ตอบแบบ JSONP)
- ฐานข้อมูล (DB): Google Sheet (ชีต `db`)

---

## แผนผังโฟลเดอร์ (สัญลักษณ์)

ตำนานสัญลักษณ์:
- `📁` โฟลเดอร์
- `📄` ไฟล์
- `⭐` ไฟล์หลัก (entry / shell)
- `🧠` หลังบ้าน (GAS)
- `🧩` component / UI ส่วนย่อย
- `🧱` layout หลัก (โครงหน้า)
- `🌐` hosting/config
- `🔌` data/API client

โครงสร้างจริงใน repo (ตอนนี้):
```text
📁 /mnt/c/smartlib-amt
├─ 📄 AGENTS.md
├─ 📄 AI_INDEX.md
├─ 📄 SPA_STRUCTURE.md
├─ 📄 SPA_STRUCTURE_TH.md ⭐
├─ 📄 firebase.json 🌐
├─ 📄 .firebaserc 🌐
├─ 📄 .clasp.json 🧠 (clasp config; rootDir=apps_script)
├─ 📁 public/ 🌐⭐ (Firebase Hosting เสิร์ฟจากโฟลเดอร์นี้)
│  ├─ 📄 index.html ⭐🧱 (shell + navbar + landing + outlet)
│  ├─ 📄 favicon.svg
│  └─ 📁 app/ ⭐ (โค้ด SPA แยกเป็นส่วน ๆ)
│     ├─ 📄 app.js ⭐ (bootstrap)
│     ├─ 📄 app.css
│     ├─ 📄 bootstrap.js
│     ├─ 📄 router.js
│     ├─ 📄 config.js (GAS URL)
│     ├─ 📁 routes/ (route table)
│     ├─ 📁 layouts/ (shell helpers)
│     ├─ 📁 components/ (toast, modal, ...)
│     ├─ 📁 views/ (pages)
│     ├─ 📁 data/ 🔌 (api + jsonp)
│     └─ 📁 utils/ (html escape, helpers)
├─ 📁 apps_script/ 🧠 (โค้ดหลังบ้าน GAS เท่านั้น)
│  ├─ 📄 Code.gs 🧠⭐ (JSONP API + อ่าน/เขียน Google Sheet)
│  ├─ 📄 appsscript.json 🧠 (runtime settings)
│  └─ 📄 README.md 🧠 (วิธี push/deploy)
└─ 📁 references/ (เอกสาร/โน้ตประกอบ)
```

---

## แบ่งหน้าที่ "หน้าบ้าน" vs "หลังบ้าน"

หน้าบ้าน (Firebase Hosting: `public/`):
- `public/index.html` = **Layout หลัก (shell)**: โครงหน้า, navbar, ส่วน landing (`#landing-root`), ช่องแสดงหน้าอื่น (`#outlet`), toast (`#toast`)
- `public/app.js` = **สมองของ SPA**: จับลิงก์ในเว็บ, pushState, render หน้า, เรียก data จากหลังบ้าน
- `public/gas_jsonp.js` = **ตัวเชื่อมหลังบ้าน**: สร้าง `<script src=...>` แล้วรับ callback เป็น JSON
- `public/app.css` = **สไตล์เฉพาะ SPA** (fade/transition + toast)

หลังบ้าน (GAS: `apps_script/`):
- `apps_script/Code.gs` = API `ping/list/get/set/delete` + ผูกกับ Google Sheet
- `apps_script/appsscript.json` = config runtime

---

## Layout หลัก / Navbar / Footer / Components (ตอนนี้อยู่ที่ไหน)

ตอนนี้เราวางแบบ "ง่ายสุดเพื่อ deploy เร็ว":
- `Navbar + Landing layout` อยู่ใน `public/index.html` (HTML ยาว ๆ)
- "หน้าอื่น" (เช่น `/db`) ถูก render ผ่าน view modules ใน `public/app/views/*`
- `Footer` ตอนนี้ยังไม่ได้แยกเป็น component ชัดเจน (อยู่ใน landing section ของ `public/index.html` ถ้ามี)
- `Component` ถูกแยกเริ่มต้นแล้ว (เช่น `public/app/components/toast.js`)

สิ่งนี้ใช้ได้สำหรับ MVP แต่พอโตจะดูแลยาก

---

## โครงสร้างที่ "แนะนำเมื่อเริ่มมีหลายหน้า/หลาย component"

ถ้าคุณอยากให้ navbar/footer/components แยกไฟล์ชัด ๆ (ยังเป็น static deploy ได้เหมือนเดิม) แนะนำโครงนี้:
```text
📁 public/
├─ 📄 index.html ⭐🧱 (โหลดแค่ entry module)
└─ 📁 app/ ⭐
   ├─ 📄 app.js ⭐ (bootstrap + router)
   ├─ 📁 layouts/
   ├─ 📁 components/
   ├─ 📁 views/
   └─ 📁 data/
```

หลักการ:
- `index.html` เป็น shell บาง ๆ (โหลด `app.js` อย่างเดียว)
- `layouts/*` รับผิดชอบโครงหน้า
- `components/*` เก็บ navbar/footer/ส่วนย่อยที่ reuse
- `views/*` คือแต่ละหน้า (render + bind events)
- `data/*` รวมการเรียกหลังบ้านให้เป็นที่เดียว

### เพิ่มเติม: รองรับหลาย Member Type / Role (ตามที่คุณวางไว้)

คุณมี 2 กลุ่มใหญ่:
- `manage` (staff): `admin`, `librarian`
- `member`: `student`, `teacher`, `other`

คำแนะนำคือแยก “สิทธิ์ (role)” ออกจาก “ประเภทสมาชิก (memberType)”:
- `role` ใช้ตัดสิน **เข้าหน้าไหน/ทำ action ไหนได้**
- `memberType` ใช้กำหนด **UI/ฟีเจอร์/ฟอร์ม** ของสมาชิก

โครงสร้างไฟล์ที่แนะนำเมื่อเริ่มมีหลาย role:
```text
📁 public/
├─ 📄 index.html ⭐🧱
├─ 📄 app.js ⭐ (bootstrap + router)
├─ 📁 routes/
│  ├─ 📄 routes.js (route table)
│  └─ 📄 guards.js (requireAuth/requireRole)
├─ 📁 layouts/
│  ├─ 📄 landing.js 🧱
│  ├─ 📄 manage_shell.js 🧱 (sidebar/topbar สำหรับ admin/librarian)
│  └─ 📄 member_shell.js 🧱 (nav สำหรับ student/teacher/other)
├─ 📁 components/
│  ├─ 📄 navbar.js 🧩
│  ├─ 📄 footer.js 🧩
│  ├─ 📄 sidebar_manage.js 🧩
│  ├─ 📄 topbar_manage.js 🧩
│  ├─ 📄 toast.js 🧩
│  └─ 📄 modal.js 🧩
├─ 📁 views/
│  ├─ 📁 manage/
│  │  ├─ 📄 dashboard.js (เช่น /manage)
│  │  ├─ 📄 books_manage.js (เช่น /manage/books)
│  │  ├─ 📄 users_manage.js (เช่น /manage/users)
│  │  └─ 📄 loans_manage.js (เช่น /manage/loans)
│  ├─ 📁 member/
│  │  ├─ 📄 home.js (เช่น /app)
│  │  ├─ 📄 catalog.js (เช่น /app/books)
│  │  ├─ 📄 my_loans.js (เช่น /app/me/loans)
│  │  └─ 📄 profile.js (เช่น /app/me)
│  └─ 📄 auth.js (เช่น /auth)
├─ 📁 state/
│  ├─ 📄 session.js (user/role/memberType + listeners)
│  └─ 📄 store.js (cache แบบง่าย)
├─ 📁 data/
│  ├─ 📄 gas_jsonp.js 🔌
│  ├─ 📄 api.js 🔌 (wrap action)
│  └─ 📄 models.js (normalize/validate payload)
└─ 📁 utils/
   ├─ 📄 dom.js (helper render/bind)
   └─ 📄 time.js
```

แนวทางออกแบบ route ให้ชัด (อ่านง่ายและกันสับสน):
- `landing`: `/`
- `auth`: `/auth`
- `manage`: `/manage/...` (admin/librarian เท่านั้น)
- `member`: `/app/...` (student/teacher/other)

ตัวอย่าง guard logic (แนวคิด):
- `requireAuth()` ถ้าไม่ login → เด้งไป `/auth`
- `requireRole(["admin","librarian"])` ถ้าไม่ใช่ → 403 view หรือเด้งไป `/app`

หมายเหตุสำคัญสำหรับ production:
- JSONP อย่างเดียว “ยังไม่ใช่ auth ที่แท้จริง” (เพราะ GET + callback)
- ถ้าจะบังคับสิทธิ์จริง แนะนำเพิ่มชั้น auth ภายหลัง (เช่น Firebase Auth token + proxy server-side)

---

## การเปลี่ยนหน้าแบบ SPA (ของเรา)

สิ่งที่ทำให้เป็น SPA:
- intercept link: `a[data-link]` แล้วเรียก `history.pushState`
- ฟัง `popstate` สำหรับ back/forward
- render แค่ภายใน `#outlet` (หรือสลับ `#landing-root` vs `#outlet`)

ข้อสำคัญ: Firebase Hosting ต้อง rewrite ทุก route กลับไป `index.html`
- `firebase.json` มี `rewrites` แล้ว (เพื่อให้ refresh ที่ `/db` ไม่ 404)

---

## การโหลดข้อมูลแบบ “ไม่สะดุด”

แนวทางแนะนำ (ตาม best practice สำหรับ latency ที่แปรผัน):
1. เปลี่ยน layout/หน้าให้เสร็จทันที (แสดง skeleton/loading)
2. ค่อยเรียกหลังบ้าน (JSONP)
3. เติมข้อมูลเมื่อ response กลับมา
4. ถ้าเปลี่ยน route ระหว่างรอ: ให้กัน response เก่ามาทับหน้าใหม่ด้วย `routeVersion`

---

## API หลังบ้าน (JSONP) ที่ใช้อยู่

Base: GAS Web App URL

เรียกแบบ GET:
- `?action=ping`
- `?action=list`
- `?action=get&key=...`
- `?action=set&key=...&value=...`
- `?action=delete&key=...`

JSONP:
- เพิ่ม `&callback=cbName` แล้ว server ตอบ `cbName(<json>);`

ข้อจำกัด:
- JSONP เป็น GET เท่านั้น
- URL length จำกัด: payload `value` อย่าใหญ่ (ถ้าจะใหญ่ให้เปลี่ยนเป็น proxy/POST ภายหลัง)
