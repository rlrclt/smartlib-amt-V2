# Canvas Specification: Library Check-in View (`/app/checkin`)

เอกสารนี้ใช้สำหรับเป็นคู่มือ (Prompt/Spec) ให้กับ AI (เช่น v0, Cursor, Canvas) เพื่อสร้างหรือปรับปรุงหน้าจอเช็คอินเข้าใช้ห้องสมุดสำหรับสมาชิก

---

## 1. เป้าหมายการออกแบบ (UI/UX Goals)
- **Extreme Simplicity**: เนื่องจากสมาชิกต้องสแกน QR หน้าห้องสมุด UI ต้องโหลดเร็วและกดง่ายที่สุด
- **Visual Feedback**: มีแอนิเมชันยืนยันเมื่อเช็คอินสำเร็จ
- **Information Persistence**: แสดงสถานะการเช็คอินปัจจุบันค้างไว้บนหน้าจอเพื่อให้สมาชิกแก้ไขกิจกรรมได้

---

## 2. โครงสร้างสถานะ (State Management)
```javascript
const STATE = {
  session: null, // { visitId, checkInAt, activities: [], status: 'active' }
  isLoading: true,
  isSubmitting: false,
  availableActivities: [
    { id: 'borrow', label: 'ยืม-คืนหนังสือ', icon: 'book-open' },
    { id: 'study', label: 'อ่านหนังสือ/ทำการบ้าน', icon: 'pencil' },
    { id: 'computer', label: 'ใช้งานคอมพิวเตอร์', icon: 'monitor' },
    { id: 'meeting', label: 'ประชุม/ทำงานกลุ่ม', icon: 'users' },
    { id: 'relax', label: 'พักผ่อน/นันทนาการ', icon: 'coffee' }
  ]
};
```

---

## 3. ส่วนประกอบหน้าจอหลัก (Component Architecture)

### 3.1 Check-in Screen (ยังไม่ได้เช็คอิน)
- **Header**: "ยินดีต้อนรับสู่ห้องสมุด" พร้อมวันที่ปัจจุบัน
- **Activity Grid**: รายการกิจกรรมแบบการ์ด 2 คอลัมน์ สมาชิกสามารถเลือกได้หลายอย่าง
- **Action**: ปุ่ม **"บันทึกการเข้าใช้"** ขนาดใหญ่ (Sticky Bottom)

### 3.2 Active Session Screen (เช็คอินแล้ว)
- **Live Timer**: ตัวเลขนับเวลาว่าอยู่ในห้องสมุดมานานเท่าไหร่แล้ว (เช่น `01:24:15`)
- **Current Activities**: แสดงกิจกรรมที่เลือกไว้ พร้อมปุ่มแก้ไข (+)
- **Exit Action**: ปุ่ม **"ออกจากห้องสมุด"** สี Rose-500 (ต้องมีการกดยืนยันเพื่อป้องกันการพลาด)

---

## 4. ตัวอย่างโค้ด UI (Tailwind CSS)

```html
<!-- Example: Activity Card Selection -->
<div class="grid grid-cols-2 gap-3 p-4">
  <button class="flex flex-col items-center justify-center p-6 bg-white rounded-3xl border-2 border-slate-100 hover:border-sky-500 transition-all active:scale-95 group">
    <div class="w-12 h-12 bg-sky-50 text-sky-500 rounded-2xl flex items-center justify-center mb-3 group-hover:bg-sky-500 group-hover:text-white">
      <i data-lucide="monitor" class="w-6 h-6"></i>
    </div>
    <span class="text-xs font-black text-slate-700">ใช้คอมพิวเตอร์</span>
  </button>
  <!-- ... อื่นๆ ... -->
</div>

<!-- Example: Active Session Banner -->
<div class="m-4 p-6 bg-slate-900 rounded-[2.5rem] text-white overflow-hidden relative shadow-2xl shadow-slate-200">
  <div class="absolute -right-10 -top-10 w-40 h-40 bg-sky-500/20 rounded-full blur-3xl"></div>
  <p class="text-[10px] font-black uppercase tracking-widest text-sky-400 mb-1">เเวลาที่ใช้บริการ</p>
  <h2 class="text-4xl font-black mb-4 tabular-nums">01:45:22</h2>
  <div class="flex items-center gap-2 text-xs font-bold text-slate-400">
    <i data-lucide="map-pin" class="w-3.5 h-3.5"></i>
    <span>เช็คอินเมื่อ: 08:30 น.</span>
  </div>
</div>
```

---

## 5. ข้อควรระวัง (Guardrails)
- **Auto-Logout UI**: หากระบบ Auto-close ทำงาน และสมาชิกกลับมาเปิดหน้าแอปอีกครั้ง ระบบต้องแจ้งเตือนว่า *"Session ของคุณถูกปิดอัตโนมัติเนื่องจากห้องสมุดปิดทำการ"*
- **Geofencing**: ควรเช็คพิกัดก่อนบันทึกเช็คอิน (ต้องอยู่ภายในระยะที่แอดมินกำหนดใน `settings_locations`)
---

## 6. ตรรกะการทำงาน (Implementation Logic)

### 6.1 การตรวจสอบพิกัด (Geofencing Check)
```javascript
// สูตร Haversine สำหรับคำนวณระยะห่าง (เมตร)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // รัศมีโลก
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// ตรวจสอบกับจุดบริการที่ใกล้ที่สุด
const isAuthorized = locations.some(loc => {
  const dist = calculateDistance(userLat, userLng, loc.lat, loc.lng);
  return dist <= loc.range_checkin;
});
```

### 6.2 การจัดการ Redirection (Safe Redirect)
```javascript
// ✅ Whitelist ป้องกัน Open Redirect
const ALLOWED_REDIRECTS = ['/app/loans', '/app/borrow', '/app/return'];

function safeRedirect(path) {
  if (ALLOWED_REDIRECTS.includes(path)) {
    router.navigate(path);
  } else {
    router.navigate('/app/home');
  }
}
```

### 6.3 ระบบ Timer และสถานะห้องสมุด (Server-time Based)
- **Timer**: ต้องคำนวณจาก Server Timestamp เพื่อป้องกันการแก้เวลาที่เครื่อง Client
```javascript
const elapsed = Date.now() - new Date(STATE.session.checkInAt).getTime();
```
- **Library Closed State**: หากสแกน QR ในช่วงเวลาที่ห้องสมุดปิด สมาชิกต้องเห็นหน้าจอแจ้งเตือนชัดเจน:
  - "ขณะนี้ห้องสมุดปิดให้บริการ"
  - "เปิดทำการอีกครั้งในวันที่ [Date] เวลา [Time]"
  - ไม่อนุญาตให้กดเลือกกิจกรรมหรือบันทึกเช็คอิน
