# Canvas Specification: Fines Management View (`manage/fines.view.js`)

เอกสารนี้ใช้สำหรับเป็นคู่มือ (Prompt/Spec) ให้กับ AI (เช่น v0, Cursor, Canvas) เพื่อสร้างหรือปรับปรุงหน้าจอจัดการค่าปรับสำหรับเจ้าหน้าที่ (Librarian/Admin Fines Management)

---

## 1. เป้าหมายการออกแบบ (UI/UX Goals)
- **Financial Clarity**: แสดงรายการเงินที่ค้างชำระและประวัติการรับชำระเงินอย่างโปร่งใส
- **Ease of Access**: สามารถค้นหาค่าปรับได้จากทั้ง ชื่อสมาชิก, บาร์โค้ดหนังสือ, หรือรหัสรายการยืม
- **Security & Authorization**: แยกส่วนการกดยกเว้นค่าปรับ (Waive) ให้เฉพาะระดับ Admin เท่านั้น

---

## 2. โครงสร้างสถานะ (State Management)
```javascript
const STATE = {
  fines: [], // รายการค่าปรับ [{fineId, uid, bookTitle, amount, type, status, createdAt...}]
  filters: {
    status: 'unpaid', // 'unpaid' | 'paid' | 'waived' | 'all'
    searchQuery: '',
    dateRange: { start: '', end: '' }
  },
  stats: {
    totalUnpaidAmount: 0,
    totalPaidToday: 0,
    pendingItemsCount: 0
  },
  isLoading: true,
  isPaymentModalOpen: false,
  selectedFine: null // ข้อมูลรายการที่กำลังจะรับชำระเงิน
};
```

## 3. โครงสร้างโค้ดจริง (Reference Implementation Structure)
เพื่อให้ AI ทำงานสอดคล้องกับระบบเดิม (`fines.view.js`) ให้ใช้โครงสร้าง Logic ดังนี้:

```javascript
// Current View Logic Structure
const STATE = {
  loading: false,
  items: [],
  filterStatus: "unpaid",
  submitting: false,
};

// UI Component Renderer
function renderFines(root) {
  const unpaidTotal = STATE.items
    .filter((item) => String(item.status) === "unpaid")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  
  // Update Header Stats
  root.querySelector("#finesUnpaidTotal").textContent = `${unpaidTotal.toLocaleString()} บาท`;

  // Render List Items
  return STATE.items.map(item => `
    <div class="fine-card ...">
       <!-- Details: fineId, loanId, bookTitle, barcode, amount, status -->
       ${item.status === 'unpaid' ? `
         <button data-fine-pay="${item.fineId}">บันทึกรับชำระ</button>
         <button data-fine-waive="${item.fineId}">ยกเว้นค่าปรับ (admin)</button>
       ` : ''}
    </div>
  `).join('');
}

// Action Handlers
async function handlePay(fineId) {
  const note = window.prompt("หมายเหตุการรับชำระ (ถ้ามี)", "");
  const res = await apiFinesPay({ fineId, notes: note });
  // toast & reload
}

async function handleWaive(fineId) {
  const reason = window.prompt("เหตุผลการยกเว้นค่าปรับ", "");
  if (!reason) return;
  const res = await apiFinesWaive({ fineId, notes: reason });
  // toast & reload
}
```

---

## 4. ส่วนประกอบหน้าจอหลัก (Component Architecture)

### 3.1 สรุปยอดเงิน (Fines Stats Summary)
- **Layout**: แถบการ์ดสรุปผลด้านบน (3-4 ใบ)
- **Cards**:
    - **"ยอดค้างชำระรวม"**: ตัวเลขสี Rose-600 เด่นชัด
    - **"รับเงินแล้ววันนี้"**: สรุปยอดสะสมของวันที่ปัจจุบัน
    - **"รายการที่รอตรวจสอบ"**: จำนวนเคสหนังสือชำรุดหรือหายที่ยังไม่ได้ระบุค่าปรับ

### 3.2 ระบบกรองและค้นหา (Filters Bar)
- **Search Input**: ค้นหาแบบรวม (Global Search) สำหรับชื่อคนหรือบาร์โค้ด
- **Status Tabs**: ปุ่มเลือกดูตามสถานะ (ค้างชำระ, จ่ายแล้ว, ยกเว้น)
- **Date Filter**: เลือกช่วงวันที่เกิดรายการค่าปรับ

### 3.3 รายการค่าปรับ (Fines Data Table)
- **Table Columns**:
    - **รายละเอียด**: (บาร์โค้ด + ชื่อหนังสือ)
    - **สมาชิก**: (ชื่อ + UID)
    - **ประเภท**: Badge ระบุ `overdue`, `damaged`, `lost` (ใช้สีต่างกัน)
    - **ยอดเงิน**: ตัวเลขหนา
    - **วันที่**: วันที่เกิดค่าปรับ
    - **จัดการ**: ปุ่มดำเนินการ (Action Buttons)

