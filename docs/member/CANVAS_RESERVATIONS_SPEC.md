# Canvas Specification: My Reservations View (`reservations.view.js`)

เอกสารนี้ใช้สำหรับเป็นคู่มือ (Prompt/Spec) ให้กับ AI (เช่น v0, Cursor, Canvas) เพื่อสร้างหรือปรับปรุงหน้าจอการจองหนังสือสำหรับสมาชิก โดยเน้นระบบนัดหมายวันล่วงหน้าและความลื่นไหลของ UI

---

## 1. เป้าหมายการออกแบบ (UI/UX Goals)
- **Visual Clarity**: สมาชิกต้องเห็นสถานะคิวจองของตนเองอย่างชัดเจน (รอ/พร้อมรับ)
- **Interactive Scheduling**: ระบบเลือกวันนัดหมายและจำนวนวันยืมที่เข้าใจง่าย
- **Urgency & Action**: แจ้งเตือนวันหมดเขตการรับหนังสือ (Countdown) สำหรับรายการที่พร้อมแล้ว

---

## 2. โครงสร้างสถานะ (State Management)
```javascript
const STATE = {
  reservations: [], // รายการการจอง [{resId, bookTitle, status, queuePos, holdUntil...}]
  filter: 'active', // 'active' | 'history'
  isBookingModalOpen: false,
  selectedBook: null, // ข้อมูลหนังสือที่กำลังจะจอง
  bookingForm: {
    plannedDate: '',
    duration: 7
  }
};
```

---

## 3. ส่วนประกอบหน้าจอหลัก (Component Architecture)

### 3.1 Reservation Status Tabs
- **Design**: สลับระหว่าง "รายการปัจจุบัน" (Active) และ "ประวัติการจอง" (History)
- **UI**: ใช้ Pill Shape หรือ Underline style ตามแบบ `Native Web Application.md`

### 3.2 Reservation Cards (Active List)
- **Waiting State (รอคิว)**:
    - แสดง **Queue Badge** (เช่น "คิวที่ 2") สีส้ม Amber
    - แสดง **ETA Label**: "คาดว่าจะว่าง: 15 มิ.ย. 68"
- **Ready State (พร้อมรับ)**:
    - แสดง **Highlight Border** สีเขียว Emerald
    - แสดง **Countdown Timer**: "กรุณามารับภายใน 2 วัน 14 ชม."
    - มีปุ่ม "เปิดบาร์โค้ดรับหนังสือ" (เพื่อโชว์รหัสการจองให้เจ้าหน้าที่สแกน)

### 3.3 Booking Modal (Pre-booking Interface)
- **Header**: ชื่อหนังสือและรูปปกขนาดเล็ก
- **Status Indicator**: "เล่มนี้มีคิวรออยู่ 3 ท่าน" หรือ "ว่าง พร้อมล็อคเล่มทันที"
- **Inputs**:
    - **Date Picker (วันที่จะเข้ามายืม)**: ปฏิทินที่เลือกได้เฉพาะวันในอนาคต
    - **Duration Slider/Selector**: เลือกจำนวนวันยืม (แสดงวันคืนอัตโนมัติ เช่น "จะครบกำหนดคืน: 22 มิ.ย. 68")
- **Disclaimer**: "วันเวลาอาจมีการเปลี่ยนแปลงหากผู้ยืมปัจจุบันทำการต่ออายุ"

---

## 4. ตัวอย่างโค้ด UI (Tailwind CSS)

