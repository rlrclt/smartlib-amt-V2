# แผนการออกแบบ: หน้าจอค้นหาและคลังหนังสือ (Member Books Catalog Design)

> ⚠️ **เงื่อนไขสำคัญก่อนเริ่มดำเนินการ (Prerequisite)**:
> ผู้พัฒนา **ต้องอ่านและทำความเข้าใจ** เอกสาร [Native Web Application.md](../theme-Design/%20Native%20Web%20Application.md) อย่างละเอียดก่อนเริ่มการ Implement ทุกครั้ง เพื่อให้มั่นใจว่า UX/UI และประสิทธิภาพของหน้าจอนี้เป็นไปตามมาตรฐาน Native Web App 100%

เอกสารนี้ระบุรายละเอียดการพัฒนาหน้าจอ `/app/books` สำหรับสมาชิก โดยเน้นประสบการณ์แบบ **Native Web Application** (เร็ว, ลื่น, สวยงาม) ตามมาตรฐานที่กำหนดไว้ใน `Native Web Application.md`

## 1. แนวคิดการออกแบบ (UX Concepts)

### 1.1 Visual-First Browsing
- **Book Covers as Primary**: เน้นการแสดงผลด้วย "รูปหน้าปกหนังสือ" ขนาดใหญ่ (Aspect Ratio 3:4) แทนการใช้ข้อความล้วน เพื่อให้ดูน่าสนใจและเหมือนแอปคลังสื่อชั้นนำ
- **Grid Layout (Default)**: แสดงผลแบบตาราง 2 คอลัมน์บนมือถือ และ 3-5 คอลัมน์บนหน้าจอใหญ่
- **List View (Optional)**: มีปุ่มสลับเป็นแบบรายการสำหรับผู้ที่ต้องการอ่านรายละเอียดรวดเร็ว

### 1.2 Native Interaction
- **Smooth Transitions**: ใช้ `View Transitions API` หรือ CSS Animation เพื่อให้การคลิกจากหน้าคลังไปยังหน้าละเอียดดูต่อเนื่อง (Seamless)
- **Touch Feedback**: เมื่อแตะที่การ์ดหนังสือ จะมี Effect ย่อตัวเล็กน้อย (`scale(0.98)`) และ Shimmer highlight
- **Bottom Sheet Details**: เมื่อคลิกที่หนังสือ จะไม่เปลี่ยนหน้าใหม่ แต่จะแสดงผลแบบ **Bottom Sheet** (เลื่อนขึ้นจากด้านล่าง) ในมือถือ หรือ **Side Panel** ในคอมพิวเตอร์ เพื่อให้ดูรายละเอียดและสถานะเล่ม

---

## 2. โครงสร้างหน้าจอ (UI Components)

### 2.1 แถบค้นหาและตัวกรอง (Search & Filter Bar)
- **Sticky Header**: แถบค้นหาจะติดอยู่ที่ส่วนบนเสมอเมื่อเลื่อนหน้าจอ
- **Quick Filters**: ชิป (Chips) สำหรับกรองตามหมวดหมู่ (เช่น เทคโนโลยี, วรรณกรรม, ภาษา)
- **Search Logic**: ค้นหาแบบ Real-time (Debounce 300ms) จากชื่อหนังสือ หรือชื่อผู้แต่ง

### 2.2 การ์ดหนังสือ (Book Card Component)
- **Cover Image**: ใช้ระบบ Lazy Loading และมี Placeholder เป็นรูปเงาสีเทา (Skeleton)
- **Status Badge**: แสดงสถานะมุมภาพ (เช่น `ว่าง`, `ถูกยืม`, `จองแล้ว`)
- **Metadata**: แสดงชื่อหนังสือ (Title) ไม่เกิน 2 บรรทัด และชื่อผู้แต่ง (Author) ขนาดเล็ก

### 2.3 รายละเอียดหนังสือ (Details Overlay)
เมื่อ User คลิกที่การ์ด ระบบจะแสดงข้อมูลจาก `books_catalog` และ `book_items`:
- **Header**: รูปปกใหญ่, ชื่อหนังสือ, ผู้แต่ง, หมวดหมู่
- **Description**: เรื่องย่อ (ขยายดูเพิ่มได้)
- **Availability Section**: รายการเล่มที่มี (Items) พร้อมที่เก็บ (Location) และสถานะจริง
- **Action Button**: ปุ่ม "จองหนังสือ" (ถ้าเล่มไม่ว่าง) หรือ "ยืมด้วยตนเอง" (ถ้าอยู่ในเขต Geofencing)

---

## 3. ลำดับขั้นตอนการทำงาน (Step-by-Step Logic)

1.  **Initialize**: โหลดข้อมูล `books_catalog` ทั้งหมดมาเก็บใน Memory (Cache) เพื่อการค้นหาที่รวดเร็ว
2.  **Display**: Render การ์ดหนังสือโดยเน้นรูปปก
3.  **Search/Filter**: เมื่อ User พิมพ์หรือเลือกหมวดหมู่ ระบบจะกรอง Array ใน Memory และ Re-render ทันที (ไม่โหลดหน้าใหม่)
4.  **View Details**:
    - User คลิกที่การ์ด
    - ระบบเรียก API `book_items_list` เพื่อดึงสถานะเล่มจริงล่าสุด
    - แสดง Bottom Sheet พร้อมข้อมูลครบถ้วน
5.  **Navigation**: สามารถกดปุ่ม "ยืมเล่มนี้" เพื่อนำทางไปยังหน้า `/app/loan-self` พร้อมส่งรหัสเล่มไปทันที

---

## 4. มาตรฐานเชิงเทคนิค (Technical Specs)

- **Typography**: ใช้ `Bai Jamjuree` พร้อมน้ำหนัก 700 สำหรับชื่อเรื่อง
- **Color Tokens**:
    - **Active Background**: `--brand-50`
    - **Primary Text**: `--text-strong`
    - **Status Color**: Green (Available), Rose (Borrowed), Amber (Reserved)
- **Performance**:
    - **Image Optimization**: ใช้ CSS `object-fit: cover`
    - **Scroll**: 60fps พร้อม `overscroll-behavior: contain`

---

## 5. ความเชื่อมโยงข้อมูล (Data Connectivity)
- **`books_catalog`**: ข้อมูลหลัก (ชื่อ, ปก, เรื่องย่อ)
- **`book_items`**: ข้อมูลสถานะจริง (Available/Borrowed)
- **`reservations`**: เช็คคิวการจองสำหรับหนังสือเล่มนั้นๆ
