http://localhost:5000/app/profile
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <!-- Native App Viewport & Safe Area -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no">
  <title>โปรไฟล์ของฉัน - ANT Library</title>
  
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
            'sheet': '0 -10px 40px rgba(0,0,0,0.1)',
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

    /* Bottom Sheet Animation */
    .sheet-overlay {
      opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
    }
    .sheet-overlay.active { opacity: 1; pointer-events: auto; }
    
    .bottom-sheet {
      transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.32, 0.72, 0, 1);
    }
    .bottom-sheet.active { transform: translateY(0); }
  </style>
</head>
<body class="text-slate-800 antialiased">

  <div class="app-container">
    
    <!-- ==========================================
         1. HEADER (Sticky)
         ========================================== -->
    <header class="sticky top-0 z-30 bg-[#F8FAFC]/95 backdrop-blur-xl border-b border-slate-100" style="padding-top: max(1rem, var(--safe-top))">
      <div class="flex justify-between items-center px-4 pb-2 pt-2">
        <div class="w-10"></div> <!-- Placeholder for centering -->
        <h1 class="text-lg font-black text-slate-800 tracking-tight">โปรไฟล์ของฉัน</h1>
        <button id="btn-logout" class="pressable touch-target flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors">
          <i data-lucide="log-out" class="w-5 h-5"></i>
        </button>
      </div>
    </header>

    <!-- ==========================================
         MAIN SCROLLABLE CONTENT
         ========================================== -->
    <main class="flex-1 overflow-y-auto overscroll-contain pb-28 hide-scrollbar relative" id="main-scroll">
      
      <!-- Background Header Curve -->
      <div class="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-brand-50 to-[#F8FAFC] -z-10"></div>

      <div class="space-y-6 pt-6 pb-6 px-4">
        
        <!-- 2. Profile Header (Avatar & Role) -->
        <section id="profile-header" class="flex flex-col items-center text-center fade-in">
          <!-- Skeleton State -->
          <div id="avatar-skeleton" class="w-28 h-28 rounded-full skeleton-box mb-4 shadow-sm border-4 border-white"></div>
          
          <!-- Real Content (Hidden initially) -->
          <div id="avatar-content" class="hidden flex-col items-center">
            <div class="relative mb-3">
              <button id="btn-avatar" class="pressable w-28 h-28 rounded-full bg-slate-100 border-4 border-white shadow-md flex items-center justify-center text-brand-600 font-bold overflow-hidden relative group">
                <img id="profile-image" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=e0f2fe" alt="Profile" class="w-full h-full object-cover">
                <!-- Overlay on hover/active for visual feedback -->
                <div class="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
              <!-- Camera Badge -->
              <div class="absolute bottom-0 right-0 w-8 h-8 bg-brand-600 text-white rounded-full border-2 border-white flex items-center justify-center shadow-sm pointer-events-none">
                <i data-lucide="camera" class="w-4 h-4"></i>
              </div>
            </div>
            
            <h2 class="text-2xl font-black text-slate-800 leading-tight">สมชาย ใจดี</h2>
            <div class="mt-1 flex items-center gap-1.5 px-3 py-1 bg-brand-50 rounded-full border border-brand-100">
              <span class="w-2 h-2 rounded-full bg-brand-500"></span>
              <p class="text-xs font-bold text-brand-700 uppercase tracking-wide">นักศึกษาชั้นปีที่ 3</p>
            </div>
          </div>
        </section>

        <!-- 3. Quick Stats -->
        <section id="profile-stats">
          <div class="grid grid-cols-2 gap-3 fade-in" style="animation-delay: 50ms;">
            <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-card flex items-center gap-3">
              <div class="bg-brand-50 text-brand-600 p-2.5 rounded-full shrink-0"><i data-lucide="book-up-2" class="w-5 h-5"></i></div>
              <div>
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wide">กำลังยืม</p>
                <p class="text-lg font-black text-slate-800 leading-none mt-0.5"><span id="stat-loans">3</span> เล่ม</p>
              </div>
            </div>
            <div class="bg-white rounded-2xl p-4 border border-slate-200 shadow-card flex items-center gap-3">
              <div class="bg-rose-50 text-rose-600 p-2.5 rounded-full shrink-0"><i data-lucide="wallet" class="w-5 h-5"></i></div>
              <div>
                <p class="text-[10px] font-bold text-slate-500 uppercase tracking-wide">ค่าปรับค้าง</p>
                <p class="text-lg font-black text-rose-600 leading-none mt-0.5">฿<span id="stat-fines">60</span></p>
              </div>
            </div>
          </div>
        </section>

        <!-- 4. Business Hours Banner -->
        <section class="fade-in" style="animation-delay: 100ms;">
          <article class="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm relative overflow-hidden flex gap-4 items-start">
            <div class="w-1.5 absolute left-0 top-0 bottom-0 bg-slate-300"></div>
            <div class="bg-slate-50 text-slate-600 p-2.5 rounded-full shrink-0 shadow-inner">
              <i data-lucide="building-2" class="w-5 h-5"></i>
            </div>
            <div>
              <h3 class="text-sm font-black text-slate-800 leading-tight">ติดต่อเคาน์เตอร์บรรณารักษ์</h3>
              <p class="text-[11px] font-semibold text-slate-500 mt-1 leading-snug">
                กรณีแก้ไขชื่อ สังกัด หรือยืนยันตัวตนพิเศษ<br>
                <span class="text-brand-600 font-bold">จันทร์ - ศุกร์ (08:30 - 16:30 น.)</span>
              </p>
            </div>
          </article>
        </section>

        <!-- 5. Contact Information Grouped List -->
        <section class="fade-in" style="animation-delay: 150ms;">
          <h3 class="text-sm font-black text-slate-800 mb-2 px-1">ข้อมูลติดต่อ</h3>
          <div class="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <!-- Email -->
            <div class="flex items-center gap-3 p-4 border-b border-slate-100">
              <div class="text-slate-400 shrink-0"><i data-lucide="mail" class="w-5 h-5"></i></div>
              <div class="flex-1 min-w-0">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">อีเมล</p>
                <p class="text-sm font-semibold text-slate-800 truncate" id="info-email">somchai.ja@university.ac.th</p>
              </div>
            </div>
            <!-- Phone -->
            <div class="flex items-center gap-3 p-4 border-b border-slate-100">
              <div class="text-slate-400 shrink-0"><i data-lucide="phone" class="w-5 h-5"></i></div>
              <div class="flex-1 min-w-0">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">เบอร์โทรศัพท์</p>
                <p class="text-sm font-semibold text-slate-800 truncate" id="info-phone">081-234-5678</p>
              </div>
            </div>
            <!-- Line ID -->
            <div class="flex items-center gap-3 p-4 border-b border-slate-100">
              <div class="text-[#00B900] shrink-0">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.036 9.608.391.084.922.258 1.057.592.122.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967 1.739-1.907 2.572-3.843 2.572-5.992z"/></svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Line ID</p>
                <p class="text-sm font-semibold text-slate-800 truncate" id="info-line">somchai_stud</p>
              </div>
            </div>
            <!-- Department -->
            <div class="flex items-center gap-3 p-4">
              <div class="text-slate-400 shrink-0"><i data-lucide="map-pin" class="w-5 h-5"></i></div>
              <div class="flex-1 min-w-0">
                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-wide">คณะ/สังกัด</p>
                <p class="text-sm font-semibold text-slate-800 truncate" id="info-dept">คณะเทคโนโลยีสารสนเทศ</p>
              </div>
            </div>
          </div>
        </section>

        <!-- 6. Account Actions -->
        <section class="fade-in" style="animation-delay: 200ms;">
          <h3 class="text-sm font-black text-slate-800 mb-2 px-1">การตั้งค่าบัญชี</h3>
          <div class="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <button class="pressable flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors text-left">
              <div class="flex items-center gap-3">
                <div class="bg-slate-100 text-slate-600 p-2 rounded-xl"><i data-lucide="edit-3" class="w-4 h-4"></i></div>
                <span class="font-bold text-sm text-slate-800">แก้ไขข้อมูลส่วนตัว</span>
              </div>
              <i data-lucide="chevron-right" class="w-5 h-5 text-slate-400"></i>
            </button>
            <button class="pressable flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left">
              <div class="flex items-center gap-3">
                <div class="bg-slate-100 text-slate-600 p-2 rounded-xl"><i data-lucide="lock" class="w-4 h-4"></i></div>
                <span class="font-bold text-sm text-slate-800">เปลี่ยนรหัสผ่าน</span>
              </div>
              <i data-lucide="chevron-right" class="w-5 h-5 text-slate-400"></i>
            </button>
          </div>
        </section>

      </div>
    </main>

    <!-- ==========================================
         BOTTOM NAVIGATION (Fixed)
         ========================================== -->
    <nav class="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 z-40 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] max-w-[480px] mx-auto" style="padding-bottom: var(--safe-bottom)">
      <div class="flex justify-around items-center h-[68px] px-1">
        <a href="#" class="pressable touch-target flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-brand-600">
          <i data-lucide="layout-dashboard" class="w-[22px] h-[22px] mb-1"></i>
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
        <!-- Active Tab in Bottom Nav -->
        <a href="#" class="pressable touch-target flex flex-col items-center justify-center w-full h-full text-brand-600">
          <i data-lucide="user" class="w-[22px] h-[22px] mb-1 fill-brand-100/50"></i>
          <span class="text-[10px] font-bold">ฉัน</span>
        </a>
      </div>
    </nav>

    <!-- ==========================================
         ACTION SHEET (Avatar Options)
         ========================================== -->
    <div id="sheet-backdrop" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 sheet-overlay max-w-[480px] mx-auto"></div>
    
    <div id="avatar-action-sheet" class="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-[2rem] shadow-sheet bottom-sheet flex flex-col max-h-[90vh] max-w-[480px] mx-auto px-4" style="padding-bottom: max(1.5rem, var(--safe-bottom))">
      <!-- Drag Handle -->
      <div class="w-full flex justify-center pt-3 pb-3 shrink-0" id="sheet-handle">
        <div class="w-12 h-1.5 bg-slate-200 rounded-full"></div>
      </div>
      
      <div class="text-center mb-4">
        <h3 class="text-lg font-black text-slate-800">จัดการรูปโปรไฟล์</h3>
        <p class="text-xs text-slate-500 font-medium">เลือกการดำเนินการที่ต้องการ</p>
      </div>

      <div class="flex flex-col gap-2">
        <button id="btn-upload-photo" class="pressable bg-brand-50 text-brand-700 hover:bg-brand-100 font-bold text-sm rounded-2xl py-4 flex items-center justify-center gap-3 transition-colors relative overflow-hidden">
          <i data-lucide="image-plus" class="w-5 h-5"></i>
          อัปโหลดรูปภาพใหม่
          <!-- Hidden Input for file -->
          <input type="file" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer" id="file-input">
        </button>
        <button id="btn-delete-photo" class="pressable bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-sm rounded-2xl py-4 flex items-center justify-center gap-3 transition-colors">
          <i data-lucide="trash-2" class="w-5 h-5"></i>
          ลบรูปโปรไฟล์
        </button>
      </div>
      
      <button id="btn-cancel-sheet" class="pressable bg-slate-100 text-slate-600 font-bold text-sm rounded-2xl py-4 mt-4 w-full">
        ยกเลิก
      </button>
    </div>

  </div> <!-- End App Container -->

  <!-- TOAST NOTIFICATION -->
  <div id="toast-container" class="fixed top-[max(1.5rem,var(--safe-top))] left-1/2 -translate-x-1/2 z-50 pointer-events-none w-[90%] max-w-[400px] hidden">
    <div class="bg-slate-800 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 w-full backdrop-blur-md bg-opacity-95">
      <div id="toast-icon-wrap" class="bg-brand-500/20 text-brand-400 p-1.5 rounded-full shrink-0">
        <i data-lucide="check" id="toast-icon" class="w-4 h-4"></i>
      </div>
      <p id="toast-message" class="text-sm font-bold flex-1">แจ้งเตือน</p>
    </div>
  </div>

  <!-- Application Logic -->
  <script>
    lucide.createIcons();

    /* ==========================================
       1. STATE & TOAST SYSTEM
       ========================================== */
    function showToast(msg, type = 'success') {
      const t = document.getElementById('toast-container');
      const iconWrap = document.getElementById('toast-icon-wrap');
      const icon = document.getElementById('toast-icon');
      
      document.getElementById('toast-message').innerText = msg;
      
      if(type === 'success') {
        iconWrap.className = 'bg-brand-500/20 text-brand-400 p-1.5 rounded-full shrink-0';
        icon.setAttribute('data-lucide', 'check');
      } else if(type === 'loading') {
        iconWrap.className = 'bg-slate-600 text-white p-1.5 rounded-full shrink-0 animate-spin';
        icon.setAttribute('data-lucide', 'loader-2');
      } else {
        iconWrap.className = 'bg-rose-500/20 text-rose-400 p-1.5 rounded-full shrink-0';
        icon.setAttribute('data-lucide', 'alert-circle');
      }
      lucide.createIcons();
      
      t.classList.remove('hidden');
      t.style.animation = 'none'; void t.offsetWidth; 
      t.style.animation = 'fadeIn 0.3s ease-out forwards';
      
      if(type !== 'loading') {
        setTimeout(() => t.classList.add('hidden'), 3000);
      }
      return t; // Return reference to hide manually if loading
    }

    function hideToast() {
      document.getElementById('toast-container').classList.add('hidden');
    }

    /* ==========================================
       2. ACTION SHEET LOGIC
       ========================================== */
    const sheetOverlay = document.getElementById('sheet-backdrop');
    const bottomSheet = document.getElementById('avatar-action-sheet');
    const btnAvatar = document.getElementById('btn-avatar');
    const btnCancelSheet = document.getElementById('btn-cancel-sheet');
    
    function openActionSheet() {
      if(navigator.vibrate) navigator.vibrate(50);
      sheetOverlay.classList.add('active');
      bottomSheet.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeActionSheet() {
      sheetOverlay.classList.remove('active');
      bottomSheet.classList.remove('active');
      document.body.style.overflow = '';
    }

    btnAvatar.addEventListener('click', openActionSheet);
    sheetOverlay.addEventListener('click', closeActionSheet);
    btnCancelSheet.addEventListener('click', closeActionSheet);

    // Mock Upload Logic (Model 2: Image Processing)
    const fileInput = document.getElementById('file-input');
    fileInput.addEventListener('change', (e) => {
      if(e.target.files && e.target.files[0]) {
        closeActionSheet();
        showToast('กำลังประมวลผลรูปภาพ...', 'loading');
        
        // Simulate Canvas resizing & API Upload Delay
        setTimeout(() => {
          // Fake update image
          document.getElementById('profile-image').src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80";
          hideToast();
          showToast('อัปเดตรูปโปรไฟล์สำเร็จแล้ว', 'success');
        }, 1500);
      }
    });

    // Mock Delete Logic
    document.getElementById('btn-delete-photo').addEventListener('click', () => {
      closeActionSheet();
      document.getElementById('profile-image').src = "https://api.dicebear.com/7.x/avataaars/svg?seed=Default&backgroundColor=f1f5f9";
      showToast('ลบรูปโปรไฟล์แล้ว', 'success');
    });

    // Mock Logout Logic
    document.getElementById('btn-logout').addEventListener('click', () => {
      if(confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
        showToast('ออกจากระบบ...', 'loading');
      }
    });

    /* ==========================================
       3. INITIAL LOAD LOGIC
       ========================================== */
    function loadProfileData() {
      // Simulate fetch delay
      setTimeout(() => {
        document.getElementById('avatar-skeleton').style.display = 'none';
        document.getElementById('avatar-content').style.display = 'flex';
      }, 800);
    }

    loadProfileData();

  </script>
</body>
</html>

http://localhost:5000/profile/edit
http://localhost:5000/profile/change-password
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <!-- Native App Viewport & Safe Area -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no, interactive-widget=resizes-content">
  <title>การตั้งค่าบัญชี - ANT Library</title>
  
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
    body {
      background-color: var(--app-bg); 
      -webkit-tap-highlight-color: transparent;
      overscroll-behavior-y: none;
    }
    
    /* Mobile App Container Constraint */
    .app-container {
      max-width: 480px;
      margin: 0 auto;
      background-color: #000; /* Black bg for transition shadows */
      height: 100dvh;
      position: relative;
      overflow: hidden;
      box-shadow: 0 0 40px rgba(0,0,0,0.05);
    }

    /* Stack Navigation System */
    .view-pane {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background-color: var(--app-bg);
      display: flex;
      flex-direction: column;
      transition: transform 0.4s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.4s ease;
      will-change: transform;
    }
    
    .view-main { z-index: 10; }
    .view-sub { 
      z-index: 20; 
      transform: translateX(100%); 
      box-shadow: -10px 0 30px rgba(0,0,0,0.05);
    }
    
    /* Navigation States */
    .view-main.push-out { transform: translateX(-30%); opacity: 0.8; pointer-events: none; }
    .view-sub.active { transform: translateX(0); }

    /* Native Press Feedback */
    .pressable {
      transition: transform 0.15s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.15s ease, background-color 0.15s ease;
      cursor: pointer;
      user-select: none;
    }
    .pressable:active:not(:disabled) { transform: scale(0.96); opacity: 0.8; }
    .pressable:disabled { opacity: 0.4; cursor: not-allowed; }
    
    .touch-target { min-height: 48px; min-width: 48px; }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    /* Input Focus Styles */
    .native-input:focus-within {
      border-color: #0EA5E9;
      box-shadow: inset 0 0 0 1px #0EA5E9;
    }
  </style>
</head>
<body class="text-slate-800 antialiased">

  <div class="app-container" id="app-root">
    
    <!-- =========================================================================
         [VIEW 1] MAIN SETTINGS MENU
         ========================================================================= -->
    <div id="view-main" class="view-pane view-main">
      
      <!-- Header -->
      <header class="bg-white/90 backdrop-blur-xl border-b border-slate-200 z-10 shrink-0" style="padding-top: max(1rem, var(--safe-top))">
        <div class="flex justify-between items-center px-4 pb-3 pt-2">
          <button class="pressable touch-target flex items-center w-10 h-10 -ml-2 text-brand-600 font-bold">
            <i data-lucide="chevron-left" class="w-7 h-7"></i>
            <!-- Simulate going back to profile -->
          </button>
          <h1 class="text-lg font-black text-slate-800 tracking-tight absolute left-1/2 -translate-x-1/2">การตั้งค่า</h1>
          <div class="w-10"></div> <!-- Balancer -->
        </div>
      </header>

      <!-- Scrollable Menu -->
      <div class="flex-1 overflow-y-auto hide-scrollbar px-4 pt-6 pb-12 space-y-6">
        
        <!-- Section: Account -->
        <section>
          <h2 class="text-[13px] font-black text-slate-500 uppercase tracking-wider mb-2 px-2">บัญชีผู้ใช้ (Account)</h2>
          <div class="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            
            <button class="nav-btn pressable flex items-center justify-between p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors text-left" data-target="view-edit-profile">
              <div class="flex items-center gap-3">
                <div class="bg-brand-50 text-brand-600 p-2 rounded-xl"><i data-lucide="user-pen" class="w-5 h-5"></i></div>
                <div>
                  <span class="block font-bold text-sm text-slate-800">ข้อมูลส่วนตัว</span>
                  <span class="block text-[11px] font-medium text-slate-500 mt-0.5">เบอร์โทร, อีเมล, สังกัด</span>
                </div>
              </div>
              <i data-lucide="chevron-right" class="w-5 h-5 text-slate-400"></i>
            </button>
            
            <button class="nav-btn pressable flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left" data-target="view-change-password">
              <div class="flex items-center gap-3">
                <div class="bg-amber-50 text-amber-600 p-2 rounded-xl"><i data-lucide="key-round" class="w-5 h-5"></i></div>
                <div>
                  <span class="block font-bold text-sm text-slate-800">รหัสผ่านและความปลอดภัย</span>
                  <span class="block text-[11px] font-medium text-slate-500 mt-0.5">เปลี่ยนรหัสผ่านเข้าใช้งาน</span>
                </div>
              </div>
              <i data-lucide="chevron-right" class="w-5 h-5 text-slate-400"></i>
            </button>

          </div>
        </section>

        <!-- Section: Preferences -->
        <section>
          <h2 class="text-[13px] font-black text-slate-500 uppercase tracking-wider mb-2 px-2">การตั้งค่าแอป (Preferences)</h2>
          <div class="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            
            <div class="flex items-center justify-between p-4 border-b border-slate-100">
              <div class="flex items-center gap-3">
                <div class="bg-indigo-50 text-indigo-600 p-2 rounded-xl"><i data-lucide="bell-ring" class="w-5 h-5"></i></div>
                <span class="font-bold text-sm text-slate-800">การแจ้งเตือน (Notifications)</span>
              </div>
              <!-- Toggle Switch -->
              <label class="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" class="sr-only peer" checked>
                <div class="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
            
            <button class="pressable flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left">
              <div class="flex items-center gap-3">
                <div class="bg-slate-100 text-slate-600 p-2 rounded-xl"><i data-lucide="languages" class="w-5 h-5"></i></div>
                <span class="font-bold text-sm text-slate-800">ภาษา (Language)</span>
              </div>
              <div class="flex items-center gap-1">
                <span class="text-xs font-bold text-slate-400">ไทย</span>
                <i data-lucide="chevron-right" class="w-5 h-5 text-slate-400"></i>
              </div>
            </button>

          </div>
        </section>

        <!-- Support Info -->
        <div class="px-2 pt-4 flex flex-col items-center">
          <i data-lucide="library" class="w-8 h-8 text-slate-300 mb-2"></i>
          <p class="text-xs font-bold text-slate-400 text-center">ANT Library App v2.0.1<br>ศูนย์บรรณสารและสื่อการศึกษา</p>
        </div>

      </div>
    </div>


    <!-- =========================================================================
         [VIEW 2] EDIT PROFILE FORM
         ========================================================================= -->
    <div id="view-edit-profile" class="view-pane view-sub">
      
      <!-- Header -->
      <header class="bg-white/90 backdrop-blur-xl border-b border-slate-200 z-10 shrink-0" style="padding-top: max(1rem, var(--safe-top))">
        <div class="flex justify-between items-center px-4 pb-3 pt-2">
          <button class="nav-back-btn pressable touch-target flex items-center w-12 h-10 -ml-2 text-brand-600 font-bold">
            <i data-lucide="chevron-left" class="w-7 h-7"></i>กลับ
          </button>
          <h1 class="text-lg font-black text-slate-800 tracking-tight absolute left-1/2 -translate-x-1/2">แก้ไขข้อมูล</h1>
          <!-- Save Button (Disabled by default) -->
          <button id="btn-save-profile" class="pressable touch-target flex items-center justify-end w-12 h-10 text-brand-600 font-bold" disabled>
            บันทึก
          </button>
        </div>
      </header>

      <!-- Scrollable Form -->
      <div class="flex-1 overflow-y-auto hide-scrollbar px-4 pt-6 pb-20 space-y-6">
        
        <form id="form-edit-profile" class="space-y-6">
          
          <!-- Section 1 -->
          <div>
            <h2 class="text-[13px] font-black text-slate-500 uppercase tracking-wider mb-2 px-2">ข้อมูลพื้นฐาน</h2>
            <div class="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden p-1">
              
              <!-- Input Group -->
              <div class="p-3 border-b border-slate-100 native-input rounded-xl transition-all">
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 px-1">ชื่อ-นามสกุล</label>
                <input type="text" value="สมชาย ใจดี" class="w-full bg-transparent text-sm font-bold text-slate-800 outline-none px-1" readonly disabled>
                <p class="text-[9px] text-slate-400 mt-1 px-1 flex gap-1"><i data-lucide="info" class="w-3 h-3"></i> แก้ไขไม่ได้ ติดต่อเจ้าหน้าที่</p>
              </div>

              <!-- Input Group -->
              <div class="p-3 native-input rounded-xl transition-all">
                <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1 px-1">รหัสนักศึกษา/สมาชิก</label>
                <input type="text" value="64010123" class="w-full bg-transparent text-sm font-bold text-slate-800 outline-none px-1" readonly disabled>
              </div>

            </div>
          </div>

          <!-- Section 2: Editable -->
          <div>
            <h2 class="text-[13px] font-black text-slate-500 uppercase tracking-wider mb-2 px-2">ข้อมูลติดต่อ (แก้ไขได้)</h2>
            <div class="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden p-1">
              
              <div class="p-3 border-b border-slate-100 native-input rounded-xl transition-all bg-slate-50/50">
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 px-1">เบอร์โทรศัพท์ <span class="text-rose-500">*</span></label>
                <input type="tel" id="input-phone" value="0812345678" class="w-full bg-transparent text-sm font-bold text-slate-800 outline-none px-1 py-1" required>
              </div>

              <div class="p-3 border-b border-slate-100 native-input rounded-xl transition-all bg-slate-50/50">
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 px-1">อีเมล <span class="text-rose-500">*</span></label>
                <input type="email" id="input-email" value="somchai.ja@university.ac.th" class="w-full bg-transparent text-sm font-bold text-slate-800 outline-none px-1 py-1" required>
              </div>

              <div class="p-3 native-input rounded-xl transition-all bg-slate-50/50">
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 px-1">Line ID (ไม่บังคับ)</label>
                <input type="text" id="input-line" value="somchai_stud" class="w-full bg-transparent text-sm font-bold text-slate-800 outline-none px-1 py-1">
              </div>

            </div>
          </div>

          <!-- Section 3 -->
          <div>
            <h2 class="text-[13px] font-black text-slate-500 uppercase tracking-wider mb-2 px-2">ข้อมูลการศึกษา</h2>
            <div class="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden p-1">
              
              <div class="p-3 native-input rounded-xl transition-all bg-slate-50/50 relative">
                <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 px-1">คณะ/สังกัด</label>
                <select id="input-dept" class="w-full bg-transparent text-sm font-bold text-slate-800 outline-none px-1 py-1 appearance-none">
                  <option value="it" selected>คณะเทคโนโลยีสารสนเทศ</option>
                  <option value="eng">คณะวิศวกรรมศาสตร์</option>
                  <option value="sci">คณะวิทยาศาสตร์</option>
                  <option value="biz">คณะบริหารธุรกิจ</option>
                </select>
                <i data-lucide="chevron-down" class="absolute right-4 top-1/2 w-4 h-4 text-slate-400 pointer-events-none"></i>
              </div>

            </div>
          </div>

        </form>
      </div>
    </div>


    <!-- =========================================================================
         [VIEW 3] CHANGE PASSWORD FORM
         ========================================================================= -->
    <div id="view-change-password" class="view-pane view-sub">
      
      <!-- Header -->
      <header class="bg-white/90 backdrop-blur-xl border-b border-slate-200 z-10 shrink-0" style="padding-top: max(1rem, var(--safe-top))">
        <div class="flex justify-between items-center px-4 pb-3 pt-2">
          <button class="nav-back-btn pressable touch-target flex items-center w-12 h-10 -ml-2 text-brand-600 font-bold">
            <i data-lucide="chevron-left" class="w-7 h-7"></i>กลับ
          </button>
          <h1 class="text-lg font-black text-slate-800 tracking-tight absolute left-1/2 -translate-x-1/2">เปลี่ยนรหัสผ่าน</h1>
          <!-- Save Button -->
          <button id="btn-save-pwd" class="pressable touch-target flex items-center justify-end w-12 h-10 text-brand-600 font-bold" disabled>
            บันทึก
          </button>
        </div>
      </header>

      <!-- Scrollable Form -->
      <div class="flex-1 overflow-y-auto hide-scrollbar px-4 pt-6 pb-20 space-y-6">
        
        <div class="px-2 mb-2">
          <p class="text-sm font-medium text-slate-500">รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร ประกอบด้วยตัวอักษรและตัวเลข</p>
        </div>

        <form id="form-change-pwd" class="space-y-6">
          
          <div class="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden p-1">
            
            <!-- Current Password -->
            <div class="p-3 border-b border-slate-100 native-input rounded-xl transition-all bg-slate-50/50 relative">
              <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 px-1">รหัสผ่านปัจจุบัน</label>
              <input type="password" id="pwd-current" placeholder="••••••••" class="w-full bg-transparent text-sm font-bold text-slate-800 outline-none px-1 py-1 pwd-input" required>
              <button type="button" class="btn-toggle-pwd absolute right-2 top-1/2 -translate-y-1/4 p-2 text-slate-400 hover:text-brand-600">
                <i data-lucide="eye" class="w-4 h-4"></i>
              </button>
            </div>

          </div>

          <div class="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm overflow-hidden p-1">
            
            <!-- New Password -->
            <div class="p-3 border-b border-slate-100 native-input rounded-xl transition-all bg-slate-50/50 relative">
              <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 px-1">รหัสผ่านใหม่</label>
              <input type="password" id="pwd-new" placeholder="รหัสผ่านใหม่" class="w-full bg-transparent text-sm font-bold text-slate-800 outline-none px-1 py-1 pwd-input" required>
              <button type="button" class="btn-toggle-pwd absolute right-2 top-1/2 -translate-y-1/4 p-2 text-slate-400 hover:text-brand-600">
                <i data-lucide="eye" class="w-4 h-4"></i>
              </button>
            </div>

            <!-- Confirm New Password -->
            <div class="p-3 native-input rounded-xl transition-all bg-slate-50/50 relative">
              <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 px-1">ยืนยันรหัสผ่านใหม่</label>
              <input type="password" id="pwd-confirm" placeholder="กรอกรหัสผ่านใหม่อีกครั้ง" class="w-full bg-transparent text-sm font-bold text-slate-800 outline-none px-1 py-1 pwd-input" required>
            </div>

          </div>

        </form>
      </div>
    </div>

  </div> <!-- End App Container -->

  <!-- TOAST NOTIFICATION -->
  <div id="toast-container" class="fixed top-[max(1.5rem,var(--safe-top))] left-1/2 -translate-x-1/2 z-50 pointer-events-none w-[90%] max-w-[400px] hidden transition-all duration-300 transform -translate-y-4 opacity-0">
    <div class="bg-slate-800 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 w-full backdrop-blur-md bg-opacity-95">
      <div id="toast-icon-wrap" class="bg-brand-500/20 text-brand-400 p-1.5 rounded-full shrink-0">
        <i data-lucide="check" id="toast-icon" class="w-4 h-4"></i>
      </div>
      <p id="toast-message" class="text-sm font-bold flex-1">แจ้งเตือน</p>
    </div>
  </div>

  <!-- Application Logic -->
  <script>
    lucide.createIcons();

    /* ==========================================
       1. TOAST SYSTEM
       ========================================== */
    function showToast(msg, type = 'success') {
      const t = document.getElementById('toast-container');
      const iconWrap = document.getElementById('toast-icon-wrap');
      const icon = document.getElementById('toast-icon');
      
      document.getElementById('toast-message').innerText = msg;
      
      if(type === 'success') {
        iconWrap.className = 'bg-brand-500/20 text-brand-400 p-1.5 rounded-full shrink-0';
        icon.setAttribute('data-lucide', 'check');
      } else if(type === 'loading') {
        iconWrap.className = 'bg-slate-600 text-white p-1.5 rounded-full shrink-0 animate-spin';
        icon.setAttribute('data-lucide', 'loader-2');
      } else {
        iconWrap.className = 'bg-rose-500/20 text-rose-400 p-1.5 rounded-full shrink-0';
        icon.setAttribute('data-lucide', 'alert-circle');
      }
      lucide.createIcons();
      
      t.classList.remove('hidden');
      // Trigger reflow
      void t.offsetWidth; 
      t.classList.remove('-translate-y-4', 'opacity-0');
      
      if(type !== 'loading') {
        setTimeout(() => {
          t.classList.add('-translate-y-4', 'opacity-0');
          setTimeout(() => t.classList.add('hidden'), 300);
        }, 2500);
      }
      return t;
    }

    function hideToast() {
      const t = document.getElementById('toast-container');
      t.classList.add('-translate-y-4', 'opacity-0');
      setTimeout(() => t.classList.add('hidden'), 300);
    }


    /* ==========================================
       2. STACK NAVIGATION LOGIC
       ========================================== */
    const viewMain = document.getElementById('view-main');
    let activeSubView = null;

    // Push View (Slide in from right)
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetId = e.currentTarget.getAttribute('data-target');
        const targetView = document.getElementById(targetId);
        
        if(targetView) {
          activeSubView = targetView;
          targetView.classList.add('active');
          viewMain.classList.add('push-out'); // Parallax effect on main view
        }
      });
    });

    // Pop View (Slide out to right)
    document.querySelectorAll('.nav-back-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if(activeSubView) {
          activeSubView.classList.remove('active');
          viewMain.classList.remove('push-out');
          activeSubView = null;
        }
      });
    });


    /* ==========================================
       3. EDIT PROFILE FORM LOGIC
       ========================================== */
    const formProfile = document.getElementById('form-edit-profile');
    const btnSaveProfile = document.getElementById('btn-save-profile');
    
    // Store original values to detect changes
    const originalProfile = {
      phone: document.getElementById('input-phone').value,
      email: document.getElementById('input-email').value,
      line: document.getElementById('input-line').value,
      dept: document.getElementById('input-dept').value,
    };

    function checkProfileChanges() {
      const current = {
        phone: document.getElementById('input-phone').value,
        email: document.getElementById('input-email').value,
        line: document.getElementById('input-line').value,
        dept: document.getElementById('input-dept').value,
      };
      
      const isChanged = JSON.stringify(originalProfile) !== JSON.stringify(current);
      const isValid = formProfile.checkValidity();
      
      btnSaveProfile.disabled = !(isChanged && isValid);
    }

    // Add listeners to all inputs in the profile form
    formProfile.querySelectorAll('input, select').forEach(input => {
      input.addEventListener('input', checkProfileChanges);
      input.addEventListener('change', checkProfileChanges);
    });

    // Save Action
    btnSaveProfile.addEventListener('click', () => {
      // Unfocus keyboard
      document.activeElement.blur();
      
      const originalText = btnSaveProfile.innerHTML;
      btnSaveProfile.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>';
      lucide.createIcons();
      btnSaveProfile.disabled = true;

      // Simulate API Call
      setTimeout(() => {
        // Update originals to new values
        originalProfile.phone = document.getElementById('input-phone').value;
        originalProfile.email = document.getElementById('input-email').value;
        originalProfile.line = document.getElementById('input-line').value;
        originalProfile.dept = document.getElementById('input-dept').value;
        
        btnSaveProfile.innerHTML = 'บันทึก';
        checkProfileChanges(); // Should disable it now
        
        showToast('อัปเดตข้อมูลส่วนตัวเรียบร้อยแล้ว', 'success');
        
        // Auto go back after save
        setTimeout(() => {
          document.querySelector('#view-edit-profile .nav-back-btn').click();
        }, 1000);

      }, 1200);
    });


    /* ==========================================
       4. CHANGE PASSWORD FORM LOGIC
       ========================================== */
    const formPwd = document.getElementById('form-change-pwd');
    const btnSavePwd = document.getElementById('btn-save-pwd');
    const pwdCurrent = document.getElementById('pwd-current');
    const pwdNew = document.getElementById('pwd-new');
    const pwdConfirm = document.getElementById('pwd-confirm');

    // Toggle Password Visibility
    document.querySelectorAll('.btn-toggle-pwd').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const input = e.currentTarget.parentElement.querySelector('input');
        const icon = e.currentTarget.querySelector('i');
        
        if (input.type === 'password') {
          input.type = 'text';
          icon.setAttribute('data-lucide', 'eye-off');
        } else {
          input.type = 'password';
          icon.setAttribute('data-lucide', 'eye');
        }
        lucide.createIcons();
      });
    });

    function checkPwdValidity() {
      const v1 = pwdCurrent.value;
      const v2 = pwdNew.value;
      const v3 = pwdConfirm.value;
      
      // Basic checks: all filled, new length >= 8, new match confirm
      const isValid = v1.length > 0 && v2.length >= 8 && v2 === v3;
      btnSavePwd.disabled = !isValid;
    }

    formPwd.querySelectorAll('input').forEach(input => {
      input.addEventListener('input', checkPwdValidity);
    });

    // Save Pwd Action
    btnSavePwd.addEventListener('click', () => {
      document.activeElement.blur();
      
      showToast('กำลังตรวจสอบ...', 'loading');
      btnSavePwd.disabled = true;

      // Simulate API Call
      setTimeout(() => {
        hideToast();
        showToast('เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่', 'success');
        
        // Reset form
        formPwd.reset();
        checkPwdValidity();
        
        // Auto go back
        setTimeout(() => {
          document.querySelector('#view-change-password .nav-back-btn').click();
        }, 1500);

      }, 1500);
    });

  </script>
</body>
</html>
