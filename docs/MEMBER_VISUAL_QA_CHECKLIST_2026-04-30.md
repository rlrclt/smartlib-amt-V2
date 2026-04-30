# Member Visual QA Checklist (Mobile / Tablet / Desktop)

อัปเดตล่าสุด: 2026-04-30  
ขอบเขต: ตรวจความสอดคล้องระยะ/โครงสร้างของฝั่ง `member` ให้ทำงานร่วมกับ `member_shell.js`

## Baseline ที่ใช้ตรวจ

- Header จาก `member_shell.js` ต้องเป็นตัวกำหนด top rhythm
- ทุกหน้าฝั่ง member ต้องอยู่ใน `layout: "member"`
- Root wrapper ของแต่ละหน้าใช้ `member-page-container`
- ระยะแนวนอนมาตรฐาน:
  - mobile: `px-3`
  - tablet: `sm:px-4`
  - desktop: `lg:px-6`
- ระยะด้านล่าง:
  - mobile: เผื่อ `bottom nav` (`pb` มาตรฐานใน container)
  - desktop: ลดเป็น `lg:pb-6`

---

## Viewport ที่ใช้เป็น checklist

- Mobile: `390x844` (iPhone class)
- Tablet: `768x1024`
- Desktop: `1440x900`

---

## Checklist รายหน้า

### 1) `/app` (Dashboard)
- [x] อยู่ใต้ `layout: member`
- [x] root ใช้ `member-page-container`
- [x] ไม่มีการซ้อน horizontal padding ระดับ root
- [ ] Mobile: ตรวจ card ไม่ชน bottom nav
- [ ] Tablet: ตรวจ spacing ซ้าย/ขวาเท่าหน้า books
- [ ] Desktop: ตรวจ top spacing เทียบ loans/fines

### 2) `/app/books`
- [x] root ใช้ `member-page-container`
- [x] spacing แนวนอนตามมาตรฐาน
- [ ] Mobile: ตรวจ sheet/detail panel ไม่ชน nav
- [ ] Tablet: ตรวจ grid breakpoints (2 คอลัมน์)
- [ ] Desktop: ตรวจ grid breakpoints (3-5 คอลัมน์ตามขนาด)

### 3) `/app/loans`
- [x] root ใช้ `member-page-container`
- [x] spacing แนวนอนตามมาตรฐาน
- [ ] Mobile: ตรวจปุ่ม/segment ไม่ชนขอบ
- [ ] Tablet: ตรวจ hero + list rhythm
- [ ] Desktop: ตรวจความสูง hero ไม่เพี้ยนจาก fines

### 4) `/app/fines`
- [x] root ใช้ `member-page-container`
- [x] spacing แนวนอนตามมาตรฐาน
- [ ] Mobile: ตรวจ list และ badges ไม่ชน nav
- [ ] Tablet: ตรวจระยะ section เทียบ loans
- [ ] Desktop: ตรวจ alignment กับ member header

### 5) `/app/loan-self`
- [x] root ใช้ `member-page-container`
- [x] bottom action bar ถูกยกเป็น `bottom-20` บน mobile และ `lg:bottom-4`
- [ ] Mobile: ตรวจ bottom bar ไม่ทับ nav + scanner sheet
- [ ] Tablet: ตรวจ panel ขั้นตอน 1-2-3 ไม่ล้น
- [ ] Desktop: ตรวจ max width (`max-w-5xl`) อยู่กึ่งกลาง

### 6) `/app/checkin`
- [x] route ใช้ `layout: member`
- [x] view ใช้ `member-page-container`
- [x] root ตัด padding ซ้ำที่เคยทำ spacing เพี้ยน
- [ ] Mobile: ตรวจ sticky action area ไม่ทับ nav
- [ ] Tablet: ตรวจ two-column card layout
- [ ] Desktop: ตรวจ card spacing เทียบ dashboard

### 7) `/app/reservations`
- [x] root ใช้ `member-page-container`
- [x] FAB ย้ายเป็น `bottom-24` (mobile) / `lg:bottom-6`
- [ ] Mobile: ตรวจ FAB ไม่ชน bottom nav ทุกสถานะ
- [ ] Tablet: ตรวจ booking sheet overlap
- [ ] Desktop: ตรวจ FAB ตำแหน่งขวาล่างนิ่ง

### 8) `/app/profile`
- [x] root ใช้ `member-page-container`
- [ ] Mobile: ตรวจ profile card + fine card spacing
- [ ] Tablet: ตรวจ 2-column profile grid
- [ ] Desktop: ตรวจ top row และ action buttons

### 9) `/profile/edit`
- [x] route ใช้ `layout: member`
- [x] root ใช้ `member-page-container`
- [ ] Mobile: ตรวจฟอร์มไม่ล้น/ไม่ชน nav
- [ ] Tablet: ตรวจ preview + form spacing
- [ ] Desktop: ตรวจ alignment กับ `/app/profile`

### 10) `/profile/change-password`
- [x] route ใช้ `layout: member`
- [x] root ใช้ `member-page-container`
- [ ] Mobile: ตรวจปุ่ม submit/กลับไม่ชน nav
- [ ] Tablet: ตรวจ hero + form spacing
- [ ] Desktop: ตรวจ alignment กับ `/profile/edit`

---

## สรุปสถานะ (รอบนี้)

- ✅ **Code-level QA ผ่าน**: โครง route + shell + root wrapper ของทุกหน้า member อยู่ในมาตรฐานเดียวกันแล้ว
- ⏳ **Visual runtime QA**: ต้องเปิดเบราว์เซอร์เช็คทีละ viewport ตาม checklist ด้านบน เพื่อปิดงาน final pixel QA

---

## ลำดับทดสอบแนะนำ (เร็วสุด)

1. Mobile: `/app/checkin` → `/app/loan-self` → `/app/reservations`  
2. Tablet: `/app/dashboard` → `/app/books` → `/app/profile`  
3. Desktop: `/app/loans` → `/app/fines` → `/profile/edit` → `/profile/change-password`

