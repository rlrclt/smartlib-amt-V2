# Signup Page Design (No Firebase Auth) - UPDATED

เอกสารนี้กำหนดขั้นตอนการสมัครสมาชิก กฎการตรวจสอบข้อมูล และการจัดการสถานะของผู้ใช้งานกลุ่ม `member`

## 1. ลำดับขั้นตอนการสมัคร (Workflow)

1. **User Fills Form:** กรอกข้อมูลผ่าน Dynamic Form (เปลี่ยนฟิลด์ตามบทบาทที่เลือก)
2. **Frontend Validation:** ตรวจสอบความครบถ้วนและรูปแบบข้อมูล (Format) ก่อนส่ง
3. **Uniqueness Check (GAS):** ระบบหลังบ้านตรวจสอบว่า `email` หรือ `idCode` ซ้ำกับที่มีอยู่แล้วหรือไม่
4. **Verification Link:** หากข้อมูลผ่าน ระบบจะสร้าง Token และส่งอีเมลยืนยันตัวตนไปหาผู้ใช้
5. **Account Activation:** เมื่อผู้ใช้คลิกลิงก์ยืนยัน:
   - ปรับสถานะเป็น `isVerified: true` และ `status: "active"`
   - สุ่มรหัสผ่าน (Random Password) และ Hash ก่อนบันทึก
   - ส่งอีเมลแจ้งรหัสผ่านตัวจริงให้ผู้ใช้ทราบ

---

## 2. โครงสร้างฟอร์มและกฎการตรวจสอบ (Form & Validation)

### 2.1 ข้อมูลพื้นฐาน (Common Fields - Required for All)
- `displayName`: ชื่อ-นามสกุล (ห้ามว่าง)
- `email`: อีเมล (**ต้องไม่ซ้ำในระบบ**, รูปแบบอีเมลถูกต้อง)
- `phone`: เบอร์โทรศัพท์ (ตัวเลข 10 หลัก)
- `role`: เลือก Student, Teacher, Staff, External

### 2.2 ข้อมูลเฉพาะบทบาท (Dynamic Fields)

| บทบาท (Role) | ฟิลด์ที่ต้องแสดงเพิ่ม | กฎการตรวจสอบ (Validation) |
| :--- | :--- | :--- |
| **student** | `idCode`, `department`, `level`, `classRoom` | `classRoom` ต้องเป็นรูปแบบ `ปี/ห้อง` (เช่น 1/1) |
| **teacher** | `idCode`, `department`, `personnelType` | `idCode` **ต้องไม่ซ้ำ**ในกลุ่มครู/บุคลากร |
| **staff** | `idCode`, `department`, `personnelType` | `idCode` **ต้องไม่ซ้ำ**ในกลุ่มครู/บุคลากร |
| **external** | `idCode`, `idType`, `organization` | `idCode` (เลขบัตร) **ต้องไม่ซ้ำ**ในกลุ่มบุคคลภายนอก |

---

## 3. ค่าเริ่มต้นที่ระบบจัดการให้ (Default Values)
ระบบจะส่งค่าเหล่านี้ไปที่หลังบ้านโดยอัตโนมัติ (ผู้ใช้ไม่ต้องกรอก):
- `groupType`: `"member"` (ล็อคค่าสำหรับหน้า Signup)
- `status`: `"pending"` (รอการยืนยันอีเมล)
- `isVerified`: `false`
- `photoURL`: ใช้ URL รูปภาพเริ่มต้น (Default Avatar)
- `createdAt` / `updatedAt`: วันที่และเวลาปัจจุบัน

---

## 4. กฎการห้ามข้อมูลซ้ำ (Uniqueness Constraints)
ระบบ GAS จะต้องตรวจสอบฟิลด์เหล่านี้ก่อนทำการบันทึก:
1. **Email Check:** ตรวจสอบคอลัมน์ `B` (email) ห้ามซ้ำกับใครเลยในระบบ
2. **ID Code Check:** ตรวจสอบคอลัมน์ `G` (idCode) ห้ามซ้ำภายในกลุ่ม `groupType` เดียวกัน
3. **UID Check:** ตรวจสอบคอลัมน์ `A` (uid) ห้ามซ้ำ (ใช้การตรวจสอบก่อน Insert)

---

## 5. การจัดการรูปโปรไฟล์ (Profile Photo)
- **สถานะเริ่มต้น:** ระบบจะบันทึกค่า `photoURL` เป็นรูปภาพ Default (เช่น `/assets/img/default-avatar.png`)
- **การแก้ไข:** ผู้ใช้สามารถอัปโหลดรูปภาพใหม่เพื่อเปลี่ยนรูปเริ่มต้นได้ที่หน้า **"ตั้งค่า (Settings)"** หลังจากเข้าสู่ระบบแล้ว
