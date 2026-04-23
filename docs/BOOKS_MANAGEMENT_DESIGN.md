# Books Management Design: smartlib-amt

เอกสารนี้กำหนดโครงสร้างหน้าจอและตรรกะการทำงาน (Logic) ของระบบจัดการหนังสือ โดยอ้างอิงความสัมพันธ์ตาม `SCHEMA_BOOKS.md`

## 1. ผังหน้าจอ (User Interface Map)

| หน้าจอ | เส้นทาง (Route) | ฟีเจอร์หลัก | ตารางที่เกี่ยวข้อง |
|:---|:---|:---|:---|
| **Book Catalog Overview** | `/manage/books` | ค้นหา, ดูจำนวน `พร้อมใช้งาน/ทั้งหมด`, สลับ View ระหว่าง Active/Archived | `books_catalog`, `book_items` |
| **Register New Book** | `/manage/register_books` | ลงทะเบียนครั้งแรก + เจนรหัสลูกชุดแรกอัตโนมัติ | `books_catalog`, `book_items` |
| **Add Book Copies** | `/manage/add_book_items` | เพิ่มจำนวนเล่ม (รหัสลูก) ต่อจากลำดับเดิม | `book_items` |
| **Item Inventory** | `/manage/view_book_items` | ดูรายการรหัสลูกทั้งหมด และปรับปรุงสถานะรายเล่ม | `book_items` |

---

## 2. ตรรกะการทำงานขั้นสูง (Advanced Logic)

### 2.1 การค้นหาแบบสากล (Global Search Logic)
ในหน้า Catalog หากแอดมินทำการ **Scan Barcode** (เช่น `BK-001-05`):
1. ระบบ GAS จะทำการโหลด `book_items` มาค้นหาว่า `barcode` นี้ตรงกับ `bookId` ใด
2. จากนั้นจะทำการ "กระโดด" ไปแสดงข้อมูลของหนังสือแม่เรื่องนั้นให้ทันที

### 2.2 การจัดการข้อมูลขนาดใหญ่ (Performance Strategy)
เพื่อให้ระบบไม่อืดเมื่อมีข้อมูลเกิน 500 รายการ:
- **Filtering:** เริ่มต้นจะดึงเฉพาะแถวที่ `status == "active"` มาแสดงเท่านั้น
- **Limit/Pagination:** มีปุ่ม "โหลดเพิ่ม" (Load More) เพื่อลดภาระการ Render ของเบราว์เซอร์

---

## 3. นโยบายความปลอดภัยและข้อมูล (Safety Policy)

### 3.1 การยกเลิกใช้งาน (Archive & Unarchive)
- **Archive:** เปลี่ยนสถานะแม่เป็น `archived` เพื่อซ่อนจากการใช้งานปกติ (ทำได้เมื่อไม่มีเล่มลูกถูกยืมอยู่)
- **Unarchive:** แอดมินสามารถสลับ View ไปที่รายการ "ประวัติ/ยกเลิกแล้ว" และกดปุ่ม `Undo Archive` เพื่อนำหนังสือกลับมาใช้งานใหม่ได้

### 3.2 การจัดการรหัสลูก (Item Integrity)
- **Barcode Format:** บังคับรูปแบบ `[bookId]-[Sequence]` เสมอ
- **Status "Damaged":** หากเล่มชำรุด ระบบจะล็อคสถานะไม่ให้ปุ่ม "ยืม" ปรากฏ จนกว่าจะมีการซ่อมแซมและเปลี่ยนสถานะกลับเป็น `available`

---

## 4. รายละเอียดหน้าจอและฟังก์ชัน (Detailed Specs)

### 4.1 หน้าหลัก: Book Catalog (`/manage/books`)
*   **Action:** 
    *   `archiveBook()`: Soft delete
    *   `unarchiveBook()`: กู้คืนข้อมูล (Undo Archive)

### 4.2 หน้า: Register New Book (`/manage/register_books`)
*   **Logic:** บันทึก `createdAt` ลงในทั้ง Catalog และ Item พร้อมกัน

### 4.3 หน้า: Item Inventory (`/manage/view_book_items`)
*   **Logic:** แสดงทั้ง `createdAt` (วันที่รับเข้า) และ `updatedAt` (วันที่เคลื่อนไหวล่าสุด)
