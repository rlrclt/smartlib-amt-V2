# Users Management Design: smartlib-amt

เอกสารนี้กำหนดโครงสร้างและตรรกะการทำงานของระบบจัดการสมาชิก รวมถึงกลยุทธ์การนำเข้าข้อมูล (Import)

## 1. ผังหน้าจอ (User Interface Map)

| หน้าจอ | เส้นทาง (Route) | ฟีเจอร์หลัก | ตารางที่เกี่ยวข้อง |
|:---|:---|:---|:---|
| **User Management** | `/manage/users` | แสดงรายชื่อสมาชิกทั้งหมด, กรองข้อมูล, ค้นหา | `users` |
| **User Detail / Edit** | `/manage/users/edit?uid=...` | แก้ไขข้อมูลสมาชิก (Role, status, phone, etc.) | `users` |
| **Smart Import** | `/manage/users/import` | นำเข้าสมาชิกรายชื่อยกชั้น หรือบุคลากร | `users` |

---

## 2. ระบบนำเข้าข้อมูลอัจฉริยะ (Smart Import Logic)

ระบบนำเข้าข้อมูลผ่านไฟล์ (CSV/Excel) ต้องมีขั้นตอนตรวจสอบข้อมูลซ้ำ:
1. **Parsing:** อ่านข้อมูลจากไฟล์ที่อัปโหลด
2. **Duplicate Check:** ตรวจสอบ `email` และ `idCode` เทียบกับที่มีอยู่ในชีต `users`
3. **Admin Choice:** แอดมินต้องตัดสินใจเลือก Actions:
   - **Skip:** ไม่เพิ่มข้อมูลที่มีอยู่ในระบบแล้ว
   - **Overwrite:** อัปเดตข้อมูลใหม่ทับข้อมูลเก่า (เช่น กรณีเลื่อนชั้นหรือเปลี่ยนตำแหน่ง)
4. **Validation:** ข้อมูลทุกแถวต้องผ่านฟังก์ชัน `validateUser()` ในหลังบ้านก่อนบันทึก
5. **Report:** สรุปผลหลัง Import (จำนวนที่สำเร็จ, จำนวนที่ซ้ำ, และรายการที่ Error)

---

## 3. กฎการตรวจสอบสถานะ (Status & Auth Logic)

- **Role Management:**
  - เปลี่ยน `role` หรือ `groupType` ต้องเช็คความสัมพันธ์ตาม `SCHEMA_USERS.md`
- **Status Control:**
  - `active` / `inactive` / `suspended` (สามารถเปลี่ยนสถานะได้จากหน้า List หรือ Detail)
  - กรณีสมาชิกถูก `suspended` ระบบหลังบ้านต้องบล็อกการใช้งานทันที

---

## 4. รายละเอียดหน้าจอ (Detailed Specifications)

### 4.1 หน้าหลัก: User Management (`/manage/users`)
- **Display:** ตารางแสดง `displayName`, `email`, `role`, `status`
- **Actions:** ปุ่ม [แก้ไข], [ระงับการใช้งาน], [ลบ (Archive)]

### 4.2 หน้า: Smart Import (`/manage/users/import`)
- **Display:** พื้นที่อัปโหลดไฟล์ (Drag & Drop) และปุ่ม "ตรวจสอบข้อมูล"
- **Process:** 
  1. แสดง Preview ข้อมูลที่จะ Import
  2. ไฮไลท์แถวที่ซ้ำ หรือแถวที่ข้อมูลไม่ครบ
  3. ปุ่ม "ยืนยันการนำเข้า" หลังจากแอดมินยืนยันข้อมูลแล้ว

---

## 5. การจัดการข้อมูลซ้ำ (Conflict Strategy)
เมื่อพบ `email` หรือ `idCode` ซ้ำ:
- ระบบจะไม่ทำการ Insert แถวนั้นทันที แต่จะเก็บแยกไว้ในหมวด "ข้อมูลซ้ำ (Conflicts)" ให้แอดมินตัดสินใจว่าจะข้าม หรือเขียนทับ
