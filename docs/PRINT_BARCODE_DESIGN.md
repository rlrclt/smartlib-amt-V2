# Barcode Printing System Design: smartlib-amt (FINAL - 3-Column Layout)

เอกสารนี้กำหนดมาตรฐานการพิมพ์สติ๊กเกอร์หนังสือ โดยเน้นการทำงานแบบ 3-Column Layout เพื่อให้แอดมินเห็นภาพรวมของตะกร้าตลอดเวลา

---

## 1. มาตรฐานเทคนิค (Technical Standards)
- **Barcode Type:** Code 128
- **Barcode Settings:** `width: 2`, `height: 60`, `margin: 5`
- **Constraint:** ห้ามใช้ CSS `transform: scale()` หรือยืดภาพด้วย CSS เด็ดขาด
- **Rendering:** ใช้ CSS `svg { shape-rendering: crispEdges; }`

## 2. โครงสร้างหน้าจอ (UI Layout: 3-Column System)

| ส่วน | สัดส่วน | หน้าที่ |
|:---|:---|:---|
| **ซ้าย (Catalog)** | 25% | เลือก "ชื่อหนังสือแม่" (ดึงจาก `books_catalog`) |
| **กลาง (Inventory)** | 40% | แสดง "รายการเล่มย่อย" (`book_items`) ของหนังสือที่เลือก พร้อม Checkbox |
| **ขวา (Cart)** | 35% | แสดง "รายการในตะกร้า" (รายการที่เตรียมสั่งพิมพ์) พร้อมปุ่ม `[ไปหน้าพิมพ์]` |

---

## 3. การจัดการหน้าพิมพ์ (Print-Specific Architecture)
- **CSS Separation:** แยกไฟล์ `print.css` สำหรับ `media="print"` เท่านั้น
- **Margin Control:** 
  - ล้าง Browser default margin ใน `@page`
  - ใช้ `margin: 8mm` สำหรับเนื้อหา
- **Layout Strategy:** ห้ามใช้ Flexbox/Grid ในการจัด Layout ของสติ๊กเกอร์ ให้ใช้ `display: inline-block` และระบุ `width`/`height` ตายตัว (mm)

## 4. นโยบายการพิมพ์ (Print Policy)
- **User Notification:** แจ้งแอดมินให้ตั้งค่า **"Scale: 100%"** หรือ **"Actual size"** ใน Print Dialog
- **Batch Limit:** พิมพ์ได้สูงสุดครั้งละ 100 ดวงต่อการกดสั่ง
- **Zero UI Rule:** หน้าจอพิมพ์ต้องใช้ `@media print` ซ่อน Navbar/Footer/Sidebar/Buttons อัตโนมัติ

## 5. การจัดการหน้าจอและ UI Layout (Responsive)
- **Fluid Growth:** ห้ามใช้ Fixed Height ใน Container หลัก ให้ใช้ `min-h-screen` และปล่อยให้เนื้อหาไหลลงล่างตามธรรมชาติ
- **Responsive Stacking:**
  - **Desktop:** แบ่งเป็น 3 Column (ใช้ `flex flex-row gap-6`)
  - **Mobile:** เรียงต่อกันเป็น Stack (ตะกร้าอยู่บน/ล่าง ตามความเหมาะสม)
- **Sticky Side Panel:** ฝั่งขวา (Cart) ควรใช้ `sticky top-24` เพื่อให้แอดมินกดสั่งพิมพ์ได้ตลอดเวลาแม้รายการจะยาว
