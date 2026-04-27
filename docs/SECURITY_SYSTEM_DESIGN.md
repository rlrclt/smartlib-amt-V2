# แผนการออกแบบ: ระบบความปลอดภัยและการจัดการสิทธิ์ (System Security & Access Control)

เอกสารนี้รวบรวมและขยายผลแนวทางการรักษาความปลอดภัยสำหรับระบบ SmartLib-AMT ครอบคลุมทั้งส่วนหน้าบ้าน (Frontend), หลังบ้าน (GAS), และฐานข้อมูล (Sheets)

## 1. วัตถุประสงค์
เพื่อให้มั่นใจว่าข้อมูลสมาชิกและธุรกรรมห้องสมุดมีความปลอดภัยสูงสุด ป้องกันการเข้าถึงโดยไม่ได้รับอนุญาต และรักษาสถานะความถูกต้องของข้อมูล (Data Integrity)

## 2. เสาหลักความปลอดภัย (Security Pillars)

### 2.1 การยืนยันตัวตน (Authentication)
อ้างอิงตาม **SESSION_MANAGEMENT.md**:
- **Single Active Session**: 1 บัญชีใช้งานได้เพียง 1 เครื่องพร้อมกัน หากมีการ Login ใหม่ เครื่องเก่าจะโดนเตะออก (`revoked`)
- **Token Hashing**: ระบบจะไม่เก็บ Session Token จริงลงใน Google Sheets แต่จะเก็บค่า SHA-256 Hash แทน เพื่อป้องกันกรณี Database รั่วไหล
- **Session Timeout**: กำหนดอายุการใช้งาน (เช่น 24 ชั่วโมง) และมีระบบเตือนเมื่อ Session หมดอายุ

### 2.2 การควบคุมสิทธิ์ (Authorization - RBAC)
อ้างอิงตาม **SCHEMA_USERS.md**:
- **Group-based Access**: แบ่งระดับการเข้าถึงตาม `groupType` (`manage` vs `member`)
- **Role-based Access Control (RBAC)**: กำหนดสิทธิ์การดำเนินการ (Actions) ตามบทบาทย่อย:
    - `admin`: จัดการได้ทุกส่วน รวมถึงการตั้งค่าพิกัดและนโยบาย
    - `librarian`: จัดการหนังสือ สมาชิก และการยืม-คืน แต่ไม่สามารถแก้ Settings ระบบได้
    - `member`: เข้าถึงเฉพาะข้อมูลส่วนตัวและทำรายการยืม-คืนด้วยตนเอง (ผ่าน Geofencing)

### 2.3 ความปลอดภัยของ API (API Security)
- **JSONP Limitations**: เนื่องจากใช้ JSONP (GET Request) ระบบจะหลีกเลี่ยงการส่ง Sensitive Data ผ่าน URL Query String (ยกเว้น Token ที่ Hash แล้ว)
- **Action Verification**: ทุก API Request ที่ฝั่ง Backend ต้องมีการเช็คสิทธิ์ (Validate Session + Role) ก่อนดำเนินการเสมอ
- **Rate Limiting**: (แผนในอนาคต) ตรวจสอบความถี่ในการเรียก API เพื่อป้องกันการโจมตีแบบ Brute-force

### 2.4 ความถูกต้องของพื้นที่ (Geofencing Security)
- **Strict Enforcement**: การยืม-คืนด้วยตนเอง (Self-service) จะถูกบล็อกทันทีหากพิกัด GPS ไม่ตรงตามเงื่อนไข
- **Tamper Protection**: ตรวจสอบค่า `accuracy` ของ GPS เพื่อป้องกันการใช้โปรแกรมจำลองพิกัด (Mock Location) ในเบื้องต้น

## 3. การจัดการข้อมูล (Data Integrity)

### 3.1 การตรวจสอบข้อมูล (Input Validation)
- **Sanitization**: ทำความสะอาดข้อมูลทุกครั้งก่อนบันทึกลง Sheet (เช่น การ Escape HTML ป้องกัน XSS)
- **Schema Validation**: ตรวจสอบประเภทข้อมูล (Type) และฟิลด์ที่จำเป็น (Required) ตามมาตรฐานใน Schema Docs

### 3.2 การจัดการธุรกรรม (Transactional Consistency)
- **Batch Operations**: ใช้หลักการอ่าน/เขียนแบบกลุ่มเพื่อลด race condition
- **Atomic-ish Updates**: บันทึกข้อมูลที่เกี่ยวข้องกัน (เช่น การคืนหนังสือ + การสร้างประวัติค่าปรับ) ให้ต่อเนื่องกันที่สุด

## 4. บันทึกและการตรวจสอบ (Audit Trail)
- **Action Logs**: บันทึกว่า "ใคร" ทำ "อะไร" ที่ "พิกัดไหน" และ "เมื่อไหร่"
- **Soft Delete**: ใช้ฟิลด์ `deleted_at` แทนการลบข้อมูลจริง เพื่อให้สามารถกู้คืนและตรวจสอบย้อนหลังได้

## 5. UI/UX เพื่อความปลอดภัย
- **Clear Feedback**: แสดงข้อความที่เข้าใจง่ายเมื่อ Session หมดอายุหรือไม่มีสิทธิ์เข้าถึง (Error 401, 403)
- **Auto-logout**: ระบบจะทำการ Logout อัตโนมัติและล้างข้อมูลใน Storage เมื่อพบว่า Session ไม่ถูกต้อง

## 6. แผนการดำเนินงาน (Implementation Steps)
1. **Backend**: พัฒนาฟังก์ชัน `validateSession_()` และ `checkPermission_()` เป็นฟังก์ชันกลาง (Middleware)
2. **Backend**: พัฒนาระบบ `generateToken_()` และการจัดการชีต `sessions`
3. **Frontend**: เพิ่มระบบแนบ Token ไปกับทุก Request และจัดการ Error Code 401/403
4. **Docs**: อัปเดต Schema ของทุกตารางให้รองรับ `updated_by` และ `updated_at` อย่างครบถ้วน
