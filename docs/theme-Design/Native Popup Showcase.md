<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no">
  <title>Native Popups Showcase</title>
  
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
            'native': '0 10px 40px rgba(0, 0, 0, 0.08)',
            'sheet': '0 -10px 40px rgba(0, 0, 0, 0.1)',
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
    body { background-color: #F1F5F9; -webkit-tap-highlight-color: transparent; overscroll-behavior-y: none; }
    
    .app-container {
      max-width: 480px;
      margin: 0 auto;
      background-color: #F8FAFC;
      height: 100dvh;
      position: relative;
      overflow: hidden;
      box-shadow: 0 0 40px rgba(0,0,0,0.05);
      display: flex;
      flex-direction: column;
    }

    .pressable {
      transition: transform 0.15s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.15s ease;
      cursor: pointer;
    }
    .pressable:active { transform: scale(0.94); opacity: 0.8; }

    /* =========================================
       NATIVE POPUP ANIMATIONS
       ========================================= */
    
    /* 1. Backdrop Fade */
    .backdrop-anim {
      animation: fadeIn 0.3s ease-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; } to { opacity: 1; }
    }
    .backdrop-fade-out {
      animation: fadeOut 0.2s ease-in forwards;
    }
    @keyframes fadeOut {
      from { opacity: 1; } to { opacity: 0; }
    }

    /* 2. Center Pop (Spring-like) */
    .pop-center {
      animation: popSpring 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.2) forwards;
    }
    @keyframes popSpring {
      from { opacity: 0; transform: scale(0.85); }
      to { opacity: 1; transform: scale(1); }
    }
    .pop-center-out {
      animation: popOut 0.2s ease-in forwards;
    }
    @keyframes popOut {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(0.9); }
    }

    /* 3. Bottom Sheet Slide Up */
    .slide-up-sheet {
      animation: slideUp 0.4s cubic-bezier(0.32, 0.72, 0, 1) forwards;
    }
    @keyframes slideUp {
      from { transform: translateY(100%); }
      to { transform: translateY(0); }
    }
    .slide-down-sheet {
      animation: slideDown 0.3s cubic-bezier(0.32, 0.72, 0, 1) forwards;
    }
    @keyframes slideDown {
      from { transform: translateY(0); }
      to { transform: translateY(100%); }
    }

    /* 4. Top Toast Drop Down */
    .slide-down-toast {
      animation: toastDrop 0.4s cubic-bezier(0.32, 0.72, 0, 1) forwards;
    }
    @keyframes toastDrop {
      from { opacity: 0; transform: translateY(-100%); }
      to { opacity: 1; transform: translateY(0); }
    }
    .slide-up-toast-out {
      animation: toastRise 0.3s ease-in forwards;
    }
    @keyframes toastRise {
      from { opacity: 1; transform: translateY(0); }
      to { opacity: 0; transform: translateY(-100%); }
    }
    
    /* 5. Shake (For Error/Destructive) */
    .shake-anim {
      animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
    }
    @keyframes shake {
      10%, 90% { transform: translate3d(-1px, 0, 0); }
      20%, 80% { transform: translate3d(2px, 0, 0); }
      30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
      40%, 60% { transform: translate3d(4px, 0, 0); }
    }

    /* Generic container for active popup */
    #popup-root {
      position: absolute; inset: 0; z-index: 100;
      display: none; pointer-events: none;
    }
    #popup-root.active { display: block; pointer-events: auto; }

  </style>
