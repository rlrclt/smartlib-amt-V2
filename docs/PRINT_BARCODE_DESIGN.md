# Barcode Printing System Design: smartlib-amt (FINAL)

เอกสารนี้กำหนดมาตรฐานการพิมพ์สติ๊กเกอร์หนังสือ โดยแก้ปัญหาทางเทคนิคเรื่องขนาด, ความคมชัด และการแสดงผลเมื่อพิมพ์จริง

---

## 1. มาตรฐานเทคนิค (Technical Standards)
- **Barcode Type:** Code 128
- **Barcode Settings:**
  - `width`: 2, `height`: 60, `margin`: 5, `displayValue`: true
  - **Constraint:** ห้ามใช้ CSS `transform: scale()` หรือยืดภาพด้วย CSS โดยเด็ดขาด
  - **Rendering:** ใช้ CSS `svg { shape-rendering: crispEdges; }`

## 2. การจัดการหน้าพิมพ์ (Print-Specific Architecture)
- **CSS Separation:** แยกไฟล์ `print.css` สำหรับ `media="print"` เท่านั้น
- **Margin Control:** 
  - ล้าง Browser default margin ใน `@page`
  - ใช้ `margin: 8mm` หรือกำหนดเองในส่วนของเนื้อหาแทน
- **Layout Strategy:** ไม่ใช้ Flexbox/Grid ในการจัด Layout ของสติ๊กเกอร์ ให้ใช้ `display: inline-block` และระบุ `width`/`height` ตายตัว (mm)

## 3. ขนาดสติ๊กเกอร์และเครื่องพิมพ์
- **Thermal Printer:** (แนะนำ) ระบุ `size: 60mm 30mm` ใน CSS `@page` ให้ตรงตามขนาดสติ๊กเกอร์
- **A4 Sticker Sheet:** หากจำเป็นต้องใช้ ให้ใช้การกำหนด `@page` เป็น A4 และใช้เทคนิค `inline-block` วางเรียงเลเบล

## 4. กฎการใช้งาน (User & System Instructions)
1. **User Notification:** แจ้งแอดมินก่อนสั่งพิมพ์เสมอให้ตั้ง **"Scale: 100%"** หรือ **"Actual size"** ใน Print Dialog ของ Browser
2. **Library Loading:** ต้อง Bundle `JsBarcode` เข้ากับโปรเจกต์ (Local) เพื่อป้องกันเน็ตล่ม
3. **Safety Limit:** พิมพ์ได้สูงสุดครั้งละ 100 ดวง (ป้องกัน Browser ค้าง)

## 5. ตรรกะการพิมพ์ (Workflow)
1. **Selection:** เลือกบาร์โค้ดจากหน้า `Item Inventory`
2. **Preview:** เปิดหน้าต่างใหม่พร้อม CSS `print.css`
3. **Execution:** สั่ง `window.print()`
