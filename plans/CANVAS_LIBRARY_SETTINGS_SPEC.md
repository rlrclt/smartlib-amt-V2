# Canvas Specification: Library Hours & Settings (`/manage/settings/library`)

เอกสารนี้ใช้สำหรับเป็นคู่มือ (Prompt/Spec) ให้กับ AI (เช่น v0, Cursor, Canvas) เพื่อสร้างหรือปรับปรุงหน้าตั้งค่าเวลาทำการของห้องสมุดสำหรับแอดมิน

---

## 1. เป้าหมายการออกแบบ (UI/UX Goals)
- **Precise Control**: แอดมินต้องกำหนดเวลาเปิด-ปิดได้ละเอียดรายวัน
- **Flexibility**: รองรับการกำหนดข้อยกเว้น (Exceptions) สำหรับวันที่มีกิจกรรมพิเศษได้ง่าย
- **Visibility**: แสดงสถานะปัจจุบันของห้องสมุด (เปิด/ปิด) และจำนวนคนปัจจุบันอย่างเด่นชัด

---

## 2. โครงสร้างสถานะ (State Management)
```javascript
const STATE = {
  regularHours: [
    { day: 0, open: '08:30', close: '16:30', isOpen: false }, // อาทิตย์
    { day: 1, open: '08:30', close: '16:30', isOpen: true },  // จันทร์
    // ... จนถึงเสาร์
  ],
  exceptions: [], // { date: '2026-06-15', open: '08:30', close: '21:00', reason: 'สัปดาห์กิจกรรม' }
  currentStatus: {
    isOpen: true,
    closeTime: '16:30',
    activeCount: 12
  },
  isDirty: false, // สำหรับตรวจสอบว่ามีการแก้ไขที่ยังไม่ได้บันทึกหรือไม่
  isLoading: true
};
```

---

## 3. ส่วนประกอบหน้าจอหลัก (Component Architecture)

### 3.1 Live Status & Summary (Header)
- **Design**: แถบสถานะด้านบนระบุว่า "ขณะนี้ห้องสมุดเปิดทำการ" พร้อมตัวเลขคนข้างในแบบ Real-time

### 3.2 Regular Operating Hours (Table/List)
- **Design**: ตารางแสดงวัน จันทร์-อาทิตย์ พร้อมช่อง Input เวลา (HH:mm) และ Switch เปิด-ปิดการให้บริการในวันนั้นๆ

### 3.3 Special Exceptions (Event Management)
- **Design**: รายการการ์ดข้อยกเว้นที่เรียงตามวันที่
- **Function**: ปุ่ม [เพิ่มกรณีพิเศษ] เพื่อเปิด Modal เลือกวันที่และระบุเวลาใหม่/สาเหตุ

### 3.4 Auto-Close Policy
- **Design**: ส่วนตั้งค่าพฤติกรรมของ Janitor System เช่น "ปิด Session อัตโนมัติหลังเวลาปิดกี่นาที"

---

## 4. ตัวอย่างโค้ด UI (Tailwind CSS)

```html
<!-- Example: Operating Hour Row -->
<div class="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 mb-2">
  <div class="flex items-center gap-3">
    <div class="w-2 h-10 bg-sky-500 rounded-full"></div>
    <span class="text-sm font-black text-slate-800 w-20">วันจันทร์</span>
  </div>
  <div class="flex items-center gap-4">
    <input type="time" value="08:30" class="p-2 bg-slate-50 rounded-lg text-xs font-bold border-none" />
    <span class="text-slate-300">-</span>
    <input type="time" value="16:30" class="p-2 bg-slate-50 rounded-lg text-xs font-bold border-none" />
    <!-- Toggle Switch -->
    <button class="w-10 h-6 bg-emerald-500 rounded-full relative p-1 transition-all">
       <div class="w-4 h-4 bg-white rounded-full ml-auto"></div>
    </button>
  </div>
</div>

<!-- Example: Exception Card -->
<div class="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-4">
  <div class="bg-white p-2 rounded-xl text-center min-w-[50px]">
    <p class="text-[10px] font-black text-slate-400 uppercase">มิ.ย.</p>
    <p class="text-lg font-black text-amber-600">15</p>
  </div>
  <div class="flex-1 min-w-0">
    <p class="text-xs font-black text-slate-800">สัปดาห์กิจกรรมห้องสมุด</p>
    <p class="text-[10px] font-bold text-amber-700">ขยายเวลาปิดเป็น: 21:00 น.</p>
  </div>
  <button class="text-rose-500 hover:bg-rose-100 p-2 rounded-lg transition-colors">
    <i data-lucide="trash-2" class="w-4 h-4"></i>
  </button>
</div>
```

---

## 5. ตรรกะการประมวลผล (Frontend Logic Spec)
- **Time Validation**: เมื่อกรอกเวลาปิด ต้องตรวจสอบว่าไม่ก่อนเวลาเปิด
- **Conflict Check**: หากเพิ่มกรณีพิเศษในวันที่ซ้ำกับที่มีอยู่แล้ว ให้ระบบเตือนเพื่อทำการแก้ไขแถวเดิม
---

## 6. ตรรกะการเชื่อมโยงระบบ (Integration & Settings Logic)

### 6.1 การจัดการรัศมี Geofencing
- เพิ่ม Input สำหรับ `range_checkin` (เมตร) ในแต่ละจุดพิกัด
- **Backend Sync**: เมื่อบันทึกพิกัดใหม่ ข้อมูลต้องถูกส่งไปเก็บที่ตาราง `settings_locations`
```javascript
// โครงสร้าง Payload สำหรับบันทึกพิกัด
const locationPayload = {
  id: 'LOC-001',
  range_borrow: 20,
  range_return: 20,
  range_checkin: 50, // รัศมีสำหรับการเช็คอินเข้าใช้ (กว้างกว่าการยืม)
  // ... coords
};
```

### 6.2 การแสดงผลสถิติจริง (Live Stats)
- ส่วนหัวของหน้าจอ (Header) ต้องทำการ Polling ข้อมูล `Active Visitors` ทุก 2 นาที
- **API Call**: `api.visits.getActiveCount()`
- แสดงสถานะห้องสมุด (Open/Closed) อ้างอิงจากเวลาปัจจุบันเทียบกับ `regularHours` และ `exceptions` ใน State

### 6.3 การตั้งค่า Janitor (Auto-close)
- แอดมินระบุค่า `buffer_minutes` (เช่น 30) 
- ระบบจะนำค่านี้ไปใช้ใน Triggers ของ Apps Script เพื่อปิด Session อัตโนมัติหลังเวลาปิดจริง
