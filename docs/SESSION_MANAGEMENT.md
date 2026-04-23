# Session Management Blueprint (1 Account = 1 Device)

เอกสารนี้กำหนดรายละเอียดการออกแบบระบบ Session เพื่อรองรับเงื่อนไข **"1 บัญชีใช้งานได้เพียง 1 เครื่องพร้อมกัน"** สำหรับโปรเจกต์ smartlib-amt

---

## 1. โครงสร้างฐานข้อมูล (Sheet: `sessions`)

สำหรับการเก็บข้อมูลเซสชัน ให้สร้างชีตใหม่ชื่อ `sessions` โดยมีลำดับคอลัมน์ดังนี้:

| Column | Field Name | Type | Description |
| :--- | :--- | :--- | :--- |
| **A** | `sessionId` | String | Unique ID สำหรับเซสชันนี้ (UUID) |
| **B** | `userUid` | String | UID ของผู้ใช้ (จากชีต `users`) |
| **C** | `deviceId` | String | รหัสเครื่องที่หน้าบ้านส่งมา (Random UUID ใน LocalStorage) |
| **D** | `tokenHash` | String | ค่า SHA-256 ของ Session Token จริง |
| **E** | `status` | Enum | สถานะ: `active`, `revoked` (โดนเตะ), `expired` (หมดอายุ) |
| **F** | `issuedAt` | ISO8601 | วันที่และเวลาที่ออกเซสชัน |
| **G** | `expiresAt` | ISO8601 | วันที่และเวลาที่เซสชันจะหมดอายุ |
| **H** | `lastSeenAt` | ISO8601 | วันที่และเวลาที่ใช้งานล่าสุด (สำหรับ Idle Timeout) |

---

## 2. ตรรกะฝั่งหลังบ้าน (Apps Script Logic)

### 2.1 การสร้างเซสชัน (`createSession`)
เมื่อผู้ใช้ Login สำเร็จ:
1. **Revoke Old Session:** ค้นหาในชีต `sessions` ว่ามี `userUid` นี้ที่สถานะเป็น `active` หรือไม่
   - หากเจอ: ให้เปลี่ยนสถานะแถวนั้นเป็น `revoked` ทันที
2. **Generate Token:** สร้าง `sessionToken` แบบสุ่ม (32+ bytes)
3. **Save Token Hash:** นำ `sessionToken` มาทำ SHA-256 (ใช้ฟังก์ชันใน `Utils.gs`) และบันทึกลงคอลัมน์ `D` (tokenHash)
4. **Result:** ส่งค่า `sessionToken` (ตัวเต็ม) กลับไปให้หน้าบ้าน

### 2.2 การตรวจสอบเซสชัน (`validateSession`)
ทุกครั้งที่มีการเรียกข้อมูลที่ต้อง Auth:
1. นำ `sessionToken` ที่หน้าบ้านส่งมาทำ SHA-256
2. ค้นหาในชีต `sessions` ว่ามี `tokenHash` นี้ที่ `status == "active"` และยังไม่หมดอายุหรือไม่
3. **Error Handling:**
   - หากไม่พบ: ตอบกลับ `401: INVALID_TOKEN`
   - หากพบแต่ `status == "revoked"`: ตอบกลับ `401: SESSION_REPLACED`
   - หากพบแต่ `expiresAt` ผ่านไปแล้ว: ตอบกลับ `401: SESSION_EXPIRED`
4. **Success:** อัปเดต `lastSeenAt` เป็นเวลาปัจจุบัน

---

## 3. ตรรกะฝั่งหน้าบ้าน (Frontend Logic)

### 3.1 การระบุเครื่อง (`deviceId`)
- **ไฟล์:** `public/app/utils/device.js`
- **หลักการ:** เมื่อแอปเริ่มทำงาน ให้เช็คใน `localStorage.getItem("deviceId")`
- **สร้างใหม่:** หากไม่มี ให้สร้าง UUID ขึ้นมาใหม่และบันทึกไว้ถาวรในเครื่องนั้น

### 3.2 การจัดการ Session ในเบราว์เซอร์
- **Storage:** เก็บ `sessionToken` ใน `sessionStorage` (เพื่อให้หายไปเมื่อปิดแท็บ) หรือ `localStorage` (ถ้าต้องการให้จำการล็อกอิน)
- **API Call:** ทุกครั้งที่เรียก GAS ผ่าน `gasJsonp` ให้แนบ `sessionToken` ไปในพารามิเตอร์ด้วยเสมอ

---

## 4. มาตรฐาน Error Codes

เพื่อให้หน้าบ้าน (Views) แสดงผลได้อย่างถูกต้อง ระบบควรส่ง Error Code ดังนี้:

- `401: INVALID_TOKEN` -> แสดงหน้า Login ใหม่
- `401: SESSION_REPLACED` -> แสดงข้อความ "บัญชีนี้ถูกเข้าใช้งานจากเครื่องอื่น" และเด้งไปหน้า Login
- `401: SESSION_EXPIRED` -> แสดงข้อความ "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่"

---

## 5. ความปลอดภัย (Security Notes)

1. **ห้ามเก็บ Token จริงใน Sheet:** เก็บเฉพาะค่าที่ผ่านการ Hash แล้วเท่านั้น เพื่อป้องกันกรณีข้อมูลรั่วไหล
2. **HTTPS Only:** การรับส่งข้อมูลทั้งหมดต้องผ่าน HTTPS (Google Apps Script บังคับอยู่แล้ว)
3. **Short-lived Session:** แนะนำให้ตั้งค่า `expiresAt` ไม่เกิน 24 ชั่วโมง เพื่อความปลอดภัย
