<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no">
  <title>Digital Member Card - ANT Library</title>
  
  <!-- Fonts: Bai Jamjuree & Space Mono (for Barcode/ID) -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@400;500;600;700;800;900&family=Space+Mono:wght@700&display=swap" rel="stylesheet">
  
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>

  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { 
            sans: ['"Bai Jamjuree"', 'sans-serif'],
            mono: ['"Space Mono"', 'monospace']
          },
          colors: {
            brand: { 50: '#F0F9FF', 100: '#E0F2FE', 500: '#0EA5E9', 600: '#0284C7', 900: '#0C4A6E' }
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
      max-width: 480px; margin: 0 auto; background-color: #F8FAFC;
      height: 100dvh; position: relative; overflow: hidden;
      box-shadow: 0 0 40px rgba(0,0,0,0.05); display: flex; flex-direction: column;
    }

    .pressable { transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.15s ease; cursor: pointer; }
    .pressable:active { transform: scale(0.94); opacity: 0.8; }

    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    /* Canvas styling for responsive fit */
    #cardCanvas {
      width: 100%;
      max-width: 400px;
      height: auto;
      aspect-ratio: 400 / 250;
      border-radius: 24px;
      box-shadow: 0 20px 40px -10px rgba(14, 165, 233, 0.3), 0 10px 20px -5px rgba(79, 70, 229, 0.2);
      transition: box-shadow 0.3s ease;
    }
    
    .expired-shadow {
      box-shadow: 0 20px 40px -10px rgba(225, 29, 72, 0.3), 0 10px 20px -5px rgba(159, 18, 57, 0.2) !important;
    }

    /* Screen brightness simulation overlay */
    #brightness-overlay {
      position: absolute; inset: 0; pointer-events: none;
      background: white; opacity: 0; z-index: 100; mix-blend-mode: overlay;
      transition: opacity 0.3s ease;
    }
    #brightness-overlay.active { opacity: 0.15; }

    /* Custom Switch */
    .toggle-checkbox:checked { right: 0; border-color: #0EA5E9; }
    .toggle-checkbox:checked + .toggle-label { background-color: #0EA5E9; }

  </style>
</head>
<body class="text-slate-800">

  <div class="app-container">
    <div id="brightness-overlay"></div>
    
    <!-- HEADER -->
    <header class="bg-white/90 backdrop-blur-xl border-b border-slate-200 z-10 px-4 py-3 shrink-0 flex items-center justify-between" style="padding-top: max(1rem, var(--safe-top))">
      <button class="pressable w-10 h-10 rounded-full bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-slate-100">
        <i data-lucide="chevron-left" class="w-6 h-6"></i>
      </button>
      <h1 class="text-lg font-black text-slate-800 tracking-tight">บัตรสมาชิกดิจิทัล</h1>
      <div class="w-10"></div> <!-- Balancer -->
    </header>

    <!-- MAIN CONTENT -->
    <main class="flex-1 overflow-y-auto hide-scrollbar flex flex-col relative z-20 pb-24">
      
      <!-- Background Graphic -->
      <div class="absolute top-0 inset-x-0 h-64 bg-gradient-to-b from-brand-50 to-transparent -z-10"></div>

      <div class="px-5 pt-8 pb-4 flex flex-col items-center">
        
        <!-- ========================================================
             CANVAS RENDER AREA
             ======================================================== -->
        <div class="relative w-full max-w-[400px] mx-auto">
          <!-- Loading Skeleton -->
          <div id="canvas-loader" class="absolute inset-0 bg-slate-100 rounded-[24px] flex flex-col items-center justify-center animate-pulse z-10 border border-slate-200">
            <i data-lucide="loader-2" class="w-8 h-8 text-brand-400 animate-spin mb-2"></i>
            <span class="text-xs font-bold text-slate-400">กำลังประมวลผลบัตร...</span>
          </div>
          
          <!-- The Canvas -->
          <canvas id="cardCanvas"></canvas>
        </div>

        <p class="text-[11px] font-semibold text-slate-400 mt-5 flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-100">
          <i data-lucide="shield-check" class="w-3.5 h-3.5 text-emerald-500"></i> บัตรดิจิทัลปลอดภัย กันการปลอมแปลง
        </p>
      </div>

      <!-- CONTROLS & INFO -->
      <div class="px-5 space-y-4 mt-2">
        
        <!-- Max Brightness Toggle -->
        <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center"><i data-lucide="sun" class="w-5 h-5"></i></div>
            <div>
              <p class="text-sm font-bold text-slate-800">เพิ่มแสงหน้าจอสูงสุด</p>
              <p class="text-[11px] font-medium text-slate-500 mt-0.5">ช่วยให้เครื่องสแกนบาร์โค้ดอ่านง่ายขึ้น</p>
            </div>
          </div>
          <label class="relative inline-flex items-center cursor-pointer pressable shrink-0">
            <input type="checkbox" id="toggle-brightness" class="sr-only peer">
            <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-500"></div>
          </label>
        </div>

        <h3 class="text-xs font-black text-slate-400 uppercase tracking-wider pl-2 mt-6 mb-2">Simulate State (Developer Tools)</h3>
        
        <!-- Mock Controls to test Canvas Reactivity -->
        <div class="grid grid-cols-2 gap-3">
          <button class="pressable bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-1 items-start shadow-sm" onclick="mockUpdateState('active')">
            <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>
            <span class="text-xs font-bold text-slate-700">สถานะ: ปกติ (Active)</span>
          </button>
          <button class="pressable bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-1 items-start shadow-sm" onclick="mockUpdateState('expired')">
            <span class="w-2 h-2 bg-rose-500 rounded-full"></span>
            <span class="text-xs font-bold text-slate-700">สถานะ: หมดอายุ (Expired)</span>
          </button>
          <button class="pressable bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-1 items-start shadow-sm" onclick="mockUpdateLoans(1)">
            <i data-lucide="book-plus" class="w-4 h-4 text-brand-500"></i>
            <span class="text-xs font-bold text-slate-700">จำลอง: ยืมเพิ่ม 1 เล่ม</span>
          </button>
          <button class="pressable bg-white border border-slate-200 rounded-xl p-3 flex flex-col gap-1 items-start shadow-sm" onclick="mockUpdateLoans(-1)">
            <i data-lucide="book-minus" class="w-4 h-4 text-slate-500"></i>
            <span class="text-xs font-bold text-slate-700">จำลอง: คืนหนังสือ 1 เล่ม</span>
          </button>
        </div>
      </div>

    </main>

    <!-- BOTTOM NAVIGATION (Visual context) -->
    <nav class="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 z-30 pb-[var(--safe-bottom)] shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
      <div class="flex justify-around items-center h-[68px] px-2">
        <button class="pressable w-full h-full text-slate-400 flex flex-col items-center justify-center"><i data-lucide="layout-dashboard" class="w-[22px] h-[22px] mb-1"></i><span class="text-[10px] font-bold">หน้าหลัก</span></button>
        <button class="pressable w-full h-full text-slate-400 flex flex-col items-center justify-center"><i data-lucide="search" class="w-[22px] h-[22px] mb-1"></i><span class="text-[10px] font-bold">ค้นหา</span></button>
        
        <div class="relative -top-5 w-full flex justify-center shrink-0" style="min-width: 72px;">
          <button class="pressable w-14 h-14 bg-gradient-to-br from-brand-500 to-blue-600 rounded-full flex items-center justify-center text-white shadow-[0_8px_20px_rgba(14,165,233,0.4)] border-[3px] border-white">
            <i data-lucide="scan" class="w-6 h-6"></i>
          </button>
        </div>

        <button class="pressable w-full h-full text-slate-400 flex flex-col items-center justify-center"><i data-lucide="bookmark" class="w-[22px] h-[22px] mb-1"></i><span class="text-[10px] font-bold">ยืมแล้ว</span></button>
        <!-- Active Tab -->
        <button class="pressable w-full h-full text-brand-600 flex flex-col items-center justify-center"><i data-lucide="id-card" class="w-[22px] h-[22px] mb-1 fill-brand-100"></i><span class="text-[10px] font-bold">บัตรสมาชิก</span></button>
      </div>
    </nav>

  </div> <!-- End App -->

  <script>
    lucide.createIcons();

    /* =========================================================================
       CANVAS MEMBER CARD ENGINE
       ========================================================================= */
    const canvas = document.getElementById('cardCanvas');
    const loader = document.getElementById('canvas-loader');
    
    // Baseline Configuration based on specification
    const CARD_WIDTH = 400;
    const CARD_HEIGHT = 250;
    const RADIUS = 24;

    // Initial Mock State
    let STATE = {
      profile: {
        displayName: "สมชาย ใจดี",
        memberId: "UID-64010123",
        status: "active", // 'active' or 'expired'
        activeLoansCount: 3,
        issueDate: "29 Apr 2026",
        avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=f8fafc"
      }
    };

    // Preload image to ensure synchronous drawing later
    let avatarImg = new Image();
    avatarImg.crossOrigin = "Anonymous";
    
    // High-DPI setup function
    function setupCanvas(canvas) {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = CARD_WIDTH * dpr;
      canvas.height = CARD_HEIGHT * dpr;
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      
      // Better text rendering
      ctx.textBaseline = 'top';
      return ctx;
    }

    // Helper: Draw Rounded Rectangle Path
    function roundRect(ctx, x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }

    // Main Draw Function (Triggered after image loads or state changes)
    function drawMemberCard() {
      const ctx = setupCanvas(canvas);
      ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
      
      const p = STATE.profile;
      const isActive = p.status === 'active';

      // 1. Draw Background (Gradient + Glassmorphism base)
      ctx.save();
      roundRect(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, RADIUS);
      ctx.clip(); // Clip everything to the rounded card shape

      // Base Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
      if (isActive) {
        bgGrad.addColorStop(0, '#e0f2fe'); // brand-100
        bgGrad.addColorStop(0.5, '#bae6fd'); // brand-200
        bgGrad.addColorStop(1, '#818cf8'); // indigo-400
      } else {
        bgGrad.addColorStop(0, '#ffe4e6'); // rose-100
        bgGrad.addColorStop(1, '#f43f5e'); // rose-500
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

      // Glass overlay (noise/texture simulation via subtle arcs)
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.beginPath();
      ctx.arc(CARD_WIDTH, 0, 150, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.arc(0, CARD_HEIGHT, 200, 0, Math.PI*2);
      ctx.fill();
      ctx.restore();

      // 2. Header Area
      ctx.fillStyle = isActive ? '#0369a1' : '#881337'; // Dark text
      ctx.font = '800 16px "Bai Jamjuree", sans-serif';
      ctx.fillText('ANT Library', 20, 20);
      
      ctx.fillStyle = isActive ? 'rgba(3,105,161,0.6)' : 'rgba(136,19,55,0.6)';
      ctx.font = '600 10px "Bai Jamjuree", sans-serif';
      ctx.fillText(`ISSUED: ${p.issueDate}`, 20, 40);

      // 3. Status Badge (Top Right)
      const badgeW = 70;
      const badgeH = 22;
      const badgeX = CARD_WIDTH - badgeW - 20;
      const badgeY = 20;
      
      ctx.fillStyle = isActive ? '#10b981' : '#e11d48'; // Emerald-500 or Rose-600
      roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 11);
      ctx.fill();
      
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 10px "Bai Jamjuree", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isActive ? 'ACTIVE' : 'EXPIRED', badgeX + (badgeW/2), badgeY + 6);
      ctx.textAlign = 'left'; // Reset

      // 4. Identity Area (Avatar & Name)
      const avX = 20, avY = 70, avRadius = 26;
      
      // Avatar Shadow/Border
      ctx.save();
      ctx.beginPath();
      ctx.arc(avX + avRadius, avY + avRadius, avRadius + 2, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fill();
      
      // Avatar Clipping & Draw
      ctx.beginPath();
      ctx.arc(avX + avRadius, avY + avRadius, avRadius, 0, Math.PI*2);
      ctx.clip();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(avX, avY, avRadius*2, avRadius*2);
      if (avatarImg.complete) {
        ctx.drawImage(avatarImg, avX, avY, avRadius*2, avRadius*2);
      }
      ctx.restore();

      // Name & ID
      ctx.fillStyle = isActive ? '#0f172a' : '#ffffff';
      ctx.font = '900 20px "Bai Jamjuree", sans-serif';
      ctx.fillText(p.displayName, 85, 75);
      
      ctx.fillStyle = isActive ? '#475569' : 'rgba(255,255,255,0.8)';
      ctx.font = '700 12px "Space Mono", monospace';
      ctx.fillText(p.memberId, 85, 102);

      // 5. White Glass Card Area for Barcode
      const glassY = 140;
      const glassH = 110;
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'; // Solid enough to read barcode
      // Only round bottom corners
      ctx.beginPath();
      ctx.moveTo(0, glassY);
      ctx.lineTo(CARD_WIDTH, glassY);
      ctx.lineTo(CARD_WIDTH, CARD_HEIGHT - RADIUS);
      ctx.quadraticCurveTo(CARD_WIDTH, CARD_HEIGHT, CARD_WIDTH - RADIUS, CARD_HEIGHT);
      ctx.lineTo(RADIUS, CARD_HEIGHT);
      ctx.quadraticCurveTo(0, CARD_HEIGHT, 0, CARD_HEIGHT - RADIUS);
      ctx.closePath();
      ctx.fill();
      
      // 6. Mock Barcode Generation (Central)
      // Simulating a barcode pattern using fillRect
      const bcX = 40;
      const bcY = 155;
      const bcW = CARD_WIDTH - 80;
      const bcH = 45;
      
      ctx.fillStyle = isActive ? '#0f172a' : '#94a3b8'; // Fade out if expired
      
      // Generate a deterministic but pseudo-random looking pattern based on ID length
      let currentX = bcX;
      for(let i=0; i<35; i++) {
         let w = (Math.random() > 0.5) ? 2 : (Math.random() > 0.8 ? 6 : 4);
         let gap = (Math.random() > 0.5) ? 2 : 4;
         if (currentX + w > bcX + bcW) break; // Don't overflow
         ctx.fillRect(currentX, bcY, w, bcH);
         currentX += w + gap;
      }
      
      // Barcode Text below
      ctx.fillStyle = isActive ? '#64748b' : '#cbd5e1';
      ctx.font = '600 10px "Space Mono", monospace';
      ctx.textAlign = 'center';
      ctx.letterSpacing = '4px'; // Supported in modern canvas
      ctx.fillText(p.memberId.replace('-', ''), CARD_WIDTH/2, bcY + bcH + 8);
      ctx.textAlign = 'left';
      ctx.letterSpacing = '0px';

      // 7. Footer Stat (Active Loans)
      // Placed intelligently so it doesn't overlap barcode
      ctx.fillStyle = '#0f172a';
      ctx.font = '800 12px "Bai Jamjuree", sans-serif';
      
      // A small pill shape for stats
      const pillY = 15;
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      roundRect(ctx, CARD_WIDTH/2 - 40, pillY, 80, 22, 11);
      ctx.fill();
      
      ctx.fillStyle = '#0f172a';
      ctx.textAlign = 'center';
      ctx.font = '700 10px "Bai Jamjuree", sans-serif';
      ctx.fillText(`ยืมอยู่: ${p.activeLoansCount} เล่ม`, CARD_WIDTH/2, pillY + 5);
      
      ctx.restore();
      
      // Update DOM classes for shadow based on status
      if(isActive) {
        canvas.classList.remove('expired-shadow');
      } else {
        canvas.classList.add('expired-shadow');
      }
    }

    // --- INIT ---
    // Start loading image. When done, hide skeleton and draw.
    avatarImg.onload = () => {
      loader.classList.add('opacity-0');
      setTimeout(() => loader.style.display = 'none', 300);
      drawMemberCard();
    };
    // Force load trigger
    avatarImg.src = STATE.profile.avatarUrl;


    /* =========================================================================
       DEV CONTROLS & INTERACTION LOGIC
       ========================================================================= */
    
    // Simulate Status Change
    window.mockUpdateState = function(status) {
      STATE.profile.status = status;
      if(navigator.vibrate) navigator.vibrate(20);
      drawMemberCard();
    }

    // Simulate Loan Change
    window.mockUpdateLoans = function(change) {
      let newVal = STATE.profile.activeLoansCount + change;
      if (newVal < 0) newVal = 0;
      if (newVal > 5) { alert('ถึงโควตาสูงสุดแล้ว'); return; }
      
      STATE.profile.activeLoansCount = newVal;
      if(navigator.vibrate) navigator.vibrate(20);
      drawMemberCard();
    }

    // Brightness Toggle (Simulation)
    const brightnessToggle = document.getElementById('toggle-brightness');
    const brightnessOverlay = document.getElementById('brightness-overlay');
    
    brightnessToggle.addEventListener('change', (e) => {
      if(navigator.vibrate) navigator.vibrate(20);
      if(e.target.checked) {
        brightnessOverlay.classList.add('active');
        // In a real app, this might trigger a wake-lock API or prompt the user
      } else {
        brightnessOverlay.classList.remove('active');
      }
    });

  </script>
</body>
</html>