```html
<!-- Example: Reservation Card (Ready State) -->
<div class="relative bg-white p-4 rounded-3xl border-2 border-emerald-500 shadow-xl shadow-emerald-100 mb-4 overflow-hidden animate-in fade-in zoom-in duration-300">
  <div class="absolute top-0 right-0 bg-emerald-500 text-white px-4 py-1 rounded-bl-2xl text-[10px] font-black uppercase tracking-widest">
    พร้อมรับแล้ว
  </div>
  
  <div class="flex gap-4">
    <div class="w-16 h-22 bg-slate-100 rounded-xl overflow-hidden shadow-md">
      <img src="https://via.placeholder.com/150x200" class="w-full h-full object-cover" />
    </div>
    <div class="flex-1 min-w-0">
      <h4 class="text-sm font-black text-slate-800 leading-tight mb-1 truncate">การออกแบบระบบงานดิจิทัล</h4>
      <p class="text-[11px] font-semibold text-slate-400 mb-3">คิวของคุณถึงแล้ว! มารับได้ที่เคาน์เตอร์</p>
      
      <div class="flex items-center gap-2 mb-3">
        <i data-lucide="clock" class="w-3.5 h-3.5 text-rose-500"></i>
        <span class="text-[11px] font-black text-rose-600">หมดเขตรับ: 18 มิ.ย. 68 (อีก 2 วัน)</span>
      </div>

      <button class="w-full py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[11px] font-black hover:bg-emerald-100 transition-colors">
        แสดงรหัสการจอง
      </button>
    </div>
  </div>
</div>

<!-- Example: Booking Modal Content -->
<div class="p-6 bg-white rounded-t-[32px] shadow-2xl">
  <div class="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
  <h3 class="text-xl font-black text-slate-800 mb-1">นัดหมายวันเข้ายืม</h3>
  <p class="text-sm font-medium text-slate-500 mb-6">ระบุวันที่คุณสะดวกเข้ามารับหนังสือ</p>
  
  <div class="space-y-6">
    <!-- Date Selector -->
    <div class="space-y-2">
      <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest">วันที่เข้ามายืม</label>
      <input type="date" class="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-800 focus:ring-2 focus:ring-sky-500" />
    </div>
    
    <!-- Duration Selector -->
    <div class="space-y-2">
      <label class="text-[10px] font-black uppercase text-slate-400 tracking-widest">ระยะเวลาการยืม (วัน)</label>
      <div class="flex items-center justify-between bg-slate-50 p-2 rounded-2xl">
        <button class="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm">-</button>
        <span class="text-lg font-black text-slate-800">7 วัน</span>
        <button class="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm">+</button>
      </div>
      <p class="text-[10px] font-bold text-slate-400 text-center italic">จะครบกำหนดคืนวันที่ 25 มิ.ย. 68</p>
    </div>

    <button class="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-base shadow-2xl shadow-slate-300 active:scale-[0.98] transition-all">
      ยืนยันการนัดหมาย
    </button>
  </div>
</div>
```

---

## 5. ตรรกะการประมวลผล (Frontend Logic Spec)
- **ETA Calculation**: คำนวณวันว่างเบื้องต้นจาก `dueDate` ของคนยืมปัจจุบัน + (จำนวนคิวรอ x `loanDays` ตาม Policy)
- **Conflict Prevention**: หากสมาชิกเลือกวันนัดหมายที่หนังสือยังไม่ว่าง (อิงจาก ETA) ให้แสดง Warning สีส้ม *"หนังสืออาจยังไม่ว่างในวันดังกล่าว คุณต้องการจองคิวต่อหรือไม่?"*
- **Haptic Feedback**: สั่นเมื่อเปลี่ยนจำนวนวันยืม และสั่นยาวเมื่อยืนยันสำเร็จ

---

## 6. ข้อควรระวัง (Guardrails)
- **Policy Sync**: ต้องดึง `loanDays` และ `resQuota` จาก `settings_policies` มาใช้ใน UI เสมอ ห้าม Hardcode
- **Timezone**: การจัดการวันนัดหมายต้องระวังเรื่อง Timezone (แนะนำให้ใช้ ISO8601)
- **Empty State**: หากไม่มีรายการจอง ให้แสดงปุ่ม "ไปหน้าค้นหาหนังสือ" เพื่อกระตุ้นการใช้งาน


canvas จริงที่ผมเลือก
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>การจองของฉัน | ANT Library</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <link href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@300;400;500;600;700&family=Noto+Sans+Thai:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Bai Jamjuree', 'Noto Sans Thai', sans-serif;
            background-color: #f8fafc;
            overscroll-behavior-y: contain;
        }

        .safe-pb { padding-bottom: env(safe-area-inset-bottom, 20px); }
        .safe-pt { padding-top: env(safe-area-inset-top, 0px); }

        /* Animations */
        @keyframes sheetUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
        }
        @keyframes sheetDown {
            from { transform: translateY(0); }
            to { transform: translateY(100%); }
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }

        .sheet-panel { animation: sheetUp 0.32s cubic-bezier(0.32, 0.72, 0, 1) both; }
        .sheet-backdrop { animation: fadeIn 0.25s ease both; }
        
        .closing .sheet-panel { animation: sheetDown 0.25s cubic-bezier(0.32, 0.72, 0, 1) both; }
        .closing .sheet-backdrop { animation: fadeOut 0.2s ease both; }

        /* Utility */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        .active-tab-line {
            position: absolute;
            bottom: 0;
            left: 0;
            height: 2px;
            background-color: #0f172a;
            transition: all 0.3s ease;
        }
    </style>
