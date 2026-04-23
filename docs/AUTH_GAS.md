# GAS Auth (SignUp/SignIn/Logout) - Fast + Secure + 1 Device Only

เอกสารนี้สรุปแนวทางทำระบบ SignUp / SignIn / Logout สำหรับสถาปัตยกรรม
`Firebase Hosting (Static SPA)` + `Google Apps Script Web App (API)` + `Google Sheets (DB)`
โดยเน้น “ทำได้เร็ว” แต่ยังยึดหลักความปลอดภัยแบบสากล และมี requirement เพิ่มเติม: **1 account ใช้งานได้แค่ 1 device พร้อมกันเท่านั้น**

> บริบทของ repo นี้: `docs/SIGNUP_DESIGN.md` ระบุว่า “No Firebase Auth” และฝั่ง GAS ตอนนี้เป็น `JSONP router` ใน `apps_script/Code.gs`

---

## 0) สรุปคำตอบแบบเลือกใช้เร็วๆ

1. **แนะนำที่สุด (เร็ว + ปลอดภัย + เป็นมาตรฐาน):** ใช้ **Sign in with Google (OpenID Connect)** แล้วให้ backend ตรวจสอบ **ID token** จากฝั่ง server ก่อนออก session ของระบบเอง
2. **ทางเลือก (เร็วและปลอดภัยพอสมควร):** **Email magic link** (ไม่ต้องเก็บ password) + backend ออก session ของระบบเอง
3. **ไม่แนะนำถ้าเลี่ยงได้:** **Email/Password** บน GAS+Sheets เพราะภาระ security สูง (hashing, brute-force, reset, session) และ “SHA-256 ตรงๆ” ไม่เหมาะสำหรับเก็บรหัสผ่านตามคำแนะนำ OWASP

อ้างอิงหลัก:
- Google: backend verification ของ ID token หลัง Sign-In (ต้อง verify token ฝั่ง server) https://developers.google.com/identity/sign-in/web/backend-auth
- Google: OpenID Connect / Google Identity Services https://developers.google.com/identity/openid-connect/openid-connect
- OWASP: Session Management Cheat Sheet https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP: Password Storage Cheat Sheet https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- MDN: Session management (แนวปฏิบัติการ invalidate session) https://developer.mozilla.org/en-US/docs/Web/Security/Authentication/Session_management
- JSONP ความเสี่ยงโดยธรรมชาติ (ถูกแทนด้วย CORS เป็นหลัก) https://en.wikipedia.org/wiki/JSONP

---

## 1) ประเด็นสำคัญของ GAS + Static SPA (สิ่งที่ต้องระวัง)

### 1.1 หลีกเลี่ยงการทำ “Auth ผ่าน JSONP”
`JSONP` ใช้ `<script src="...">` ทำให้:
- ใส่ token ใน query string ได้ง่าย (เสี่ยงรั่วผ่าน log, referrer, cache)
- เป็นกลไกที่ “หลบ CORS” มากกว่าจะแก้ security
- ถ้า endpoint มีช่องโหว่ injection จะกระทบผู้ใช้หนักขึ้น

สรุป: **JSONP ควรใช้กับ endpoint แบบ public/read-only เท่านั้น** (ถ้าจำเป็น) และ **อย่าใช้กับ SignIn/Session**

### 1.2 Session token ห้ามอยู่ใน URL
แนวทาง OWASP แนะนำให้ส่ง session ผ่าน **cookie** หรือ **Authorization header** มากกว่าการส่งใน URL

---

## 2) แบบที่แนะนำ: OIDC (Sign in with Google) + “Session ของระบบ”

### 2.1 Flow (ภาพรวม)
1. Frontend ทำ Google Sign-In และได้ `id_token` (JWT)
2. Frontend ส่ง `id_token` ไป backend (ผ่าน HTTPS)
3. Backend:
   - ตรวจสอบ signature และ claims ของ `id_token` (aud/iss/exp) ตามเอกสาร Google
   - map ไปเป็น user ใน `users` sheet (ตาม `email` หรือ `sub`)
   - ออก `sessionToken` ของระบบ (opaque random)
4. Frontend เก็บ `sessionToken` แล้วใช้เรียก API ของระบบในทุก request

### 2.2 ทำไมต้องมี “session ของระบบ” แม้ใช้ Google Sign-In แล้ว
- ID token ไม่ควรใช้เป็น “session” ตรงๆ แบบยาวๆ
- ต้องรองรับ requirement “1 device only”, revoke session, logout, timeout, role enforcement

---

## 3) Requirement: 1 Account = 1 Device (Single Active Session)

### 3.1 หลักการ
ให้ผู้ใช้มี session ได้ “พร้อมกัน” แค่ 1 อัน:
- Login ใหม่บน device ใหม่ => **revoke** session เดิมทันที
- Request ที่ใช้ token เก่าหลังโดน revoke => ต้องได้ `401` พร้อม reason เช่น `SESSION_REPLACED`

### 3.2 แนะนำ schema เพิ่ม (Google Sheets)

ทางเลือก A (ง่ายสุด): เพิ่มคอลัมน์ใน `users`
- `activeSessionId` (string)
- `activeSessionTokenHash` (string) เก็บ hash ของ token จริง ไม่เก็บ token ตรงๆ
- `activeDeviceId` (string)
- `sessionIssuedAt` (ISO8601)
- `sessionExpiresAt` (ISO8601)
- `lastSeenAt` (ISO8601)

