<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no">
  <title>Library Reports - Native App</title>
  
  <!-- Fonts: Bai Jamjuree -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>

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
            'native': '0 8px 30px rgba(0, 0, 0, 0.08)',
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
      --app-bg: #F1F5F9;
    }
    body { background-color: var(--app-bg); -webkit-tap-highlight-color: transparent; overscroll-behavior-y: none; }
    
    .app-container {
      max-width: 480px; margin: 0 auto; background-color: #000;
      height: 100dvh; position: relative; overflow: hidden;
      box-shadow: 0 0 40px rgba(0,0,0,0.05);
    }

    .view-pane {
      position: absolute; top: 0; left: 0; right: 0; bottom: 0;
      background-color: #F8FAFC; display: flex; flex-direction: column;
      transition: transform 0.4s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.4s ease;
      will-change: transform;
    }
    
    .view-main { z-index: 10; }
    .view-sub { z-index: 20; transform: translateX(100%); box-shadow: -10px 0 30px rgba(0,0,0,0.05); }
    .view-main.push-out { transform: translateX(-30%); opacity: 0.8; pointer-events: none; }
    .view-sub.active { transform: translateX(0); }

    .pressable { transition: transform 0.15s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.15s ease, background-color 0.15s ease; cursor: pointer; user-select: none; }
    .pressable:active:not(:disabled) { transform: scale(0.96); opacity: 0.8; }
    .pressable:disabled { opacity: 0.4; cursor: not-allowed; }
    
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    /* Animations */
    .fade-in { animation: fadeIn 0.4s ease-out forwards; opacity: 0; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

    @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
    .skeleton-box {
      background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
      background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 8px;
    }

    /* CSS Native Charts */
    .bar-grow { animation: barGrow 1s cubic-bezier(0.32, 0.72, 0, 1) forwards; transform-origin: left; }
    .bar-grow-up { animation: barGrowUp 1s cubic-bezier(0.32, 0.72, 0, 1) forwards; transform-origin: bottom; }
    @keyframes barGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
    @keyframes barGrowUp { from { transform: scaleY(0); } to { transform: scaleY(1); } }

    /* Circular Progress */
    .donut-chart {
      width: 100px; height: 100px; border-radius: 50%;
      background: conic-gradient(#0EA5E9 0% 75%, #e2e8f0 75% 100%);
      display: flex; align-items: center; justify-content: center;
      animation: fadeIn 1s ease-out;
    }
    .donut-inner { width: 70px; height: 70px; background: white; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; }

  </style>
</head>
<body class="text-slate-800 antialiased">

  <div class="app-container">
    
    <!-- =========================================================================
         [VIEW 1] REPORTS HUB (Main Menu)
         ========================================================================= -->
    <div id="view-hub" class="view-pane view-main active">
      
      <header class="bg-white/90 backdrop-blur-xl border-b border-slate-200 z-10 shrink-0" style="padding-top: max(1rem, var(--safe-top))">
        <div class="flex justify-between items-center px-4 pb-2 pt-2">
          <button class="pressable w-10 h-10 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center">
            <i data-lucide="layout-dashboard" class="w-5 h-5"></i>
          </button>
          <h1 class="text-lg font-black text-slate-800 tracking-tight">รายงานและสถิติ</h1>
          <button class="pressable w-10 h-10 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center">
            <i data-lucide="download" class="w-5 h-5"></i>
          </button>
        </div>
        
        <div class="px-4 pb-3 pt-1">
          <div class="flex gap-2 overflow-x-auto hide-scrollbar snap-x" id="global-filters">
            <button class="filter-chip active pressable shrink-0 px-4 py-2 bg-slate-800 text-white rounded-full font-bold text-xs shadow-md">สัปดาห์นี้</button>
            <button class="filter-chip pressable shrink-0 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-full font-bold text-xs shadow-sm">เดือนนี้</button>
            <button class="filter-chip pressable shrink-0 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-full font-bold text-xs shadow-sm">ไตรมาสนี้</button>
            <button class="filter-chip pressable shrink-0 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-full font-bold text-xs shadow-sm flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i> กำหนดเอง</button>
          </div>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto hide-scrollbar px-4 pt-4 pb-12">
        
        <div class="bg-gradient-to-br from-brand-600 to-indigo-700 rounded-3xl p-5 mb-6 text-white shadow-native relative overflow-hidden fade-in">
          <div class="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div class="relative z-10">
            <p class="text-[11px] font-bold text-brand-100 uppercase tracking-widest mb-1 flex items-center gap-1.5"><i data-lucide="activity" class="w-3.5 h-3.5"></i> ภาพรวมสัปดาห์นี้</p>
            <div class="flex items-end gap-2 mb-4">
              <h2 class="text-4xl font-black tracking-tight">1,248</h2>
              <span class="text-sm font-semibold text-brand-100 pb-1">รายการความเคลื่อนไหว</span>
            </div>
            <div class="flex gap-4">
              <div class="flex-1 bg-black/20 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                <p class="text-[10px] text-brand-100 font-medium">ยืมสำเร็จ</p>
                <p class="text-lg font-bold">450</p>
              </div>
              <div class="flex-1 bg-black/20 backdrop-blur-md rounded-2xl p-3 border border-white/10">
                <p class="text-[10px] text-brand-100 font-medium">สมาชิกใหม่</p>
                <p class="text-lg font-bold">+24</p>
              </div>
            </div>
          </div>
        </div>

        <h3 class="text-sm font-black text-slate-800 mb-3 px-1">หมวดหมู่รายงาน (R1 - R8)</h3>
        
        <div class="grid grid-cols-2 gap-3 pb-8">
          <button class="pressable bg-white rounded-[1.5rem] p-4 border border-slate-100 shadow-card flex flex-col items-start gap-3 fade-in group text-left" onclick="openReport('R1', 'สมาชิกเข้าใช้บริการ', 'text-cyan-600', 'bg-cyan-50')" style="animation-delay: 50ms;">
            <div class="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform"><i data-lucide="users" class="w-5 h-5"></i></div>
            <div><h4 class="font-black text-slate-800 text-sm">R1 เข้าใช้บริการ</h4><p class="text-[10px] font-bold text-slate-400 mt-0.5">สถิติและรายการเช็คอิน</p></div>
          </button>
          <button class="pressable bg-white rounded-[1.5rem] p-4 border border-slate-100 shadow-card flex flex-col items-start gap-3 fade-in group text-left" onclick="openReport('R2', 'ธุรกรรมการยืม', 'text-blue-600', 'bg-blue-50')" style="animation-delay: 100ms;">
            <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform"><i data-lucide="book-up-2" class="w-5 h-5"></i></div>
            <div><h4 class="font-black text-slate-800 text-sm">R2 ธุรกรรมการยืม</h4><p class="text-[10px] font-bold text-slate-400 mt-0.5">รายการยืมตามช่วงเวลา</p></div>
          </button>
          <button class="pressable bg-white rounded-[1.5rem] p-4 border border-slate-100 shadow-card flex flex-col items-start gap-3 fade-in group text-left" onclick="openReport('R3', 'รายการเกินกำหนด', 'text-rose-600', 'bg-rose-50')" style="animation-delay: 150ms;">
            <div class="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform"><i data-lucide="alert-triangle" class="w-5 h-5"></i></div>
            <div><h4 class="font-black text-slate-800 text-sm">R3 เกินกำหนด</h4><p class="text-[10px] font-bold text-slate-400 mt-0.5">ติดตามการคืนล่าช้า</p></div>
          </button>
          <button class="pressable bg-white rounded-[1.5rem] p-4 border border-slate-100 shadow-card flex flex-col items-start gap-3 fade-in group text-left" onclick="openReport('R4', 'ค่าปรับค้างชำระ', 'text-amber-600', 'bg-amber-50')" style="animation-delay: 200ms;">
            <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform"><i data-lucide="wallet" class="w-5 h-5"></i></div>
            <div><h4 class="font-black text-slate-800 text-sm">R4 ค่าปรับค้าง</h4><p class="text-[10px] font-bold text-slate-400 mt-0.5">ยอดค้างและรายละเอียด</p></div>
          </button>
          <button class="pressable bg-white rounded-[1.5rem] p-4 border border-slate-100 shadow-card flex flex-col items-start gap-3 fade-in group text-left" onclick="openReport('R5', 'ภาพรวมการจอง', 'text-purple-600', 'bg-purple-50')" style="animation-delay: 250ms;">
            <div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform"><i data-lucide="bookmark-check" class="w-5 h-5"></i></div>
            <div><h4 class="font-black text-slate-800 text-sm">R5 ภาพรวมจอง</h4><p class="text-[10px] font-bold text-slate-400 mt-0.5">สถานะ Waiting/Ready</p></div>
          </button>
          <button class="pressable bg-white rounded-[1.5rem] p-4 border border-slate-100 shadow-card flex flex-col items-start gap-3 fade-in group text-left" onclick="openReport('R6', 'สมาชิกใหม่', 'text-emerald-600', 'bg-emerald-50')" style="animation-delay: 300ms;">
            <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform"><i data-lucide="user-plus" class="w-5 h-5"></i></div>
            <div><h4 class="font-black text-slate-800 text-sm">R6 สมาชิกใหม่</h4><p class="text-[10px] font-bold text-slate-400 mt-0.5">ผู้สมัครใหม่ในระบบ</p></div>
          </button>
          <button class="pressable bg-white rounded-[1.5rem] p-4 border border-slate-100 shadow-card flex flex-col items-start gap-3 fade-in group text-left" onclick="openReport('R7', 'คลังหนังสือตามหมวด', 'text-teal-600', 'bg-teal-50')" style="animation-delay: 350ms;">
            <div class="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center group-hover:scale-110 transition-transform"><i data-lucide="library" class="w-5 h-5"></i></div>
            <div><h4 class="font-black text-slate-800 text-sm">R7 คลังหนังสือ</h4><p class="text-[10px] font-bold text-slate-400 mt-0.5">สถานะ Available/Borrowed</p></div>
          </button>
          <button class="pressable bg-white rounded-[1.5rem] p-4 border border-slate-100 shadow-card flex flex-col items-start gap-3 fade-in group text-left" onclick="openReport('R8', 'หนังสือยอดนิยม', 'text-yellow-500', 'bg-yellow-50')" style="animation-delay: 400ms;">
            <div class="w-10 h-10 rounded-xl bg-yellow-50 text-yellow-500 flex items-center justify-center group-hover:scale-110 transition-transform"><i data-lucide="trophy" class="w-5 h-5"></i></div>
            <div><h4 class="font-black text-slate-800 text-sm">R8 ยอดนิยม</h4><p class="text-[10px] font-bold text-slate-400 mt-0.5">อันดับหนังสือยืมสูงสุด</p></div>
          </button>
        </div>
      </div>
    </div>


    <!-- =========================================================================
         [VIEW 2] REPORT DETAIL VIEW (Dynamic Content)
         ========================================================================= -->
    <div id="view-detail" class="view-pane view-sub">
      
      <header class="bg-white/90 backdrop-blur-xl border-b border-slate-200 z-10 shrink-0" style="padding-top: max(1rem, var(--safe-top))">
        <div class="flex justify-between items-center px-4 pb-2 pt-2">
          <button class="pressable flex items-center w-12 h-10 -ml-2 text-slate-600 font-bold" onclick="closeReport()">
            <i data-lucide="arrow-left" class="w-6 h-6"></i>
          </button>
          
          <div class="flex flex-col items-center">
             <h1 class="text-lg font-black text-slate-800 tracking-tight" id="detail-title">R1 รายงาน</h1>
             <p class="text-[10px] font-bold text-slate-400 uppercase">ข้อมูลประจำสัปดาห์นี้</p>
          </div>
          
          <button class="pressable flex items-center justify-end w-12 h-10 text-brand-600 font-bold" onclick="showToast('กำลังสร้าง PDF...')">
            <i data-lucide="file-down" class="w-5 h-5"></i>
          </button>
        </div>
      </header>

      <div class="flex-1 overflow-y-auto hide-scrollbar px-4 pt-5 pb-24 space-y-5" id="report-content">
        <!-- Content injected by JS -->
      </div>
      
    </div>

  </div> <!-- End App Container -->

  <!-- TOAST NOTIFICATION -->
  <div id="toast-container" class="fixed top-[max(1.5rem,var(--safe-top))] left-1/2 -translate-x-1/2 z-50 pointer-events-none w-[90%] max-w-[400px] hidden transition-all duration-300 transform -translate-y-4 opacity-0">
    <div class="bg-slate-800 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 w-full backdrop-blur-md bg-opacity-95">
      <div id="toast-icon-wrap" class="bg-brand-500/20 text-brand-400 p-1.5 rounded-full shrink-0">
        <i data-lucide="info" id="toast-icon" class="w-4 h-4"></i>
      </div>
      <p id="toast-message" class="text-sm font-bold flex-1">แจ้งเตือน</p>
    </div>
  </div>

  <script>
    lucide.createIcons();

    /* --- Navigation Stack --- */
    const viewMain = document.getElementById('view-hub');
    const viewDetail = document.getElementById('view-detail');
    const contentArea = document.getElementById('report-content');

    function openReport(reportId, title, textColor, bgColor) {
      if(navigator.vibrate) navigator.vibrate(20);
      document.getElementById('detail-title').innerText = reportId + ' ' + title.split(' ')[0];
      
      renderSkeleton();
      viewDetail.classList.add('active');
      viewMain.classList.add('push-out');
      
      setTimeout(() => { renderReportData(reportId, textColor, bgColor); }, 800); // Simulate API Delay
    }

    function closeReport() {
      viewDetail.classList.remove('active');
      viewMain.classList.remove('push-out');
      setTimeout(() => { contentArea.innerHTML = ''; }, 400); 
    }

    /* --- Filter Chips --- */
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-chip').forEach(c => {
          c.classList.remove('bg-slate-800', 'text-white', 'shadow-md', 'active');
          c.classList.add('bg-white', 'text-slate-600', 'shadow-sm');
        });
        e.currentTarget.classList.add('bg-slate-800', 'text-white', 'shadow-md', 'active');
        e.currentTarget.classList.remove('bg-white', 'text-slate-600', 'shadow-sm');
        e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      });
    });

    /* --- Report Renderers --- */
    function renderSkeleton() {
      contentArea.innerHTML = `
        <div class="bg-white rounded-[1.5rem] p-5 shadow-sm fade-in flex justify-between border border-slate-100"><div class="space-y-2"><div class="skeleton-box w-20 h-3"></div><div class="skeleton-box w-32 h-8"></div></div><div class="skeleton-box w-12 h-12 rounded-xl"></div></div>
        <div class="bg-white rounded-[1.5rem] p-5 shadow-sm h-48 fade-in border border-slate-100" style="animation-delay: 100ms;"><div class="skeleton-box w-1/3 h-4 mb-6"></div><div class="skeleton-box w-full h-24 rounded-lg"></div></div>
        <div class="space-y-3 fade-in" style="animation-delay: 200ms;"><div class="skeleton-box w-full h-16 rounded-2xl"></div><div class="skeleton-box w-full h-16 rounded-2xl"></div></div>
      `;
    }

    function renderReportData(id, color, bg) {
      let html = '';

      switch(id) {
        case 'R1': // สมาชิกเข้าใช้บริการ (Visits) - Vertical Bar Chart
          html = `
            <div class="bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-sm flex items-center justify-between fade-in">
              <div><p class="text-[11px] font-bold text-slate-500 uppercase">ยอดเข้าใช้บริการทั้งหมด</p><div class="flex items-baseline gap-2 mt-1"><h3 class="text-3xl font-black text-slate-800">4,205</h3><span class="text-sm font-bold text-emerald-500 flex items-center"><i data-lucide="trending-up" class="w-4 h-4 mr-1"></i> 12%</span></div></div>
              <div class="w-12 h-12 rounded-2xl ${bg} ${color} flex items-center justify-center"><i data-lucide="users" class="w-6 h-6"></i></div>
            </div>
            <div class="bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-sm fade-in" style="animation-delay: 50ms;">
              <h3 class="font-black text-sm text-slate-800 mb-6">ผู้ใช้งานแยกตามวัน</h3>
              <div class="flex items-end justify-between h-40 gap-2 pb-2 border-b border-slate-100 relative">
                <div class="absolute inset-x-0 bottom-10 border-t border-dashed border-slate-200"></div><div class="absolute inset-x-0 bottom-20 border-t border-dashed border-slate-200"></div><div class="absolute inset-x-0 bottom-30 border-t border-dashed border-slate-200"></div>
                <div class="w-full flex flex-col items-center gap-2 z-10"><div class="w-full bg-cyan-50 rounded-t-lg h-[40%] relative overflow-hidden"><div class="absolute bottom-0 w-full bg-cyan-400 h-full bar-grow-up"></div></div><span class="text-[10px] font-bold text-slate-400">จ.</span></div>
                <div class="w-full flex flex-col items-center gap-2 z-10"><div class="w-full bg-cyan-50 rounded-t-lg h-[60%] relative overflow-hidden"><div class="absolute bottom-0 w-full bg-cyan-400 h-full bar-grow-up" style="animation-delay:50ms;"></div></div><span class="text-[10px] font-bold text-slate-400">อ.</span></div>
                <div class="w-full flex flex-col items-center gap-2 z-10"><div class="w-full bg-cyan-50 rounded-t-lg h-[80%] relative overflow-hidden"><div class="absolute bottom-0 w-full bg-cyan-500 h-full bar-grow-up" style="animation-delay:100ms;"></div></div><span class="text-[10px] font-bold text-slate-800">พ.</span></div>
                <div class="w-full flex flex-col items-center gap-2 z-10"><div class="w-full bg-cyan-50 rounded-t-lg h-[50%] relative overflow-hidden"><div class="absolute bottom-0 w-full bg-cyan-400 h-full bar-grow-up" style="animation-delay:150ms;"></div></div><span class="text-[10px] font-bold text-slate-400">พฤ.</span></div>
                <div class="w-full flex flex-col items-center gap-2 z-10"><div class="w-full bg-cyan-50 rounded-t-lg h-[90%] relative overflow-hidden"><div class="absolute bottom-0 w-full bg-cyan-400 h-full bar-grow-up" style="animation-delay:200ms;"></div></div><span class="text-[10px] font-bold text-slate-400">ศ.</span></div>
              </div>
            </div>
            <h3 class="font-black text-sm text-slate-800 px-1 fade-in" style="animation-delay: 100ms;">สัดส่วนกิจกรรม</h3>
            <div class="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden fade-in" style="animation-delay: 150ms;">
              <div class="p-4 border-b border-slate-50 flex justify-between"><div class="flex items-center gap-3"><div class="w-3 h-3 rounded-full bg-brand-500"></div><span class="text-sm font-bold text-slate-700">ยืม-คืน</span></div><span class="text-sm font-black">45%</span></div>
              <div class="p-4 border-b border-slate-50 flex justify-between"><div class="flex items-center gap-3"><div class="w-3 h-3 rounded-full bg-amber-500"></div><span class="text-sm font-bold text-slate-700">นั่งอ่าน/พักผ่อน</span></div><span class="text-sm font-black">30%</span></div>
              <div class="p-4 flex justify-between"><div class="flex items-center gap-3"><div class="w-3 h-3 rounded-full bg-emerald-500"></div><span class="text-sm font-bold text-slate-700">คอมพิวเตอร์</span></div><span class="text-sm font-black">25%</span></div>
            </div>
          `;
          break;

        case 'R2': // ธุรกรรมการยืม (Loans) - Area/Line concept + Top Borrowers
          html = `
            <div class="grid grid-cols-2 gap-3 fade-in">
              <div class="bg-blue-500 text-white rounded-[1.5rem] p-5 shadow-md shadow-blue-500/20"><p class="text-[10px] font-bold text-blue-100 uppercase">ยืมออก (Borrow)</p><h3 class="text-3xl font-black mt-1">842</h3></div>
              <div class="bg-white text-slate-800 border border-slate-100 rounded-[1.5rem] p-5 shadow-sm"><p class="text-[10px] font-bold text-slate-400 uppercase">รับคืน (Return)</p><h3 class="text-3xl font-black mt-1">790</h3></div>
            </div>
            <div class="bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-sm fade-in mt-2" style="animation-delay: 50ms;">
              <h3 class="font-black text-sm text-slate-800 mb-2">แนวโน้มการยืม-คืน</h3>
              <p class="text-xs text-slate-500 mb-4">ช่วงเวลาเร่งด่วนที่สุดคือ 12:00 - 14:00 น.</p>
              <div class="h-32 bg-slate-50 rounded-xl border border-slate-100 flex items-end justify-between px-2 pb-2">
                 <div class="w-1/6 h-[30%] bg-blue-200 rounded-t-sm bar-grow-up"></div>
                 <div class="w-1/6 h-[60%] bg-blue-300 rounded-t-sm bar-grow-up" style="animation-delay:100ms;"></div>
                 <div class="w-1/6 h-[100%] bg-blue-500 rounded-t-sm bar-grow-up" style="animation-delay:200ms;"></div>
                 <div class="w-1/6 h-[80%] bg-blue-400 rounded-t-sm bar-grow-up" style="animation-delay:300ms;"></div>
                 <div class="w-1/6 h-[40%] bg-blue-200 rounded-t-sm bar-grow-up" style="animation-delay:400ms;"></div>
              </div>
            </div>
            <h3 class="font-black text-sm text-slate-800 px-1 mt-2 fade-in" style="animation-delay: 100ms;">สมาชิกที่ยืมสูงสุด</h3>
            <div class="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden fade-in" style="animation-delay: 150ms;">
              <div class="p-3 border-b border-slate-50 flex items-center justify-between"><div class="flex items-center gap-3"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=A" class="w-8 h-8 rounded-full bg-slate-100"><span class="text-sm font-bold text-slate-700">อารยา ส.</span></div><span class="text-sm font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">12 เล่ม</span></div>
              <div class="p-3 border-b border-slate-50 flex items-center justify-between"><div class="flex items-center gap-3"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=B" class="w-8 h-8 rounded-full bg-slate-100"><span class="text-sm font-bold text-slate-700">วิทวัส จ.</span></div><span class="text-sm font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">9 เล่ม</span></div>
            </div>
          `;
          break;

        case 'R3': // รายการเกินกำหนด (Overdue) - Alert List
          html = `
            <div class="bg-rose-50 rounded-[1.5rem] p-5 border border-rose-100 flex items-center justify-between fade-in">
              <div><p class="text-[11px] font-bold text-rose-500 uppercase">หนังสือเกินกำหนดทั้งหมด</p><h3 class="text-4xl font-black text-rose-600 mt-1">32 <span class="text-sm font-bold">รายการ</span></h3></div>
              <div class="w-14 h-14 rounded-full bg-rose-200 flex items-center justify-center animate-pulse"><i data-lucide="alert-triangle" class="w-7 h-7 text-rose-600"></i></div>
            </div>
            <h3 class="font-black text-sm text-slate-800 px-1 mt-2 fade-in" style="animation-delay: 50ms;">รายการค้างนานสุด (Critical)</h3>
            <div class="space-y-3 fade-in" style="animation-delay: 100ms;">
              <div class="bg-white rounded-[1.25rem] p-4 border-l-4 border-l-rose-500 border-y border-r border-slate-100 shadow-sm flex justify-between items-center">
                <div><h4 class="font-bold text-sm text-slate-800">Clean Code</h4><p class="text-xs text-slate-500 font-medium">ยืมโดย: สมชาย ใจดี</p></div>
                <div class="text-right"><span class="text-rose-600 font-black text-lg">14 วัน</span><p class="text-[9px] text-slate-400 font-bold uppercase">เกินกำหนด</p></div>
              </div>
              <div class="bg-white rounded-[1.25rem] p-4 border-l-4 border-l-rose-500 border-y border-r border-slate-100 shadow-sm flex justify-between items-center">
                <div><h4 class="font-bold text-sm text-slate-800">Sapiens</h4><p class="text-xs text-slate-500 font-medium">ยืมโดย: วนิดา ร.</p></div>
                <div class="text-right"><span class="text-rose-600 font-black text-lg">10 วัน</span><p class="text-[9px] text-slate-400 font-bold uppercase">เกินกำหนด</p></div>
              </div>
              <div class="bg-white rounded-[1.25rem] p-4 border-l-4 border-l-amber-400 border-y border-r border-slate-100 shadow-sm flex justify-between items-center">
                <div><h4 class="font-bold text-sm text-slate-800">Atomic Habits</h4><p class="text-xs text-slate-500 font-medium">ยืมโดย: นภัสกร อ.</p></div>
                <div class="text-right"><span class="text-amber-500 font-black text-lg">2 วัน</span><p class="text-[9px] text-slate-400 font-bold uppercase">เกินกำหนด</p></div>
              </div>
            </div>
          `;
          break;

        case 'R4': // ค่าปรับค้างชำระ (Fines) - Financial Dashboard
          html = `
            <div class="bg-slate-800 text-white rounded-[1.5rem] p-6 shadow-xl fade-in relative overflow-hidden">
              <div class="absolute -right-4 -bottom-4 w-32 h-32 bg-amber-500 rounded-full blur-3xl opacity-20"></div>
              <p class="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">ยอดค่าปรับค้างชำระรวม</p>
              <h2 class="text-4xl font-black tracking-tight relative z-10">฿ 1,250.00</h2>
              <div class="mt-5 bg-slate-700/50 rounded-xl p-3 border border-slate-600 flex justify-between text-xs font-bold relative z-10">
                <span class="text-emerald-400">ชำระแล้ว: ฿ 450</span><span class="text-slate-400">ยกเว้น: ฿ 100</span>
              </div>
            </div>
            <h3 class="font-black text-sm text-slate-800 px-1 mt-4 fade-in" style="animation-delay: 50ms;">รายการล่าสุด</h3>
            <div class="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden fade-in" style="animation-delay: 100ms;">
              <div class="p-4 border-b border-slate-50 flex items-center justify-between"><div class="flex items-center gap-3"><div class="bg-rose-50 text-rose-600 p-2 rounded-lg"><i data-lucide="clock" class="w-4 h-4"></i></div><div><p class="text-sm font-bold text-slate-700">ส่งคืนล่าช้า</p><p class="text-[10px] text-slate-400">นายสมหมาย</p></div></div><span class="text-sm font-black text-rose-600">฿ 50</span></div>
              <div class="p-4 border-b border-slate-50 flex items-center justify-between"><div class="flex items-center gap-3"><div class="bg-amber-50 text-amber-600 p-2 rounded-lg"><i data-lucide="book-x" class="w-4 h-4"></i></div><div><p class="text-sm font-bold text-slate-700">หนังสือชำรุด</p><p class="text-[10px] text-slate-400">น.ส.วิภา</p></div></div><span class="text-sm font-black text-amber-600">฿ 120</span></div>
              <div class="p-4 flex items-center justify-between"><div class="flex items-center gap-3"><div class="bg-emerald-50 text-emerald-600 p-2 rounded-lg"><i data-lucide="check" class="w-4 h-4"></i></div><div><p class="text-sm font-bold text-slate-700">ชำระเงินแล้ว</p><p class="text-[10px] text-slate-400">นายเอก</p></div></div><span class="text-sm font-black text-emerald-600">฿ 30</span></div>
            </div>
          `;
          break;

        case 'R5': // ภาพรวมการจอง (Reservations) - Funnel/Status Cards
          html = `
            <div class="grid grid-cols-3 gap-2 fade-in text-center">
              <div class="bg-amber-50 rounded-[1.25rem] p-4 border border-amber-100"><p class="text-[10px] font-bold text-amber-600 uppercase mb-1">รอคิว</p><h3 class="text-2xl font-black text-amber-700">45</h3></div>
              <div class="bg-emerald-50 rounded-[1.25rem] p-4 border border-emerald-100"><p class="text-[10px] font-bold text-emerald-600 uppercase mb-1">พร้อมรับ</p><h3 class="text-2xl font-black text-emerald-700">12</h3></div>
              <div class="bg-rose-50 rounded-[1.25rem] p-4 border border-rose-100"><p class="text-[10px] font-bold text-rose-600 uppercase mb-1">หมดเวลา</p><h3 class="text-2xl font-black text-rose-700">3</h3></div>
            </div>
            <div class="bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-sm fade-in mt-4" style="animation-delay: 50ms;">
              <h3 class="font-black text-sm text-slate-800 mb-4">หนังสือที่ถูกจองคิวมากที่สุด</h3>
              <div class="space-y-4">
                <div><div class="flex justify-between text-xs font-bold mb-1"><span class="text-slate-700">1. Sapiens</span><span class="text-purple-600 bg-purple-50 px-2 rounded">15 คิว</span></div><div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-purple-500 rounded-full bar-grow" style="width: 80%;"></div></div></div>
                <div><div class="flex justify-between text-xs font-bold mb-1"><span class="text-slate-700">2. Dune</span><span class="text-purple-600 bg-purple-50 px-2 rounded">8 คิว</span></div><div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-purple-400 rounded-full bar-grow" style="width: 50%;"></div></div></div>
                <div><div class="flex justify-between text-xs font-bold mb-1"><span class="text-slate-700">3. Clean Code</span><span class="text-purple-600 bg-purple-50 px-2 rounded">5 คิว</span></div><div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-purple-300 rounded-full bar-grow" style="width: 30%;"></div></div></div>
              </div>
            </div>
          `;
          break;

        case 'R6': // สมาชิกใหม่ (New Members) - Avatar List
          html = `
            <div class="bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-sm flex items-center justify-between fade-in">
              <div><p class="text-[11px] font-bold text-slate-500 uppercase tracking-wide">สมาชิกสมัครใหม่</p><div class="flex items-baseline gap-2 mt-1"><h3 class="text-4xl font-black text-emerald-500">+128</h3></div></div>
              <div class="donut-chart"><div class="donut-inner text-center"><span class="text-[10px] font-bold text-slate-400">นศ. 75%</span></div></div>
            </div>
            <h3 class="font-black text-sm text-slate-800 px-1 mt-4 fade-in" style="animation-delay: 50ms;">รายชื่อล่าสุด</h3>
            <div class="bg-white rounded-[1.5rem] border border-slate-100 shadow-sm overflow-hidden fade-in" style="animation-delay: 100ms;">
              <div class="p-3 border-b border-slate-50 flex items-center gap-3"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=X" class="w-10 h-10 rounded-full bg-slate-100 border border-slate-200"><div><p class="text-sm font-bold text-slate-700">เจนจิรา ม.</p><p class="text-[10px] text-slate-400">คณะบริหารธุรกิจ • 10 นาทีที่แล้ว</p></div></div>
              <div class="p-3 border-b border-slate-50 flex items-center gap-3"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Y" class="w-10 h-10 rounded-full bg-slate-100 border border-slate-200"><div><p class="text-sm font-bold text-slate-700">ธนภัทร ว.</p><p class="text-[10px] text-slate-400">คณะวิศวกรรมศาสตร์ • 1 ชม. ที่แล้ว</p></div></div>
              <div class="p-3 flex items-center gap-3"><img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Z" class="w-10 h-10 rounded-full bg-slate-100 border border-slate-200"><div><p class="text-sm font-bold text-slate-700">ลลิตา อ.</p><p class="text-[10px] text-slate-400">คณะวิทยาศาสตร์ • เมื่อวาน</p></div></div>
            </div>
          `;
          break;

        case 'R7': // คลังหนังสือตามหมวดหมู่ (Inventory) - Horizontal Stacked Bars
          html = `
            <div class="bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-sm fade-in">
              <h3 class="font-black text-sm text-slate-800 mb-1">ภาพรวมคลังหนังสือ</h3>
              <p class="text-xs text-slate-500 mb-6">แสดงสัดส่วน ว่าง (เขียว) vs ถูกยืม (เทา)</p>
              <div class="space-y-5">
                <div>
                  <div class="flex justify-between text-xs font-bold mb-1.5"><span class="text-slate-700">Technology (1,200 เล่ม)</span><span class="text-slate-500">ว่าง 70%</span></div>
                  <div class="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex"><div class="h-full bg-teal-500 bar-grow" style="width: 70%;"></div></div>
                </div>
                <div>
                  <div class="flex justify-between text-xs font-bold mb-1.5"><span class="text-slate-700">Business (800 เล่ม)</span><span class="text-slate-500">ว่าง 45%</span></div>
                  <div class="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex"><div class="h-full bg-teal-400 bar-grow" style="width: 45%; animation-delay: 50ms;"></div></div>
                </div>
                <div>
                  <div class="flex justify-between text-xs font-bold mb-1.5"><span class="text-slate-700">Fiction (2,500 เล่ม)</span><span class="text-slate-500">ว่าง 85%</span></div>
                  <div class="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex"><div class="h-full bg-teal-500 bar-grow" style="width: 85%; animation-delay: 100ms;"></div></div>
                </div>
                <div>
                  <div class="flex justify-between text-xs font-bold mb-1.5"><span class="text-slate-700">Design (400 เล่ม)</span><span class="text-slate-500">ว่าง 20%</span></div>
                  <div class="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex"><div class="h-full bg-teal-300 bar-grow" style="width: 20%; animation-delay: 150ms;"></div></div>
                </div>
              </div>
            </div>
          `;
          break;

        case 'R8': // หนังสือยอดนิยม (Top Books) - Horizontal Bar Chart
          html = `
            <div class="bg-gradient-to-r from-yellow-500 to-amber-500 rounded-[1.5rem] p-6 shadow-lg shadow-yellow-500/30 text-white fade-in relative overflow-hidden">
              <i data-lucide="trophy" class="absolute -right-2 -bottom-2 w-24 h-24 text-white opacity-20"></i>
              <p class="text-xs font-bold text-yellow-100 uppercase tracking-widest mb-1 relative z-10">อันดับ 1 ประจำสัปดาห์</p>
              <h2 class="text-xl font-black relative z-10 leading-tight">Sapiens: A Brief History</h2>
              <p class="text-sm font-medium text-yellow-100 relative z-10 mb-4">ถูกยืมไปแล้ว 124 ครั้ง</p>
              <button class="bg-white text-amber-600 font-bold text-xs px-4 py-2 rounded-xl shadow-sm relative z-10 pressable">ดูรายละเอียดเล่ม</button>
            </div>
            <h3 class="font-black text-sm text-slate-800 px-1 mt-6 mb-3 fade-in" style="animation-delay: 50ms;">Top 5 หนังสือถูกยืมสูงสุด</h3>
            <div class="bg-white rounded-[1.5rem] p-5 border border-slate-100 shadow-sm space-y-5 fade-in" style="animation-delay: 100ms;">
              <div class="space-y-1"><div class="flex justify-between text-xs font-bold"><span class="text-slate-700 truncate w-3/4">1. Sapiens</span><span class="text-brand-600">124</span></div><div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-brand-500 rounded-full bar-grow" style="width: 100%;"></div></div></div>
              <div class="space-y-1"><div class="flex justify-between text-xs font-bold"><span class="text-slate-700 truncate w-3/4">2. Atomic Habits</span><span class="text-brand-600">98</span></div><div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-brand-400 rounded-full bar-grow" style="width: 80%; animation-delay: 100ms;"></div></div></div>
              <div class="space-y-1"><div class="flex justify-between text-xs font-bold"><span class="text-slate-700 truncate w-3/4">3. Design of Everyday Things</span><span class="text-brand-600">76</span></div><div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-brand-300 rounded-full bar-grow" style="width: 60%; animation-delay: 200ms;"></div></div></div>
              <div class="space-y-1"><div class="flex justify-between text-xs font-bold"><span class="text-slate-700 truncate w-3/4">4. Clean Code</span><span class="text-brand-600">45</span></div><div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-slate-400 rounded-full bar-grow" style="width: 35%; animation-delay: 300ms;"></div></div></div>
              <div class="space-y-1"><div class="flex justify-between text-xs font-bold"><span class="text-slate-700 truncate w-3/4">5. Think Again</span><span class="text-brand-600">30</span></div><div class="w-full h-3 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-slate-300 rounded-full bar-grow" style="width: 20%; animation-delay: 400ms;"></div></div></div>
            </div>
          `;
          break;
      }
      
      contentArea.innerHTML = html;
      lucide.createIcons();
    }

    /* --- TOAST LOGIC --- */
    function showToast(msg) {
      const t = document.getElementById('toast-container');
      document.getElementById('toast-message').innerText = msg;
      
      t.classList.remove('hidden');
      void t.offsetWidth; // Reflow
      t.classList.remove('-translate-y-4', 'opacity-0');
      
      setTimeout(() => {
        t.classList.add('-translate-y-4', 'opacity-0');
        setTimeout(() => t.classList.add('hidden'), 300);
      }, 2500);
    }

  </script>
</body>
</html>
