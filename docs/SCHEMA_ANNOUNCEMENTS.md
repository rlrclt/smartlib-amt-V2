# Schema: announcements (Google Sheet)

เอกสารฉบับนี้กำหนดโครงสร้างตารางสำหรับระบบประกาศและข่าวสาร (Announcements/Quest Board) ในระบบ smartlib-amt

## 1. รายละเอียดคอลัมน์ (Columns Definition)

| Column | Field Name    | Type         | Description                        | Example                         | Required |
|:-------|:--------------|:-------------|:-----------------------------------|:--------------------------------|:---------|
| A      | id            | String       | Unique ID สำหรับประกาศ              | `ann_001`                       | ✅       |
| B      | title         | String       | หัวข้อประกาศ (Quest Title)          | `ปิดปรับปรุงระบบชั่วคราว`         | ✅       |
| C      | summary       | String       | เนื้อหาโดยย่อ (แสดงในหน้าการ์ด)      | `แจ้งปิดปรับปรุงระบบในวันที่...`   | ✅       |
| D      | body          | String (HTML)| เนื้อหาแบบละเอียด (แสดงใน Modal)     | `<p>ระบบจะปิดปรับปรุง...</p>`   | ✅       |
| E      | category      | Enum         | หมวดหมู่: `Event`, `Notice`, `Update`| `Update`                        | ✅       |
| F      | author        | String       | ชื่อผู้ประกาศ (UID หรือชื่อ)          | `Admin Somchai`                 | ✅       |
| G      | status        | Enum         | สถานะ: `draft`, `published`, `archived`| `published`                     | ✅       |
| H      | pin           | Boolean      | ปักหมุดให้อยู่ลำดับแรกหรือไม่            | `TRUE` / `FALSE`                | ✅       |
| I      | photoURL      | String       | ลิงก์รูปภาพประกอบ (ถ้ามี)              | `https://.../news.jpg`          | ⚠️       |
| J      | publishDate   | Date         | วันที่ต้องการให้เริ่มแสดงผล            | `2024-05-25`                    | ✅       |
| K      | expiryDate    | Date         | วันที่ให้สิ้นสุดการแสดงผล (ถ้ามี)       | `2024-05-30`                    | ⚠️       |
| L      | createdAt     | ISO8601      | วันที่สร้างข้อมูล                    | `2024-05-20T10:00:00Z`          | ✅       |
| M      | updatedAt     | ISO8601      | วันที่แก้ไขล่าสุด                    | `2024-05-21T08:00:00Z`          | ✅       |
| N      | viewCount     | Number       | จำนวนครั้งที่ผู้ใช้เปิดอ่านประกาศ      | `128`                           | ✅       |

---

## 2. กฎการแสดงผล (Display Logic)

เพื่อให้ระบบ Quest Board แสดงผลได้ถูกต้อง:
1. **Filtering:** แสดงเฉพาะประกาศที่มี `status == "published"` เท่านั้น
2. **Date Range:** แสดงผลหากวันที่ปัจจุบันอยู่ระหว่าง `publishDate` และ `expiryDate` (หากไม่มี `expiryDate` ให้แสดงตลอดไป)
3. **Sorting:** 
   - ลำดับที่ 1: ประกาศที่ `pin == TRUE` (เรียงตาม `updatedAt` ล่าสุด)
   - ลำดับที่ 2: ประกาศทั่วไป เรียงตาม `publishDate` ล่าสุดลงไปหาเก่า

---

## 3. การจัดการโดยแอดมิน (Admin Actions)

ในส่วนจัดการแอดมิน (`/manage/announcements`) จะต้องมีฟังก์ชัน:
- **Create:** สร้างประกาศใหม่ โดยระบบจะ Auto-generate `id` และ `createdAt`
- **Edit:** แก้ไขเนื้อหาและสถานะ โดยระบบจะอัปเดต `updatedAt`
- **Archive:** เปลี่ยนสถานะเป็น `archived` เพื่อซ่อนประกาศแทนการลบจริง (Soft Delete)