</head>
<body class="h-[100dvh] flex flex-col overflow-hidden">

    <!-- 🔢 Page Header -->
    <header class="h-[52px] bg-white border-b border-slate-100 flex items-center justify-between px-4 shrink-0 z-10">
        <div>
            <h1 class="font-black text-xl text-slate-800 leading-tight">การจองของฉัน</h1>
            <p id="reservation-count" class="text-[11px] text-slate-400 font-medium">0 รายการที่ใช้งานอยู่</p>
        </div>
        <button class="w-10 h-10 flex items-center justify-center text-slate-400 active:scale-90 transition-transform">
            <i data-lucide="bell" class="w-5 h-5"></i>
        </button>
    </header>

    <!-- 📑 Tab Bar -->
    <nav class="h-[44px] bg-white border-b border-slate-100 flex items-center px-4 shrink-0 relative">
        <button onclick="switchTab('active')" id="tab-active" class="flex-1 h-full text-sm font-black transition-colors duration-200 text-slate-800">
            รายการปัจจุบัน
        </button>
        <button onclick="switchTab('history')" id="tab-history" class="flex-1 h-full text-sm font-medium transition-colors duration-200 text-slate-400">
            ประวัติการจอง
        </button>
        <div id="tab-indicator" class="active-tab-line w-1/2 left-0"></div>
    </nav>

    <!-- 🃏 Card List -->
    <main id="reservation-list" class="flex-1 overflow-y-auto p-4 no-scrollbar">
        <!-- Content injected by JS -->
    </main>

    <!-- ➕ FAB -->
    <button onclick="window.location.href='/app/search'" class="fixed bottom-6 right-4 h-12 bg-slate-900 text-white rounded-full px-5 flex items-center gap-2 shadow-lg shadow-slate-900/20 active:scale-95 transition-transform z-10 safe-mb">
        <i data-lucide="plus" class="w-4 h-4"></i>
        <span class="font-black text-sm">จองหนังสือใหม่</span>
    </button>

    <!-- 📅 Booking Appointment Modal (Bottom Sheet) -->
    <div id="booking-modal" class="fixed inset-0 z-50 hidden">
        <div class="sheet-backdrop absolute inset-0 bg-black/40" onclick="closeModal('booking-modal')"></div>
        <div class="sheet-panel absolute bottom-0 left-0 right-0 bg-white rounded-t-[28px] max-h-[85dvh] overflow-y-auto no-scrollbar">
            <div class="w-10 h-1 bg-slate-200 rounded-full mx-auto mt-3 mb-5"></div>
            
            <div class="px-6 pb-10">
                <div id="modal-book-info" class="flex items-center gap-4 mb-6">
                    <!-- Dynamic Book Info -->
                </div>

                <div class="h-[1px] bg-slate-50 w-full mb-6"></div>

                <section class="mb-6">
                    <label class="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 block">วันที่เข้ามายืม</label>
                    <input type="date" id="planned-date" onchange="updateBookingUI()" class="w-full bg-slate-50 border-none rounded-2xl p-4 font-bold text-slate-800 focus:ring-2 focus:ring-sky-400 outline-none">
                    
                    <div id="eta-warning" class="hidden bg-amber-50 border border-amber-100 rounded-2xl p-3 mt-3 flex items-start gap-3">
                        <i data-lucide="alert-triangle" class="w-4 h-4 text-amber-500 shrink-0 mt-0.5"></i>
                        <div>
                            <p class="text-[11px] font-black text-amber-800 uppercase tracking-tight">หนังสืออาจยังไม่ว่างในวันดังกล่าว</p>
                            <p class="text-[10px] text-amber-600 mt-0.5">คุณต้องการจองคิวไว้ก่อนหรือไม่?</p>
                        </div>
                    </div>
                </section>

                <section class="mb-8">
                    <label class="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 block">จำนวนวันยืม</label>
                    <div class="flex items-center justify-between bg-slate-50 rounded-[20px] p-2">
                        <button onclick="adjustDuration(-1)" id="btn-minus" class="w-11 h-11 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-xl text-slate-700 active:scale-90 transition-transform disabled:opacity-30">-</button>
                        <div class="text-center">
                            <span id="duration-display" class="font-black text-2xl text-slate-800">7 วัน</span>
                        </div>
                        <button onclick="adjustDuration(1)" id="btn-plus" class="w-11 h-11 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-xl text-slate-700 active:scale-90 transition-transform disabled:opacity-30">+</button>
                    </div>
                    <p id="due-date-preview" class="text-[11px] font-bold text-slate-400 text-center italic mt-3">จะครบกำหนดคืนวันที่ -</p>
                </section>

                <p class="text-[10px] text-slate-300 text-center italic mb-6">วันเวลาอาจมีการเปลี่ยนแปลงหากผู้ยืมปัจจุบันทำการต่ออายุ</p>

                <button onclick="confirmBooking()" id="btn-confirm" class="w-full bg-slate-900 text-white rounded-2xl py-4 font-black text-base active:scale-[0.98] transition-all disabled:opacity-50">
                    ยืนยันการนัดหมาย
                </button>
            </div>
        </div>
    </div>

    <!-- 📲 Barcode Modal -->
    <div id="barcode-modal" class="fixed inset-0 z-50 hidden">
        <div class="sheet-backdrop absolute inset-0 bg-black/40" onclick="closeModal('barcode-modal')"></div>
        <div class="sheet-panel absolute bottom-0 left-0 right-0 bg-white rounded-t-[28px] p-6">
            <div class="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-6"></div>
            
            <h3 class="font-black text-lg text-center text-slate-800">รหัสการจองของคุณ</h3>
            <p class="text-slate-400 text-sm text-center mb-8">แสดงให้เจ้าหน้าที่สแกนเพื่อรับหนังสือ</p>

            <div class="w-full h-20 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col items-center justify-center mb-6 overflow-hidden">
                <div id="barcode-text" class="font-mono font-black text-2xl text-slate-700 tracking-[6px]">RS-000000</div>
                <div class="h-1 w-4/5 bg-slate-800 mt-2 opacity-10"></div>
            </div>

            <div class="w-32 h-32 bg-slate-50 rounded-2xl mx-auto flex items-center justify-center border border-slate-100">
                <i data-lucide="qr-code" class="w-16 h-16 text-slate-300"></i>
            </div>

            <p id="barcode-expiry" class="font-black text-rose-500 text-[11px] text-center mt-6 uppercase tracking-widest">หมดเขต: -</p>

            <button onclick="closeModal('barcode-modal')" class="w-full bg-slate-100 text-slate-600 rounded-2xl py-4 font-black mt-8">ปิด</button>
        </div>
    </div>

    <script>
        const STATE = {
            activeTab: 'active',
            reservations: [
                {
                    resId: 'RS-20240601-0012',
                    bookTitle: 'การออกแบบระบบงานดิจิทัล (Digital UI/UX)',
                    coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=200',
                    status: 'ready',
                    queuePos: null,
                    holdUntil: '2024-06-18',
                    etaDate: null,
                    currentBorrowerDueDate: '2024-06-10',
                },
                {
                    resId: 'RS-20240602-0005',
                    bookTitle: 'Visual Branding for Everyone',
                    coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=200',
                    status: 'waiting',
                    queuePos: 2,
                    holdUntil: null,
                    etaDate: '2024-06-15',
                    currentBorrowerDueDate: '2024-06-08',
                },
                {
                    resId: 'RS-20240520-0088',
                    bookTitle: 'Python Data Science Handbook',
                    coverUrl: 'https://images.unsplash.com/photo-1589998059171-988d887df646?q=80&w=200',
                    status: 'completed',
                    queuePos: null,
                    holdUntil: null,
                    completedAt: '2024-05-25'
                }
            ],
            selectedReservation: null,
            bookingForm: {
                plannedDate: new Date().toISOString().split('T')[0],
                duration: 7,
                minDuration: 1,
                maxDuration: 14
            },
            isSubmitting: false
        };

        // --- Core Logic ---
        function switchTab(tab) {
            STATE.activeTab = tab;
            const indicator = document.getElementById('tab-indicator');
            const tabActive = document.getElementById('tab-active');
            const tabHistory = document.getElementById('tab-history');

            if (tab === 'active') {
                indicator.style.left = '0';
                tabActive.className = 'flex-1 h-full text-sm font-black text-slate-800 transition-colors duration-200';
                tabHistory.className = 'flex-1 h-full text-sm font-medium text-slate-400 transition-colors duration-200';
            } else {
                indicator.style.left = '50%';
                tabActive.className = 'flex-1 h-full text-sm font-medium text-slate-400 transition-colors duration-200';
                tabHistory.className = 'flex-1 h-full text-sm font-black text-slate-800 transition-colors duration-200';
            }
            render();
        }

        function render() {
            const list = document.getElementById('reservation-list');
            const countLabel = document.getElementById('reservation-count');
            
            const filtered = STATE.reservations.filter(r => {
                if (STATE.activeTab === 'active') return ['ready', 'waiting'].includes(r.status);
                return ['completed', 'cancelled', 'expired'].includes(r.status);
            });

            countLabel.textContent = `${filtered.length} รายการที่${STATE.activeTab === 'active' ? 'ใช้งานอยู่' : 'เคยจอง'}`;

            if (filtered.length === 0) {
                list.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-20 text-center opacity-40">
                        <i data-lucide="book-marked" class="w-16 h-16 text-slate-300 mb-4"></i>
                        <h3 class="font-black text-lg text-slate-500">ยังไม่มีรายการจอง</h3>
                        <p class="text-xs text-slate-400 mt-1">ค้นหาหนังสือที่สนใจแล้วกดจองได้เลย</p>
                    </div>
                `;
            } else {
                list.innerHTML = filtered.map(r => createCard(r)).join('');
            }
            lucide.createIcons();
        }

        function createCard(res) {
            if (res.status === 'ready') {
                const date = new Date(res.holdUntil).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
                return `
                    <div class="border-2 border-emerald-500 rounded-[20px] bg-white p-[14px] mb-3 relative overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                        <div class="absolute top-0 right-0 bg-emerald-500 text-[9px] font-black text-white px-3 py-1 rounded-bl-xl uppercase tracking-tighter">พร้อมรับแล้ว</div>
                        <div class="flex gap-4">
                            <img src="${res.coverUrl}" class="w-14 h-20 rounded-lg bg-slate-100 object-cover shadow-sm shrink-0">
                            <div class="flex-1 min-w-0 pt-2">
                                <h4 class="text-sm font-black text-slate-800 truncate">${res.bookTitle}</h4>
                                <p class="text-[11px] font-medium text-slate-400 mt-0.5">คิวของคุณถึงแล้ว มารับที่เคาน์เตอร์</p>
                                <div class="flex items-center gap-1.5 mt-2">
                                    <i data-lucide="clock" class="w-3 h-3 text-rose-500"></i>
                                    <span class="text-[11px] font-black text-rose-600">หมดเขตรับ: ${date} (อีก 2 วัน)</span>
                                </div>
                            </div>
                        </div>
                        <button onclick="openBarcode('${res.resId}')" class="w-full mt-3 bg-emerald-50 text-emerald-700 py-2.5 rounded-xl text-[11px] font-black active:scale-[0.98] transition-transform">
                            แสดงรหัสการจอง / บาร์โค้ด
                        </button>
                    </div>
                `;
            }

            if (res.status === 'waiting') {
                const eta = new Date(res.etaDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' });
                return `
                    <div class="border border-amber-400 rounded-[20px] bg-white p-[14px] mb-3 animate-in fade-in">
                        <div class="flex gap-4">
                            <img src="${res.coverUrl}" class="w-14 h-20 rounded-lg bg-slate-100 object-cover shrink-0">
                            <div class="flex-1 min-w-0">
                                <div class="flex justify-between items-start mb-1">
                                    <h4 class="text-sm font-black text-slate-800 truncate pr-2">${res.bookTitle}</h4>
                                    <span class="bg-amber-100 text-amber-800 text-[9px] font-black px-2 py-0.5 rounded-lg whitespace-nowrap">คิวที่ ${res.queuePos}</span>
                                </div>
                                <p class="text-[11px] text-slate-400">คาดว่าจะว่าง: ${eta}</p>
                                <p class="text-[10px] text-slate-300 italic mt-0.5 leading-tight">วันอาจเปลี่ยนแปลงหากผู้ยืมต่ออายุ</p>
                                <div class="flex gap-2 mt-3">
                                    <button class="flex-1 border border-rose-100 text-rose-500 py-2 rounded-xl text-[10px] font-black active:scale-95 transition-transform bg-white">ยกเลิก</button>
                                    <button onclick="openBooking('${res.resId}')" class="flex-1 bg-slate-900 text-white py-2 rounded-xl text-[10px] font-black active:scale-95 transition-transform">นัดหมายวันรับ</button>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }

            // History Card
            const label = res.status === 'completed' ? 'รับแล้ว' : 'ยกเลิกแล้ว';
            const badgeClass = res.status === 'completed' ? 'bg-slate-100 text-slate-500' : 'bg-rose-50 text-rose-400';
            return `
                <div class="border border-slate-100 rounded-[20px] bg-slate-50/50 p-3 mb-2 flex items-center gap-3 opacity-70 grayscale-[0.5]">
                    <img src="${res.coverUrl}" class="w-10 h-14 rounded-lg object-cover">
                    <div class="flex-1 min-w-0">
                        <h4 class="text-xs font-bold text-slate-700 truncate">${res.bookTitle}</h4>
                        <span class="${badgeClass} text-[9px] font-black px-2 py-0.5 rounded-lg mt-1 inline-block">${label}</span>
                    </div>
                    <i data-lucide="chevron-right" class="w-4 h-4 text-slate-300"></i>
                </div>
            `;
        }

        // --- Modal Logic ---
        function openBooking(resId) {
            const res = STATE.reservations.find(r => r.resId === resId);
            STATE.selectedReservation = res;
            
            const info = document.getElementById('modal-book-info');
            info.innerHTML = `
                <img src="${res.coverUrl}" class="w-10 h-14 rounded-xl object-cover shadow-sm">
                <div>
                    <h3 class="font-black text-base text-slate-800 leading-tight">${res.bookTitle}</h3>
                    <p class="text-[11px] text-slate-400">มีคิวรออยู่ ${res.queuePos} ท่าน (คาดว่าจะว่าง: ${formatDateTh(res.etaDate)})</p>
                </div>
            `;

            document.getElementById('planned-date').value = STATE.bookingForm.plannedDate;
            document.getElementById('booking-modal').classList.remove('hidden');
            updateBookingUI();
        }

        function openBarcode(resId) {
            const res = STATE.reservations.find(r => r.resId === resId);
            document.getElementById('barcode-text').textContent = res.resId;
            document.getElementById('barcode-expiry').textContent = `หมดเขต: ${formatDateTh(res.holdUntil)}`;
            document.getElementById('barcode-modal').classList.remove('hidden');
        }

        function closeModal(id) {
            const el = document.getElementById(id);
            el.classList.add('closing');
            setTimeout(() => {
                el.classList.remove('closing');
                el.classList.add('hidden');
            }, 200);
        }

        function adjustDuration(val) {
            const next = STATE.bookingForm.duration + val;
            if (next >= STATE.bookingForm.minDuration && next <= STATE.bookingForm.maxDuration) {
                STATE.bookingForm.duration = next;
                if (navigator.vibrate) navigator.vibrate(20);
                updateBookingUI();
            }
        }

        function updateBookingUI() {
            const plannedDate = document.getElementById('planned-date').value;
            const etaDate = STATE.selectedReservation.etaDate;
            
            // ETA Warning
            const warning = document.getElementById('eta-warning');
            if (plannedDate && etaDate && new Date(plannedDate) < new Date(etaDate)) {
                warning.classList.remove('hidden');
            } else {
                warning.classList.add('hidden');
            }

            // Duration Display
            document.getElementById('duration-display').textContent = `${STATE.bookingForm.duration} วัน`;
            document.getElementById('btn-minus').disabled = STATE.bookingForm.duration === STATE.bookingForm.minDuration;
            document.getElementById('btn-plus').disabled = STATE.bookingForm.duration === STATE.bookingForm.maxDuration;

            // Due Date Preview
            if (plannedDate) {
                const due = new Date(plannedDate);
                due.setDate(due.getDate() + STATE.bookingForm.duration);
                document.getElementById('due-date-preview').textContent = `จะครบกำหนดคืนวันที่ ${formatDateTh(due)}`;
            }
        }

        function confirmBooking() {
            STATE.isSubmitting = true;
            const btn = document.getElementById('btn-confirm');
            btn.innerHTML = `<div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>`;
            btn.disabled = true;

            setTimeout(() => {
                if (navigator.vibrate) navigator.vibrate([50, 30, 100]);
                closeModal('booking-modal');
                STATE.isSubmitting = false;
                btn.innerHTML = `ยืนยันการนัดหมาย`;
                btn.disabled = false;
                
                // Show Success Toast
                const toast = document.createElement('div');
                toast.className = 'fixed top-12 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full font-black text-sm shadow-xl z-[100] animate-in slide-in-from-top';
                toast.innerHTML = 'นัดหมายสำเร็จแล้ว! 🎉';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2500);
            }, 1500);
        }

        // --- Helpers ---
        function formatDateTh(dateStr) {
            const d = new Date(dateStr);
            return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });
        }

        window.onload = () => {
            render();
            lucide.createIcons();
        }
    </script>
</body>
</html>
