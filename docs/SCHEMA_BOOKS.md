# Schema: Books System (Google Sheet) - UPDATED

เอกสารฉบับนี้กำหนดโครงสร้างฐานข้อมูลสำหรับระบบจัดการหนังสือ โดยแบ่งเป็น 2 ส่วนหลักคือ ข้อมูลบรรณานุกรม (รหัสแม่) และ ข้อมูลเล่มหนังสือจริง (รหัสลูก)

---

## 1. ข้อมูลบรรณานุกรม: `books_catalog` (รหัสแม่)

| Column | Field Name   | Type   | Description                        | Example                         |
|:-------|:-------------|:-------|:-----------------------------------|:--------------------------------|
| **A**  | `bookId`     | String | **รหัสแม่ (Internal ID)**           | `BK-001`                        |
| **B**  | `isbn`       | String | รหัส ISBN                          | `978-616-xxx-xxx-x`             |
| **C**  | `title`      | String | ชื่อหนังสือ                        | `การเขียนโปรแกรม JavaScript`    |
| **D**  | `author`     | String | ชื่อผู้แต่ง                        | `สมชาย สายโค้ด`                |
| **E**  | `publisher`  | String | สำนักพิมพ์                        | `ไอที บุ๊คส์`                   |
| **F**  | `category`   | Enum   | หมวดหมู่                           | `เทคโนโลยี`                     |
| **G**  | `callNumber` | String | เลขเรียกหนังสือ                     | `005.133 ส234ก`                 |
| **H**  | `edition`    | String | พิมพ์ครั้งที่                       | `1/2567`                        |
| **I**  | `language`   | Enum   | ภาษา (ไทย, อังกฤษ, ฯลฯ)             | `ไทย`                           |
| **J**  | `coverUrl`   | String | ลิงก์รูปภาพหน้าปก                  | `https://.../cover.jpg`         |
| **K**  | `description`| String | เรื่องย่อ / รายละเอียด              | `สอนพื้นฐานตั้งแต่ต้น...`       |
| **L**  | `tags`       | String | คำค้นหาเพิ่มเติม                    | `JS, Web, Coding`               |
| **M**  | `price`      | Number | ราคาหน้าปก                         | `350.00`                        |
| **N**  | `status`     | Enum   | `active`, `archived`               | `active`                        |
| **O**  | `createdAt`  | ISO8601| วันที่เพิ่มเข้าระบบ                 | `2024-05-20T10:00:00Z`          |

---

## 2. ข้อมูลเล่มหนังสือ: `book_items` (รหัสลูก)

| Column | Field Name     | Type   | Description                               | Example               |
|:-------|:---------------|:-------|:------------------------------------------|:----------------------|
| **A**  | `barcode`      | String | **รหัสลูก (ID-Sequence)**                 | `BK-001-01`           |
| **B**  | `bookId`       | String | เชื่อมกับรหัสแม่ (Foreign Key)             | `BK-001`              |
| **C**  | `status`       | Enum   | `available`, `borrowed`, `lost`, `damaged`, `reserved`| `available`           |
| **D**  | `location`     | String | ที่เก็บ (ชั้น/ตู้)                         | `ชั้น A1-02`          |
| **E**  | `purchasePrice`| Number | ราคาที่ซื้อมา                              | `250.00`              |
| **F**  | `condition`    | Enum   | สภาพเล่ม: `good`, `fair`, `poor`          | `good`                |
| **G**  | `activeLoanId` | String | ไอดีการยืมปัจจุบัน (ถ้ามี)                  | `LN-889`              |
| **H**  | `notes`        | String | หมายเหตุเฉพาะเล่ม                         | `มีรอยปากกาหน้า 5`     |
| **I**  | `createdAt`    | ISO8601| วันที่รับเล่มนี้เข้าห้องสมุด               | `2024-05-20T10:00:00Z`|
| **J**  | `updatedAt`    | ISO8601| อัปเดตล่าสุด                               | `2024-05-21T08:00:00Z`|

---

## 3. กฎเหล็กของรหัส (ID Persistence Rules)
1. **Never Reuse ID:** รหัส `bookId` และ `barcode` ที่เคยสร้างแล้ว ห้ามนำกลับมาใช้ใหม่เด็ดขาด
2. **Barcode Format:** บังคับรูปแบบ `[bookId]-[Sequence]` เพื่อป้องกันความสับสน
3. **Soft Delete Only:** ห้ามลบแถวข้อมูลจริง ให้ใช้การ Archive เพื่อรักษาประวัติการยืม
