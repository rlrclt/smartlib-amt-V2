<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no">
  <title>Splash Screens - Native App</title>
  
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
          }
        }
      }
    }
  </script>

  <style>
    body { background-color: #F1F5F9; -webkit-tap-highlight-color: transparent; }
    
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
      transition: transform 0.1s ease, opacity 0.1s ease;
      cursor: pointer;
    }
    .pressable:active { transform: scale(0.94); opacity: 0.8; }

    /* =========================================
       SPLASH SCREEN OVERLAY SYSTEM
       ========================================= */
    #splash-overlay {
      position: absolute; inset: 0; z-index: 100;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      opacity: 0; pointer-events: none;
      transition: opacity 0.4s ease-out, transform 0.4s ease-out;
    }
    #splash-overlay.active {
      opacity: 1; pointer-events: auto;
    }
    #splash-overlay.fade-out {
      opacity: 0; transform: scale(1.05); pointer-events: none;
    }

    /* =========================================
       CUSTOM KEYFRAMES FOR 10 STYLES
       ========================================= */
    
    /* 1. Classic Pulse */
    @keyframes smoothPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15); }
    }
    .anim-smooth-pulse { animation: smoothPulse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite; }

    /* 2. 3D Book Flip */
    @keyframes flip3D {
      0% { transform: perspective(400px) rotateY(0deg); }
      100% { transform: perspective(400px) rotateY(360deg); }
    }
    .anim-flip-3d { animation: flip3D 1.5s ease-in-out infinite; }

    /* 4. Typewriter */
    @keyframes typeWriter {
      from { width: 0; }
      to { width: 100%; }
    }
    @keyframes blinkTextCursor {
      from { border-right-color: rgba(255,255,255,0.8); }
      to { border-right-color: transparent; }
    }
    .anim-typewriter {
      overflow: hidden; white-space: nowrap; border-right: 3px solid white;
      animation: typeWriter 1.5s steps(20, end) forwards, blinkTextCursor 0.5s step-end infinite;
    }

    /* 5. Morphing Blob */
    @keyframes morphing {
      0% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; }
      34% { border-radius: 70% 30% 50% 50% / 30% 30% 70% 70%; }
      67% { border-radius: 100% 60% 60% 100% / 100% 100% 60% 60%; }
      100% { border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%; }
    }
    .anim-morph { animation: morphing 3s ease-in-out infinite; }

    /* 6. Shimmer Mask */
    @keyframes shimmer-sweep {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    .anim-shimmer-text {
      background: linear-gradient(90deg, #0284C7 20%, #7DD3FC 50%, #0284C7 80%);
      background-size: 200% auto;
      color: transparent;
      -webkit-background-clip: text;
      background-clip: text;
      animation: shimmer-sweep 2s linear infinite;
    }

    /* 7. Radar Ping */
    @keyframes radarPing {
      0% { transform: scale(0.8); opacity: 0.8; }
      100% { transform: scale(3); opacity: 0; }
    }
    .anim-radar-1 { animation: radarPing 2s cubic-bezier(0, 0, 0.2, 1) infinite; }
    .anim-radar-2 { animation: radarPing 2s cubic-bezier(0, 0, 0.2, 1) 1s infinite; }

    /* 8. Progress Bar Fill */
    @keyframes fillProgress {
      0% { width: 0%; }
      100% { width: 100%; }
    }
    .anim-progress-fill { animation: fillProgress 2.5s cubic-bezier(0.4, 0, 0.2, 1) forwards; }

    /* 9. Float/Hover */
    @keyframes floatBox {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-15px); }
    }
    .anim-float { animation: floatBox 3s ease-in-out infinite; }

    /* 10. Bouncing Dots */
    @keyframes bounceDots {
      0%, 100% { transform: translateY(0); opacity: 0.5; }
      50% { transform: translateY(-8px); opacity: 1; }
    }
    .anim-dot-1 { animation: bounceDots 1s ease-in-out infinite 0s; }
    .anim-dot-2 { animation: bounceDots 1s ease-in-out infinite 0.2s; }
    .anim-dot-3 { animation: bounceDots 1s ease-in-out infinite 0.4s; }

  </style>
