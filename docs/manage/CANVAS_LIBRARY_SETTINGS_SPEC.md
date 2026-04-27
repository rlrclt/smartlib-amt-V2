# Canvas Specification: Library Hours & Settings (`/manage/settings/library`)

เอกสารนี้ใช้สำหรับเป็นคู่มือ (Prompt/Spec) ให้กับ AI เพื่อสร้างหน้าตั้งค่าเวลาทำการของห้องสมุดสำหรับแอดมิน

---

## 1. เป้าหมายการออกแบบ (UI/UX Goals)
- **Precise Control**: กำหนดเวลาเปิด-ปิดได้ละเอียดรายวัน
- **Flexibility**: รองรับการกำหนดข้อยกเว้น (Exceptions) สำหรับวันที่มีกิจกรรมพิเศษ
- **Visibility**: แสดงสถานะปัจจุบันของห้องสมุดและจำนวนคนอย่างเด่นชัด

---

## 2. โครงสร้างสถานะ (State Management)
```javascript
const STATE = {
  regularHours: [
    { day: 1, open: '08:30', close: '16:30', isOpen: true },
    // ...
  ],
  exceptions: [], // { date: '2026-06-15', open: '08:30', close: '21:00', reason: 'สัปดาห์กิจกรรม' }
  isLoading: true
};
```
