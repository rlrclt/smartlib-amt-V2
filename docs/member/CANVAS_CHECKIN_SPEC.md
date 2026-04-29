<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no">
  <title>Check-in - Native Web App</title>
  
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
            'native': '0 4px 24px rgba(0, 0, 0, 0.04), 0 -2px 12px rgba(0, 0, 0, 0.02)',
            'desktop': '0 20px 60px -15px rgba(0, 0, 0, 0.05)',
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
      background-color: #F8FAFC; /* Slate 50 */
      -webkit-tap-highlight-color: transparent;
    }
    
    /* Native Press Feedback */
    .pressable {
      transition: transform 0.15s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.15s ease, background-color 0.15s ease;
      cursor: pointer;
      user-select: none;
    }
    .pressable:active { transform: scale(0.96); opacity: 0.8; }
    
    .touch-target { min-height: 48px; min-width: 48px; }

    /* Hide Scrollbar */
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    /* Activity Checkbox Styling */
    .activity-checkbox:checked + div {
      background-color: theme('colors.brand.50');
      border-color: theme('colors.brand.300');
      color: theme('colors.brand.700');
    }
    .activity-checkbox:checked + div .check-icon {
      opacity: 1; transform: scale(1);
    }

    /* Toast Animation */
    @keyframes slideUpFade {
      from { opacity: 0; transform: translateY(20px) translateX(-50%); }
      to { opacity: 1; transform: translateY(0) translateX(-50%); }
    }
    .toast-animate {
      animation: slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
    
    /* Timer Font Settings (Tabular Nums) */
    .tabular-timer {
      font-variant-numeric: tabular-nums;
      letter-spacing: -0.02em;
    }
  </style>
</head>
<body class="text-slate-800 antialiased overflow-x-hidden md:p-6 lg:p-12 flex items-center justify-center min-h-[100dvh]">

  <!-- RESPONSIVE APP CONTAINER -->
  <!-- Mobile: Full screen stack | iPad/Desktop: Centered Card 2-Columns -->
  <div class="w-full md:max-w-[860px] lg:max-w-[1024px] bg-white md:rounded-[2.5rem] md:shadow-desktop flex flex-col md:flex-row min-h-[100dvh] md:min-h-[640px] md:h-[80vh] relative overflow-hidden md:border border-slate-100 mx-auto">
    
    <!-- ==========================================
         LEFT PANE (Header, Business Hours, Status)
         ========================================== -->
    <div class="flex flex-col w-full md:w-[45%] lg:w-[40%] bg-white md:bg-slate-50/50 md:border-r border-slate-100 z-10 md:overflow-y-auto hide-scrollbar shrink-0">
      
      <!-- HEADER (Sticky on mobile, static on desktop) -->
      <header class="sticky top-0 md:static z-30 bg-white/90 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none border-b border-slate-100 md:border-none" style="padding-top: max(1rem, var(--safe-top))">
        <div class="flex items-center justify-between px-5 pb-3 md:pt-5 md:px-8">
          <button class="pressable touch-target flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 md:bg-white md:border md:border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors shadow-sm">
            <i data-lucide="chevron-left" class="w-6 h-6"></i>
          </button>
          <h1 class="text-lg font-black text-slate-800 tracking-tight md:hidden">เช็คอินเข้าใช้บริการ</h1>
          <div class="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold overflow-hidden shadow-sm">
            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=e0f2fe" alt="Profile" class="w-full h-full object-cover">
          </div>
        </div>
      </header>

      <!-- LEFT CONTENT -->
      <div class="p-5 md:px-8 md:pb-8 flex flex-col gap-6">
        
        <!-- Desktop Page Title -->
        <div class="hidden md:block">
          <h1 class="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">เช็คอิน<br>เข้าใช้บริการ</h1>
          <p class="text-slate-500 font-medium mt-2">ยินดีต้อนรับสู่ห้องสมุด ANT Library</p>
        </div>

        <!-- 1. Business Hours Section -->
        <section class="rounded-[1.5rem] border border-slate-200 bg-slate-50 md:bg-white md:shadow-sm p-4">
          <div class="flex items-center gap-2 mb-2">
            <i data-lucide="clock" class="w-4 h-4 text-slate-400"></i>
            <h3 class="text-xs font-black uppercase text-slate-500">เวลาทำการวันนี้</h3>
          </div>
          <div class="flex justify-between items-center bg-white md:bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 shadow-sm md:shadow-none">
            <span class="text-sm font-bold text-slate-700">จันทร์ - ศุกร์</span>
            <span class="text-base font-black text-brand-600 flex items-center gap-2">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full bg-emerald-500 w-full h-full"></span>
              </span>
              08:30 - 16:30
            </span>
          </div>
          <p class="mt-2.5 text-[10.5px] font-bold text-slate-400 flex items-start gap-1 leading-snug">
            <i data-lucide="info" class="w-3 h-3 mt-0.5 shrink-0"></i>
            หากเกินเวลาทำการ ระบบจะปิดการเช็คอินโดยอัตโนมัติ
          </p>
        </section>

        <!-- 2. Active Session Card (Hidden by default) -->
        <section id="active-session-card" class="hidden">
          <div class="relative rounded-[2rem] bg-gradient-to-br from-brand-500 to-blue-600 p-6 text-white shadow-lg shadow-brand-500/30 overflow-hidden">
            <!-- Background decoration -->
            <div class="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div class="absolute -left-6 -bottom-6 w-24 h-24 bg-blue-900/20 rounded-full blur-xl"></div>
            
            <div class="relative z-10 flex flex-col items-center text-center">
              <div class="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 mb-4 border border-white/20">
                <i data-lucide="activity" class="w-3.5 h-3.5"></i> กำลังใช้งาน
              </div>
              
              <!-- Real-time Ticker -->
              <p class="text-sm font-medium text-brand-50 mb-1">ระยะเวลา</p>
              <h2 id="timer-display" class="tabular-timer text-5xl lg:text-6xl font-black tracking-tight drop-shadow-md mb-6">
                00:00:00
              </h2>
              
              <div class="w-full bg-black/10 rounded-2xl p-4 flex justify-between items-center backdrop-blur-sm border border-white/10">
                <div class="text-left">
                  <p class="text-[10px] text-brand-100 uppercase font-bold tracking-wider mb-0.5">เวลาเข้า</p>
                  <p id="checkin-time-display" class="text-sm font-bold">--:-- น.</p>
                </div>
                <div class="w-px h-8 bg-white/20"></div>
                <div class="text-right">
                  <p class="text-[10px] text-brand-100 uppercase font-bold tracking-wider mb-0.5">สถานะ</p>
                  <p class="text-sm font-bold text-emerald-200">เปิดให้บริการ</p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>

    <!-- ==========================================
         RIGHT PANE (Activity Selector & Actions)
         ========================================== -->
    <div class="flex flex-col w-full md:w-[55%] lg:w-[60%] bg-white relative z-20 pb-28 md:pb-0 md:overflow-y-auto hide-scrollbar">
      
      <div class="p-5 md:p-8 flex-1 flex flex-col">
        
        <!-- 3. Activity Selector -->
        <section class="flex-1">
          <h2 class="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            เลือกกิจกรรมที่คุณกำลังทำ
            <span class="text-xs font-medium text-slate-400 font-normal hidden sm:inline">(เลือกได้มากกว่า 1)</span>
          </h2>
          
          <div class="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-2">
            <!-- Item 1 -->
            <label class="relative cursor-pointer pressable">
              <input type="checkbox" class="activity-checkbox peer sr-only" value="borrow_return">
              <div class="h-full border-2 border-slate-100 rounded-[1.5rem] p-4 md:p-5 text-slate-500 transition-all shadow-sm bg-white hover:border-slate-200">
                <div class="flex justify-between items-start mb-2">
                  <div class="p-2 bg-slate-50 rounded-xl peer-checked:bg-brand-100 transition-colors">
                    <i data-lucide="book-up" class="w-5 h-5 text-slate-600 peer-checked:text-brand-600"></i>
                  </div>
                  <i data-lucide="check-circle-2" class="check-icon w-5 h-5 text-brand-500 opacity-0 scale-50 transition-all"></i>
                </div>
                <p class="font-bold text-sm lg:text-base text-slate-700 mt-2 md:mt-3">ยืม - คืนหนังสือ</p>
              </div>
            </label>

            <!-- Item 2 -->
            <label class="relative cursor-pointer pressable">
              <input type="checkbox" class="activity-checkbox peer sr-only" value="reading" checked>
              <div class="h-full border-2 border-slate-100 rounded-[1.5rem] p-4 md:p-5 text-slate-500 transition-all shadow-sm bg-white hover:border-slate-200">
                <div class="flex justify-between items-start mb-2">
                  <div class="p-2 bg-slate-50 rounded-xl">
                    <i data-lucide="book-open" class="w-5 h-5 text-slate-600"></i>
                  </div>
                  <i data-lucide="check-circle-2" class="check-icon w-5 h-5 text-brand-500 opacity-0 scale-50 transition-all"></i>
                </div>
                <p class="font-bold text-sm lg:text-base text-slate-700 mt-2 md:mt-3">อ่านหนังสือ</p>
              </div>
            </label>

            <!-- Item 3 -->
            <label class="relative cursor-pointer pressable">
              <input type="checkbox" class="activity-checkbox peer sr-only" value="computer">
              <div class="h-full border-2 border-slate-100 rounded-[1.5rem] p-4 md:p-5 text-slate-500 transition-all shadow-sm bg-white hover:border-slate-200">
                <div class="flex justify-between items-start mb-2">
                  <div class="p-2 bg-slate-50 rounded-xl">
                    <i data-lucide="monitor" class="w-5 h-5 text-slate-600"></i>
                  </div>
                  <i data-lucide="check-circle-2" class="check-icon w-5 h-5 text-brand-500 opacity-0 scale-50 transition-all"></i>
                </div>
                <p class="font-bold text-sm lg:text-base text-slate-700 mt-2 md:mt-3">ใช้คอมพิวเตอร์</p>
              </div>
            </label>

            <!-- Item 4 -->
            <label class="relative cursor-pointer pressable">
              <input type="checkbox" class="activity-checkbox peer sr-only" value="relax">
              <div class="h-full border-2 border-slate-100 rounded-[1.5rem] p-4 md:p-5 text-slate-500 transition-all shadow-sm bg-white hover:border-slate-200">
                <div class="flex justify-between items-start mb-2">
                  <div class="p-2 bg-slate-50 rounded-xl">
                    <i data-lucide="coffee" class="w-5 h-5 text-slate-600"></i>
                  </div>
                  <i data-lucide="check-circle-2" class="check-icon w-5 h-5 text-brand-500 opacity-0 scale-50 transition-all"></i>
                </div>
                <p class="font-bold text-sm lg:text-base text-slate-700 mt-2 md:mt-3">นั่งพักผ่อน</p>
              </div>
            </label>
          </div>
        </section>

        <!-- 4. BOTTOM ACTION BAR (Responsive placement) -->
        <!-- Fixed bottom on Mobile | Static at bottom of column on Desktop -->
        <div class="fixed md:static bottom-0 left-0 right-0 bg-white/90 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none border-t md:border-none border-slate-100 px-5 md:px-0 pt-4 md:pt-8 pb-[max(1.5rem,var(--safe-bottom))] md:pb-0 z-40 shadow-native md:shadow-none mt-auto">
          
          <!-- Unchecked State Actions -->
          <div id="action-idle">
            <button id="btn-start-checkin" class="pressable touch-target w-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-lg rounded-full py-4 shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2 transition-all">
              <i data-lucide="log-in" class="w-5 h-5"></i>
              เริ่มเช็คอินเข้าใช้
            </button>
          </div>

          <!-- Active State Actions (Hidden by default) -->
          <div id="action-active" class="hidden flex flex-col sm:flex-row gap-3">
            <!-- Save Activities Button -->
            <button id="btn-save-activities" class="pressable touch-target flex-1 bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 font-bold text-sm rounded-full py-4 md:py-3.5 flex items-center justify-center gap-2 transition-all">
              <i data-lucide="save" class="w-4 h-4"></i> บันทึกกิจกรรม
            </button>
            <!-- Checkout Button -->
            <button id="btn-checkout" class="pressable touch-target flex-1 bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm rounded-full py-4 md:py-3.5 shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 transition-all">
              <i data-lucide="log-out" class="w-4 h-4"></i> เช็คเอาท์ออก
            </button>
          </div>

        </div>

      </div>
    </div>
    
  </div> <!-- End Layout Wrapper -->

  <!-- TOAST NOTIFICATION CONTAINER -->
  <div id="toast-container" class="fixed top-[max(1.5rem,var(--safe-top))] left-1/2 -translate-x-1/2 z-50 pointer-events-none w-[90%] max-w-sm hidden">
    <div class="bg-slate-800 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 w-full backdrop-blur-md bg-opacity-95">
      <div class="bg-emerald-500/20 text-emerald-400 p-1.5 rounded-full shrink-0">
        <i data-lucide="check" class="w-4 h-4"></i>
      </div>
      <p id="toast-message" class="text-sm font-bold">แจ้งเตือนสำเร็จ</p>
    </div>
  </div>

  <!-- Application Logic -->
  <script>
    lucide.createIcons();

    // 1. STATE Management
    const STATE = {
      isCheckedIn: false,
      startTime: null,
      timerInterval: null
    };

    // DOM Elements
    const elActiveSessionCard = document.getElementById('active-session-card');
    const elTimerDisplay = document.getElementById('timer-display');
    const elCheckinTimeDisplay = document.getElementById('checkin-time-display');
    
    const elActionIdle = document.getElementById('action-idle');
    const elActionActive = document.getElementById('action-active');
    
    const btnStartCheckin = document.getElementById('btn-start-checkin');
    const btnSaveActivities = document.getElementById('btn-save-activities');
    const btnCheckout = document.getElementById('btn-checkout');

    const toastContainer = document.getElementById('toast-container');
    const toastMessage = document.getElementById('toast-message');

    // 2. Logic: Real-time Ticker formatting
    function formatElapsedTime(ms) {
      const totalSeconds = Math.floor(ms / 1000);
      const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }

    // Ticker Updater
    function updateTimer() {
      if (!STATE.startTime) return;
      const now = new Date();
      const diff = now - STATE.startTime;
      elTimerDisplay.innerText = formatElapsedTime(diff);
    }

    // Show Toast UI Feedback
    function showToast(message, duration = 3000) {
      toastMessage.innerText = message;
      toastContainer.classList.remove('hidden');
      toastContainer.firstElementChild.classList.remove('toast-animate');
      // Trigger reflow
      void toastContainer.offsetWidth; 
      toastContainer.firstElementChild.classList.add('toast-animate');
      
      setTimeout(() => {
        toastContainer.classList.add('hidden');
      }, duration);
    }

    // 3. Interactions: Button Listeners
    
    // -> Start Check-in
    btnStartCheckin.addEventListener('click', () => {
      // Set State
      STATE.isCheckedIn = true;
      STATE.startTime = new Date();
      
      // Update UI displays
      elCheckinTimeDisplay.innerText = STATE.startTime.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
      elTimerDisplay.innerText = "00:00:00";
      
      // Toggle visibility
      elActiveSessionCard.classList.remove('hidden');
      elActionIdle.classList.add('hidden');
      elActionActive.classList.remove('hidden');
      
      // Start Ticker
      STATE.timerInterval = setInterval(updateTimer, 1000);

      // Feedback
      btnStartCheckin.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i> กำลังบันทึก...';
      
      setTimeout(() => {
        showToast('เช็คอินสำเร็จ ขอให้มีความสุขกับการใช้งานครับ!');
        btnStartCheckin.innerHTML = '<i data-lucide="log-in" class="w-5 h-5"></i> เริ่มเช็คอินเข้าใช้'; // reset
        lucide.createIcons();
      }, 600);
    });

    // -> Save Activities
    btnSaveActivities.addEventListener('click', () => {
      const originalText = btnSaveActivities.innerHTML;
      btnSaveActivities.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> กำลังอัปเดต...';
      
      setTimeout(() => {
        showToast('อัปเดตกิจกรรมที่กำลังทำเรียบร้อยแล้ว');
        btnSaveActivities.innerHTML = originalText;
        lucide.createIcons();
      }, 500);
    });

    // -> Checkout
    btnCheckout.addEventListener('click', () => {
      // Clear State
      STATE.isCheckedIn = false;
      clearInterval(STATE.timerInterval);
      STATE.startTime = null;
      
      const originalText = btnCheckout.innerHTML;
      btnCheckout.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> กำลังเช็คเอาท์...';
      
      setTimeout(() => {
        // Toggle visibility back
        elActiveSessionCard.classList.add('hidden');
        elActionIdle.classList.remove('hidden');
        elActionActive.classList.add('hidden');
        
        btnCheckout.innerHTML = originalText;
        lucide.createIcons();
        showToast('เช็คเอาท์เรียบร้อย ขอบคุณที่ใช้บริการครับ');
      }, 800);
    });

  </script>
</body>
</html>
