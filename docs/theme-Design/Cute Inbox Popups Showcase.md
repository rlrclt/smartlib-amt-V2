<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no">
  <title>Super Cute Inbox Showcase</title>
  
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
              50: '#fdf4ff', 100: '#fae8ff', 200: '#f5d0fe', 300: '#f0abfc',
              500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 900: '#701a75',
            }
          },
          boxShadow: {
            'cute': '0 10px 30px rgba(236, 72, 153, 0.15)',
            'cute-hover': '0 15px 35px rgba(236, 72, 153, 0.25)',
            'sheet': '0 -10px 40px rgba(217, 70, 239, 0.15)',
            'float': '0 8px 30px rgba(217, 70, 239, 0.2)',
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
      background-color: #fdf2f8; 
      -webkit-tap-highlight-color: transparent; 
      overscroll-behavior-y: none; 
    }
    
    .app-container {
      max-width: 480px;
      margin: 0 auto;
      background: linear-gradient(135deg, #fdf4ff, #fff1f2, #eff6ff, #fdf4ff);
      background-size: 400% 400%;
      animation: gradientBG 15s ease infinite;
      height: 100dvh;
      position: relative;
      overflow: hidden;
      box-shadow: 0 0 40px rgba(217, 70, 239, 0.1);
      display: flex;
      flex-direction: column;
    }

    @keyframes gradientBG {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    /* =========================================
       NEW: SUPER CUTE ANIMATIONS! 🎀
       ========================================= */

    /* 1. Jelly Bounce (ปุ่มเยลลี่) */
    .jelly-btn { transition: all 0.2s; cursor: pointer; }
    .jelly-btn:active { animation: jelly 0.5s; }
    @keyframes jelly {
      0% { transform: scale(1, 1); }
      30% { transform: scale(1.15, 0.85); }
      40% { transform: scale(0.85, 1.15); }
      50% { transform: scale(1.05, 0.95); }
      65% { transform: scale(0.95, 1.05); }
      75% { transform: scale(1.02, 0.98); }
      100% { transform: scale(1, 1); }
    }

    /* 2. Wiggle on Hover (ส่ายดุ๊กดิ๊ก) */
    .hover-wiggle:hover { animation: wiggle 0.4s ease-in-out infinite alternate; box-shadow: var(--tw-shadow-cute-hover); z-index: 10; }
    @keyframes wiggle {
      0% { transform: rotate(-2deg) translateY(-2px); }
      100% { transform: rotate(2deg) translateY(-2px); }
    }

    /* 3. Floating Clouds (เมฆลอย) */
    .cloud {
      position: absolute;
      font-size: 2rem;
      opacity: 0.4;
      animation: floatCloud linear infinite;
      pointer-events: none;
      filter: drop-shadow(0 4px 6px rgba(255,255,255,0.8));
    }
    @keyframes floatCloud {
      0% { transform: translateX(-100%) translateY(0); opacity: 0; }
      10% { opacity: 0.6; }
      90% { opacity: 0.6; }
      100% { transform: translateX(120vw) translateY(20px); opacity: 0; }
    }

    /* 4. Heartbeat (หัวใจเต้น) */
    .heartbeat { animation: heartBeat 1.2s ease-in-out infinite; }
    @keyframes heartBeat {
      0%, 100% { transform: scale(1); }
      15% { transform: scale(1.15); }
      30% { transform: scale(1); }
      45% { transform: scale(1.15); }
    }

    /* 5. Shining Star (ดาววิบวับหมุนๆ) */
    .shining-star { animation: shineRotate 3s linear infinite; display: inline-block; }
    @keyframes shineRotate {
      0% { transform: rotate(0deg) scale(0.8); opacity: 0.6; }
      50% { transform: rotate(180deg) scale(1.2); opacity: 1; }
      100% { transform: rotate(360deg) scale(0.8); opacity: 0.6; }
    }

    /* Sparkles */
    .sparkle { position: absolute; border-radius: 50%; background: white; opacity: 0.6; animation: floatSparkle linear infinite; pointer-events: none; }
    @keyframes floatSparkle {
      0% { transform: translateY(0) scale(1) rotate(0deg); opacity: 0; }
      20% { opacity: 0.8; }
      80% { opacity: 0.8; }
      100% { transform: translateY(-100px) scale(1.5) rotate(180deg); opacity: 0; }
    }

    /* Hide Scrollbar */
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    /* =========================================
       NATIVE POPUP ANIMATIONS (Softened)
       ========================================= */
    .backdrop-anim { animation: fadeIn 0.4s ease-out forwards; }
    @keyframes fadeIn { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(4px); } }
    .backdrop-fade-out { animation: fadeOut 0.3s ease-in forwards; }
    @keyframes fadeOut { from { opacity: 1; backdrop-filter: blur(4px); } to { opacity: 0; backdrop-filter: blur(0px); } }

    .pop-center { animation: popSpring 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
    @keyframes popSpring {
      from { opacity: 0; transform: scale(0.5) translateY(40px) rotate(-5deg); }
      to { opacity: 1; transform: scale(1) translateY(0) rotate(0deg); }
    }
    .pop-center-out { animation: popOut 0.3s cubic-bezier(0.36, 0, 0.66, -0.56) forwards; }
    @keyframes popOut {
      from { opacity: 1; transform: scale(1); }
      to { opacity: 0; transform: scale(0.8) translateY(20px); }
    }

    .slide-up-sheet { animation: slideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
    @keyframes slideUp { from { transform: translateY(100%) scale(0.9); } to { transform: translateY(0) scale(1); } }
    .slide-down-sheet { animation: slideDown 0.3s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
    @keyframes slideDown { from { transform: translateY(0); } to { transform: translateY(100%); } }

    .slide-down-top { animation: slideTopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
    @keyframes slideTopIn { from { opacity: 0; transform: translateY(-100%) scale(0.9); } to { opacity: 1; transform: translateY(0) scale(1); } }
    .slide-up-top-out { animation: slideTopOut 0.3s ease-in forwards; }
    @keyframes slideTopOut { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-100%); } }
    
    .expand-fab { transform-origin: bottom right; animation: expandCorner 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
    @keyframes expandCorner {
      from { opacity: 0; transform: scale(0.1) translate(100px, 100px) rotate(15deg); }
      to { opacity: 1; transform: scale(1) translate(0, 0) rotate(0deg); }
    }

    #inbox-root { position: absolute; inset: 0; z-index: 100; display: none; pointer-events: none; }
    #inbox-root.active { display: block; pointer-events: auto; }

  </style>
</head>
<body class="text-slate-700">

  <div class="app-container relative">
    
    <!-- Decorative Floating Background Elements -->
    <div class="sparkle w-3 h-3 top-[10%] left-[20%]" style="animation-duration: 4s; animation-delay: 0s;"></div>
    <div class="sparkle w-4 h-4 top-[30%] right-[15%]" style="animation-duration: 5s; animation-delay: 1s;"></div>
    <div class="sparkle w-2 h-2 top-[60%] left-[10%]" style="animation-duration: 3s; animation-delay: 2s;"></div>
    
    <!-- Floating Clouds -->
    <div class="cloud top-[15%]" style="animation-duration: 25s; font-size: 2.5rem;">☁️</div>
    <div class="cloud top-[45%]" style="animation-duration: 35s; animation-delay: -10s; font-size: 1.5rem; opacity: 0.3;">☁️</div>
    <div class="cloud top-[75%]" style="animation-duration: 20s; animation-delay: -5s; font-size: 3rem;">☁️</div>

    <!-- HEADER -->
    <header class="bg-white/60 backdrop-blur-xl border-b border-pink-100 z-10 px-5 py-4 shrink-0 text-center relative" style="padding-top: max(1rem, var(--safe-top))">
      <div class="absolute right-4 top-4 heartbeat"><i data-lucide="sparkles" class="w-6 h-6 text-pink-400"></i></div>
      <div class="absolute left-4 top-4 hover-wiggle"><i data-lucide="mail-heart" class="w-6 h-6 text-purple-400"></i></div>
      <h1 class="text-xl font-black text-slate-800 tracking-tight bg-gradient-to-r from-pink-500 to-violet-500 text-transparent bg-clip-text">Kawaii Inbox</h1>
      <p class="text-xs text-pink-500 font-bold mt-1">กดปุ่มดุ๊กดิ๊กเพื่อดูแอนิเมชัน 🌸</p>
    </header>

    <!-- LIST OF 10 STYLES -->
    <div class="flex-1 overflow-y-auto hide-scrollbar px-4 py-6 space-y-4 pb-12 relative z-10">
      
      <button class="jelly-btn hover-wiggle w-full bg-white/80 backdrop-blur-sm border-2 border-pink-100 rounded-[2rem] p-4 flex items-center gap-4 shadow-cute" onclick="openInbox(1, 'center')">
        <div class="w-12 h-12 bg-pink-100 text-pink-500 rounded-full flex items-center justify-center shrink-0 heartbeat"><i data-lucide="message-circle-heart" class="w-6 h-6 fill-pink-100"></i></div>
        <div class="text-left"><span class="block text-sm font-black text-slate-800">1. Sweet Message</span><span class="block text-[11px] text-slate-500 font-bold mt-0.5">กล่องตอบข้อความเด้งดึ๋ง 🎀</span></div>
      </button>

      <button class="jelly-btn hover-wiggle w-full bg-white/80 backdrop-blur-sm border-2 border-purple-100 rounded-[2rem] p-4 flex items-center gap-4 shadow-cute" onclick="openInbox(2, 'bottom')">
        <div class="w-12 h-12 bg-purple-100 text-purple-500 rounded-full flex items-center justify-center shrink-0"><i data-lucide="mailbox" class="w-6 h-6 shining-star"></i></div>
        <div class="text-left"><span class="block text-sm font-black text-slate-800">2. Bottom Sheet</span><span class="block text-[11px] text-slate-500 font-bold mt-0.5">ลิ้นชักข้อความน่ารักๆ ดึงจากข้างล่าง 🐰</span></div>
      </button>

      <button class="jelly-btn hover-wiggle w-full bg-white/80 backdrop-blur-sm border-2 border-sky-100 rounded-[2rem] p-4 flex items-center gap-4 shadow-cute" onclick="openInbox(3, 'top')">
        <div class="w-12 h-12 bg-sky-100 text-sky-500 rounded-full flex items-center justify-center shrink-0 hover-wiggle"><i data-lucide="paperclip" class="w-6 h-6"></i></div>
        <div class="text-left"><span class="block text-sm font-black text-slate-800">3. Cloud Quick Reply</span><span class="block text-[11px] text-slate-500 font-bold mt-0.5">ข้อความลอยจากด้านบนเหมือนก้อนเมฆ ☁️</span></div>
      </button>

      <button class="jelly-btn hover-wiggle w-full bg-white/80 backdrop-blur-sm border-2 border-fuchsia-100 rounded-[2rem] p-4 flex items-center gap-4 shadow-cute" onclick="openInbox(4, 'fab')">
        <div class="w-12 h-12 bg-fuchsia-100 text-fuchsia-500 rounded-full flex items-center justify-center shrink-0 heartbeat"><i data-lucide="wand-2" class="w-6 h-6 fill-fuchsia-50"></i></div>
        <div class="text-left"><span class="block text-sm font-black text-slate-800">4. Magic Floating Menu</span><span class="block text-[11px] text-slate-500 font-bold mt-0.5">เมนูเวทมนตร์ ขยายจากมุมขวาล่าง 🪄</span></div>
      </button>

      <button class="jelly-btn hover-wiggle w-full bg-white/80 backdrop-blur-sm border-2 border-amber-100 rounded-[2rem] p-4 flex items-center gap-4 shadow-cute" onclick="openInbox(5, 'center')">
        <div class="w-12 h-12 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center shrink-0"><i data-lucide="party-popper" class="w-6 h-6 fill-amber-50 hover-wiggle"></i></div>
        <div class="text-left"><span class="block text-sm font-black text-slate-800">5. Kawaii Announcement</span><span class="block text-[11px] text-slate-500 font-bold mt-0.5">ประกาศแสนซน พร้อมกราฟิกป๊อปอัป 🎉</span></div>
      </button>

      <button class="jelly-btn hover-wiggle w-full bg-white/80 backdrop-blur-sm border-2 border-rose-100 rounded-[2rem] p-4 flex items-center gap-4 shadow-cute" onclick="openInbox(6, 'center')">
        <div class="w-12 h-12 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center shrink-0 heartbeat"><i data-lucide="layers" class="w-6 h-6"></i></div>
        <div class="text-left"><span class="block text-sm font-black text-slate-800">6. Stacked Postcards</span><span class="block text-[11px] text-slate-500 font-bold mt-0.5">การ์ดข้อความซ้อนกันแบบโปสการ์ด 💌</span></div>
      </button>

      <button class="jelly-btn hover-wiggle w-full bg-white/80 backdrop-blur-sm border-2 border-teal-100 rounded-[2rem] p-4 flex items-center gap-4 shadow-cute" onclick="openInbox(7, 'top')">
        <div class="w-12 h-12 bg-teal-100 text-teal-500 rounded-full flex items-center justify-center shrink-0"><i data-lucide="smile" class="w-6 h-6 fill-teal-50 shining-star"></i></div>
        <div class="text-left"><span class="block text-sm font-black text-slate-800">7. Happy Dropdown</span><span class="block text-[11px] text-slate-500 font-bold mt-0.5">ศูนย์แจ้งเตือนสีสันสดใส เลื่อนจากบน 🍭</span></div>
      </button>

      <button class="jelly-btn hover-wiggle w-full bg-white/80 backdrop-blur-sm border-2 border-emerald-100 rounded-[2rem] p-4 flex items-center gap-4 shadow-cute" onclick="openInbox(8, 'bottom')">
        <div class="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shrink-0 hover-wiggle"><i data-lucide="bot" class="w-6 h-6"></i></div>
        <div class="text-left"><span class="block text-sm font-black text-slate-800">8. Buddy Chat Modal</span><span class="block text-[11px] text-slate-500 font-bold mt-0.5">บับเบิลแชทสุดคิวท์ คุยกับน้องบอท 🧸</span></div>
      </button>

      <button class="jelly-btn hover-wiggle w-full bg-white/80 backdrop-blur-sm border-2 border-indigo-100 rounded-[2rem] p-4 flex items-center gap-4 shadow-cute" onclick="openInbox(9, 'top')">
        <div class="w-12 h-12 bg-indigo-100 text-indigo-500 rounded-full flex items-center justify-center shrink-0 heartbeat"><i data-lucide="sparkles" class="w-6 h-6"></i></div>
        <div class="text-left"><span class="block text-sm font-black text-slate-800">9. Filter Popover</span><span class="block text-[11px] text-slate-500 font-bold mt-0.5">เมนูลอยน่ารักๆ สำหรับกรองข้อความ 🔮</span></div>
      </button>

      <button class="jelly-btn hover-wiggle w-full bg-white/80 backdrop-blur-sm border-2 border-pink-200 rounded-[2rem] p-4 flex items-center gap-4 shadow-cute" onclick="openInbox(10, 'center')">
        <div class="w-12 h-12 bg-gradient-to-tr from-pink-400 to-purple-400 text-white rounded-full flex items-center justify-center shrink-0 heartbeat"><i data-lucide="heart" class="w-6 h-6 fill-white/50"></i></div>
        <div class="text-left"><span class="block text-sm font-black text-slate-800">10. Inbox Zero (Happy Mode)</span><span class="block text-[11px] text-slate-500 font-bold mt-0.5">อ่านครบแล้ว! รับพลังบวกไปเลย 💖</span></div>
      </button>

    </div>

    <!-- THE INBOX ROOT CONTAINER -->
    <div id="inbox-root">
      <!-- Injected HTML will go here -->
    </div>

  </div> <!-- End App -->

  <script>
    lucide.createIcons();

    // =========================================
    // SUPER CUTE INBOX POPUP TEMPLATES 🎀
    // =========================================
    const templates = {
      
      // 1. Direct Message Modal (Pink/Soft)
      1: `
        <div class="absolute inset-0 bg-pink-900/20 backdrop-blur-md backdrop-anim" id="backdrop" onclick="closeInbox('center')"></div>
        <div class="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
          <div class="bg-white rounded-[2.5rem] w-full max-w-sm shadow-cute pop-center pointer-events-auto flex flex-col overflow-hidden border-4 border-pink-50 relative" id="modal-content">
            <div class="absolute -right-4 -top-4 w-20 h-20 bg-pink-100 rounded-full blur-xl pointer-events-none"></div>
            <div class="absolute top-2 right-6 shining-star"><i data-lucide="sparkle" class="w-6 h-6 text-pink-300 fill-pink-300"></i></div>
            <div class="p-6 flex items-start gap-4 border-b border-pink-50 bg-white/80 backdrop-blur-sm z-10 relative">
              <div class="relative hover-wiggle">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Lily&backgroundColor=fbcfe8" class="w-14 h-14 rounded-full border-4 border-white shadow-sm shrink-0" alt="avatar">
                <div class="absolute bottom-0 right-0 w-4 h-4 bg-green-400 border-2 border-white rounded-full"></div>
              </div>
              <div class="pt-1">
                <h3 class="font-black text-slate-800 text-[15px] flex items-center gap-1">น้องลิลลี่ (ห้องสมุด) <i data-lucide="sparkles" class="w-3 h-3 text-pink-400"></i></h3>
                <p class="text-xs font-semibold text-slate-500 mt-1 leading-relaxed">หนังสือที่จองไว้ มาถึงแล้วน้า~ มารับได้เลยจ้า 🎀</p>
                <p class="text-[10px] text-pink-400 font-bold mt-2 bg-pink-50 w-max px-2 py-0.5 rounded-full">เพิ่งส่งเมื่อกี้</p>
              </div>
            </div>
            <div class="p-5 flex gap-3 items-center bg-slate-50/50">
              <input type="text" placeholder="พิมพ์ข้อความตอบกลับ..." class="bg-white border-2 border-pink-100 focus:border-pink-400 rounded-full px-5 py-3 text-sm font-bold outline-none flex-1 transition-all shadow-inner text-slate-700 placeholder:font-medium placeholder:text-slate-300">
              <button class="jelly-btn hover-wiggle w-12 h-12 bg-gradient-to-tr from-pink-400 to-purple-400 text-white rounded-full flex items-center justify-center shrink-0 shadow-cute" onclick="closeInbox('center')"><i data-lucide="send" class="w-5 h-5 ml-1"></i></button>
            </div>
          </div>
        </div>
      `,

      // 2. Bottom Inbox Sheet (Purple Theme)
      2: `
        <div class="absolute inset-0 bg-purple-900/20 backdrop-blur-md backdrop-anim" id="backdrop" onclick="closeInbox('bottom')"></div>
        <div class="absolute bottom-0 inset-x-0 bg-white rounded-t-[3rem] shadow-sheet slide-up-sheet pb-[max(1.5rem,var(--safe-bottom))] flex flex-col max-h-[85vh] border-t-4 border-purple-50" id="modal-content">
          <div class="w-full flex justify-center pt-4 pb-2 shrink-0"><div class="w-16 h-2 bg-purple-100 rounded-full"></div></div>
          
          <div class="px-6 pb-4 pt-2 flex justify-between items-center border-b border-purple-50 shrink-0 relative">
            <h3 class="text-xl font-black text-purple-900 flex items-center gap-2"><i data-lucide="mailbox" class="w-6 h-6 text-purple-400 hover-wiggle"></i> กล่องจดหมาย</h3>
            <button class="jelly-btn w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center hover-wiggle transition-transform" onclick="closeInbox('bottom')"><i data-lucide="x" class="w-5 h-5"></i></button>
          </div>
          
          <div class="flex-1 overflow-y-auto hide-scrollbar px-4 py-3 space-y-3">
            <!-- Unread Message -->
            <button class="jelly-btn hover-wiggle w-full flex items-start gap-4 p-4 bg-purple-50/60 rounded-[1.5rem] border border-purple-100 transition-colors text-left relative overflow-hidden group">
              <span class="absolute top-6 left-3 w-3 h-3 bg-purple-500 rounded-full border-2 border-white heartbeat"></span>
              <div class="w-12 h-12 rounded-full bg-white text-purple-500 flex items-center justify-center shrink-0 ml-3 shadow-sm group-hover:rotate-12 transition-transform"><i data-lucide="bell-ring" class="w-6 h-6"></i></div>
              <div class="flex-1 min-w-0 pt-0.5">
                <div class="flex justify-between items-start mb-1">
                  <h4 class="text-[14px] font-black text-purple-900 truncate">คุณระบบสุดหล่อ</h4>
                  <span class="text-[10px] font-black bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full">10:45</span>
                </div>
                <p class="text-xs font-semibold text-purple-600/80 line-clamp-2 leading-relaxed">ประกาศวันหยุดจ้า ห้องสมุดจะปิดในวันที่ 12 นี้นะ พักผ่อนกันให้เต็มที่เลย~</p>
              </div>
            </button>

            <!-- Read Message -->
            <button class="jelly-btn hover-wiggle w-full flex items-start gap-4 p-4 hover:bg-slate-50 rounded-[1.5rem] border border-transparent hover:border-slate-100 transition-colors text-left group">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Mimi&backgroundColor=f1f5f9" class="w-12 h-12 rounded-full bg-white border-2 border-slate-100 shrink-0 ml-3 group-hover:rotate-12 transition-transform" alt="avatar">
              <div class="flex-1 min-w-0 pt-0.5">
                <div class="flex justify-between items-start mb-1">
                  <h4 class="text-[14px] font-bold text-slate-700 truncate">พี่บรรณารักษ์ใจดี</h4>
                  <span class="text-[10px] font-bold text-slate-400">เมื่อวาน</span>
                </div>
                <p class="text-xs font-medium text-slate-500 line-clamp-2 leading-relaxed">ค่าปรับชำระเรียบร้อยแล้วนะคะ ขอบคุณมากค่ะ โอกาสหน้ามาใช้บริการใหม่น้า</p>
              </div>
            </button>
          </div>
        </div>
      `,

      // 3. Cloud Quick Reply (Slide Top)
      3: `
        <div class="absolute inset-0 bg-transparent backdrop-anim" id="backdrop" onclick="closeInbox('top')"></div>
        <div class="absolute top-[max(1rem,var(--safe-top))] inset-x-4 z-[200] pointer-events-none">
          <div class="bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-float border-2 border-sky-100 slide-down-top pointer-events-auto overflow-hidden relative" id="modal-content">
            <!-- Decorative Cloud -->
            <div class="absolute -top-4 -right-4 text-sky-100" style="font-size: 5rem; z-index:-1;">☁️</div>
            <div class="p-5 flex gap-4 pb-4">
              <div class="relative hover-wiggle">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Buddy&backgroundColor=e0f2fe" class="w-12 h-12 rounded-full border-2 border-white shadow-sm shrink-0" alt="avatar">
              </div>
              <div class="flex-1">
                <div class="flex justify-between items-center">
                  <h4 class="text-[14px] font-black text-sky-900 flex items-center gap-1">แอดมินบับเบิล <i data-lucide="cloud" class="w-3.5 h-3.5 text-sky-400 hover-wiggle"></i></h4>
                  <span class="text-[10px] font-black text-sky-400 bg-sky-50 px-2 py-0.5 rounded-full heartbeat">NOW</span>
                </div>
                <p class="text-[12px] font-bold text-slate-600 mt-1.5 leading-relaxed">ของที่ลืมไว้ มารับได้ที่หน้าเคาน์เตอร์เลยน้า เก็บไว้ให้แล้วจ้า 🌟</p>
              </div>
            </div>
            <div class="px-4 pb-4">
              <div class="flex items-center gap-2 bg-sky-50/50 rounded-full p-2 border border-sky-100 focus-within:border-sky-300 transition-colors">
                <input type="text" placeholder="ส่งข้อความไปหาแอดมิน..." class="bg-transparent border-none focus:ring-0 text-[13px] font-bold text-sky-800 w-full px-3 outline-none placeholder:text-sky-300">
                <button class="jelly-btn w-10 h-10 rounded-full bg-sky-400 text-white flex items-center justify-center shrink-0 shadow-sm" onclick="closeInbox('top')"><i data-lucide="send" class="w-4 h-4 ml-0.5"></i></button>
              </div>
            </div>
          </div>
        </div>
      `,

      // 4. Floating Widget FAB
      4: `
        <div class="absolute inset-0 bg-fuchsia-900/10 backdrop-anim" id="backdrop" onclick="closeInbox('fab')"></div>
        <div class="absolute bottom-[max(5rem,var(--safe-bottom))] right-5 z-[200] pointer-events-none">
          <div class="bg-white/90 backdrop-blur-xl rounded-[2rem] w-64 shadow-float border-2 border-fuchsia-100 p-2 pointer-events-auto expand-fab flex flex-col gap-1.5" id="modal-content">
            <button class="jelly-btn w-full flex items-center justify-between p-3.5 hover:bg-fuchsia-50 rounded-2xl transition-colors text-left group" onclick="closeInbox('fab')">
              <span class="text-sm font-black text-slate-700 flex items-center gap-2"><i data-lucide="feather" class="w-4 h-4 text-fuchsia-500 group-hover:rotate-12 transition-transform"></i> เขียนข้อความ</span>
            </button>
            <div class="h-px bg-fuchsia-50 mx-4 my-0.5"></div>
            <button class="jelly-btn w-full flex items-center justify-between p-3.5 hover:bg-fuchsia-50 rounded-2xl transition-colors text-left group" onclick="closeInbox('fab')">
              <span class="text-sm font-bold text-slate-600 flex items-center gap-2"><i data-lucide="check-circle-2" class="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform"></i> อ่านครบแล้ว</span>
            </button>
            <button class="jelly-btn w-full flex items-center justify-between p-3.5 hover:bg-rose-50 rounded-2xl transition-colors text-left group" onclick="closeInbox('fab')">
              <span class="text-sm font-bold text-rose-500 flex items-center gap-2"><i data-lucide="trash-2" class="w-4 h-4 text-rose-400 group-hover:rotate-12 transition-transform"></i> ลบทิ้งให้หมด</span>
            </button>
          </div>
        </div>
      `,

      // 5. Kawaii Announcement (Center)
      5: `
        <div class="absolute inset-0 bg-slate-900/30 backdrop-blur-sm backdrop-anim" id="backdrop" onclick="closeInbox('center')"></div>
        <div class="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
          <div class="bg-white rounded-[2.5rem] w-full max-w-sm shadow-cute pop-center pointer-events-auto overflow-hidden text-center relative border-4 border-amber-50" id="modal-content">
            <button class="jelly-btn absolute top-4 right-4 z-10 w-8 h-8 bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center hover-wiggle" onclick="closeInbox('center')"><i data-lucide="x" class="w-4 h-4"></i></button>
            <div class="h-44 bg-gradient-to-br from-amber-200 via-orange-300 to-rose-300 flex items-center justify-center relative overflow-hidden">
              <div class="absolute inset-0 opacity-30 bg-[radial-gradient(circle,white_2px,transparent_2px)] bg-[length:16px_16px]"></div>
              <i data-lucide="party-popper" class="w-20 h-20 text-white drop-shadow-md heartbeat fill-white/20 relative z-10"></i>
            </div>
            <div class="p-8">
              <span class="bg-amber-100 text-amber-600 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full mb-4 inline-block shining-star">Surprise! ✨</span>
              <h3 class="text-2xl font-black text-slate-800 mb-3">อัปเดตใหม่มาแล้ว!</h3>
              <p class="text-sm font-medium text-slate-500 mb-8 leading-relaxed">กล่องข้อความโฉมใหม่ น่ารักขึ้น ใช้งานง่ายขึ้น มาร่วมสนุกไปกับพวกเราสิ!</p>
              <button class="jelly-btn w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-orange-500/30 hover-wiggle" onclick="closeInbox('center')">Let's Go!</button>
            </div>
          </div>
        </div>
      `,

      // 6. Stacked Postcards (Center)
      6: `
        <div class="absolute inset-0 bg-slate-900/30 backdrop-blur-sm backdrop-anim" id="backdrop" onclick="closeInbox('center')"></div>
        <div class="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
          <div class="relative w-full max-w-sm pop-center pointer-events-auto h-56" id="modal-content">
            <!-- Background Card 2 -->
            <div class="absolute inset-x-8 bottom-0 h-12 bg-pink-200 rounded-[2rem] shadow-sm transform translate-y-6 rotate-3"></div>
            <!-- Background Card 1 -->
            <div class="absolute inset-x-4 bottom-0 h-12 bg-rose-100 rounded-[2rem] shadow-sm transform translate-y-3 -rotate-2"></div>
            
            <!-- Main Top Card -->
            <div class="jelly-btn absolute inset-0 bg-white rounded-[2rem] shadow-float p-6 border-2 border-rose-50 flex flex-col justify-between" onclick="closeInbox('center')">
              <div class="flex items-start gap-4">
                <div class="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 shrink-0 hover-wiggle"><i data-lucide="mail-heart" class="w-6 h-6 fill-rose-100"></i></div>
                <div>
                  <h3 class="font-black text-slate-800 text-[15px]">จดหมายจากระบบ 💌 (1/3)</h3>
                  <p class="text-[13px] font-bold text-slate-500 mt-1.5 leading-relaxed">หนังสือที่ใกล้ถึงกำหนดคืน มี 1 เล่มนะ อย่าลืมเอามาคืนน้า~</p>
                </div>
              </div>
              <div class="flex justify-between items-center mt-4 pt-4 border-t border-slate-50">
                <span class="text-[11px] font-black text-slate-300">กดเพื่อดูใบถัดไป <i data-lucide="arrow-right" class="w-3 h-3 inline"></i></span>
                <button class="bg-rose-500 text-white px-4 py-2 rounded-full font-black text-[11px] shadow-sm hover-wiggle">ดูรายละเอียด</button>
              </div>
            </div>
          </div>
        </div>
      `,

      // 7. Happy Dropdown (Top Slide Half-sheet)
      7: `
        <div class="absolute inset-0 bg-slate-900/20 backdrop-blur-sm backdrop-anim" id="backdrop" onclick="closeInbox('top')"></div>
        <div class="absolute top-0 inset-x-0 bg-white/90 backdrop-blur-xl rounded-b-[2.5rem] shadow-sheet slide-down-top pt-[max(1.5rem,var(--safe-top))] pb-5 flex flex-col max-h-[65vh] border-b-4 border-teal-50" id="modal-content">
          <div class="px-6 pb-4 flex justify-between items-center shrink-0">
            <h3 class="text-xl font-black text-slate-800 flex items-center gap-2"><i data-lucide="bell-ring" class="w-6 h-6 text-teal-400 hover-wiggle"></i> แจ้งเตือน</h3>
            <button class="jelly-btn bg-teal-50 text-teal-600 px-3 py-1.5 rounded-full text-[10px] font-black">อ่านหมดแล้ว</button>
          </div>
          <div class="flex-1 overflow-y-auto hide-scrollbar px-4 py-2 space-y-2">
            <button class="jelly-btn w-full p-4 hover:bg-slate-50 rounded-[1.5rem] border border-transparent hover:border-slate-100 transition-colors text-left flex gap-4 group" onclick="closeInbox('top')">
              <div class="bg-rose-50 text-rose-500 p-3 rounded-full shrink-0 h-min group-hover:scale-110 transition-transform"><i data-lucide="alert-triangle" class="w-5 h-5 fill-rose-100"></i></div>
              <div class="pt-1">
                <p class="text-[14px] font-black text-slate-800">ค่าปรับค้างชำระ แง 💸</p>
                <p class="text-xs font-semibold text-slate-500 mt-1 leading-relaxed">มียอดค้างชำระ 15 บาทน้า แวะมาจ่ายที่เคาน์เตอร์ได้เลย</p>
              </div>
            </button>
            <button class="jelly-btn w-full p-4 hover:bg-slate-50 rounded-[1.5rem] border border-transparent hover:border-slate-100 transition-colors text-left flex gap-4 group" onclick="closeInbox('top')">
              <div class="bg-teal-50 text-teal-500 p-3 rounded-full shrink-0 h-min group-hover:scale-110 transition-transform"><i data-lucide="check-circle-2" class="w-5 h-5 fill-teal-100"></i></div>
              <div class="pt-1">
                <p class="text-[14px] font-black text-slate-800">คืนหนังสือเรียบร้อย! ✨</p>
                <p class="text-xs font-semibold text-slate-500 mt-1 leading-relaxed">ได้รับ Sapiens คืนแล้วจ้า ขอบคุณที่ดูแลหนังสืออย่างดีนะ</p>
              </div>
            </button>
          </div>
          <div class="w-full flex justify-center pt-4 shrink-0"><div class="w-12 h-1.5 bg-slate-200 rounded-full"></div></div>
        </div>
      `,

      // 8. Buddy Chat Modal (Bottom Sheet Large)
      8: `
        <div class="absolute inset-0 bg-emerald-900/20 backdrop-blur-sm backdrop-anim" id="backdrop" onclick="closeInbox('bottom')"></div>
        <div class="absolute bottom-0 inset-x-0 bg-slate-50 rounded-t-[3rem] shadow-sheet slide-up-sheet flex flex-col h-[85vh] border-t-4 border-emerald-100" id="modal-content">
          <!-- Header -->
          <div class="bg-white/90 backdrop-blur-md px-6 py-4 rounded-t-[3rem] flex justify-between items-center shadow-sm shrink-0 z-10">
            <div class="flex items-center gap-3">
              <div class="relative hover-wiggle">
                <div class="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 border-2 border-white shadow-sm"><i data-lucide="bot" class="w-6 h-6"></i></div>
                <span class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 border-2 border-white rounded-full heartbeat"></span>
              </div>
              <div>
                <h3 class="text-[15px] font-black text-slate-800 leading-none mb-1">น้องบอท (ผู้ช่วย) 🤖</h3>
                <span class="text-[10px] font-black text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full">พร้อมคุยจ้า</span>
              </div>
            </div>
            <button class="jelly-btn w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center" onclick="closeInbox('bottom')"><i data-lucide="chevron-down" class="w-5 h-5"></i></button>
          </div>
          
          <!-- Chat Area -->
          <div class="flex-1 overflow-y-auto px-5 py-6 space-y-5">
            <div class="flex justify-center"><span class="text-[10px] font-black text-slate-400 bg-slate-200/50 px-3 py-1.5 rounded-full">วันนี้ 10:00 น.</span></div>
            <!-- Other Bubble -->
            <div class="flex items-end gap-3 pr-12">
              <div class="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shrink-0"><i data-lucide="bot" class="w-4 h-4"></i></div>
              <div class="bg-white border-2 border-emerald-50 px-4 py-3 rounded-[1.5rem] rounded-bl-md text-[13px] font-bold text-slate-700 shadow-sm hover-wiggle">
                สวัสดีฮะ! มีอะไรให้น้องบอทช่วยหาไหมเอ่ย? 🔍
              </div>
            </div>
            <!-- My Bubble -->
            <div class="flex items-end justify-end gap-3 pl-12">
              <div class="bg-gradient-to-tr from-emerald-400 to-teal-400 text-white px-4 py-3 rounded-[1.5rem] rounded-br-md text-[13px] font-bold shadow-md hover-wiggle">
                ช่วยหานิยายแฟนตาซีแนะนำหน่อยสิ ✨
              </div>
            </div>
          </div>

          <!-- Input Area -->
          <div class="bg-white p-4 border-t border-slate-100 pb-[max(1.5rem,var(--safe-bottom))] shrink-0 flex gap-3 items-end rounded-t-3xl shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
            <button class="jelly-btn p-3 text-slate-400 bg-slate-50 rounded-full hover:bg-slate-100"><i data-lucide="smile-plus" class="w-6 h-6"></i></button>
            <div class="flex-1 bg-slate-50 border-2 border-slate-100 rounded-[2rem] px-5 py-3 min-h-[50px] flex items-center focus-within:border-emerald-200 transition-colors">
              <input type="text" placeholder="พิมพ์ข้อความ..." class="bg-transparent w-full outline-none text-[14px] font-bold text-slate-700 placeholder:text-slate-400">
            </div>
            <button class="jelly-btn w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center shrink-0 shadow-md hover-wiggle" onclick="closeInbox('bottom')"><i data-lucide="send-horiz" class="w-5 h-5 ml-0.5"></i></button>
          </div>
        </div>
      `,

      // 9. Filter Popover (Magic Indigo)
      9: `
        <div class="absolute inset-0 bg-transparent backdrop-anim" id="backdrop" onclick="closeInbox('top')"></div>
        <div class="absolute top-[max(4.5rem,var(--safe-top))] right-5 z-[200] pointer-events-none">
          <div class="bg-white/90 backdrop-blur-xl rounded-3xl w-56 shadow-float border-2 border-indigo-50 p-2 pointer-events-auto slide-down-top origin-top-right" id="modal-content">
            <button class="jelly-btn w-full flex items-center justify-between p-3.5 bg-indigo-50/50 rounded-2xl transition-colors text-left" onclick="closeInbox('top')">
              <span class="text-sm font-black text-indigo-700 flex items-center gap-2"><i data-lucide="sparkles" class="w-4 h-4 hover-wiggle"></i> เวทมนตร์ทั้งหมด</span>
              <i data-lucide="check" class="w-4 h-4 text-indigo-500"></i>
            </button>
            <button class="jelly-btn w-full flex items-center justify-between p-3.5 hover:bg-slate-50 rounded-2xl transition-colors text-left mt-1 group" onclick="closeInbox('top')">
              <span class="text-sm font-bold text-slate-600 flex items-center gap-2"><i data-lucide="mail-warning" class="w-4 h-4 text-slate-400 group-hover:text-indigo-400"></i> ยังไม่อ่าน (2)</span>
            </button>
            <button class="jelly-btn w-full flex items-center justify-between p-3.5 hover:bg-slate-50 rounded-2xl transition-colors text-left mt-1 group" onclick="closeInbox('top')">
              <span class="text-sm font-bold text-slate-600 flex items-center gap-2"><i data-lucide="star" class="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform"></i> ติดดาวไว้</span>
            </button>
          </div>
        </div>
      `,

      // 10. Inbox Zero (Happy Mode)
      10: `
        <div class="absolute inset-0 bg-pink-900/20 backdrop-blur-md backdrop-anim" id="backdrop" onclick="closeInbox('center')"></div>
        <div class="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
          <div class="bg-white rounded-[2.5rem] w-full max-w-sm shadow-cute pop-center pointer-events-auto p-8 flex flex-col items-center text-center border-4 border-pink-50 relative overflow-hidden" id="modal-content">
            <div class="absolute -left-6 -top-6 w-24 h-24 bg-gradient-to-br from-pink-100 to-purple-100 rounded-full blur-xl pointer-events-none"></div>
            <div class="absolute -right-6 -bottom-6 w-24 h-24 bg-gradient-to-tl from-sky-100 to-teal-100 rounded-full blur-xl pointer-events-none"></div>
            
            <div class="w-24 h-24 bg-gradient-to-tr from-pink-300 to-purple-400 text-white rounded-full flex items-center justify-center mb-6 shadow-lg hover-wiggle relative z-10 heartbeat">
               <i data-lucide="heart-handshake" class="w-12 h-12 fill-white/20"></i>
            </div>
            <h3 class="text-2xl font-black text-slate-800 mb-2 relative z-10">Inbox Zero! 💖</h3>
            <p class="text-[13px] font-bold text-slate-500 mb-8 leading-relaxed relative z-10">เก่งมาก! คุณจัดการข้อความทั้งหมดเรียบร้อยแล้ว รับพลังบวกไปเต็มๆ เลยยย~ ✨</p>
            <button class="jelly-btn hover-wiggle w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-lg relative z-10" onclick="closeInbox('center')">เยี่ยมไปเลย!</button>
          </div>
        </div>
      `
    };

    const inboxRoot = document.getElementById('inbox-root');

    function openInbox(styleNumber, animType) {
      inboxRoot.setAttribute('data-anim-type', animType);
      inboxRoot.innerHTML = templates[styleNumber];
      lucide.createIcons();
      inboxRoot.classList.add('active');
    }

    function closeInbox(forcedAnimType = null) {
      const animType = forcedAnimType || inboxRoot.getAttribute('data-anim-type');
      const backdrop = document.getElementById('backdrop');
      const content = document.getElementById('modal-content');
      
      if (backdrop) {
        backdrop.classList.remove('backdrop-anim');
        backdrop.classList.add('backdrop-fade-out');
      }

      if (content) {
        if (animType === 'center') {
          content.classList.remove('pop-center');
          content.classList.add('pop-center-out');
        } else if (animType === 'bottom') {
          content.classList.remove('slide-up-sheet');
          content.classList.add('slide-down-sheet');
        } else if (animType === 'top') {
          content.classList.remove('slide-down-top');
          content.classList.add('slide-up-top-out');
        } else if (animType === 'fab') {
          content.style.transition = 'opacity 0.2s, transform 0.2s';
          content.style.opacity = '0';
          content.style.transform = 'scale(0.8) translate(20px, 20px)';
        }
      }

      setTimeout(() => {
        inboxRoot.classList.remove('active');
        inboxRoot.innerHTML = ''; 
        inboxRoot.removeAttribute('data-anim-type');
      }, 300); // Wait for CSS transition
    }
  </script>
</body>
</html>
