<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <!-- Native App Viewport & Safe Area -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no">
  <title>ค่าปรับของฉัน - ANT Library</title>
  
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
      background-color: #F1F5F9; /* Slate 100 for desktop background */
      -webkit-tap-highlight-color: transparent;
      overscroll-behavior-y: none;
    }
    
    /* Mobile App Container Constraint */
    .app-container {
      max-width: 480px;
      margin: 0 auto;
      background-color: #F8FAFC; /* Slate 50 inner background */
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
    
    /* Touch Target Minimums */
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

    /* Fade In for dynamic content */
    .fade-in { animation: fadeIn 0.3s ease-out forwards; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body class="text-slate-800 antialiased">

  <div class="app-container">
    
    <!-- ==========================================
         1. HEADER (Sticky)
         ========================================== -->
    <header class="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200" style="padding-top: max(1rem, var(--safe-top))">
      <div class="flex items-center justify-between px-4 pb-3">
        <!-- Back Button -->
        <button class="pressable touch-target flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors">
          <i data-lucide="chevron-left" class="w-6 h-6"></i>
        </button>
        
        <h1 class="text-lg font-black text-slate-800 tracking-tight">ค่าปรับของฉัน</h1>
        
        <!-- Refresh Button -->
        <button id="btn-refresh" class="pressable touch-target flex items-center justify-center w-10 h-10 rounded-full bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors">
          <i data-lucide="rotate-cw" class="w-5 h-5" id="refresh-icon"></i>
        </button>
      </div>
    </header>

    <!-- ==========================================
         MAIN SCROLLABLE CONTENT
         ========================================== -->
    <main class="flex-1 overflow-y-auto overscroll-contain pb-28 hide-scrollbar" id="main-scroll">
      
      <div class="p-4 space-y-5">
        
        <!-- 2. Business Hours Notification -->
        <article class="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm flex items-start gap-3">
          <div class="bg-amber-100 text-amber-600 p-2 rounded-full shrink-0">
            <i data-lucide="clock" class="w-5 h-5"></i>
          </div>
          <div>
            <h3 class="text-sm font-black text-amber-900">เวลาทำการชำระเงินเคาน์เตอร์</h3>
            <p class="text-xs font-semibold text-amber-700/80 mt-1 leading-snug">09:00 - 16:00 น. (เว้นวันหยุดราชการ)</p>
          </div>
        </article>

        <!-- 3. Summary Dashboard (2x2 Grid) -->
        <section id="summary-dashboard">
          <h2 class="text-sm font-black text-slate-800 mb-3 px-1">สรุปข้อมูลค่าปรับ</h2>
          <div class="grid grid-cols-2 gap-3">
            
            <!-- Card: ยอดค้างชำระ (Highlight) -->
            <div class="col-span-2 bg-gradient-to-br from-rose-500 to-rose-600 rounded-[1.5rem] p-5 text-white shadow-lg shadow-rose-500/20 relative overflow-hidden">
              <div class="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
              <div class="relative z-10 flex justify-between items-start">
                <div>
                  <p class="text-sm font-semibold text-rose-100 mb-1">ยอดค้างชำระรวม</p>
                  <div class="flex items-baseline gap-1.5">
                    <span class="text-xl font-bold">฿</span>
                    <h3 class="text-4xl font-black tracking-tight" id="sum-unpaid-amount">0</h3>
                  </div>
                </div>
                <div class="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
                  <i data-lucide="wallet" class="w-6 h-6 text-white"></i>
                </div>
              </div>
            </div>

            <!-- Card: ค้างชำระ (รายการ) -->
            <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-card flex flex-col justify-between h-[90px]">
              <p class="text-xs font-bold text-slate-500">ค้างชำระ</p>
              <div class="flex items-baseline gap-1">
                <h4 class="text-2xl font-black text-rose-500" id="sum-unpaid-count">0</h4>
                <span class="text-xs font-semibold text-slate-400">รายการ</span>
              </div>
            </div>

            <!-- Card: ชำระแล้ว / ยกเว้น -->
            <div class="flex flex-col gap-3">
              <div class="bg-white rounded-2xl p-3 border border-slate-200 shadow-card flex items-center justify-between flex-1">
                <p class="text-xs font-bold text-slate-500">ชำระแล้ว</p>
                <h4 class="text-lg font-black text-emerald-500" id="sum-paid-count">0</h4>
              </div>
              <div class="bg-white rounded-2xl p-3 border border-slate-200 shadow-card flex items-center justify-between flex-1">
                <p class="text-xs font-bold text-slate-500">ยกเว้น</p>
                <h4 class="text-lg font-black text-slate-700" id="sum-waived-count">0</h4>
              </div>
            </div>

          </div>
        </section>

        <!-- 4. Filter Controls (Native Horizontal Tabs) -->
        <section class="sticky top-0 z-20 bg-[#F8FAFC] py-2 -mx-4 px-4">
          <div class="flex gap-2 overflow-x-auto hide-scrollbar snap-x">
            <button class="filter-tab pressable touch-target active shrink-0 px-5 py-2 bg-slate-800 text-white rounded-full font-bold text-sm shadow-md" data-filter="all">
              ทั้งหมด
            </button>
            <button class="filter-tab pressable touch-target shrink-0 px-5 py-2 bg-white text-slate-600 border border-slate-200 rounded-full font-bold text-sm shadow-sm" data-filter="unpaid">
              ค้างชำระ <span class="ml-1 bg-rose-100 text-rose-600 px-1.5 rounded-md text-[10px]" id="badge-unpaid">0</span>
            </button>
            <button class="filter-tab pressable touch-target shrink-0 px-5 py-2 bg-white text-slate-600 border border-slate-200 rounded-full font-bold text-sm shadow-sm" data-filter="paid">
              ชำระแล้ว
            </button>
            <button class="filter-tab pressable touch-target shrink-0 px-5 py-2 bg-white text-slate-600 border border-slate-200 rounded-full font-bold text-sm shadow-sm" data-filter="waived">
              ยกเว้น
            </button>
          </div>
        </section>

        <!-- 5. Fines List Container -->
        <section id="fines-list-container" class="space-y-3 min-h-[300px]">
          <!-- Items will be injected here via JS -->
        </section>

      </div>
    </main>

    <!-- ==========================================
         BOTTOM NAVIGATION
         ========================================== -->
    <nav class="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] max-w-[480px] mx-auto" style="padding-bottom: var(--safe-bottom)">
      <div class="flex justify-around items-center h-[68px] px-1">
        <a href="#" class="pressable touch-target flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-brand-600 transition-colors">
          <i data-lucide="layout-dashboard" class="w-[22px] h-[22px] mb-1"></i>
          <span class="text-[10px] font-bold">หน้าหลัก</span>
        </a>
        <a href="#" class="pressable touch-target flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-brand-600 transition-colors">
          <i data-lucide="book-open" class="w-[22px] h-[22px] mb-1"></i>
          <span class="text-[10px] font-bold">หนังสือ</span>
        </a>
        
        <!-- Scan FAB -->
        <div class="relative -top-5 w-full flex justify-center shrink-0" style="min-width: 72px;">
          <button class="pressable w-14 h-14 bg-gradient-to-br from-brand-500 to-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-brand-500/40 border-[3px] border-white">
            <i data-lucide="scan" class="w-6 h-6"></i>
          </button>
        </div>

        <a href="#" class="pressable touch-target flex flex-col items-center justify-center w-full h-full text-brand-600">
          <i data-lucide="user" class="w-[22px] h-[22px] mb-1"></i>
          <span class="text-[10px] font-bold">ฉัน</span>
        </a>
        <a href="#" class="pressable touch-target flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-brand-600 transition-colors">
          <i data-lucide="more-horizontal" class="w-[22px] h-[22px] mb-1"></i>
          <span class="text-[10px] font-bold">เพิ่มเติม</span>
        </a>
      </div>
    </nav>

  </div> <!-- End App Container -->

  <!-- Application Logic -->
  <script>
    lucide.createIcons();

    /* ==========================================
       1. DATA & STATE
       ========================================== */
    const STATE = {
      loading: true,
      filter: 'all', // all, unpaid, paid, waived
      items: []
    };

    // Mock API Data
    const mockDb = [
      { id: "FN-6608001", loanId: "LN-2391", type: "overdue", amount: 45, status: "unpaid", bookTitle: "Sapiens: A Brief History", createdAt: "2026-04-25T10:00:00Z" },
      { id: "FN-6608005", loanId: "LN-2410", type: "overdue", amount: 15, status: "unpaid", bookTitle: "Atomic Habits", createdAt: "2026-04-28T09:00:00Z" },
      { id: "FN-6608002", loanId: "LN-2380", type: "damaged", amount: 250, status: "paid", bookTitle: "The Design of Everyday Things", createdAt: "2026-04-10T14:30:00Z", paidAt: "2026-04-12T09:15:00Z", paidTo: "นภัสกร อ." },
      { id: "FN-6608003", loanId: "LN-2315", type: "lost", amount: 450, status: "waived", bookTitle: "Clean Code", createdAt: "2026-03-01T08:00:00Z" },
      { id: "FN-6608004", loanId: "LN-2300", type: "overdue", amount: 30, status: "paid", bookTitle: "Think Again", createdAt: "2026-02-15T11:00:00Z", paidAt: "2026-02-20T13:00:00Z", paidTo: "สมชาย ค." }
    ];

    /* ==========================================
       2. HELPER FUNCTIONS
       ========================================== */
    function fmtDate(isoString) {
      if(!isoString) return "-";
      const d = new Date(isoString);
      return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    function typeLabel(type) {
      const map = { 'overdue': 'ส่งคืนล่าช้า', 'damaged': 'หนังสือชำรุด', 'lost': 'หนังสือสูญหาย' };
      return map[type] || type;
    }

    function statusBadge(status) {
      switch(status) {
        case 'unpaid': return `<span class="bg-rose-100 text-rose-600 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide uppercase">ค้างชำระ</span>`;
        case 'paid': return `<span class="bg-emerald-100 text-emerald-600 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide uppercase">ชำระแล้ว</span>`;
        case 'waived': return `<span class="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide uppercase">ยกเว้น</span>`;
        default: return `<span class="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wide uppercase">${status}</span>`;
      }
    }

    function typeIcon(type) {
      switch(type) {
        case 'overdue': return `<i data-lucide="clock" class="w-4 h-4 text-amber-500"></i>`;
        case 'damaged': return `<i data-lucide="book-x" class="w-4 h-4 text-rose-500"></i>`;
        case 'lost': return `<i data-lucide="help-circle" class="w-4 h-4 text-slate-500"></i>`;
        default: return `<i data-lucide="alert-circle" class="w-4 h-4 text-slate-500"></i>`;
      }
    }

    /* ==========================================
       3. RENDER LOGIC
       ========================================== */
    const listContainer = document.getElementById('fines-list-container');
    
    function renderSkeleton() {
      listContainer.innerHTML = `
        <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-card">
          <div class="flex justify-between items-start mb-3"><div class="skeleton-box w-24 h-5"></div><div class="skeleton-box w-16 h-5"></div></div>
          <div class="skeleton-box w-3/4 h-4 mb-2"></div><div class="skeleton-box w-1/2 h-4"></div>
        </div>
        <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-card">
          <div class="flex justify-between items-start mb-3"><div class="skeleton-box w-24 h-5"></div><div class="skeleton-box w-16 h-5"></div></div>
          <div class="skeleton-box w-3/4 h-4 mb-2"></div><div class="skeleton-box w-1/2 h-4"></div>
        </div>
      `;
    }

    function renderEmptyState() {
      listContainer.innerHTML = `
        <div class="py-12 flex flex-col items-center justify-center text-center fade-in">
          <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
            <i data-lucide="check-circle-2" class="w-8 h-8 text-slate-300"></i>
          </div>
          <p class="font-bold text-slate-600 text-lg">ไม่พบรายการค่าปรับ</p>
          <p class="text-sm text-slate-400 mt-1">ยอดเยี่ยมมาก! คุณไม่มีประวัติค้างชำระในหมวดนี้</p>
        </div>
      `;
      lucide.createIcons();
    }

    function updateSummaryData() {
      let unpCount = 0, unpAmount = 0, paidCount = 0, waivedCount = 0;
      STATE.items.forEach(item => {
        if(item.status === 'unpaid') { unpCount++; unpAmount += item.amount; }
        if(item.status === 'paid') paidCount++;
        if(item.status === 'waived') waivedCount++;
      });

      document.getElementById('sum-unpaid-amount').innerText = unpAmount.toLocaleString('th-TH');
      document.getElementById('sum-unpaid-count').innerText = unpCount;
      document.getElementById('sum-paid-count').innerText = paidCount;
      document.getElementById('sum-waived-count').innerText = waivedCount;
      document.getElementById('badge-unpaid').innerText = unpCount;
    }

    function renderList() {
      if(STATE.loading) { renderSkeleton(); return; }

      // Apply Filter
      const filtered = STATE.items.filter(item => STATE.filter === 'all' || item.status === STATE.filter);

      if(filtered.length === 0) {
        renderEmptyState();
        return;
      }

      // Generate HTML
      let html = '';
      filtered.forEach(item => {
        const isPaid = item.status === 'paid';
        
        html += `
          <article class="pressable rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-card fade-in relative overflow-hidden">
            ${item.status === 'unpaid' ? '<div class="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>' : ''}
            
            <div class="flex items-start justify-between gap-2 mb-3 pl-1">
              <div>
                <p class="text-[13px] font-black text-slate-800 flex items-center gap-1.5">
                  ${typeIcon(item.type)} 
                  ${item.id}
                </p>
              </div>
              ${statusBadge(item.status)}
            </div>

            <div class="pl-1 bg-slate-50/50 rounded-xl p-3 border border-slate-100">
              <p class="text-sm font-bold text-slate-700 line-clamp-1 mb-2">${item.bookTitle || '-'}</p>
              
              <div class="flex justify-between items-end mt-2">
                <div class="space-y-1">
                  <p class="text-[11px] font-bold text-slate-500 flex justify-between w-full"><span>สาเหตุ:</span> <span class="text-slate-700">${typeLabel(item.type)}</span></p>
                  <p class="text-[11px] font-bold text-slate-500 flex justify-between w-full gap-4"><span>วันที่แจ้ง:</span> <span class="text-slate-700">${fmtDate(item.createdAt)}</span></p>
                </div>
                <div class="text-right">
                  <span class="text-[10px] text-slate-400 font-bold block mb-[-2px]">จำนวนเงิน</span>
                  <span class="text-lg font-black ${item.status === 'unpaid' ? 'text-rose-600' : 'text-slate-800'}">${Number(item.amount).toLocaleString('th-TH')} ฿</span>
                </div>
              </div>
            </div>
            
            ${isPaid && item.paidAt ? `
              <div class="mt-3 pt-3 border-t border-slate-100 pl-1 flex justify-between items-center text-[10px] font-bold text-slate-400">
                <span>ชำระเมื่อ: ${fmtDate(item.paidAt)}</span>
                <span>ผู้รับเงิน: ${item.paidTo || '-'}</span>
              </div>
            ` : ''}
          </article>
        `;
      });

      listContainer.innerHTML = html;
      lucide.createIcons();
    }

    // Core Load Function
    function loadData() {
      STATE.loading = true;
      renderList();
      
      // Simulate API Call
      setTimeout(() => {
        STATE.items = mockDb;
        STATE.loading = false;
        updateSummaryData();
        renderList();
      }, 800);
    }

    /* ==========================================
       4. INTERACTIONS
       ========================================== */
    
    // Filter Tabs
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        // Reset styles
        tabs.forEach(t => {
          t.classList.remove('bg-slate-800', 'text-white', 'shadow-md');
          t.classList.add('bg-white', 'text-slate-600', 'shadow-sm');
        });
        
        // Set active style
        const target = e.currentTarget;
        target.classList.remove('bg-white', 'text-slate-600', 'shadow-sm');
        target.classList.add('bg-slate-800', 'text-white', 'shadow-md');
        
        // Update state and re-render
        STATE.filter = target.getAttribute('data-filter');
        renderList();
      });
    });

    // Refresh Button
    const btnRefresh = document.getElementById('btn-refresh');
    const refreshIcon = document.getElementById('refresh-icon');
    btnRefresh.addEventListener('click', () => {
      if(STATE.loading) return;
      refreshIcon.classList.add('animate-spin');
      loadData();
      setTimeout(() => refreshIcon.classList.remove('animate-spin'), 800);
    });

    // Initial Load
    loadData();

  </script>
</body>
</html>