### 3.4 การจัดการรายการ (Action Buttons)
- **ปุ่ม "รับชำระเงิน" (Pay)**: เปิด Modal ยืนยันการรับเงิน
- **ปุ่ม "ยกเว้นค่าปรับ" (Waive)**: เฉพาะแอดมิน (สีส้ม/Amber) ต้องใส่หมายเหตุเหตุผล
- **ปุ่ม "ดูประวัติการยืม"**: ทางลัดไปดูประวัติยืม-คืนที่เกี่ยวข้องกับค่าปรับนี้

---

## 4. ตัวอย่างโค้ด UI (Tailwind CSS)

```html
<!-- Example: Fine Status Badge -->
<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider
  ${type === 'overdue' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}">
  ${type}
</span>

<!-- Example: Fine List Item Card (Mobile Friendly Table Row) -->
<div class="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm mb-3 flex items-center justify-between group hover:border-sky-200 transition-all">
  <div class="flex items-center gap-4 min-w-0">
    <div class="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-sky-50 group-hover:text-sky-500 transition-colors">
      <i data-lucide="receipt-text" class="w-6 h-6"></i>
    </div>
    <div class="min-w-0">
      <p class="text-xs font-black text-slate-800 truncate">จิตวิทยาการลงทุน (BK-1002-01)</p>
      <p class="text-[10px] font-bold text-slate-400">สมาชิก: นายสมชาย (STD-001)</p>
    </div>
  </div>
  <div class="text-right">
    <p class="text-lg font-black text-slate-800">฿35.00</p>
    <div class="flex items-center gap-2 mt-1">
      <button class="px-3 py-1 bg-emerald-500 text-white rounded-lg text-[10px] font-black hover:bg-emerald-600 shadow-lg shadow-emerald-100">รับชำระ</button>
      <button class="p-1.5 bg-slate-100 text-slate-400 rounded-lg hover:bg-rose-50 hover:text-rose-500 transition-colors"><i data-lucide="more-horizontal" class="w-4 h-4"></i></button>
    </div>
  </div>
</div>

<!-- Example: Payment Confirmation Modal Content -->
<div class="p-8 bg-white rounded-[3rem] text-center">
  <div class="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
    <i data-lucide="check-circle-2" class="w-10 h-10"></i>
  </div>
  <h3 class="text-2xl font-black text-slate-800 mb-2">ยืนยันการรับชำระเงิน</h3>
  <p class="text-sm font-medium text-slate-500 mb-8">ยอดเงินรวม <span class="text-slate-800 font-black">฿35.00</span> จาก นายสมชาย</p>
  
  <div class="grid grid-cols-2 gap-3">
    <button class="py-4 rounded-2xl border-2 border-slate-100 text-slate-400 font-black">ยกเลิก</button>
    <button class="py-4 rounded-2xl bg-slate-900 text-white font-black shadow-xl shadow-slate-200">บันทึกรายการ</button>
  </div>
</div>
```

---

## 5. ตรรกะการประมวลผล (Frontend Logic Spec)
- **Batch Payment**: (Option ในอนาคต) อนุญาตให้ติ๊กถูกหลายรายการแล้วกด "ชำระเงินรวม" ครั้งเดียว
- **Permission Check**: ฟังก์ชัน `waiveFine()` ต้องตรวจสอบ `auth.user.role === 'admin'` ก่อนส่ง API หากไม่ใช่ให้ปิดปุ่มหรือแสดง Warning
- **Denormalized Search**: ระบบค้นหาต้องทำงานได้ทันทีจากข้อมูล `barcode` และ `bookTitle` ที่ฝังอยู่ในตาราง `fines` (ไม่ต้องยิง API ไปหาชื่อหนังสือซ้ำ)

---

## 6. ข้อควรระวัง (Guardrails)
- **Receipt Proof**: ทุกการชำระเงินสำเร็จ ควรมีข้อความยืนยันรหัส `fineId` และควรแจ้งเตือนสมาชิกผ่าน Notification ทันที
- **Immutability**: รายการที่ถูกเปลี่ยนเป็น `paid` หรือ `waived` แล้ว ห้ามแก้ไขยอดเงินหรือเปลี่ยนสถานะกลับเป็น `unpaid` เพื่อป้องกันการทุจริต
- **Audit Logging**: ทุกการเปลี่ยนสถานะ ต้องบันทึกว่า "ใคร" เป็นผู้ดำเนินการ (`receivedBy`)