ทางเลือก B (ยืดหยุ่นกว่า): เพิ่มชีตใหม่ `sessions` + link จาก users
- `sessions.sessionId`
- `sessions.userUid`
- `sessions.deviceId`
- `sessions.tokenHash`
- `sessions.status` (`active`/`revoked`/`expired`)
- `sessions.issuedAt`, `expiresAt`, `revokedAt`, `lastSeenAt`
- `sessions.userAgent`, `ip` (optional)

> ถ้าต้อง enforce “1 device only” จริงจัง ทางเลือก B จะ debug ง่ายกว่า และตรวจสอบย้อนหลังได้

### 3.3 Device ID คืออะไร
`deviceId` = random UUID ฝั่ง client (เก็บใน `localStorage`) เพื่อแทน device ปัจจุบัน
- เปลี่ยน browser profile / clear storage => ถือเป็น device ใหม่
- ไม่ต้องพยายาม “fingerprint” เครื่องผู้ใช้ (ไม่แม่น + เสี่ยง privacy)

### 3.4 อัลกอริทึมหลัก

**login(user, deviceId):**
1. สร้าง `sessionToken = random(32+ bytes)` และ `sessionId = uuid`
2. เก็บ `tokenHash = SHA-256(sessionToken)` (ใช้ SHA-256 เพื่อ “hash token”, ไม่ใช่ hash password)
3. set active session:
   - ในแบบ A: เขียน `activeSessionId/activeSessionTokenHash/activeDeviceId/...` ลง users
   - ในแบบ B: mark session เก่าของ user เป็น `revoked`, insert session ใหม่เป็น `active`, update user.activeSessionId = ใหม่
4. return `sessionToken` ให้ client

**authorize(request):**
1. อ่าน `sessionToken` จาก cookie/header (ไม่ใช่ query string)
2. hash => `tokenHash`
3. ตรวจว่า tokenHash ตรงกับ “active session” ของ user และไม่ expired/revoked
4. ถ้าผิด => `401`

**logout(user):**
1. revoke active session (server-side)
2. client ลบ token ใน storage

### 3.5 Session timeout (แนะนำ)
- `access session` อายุสั้น เช่น 8-24 ชม. (แล้วแต่ความเสี่ยง)
- เพิ่ม idle timeout ได้โดยใช้ `lastSeenAt`
- Logout ต้อง invalidate server-side เสมอ (แค่ลบ token ฝั่ง client ไม่พอ)

อ้างอิง: OWASP session management และ logout testing

---

## 4) ถ้าจำเป็นต้องใช้ Email/Password (ข้อควรทำขั้นต่ำ)

### 4.1 ห้ามเก็บ password ด้วย SHA-256 ตรงๆ
ตาม OWASP: password storage ควรใช้ **Argon2id** (ดีที่สุด), หรือ **bcrypt/scrypt/PBKDF2** พร้อม salt และ cost ที่เหมาะสม

ใน GAS:
- ถ้าต้อง “ทำเองจริงๆ” ให้ใช้ PBKDF2 (ต้องมี implementation ที่เชื่อถือได้) และเก็บ `salt`, `iterations`, `derivedKey`
- อย่าเก็บ password plain text และอย่าเก็บ “hash แบบเร็ว” อย่าง SHA-256 เดี่ยวๆ

### 4.2 ต้องมีสิ่งนี้เพิ่ม
- rate limit / lockout สำหรับ brute-force
- password reset flow ที่ปลอดภัย (token one-time + expiry)
- email verification (ตาม `docs/SIGNUP_DESIGN.md`) และต้อง invalidate verify token หลังใช้แล้ว

> ถ้าต้องการ ship เร็วจริง: แนะนำ “OIDC หรือ magic link” มากกว่า email/password

---

## 5) ข้อเสนอเชิงสถาปัตยกรรมสำหรับ repo นี้ (ให้ทั้งเร็วและปลอดภัย)

### 5.1 แยก “Public JSONP” ออกจาก “Private API”
เพื่อลดความเสี่ยง:
- คง JSONP ไว้สำหรับ `action=ping` หรือ public read endpoints
- ทำ Private API สำหรับ auth/CRUD ที่ต้องมี session แบบ “ไม่ผ่าน JSONP”

### 5.2 ตัวเลือกการเชื่อมต่อ (จากง่ายไปยาก)
1. **ดีที่สุด:** ให้ frontend เรียก API ผ่าน “ตัวกลาง” ที่คุม header/cookie/CORS ได้ (เช่น Firebase Functions/Cloud Run) แล้วค่อยเรียก GAS/Sheets ภายใน
2. **รองลงมา:** ย้ายหน้า login ไปอยู่ใน GAS HtmlService (same-origin) แล้วเรียก server ด้วย `google.script.run`
3. **ถ้าต้องเรียก GAS ตรงจาก browser:** หลีกเลี่ยง JSONP สำหรับ auth และพยายามใช้ request ที่ไม่ต้อง preflight (แต่มีข้อจำกัดสูง)

> ข้อ 1 จะทำให้ทำ cookie-based session แบบมาตรฐานได้ง่ายที่สุด และ enforce “1 device only” ได้ตรงไปตรงมา

---

## 6) Checklist (ก่อนถือว่า “ปลอดภัยพอ”)

- [ ] ไม่ส่ง token ผ่าน URL/query string
- [ ] sessionToken เป็น random entropy สูง และเก็บ server-side เป็น hash
- [ ] logout invalidates session server-side
- [ ] rotate session เมื่อ login ใหม่ และ revoke session เดิม (รองรับ 1 device only)
- [ ] มี expiry และ (ถ้าต้องการ) idle timeout
- [ ] แยก endpoint public (JSONP) กับ private (ต้อง auth)
- [ ] ถ้าใช้ password: ใช้ Argon2/bcrypt/scrypt/PBKDF2 + salt ตาม OWASP