</head>
<body class="text-slate-800">

  <div class="app-container">
    
    <!-- HEADER -->
    <header class="bg-white/90 backdrop-blur-xl border-b border-slate-200 z-10 px-4 py-4 shrink-0 text-center">
      <h1 class="text-lg font-black text-slate-800 tracking-tight">Splash Screen Gallery</h1>
      <p class="text-xs text-slate-500 font-medium mt-1">เลือกรูปแบบเพื่อดูตัวอย่าง Animation</p>
    </header>

    <!-- LIST OF 10 STYLES -->
    <div class="flex-1 overflow-y-auto px-4 py-6">
      <div class="grid grid-cols-2 gap-3">
        
        <!-- Buttons to trigger styles -->
        <button class="pressable bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm" onclick="showSplash(1)">
          <div class="w-10 h-10 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center"><i data-lucide="heart-pulse" class="w-5 h-5"></i></div>
          <span class="text-[11px] font-bold text-slate-700">1. Classic Pulse</span>
        </button>

        <button class="pressable bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm" onclick="showSplash(2)">
          <div class="w-10 h-10 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center"><i data-lucide="book-open" class="w-5 h-5"></i></div>
          <span class="text-[11px] font-bold text-slate-700">2. 3D Book Flip</span>
        </button>

        <button class="pressable bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm" onclick="showSplash(3)">
          <div class="w-10 h-10 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center"><i data-lucide="loader-2" class="w-5 h-5"></i></div>
          <span class="text-[11px] font-bold text-slate-700">3. Modern Spinner</span>
        </button>

        <button class="pressable bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm" onclick="showSplash(4)">
          <div class="w-10 h-10 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center"><i data-lucide="type" class="w-5 h-5"></i></div>
          <span class="text-[11px] font-bold text-slate-700">4. Typewriter</span>
        </button>

        <button class="pressable bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm" onclick="showSplash(5)">
          <div class="w-10 h-10 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center"><i data-lucide="droplet" class="w-5 h-5"></i></div>
          <span class="text-[11px] font-bold text-slate-700">5. Morphing Blob</span>
        </button>

        <button class="pressable bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm" onclick="showSplash(6)">
          <div class="w-10 h-10 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center"><i data-lucide="sparkles" class="w-5 h-5"></i></div>
          <span class="text-[11px] font-bold text-slate-700">6. Shimmer Mask</span>
        </button>

        <button class="pressable bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm" onclick="showSplash(7)">
          <div class="w-10 h-10 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center"><i data-lucide="radio" class="w-5 h-5"></i></div>
          <span class="text-[11px] font-bold text-slate-700">7. Radar Ping</span>
        </button>

        <button class="pressable bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm" onclick="showSplash(8)">
          <div class="w-10 h-10 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center"><i data-lucide="minus" class="w-5 h-5"></i></div>
          <span class="text-[11px] font-bold text-slate-700">8. Minimal Bar</span>
        </button>

        <button class="pressable bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm" onclick="showSplash(9)">
          <div class="w-10 h-10 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center"><i data-lucide="arrow-up-circle" class="w-5 h-5"></i></div>
          <span class="text-[11px] font-bold text-slate-700">9. Floating Box</span>
        </button>

        <button class="pressable bg-white border border-slate-200 rounded-2xl p-4 flex flex-col items-center gap-2 shadow-sm" onclick="showSplash(10)">
          <div class="w-10 h-10 bg-brand-50 text-brand-600 rounded-full flex items-center justify-center"><i data-lucide="more-horizontal" class="w-5 h-5"></i></div>
          <span class="text-[11px] font-bold text-slate-700">10. Bouncing Dots</span>
        </button>

      </div>
    </div>

    <!-- =========================================
         THE DYNAMIC SPLASH OVERLAY CONTAINER
         ========================================= -->
    <div id="splash-overlay">
      <!-- Content injected by JS -->
    </div>

  </div> <!-- End App -->

  <script>
    lucide.createIcons();

    // 10 Different Splash Screen Templates
    const templates = {
      
      // 1. Classic Pulse (Solid Blue, White Icon pulsating gently)
      1: `
        <div class="absolute inset-0 bg-brand-600 flex flex-col items-center justify-center">
          <div class="w-24 h-24 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center text-brand-600 mb-6 anim-smooth-pulse">
            <i data-lucide="library" class="w-12 h-12"></i>
          </div>
          <h1 class="text-white font-black text-3xl tracking-tight">ANT Library</h1>
        </div>
      `,

      // 2. 3D Book Flip (Dark theme, 3D rotating logo)
      2: `
        <div class="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center">
          <div class="text-brand-400 mb-6 anim-flip-3d">
            <i data-lucide="book-open" class="w-20 h-20"></i>
          </div>
          <h1 class="text-white font-black text-2xl tracking-widest uppercase">ANT Library</h1>
          <div class="w-8 h-8 border-2 border-slate-700 border-t-brand-500 rounded-full animate-spin mt-10"></div>
        </div>
      `,

      // 3. Modern Spinner (Clean white, blue accent, classic spinner ring around logo)
      3: `
        <div class="absolute inset-0 bg-white flex flex-col items-center justify-center">
          <div class="relative w-28 h-28 flex items-center justify-center mb-4">
            <div class="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
            <div class="absolute inset-0 border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
            <div class="text-brand-600"><i data-lucide="book-marked" class="w-10 h-10"></i></div>
          </div>
          <h1 class="text-slate-800 font-black text-2xl tracking-tight">ANT Library</h1>
          <p class="text-slate-400 text-xs font-bold mt-2 uppercase">Loading experience...</p>
        </div>
      `,

      // 4. Typewriter (Solid Blue, typing out text)
      4: `
        <div class="absolute inset-0 bg-brand-600 flex flex-col items-center justify-center">
          <div class="text-white mb-4"><i data-lucide="library" class="w-12 h-12"></i></div>
          <div class="inline-block">
            <h1 class="text-white font-black text-4xl tracking-tight anim-typewriter pr-2">ANT Library</h1>
          </div>
        </div>
      `,

      // 5. Morphing Blob (Playful, shape shifting background)
      5: `
        <div class="absolute inset-0 bg-slate-50 flex flex-col items-center justify-center">
          <div class="w-40 h-40 bg-gradient-to-tr from-brand-400 to-brand-600 flex items-center justify-center text-white shadow-xl shadow-brand-500/30 anim-morph mb-8">
            <i data-lucide="book-copy" class="w-14 h-14"></i>
          </div>
          <h1 class="text-slate-800 font-black text-2xl tracking-tight">ANT Library</h1>
        </div>
      `,

      // 6. Shimmer Mask (Sleek text effect)
      6: `
        <div class="absolute inset-0 bg-[#0B1120] flex flex-col items-center justify-center">
          <i data-lucide="library" class="w-16 h-16 text-slate-700 mb-6"></i>
          <h1 class="font-black text-4xl tracking-tight anim-shimmer-text">ANT Library</h1>
        </div>
      `,

      // 7. Radar Ping (Tech/Location vibe)
      7: `
        <div class="absolute inset-0 bg-white flex flex-col items-center justify-center">
          <div class="relative w-32 h-32 flex items-center justify-center mb-8">
            <div class="absolute inset-0 border-2 border-brand-500 rounded-full anim-radar-1"></div>
            <div class="absolute inset-0 border-2 border-brand-500 rounded-full anim-radar-2"></div>
            <div class="w-16 h-16 bg-brand-500 text-white rounded-full flex items-center justify-center shadow-lg relative z-10">
              <i data-lucide="map-pin" class="w-8 h-8"></i>
            </div>
          </div>
          <h1 class="text-brand-900 font-black text-2xl tracking-tight">ANT Library</h1>
          <p class="text-brand-600/70 text-xs font-bold mt-1">Connecting to nearest branch...</p>
        </div>
      `,

      // 8. Minimal Bar (Logo centered, line loads at bottom)
      8: `
        <div class="absolute inset-0 bg-white flex flex-col items-center justify-center relative">
          <div class="text-brand-600 flex items-center gap-3">
            <i data-lucide="library" class="w-10 h-10"></i>
            <h1 class="text-slate-800 font-black text-3xl tracking-tight">ANT Library</h1>
          </div>
          <div class="absolute bottom-12 left-10 right-10 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div class="h-full bg-brand-500 anim-progress-fill rounded-full"></div>
          </div>
        </div>
      `,

      // 9. Floating Box (App Icon floating)
      9: `
        <div class="absolute inset-0 bg-gradient-to-b from-brand-50 to-white flex flex-col items-center justify-center">
          <div class="w-24 h-24 bg-white rounded-3xl shadow-xl border border-slate-100 flex items-center justify-center text-brand-600 mb-8 anim-float">
            <i data-lucide="bookmark" class="w-10 h-10 fill-brand-100"></i>
          </div>
          <h1 class="text-slate-800 font-black text-2xl tracking-tight">ANT Library</h1>
        </div>
      `,

      // 10. Bouncing Dots (Classic waiting dots)
      10: `
        <div class="absolute inset-0 bg-brand-900 flex flex-col items-center justify-center">
          <div class="text-white mb-6">
            <i data-lucide="library" class="w-16 h-16"></i>
          </div>
          <div class="flex gap-2">
            <div class="w-3 h-3 bg-brand-300 rounded-full anim-dot-1"></div>
            <div class="w-3 h-3 bg-brand-400 rounded-full anim-dot-2"></div>
            <div class="w-3 h-3 bg-brand-500 rounded-full anim-dot-3"></div>
          </div>
        </div>
      `
    };

    const overlay = document.getElementById('splash-overlay');

    function showSplash(styleNumber) {
      // 1. Inject HTML
      overlay.innerHTML = templates[styleNumber];
      
      // 2. Re-initialize icons for newly injected HTML
      lucide.createIcons();

      // 3. Reset classes & Show
      overlay.className = '';
      // Force reflow
      void overlay.offsetWidth;
      overlay.classList.add('active');

      // 4. Hide after 3 seconds
      setTimeout(() => {
        overlay.classList.remove('active');
        overlay.classList.add('fade-out');
      }, 3000);
    }
  </script>
</body>
</html>
