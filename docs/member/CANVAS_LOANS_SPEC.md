<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no">
  <title>รายการยืมของฉัน - ANT Library</title>
  
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
    .pressable:active { transform: scale(0.96); opacity: 0.8; }
    .pressable:disabled { transform: none; opacity: 0.5; cursor: not-allowed; }
    
    .touch-target { min-height: 48px; min-width: 48px; }

    /* Hide Scrollbar */
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    /* Skeleton */
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
    
    /* Segmented Control Active State */
    .segment-btn.active {
      background-color: white;
      color: #0284C7; /* brand-600 */
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
  </style>
</head>
<body class="text-slate-800 antialiased">

  <div class="app-container">
    
    <!-- ==========================================
         1. HEADER & TABS (Sticky)
         ========================================== -->
    <header class="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200" style="padding-top: max(1rem, var(--safe-top))">
      <div class="flex items-center justify-between px-4 pb-2">
        <button class="pressable touch-target flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100">
          <i data-lucide="chevron-left" class="w-6 h-6"></i>
        </button>
        <h1 class="text-lg font-black text-slate-800 tracking-tight">หนังสือของฉัน</h1>
        <button id="btn-refresh" class="pressable touch-target flex items-center justify-center w-10 h-10 rounded-full bg-brand-50 text-brand-600 hover:bg-brand-100">
          <i data-lucide="rotate-cw" class="w-5 h-5" id="refresh-icon"></i>
        </button>
      </div>

      <!-- Native Segmented Control -->
      <div class="px-4 pb-3 pt-1">
        <div class="bg-slate-100 p-1 rounded-xl flex items-center">
          <button class="segment-btn active pressable flex-1 py-2 rounded-lg text-sm font-bold text-slate-500 transition-all" data-tab="active">
            กำลังยืม <span id="badge-active" class="ml-1 bg-brand-100 text-brand-600 px-1.5 py-0.5 rounded-md text-[10px]">0</span>
          </button>
          <button class="segment-btn pressable flex-1 py-2 rounded-lg text-sm font-bold text-slate-500 transition-all" data-tab="history">
            ประวัติยืม-คืน
          </button>
        </div>
      </div>
    </header>

    <!-- ==========================================
         MAIN SCROLLABLE CONTENT
         ========================================== -->
    <main class="flex-1 overflow-y-auto overscroll-contain pb-28 hide-scrollbar" id="main-scroll">
      
      <div class="p-4 space-y-4">
        
        <!-- Drop Box Info (Always visible) -->
        <article class="rounded-2xl border border-sky-100 bg-sky-50 p-3 flex items-start gap-3 shadow-sm">
          <div class="bg-sky-100 text-sky-600 p-2 rounded-full shrink-0 mt-0.5">
            <i data-lucide="info" class="w-4 h-4"></i>
          </div>
          <div>
            <p class="text-[13px] font-bold text-sky-800 leading-tight">บริการคืนหนังสือด้วยตนเอง (Drop Box) <br>เปิดให้บริการตลอด 24 ชม.</p>
            <p class="text-[11px] text-sky-600/80 mt-1 font-semibold">บริเวณจุด Drop Box หน้าห้องสมุด</p>
          </div>
        </article>

        <!-- Fine Summary Alert (Conditional - Show only if unpaid fines exist) -->
        <article id="fine-alert-card" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm flex items-center justify-between fade-in hidden">
          <div class="flex items-center gap-3">
            <div class="bg-rose-100 text-rose-600 p-2.5 rounded-full shrink-0">
              <i data-lucide="alert-circle" class="w-5 h-5"></i>
            </div>
            <div>
              <p class="text-xs font-black text-rose-800 uppercase tracking-wide">มียอดค่าปรับค้างชำระ</p>
              <p class="text-lg font-black text-rose-600 mt-[-2px]">60.00 ฿</p>
            </div>
          </div>
          <button class="pressable bg-rose-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md">
            ตรวจสอบ
          </button>
        </article>

        <!-- List Container (Active / History) -->
        <section id="loans-list-container" class="space-y-3 min-h-[300px]">
          <!-- Items injected here -->
        </section>

      </div>
    </main>

    <!-- ==========================================
         BOTTOM NAVIGATION
         ========================================== -->
    <nav class="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] max-w-[480px] mx-auto" style="padding-bottom: var(--safe-bottom)">
      <div class="flex justify-around items-center h-[68px] px-1">
        <a href="#" class="pressable touch-target flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-brand-600">
          <i data-lucide="layout-dashboard" class="w-[22px] h-[22px] mb-1"></i>
          <span class="text-[10px] font-bold">หน้าหลัก</span>
        </a>
        <!-- Active Tab in Bottom Nav -->
        <a href="#" class="pressable touch-target flex flex-col items-center justify-center w-full h-full text-brand-600">
          <i data-lucide="book-open" class="w-[22px] h-[22px] mb-1"></i>
          <span class="text-[10px] font-bold">หนังสือ</span>
        </a>
        
        <!-- Scan FAB -->
        <div class="relative -top-5 w-full flex justify-center shrink-0" style="min-width: 72px;">
          <button class="pressable w-14 h-14 bg-gradient-to-br from-brand-500 to-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-brand-500/40 border-[3px] border-white">
            <i data-lucide="scan" class="w-6 h-6"></i>
          </button>
        </div>

        <a href="#" class="pressable touch-target flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-brand-600">
          <i data-lucide="user" class="w-[22px] h-[22px] mb-1"></i>
          <span class="text-[10px] font-bold">ฉัน</span>
        </a>
        <a href="#" class="pressable touch-target flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-brand-600">
          <i data-lucide="more-horizontal" class="w-[22px] h-[22px] mb-1"></i>
          <span class="text-[10px] font-bold">เพิ่มเติม</span>
        </a>
      </div>
    </nav>

  </div> <!-- End App Container -->

  <!-- TOAST NOTIFICATION -->
  <div id="toast-container" class="fixed top-[max(1.5rem,var(--safe-top))] left-1/2 -translate-x-1/2 z-50 pointer-events-none w-[90%] max-w-[400px] hidden">
    <div class="bg-slate-800 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 w-full backdrop-blur-md bg-opacity-95">
      <div id="toast-icon-wrap" class="bg-brand-500/20 text-brand-400 p-1.5 rounded-full shrink-0">
        <i data-lucide="check" id="toast-icon" class="w-4 h-4"></i>
      </div>
      <p id="toast-message" class="text-sm font-bold">แจ้งเตือน</p>
    </div>
  </div>

  <!-- Application Logic -->
  <script>
    lucide.createIcons();

    /* ==========================================
       1. DATA & STATE
       ========================================== */
    const STATE = {
      loading: true,
      currentTab: 'active', // 'active' or 'history'
      renewingById: {}, // Set loading state per item
      fines: { hasUnpaid: true, amount: 60 },
      policy: { renewLimit: 2 },
      activeItems: [
        { id: "L-101", title: "Sapiens: A Brief History", barcode: "88500213", borrowedAt: "2026-04-25T10:00:00Z", dueDate: "2026-05-02T23:59:59Z", status: "borrowing", renewCount: 0, cover: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=150&q=80" },
        { id: "L-102", title: "Atomic Habits", barcode: "88500214", borrowedAt: "2026-04-20T09:00:00Z", dueDate: "2026-04-30T23:59:59Z", status: "borrowing", renewCount: 1, cover: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=150&q=80" },
        { id: "L-103", title: "The Design of Everyday Things", barcode: "88500215", borrowedAt: "2026-04-10T14:30:00Z", dueDate: "2026-04-17T23:59:59Z", status: "borrowing", renewCount: 2, cover: "https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&w=150&q=80" }, // Overdue & Max Renew
      ],
      historyItems: [
        { id: "L-099", title: "Clean Code", barcode: "88500100", borrowedAt: "2026-03-01T08:00:00Z", returnedAt: "2026-03-07T10:15:00Z", status: "returned" },
        { id: "L-098", title: "Think Again", barcode: "88500101", borrowedAt: "2026-02-15T11:00:00Z", returnedAt: "2026-02-23T14:00:00Z", status: "returned_late" },
      ]
    };

    /* ==========================================
       2. HELPER FUNCTIONS
       ========================================== */
    function fmtDate(isoString) {
      if(!isoString) return "-";
      const d = new Date(isoString);
      return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    // Logic for Due Date Badge & Status (Model 2)
    function analyzeDueStatus(dueDateStr) {
      const due = new Date(dueDateStr);
      const now = new Date("2026-04-29T16:17:00Z"); // Fix current date as per prompt context
      const diffTime = due - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      if (diffDays < 0) {
        return { isOverdue: true, days: Math.abs(diffDays), badgeHtml: `<span class="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide flex items-center gap-1"><i data-lucide="alert-triangle" class="w-3 h-3"></i> เกินกำหนด ${Math.abs(diffDays)} วัน</span>` };
      } else if (diffDays <= 2) {
        return { isOverdue: false, days: diffDays, badgeHtml: `<span class="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide flex items-center gap-1"><i data-lucide="clock" class="w-3 h-3"></i> เหลือ ${diffDays} วัน</span>` };
      } else {
        return { isOverdue: false, days: diffDays, badgeHtml: `<span class="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide flex items-center gap-1">อีก ${diffDays} วัน</span>` };
      }
    }

    // Toast UI
    function showToast(msg, type = 'success') {
      const t = document.getElementById('toast-container');
      const iconWrap = document.getElementById('toast-icon-wrap');
      const icon = document.getElementById('toast-icon');
      
      document.getElementById('toast-message').innerText = msg;
      
      if(type === 'success') {
        iconWrap.className = 'bg-brand-500/20 text-brand-400 p-1.5 rounded-full shrink-0';
        icon.setAttribute('data-lucide', 'check');
      } else {
        iconWrap.className = 'bg-rose-500/20 text-rose-400 p-1.5 rounded-full shrink-0';
        icon.setAttribute('data-lucide', 'alert-circle');
      }
      lucide.createIcons();
      
      t.classList.remove('hidden');
      t.style.animation = 'none'; void t.offsetWidth; // Reflow
      t.style.animation = 'fadeIn 0.3s ease-out forwards';
      setTimeout(() => t.classList.add('hidden'), 3000);
    }

    /* ==========================================
       3. RENDER LOGIC
       ========================================== */
    const listContainer = document.getElementById('loans-list-container');

    function renderSkeleton() {
      listContainer.innerHTML = `
        <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-card flex gap-4">
          <div class="skeleton-box w-16 h-20 rounded-xl shrink-0"></div>
          <div class="flex-1 py-1"><div class="skeleton-box w-3/4 h-4 mb-2"></div><div class="skeleton-box w-1/2 h-3 mb-4"></div><div class="skeleton-box w-full h-8 rounded-lg"></div></div>
        </div>
        <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-card flex gap-4">
          <div class="skeleton-box w-16 h-20 rounded-xl shrink-0"></div>
          <div class="flex-1 py-1"><div class="skeleton-box w-3/4 h-4 mb-2"></div><div class="skeleton-box w-1/2 h-3 mb-4"></div><div class="skeleton-box w-full h-8 rounded-lg"></div></div>
        </div>
      `;
    }

    function renderEmptyState(tab) {
      const title = tab === 'active' ? 'ไม่มีหนังสือที่กำลังยืม' : 'ไม่มีประวัติการยืม';
      const desc = tab === 'active' ? 'คุณสามารถค้นหาหนังสือที่น่าสนใจและยืมได้เลย' : 'เมื่อคุณยืมและคืนหนังสือ ประวัติจะแสดงที่นี่';
      
      listContainer.innerHTML = `
        <div class="py-12 flex flex-col items-center justify-center text-center fade-in">
          <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
            <i data-lucide="book-open" class="w-8 h-8 text-slate-300"></i>
          </div>
          <p class="font-bold text-slate-600 text-lg">${title}</p>
          <p class="text-sm text-slate-400 mt-1 px-4">${desc}</p>
        </div>
      `;
      lucide.createIcons();
    }

    function renderActiveLoans() {
      if(STATE.activeItems.length === 0) { renderEmptyState('active'); return; }

      let html = '';
      STATE.activeItems.forEach(item => {
        const status = analyzeDueStatus(item.dueDate);
        const isRenewing = STATE.renewingById[item.id];
        
        // Renew Logic (Model 2)
        const canRenew = !status.isOverdue && item.renewCount < STATE.policy.renewLimit;
        let renewBtnAttr = '';
        let renewBtnClass = 'bg-brand-50 text-brand-700 hover:bg-brand-100';
        let renewBtnText = 'ต่ออายุการยืม';
        let renewIcon = 'refresh-cw';

        if (isRenewing) {
          renewBtnText = 'กำลังดำเนินการ...';
          renewIcon = 'loader-2';
          renewBtnAttr = 'disabled';
          renewBtnClass = 'bg-brand-50 text-brand-400';
        } else if (status.isOverdue) {
          renewBtnText = 'ต่ออายุไม่ได้ (เกินกำหนด)';
          renewBtnAttr = 'disabled';
          renewBtnClass = 'bg-slate-100 text-slate-400';
          renewIcon = 'lock';
        } else if (item.renewCount >= STATE.policy.renewLimit) {
          renewBtnText = 'ต่ออายุครบกำหนดแล้ว';
          renewBtnAttr = 'disabled';
          renewBtnClass = 'bg-slate-100 text-slate-400';
          renewIcon = 'lock';
        }

        html += `
          <article class="bg-white rounded-2xl p-4 border border-slate-200 shadow-card fade-in flex gap-4 relative overflow-hidden">
            ${status.isOverdue ? '<div class="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-500"></div>' : ''}
            
            <!-- Book Cover Mock -->
            <div class="w-16 h-24 bg-slate-100 rounded-xl shrink-0 overflow-hidden border border-slate-200">
              <img src="${item.cover}" class="w-full h-full object-cover mix-blend-multiply opacity-90" alt="cover">
            </div>

            <div class="flex-1 flex flex-col min-w-0">
              <div class="flex justify-between items-start gap-2 mb-1">
                <h3 class="font-bold text-slate-800 text-sm line-clamp-2 leading-tight">${item.title}</h3>
              </div>
              <p class="text-[11px] font-mono font-bold text-slate-400 mb-2">${item.barcode}</p>
              
              <div class="flex items-center justify-between mb-3 mt-auto">
                <div class="flex flex-col">
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">กำหนดคืน</span>
                  <span class="text-xs font-bold text-slate-700">${fmtDate(item.dueDate)}</span>
                </div>
                ${status.badgeHtml}
              </div>

              <div class="flex items-center gap-2">
                <button 
                  class="pressable flex-1 ${renewBtnClass} text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors btn-renew"
                  data-id="${item.id}"
                  ${renewBtnAttr}
                >
                  <i data-lucide="${renewIcon}" class="w-3.5 h-3.5 ${isRenewing ? 'animate-spin' : ''}"></i>
                  ${renewBtnText}
                </button>
              </div>
              <p class="text-[9px] text-center text-slate-400 font-bold mt-1.5">ต่ออายุแล้ว ${item.renewCount}/${STATE.policy.renewLimit} ครั้ง</p>
            </div>
          </article>
        `;
      });

      listContainer.innerHTML = html;
      
      // Attach Renew Listeners
      document.querySelectorAll('.btn-renew:not([disabled])').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          handleRenew(id);
        });
      });
      lucide.createIcons();
    }

    function renderHistory() {
      if(STATE.historyItems.length === 0) { renderEmptyState('history'); return; }

      let html = '';
      STATE.historyItems.forEach(item => {
        const isLate = item.status === 'returned_late';
        html += `
          <article class="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm fade-in">
            <div class="flex justify-between items-start gap-2 mb-1">
              <h3 class="font-bold text-slate-800 text-sm line-clamp-1">${item.title}</h3>
              ${isLate 
                ? '<span class="bg-rose-50 text-rose-600 px-2 py-0.5 rounded text-[10px] font-black shrink-0">คืนล่าช้า</span>' 
                : '<span class="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-black shrink-0">คืนแล้ว</span>'}
            </div>
            <p class="text-[11px] font-mono text-slate-400 mb-3">${item.barcode}</p>
            
            <div class="flex items-center justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
              <div class="text-center flex-1 border-r border-slate-200">
                <p class="text-[9px] font-bold text-slate-400 uppercase">วันที่ยืม</p>
                <p class="text-xs font-bold text-slate-700 mt-0.5">${fmtDate(item.borrowedAt)}</p>
              </div>
              <div class="text-center flex-1">
                <p class="text-[9px] font-bold text-slate-400 uppercase">วันที่คืน</p>
                <p class="text-xs font-bold text-${isLate ? 'rose-600' : 'slate-700'} mt-0.5">${fmtDate(item.returnedAt)}</p>
              </div>
            </div>
          </article>
        `;
      });

      listContainer.innerHTML = html;
      lucide.createIcons();
    }

    // Core Load Function
    function loadData() {
      STATE.loading = true;
      renderSkeleton();
      
      // Update Headers/Alerts
      document.getElementById('badge-active').innerText = STATE.activeItems.length;
      if (STATE.fines.hasUnpaid) {
        document.getElementById('fine-alert-card').classList.remove('hidden');
      }

      // Simulate API Delay
      setTimeout(() => {
        STATE.loading = false;
        if(STATE.currentTab === 'active') renderActiveLoans();
        else renderHistory();
      }, 600);
    }

    /* ==========================================
       4. INTERACTIONS
       ========================================== */
    
    // Segmented Tabs
    const tabs = document.querySelectorAll('.segment-btn');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        
        STATE.currentTab = e.currentTarget.getAttribute('data-tab');
        if(!STATE.loading) {
          if(STATE.currentTab === 'active') renderActiveLoans();
          else renderHistory();
        }
      });
    });

    // Renew Action (Model 4)
    function handleRenew(id) {
      // 1. Set Renewing State
      STATE.renewingById[id] = true;
      renderActiveLoans(); // Re-render to show loading button
      
      // 2. Simulate API Call
      setTimeout(() => {
        STATE.renewingById[id] = false;
        
        // Find and update item locally (Mocking success)
        const item = STATE.activeItems.find(i => i.id === id);
        if(item) {
          item.renewCount += 1;
          // Extend due date by 7 days for demo
          const newDue = new Date(item.dueDate);
          newDue.setDate(newDue.getDate() + 7);
          item.dueDate = newDue.toISOString();
        }
        
        showToast('ต่ออายุหนังสือสำเร็จแล้ว');
        renderActiveLoans();
      }, 1000);
    }

    // Refresh Button
    const btnRefresh = document.getElementById('btn-refresh');
    const refreshIcon = document.getElementById('refresh-icon');
    btnRefresh.addEventListener('click', () => {
      if(STATE.loading) return;
      refreshIcon.classList.add('animate-spin');
      loadData();
      setTimeout(() => refreshIcon.classList.remove('animate-spin'), 600);
    });

    // Initialize
    loadData();

  </script>
</body>
</html>
