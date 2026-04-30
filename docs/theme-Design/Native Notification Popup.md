<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no">
  <title>Notification Popup - Native App</title>
  
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
            'popover': '0 10px 40px -10px rgba(0,0,0,0.15)',
          }
        }
      }
    }
  </script>

  <style>
    :root {
      --safe-top: env(safe-area-inset-top, 0px);
    }
    body { background-color: #F1F5F9; -webkit-tap-highlight-color: transparent; overscroll-behavior-y: none; }
    
    .app-container {
      max-width: 480px; margin: 0 auto; background-color: #F8FAFC;
      height: 100dvh; position: relative; overflow: hidden;
      box-shadow: 0 0 40px rgba(0,0,0,0.05); display: flex; flex-direction: column;
    }

    /* กดแล้วหดตัว (Native Press Feedback) */
    .pressable { transition: transform 0.15s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.15s ease; cursor: pointer; }
    .pressable:active { transform: scale(0.96); opacity: 0.8; }

    /* ซ่อน Scrollbar */
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    /* =========================================
       POPOVER ANIMATIONS (ขยายจากมุมขวาบน)
       ========================================= */
    .popover-enter {
      animation: popoverIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards;
      transform-origin: top right;
    }
    .popover-exit {
      animation: popoverOut 0.2s ease-in forwards;
      transform-origin: top right;
    }
    @keyframes popoverIn {
      0% { opacity: 0; transform: scale(0.8) translateY(-10px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes popoverOut {
      0% { opacity: 1; transform: scale(1) translateY(0); }
      100% { opacity: 0; transform: scale(0.9) translateY(-10px); }
    }

  </style>
</head>
<body class="text-slate-800">

  <div class="app-container relative">
    
    <!-- =========================================
         TOP NAVBAR
         ========================================= -->
    <header class="bg-white/90 backdrop-blur-xl border-b border-slate-200 z-20 px-4 pb-2 pt-2 shrink-0 sticky top-0" style="padding-top: max(1rem, var(--safe-top))">
      <div class="flex justify-between items-center h-12 relative z-30">
        <!-- Logo / Title -->
        <h1 class="text-lg font-black text-slate-800 tracking-tight">ANT Library</h1>

        <!-- NOTIFICATION BELL ICON -->
        <button id="btn-top-bell" class="pressable w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors relative" onclick="toggleNotification()">
          <i data-lucide="bell" class="w-5 h-5 pointer-events-none"></i>
          <!-- Unread Badge (จุดแดง) -->
          <span class="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-white pointer-events-none" id="bell-badge"></span>
        </button>
      </div>
    </header>

    <!-- CONTENT จำลอง (คลิกพื้นที่ว่างเพื่อปิด Popover ได้) -->
    <main class="flex-1 overflow-y-auto hide-scrollbar p-4 space-y-4 z-10" id="main-content" onclick="closeNotification()">
      <div class="w-full h-48 bg-gradient-to-br from-brand-400 to-indigo-500 rounded-3xl p-6 text-white flex flex-col justify-end">
        <h2 class="font-black text-2xl">Dashboard</h2>
        <p class="text-sm font-medium opacity-90">ทดลองกดปุ่มกระดิ่งมุมขวาบน ↗️</p>
      </div>
    </main>


    <!-- =====================================================================
         NOTIFICATION POPOVER COMPONENT
         ===================================================================== -->
    
    <!-- Overlay โปร่งใสสำหรับดักจับการคลิกนอก Popover เพื่อปิด -->
    <div id="popover-overlay" class="absolute inset-0 z-40 hidden" onclick="closeNotification()"></div>

    <!-- ตัว Popover หลัก -->
    <div id="notification-popover" class="absolute top-[max(4rem,calc(var(--safe-top)+3.5rem))] right-4 w-[320px] bg-white rounded-3xl shadow-popover border border-slate-100 z-50 hidden flex-col">
      
      <!-- Popover Pointer (ติ่งลูกศรชี้ขึ้น) -->
      <div class="absolute -top-2 right-4 w-4 h-4 bg-white border-t border-l border-slate-100 rotate-45"></div>
      
      <!-- ส่วนหัว (Header) -->
      <div class="px-5 py-4 border-b border-slate-50 flex justify-between items-center relative bg-white rounded-t-3xl">
        <h3 class="text-[15px] font-black text-slate-800">การแจ้งเตือน</h3>
        <button class="text-[11px] font-bold text-brand-600 hover:underline pressable" onclick="markAllAsRead()">อ่านทั้งหมด</button>
      </div>
      
      <!-- รายการแจ้งเตือน (List) -->
      <div class="max-h-[360px] overflow-y-auto hide-scrollbar py-2" id="notification-list">
        
        <!-- รายการที่ 1: ยังไม่อ่าน (มีจุดสีฟ้า) -->
        <button class="notification-item pressable w-full p-3 px-5 hover:bg-slate-50 transition-colors text-left flex gap-3 relative" onclick="closeNotification()">
          <span class="absolute top-5 left-2 w-1.5 h-1.5 bg-brand-500 rounded-full unread-dot"></span>
          <div class="w-10 h-10 bg-brand-50 rounded-full flex items-center justify-center text-brand-500 shrink-0"><i data-lucide="book-up" class="w-5 h-5"></i></div>
          <div class="flex-1 min-w-0">
            <h4 class="text-[13px] font-bold text-slate-800 line-clamp-1">ถึงกำหนดคืนหนังสือพรุ่งนี้</h4>
            <p class="text-[11px] font-medium text-slate-500 mt-0.5 line-clamp-2">อย่าลืมนำ "The Design of Everyday Things" มาคืนนะคะ</p>
            <span class="text-[10px] font-bold text-brand-500 mt-1 block">10 นาทีที่แล้ว</span>
          </div>
        </button>

        <!-- รายการที่ 2: ยังไม่อ่าน (มีจุดสีฟ้า) -->
        <button class="notification-item pressable w-full p-3 px-5 hover:bg-slate-50 transition-colors text-left flex gap-3 relative" onclick="closeNotification()">
          <span class="absolute top-5 left-2 w-1.5 h-1.5 bg-brand-500 rounded-full unread-dot"></span>
          <div class="w-10 h-10 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 shrink-0"><i data-lucide="alert-circle" class="w-5 h-5"></i></div>
          <div class="flex-1 min-w-0">
            <h4 class="text-[13px] font-bold text-slate-800 line-clamp-1">ค่าปรับค้างชำระ</h4>
            <p class="text-[11px] font-medium text-slate-500 mt-0.5 line-clamp-2">คุณมียอดค้างชำระ 15 บาท กรุณาติดต่อเคาน์เตอร์บรรณารักษ์</p>
            <span class="text-[10px] font-bold text-brand-500 mt-1 block">1 ชั่วโมงที่แล้ว</span>
          </div>
        </button>

        <!-- รายการที่ 3: อ่านแล้ว (Opacity ลดลง) -->
        <button class="notification-item read pressable w-full p-3 px-5 hover:bg-slate-50 transition-colors text-left flex gap-3 opacity-60" onclick="closeNotification()">
          <div class="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 shrink-0"><i data-lucide="check-circle" class="w-5 h-5"></i></div>
          <div class="flex-1 min-w-0">
            <h4 class="text-[13px] font-bold text-slate-800 line-clamp-1">คืนหนังสือเรียบร้อย</h4>
            <p class="text-[11px] font-medium text-slate-500 mt-0.5 line-clamp-2">ระบบได้รับหนังสือ Atomic Habits แล้ว ขอบคุณค่ะ</p>
            <span class="text-[10px] font-bold text-slate-400 mt-1 block">เมื่อวาน</span>
          </div>
        </button>

      </div>
      
      <!-- ส่วนท้าย (Footer) -->
      <div class="p-3 border-t border-slate-50 bg-slate-50/50 rounded-b-3xl">
        <button class="pressable w-full text-center text-xs font-bold text-slate-500 py-2 hover:text-slate-800 transition-colors" onclick="closeNotification()">ดูการแจ้งเตือนทั้งหมด</button>
      </div>
    </div>

  </div>

  <script>
    lucide.createIcons();

    const popover = document.getElementById('notification-popover');
    const overlay = document.getElementById('popover-overlay');
    let isPopoverOpen = false;

    // ฟังก์ชัน เปิด/ปิด Popover
    function toggleNotification() {
      if (isPopoverOpen) {
        closeNotification();
      } else {
        openNotification();
      }
    }

    function openNotification() {
      if(navigator.vibrate) navigator.vibrate(20); // สั่นเบาๆ ตอบสนองการกด
      
      // แสดง Overlay และ Popover
      overlay.classList.remove('hidden');
      popover.classList.remove('hidden', 'popover-exit');
      popover.classList.add('flex', 'popover-enter');
      
      isPopoverOpen = true;
    }

    function closeNotification() {
      if (!isPopoverOpen) return;
      
      // ลบ Overlay ทันที
      overlay.classList.add('hidden');
      
      // เล่นแอนิเมชันขาออก
      popover.classList.remove('popover-enter');
      popover.classList.add('popover-exit');
      
      // ซ่อน Element หลังจากแอนิเมชันจบ (200ms)
      setTimeout(() => {
        popover.classList.add('hidden');
        popover.classList.remove('flex');
        isPopoverOpen = false;
      }, 200);
    }

    // ฟังก์ชันจำลองการ "อ่านทั้งหมด"
    function markAllAsRead() {
      // ซ่อนจุดแดงที่กระดิ่ง
      const bellBadge = document.getElementById('bell-badge');
      if (bellBadge) bellBadge.classList.add('hidden');

      // ปรับสไตล์รายการให้เป็นแบบอ่านแล้ว
      const items = document.querySelectorAll('.notification-item');
      items.forEach(item => {
        item.classList.add('opacity-60', 'read');
        const dot = item.querySelector('.unread-dot');
        if (dot) dot.classList.add('hidden');
        
        const timeText = item.querySelector('.text-brand-500');
        if (timeText) {
          timeText.classList.remove('text-brand-500');
          timeText.classList.add('text-slate-400');
        }
      });
    }
  </script>
</body>
</html>
