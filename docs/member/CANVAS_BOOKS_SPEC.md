<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no">
  <title>ค้นหาหนังสือ - ANT Library</title>
  
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
    
    /* Mobile App Container */
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
    .fade-in { animation: fadeIn 0.3s ease-out forwards; }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* View Mode Transitions */
    .view-transition { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }

    /* Bottom Sheet Animation */
    .sheet-overlay {
      opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
    }
    .sheet-overlay.active { opacity: 1; pointer-events: auto; }
    
    .bottom-sheet {
      transform: translateY(100%); transition: transform 0.4s cubic-bezier(0.32, 0.72, 0, 1);
    }
    .bottom-sheet.active { transform: translateY(0); }

    /* Line Clamp */
    .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
  </style>
</head>
<body class="text-slate-800 antialiased">

  <div class="app-container">
    
    <!-- ==========================================
         1. STICKY HEADER & SEARCH
         ========================================== -->
    <header class="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-sm" style="padding-top: max(1rem, var(--safe-top))">
      <!-- Top Actions -->
      <div class="flex items-center justify-between px-4 pb-2">
        <h1 class="text-xl font-black text-slate-800 tracking-tight">ค้นหาหนังสือ</h1>
        <button class="pressable touch-target flex items-center justify-center w-10 h-10 rounded-full bg-slate-50 text-slate-600 hover:bg-slate-100 relative">
          <i data-lucide="bell" class="w-5 h-5"></i>
          <span class="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
        </button>
      </div>

      <!-- Search & View Toggle -->
      <div class="px-4 pb-3 flex gap-2 items-center">
        <div class="relative flex-1">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i data-lucide="search" class="w-5 h-5 text-slate-400"></i>
          </div>
          <input type="search" id="search-input" placeholder="ค้นหาชื่อหนังสือ, ผู้แต่ง..." class="bg-slate-100 border-none text-slate-800 text-sm font-bold rounded-2xl focus:ring-2 focus:ring-brand-500 block w-full pl-10 pr-3 py-3 outline-none transition-all placeholder:font-medium placeholder:text-slate-400">
        </div>
        <button id="btn-toggle-view" class="pressable touch-target w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 shrink-0">
          <i data-lucide="layout-list" id="view-icon" class="w-5 h-5"></i>
        </button>
      </div>

      <!-- Categories Filter (Horizontal Scroll) -->
      <div class="px-4 pb-3">
        <div class="flex gap-2 overflow-x-auto hide-scrollbar snap-x" id="category-chips">
          <button class="cat-chip active pressable touch-target shrink-0 px-4 py-2 bg-slate-800 text-white rounded-full font-bold text-[13px] shadow-md snap-start" data-cat="all">ทั้งหมด</button>
          <button class="cat-chip pressable touch-target shrink-0 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-full font-bold text-[13px] shadow-sm snap-start" data-cat="Technology">เทคโนโลยี</button>
          <button class="cat-chip pressable touch-target shrink-0 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-full font-bold text-[13px] shadow-sm snap-start" data-cat="Business">ธุรกิจ</button>
          <button class="cat-chip pressable touch-target shrink-0 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-full font-bold text-[13px] shadow-sm snap-start" data-cat="Design">การออกแบบ</button>
          <button class="cat-chip pressable touch-target shrink-0 px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-full font-bold text-[13px] shadow-sm snap-start" data-cat="Fiction">นิยาย</button>
        </div>
      </div>
    </header>

    <!-- ==========================================
         MAIN SCROLLABLE CONTENT
         ========================================== -->
    <main class="flex-1 overflow-y-auto overscroll-contain pb-28 hide-scrollbar" id="main-scroll">
      
      <div class="p-4 space-y-4">
        
        <!-- Business Hours Banner -->
        <article class="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-3 flex items-start gap-3 shadow-sm">
          <div class="bg-emerald-100 text-emerald-600 p-2 rounded-full shrink-0 mt-0.5">
            <i data-lucide="clock" class="w-4 h-4"></i>
          </div>
          <div>
            <p class="text-[13px] font-bold text-emerald-800 leading-tight">เวลารับหนังสือจอง & ติดต่อเจ้าหน้าที่</p>
            <p class="text-[11px] text-emerald-600/90 mt-1 font-semibold">จันทร์ - ศุกร์ | 08:30 - 16:30 น.</p>
          </div>
        </article>

        <!-- Dynamic Books Container (Grid or List) -->
        <div id="books-container" class="grid grid-cols-2 gap-3 view-transition">
          <!-- Book Cards injected via JS -->
        </div>

      </div>
    </main>

    <!-- ==========================================
         BOTTOM NAVIGATION
         ========================================== -->
    <nav class="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 z-40 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] max-w-[480px] mx-auto" style="padding-bottom: var(--safe-bottom)">
      <div class="flex justify-around items-center h-[68px] px-1">
        <a href="#" class="pressable touch-target flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-brand-600">
          <i data-lucide="layout-dashboard" class="w-[22px] h-[22px] mb-1"></i>
          <span class="text-[10px] font-bold">หน้าหลัก</span>
        </a>
        <!-- Active Tab in Bottom Nav -->
        <a href="#" class="pressable touch-target flex flex-col items-center justify-center w-full h-full text-brand-600">
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

    <!-- ==========================================
         BOTTOM SHEET (Detail Side Sheet equivalent for Mobile)
         ========================================== -->
    <div id="sheet-backdrop" class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 sheet-overlay max-w-[480px] mx-auto"></div>
    
    <div id="book-detail-sheet" class="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-[2rem] shadow-sheet bottom-sheet flex flex-col max-h-[90vh] max-w-[480px] mx-auto" style="padding-bottom: var(--safe-bottom)">
      <!-- Drag Handle -->
      <div class="w-full flex justify-center pt-3 pb-1 shrink-0" id="sheet-handle">
        <div class="w-12 h-1.5 bg-slate-200 rounded-full"></div>
      </div>
      
      <!-- Close Button (Top Right) -->
      <button id="btn-close-sheet" class="absolute top-3 right-4 w-8 h-8 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center pressable">
        <i data-lucide="x" class="w-5 h-5"></i>
      </button>

      <!-- Sheet Content (Scrollable) -->
      <div class="flex-1 overflow-y-auto hide-scrollbar px-5 pb-6">
        
        <!-- Book Header: Cover + Info -->
        <div class="flex gap-4 mt-4 mb-6">
          <div class="w-28 h-40 rounded-xl overflow-hidden shadow-md shrink-0 border border-slate-100 bg-slate-50">
            <img id="detail-cover" src="" class="w-full h-full object-cover mix-blend-multiply" alt="Book Cover">
          </div>
          <div class="flex flex-col pt-1">
            <span id="detail-cat" class="text-[10px] font-black text-brand-600 uppercase tracking-wide mb-1">หมวดหมู่</span>
            <h2 id="detail-title" class="text-xl font-black text-slate-800 leading-tight mb-1 line-clamp-3">ชื่อหนังสือ</h2>
            <p id="detail-author" class="text-sm font-semibold text-slate-500 mb-2">ผู้แต่ง</p>
            
            <div id="detail-status" class="mt-auto inline-flex">
              <!-- Status Badge injected here -->
            </div>
          </div>
        </div>

        <div class="h-px w-full bg-slate-100 my-4"></div>

        <!-- Synopsis -->
        <div>
          <h3 class="text-sm font-black text-slate-800 mb-2">เรื่องย่อ (Synopsis)</h3>
          <p id="detail-desc" class="text-sm text-slate-500 leading-relaxed font-medium">รายละเอียดเรื่องย่อของหนังสือ...</p>
        </div>

        <div class="h-px w-full bg-slate-100 my-4"></div>

        <!-- Physical Items / Inventory Status -->
        <div>
          <div class="flex justify-between items-end mb-3">
            <h3 class="text-sm font-black text-slate-800">รายการเล่มในห้องสมุด</h3>
            <span id="detail-inventory" class="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">ทั้งหมด 0 เล่ม</span>
          </div>
          
          <div class="bg-slate-50 rounded-2xl border border-slate-100 p-3 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="bg-white p-2 rounded-xl shadow-sm"><i data-lucide="library" class="w-5 h-5 text-brand-500"></i></div>
              <div>
                <p class="text-xs font-bold text-slate-800">ชั้นหนังสือหมวด <span id="detail-shelf">...</span></p>
                <p class="text-[10px] text-slate-500 mt-0.5">ค้นหาเล่มจริงได้ที่โซนนี้</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Actions (Fixed Bottom) -->
      <div class="p-4 border-t border-slate-100 bg-white flex gap-3 shrink-0">
        <button id="btn-reserve" class="pressable touch-target flex-1 bg-brand-50 text-brand-700 font-bold text-sm rounded-[1.25rem] py-4 flex items-center justify-center gap-2 transition-colors border border-brand-200 hover:bg-brand-100">
          <i data-lucide="calendar-plus" class="w-4 h-4"></i>
          จองหนังสือ
        </button>
        <button id="btn-borrow" class="pressable touch-target flex-1 bg-brand-600 text-white font-bold text-sm rounded-[1.25rem] py-4 flex items-center justify-center gap-2 transition-colors shadow-lg shadow-brand-500/20 hover:bg-brand-700">
          <i data-lucide="smartphone-nfc" class="w-4 h-4"></i>
          ยืมด้วยตนเอง
        </button>
      </div>
    </div>

  </div> <!-- End App Container -->

  <!-- TOAST NOTIFICATION -->
  <div id="toast-container" class="fixed top-[max(1.5rem,var(--safe-top))] left-1/2 -translate-x-1/2 z-50 pointer-events-none w-[90%] max-w-[400px] hidden">
    <div class="bg-slate-800 text-white px-5 py-3.5 rounded-2xl shadow-xl flex items-center gap-3 w-full backdrop-blur-md bg-opacity-95">
      <div class="bg-brand-500/20 text-brand-400 p-1.5 rounded-full shrink-0">
        <i data-lucide="check" id="toast-icon" class="w-4 h-4"></i>
      </div>
      <p id="toast-message" class="text-sm font-bold">แจ้งเตือน</p>
    </div>
  </div>

  <!-- Application Logic -->
  <script>
    lucide.createIcons();

    /* ==========================================
       1. STATE & MOCK DATA
       ========================================== */
    const STATE = {
      viewMode: 'grid', // 'grid' | 'list'
      activeCategory: 'all',
      searchQuery: '',
      catalog: [
        { id: 'b1', title: 'The Design of Everyday Things', author: 'Don Norman', cat: 'Design', available: 2, total: 3, cover: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&w=300&q=80', desc: 'Even the smartest among us can feel inept as we fail to figure out which light switch or oven burner to turn on, or whether to push, pull, or slide a door.' },
        { id: 'b2', title: 'Sapiens: A Brief History', author: 'Yuval Noah Harari', cat: 'Technology', available: 0, total: 2, cover: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=300&q=80', desc: 'From a renowned historian comes a groundbreaking narrative of humanity’s creation and evolution—a #1 international bestseller.' },
        { id: 'b3', title: 'Atomic Habits', author: 'James Clear', cat: 'Business', available: 5, total: 5, cover: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?auto=format&fit=crop&w=300&q=80', desc: 'No matter your goals, Atomic Habits offers a proven framework for improving--every day. James Clear, one of the world\'s leading experts on habit formation.' },
        { id: 'b4', title: 'Clean Code', author: 'Robert C. Martin', cat: 'Technology', available: 1, total: 4, cover: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=300&q=80', desc: 'Even bad code can function. But if code isn\'t clean, it can bring a development organization to its knees. Every year, countless hours and significant resources are lost because of poorly written code.' },
        { id: 'b5', title: 'Think Again', author: 'Adam Grant', cat: 'Business', available: 3, total: 3, cover: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=300&q=80', desc: 'Discover the critical art of rethinking: learning to question your opinions and open other people\'s minds, which can position you for excellence at work and wisdom in life.' },
        { id: 'b6', title: 'Dune', author: 'Frank Herbert', cat: 'Fiction', available: 0, total: 1, cover: 'https://images.unsplash.com/photo-1614729939124-032f0b56c9ce?auto=format&fit=crop&w=300&q=80', desc: 'Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world where the only thing of value is the "spice" melange.' },
      ],
      filtered: [],
      selectedBook: null
    };

    /* ==========================================
       2. HELPER FUNCTIONS
       ========================================== */
    function getStatusUI(available, total) {
      if (available > 0) {
        return `<span class="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md text-[10px] font-black tracking-wide">ว่าง (${available}/${total})</span>`;
      } else {
        return `<span class="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-[10px] font-black tracking-wide">ถูกยืมทั้งหมด</span>`;
      }
    }

    function showToast(msg) {
      const t = document.getElementById('toast-container');
      document.getElementById('toast-message').innerText = msg;
      t.classList.remove('hidden');
      t.style.animation = 'none'; void t.offsetWidth; 
      t.style.animation = 'fadeIn 0.3s ease-out forwards';
      setTimeout(() => t.classList.add('hidden'), 3000);
    }

    /* ==========================================
       3. RENDER LOGIC
       ========================================== */
    const booksContainer = document.getElementById('books-container');

    function renderSkeleton() {
      if (STATE.viewMode === 'grid') {
        booksContainer.className = 'grid grid-cols-2 gap-3 view-transition';
        booksContainer.innerHTML = Array(4).fill(0).map(() => `
          <div class="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex flex-col h-full">
            <div class="skeleton-box w-full aspect-[2/3] rounded-xl mb-3"></div>
            <div class="skeleton-box w-3/4 h-3 mb-2"></div>
            <div class="skeleton-box w-1/2 h-2 mb-2"></div>
          </div>
        `).join('');
      } else {
        booksContainer.className = 'flex flex-col gap-3 view-transition';
        booksContainer.innerHTML = Array(4).fill(0).map(() => `
          <div class="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex gap-3">
            <div class="skeleton-box w-16 h-24 rounded-lg shrink-0"></div>
            <div class="flex-1 py-1 flex flex-col">
              <div class="skeleton-box w-3/4 h-4 mb-2"></div>
              <div class="skeleton-box w-1/2 h-3 mb-auto"></div>
              <div class="skeleton-box w-1/4 h-4 mt-2"></div>
            </div>
          </div>
        `).join('');
      }
    }

    function applyFilters() {
      const q = STATE.searchQuery.toLowerCase();
      STATE.filtered = STATE.catalog.filter(book => {
        const matchCat = STATE.activeCategory === 'all' || book.cat === STATE.activeCategory;
        const matchSearch = book.title.toLowerCase().includes(q) || book.author.toLowerCase().includes(q);
        return matchCat && matchSearch;
      });
      renderBooks();
    }

    function renderBooks() {
      if (STATE.filtered.length === 0) {
        booksContainer.className = 'flex flex-col gap-3 view-transition';
        booksContainer.innerHTML = `
          <div class="py-16 flex flex-col items-center justify-center text-center fade-in">
            <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
              <i data-lucide="search-x" class="w-8 h-8 text-slate-300"></i>
            </div>
            <p class="font-bold text-slate-600 text-lg">ไม่พบหนังสือที่ค้นหา</p>
            <p class="text-sm text-slate-400 mt-1">ลองเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่ใหม่</p>
          </div>
        `;
        lucide.createIcons();
        return;
      }

      if (STATE.viewMode === 'grid') {
        booksContainer.className = 'grid grid-cols-2 gap-3 view-transition';
        booksContainer.innerHTML = STATE.filtered.map(book => `
          <button class="book-card pressable bg-white rounded-2xl p-2.5 border border-slate-100 shadow-card flex flex-col h-full text-left fade-in group" data-id="${book.id}">
            <div class="w-full aspect-[2/3] rounded-xl overflow-hidden bg-slate-50 relative border border-slate-100 mb-2.5">
              <img src="${book.cover}" class="w-full h-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-500" alt="cover">
              <div class="absolute top-2 right-2">${getStatusUI(book.available, book.total)}</div>
            </div>
            <h3 class="font-bold text-slate-800 text-[13px] leading-tight line-clamp-2 mb-1 px-1">${book.title}</h3>
            <p class="text-[11px] font-semibold text-slate-400 px-1 mt-auto line-clamp-1">${book.author}</p>
          </button>
        `).join('');
      } else {
        // List Mode
        booksContainer.className = 'flex flex-col gap-3 view-transition';
        booksContainer.innerHTML = STATE.filtered.map(book => `
          <button class="book-card pressable bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex gap-3 text-left fade-in" data-id="${book.id}">
            <div class="w-16 h-24 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
              <img src="${book.cover}" class="w-full h-full object-cover mix-blend-multiply" alt="cover">
            </div>
            <div class="flex-1 flex flex-col min-w-0 py-0.5">
              <h3 class="font-bold text-slate-800 text-sm leading-tight line-clamp-2 mb-1">${book.title}</h3>
              <p class="text-[11px] font-semibold text-slate-400 mb-1">${book.author}</p>
              <p class="text-[10px] font-bold text-brand-500 uppercase tracking-wide mb-auto">${book.cat}</p>
              <div class="mt-2">${getStatusUI(book.available, book.total)}</div>
            </div>
          </button>
        `).join('');
      }
      
      // Attach detail listeners
      document.querySelectorAll('.book-card').forEach(btn => {
        btn.addEventListener('click', (e) => {
          if(navigator.vibrate) navigator.vibrate(50);
          const id = e.currentTarget.getAttribute('data-id');
          openDetailSheet(id);
        });
      });
      lucide.createIcons();
    }

    /* ==========================================
       4. BOTTOM SHEET LOGIC (Model 4)
       ========================================== */
    const sheetOverlay = document.getElementById('sheet-backdrop');
    const bottomSheet = document.getElementById('book-detail-sheet');
    const btnCloseSheet = document.getElementById('btn-close-sheet');

    function openDetailSheet(id) {
      const book = STATE.catalog.find(b => b.id === id);
      if(!book) return;
      STATE.selectedBook = book;

      // Populate Data
      document.getElementById('detail-cover').src = book.cover;
      document.getElementById('detail-title').innerText = book.title;
      document.getElementById('detail-author').innerText = book.author;
      document.getElementById('detail-cat').innerText = book.cat;
      document.getElementById('detail-desc').innerText = book.desc;
      document.getElementById('detail-inventory').innerText = `ทั้งหมด ${book.total} เล่ม`;
      document.getElementById('detail-shelf').innerText = book.cat;
      
      const statusWrap = document.getElementById('detail-status');
      if(book.available > 0) {
        statusWrap.innerHTML = `<span class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5"><i data-lucide="check-circle-2" class="w-4 h-4"></i> พร้อมให้บริการ (${book.available} เล่ม)</span>`;
      } else {
        statusWrap.innerHTML = `<span class="bg-rose-100 text-rose-700 px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5"><i data-lucide="x-circle" class="w-4 h-4"></i> ถูกยืมทั้งหมด</span>`;
      }
      lucide.createIcons();

      // Show Sheet
      sheetOverlay.classList.add('active');
      bottomSheet.classList.add('active');
      document.body.style.overflow = 'hidden'; // Prevent bg scrolling
    }

    function closeDetailSheet() {
      sheetOverlay.classList.remove('active');
      bottomSheet.classList.remove('active');
      document.body.style.overflow = '';
      STATE.selectedBook = null;
    }

    sheetOverlay.addEventListener('click', closeDetailSheet);
    btnCloseSheet.addEventListener('click', closeDetailSheet);
    
    // Quick Actions in Sheet
    document.getElementById('btn-reserve').addEventListener('click', () => {
      showToast(`ส่งคำขอจอง ${STATE.selectedBook.title} แล้ว`);
      closeDetailSheet();
    });
    
    document.getElementById('btn-borrow').addEventListener('click', () => {
      if(STATE.selectedBook.available > 0) {
        showToast(`กำลังพาไปหน้ายืมด้วยตนเอง...`);
        // Mock navigation delay
        setTimeout(() => closeDetailSheet(), 800);
      } else {
        showToast(`ขออภัย หนังสือถูกยืมหมดแล้ว`);
      }
    });

    /* ==========================================
       5. INTERACTIONS & LISTENERS
       ========================================== */
    
    // View Toggle
    const btnToggleView = document.getElementById('btn-toggle-view');
    const viewIcon = document.getElementById('view-icon');
    
    btnToggleView.addEventListener('click', () => {
      STATE.viewMode = STATE.viewMode === 'grid' ? 'list' : 'grid';
      viewIcon.setAttribute('data-lucide', STATE.viewMode === 'grid' ? 'layout-list' : 'layout-grid');
      lucide.createIcons();
      renderBooks();
      if(navigator.vibrate) navigator.vibrate(30);
    });

    // Category Chips
    const catChips = document.querySelectorAll('.cat-chip');
    catChips.forEach(chip => {
      chip.addEventListener('click', (e) => {
        // Active Styling
        catChips.forEach(c => {
          c.classList.remove('bg-slate-800', 'text-white', 'shadow-md', 'active');
          c.classList.add('bg-white', 'text-slate-600', 'shadow-sm');
        });
        e.currentTarget.classList.remove('bg-white', 'text-slate-600', 'shadow-sm');
        e.currentTarget.classList.add('bg-slate-800', 'text-white', 'shadow-md', 'active');
        
        // Scroll into view logic for chip
        e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });

        STATE.activeCategory = e.currentTarget.getAttribute('data-cat');
        applyFilters();
      });
    });

    // Search (Debounced)
    const searchInput = document.getElementById('search-input');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        STATE.searchQuery = e.target.value;
        applyFilters();
      }, 300); // 300ms debounce
    });

    // Initial Load
    renderSkeleton();
    setTimeout(() => {
      applyFilters();
    }, 500);

  </script>
</body>
</html>
