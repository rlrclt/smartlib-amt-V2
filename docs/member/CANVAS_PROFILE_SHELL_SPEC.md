<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no">
  <title>รายการจอง - ANT Library</title>
  
  <!-- Fonts: Bai Jamjuree -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>

  <!-- Tailwind Config -->
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { sans: ['"Bai Jamjuree"', 'sans-serif'] },
          colors: {
            brand: {
              50: '#F0F9FF', 100: '#E0F2FE', 200: '#BAE6FD', 300: '#7DD3FC',
              500: '#0EA5E9', 600: '#0284C7', 700: '#0369A1', 900: '#0C4A6E',
            }
          },
          boxShadow: {
            'native': '0 4px 24px rgba(0, 0, 0, 0.04), 0 -2px 12px rgba(0, 0, 0, 0.02)',
            'card': '0 2px 12px rgba(0,0,0,0.03)',
            'sheet': '0 -10px 40px rgba(0,0,0,0.1)',
          }
        }
      }
    }
  </script>

  <style>
    :root {
      --safe-top: env(safe-area-inset-top, 0px);
      --safe-bottom: env(safe-area-inset-bottom, 0px);
    }
    body {
      background-color: #F1F5F9; 
      -webkit-tap-highlight-color: transparent;
      overscroll-behavior-y: none;
    }
    
    /* Mobile App Container */
    .app-container {
      max-width: 480px;
      margin: 0 auto;
      background-color: #F8FAFC; 
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      position: relative;
      box-shadow: 0 0 40px rgba(0,0,0,0.05);
      overflow-x: hidden;
    }

    /* Native Press Feedback */
    .pressable {
      transition: transform 0.15s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.15s ease, background-color 0.15s ease;
      cursor: pointer;
      user-select: none;
    }
    .pressable:active:not(:disabled) { transform: scale(0.96); opacity: 0.8; }
    .pressable:disabled { opacity: 0.5; cursor: not-allowed; }
    
    .touch-target { min-height: 48px; min-width: 48px; }

    /* Hide Scrollbar */
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    /* Skeleton Animation */
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .skeleton-box {
      background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 8px;
    }

    /* Animations */
    .fade-in { animation: fadeIn 0.3s ease-out forwards; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* Bottom Sheet System */
    .sheet-overlay {
      opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
    }
    .sheet-overlay.active { opacity: 1; pointer-events: auto; }
    
    .bottom-sheet {
      transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.32, 0.72, 0, 1);
    }
    .bottom-sheet.active { transform: translateY(0); }
    
    /* Segmented Control Active State */
    .segment-btn.active {
      background-color: white;
      color: #0284C7;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body class="text-slate-800 antialiased">

  <div class="app-container">
    
    <!-- ==========================================
         1. HEADER & TABS (Sticky)
         ========================================== -->
    <header class="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-100" style="padding-top: max(1rem, var(--safe-top))">
      <div class="flex items-center justify-between px-4 pb-2 pt-2">
        <button class="pressable touch-target flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100">
          <i data-lucide="chevron-left" class="w-6 h-6"></i>
        </button>
        <h1 class="text-lg font-black text-slate-800 tracking-tight">รายการจอง</h1>
        <button id="btn-refresh" class="pressable touch-target flex items-center justify-center w-10 h-10 rounded-full bg-brand-50 text-brand-600 hover:bg-brand-100">
          <i data-lucide="rotate-cw" class="w-5 h-5" id="refresh-icon"></i>
        </button>
      </div>

      <!-- Native Segmented Control -->
      <div class="px-4 pb-3 pt-1">
        <div class="bg-slate-100 p-1 rounded-xl flex items-center">
          <button class="segment-btn active pressable flex-1 py-2 rounded-lg text-sm font-bold text-slate-500 transition-all" data-tab="active">
            ใช้งานอยู่ <span id="badge-active" class="ml-1 bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded-md text-[10px]">0</span>
          </button>
          <button class="segment-btn pressable flex-1 py-2 rounded-lg text-sm font-bold text-slate-500 transition-all" data-tab="history">
            ประวัติการจอง
          </button>
        </div>
      </div>
    </header>

    <!-- ==========================================
         MAIN SCROLLABLE CONTENT
         ========================================== -->
    <main class="flex-1 overflow-y-auto overscroll-contain pb-28 hide-scrollbar relative" id="main-scroll">
      
      <div class="p-4 space-y-4">
        
        <!-- Business Hours Banner (From Spec) -->
        <article class="rounded-[1.25rem] border border-emerald-100 bg-emerald-50/70 p-4 shadow-sm relative overflow-hidden">
          <div class="absolute -right-4 -top-4 w-24 h-24 bg-white/40 rounded-full blur-xl pointer-events-none"></div>
          <div class="flex items-start gap-3 relative z-10">
            <div class="w-10 h-10 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shrink-0 shadow-inner">
              <i data-lucide="clock-4" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="text-sm font-black text-emerald-900 leading-tight">เวลารับหนังสือจอง (เคาน์เตอร์)</h3>
              <p class="text-[11px] font-bold text-emerald-700/80 mt-1">จันทร์ - ศุกร์: <span class="text-emerald-700 font-black">08:30 - 16:00</span></p>
              <p class="text-[10px] text-emerald-600/70 mt-1.5 leading-snug">* กรุณามารับภายในเวลาที่กำหนด มิเช่นนั้นคิวจะถูกยกเลิกอัตโนมัติ</p>
            </div>
          </div>
        </article>

        <!-- Summary Header -->
        <div class="flex justify-between items-end px-1 pt-2 fade-in">
          <h2 class="text-sm font-black text-slate-800" id="list-title">รายการที่ใช้งานอยู่</h2>
          <span class="text-xs font-bold text-slate-500" id="list-count">คุณมี 0 รายการ</span>
        </div>

        <!-- Dynamic List Container -->
        <section id="reservations-list-container" class="space-y-3 min-h-[300px]">
          <!-- Skeletons or Cards injected via JS -->
        </section>

      </div>
    </main>

    <!-- ==========================================
         BOTTOM NAVIGATION
         ========================================== -->
    <nav class="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 z-40 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] max-w-[480px] mx-auto" style="padding-bottom: var(--safe-bottom)">
      <div class="flex justify-around items-center h-[68px] px-1">
        <a href="#" class="pressable touch-target flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-brand-600">
          <i data-lucide="layout-dashboard" class="w-[22px] h-[22px] mb-1"></i>
          <span class="text-[10px] font-bold">หน้าหลัก</span>
        </a>
        <a href="#" class="pressable touch-target flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-brand-600">
          <i data-lucide="book-open" class="w-[22px] h-[22px] mb-1"></i>
          <span class="text-[10px] font-bold">ค้นหา</span>
        </a>
        
        <!-- Scan FAB -->
        <div class="relative -top-5 w-full flex justify-center shrink-0" style="min-width: 72px;">
          <button class="pressable w-14 h-14 bg-gradient-to-br from-brand-500 to-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-brand-500/40 border-[3px] border-white">
            <i data-lucide="scan" class="w-6 h-6"></i>
          </button>
        </div>

        <!-- Active Tab -->
        <a href="#" class="pressable touch-target flex flex-col items-center justify-center w-full h-full text-brand-600">
          <i data-lucide="bookmark" class="w-[22px] h-[22px] mb-1 fill-brand-100/50"></i>
          <span class="text-[10px] font-bold">รายการจอง</span>
        </a>
        <a href="#" class="pressable touch-target flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-brand-600">
          <i data-lucide="user" class="w-[22px] h-[22px] mb-1"></i>
          <span class="text-[10px] font-bold">ฉัน</span>
        </a>
      </div>
    </nav>


    <!-- ==========================================
         [MODAL 1] BARCODE BOTTOM SHEET (For Ready Items)
         ========================================== -->
    <div id="sheet-backdrop-1" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 sheet-overlay max-w-[480px] mx-auto"></div>
    
    <div id="sheet-barcode" class="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-[2rem] shadow-sheet bottom-sheet flex flex-col max-w-[480px] mx-auto" style="padding-bottom: max(1.5rem, var(--safe-bottom))">
      <div class="w-full flex justify-center pt-3 pb-2 shrink-0"><div class="w-12 h-1.5 bg-slate-200 rounded-full"></div></div>
      
      <div class="px-5 pb-6 pt-2 flex flex-col items-center text-center">
        <h3 class="text-xl font-black text-slate-800 mb-1">รหัสรับหนังสือ</h3>
        <p class="text-sm font-medium text-slate-500 mb-6 line-clamp-1 px-4" id="barcode-book-title">The Design of Everyday Things</p>
        
        <!-- Fake Barcode Visual -->
        <div class="w-64 bg-white border-2 border-slate-200 p-4 rounded-[1.5rem] shadow-sm mb-4">
          <div class="h-20 w-full bg-[repeating-linear-gradient(90deg,#0f172a,#0f172a_4px,transparent_4px,transparent_6px,#0f172a_6px,#0f172a_10px,transparent_10px,transparent_14px)] mb-3 opacity-90 mix-blend-multiply"></div>
          <p class="text-2xl font-mono font-black text-slate-800 tracking-widest" id="barcode-id">RSV-8492</p>
        </div>
        
        <p class="text-xs font-bold text-slate-400 flex items-center gap-1.5 bg-slate-50 px-4 py-2 rounded-lg">
          <i data-lucide="info" class="w-4 h-4"></i> โปรดแสดงหน้านี้ให้บรรณารักษ์เพื่อรับเล่ม
        </p>

        <button class="btn-close-sheet pressable w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-2xl py-4 mt-6">
          ปิดหน้าต่าง
        </button>
      </div>
    </div>


    <!-- ==========================================
         [MODAL 2] SCHEDULE BOTTOM SHEET (For Waiting Items)
         ========================================== -->
    <div id="sheet-backdrop-2" class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 sheet-overlay max-w-[480px] mx-auto"></div>
    
    <div id="sheet-schedule" class="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-[2rem] shadow-sheet bottom-sheet flex flex-col max-w-[480px] mx-auto" style="padding-bottom: max(1.5rem, var(--safe-bottom))">
      <div class="w-full flex justify-center pt-3 pb-2 shrink-0"><div class="w-12 h-1.5 bg-slate-200 rounded-full"></div></div>
      
      <div class="px-5 pb-2 pt-2">
        <h3 class="text-xl font-black text-slate-800 mb-1">นัดหมายวันรับหนังสือ</h3>
        <p class="text-sm font-medium text-slate-500 mb-6 line-clamp-1" id="schedule-book-title">Atomic Habits</p>
        
        <div class="bg-slate-50 border border-slate-200 rounded-[1.5rem] p-5 mb-6">
          <p class="text-center text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">ระยะเวลาที่ต้องการยืม</p>
          
          <!-- Stepper Control -->
          <div class="flex items-center justify-between bg-white border border-slate-100 rounded-[1.25rem] p-2 shadow-sm">
            <button id="btn-dec-days" class="pressable w-12 h-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-slate-100 disabled:opacity-30">
              <i data-lucide="minus" class="w-5 h-5"></i>
            </button>
            <div class="flex flex-col items-center">
              <span class="text-2xl font-black text-brand-600 leading-none" id="schedule-days-count">3</span>
              <span class="text-[10px] font-bold text-slate-400 mt-0.5">วัน</span>
            </div>
            <button id="btn-inc-days" class="pressable w-12 h-12 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-slate-100 disabled:opacity-30">
              <i data-lucide="plus" class="w-5 h-5"></i>
            </button>
          </div>

          <div class="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
            <span class="text-xs font-bold text-slate-500">วันกำหนดคืนโดยประมาณ:</span>
            <span class="text-sm font-black text-slate-800" id="schedule-due-preview">12 พ.ค. 2026</span>
          </div>
        </div>

        <div class="flex gap-3">
          <button class="btn-close-sheet pressable flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-2xl py-4">ยกเลิก</button>
          <button id="btn-confirm-schedule" class="pressable flex-1 bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm rounded-2xl py-4 shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2">
            <i data-lucide="check" class="w-4 h-4"></i> ยืนยันนัดหมาย
          </button>
        </div>
      </div>
    </div>

  </div> <!-- End App Container -->

  <!-- TOAST NOTIFICATION -->
  <div id="toast-container" class="fixed top-[max(1.5rem,var(--safe-top))] left-1/2 -translate-x-1/2 z-50 pointer-events-none w-[90%] max-w-[400px] hidden transition-all duration-300 transform -translate-y-4 opacity-0">
    <div class="bg-slate-800 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 w-full backdrop-blur-md bg-opacity-95">
      <div id="toast-icon-wrap" class="bg-brand-500/20 text-brand-400 p-1.5 rounded-full shrink-0">
        <i data-lucide="check" id="toast-icon" class="w-4 h-4"></i>
      </div>
      <p id="toast-message" class="text-sm font-bold flex-1">แจ้งเตือน</p>
    </div>
  </div>

  <!-- Application Logic -->
  <script>
    lucide.createIcons();

    /* ==========================================
       1. STATE & MOCK DATA
       ========================================== */
    const STATE = {
      loading: true,
      currentTab: 'active', // 'active' | 'history'
      selectedItem: null,
      scheduleDays: 3,
      maxDays: 7,
      db: [
        { id: "RSV-8492", bookTitle: "The Design of Everyday Things", status: "ready", holdUntil: "2026-05-02T16:00:00Z", cover: "https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&w=150&q=80" },
        { id: "RSV-8501", bookTitle: "Atomic Habits", status: "waiting", queuePos: 2, etaAvailable: "2026-05-05T00:00:00Z", cover: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=150&q=80" },
        { id: "RSV-8210", bookTitle: "Sapiens: A Brief History", status: "completed", date: "2026-04-10T14:30:00Z", cover: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=150&q=80" },
        { id: "RSV-8105", bookTitle: "Clean Code", status: "cancelled", date: "2026-03-25T09:15:00Z", cover: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=150&q=80" },
        { id: "RSV-7992", bookTitle: "Think Again", status: "expired", date: "2026-02-14T16:00:00Z", cover: "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=150&q=80" }
      ]
    };

    /* ==========================================
       2. HELPER FUNCTIONS
       ========================================== */
    function fmtDate(isoString, withTime = false) {
      if(!isoString) return "-";
      const d = new Date(isoString);
      const opts = { year: '2-digit', month: 'short', day: 'numeric' };
      if(withTime) { opts.hour = '2-digit'; opts.minute = '2-digit'; }
      return d.toLocaleDateString('th-TH', opts) + (withTime ? ' น.' : '');
    }

    function calculatePreviewDate(addDays) {
      const d = new Date(); // Mock today
      d.setDate(d.getDate() + addDays);
      return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function showToast(msg, type = 'success') {
      const t = document.getElementById('toast-container');
      const iconWrap = document.getElementById('toast-icon-wrap');
      const icon = document.getElementById('toast-icon');
      
      document.getElementById('toast-message').innerText = msg;
      
      if(type === 'success') {
        iconWrap.className = 'bg-brand-500/20 text-brand-400 p-1.5 rounded-full shrink-0';
        icon.setAttribute('data-lucide', 'check');
      } else if(type === 'loading') {
        iconWrap.className = 'bg-slate-600 text-white p-1.5 rounded-full shrink-0 animate-spin';
        icon.setAttribute('data-lucide', 'loader-2');
      } else {
        iconWrap.className = 'bg-rose-500/20 text-rose-400 p-1.5 rounded-full shrink-0';
        icon.setAttribute('data-lucide', 'alert-circle');
      }
      lucide.createIcons();
      
      t.classList.remove('hidden');
      void t.offsetWidth; 
      t.classList.remove('-translate-y-4', 'opacity-0');
      
      if(type !== 'loading') {
        setTimeout(() => {
          t.classList.add('-translate-y-4', 'opacity-0');
          setTimeout(() => t.classList.add('hidden'), 300);
        }, 2500);
      }
      return t;
    }

    /* ==========================================
       3. RENDER LOGIC
       ========================================== */
    const listContainer = document.getElementById('reservations-list-container');

    function renderSkeleton() {
      listContainer.innerHTML = Array(3).fill(0).map((_, i) => `
        <div class="bg-white rounded-[1.5rem] p-4 border border-slate-100 shadow-sm flex gap-4 fade-in" style="animation-delay: ${i*50}ms">
          <div class="skeleton-box w-16 h-24 rounded-xl shrink-0"></div>
          <div class="flex-1 py-1 flex flex-col">
            <div class="skeleton-box w-3/4 h-4 mb-2 rounded"></div>
            <div class="skeleton-box w-1/2 h-3 mb-auto rounded"></div>
            <div class="skeleton-box w-full h-10 rounded-xl mt-3"></div>
          </div>
        </div>
      `).join('');
    }

    function renderEmptyState(tab) {
      const title = tab === 'active' ? 'ไม่มีรายการจองที่รอรับ' : 'ไม่มีประวัติการจอง';
      listContainer.innerHTML = `
        <div class="py-16 flex flex-col items-center justify-center text-center fade-in">
          <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
            <i data-lucide="bookmark-minus" class="w-8 h-8 text-slate-300"></i>
          </div>
          <p class="font-bold text-slate-600 text-lg">${title}</p>
          <p class="text-sm text-slate-400 mt-1">กดค้นหาหนังสือที่คุณสนใจและจองได้เลย</p>
          ${tab === 'active' ? `
            <button class="pressable mt-6 bg-brand-50 text-brand-600 font-bold px-5 py-2.5 rounded-full text-sm flex items-center gap-2">
              <i data-lucide="search" class="w-4 h-4"></i> ค้นหาหนังสือ
            </button>
          ` : ''}
        </div>
      `;
      lucide.createIcons();
    }

    function renderList() {
      // Filter Logic (Model 2)
      const isAct = STATE.currentTab === 'active';
      const items = STATE.db.filter(i => isAct ? ['ready', 'waiting'].includes(i.status) : ['completed', 'cancelled', 'expired'].includes(i.status));

      document.getElementById('list-title').innerText = isAct ? 'รายการที่รอรับ' : 'ประวัติย้อนหลัง';
      document.getElementById('list-count').innerText = `คุณมี ${items.length} รายการ`;
      document.getElementById('badge-active').innerText = STATE.db.filter(i => ['ready','waiting'].includes(i.status)).length;

      if(items.length === 0) { renderEmptyState(STATE.currentTab); return; }

      let html = '';
      items.forEach((item, idx) => {
        const delay = idx * 50;
        
        // 1. Ready State (Green Edge)
        if (item.status === 'ready') {
          html += `
            <article class="pressable bg-white rounded-[1.5rem] border border-slate-100 shadow-card flex gap-4 p-3 relative overflow-hidden fade-in" style="animation-delay: ${delay}ms">
              <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-400"></div>
              <div class="w-20 h-28 bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-100 ml-1">
                <img src="${item.cover}" class="w-full h-full object-cover mix-blend-multiply" alt="cover">
              </div>
              <div class="flex-1 flex flex-col min-w-0 pt-1 pb-0.5">
                <div class="flex justify-between items-start gap-2 mb-1">
                  <h3 class="font-bold text-slate-800 text-sm leading-tight line-clamp-2">${item.bookTitle}</h3>
                </div>
                <div class="inline-flex mb-auto">
                  <span class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-black tracking-wide flex items-center gap-1">
                    <i data-lucide="check-circle-2" class="w-3 h-3"></i> หนังสือพร้อมรับ
                  </span>
                </div>
                <p class="text-[10px] font-bold text-rose-500/90 mb-3 flex items-center gap-1">
                  <i data-lucide="clock" class="w-3 h-3"></i> หมดเขตรับ: ${fmtDate(item.holdUntil, true)}
                </p>
                <div class="flex gap-2 mt-auto">
                  <button class="pressable btn-barcode flex-[2] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] py-2 rounded-xl transition-colors" data-id="${item.id}">
                    แสดงรหัส
                  </button>
                  <button class="pressable btn-cancel flex-1 bg-white border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 font-bold text-[11px] py-2 rounded-xl transition-colors" data-id="${item.id}">
                    ยกเลิก
                  </button>
                </div>
              </div>
            </article>
          `;
        } 
        // 2. Waiting State (Yellow Edge)
        else if (item.status === 'waiting') {
          html += `
            <article class="pressable bg-white rounded-[1.5rem] border border-slate-100 shadow-card flex gap-4 p-3 relative overflow-hidden fade-in" style="animation-delay: ${delay}ms">
              <div class="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-400"></div>
              <div class="w-20 h-28 bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-100 ml-1">
                <img src="${item.cover}" class="w-full h-full object-cover mix-blend-multiply opacity-80 grayscale-[30%]" alt="cover">
              </div>
              <div class="flex-1 flex flex-col min-w-0 pt-1 pb-0.5">
                <h3 class="font-bold text-slate-800 text-sm leading-tight line-clamp-2 mb-1">${item.bookTitle}</h3>
                <div class="inline-flex mb-auto">
                  <span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-black tracking-wide flex items-center gap-1">
                    <i data-lucide="loader" class="w-3 h-3"></i> รอคิว (คิวที่ ${item.queuePos})
                  </span>
                </div>
                <p class="text-[10px] font-bold text-slate-400 mb-3 flex items-center gap-1">
                  คาดว่าว่าง: ${fmtDate(item.etaAvailable)}
                </p>
                <div class="flex gap-2 mt-auto">
                  <button class="pressable btn-schedule flex-[2] bg-brand-50 hover:bg-brand-100 text-brand-700 font-bold text-[11px] py-2 rounded-xl transition-colors" data-id="${item.id}">
                    นัดหมายรับ
                  </button>
                  <button class="pressable btn-cancel flex-1 bg-white border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 font-bold text-[11px] py-2 rounded-xl transition-colors" data-id="${item.id}">
                    ยกเลิก
                  </button>
                </div>
              </div>
            </article>
          `;
        }
        // 3. History State (Compact)
        else {
          let badge = '';
          if(item.status === 'completed') badge = '<span class="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[10px] font-black">รับเล่มแล้ว</span>';
          else if(item.status === 'cancelled') badge = '<span class="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[10px] font-black">ยกเลิก</span>';
          else if(item.status === 'expired') badge = '<span class="text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[10px] font-black">หมดเวลา</span>';

          html += `
            <article class="pressable bg-white rounded-[1.25rem] border border-slate-100 p-3 flex gap-3 shadow-sm fade-in" style="animation-delay: ${delay}ms">
              <div class="w-12 h-16 bg-slate-50 rounded-lg overflow-hidden shrink-0 border border-slate-100">
                <img src="${item.cover}" class="w-full h-full object-cover mix-blend-multiply opacity-60 grayscale" alt="cover">
              </div>
              <div class="flex-1 flex flex-col justify-center min-w-0">
                <div class="flex justify-between items-start gap-2 mb-1">
                  <h3 class="font-bold text-slate-700 text-xs leading-tight line-clamp-1">${item.bookTitle}</h3>
                  ${badge}
                </div>
                <p class="text-[10px] font-mono text-slate-400 mb-1">${item.id}</p>
                <p class="text-[9px] font-bold text-slate-400 uppercase">${fmtDate(item.date, true)}</p>
              </div>
            </article>
          `;
        }
      });

      listContainer.innerHTML = html;
      
      // Attach Action Listeners
      document.querySelectorAll('.btn-barcode').forEach(btn => btn.addEventListener('click', (e) => openBarcodeSheet(e.currentTarget.dataset.id)));
      document.querySelectorAll('.btn-schedule').forEach(btn => btn.addEventListener('click', (e) => openScheduleSheet(e.currentTarget.dataset.id)));
      document.querySelectorAll('.btn-cancel').forEach(btn => btn.addEventListener('click', (e) => handleCancel(e.currentTarget.dataset.id)));

      lucide.createIcons();
    }

    // Core Load Data
    function loadData() {
      STATE.loading = true;
      renderSkeleton();
      setTimeout(() => {
        STATE.loading = false;
        renderList();
      }, 800);
    }

    /* ==========================================
       4. ACTIONS & BOTTOM SHEETS
       ========================================== */
    
    // Tab Switching
    const tabs = document.querySelectorAll('.segment-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        if(STATE.loading) return;
        tabs.forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        STATE.currentTab = e.currentTarget.getAttribute('data-tab');
        renderList(); // Soft re-render without skeleton for snappiness
      });
    });

    // Refresh
    document.getElementById('btn-refresh').addEventListener('click', () => {
      if(STATE.loading) return;
      document.getElementById('refresh-icon').classList.add('animate-spin');
      if(navigator.vibrate) navigator.vibrate(30);
      loadData();
      setTimeout(() => document.getElementById('refresh-icon').classList.remove('animate-spin'), 800);
    });

    // Cancel Action
    function handleCancel(id) {
      if(confirm('ยืนยันยกเลิกการจองรายการนี้?')) {
        const item = STATE.db.find(i => i.id === id);
        if(item) {
          item.status = 'cancelled';
          item.date = new Date().toISOString();
          showToast('ยกเลิกรายการจองสำเร็จ');
          renderList();
        }
      }
    }

    // Sheet 1: Barcode
    const overlay1 = document.getElementById('sheet-backdrop-1');
    const sheetBarcode = document.getElementById('sheet-barcode');
    
    function openBarcodeSheet(id) {
      const item = STATE.db.find(i => i.id === id);
      document.getElementById('barcode-book-title').innerText = item.bookTitle;
      document.getElementById('barcode-id').innerText = item.id;
      
      if(navigator.vibrate) navigator.vibrate(50);
      overlay1.classList.add('active');
      sheetBarcode.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    
    function closeBarcodeSheet() {
      overlay1.classList.remove('active');
      sheetBarcode.classList.remove('active');
      document.body.style.overflow = '';
    }
    overlay1.addEventListener('click', closeBarcodeSheet);

    // Sheet 2: Schedule (With Logic Model 2/4)
    const overlay2 = document.getElementById('sheet-backdrop-2');
    const sheetSchedule = document.getElementById('sheet-schedule');
    const btnInc = document.getElementById('btn-inc-days');
    const btnDec = document.getElementById('btn-dec-days');
    const daysDisp = document.getElementById('schedule-days-count');
    const duePreview = document.getElementById('schedule-due-preview');
    
    function updateScheduleUI() {
      daysDisp.innerText = STATE.scheduleDays;
      btnDec.disabled = STATE.scheduleDays <= 1;
      btnInc.disabled = STATE.scheduleDays >= STATE.maxDays;
      duePreview.innerText = calculatePreviewDate(STATE.scheduleDays);
    }

    btnInc.addEventListener('click', () => {
      if(STATE.scheduleDays < STATE.maxDays) {
        STATE.scheduleDays++;
        if(navigator.vibrate) navigator.vibrate(20);
        updateScheduleUI();
      }
    });

    btnDec.addEventListener('click', () => {
      if(STATE.scheduleDays > 1) {
        STATE.scheduleDays--;
        if(navigator.vibrate) navigator.vibrate(20);
        updateScheduleUI();
      }
    });

    function openScheduleSheet(id) {
      const item = STATE.db.find(i => i.id === id);
      STATE.selectedItem = item;
      STATE.scheduleDays = 3; // Reset default
      
      document.getElementById('schedule-book-title').innerText = item.bookTitle;
      updateScheduleUI();
      
      if(navigator.vibrate) navigator.vibrate(50);
      overlay2.classList.add('active');
      sheetSchedule.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeScheduleSheet() {
      overlay2.classList.remove('active');
      sheetSchedule.classList.remove('active');
      document.body.style.overflow = '';
      STATE.selectedItem = null;
    }
    overlay2.addEventListener('click', closeScheduleSheet);

    document.getElementById('btn-confirm-schedule').addEventListener('click', () => {
      const btn = document.getElementById('btn-confirm-schedule');
      const original = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> กำลังบันทึก...';
      btn.disabled = true;
      
      // Simulate API
      setTimeout(() => {
        closeScheduleSheet();
        showToast('บันทึกการนัดหมายรับหนังสือสำเร็จ', 'success');
        btn.innerHTML = original;
        btn.disabled = false;
        lucide.createIcons();
      }, 1000);
    });

    // Close all sheets on internal close buttons
    document.querySelectorAll('.btn-close-sheet').forEach(btn => {
      btn.addEventListener('click', () => {
        closeBarcodeSheet();
        closeScheduleSheet();
      });
    });

    // Init
    loadData();

  </script>
</body>
</html>
