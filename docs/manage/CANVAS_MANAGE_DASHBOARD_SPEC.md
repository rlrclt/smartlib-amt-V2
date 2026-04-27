# Canvas Specification: Librarian Dashboard View (`dashboard.view.js`)

เอกสารนี้ใช้สำหรับเป็นคู่มือ (Prompt/Spec) ให้กับ AI (เช่น v0, Cursor, Canvas) เพื่อสร้างหรือปรับปรุงหน้าจอแดชบอร์ดหลักสำหรับบรรณารักษ์ (Librarian Command Center)

---

## 1. เป้าหมายการออกแบบ (UI/UX Goals)
- **High Information Density**: แสดงข้อมูลสำคัญได้ครบถ้วนในหน้าเดียวโดยไม่ดูแออัด
- **Action-Oriented**: เน้นให้บรรณารักษ์เห็นว่า "ต้องทำอะไรต่อ" (เช่น มีคนรอรับหนังสือ, มีสมาชิกใหม่รอยืนยัน)
- **Modern & Professional**: ใช้โทนสีที่น่าเชื่อถือ (Slate, Sky, Indigo) และการจัดวางที่สะอาดตา

---

## 2. โครงสร้างสถานะ (State Management)
```javascript
const STATE = {
  stats: {
    activeLoans: 0,
    overdueBooks: 0,
    availableItems: 0,
    unpaidFines: 0
  },
  pendingTasks: {
    reservations: [], // {resId, bookTitle, userName, holdUntil}
    unverifiedUsers: [], // {uid, displayName, email}
    damagedItems: [] // {barcode, bookTitle, note}
  },
  recentActivities: [], // {type: 'loan'|'return', barcode, userName, timestamp}
  isLoading: true
};
```

---

## 3. ส่วนประกอบหน้าจอหลัก (Component Architecture)

### 3.1 สรุปตัวเลข (Top Stats Grid)
- **Layout**: 4 คอลัมน์บน Desktop, 2 คอลัมน์บน Tablet, 1 คอลัมน์บน Mobile
- **Design**: การ์ดพื้นหลังสีขาว ขอบมนโค้งมนสูง (`rounded-[2rem]`) พร้อมไอคอนสีพาสเทล

### 3.2 รายการงานคั่งค้าง (Pending Action Center)
- **Design**: แบ่งเป็น 2-3 Column ย่อยบนหน้าจอใหญ่
- **Sections**:
    - **"หนังสือพร้อมรับ"**: รายการการจองที่สถานะเป็น `ready` (แสดงแถบความคืบหน้าของเวลาที่เหลือ)
    - **"สมาชิกรอยืนยัน"**: แสดงชื่อและปุ่ม [อนุมัติ] / [ดูรายละเอียด]
- **Visual**: ใช้สี Rose-500 สำหรับ Overdue หรือสิ่งที่ด่วนมาก

### 3.3 ตารางกิจกรรมล่าสุด (Recent Activity Table)
- **Design**: ตารางแบบเรียบง่าย (Clean Table) หรือรายการแบบ Timeline
- **Details**: แสดงประเภทรายการ (ยืม/คืน), ชื่อสมาชิก, และเวลาที่ทำรายการ (Time ago)

### 3.4 ทางลัดด่วน (Quick Links Panel)
- **Design**: ปุ่มขนาดกะทัดรัดพร้อมไอคอนเด่นชัด จัดวางเป็นตารางหรือแนวนอน

---

## 4. ตัวอย่างโค้ด UI (Tailwind CSS)

```html
<!-- Example: Stats Card -->
<div class="bg-white p-6 rounded-[2rem] border border-sky-50 shadow-sm hover:shadow-md transition-all">
  <div class="flex justify-between items-start mb-4">
    <div class="bg-rose-50 p-3 rounded-2xl text-rose-500">
      <i data-lucide="alert-circle" class="w-6 h-6"></i>
    </div>
    <span class="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-full">+3 เล่มใหม่</span>
  </div>
  <p class="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">เกินกำหนดคืน</p>
  <h3 class="text-3xl font-black text-slate-800">14</h3>
</div>

<!-- Example: Action Item List -->
<div class="bg-white rounded-[2.5rem] border border-slate-100 p-6 shadow-sm">
  <div class="flex items-center justify-between mb-6">
    <h3 class="text-sm font-black text-slate-800 uppercase tracking-widest">การจองพร้อมรับ (5)</h3>
    <button class="text-xs font-bold text-sky-600">ดูทั้งหมด</button>
  </div>
  <div class="space-y-3">
    <div class="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
      <div class="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-xs font-black">1</div>
      <div class="flex-1 min-w-0">
        <p class="text-[11px] font-black text-slate-800 truncate">จิตวิทยาการลงทุน (คุณสมชาย)</p>
        <p class="text-[9px] font-bold text-rose-500 uppercase">เหลือเวลาอีก 4 ชม.</p>
      </div>
      <button class="p-2 bg-slate-900 text-white rounded-lg"><i data-lucide="chevron-right" class="w-3 h-3"></i></button>
    </div>
  </div>
</div>
```

---

## 5. ตรรกะการประมวลผล (Frontend Logic Spec)
- **Auto-Refresh**: รีเฟรชข้อมูลทุกๆ 15 นาทีอัตโนมัติหากหน้าจอถูกเปิดทิ้งไว้
- **Global Search Integration**: ช่องค้นหาใน Sidebar/Header ควรสามารถค้นหาบาร์โค้ดได้ทันที และ Redirect ไปยังหน้าจัดการที่เกี่ยวข้อง

---

## 6. ข้อควรระวัง (Guardrails)
- **Data Privacy**: ห้ามแสดงข้อมูลส่วนตัวของสมาชิก (เช่น เบอร์โทร, อีเมล) บนแดชบอร์ดโดยไม่จำเป็น
- **Loading States**: ใช้ Skeleton Loading ในส่วนของสถิติและตารางเพื่อให้ UX ดูลื่นไหลขณะรอข้อมูลจาก GAS
- **Accessibility**: ตรวจสอบค่าสีให้มี Contrast ที่เพียงพอสำหรับผู้สูงอายุ (ถ้ามีบรรณารักษ์อาวุโส)