</head>
<body class="text-slate-800">

  <div class="app-container">
    
    <!-- HEADER -->
    <header class="bg-white/90 backdrop-blur-xl border-b border-slate-200 z-10 px-4 py-4 shrink-0" style="padding-top: max(1rem, var(--safe-top))">
      <h1 class="text-xl font-black text-slate-800 tracking-tight">Native Popups Gallery</h1>
      <p class="text-xs text-slate-500 font-medium mt-1">10 รูปแบบการแจ้งเตือนสไตล์แอปพลิเคชัน</p>
    </header>

    <!-- LIST OF 10 STYLES -->
    <div class="flex-1 overflow-y-auto hide-scrollbar px-4 py-6 space-y-3 pb-12">
      
      <button class="pressable w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm" onclick="openPopup(1)">
        <div class="w-10 h-10 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center shrink-0"><i data-lucide="message-square" class="w-5 h-5"></i></div>
        <div class="text-left"><span class="block text-sm font-bold text-slate-800">1. Standard Alert</span><span class="block text-[11px] text-slate-400 font-medium mt-0.5">กล่องข้อความเด้งตรงกลาง แบบคลาสสิก</span></div>
      </button>

      <button class="pressable w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm" onclick="openPopup(2)">
        <div class="w-10 h-10 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center shrink-0"><i data-lucide="menu" class="w-5 h-5"></i></div>
        <div class="text-left"><span class="block text-sm font-bold text-slate-800">2. Action Sheet</span><span class="block text-[11px] text-slate-400 font-medium mt-0.5">เมนูตัวเลือก เลื่อนขึ้นจากขอบล่าง</span></div>
      </button>

      <button class="pressable w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm" onclick="openPopup(3)">
        <div class="w-10 h-10 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center shrink-0"><i data-lucide="maximize" class="w-5 h-5"></i></div>
        <div class="text-left"><span class="block text-sm font-bold text-slate-800">3. Full Screen Modal</span><span class="block text-[11px] text-slate-400 font-medium mt-0.5">หน้าต่างใหม่ คลุมเต็มหน้าจอ</span></div>
      </button>

      <button class="pressable w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm" onclick="openPopup(4)">
        <div class="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0"><i data-lucide="bell-ring" class="w-5 h-5"></i></div>
        <div class="text-left"><span class="block text-sm font-bold text-slate-800">4. Top Toast Notification</span><span class="block text-[11px] text-slate-400 font-medium mt-0.5">แจ้งเตือนสำเร็จ เลื่อนลงจากขอบบน</span></div>
      </button>

      <button class="pressable w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm" onclick="openPopup(5)">
        <div class="w-10 h-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shrink-0"><i data-lucide="sparkles" class="w-5 h-5"></i></div>
        <div class="text-left"><span class="block text-sm font-bold text-slate-800">5. Promo / Feature Card</span><span class="block text-[11px] text-slate-400 font-medium mt-0.5">การ์ดโปรโมทพร้อมรูปภาพประกอบ</span></div>
      </button>

      <button class="pressable w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm" onclick="openPopup(6)">
        <div class="w-10 h-10 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center shrink-0"><i data-lucide="keyboard" class="w-5 h-5"></i></div>
        <div class="text-left"><span class="block text-sm font-bold text-slate-800">6. Input Prompt</span><span class="block text-[11px] text-slate-400 font-medium mt-0.5">กล่องกรอกข้อมูล เด้งหลบ Keyboard</span></div>
      </button>

      <button class="pressable w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm" onclick="openPopup(7)">
        <div class="w-10 h-10 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center shrink-0"><i data-lucide="sliders-horizontal" class="w-5 h-5"></i></div>
        <div class="text-left"><span class="block text-sm font-bold text-slate-800">7. Bottom Filter Drawer</span><span class="block text-[11px] text-slate-400 font-medium mt-0.5">ลิ้นชักปรับแต่งตัวกรอง ดึงจากด้านล่าง</span></div>
      </button>

      <button class="pressable w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm" onclick="openPopup(8)">
        <div class="w-10 h-10 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center shrink-0"><i data-lucide="more-vertical" class="w-5 h-5"></i></div>
        <div class="text-left"><span class="block text-sm font-bold text-slate-800">8. Context Popover</span><span class="block text-[11px] text-slate-400 font-medium mt-0.5">เมนูลอยแบบย่อ สำหรับตัวเลือกเพิ่มเติม</span></div>
      </button>

      <button class="pressable w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm" onclick="openPopup(9)">
        <div class="w-10 h-10 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shrink-0"><i data-lucide="star" class="w-5 h-5"></i></div>
        <div class="text-left"><span class="block text-sm font-bold text-slate-800">9. Rating & Feedback</span><span class="block text-[11px] text-slate-400 font-medium mt-0.5">ป๊อปอัปให้คะแนนความพึงพอใจ 5 ดาว</span></div>
      </button>

      <button class="pressable w-full bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm" onclick="openPopup(10)">
        <div class="w-10 h-10 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center shrink-0"><i data-lucide="alert-octagon" class="w-5 h-5"></i></div>
        <div class="text-left"><span class="block text-sm font-bold text-slate-800">10. Destructive Alert</span><span class="block text-[11px] text-slate-400 font-medium mt-0.5">กล่องเตือนสีแดง สำหรับการลบข้อมูล</span></div>
      </button>

    </div>

    <!-- THE POPUP ROOT CONTAINER -->
    <div id="popup-root">
      <!-- Injected HTML will go here -->
    </div>

  </div> <!-- End App -->

  <script>
    lucide.createIcons();

    // =========================================
    // POPUP TEMPLATES
    // =========================================
    const templates = {
      
      // 1. Standard Alert (Center Pop)
      1: `
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm backdrop-anim" id="backdrop" onclick="closePopup('center')"></div>
        <div class="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
          <div class="bg-white rounded-[2rem] w-full max-w-sm shadow-native pop-center pointer-events-auto flex flex-col overflow-hidden" id="modal-content">
            <div class="p-6 text-center">
              <h3 class="text-xl font-black text-slate-800 mb-2">ออกจากระบบ</h3>
              <p class="text-sm font-medium text-slate-500">คุณแน่ใจหรือไม่ว่าต้องการออกจากระบบ ANT Library บนอุปกรณ์นี้?</p>
            </div>
            <div class="flex border-t border-slate-100 bg-slate-50/50">
              <button class="pressable flex-1 py-4 text-sm font-bold text-slate-500 border-r border-slate-100" onclick="closePopup('center')">ยกเลิก</button>
              <button class="pressable flex-1 py-4 text-sm font-black text-rose-600" onclick="closePopup('center')">ออกจากระบบ</button>
            </div>
          </div>
        </div>
      `,

      // 2. Action Sheet (Bottom Slide)
      2: `
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm backdrop-anim" id="backdrop" onclick="closePopup('bottom')"></div>
        <div class="absolute bottom-0 inset-x-0 bg-white rounded-t-[2rem] shadow-sheet slide-up-sheet pb-[max(1.5rem,var(--safe-bottom))]" id="modal-content">
          <div class="w-full flex justify-center pt-3 pb-2 shrink-0"><div class="w-12 h-1.5 bg-slate-200 rounded-full"></div></div>
          <div class="px-5 pb-2">
            <h3 class="text-lg font-black text-slate-800 mb-4 px-2">ตัวเลือกหนังสือ</h3>
            <div class="flex flex-col gap-2">
              <button class="pressable bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm rounded-2xl py-4 flex items-center gap-3 px-5 transition-colors" onclick="closePopup('bottom')">
                <i data-lucide="share" class="w-5 h-5 text-slate-400"></i> แชร์ไปยังเพื่อน
              </button>
              <button class="pressable bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-sm rounded-2xl py-4 flex items-center gap-3 px-5 transition-colors" onclick="closePopup('bottom')">
                <i data-lucide="bookmark-plus" class="w-5 h-5 text-slate-400"></i> เพิ่มในรายการโปรด
              </button>
              <button class="pressable bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-sm rounded-2xl py-4 flex items-center gap-3 px-5 transition-colors" onclick="closePopup('bottom')">
                <i data-lucide="flag" class="w-5 h-5 text-rose-400"></i> รายงานปัญหาหนังสือ
              </button>
            </div>
          </div>
        </div>
      `,

      // 3. Full Screen Modal
      3: `
        <div class="absolute inset-0 bg-white slide-up-sheet z-50 flex flex-col" id="modal-content">
          <header class="flex justify-between items-center px-4 py-4 border-b border-slate-100" style="padding-top: max(1rem, var(--safe-top))">
            <h2 class="text-lg font-black text-slate-800 absolute left-1/2 -translate-x-1/2">นโยบายการใช้งาน</h2>
            <div class="w-10"></div>
            <button class="pressable w-8 h-8 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center" onclick="closePopup('bottom')"><i data-lucide="x" class="w-5 h-5"></i></button>
          </header>
          <div class="flex-1 overflow-y-auto p-6 space-y-4">
            <div class="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mb-6"><i data-lucide="file-text" class="w-8 h-8"></i></div>
            <h3 class="font-bold text-slate-800">1. กฎการยืมคืน</h3>
            <p class="text-sm text-slate-500 leading-relaxed">ผู้ใช้สามารถยืมหนังสือได้สูงสุด 5 เล่มต่อครั้ง ระยะเวลาการยืม 7 วัน...</p>
            <h3 class="font-bold text-slate-800 pt-4">2. ค่าปรับ</h3>
            <p class="text-sm text-slate-500 leading-relaxed">กรณีส่งคืนล่าช้า มีค่าปรับ 5 บาท/เล่ม/วัน...</p>
          </div>
          <div class="p-4 border-t border-slate-100 pb-[max(1rem,var(--safe-bottom))]">
            <button class="pressable w-full bg-brand-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-brand-500/30" onclick="closePopup('bottom')">ฉันยอมรับเงื่อนไข</button>
          </div>
        </div>
      `,

      // 4. Top Toast Notification (No backdrop)
      4: `
        <div class="absolute top-[max(1rem,var(--safe-top))] inset-x-4 pointer-events-none" style="z-index: 200;">
          <div class="bg-slate-800 text-white p-4 rounded-2xl shadow-native flex items-center gap-3 slide-down-toast pointer-events-auto" id="modal-content">
            <div class="bg-emerald-500/20 text-emerald-400 p-2 rounded-full shrink-0"><i data-lucide="check" class="w-5 h-5"></i></div>
            <div class="flex-1">
              <h4 class="font-bold text-sm">จองสำเร็จ</h4>
              <p class="text-xs text-slate-300 font-medium">ระบบได้บันทึกคิวของคุณเรียบร้อยแล้ว</p>
            </div>
            <button class="pressable text-slate-400 p-1" onclick="closePopup('top')"><i data-lucide="x" class="w-4 h-4"></i></button>
          </div>
        </div>
      `,

      // 5. Promo / Feature Card
      5: `
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm backdrop-anim" id="backdrop" onclick="closePopup('center')"></div>
        <div class="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
          <div class="bg-white rounded-[2rem] w-full max-w-sm shadow-native pop-center pointer-events-auto overflow-hidden relative" id="modal-content">
            <button class="absolute top-4 right-4 z-10 w-8 h-8 bg-black/20 backdrop-blur-md text-white rounded-full flex items-center justify-center pressable" onclick="closePopup('center')"><i data-lucide="x" class="w-4 h-4"></i></button>
            <div class="w-full h-48 bg-gradient-to-tr from-brand-500 to-indigo-600 flex items-center justify-center text-white relative overflow-hidden">
               <i data-lucide="sparkles" class="w-20 h-20 opacity-20 absolute -right-4 -bottom-4"></i>
               <i data-lucide="tablet-smartphone" class="w-16 h-16 drop-shadow-lg relative z-10"></i>
            </div>
            <div class="p-6 text-center">
              <span class="bg-brand-100 text-brand-700 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded mb-3 inline-block">New Feature</span>
              <h3 class="text-xl font-black text-slate-800 mb-2">ยืม E-Book ได้แล้ววันนี้</h3>
              <p class="text-sm font-medium text-slate-500 mb-6">ห้องสมุดดิจิทัลของเราเปิดให้บริการ E-Book กว่า 10,000 เล่ม โหลดอ่านได้ทันที</p>
              <button class="pressable w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl shadow-lg" onclick="closePopup('center')">ดูแคตตาล็อก E-Book</button>
            </div>
          </div>
        </div>
      `,

      // 6. Input Prompt
      6: `
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm backdrop-anim" id="backdrop" onclick="closePopup('center')"></div>
        <div class="absolute inset-0 flex items-start pt-[20vh] justify-center p-6 pointer-events-none">
          <div class="bg-white rounded-[2rem] w-full max-w-sm shadow-native pop-center pointer-events-auto p-6" id="modal-content">
            <h3 class="text-lg font-black text-slate-800 mb-1">สร้างรายการอ่านใหม่</h3>
            <p class="text-xs font-medium text-slate-500 mb-5">ตั้งชื่อชั้นหนังสือส่วนตัวของคุณ</p>
            
            <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 transition-all">
              <input type="text" placeholder="เช่น หนังสือเตรียมสอบ..." class="bg-transparent w-full outline-none font-bold text-sm text-slate-800" autofocus>
            </div>
            
            <div class="flex gap-3 mt-6">
              <button class="pressable flex-1 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-xl text-sm" onclick="closePopup('center')">ยกเลิก</button>
              <button class="pressable flex-1 bg-brand-600 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-brand-500/30" onclick="closePopup('center')">สร้างรายการ</button>
            </div>
          </div>
        </div>
      `,

      // 7. Bottom Filter Drawer
      7: `
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm backdrop-anim" id="backdrop" onclick="closePopup('bottom')"></div>
        <div class="absolute bottom-0 inset-x-0 bg-white rounded-t-[2rem] shadow-sheet slide-up-sheet pb-[max(1.5rem,var(--safe-bottom))] flex flex-col max-h-[70vh]" id="modal-content">
          <div class="w-full flex justify-center pt-3 pb-2 shrink-0"><div class="w-12 h-1.5 bg-slate-200 rounded-full"></div></div>
          
          <div class="px-5 pb-4 flex justify-between items-center border-b border-slate-100">
            <h3 class="text-lg font-black text-slate-800">ตัวกรอง</h3>
            <button class="text-xs font-bold text-brand-600 pressable">ล้างทั้งหมด</button>
          </div>
          
          <div class="flex-1 overflow-y-auto px-5 py-4 space-y-6">
            <div>
              <h4 class="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">สถานะ</h4>
              <div class="flex flex-wrap gap-2">
                <button class="px-4 py-2 bg-brand-50 text-brand-600 border border-brand-200 rounded-full text-xs font-bold">ว่าง (24)</button>
                <button class="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-full text-xs font-bold">ถูกยืม (12)</button>
              </div>
            </div>
            <div>
              <h4 class="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">ประเภทหนังสือ</h4>
              <div class="flex flex-wrap gap-2">
                <button class="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-full text-xs font-bold">หนังสือเล่ม</button>
                <button class="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-full text-xs font-bold">E-Book</button>
                <button class="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-full text-xs font-bold">วารสาร</button>
              </div>
            </div>
          </div>

          <div class="px-5 pt-2 border-t border-slate-100">
            <button class="pressable w-full bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-lg" onclick="closePopup('bottom')">แสดงผลลัพธ์ (36 รายการ)</button>
          </div>
        </div>
      `,

      // 8. Context Popover
      8: `
        <div class="absolute inset-0 bg-transparent backdrop-anim" id="backdrop" onclick="closePopup('center')"></div>
        <div class="absolute right-6 top-[280px] pointer-events-none" style="z-index: 200;">
          <div class="bg-white rounded-2xl p-2 w-48 shadow-native pop-center pointer-events-auto border border-slate-100 origin-top-right" id="modal-content">
            <button class="pressable w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors text-left" onclick="closePopup('center')">
              <span class="text-sm font-bold text-slate-700">เรียงตาม ก - ฮ</span>
              <i data-lucide="check" class="w-4 h-4 text-brand-500"></i>
            </button>
            <button class="pressable w-full flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors text-left" onclick="closePopup('center')">
              <span class="text-sm font-bold text-slate-500">เพิ่มล่าสุด</span>
            </button>
            <div class="h-px bg-slate-100 my-1 mx-2"></div>
            <button class="pressable w-full flex items-center justify-between p-3 hover:bg-rose-50 text-rose-600 rounded-xl transition-colors text-left" onclick="closePopup('center')">
              <span class="text-sm font-bold">ซ่อนหมวดนี้</span>
              <i data-lucide="eye-off" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      `,

      // 9. Rating & Feedback
      9: `
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm backdrop-anim" id="backdrop" onclick="closePopup('center')"></div>
        <div class="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
          <div class="bg-white rounded-[2rem] w-full max-w-sm shadow-native pop-center pointer-events-auto p-6 flex flex-col items-center text-center" id="modal-content">
            <div class="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-4"><i data-lucide="star" class="w-8 h-8 fill-amber-500"></i></div>
            <h3 class="text-xl font-black text-slate-800 mb-2">ให้คะแนนหนังสือเล่มนี้</h3>
            <p class="text-sm font-medium text-slate-500 mb-6">คุณคิดว่าเนื้อหาในหนังสือเล่มนี้เป็นอย่างไรบ้าง?</p>
            
            <div class="flex gap-2 mb-6">
              <i data-lucide="star" class="w-8 h-8 text-amber-400 fill-amber-400 pressable"></i>
              <i data-lucide="star" class="w-8 h-8 text-amber-400 fill-amber-400 pressable"></i>
              <i data-lucide="star" class="w-8 h-8 text-amber-400 fill-amber-400 pressable"></i>
              <i data-lucide="star" class="w-8 h-8 text-amber-400 fill-amber-400 pressable"></i>
              <i data-lucide="star" class="w-8 h-8 text-slate-200 pressable"></i>
            </div>
            
            <button class="pressable w-full bg-slate-800 text-white font-bold py-4 rounded-xl shadow-lg" onclick="closePopup('center')">ส่งคะแนนประเมิน</button>
            <button class="pressable text-xs font-bold text-slate-400 mt-4" onclick="closePopup('center')">ข้ามไปก่อน</button>
          </div>
        </div>
      `,

      // 10. Destructive Alert
      10: `
        <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm backdrop-anim" id="backdrop" onclick="closePopup('center')"></div>
        <div class="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
          <div class="bg-white rounded-[2rem] w-full max-w-sm shadow-native pop-center pointer-events-auto p-6 flex flex-col items-center text-center shake-anim" id="modal-content">
            <div class="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-4"><i data-lucide="alert-triangle" class="w-8 h-8"></i></div>
            <h3 class="text-xl font-black text-slate-800 mb-2">ลบรายการจอง?</h3>
            <p class="text-sm font-medium text-slate-500 mb-6">คุณแน่ใจหรือไม่ที่จะยกเลิกคิวหนังสือเล่มนี้ การดำเนินการนี้ไม่สามารถย้อนกลับได้</p>
            
            <div class="flex gap-3 w-full">
              <button class="pressable flex-1 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-xl text-sm" onclick="closePopup('center')">ยกเลิก</button>
              <button class="pressable flex-[1.5] bg-rose-500 hover:bg-rose-600 text-white font-bold py-3.5 rounded-xl text-sm shadow-lg shadow-rose-500/30 transition-colors" onclick="closePopup('center')">ยืนยันการลบ</button>
            </div>
          </div>
        </div>
      `
    };

    function openPopup(styleNumber) {
      const popupRoot = document.getElementById('popup-root');
      // 1. Inject HTML
      popupRoot.innerHTML = templates[styleNumber];
      
      // 2. Re-initialize icons
      lucide.createIcons();

      // 3. Show container
      popupRoot.classList.add('active');
    }

    function closePopup(animType) {
      const popupRoot = document.getElementById('popup-root');
      const backdrop = document.getElementById('backdrop');
      const content = document.getElementById('modal-content');
      
      // Play out-animations based on type
      if (backdrop) {
        backdrop.classList.remove('backdrop-anim');
        backdrop.classList.add('backdrop-fade-out');
      }

      if (content) {
        if (animType === 'center') {
          content.classList.remove('pop-center', 'shake-anim');
          content.classList.add('pop-center-out');
        } else if (animType === 'bottom') {
          content.classList.remove('slide-up-sheet');
          content.classList.add('slide-down-sheet');
        } else if (animType === 'top') {
          content.classList.remove('slide-down-toast');
          content.classList.add('slide-up-toast-out');
        }
      }

      // Hide container after animation completes (300ms)
      setTimeout(() => {
        popupRoot.classList.remove('active');
        popupRoot.innerHTML = ''; // clear
      }, 300);
    }
  </script>
</body>
</html>
