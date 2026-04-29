<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <!-- Native App Viewport & Safe Area -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no">
  <title>หน้าหลัก - ANT Library</title>
  
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
    
    /* Mobile App Container Constraint */
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
    
    /* Touch Target */
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
    .fade-in { animation: fadeIn 0.4s ease-out forwards; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body class="text-slate-800 antialiased">

  <div class="app-container">
    
    <!-- ==========================================
         1. HEADER (Sticky & Personalized)
         ========================================== -->
    <header class="sticky top-0 z-40 bg-[#F8FAFC]/95 backdrop-blur-xl px-4 pb-2" style="padding-top: max(1rem, var(--safe-top))">
      <div class="flex justify-between items-center pt-2">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-full bg-brand-100 border-2 border-white shadow-sm flex items-center justify-center text-brand-600 font-bold overflow-hidden shrink-0">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=e0f2fe" alt="Profile" class="w-full h-full object-cover">
          </div>
          <div class="flex flex-col justify-center">
            <p class="text-[11px] font-bold text-slate-500 uppercase tracking-wide leading-none mb-1">สวัสดีตอนเช้า ☀️</p>
            <h1 class="text-xl font-black text-slate-800 leading-none tracking-tight">สมชาย ใจดี</h1>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <button class="pressable w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-sm relative">
            <i data-lucide="bell" class="w-5 h-5"></i>
            <span class="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
          </button>
        </div>
      </div>
    </header>

    <!-- ==========================================
         MAIN SCROLLABLE CONTENT
         ========================================== -->
    <main class="flex-1 overflow-y-auto overscroll-contain pb-28 hide-scrollbar" id="main-scroll">
      
      <div class="space-y-6 pt-2 pb-6">
        
        <!-- 2. Business Hours Banner (From Model) -->
        <div class="px-4">
          <article class="rounded-[1.25rem] border border-cyan-100 bg-cyan-50/70 p-4 shadow-sm relative overflow-hidden">
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-white/40 rounded-full blur-xl pointer-events-none"></div>
            <div class="flex items-center justify-between relative z-10">
              <div class="flex items-center gap-3">
                <span class="text-2xl drop-shadow-sm">🏛️</span>
                <div>
                  <p class="text-xs font-black text-cyan-800">เวลาทำการวันนี้</p>
                  <p class="text-[11px] font-bold text-cyan-600/80 mt-0.5">08:30 - 16:30 (เปิดให้บริการ)</p>
                </div>
              </div>
              <a href="#" class="pressable rounded-[0.85rem] bg-cyan-600 px-3.5 py-2 text-[11px] font-black text-white hover:bg-cyan-700 shadow-md shadow-cyan-500/20 transition-all shrink-0">
                เช็คอินเลย
              </a>
            </div>
          </article>
        </div>

        <!-- 3. Quick Stats (2x2 Grid) -->
        <section class="px-4">
          <h2 class="text-sm font-black text-slate-800 mb-3 px-1">ภาพรวมบัญชีของคุณ</h2>
          <div id="stats-container" class="grid grid-cols-2 gap-3">
            <!-- Loading Skeletons -->
            <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-card h-[90px]"><div class="skeleton-box w-1/2 h-4 mb-3"></div><div class="skeleton-box w-1/3 h-6"></div></div>
            <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-card h-[90px]"><div class="skeleton-box w-1/2 h-4 mb-3"></div><div class="skeleton-box w-1/3 h-6"></div></div>
            <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-card h-[90px]"><div class="skeleton-box w-1/2 h-4 mb-3"></div><div class="skeleton-box w-1/3 h-6"></div></div>
            <div class="bg-white rounded-2xl p-4 border border-slate-100 shadow-card h-[90px]"><div class="skeleton-box w-1/2 h-4 mb-3"></div><div class="skeleton-box w-1/3 h-6"></div></div>
          </div>
        </section>

        <!-- 4. Quick Shortcuts -->
        <section class="px-4">
          <div class="bg-white rounded-[1.5rem] border border-slate-100 shadow-card p-4 flex justify-between items-center">
            <button class="pressable flex flex-col items-center gap-2 group w-[22%]">
              <div class="w-12 h-12 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors border border-slate-100">
                <i data-lucide="search" class="w-5 h-5"></i>
              </div>
              <span class="text-[10px] font-bold text-slate-500 text-center leading-tight">ค้นหา<br>หนังสือ</span>
            </button>
            <button class="pressable flex flex-col items-center gap-2 group w-[22%]">
              <div class="w-12 h-12 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors border border-slate-100">
                <i data-lucide="scan-line" class="w-5 h-5"></i>
              </div>
              <span class="text-[10px] font-bold text-slate-500 text-center leading-tight">ยืมด้วย<br>ตนเอง</span>
            </button>
            <button class="pressable flex flex-col items-center gap-2 group w-[22%]">
              <div class="w-12 h-12 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center group-hover:bg-brand-50 group-hover:text-brand-600 transition-colors border border-slate-100">
                <i data-lucide="wallet" class="w-5 h-5"></i>
              </div>
              <span class="text-[10px] font-bold text-slate-500 text-center leading-tight">ชำระ<br>ค่าปรับ</span>
            </button>
            <button class="pressable flex flex-col items-center gap-2 group w-[22%] relative">
              <div class="absolute -top-1 -right-1 w-3 h-3 bg-brand-500 rounded-full border-2 border-white z-10"></div>
              <div class="w-12 h-12 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center shadow-sm border border-brand-100">
                <i data-lucide="id-card" class="w-5 h-5"></i>
              </div>
              <span class="text-[10px] font-bold text-brand-600 text-center leading-tight">บัตร<br>สมาชิก</span>
            </button>
          </div>
        </section>

        <!-- 5. Upcoming Deadlines -->
        <section class="px-4">
          <div class="flex justify-between items-center mb-3 px-1">
            <h2 class="text-sm font-black text-slate-800">กำหนดคืนที่ใกล้มาถึง</h2>
            <a href="#" class="text-[11px] font-bold text-brand-600 pressable">ดูทั้งหมด</a>
          </div>
          
          <div id="upcoming-container" class="space-y-3">
            <!-- Loading Skeletons -->
            <div class="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex gap-3"><div class="skeleton-box w-12 h-16 rounded-lg"></div><div class="flex-1 py-1"><div class="skeleton-box w-3/4 h-3 mb-2"></div><div class="skeleton-box w-1/2 h-2 mb-3"></div><div class="skeleton-box w-full h-6 rounded"></div></div></div>
            <div class="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex gap-3"><div class="skeleton-box w-12 h-16 rounded-lg"></div><div class="flex-1 py-1"><div class="skeleton-box w-3/4 h-3 mb-2"></div><div class="skeleton-box w-1/2 h-2 mb-3"></div><div class="skeleton-box w-full h-6 rounded"></div></div></div>
          </div>
        </section>

        <!-- 6. Announcements (Horizontal Scroll) -->
        <section class="pb-4">
          <div class="flex justify-between items-center mb-3 px-5">
            <h2 class="text-sm font-black text-slate-800">ประกาศล่าสุด</h2>
          </div>
          
          <div id="announcements-container" class="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory px-4 gap-3 pb-2">
            <!-- Loading Skeletons -->
            <div class="shrink-0 w-[280px] snap-center bg-white rounded-2xl border border-slate-100 shadow-sm p-4 h-[120px]"><div class="skeleton-box w-1/3 h-3 mb-3"></div><div class="skeleton-box w-full h-4 mb-2"></div><div class="skeleton-box w-2/3 h-4"></div></div>
            <div class="shrink-0 w-[280px] snap-center bg-white rounded-2xl border border-slate-100 shadow-sm p-4 h-[120px]"><div class="skeleton-box w-1/3 h-3 mb-3"></div><div class="skeleton-box w-full h-4 mb-2"></div><div class="skeleton-box w-2/3 h-4"></div></div>
          </div>
        </section>

      </div>
    </main>

    <!-- ==========================================
         BOTTOM NAVIGATION (Fixed)
         ========================================== -->
    <nav class="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] max-w-[480px] mx-auto" style="padding-bottom: var(--safe-bottom)">
      <div class="flex justify-around items-center h-[68px] px-1">
        <!-- Active Tab in Bottom Nav -->
        <a href="#" class="pressable touch-target flex flex-col items-center justify-center w-full h-full text-brand-600">
          <i data-lucide="layout-dashboard" class="w-[22px] h-[22px] mb-1 fill-brand-100/50"></i>
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

        <a href="#" class="pressable touch-target flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-brand-600">
          <i data-lucide="bookmark" class="w-[22px] h-[22px] mb-1"></i>
          <span class="text-[10px] font-bold">ยืมแล้ว</span>
        </a>
        <a href="#" class="pressable touch-target flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-brand-600">
          <i data-lucide="user" class="w-[22px] h-[22px] mb-1"></i>
          <span class="text-[10px] font-bold">ฉัน</span>
        </a>
      </div>
    </nav>

  </div> <!-- End App Container -->

  <!-- Application Logic -->
  <script>
    lucide.createIcons();

    /* ==========================================
       1. STATE & MOCK DATA (Model 2 & 3)
       ========================================== */
    const STATE = {
      loading: true,
      stats: {
        activeLoans: 3,
        overdueCount: 0,
        unpaidFineTotal: 60,
        nextDueDate: "2026-05-02T23:59:59Z"
      },
      upcoming: [
        { id: "L1", title: "Atomic Habits", barcode: "88500214", dueDate: "2026-04-30T23:59:59Z", cover: "https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=150&q=80" },
        { id: "L2", title: "Sapiens: A Brief History", barcode: "88500213", dueDate: "2026-05-02T23:59:59Z", cover: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=150&q=80" }
      ],
      announcements: [
        { id: "A1", title: "ปิดปรับปรุงระบบห้องสมุดประจำเดือน พฤษภาคม", date: "2026-04-28", type: "system", isNew: true },
        { id: "A2", title: "งานสัปดาห์หนังสือแห่งชาติ พบกับโปรโมชั่นพิเศษจากสำนักพิมพ์ชั้นนำ", date: "2026-04-20", type: "event", isNew: false },
        { id: "A3", title: "เพิ่มโควตาการยืมสำหรับนักศึกษาปริญญาโท", date: "2026-04-15", type: "info", isNew: false }
      ]
    };

    /* ==========================================
       2. HELPER FUNCTIONS
       ========================================== */
    function fmtDate(isoString, short = false) {
      if(!isoString) return "-";
      const d = new Date(isoString);
      return d.toLocaleDateString('th-TH', { 
        year: '2-digit', 
        month: short ? 'short' : 'long', 
        day: 'numeric' 
      });
    }

    /* ==========================================
       3. RENDER LOGIC
       ========================================== */
    
    function renderStats() {
      const container = document.getElementById('stats-container');
      const s = STATE.stats;
      
      // Dynamic styling based on status
      const finesColor = s.unpaidFineTotal > 0 ? 'text-rose-600' : 'text-slate-700';
      const finesBg = s.unpaidFineTotal > 0 ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100';
      const overdueColor = s.overdueCount > 0 ? 'text-rose-600' : 'text-slate-400';
      const overdueBg = s.overdueCount > 0 ? 'bg-rose-50 border-rose-100' : 'bg-white border-slate-100';

      container.innerHTML = `
        <div class="bg-brand-50 rounded-2xl p-3 border border-brand-100 shadow-sm flex flex-col justify-between h-[90px] fade-in">
          <div class="flex items-center gap-1.5 text-brand-600">
            <i data-lucide="book-up" class="w-4 h-4"></i>
            <span class="text-xs font-bold">กำลังยืมอยู่</span>
          </div>
          <div class="flex items-baseline gap-1 mt-auto">
            <h3 class="text-2xl font-black text-brand-700 leading-none">${s.activeLoans}</h3>
            <span class="text-[10px] font-bold text-brand-600/70">เล่ม</span>
          </div>
        </div>

        <div class="bg-emerald-50 rounded-2xl p-3 border border-emerald-100 shadow-sm flex flex-col justify-between h-[90px] fade-in" style="animation-delay: 50ms;">
          <div class="flex items-center gap-1.5 text-emerald-600">
            <i data-lucide="calendar-check" class="w-4 h-4"></i>
            <span class="text-xs font-bold">กำหนดคืนถัดไป</span>
          </div>
          <div class="flex items-baseline gap-1 mt-auto">
            <h3 class="text-sm font-black text-emerald-700 leading-none pb-0.5">${s.nextDueDate ? fmtDate(s.nextDueDate, true) : '-'}</h3>
          </div>
        </div>

        <div class="${finesBg} rounded-2xl p-3 border shadow-sm flex flex-col justify-between h-[90px] fade-in" style="animation-delay: 100ms;">
          <div class="flex items-center gap-1.5 ${s.unpaidFineTotal > 0 ? 'text-rose-600' : 'text-slate-500'}">
            <i data-lucide="wallet" class="w-4 h-4"></i>
            <span class="text-xs font-bold">ค่าปรับค้าง</span>
          </div>
          <div class="flex items-baseline gap-1 mt-auto">
            <h3 class="text-xl font-black ${finesColor} leading-none">฿${s.unpaidFineTotal}</h3>
          </div>
        </div>

        <div class="${overdueBg} rounded-2xl p-3 border shadow-sm flex flex-col justify-between h-[90px] fade-in" style="animation-delay: 150ms;">
          <div class="flex items-center gap-1.5 ${s.overdueCount > 0 ? 'text-rose-600' : 'text-slate-500'}">
            <i data-lucide="alert-triangle" class="w-4 h-4"></i>
            <span class="text-xs font-bold">เกินกำหนด</span>
          </div>
          <div class="flex items-baseline gap-1 mt-auto">
            <h3 class="text-xl font-black ${overdueColor} leading-none">${s.overdueCount}</h3>
            <span class="text-[10px] font-bold ${s.overdueCount > 0 ? 'text-rose-500/70' : 'text-slate-400'}">เล่ม</span>
          </div>
        </div>
      `;
    }

    function renderUpcoming() {
      const container = document.getElementById('upcoming-container');
      
      if(STATE.upcoming.length === 0) {
        container.innerHTML = `
          <div class="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm text-center fade-in">
            <i data-lucide="check-circle" class="w-8 h-8 text-slate-300 mx-auto mb-2"></i>
            <p class="text-sm font-bold text-slate-500">ไม่มีหนังสือที่ใกล้ถึงกำหนดคืน</p>
          </div>
        `;
        return;
      }

      container.innerHTML = STATE.upcoming.map((item, idx) => `
        <article class="pressable bg-white rounded-2xl p-3 border border-slate-100 shadow-card flex gap-3 fade-in" style="animation-delay: ${idx * 50}ms;">
          <div class="w-12 h-16 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 shrink-0">
            <img src="${item.cover}" class="w-full h-full object-cover mix-blend-multiply" alt="cover">
          </div>
          <div class="flex-1 flex flex-col min-w-0 py-0.5">
            <h3 class="font-bold text-slate-800 text-xs line-clamp-1 mb-0.5">${item.title}</h3>
            <p class="text-[10px] font-mono font-semibold text-slate-400 mb-auto">${item.barcode}</p>
            
            <div class="flex items-center justify-between mt-2">
              <span class="text-[10px] font-bold text-slate-500">คืน ${fmtDate(item.dueDate, true)}</span>
              <span class="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[9px] font-black tracking-wide">ใกล้ถึงกำหนด</span>
            </div>
          </div>
        </article>
      `).join('');
    }

    function renderAnnouncements() {
      const container = document.getElementById('announcements-container');
      
      const iconMap = {
        'system': '<div class="p-2 bg-slate-100 text-slate-600 rounded-xl shrink-0"><i data-lucide="settings" class="w-5 h-5"></i></div>',
        'event': '<div class="p-2 bg-brand-100 text-brand-600 rounded-xl shrink-0"><i data-lucide="calendar-star" class="w-5 h-5"></i></div>',
        'info': '<div class="p-2 bg-sky-100 text-sky-600 rounded-xl shrink-0"><i data-lucide="info" class="w-5 h-5"></i></div>'
      };

      container.innerHTML = STATE.announcements.map((ann, idx) => `
        <article class="pressable shrink-0 w-[280px] snap-center bg-white rounded-2xl border border-slate-100 shadow-card p-4 flex flex-col h-[130px] fade-in" style="animation-delay: ${idx * 50}ms;">
          <div class="flex gap-3 mb-2">
            ${iconMap[ann.type] || iconMap['info']}
            <div class="flex flex-col pt-0.5">
              <span class="text-[9px] font-black text-slate-400 tracking-wide uppercase">${fmtDate(ann.date, true)}</span>
              ${ann.isNew ? '<span class="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded uppercase w-max mt-0.5">New</span>' : ''}
            </div>
          </div>
          <h3 class="font-bold text-slate-800 text-sm leading-snug line-clamp-2 mt-auto">${ann.title}</h3>
        </article>
      `).join('');
    }

    // Core Load Function (Simulating Promise.all Bootstrap)
    function loadDashboardData() {
      // Simulate API Delay
      setTimeout(() => {
        STATE.loading = false;
        renderStats();
        renderUpcoming();
        renderAnnouncements();
        lucide.createIcons();
      }, 1200);
    }

    // Initialize
    loadDashboardData();

  </script>
</body>
</html>
