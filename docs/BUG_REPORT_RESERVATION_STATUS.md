# Bug Report: การแสดงผลสถานะ "reserved" ผิดพลาดเป็น "damaged"

**วันที่รายงาน**: 2026-04-26
**สถานะ**: แก้ไขแล้ว (Fixed)
**ความรุนแรง**: ปานกลาง (Medium) - ส่งผลต่อความเข้าใจผิดของเจ้าหน้าที่ในการจัดการคลังหนังสือ

---

## 🔍 รายละเอียดปัญหา
ในระบบการจองใหม่ เมื่อหนังสือถูกเปลี่ยนสถานะเป็น `reserved` (จองแล้ว) หน้าจอจัดการรายการเล่มย่อย (`/manage/view_book_items`) กลับแสดงผลเป็นสถานะ **"damaged"** (ชำรุด) ทั้งในรูปแบบ Badge และในรายการเลือก (Select Box)

### สาเหตุ (Root Cause)
จากการตรวจสอบไฟล์ `public/app/views/manage/view_book_items.view.js` พบว่าฟังก์ชัน `renderStatusBadge` มีตรรกะการทำงานดังนี้:
```javascript
function renderStatusBadge(status) {
  const key = String(status || "").toLowerCase();
  if (key === "available") return '...available...';
  if (key === "borrowed") return '...borrowed...';
  if (key === "lost") return '...lost...';
  return '...damaged...'; // ⬅️ ตรงนี้คือปัญหา: ถ้าไม่ใช่ 3 สถานะแรก จะตกลงมาที่ damaged ทันที
}
```
เนื่องจากสถานะ `reserved` เป็นสถานะใหม่ที่พึ่งเพิ่มเข้ามาในระบบการจอง จึงทำให้ระบบแสดงผลเป็นสถานะเริ่มต้น (Default fallback) ซึ่งในโค้ดเดิมเขียนไว้เป็น "damaged"

---

## 🛠️ รายการแก้ไข (Fixes Applied)

### 1. แก้ไข Frontend UI
- **ไฟล์**: `public/app/views/manage/view_book_items.view.js`
- **การเปลี่ยนแปลง**:
    - อัปเดตฟังก์ชัน `renderStatusBadge` ให้รองรับสถานะ `reserved` (ใช้สี Indigo-50/700)
    - เพิ่มตัวเลือก `reserved` ในตารางแก้ไขสถานะ (Table View) และการ์ดรายละเอียด (Card View) เพื่อให้เจ้าหน้าที่เห็นและจัดการได้ถูกต้อง

### 2. แก้ไข Backend Logic
- **ไฟล์**: `apps_script/Module_Books.gs`
- **การเปลี่ยนแปลง**: เพิ่ม `reserved` ลงในค่าคงที่ `BOOK_ITEM_STATUSES` เพื่อให้ระบบตรวจสอบข้อมูล (Validation) ยอมรับค่านี้เมื่อมีการบันทึกจากหน้าเว็บ

### 3. ตรวจสอบระบบ Inventory
- **ไฟล์**: `apps_script/Module_Books.gs` (ฟังก์ชัน `buildInventoryMap_`)
- **การยืนยัน**: ระบบจะนับจำนวน "พร้อมยืม" (Available) เฉพาะเล่มที่สถานะเป็น `available` เท่านั้น ดังนั้นเล่มที่ติดจอง (`reserved`) จะไม่ถูกนำไปนับรวมให้สมาชิกทั่วไปเห็นว่าว่าง ซึ่งเป็นพฤติกรรมที่ถูกต้องตามแผนการออกแบบ

---

## ✅ การตรวจสอบความถูกต้อง (Verification)
1. เข้าหน้าจอ `/manage/view_book_items?bookId=BK-001`
2. ตรวจสอบเล่มที่ติดจอง: ต้องแสดง Badge สีน้ำเงิน/ม่วง คำว่า **"reserved"** อย่างถูกต้อง
3. ตรวจสอบเมนูเลือกสถานะ: ต้องมีตัวเลือก **"reserved"** ปรากฏอยู่และถูกเลือกไว้
4. ตรวจสอบหน้า Catalog: จำนวนเล่ม "พร้อมยืม" ต้องลดลงตามจำนวนเล่มที่ถูกจองไป

---

## 📌 ข้อแนะนำเพิ่มเติม
ในอนาคต หากมีการเพิ่มสถานะใหม่ (เช่น `repairing` หรือ `donated`) ควรปรับตรรกะใน `renderStatusBadge` ให้มีสถานะ "Unknown" หรือ "Other" แทนที่จะ Fallback ไปที่สถานะที่มีความหมายเฉพาะเจาะจงอย่าง "damaged" เพื่อป้องกันความสับสน
