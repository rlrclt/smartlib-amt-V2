# Canvas Specification: Library Check-in View (`/app/checkin`)

เอกสารนี้ใช้สำหรับเป็นคู่มือ (Prompt/Spec) ให้กับ AI เพื่อสร้างหน้าจอเช็คอินเข้าใช้ห้องสมุดสำหรับสมาชิก

---

## 1. เป้าหมายการออกแบบ (UI/UX Goals)
- **Extreme Simplicity**: UI โหลดเร็วและกดง่ายที่สุด เนื่องจากสมาชิกต้องสแกน QR ก่อนเข้า
- **Visual Feedback**: มีแอนิเมชันยืนยันเมื่อเช็คอินสำเร็จ
- **Information Persistence**: แสดงสถานะการเช็คอินปัจจุบันค้างไว้บนหน้าจอเพื่อให้สมาชิกแก้ไขกิจกรรมได้

---

## 2. โครงสร้างสถานะ (State Management)
```javascript
const STATE = {
  session: null, // { visitId, checkInAt, activities: [], status: 'active' }
  isLoading: true,
  availableActivities: [
    { id: 'borrow', label: 'ยืม-คืนหนังสือ', icon: 'book-open' },
    { id: 'study', label: 'อ่านหนังสือ/ทำการบ้าน', icon: 'pencil' },
    { id: 'relax', label: 'พักผ่อน/นันทนาการ', icon: 'coffee' }
  ]
};
```

---

## 3. ตัวอย่างโค้ด UI (Tailwind CSS)

```html
<!-- Active Session Banner -->
<div class="m-4 p-6 bg-slate-900 rounded-[2.5rem] text-white overflow-hidden relative shadow-2xl shadow-slate-200">
  <div class="absolute -right-10 -top-10 w-40 h-40 bg-sky-500/20 rounded-full blur-3xl"></div>
  <p class="text-[10px] font-black uppercase tracking-widest text-sky-400 mb-1">เวลาที่ใช้บริการ</p>
  <h2 class="text-4xl font-black mb-4 tabular-nums">01:45:22</h2>
  <div class="flex items-center gap-2 text-xs font-bold text-slate-400">
    <i data-lucide="map-pin" class="w-3.5 h-3.5"></i>
    <span>เช็คอินเมื่อ: 08:30 น.</span>
  </div>
</div>
```
