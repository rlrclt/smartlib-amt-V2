# Canvas Spec: Manage Dashboard (UX/UI Blueprint 2026) - Full Edition

เอกสารสเปคฉบับสมบูรณ์สำหรับหน้า **Manage Dashboard (`/manage`)** รวมข้อมูลจากระบบจริงและมาตรฐานการออกแบบสูงสุด

---

## 1. Global Shell & Navigation (โครงสร้างหุ้มหน้าจอ)

หน้า Dashboard ไม่ได้อยู่โดดๆ แต่ถูกหุ้มด้วย `manage_shell.js` ซึ่งมีองค์ประกอบดังนี้:

### 1.1 Sidebar (Navigation)
*   **Brand Row**: โลโก้ SmartLib + ชื่อระบบ
*   **Menu Groups**:
    *   **Main**: Dashboard
    *   **Books & Inventory**: จัดการหนังสือ, ลงทะเบียน, คลังรหัสเล่ม, พิมพ์บาร์โค้ด
    *   **Users**: จัดการสมาชิก, Import
    *   **Loans & Fines**: รายการยืม-คืน, จัดการค่าปรับ
    *   **Settings**: ตั้งค่าระบบ, นโยบาย, เวลาทำการ
*   **Behavior**: ย่อได้ (Collapsed) เหลือแต่ไอคอน. บน Mobile จะเป็นลิ้นชัก (Drawer) หรือหายไปแล้วใช้ Hamburger แทน

### 1.2 Global Header
*   **Sidebar Toggle**: ปุ่มเปิด/ปิด Sidebar (Lucide: `panel-left-close` / `panel-left-open`)
*   **Breadcrumb**: "Admin > **Dashboard**" (ใช้ `text-sky-600` สำหรับหน้าปัจจุบัน)
*   **Search Bar**: ช่องค้นหาพร้อมไอคอน `search` (พื้นหลัง `slate-100`, focus แล้วเป็นสีขาวขอบฟ้า)
*   **Notification Hub**: ไอคอนระฆังพร้อมเลข Badge สีแดง (Rose) และแผงรายการแจ้งเตือน (Noti Panel)
*   **User Profile**: ชื่อผู้ใช้ + บทบาท (Role) + รูป Profile/Initial ในกรอบมน

---

## 2. Dashboard Element Inventory (ข้อมูลภายในหน้า)

### 2.1 Summary Stat Cards (5 Cards - High Priority)
| หมวด | ไอคอน Lucide | โทนสี (Tailwind) | ความหมาย |
|---|---|---|---|
| Active Loans | `book-marked` | `sky` | ยืมค้างอยู่ |
| Overdue Books | `alert-triangle` | `rose` | เกินกำหนด |
| Available Items | `package-check` | `emerald` | เล่มที่ว่าง |
| Pending Fines | `wallet` | `amber` | ค่าปรับค้าง |
| Active Visitors | `users-round` | `cyan` | คนในห้องสมุด |

### 2.2 Pending Tasks & Activities
*   **Lists**: ออกแบบเป็น Card ซ้อนในคอลัมน์. แต่ละรายการมี Title เข้ม และ Subtitle เทา
*   **Status Badges**: ใช้ `rounded-full` พร้อมพื้นสีอ่อนและตัวอักษรสีเข้ม (เช่น `bg-emerald-50 text-emerald-700`)

---

## 3. Technical Specs & Tokens (ค่ากำหนดทางเทคนิค)

### 3.1 Gradients & Shadows
*   **Primary Card Gradient**: `from-sky-50 to-white` (ไล่จากฟ้าอ่อนด้านบนลงมาขาวด้านล่าง)
*   **Global Shadow**: `shadow-sm` (นุ่มนวล) หรือ `shadow-md` สำหรับ Interaction (Hover)
*   **Border Color**: `border-slate-200/60` หรือ `border-sky-100` สำหรับการ์ดสถิติ

### 3.2 Spacing & Target (Native Standard)
*   **Padding**: Card หลักใช้ `p-5` (20px) หรือ `p-6` (24px)
*   **Gap**: ระหว่าง Card ใน Grid ใช้ `gap-4` (16px)
*   **Touch Target**: ปุ่ม Quick Action ต้องสูง `min-h-[44px]`

---

## 4. Interaction States (พฤติกรรมตอบสนอง)

### 4.1 Skeleton State (ตอนโหลด)
*   ใช้รูปทรงเดียวกับ Card จริง แต่เป็นพื้นสีเทาอ่อน `bg-slate-100` สลับกับ `bg-slate-50`
*   Animation: `animate-pulse` (วูบวาบช้าๆ)

### 4.2 Hover & Active
*   **Card Hover**: ขยับขึ้นเล็กน้อย `-translate-y-1` + เงาเข้มขึ้น `shadow-md`
*   **Button Active**: ยุบตัวลง `scale-95` (Native Feel)

---

## 5. Code Sample Reference

### การทำ Layout 2 คอลัมน์ (Desktop)
```javascript
<section class="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
  <article>Recent Activities (กว้างกว่า)</article>
  <article>Quick Actions (แคบกว่า)</article>
</section>
```

---

## 6. Checklist สุดท้ายก่อนสร้าง Canvas
- [ ] มี Sidebar ครบทุกเมนู และสามารถจำลองสถานะหด/ขยายได้
- [ ] Header มีระบบ Breadcrumb, Search, และ Notification
- [ ] Stat Cards ทั้ง 5 ใบ มีสีและไอคอนตรงตามหมวดหมู่
- [ ] มีส่วน Pending Tasks 3 คอลัมน์ และ Quick Actions 1 คอลัมน์
- [ ] ออกแบบ UI เผื่อสถานะ "ไม่มีข้อมูล" (Empty State) เป็นกล่องขอบประ
- [ ] ใช้ระบบสีและฟอนต์ (Bai Jamjuree) ตาม `THEME_ANALYSIS.md`
- [ ] ระยะ Spacing ลงตัวตาม 8-point Grid (8, 16, 24, 32...)


## 7. Checklist สุดท้ายก่อนสร้าง Canvas
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <!-- Native App Viewport & Safe Area -->
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no">
  <title>Manage Dashboard - Native Web App</title>
  
  <!-- Fonts: Bai Jamjuree -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  
  <!-- Tailwind CSS -->
  <script src="https://cdn.tailwindcss.com"></script>
  
  <!-- Lucide Icons -->
  <script src="https://unpkg.com/lucide@latest"></script>

  <!-- Tailwind Config based on THEME_ANALYSIS.md -->
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: {
            sans: ['"Bai Jamjuree"', 'sans-serif'],
          },
          colors: {
            brand: {
              50: '#F0F9FF', 100: '#E0F2FE', 200: '#BAE6FD', 300: '#7DD3FC',
              500: '#0EA5E9', 600: '#0284C7', 700: '#0369A1', 900: '#0C4A6E',
            },
            surface: {
              bg: '#F7FBFF', card: '#FFFFFF'
            }
          },
          boxShadow: {
            'soft': '0 8px 30px rgba(0, 0, 0, 0.03)',
            'native': '0 2px 10px rgba(0, 0, 0, 0.02), 0 16px 32px rgba(0, 0, 0, 0.04)',
          }
        }
      }
    }
  </script>

  <style>
    /* Safe Area Variables */
    :root {
      --safe-top: env(safe-area-inset-top, 0px);
      --safe-bottom: env(safe-area-inset-bottom, 0px);
    }

    body {
      background-color: theme('colors.surface.bg');
      -webkit-tap-highlight-color: transparent; 
      overscroll-behavior-y: none; 
    }

    /* Native Press Feedback & Touch Targets */
    .pressable {
      transition: transform 0.15s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.15s ease, background-color 0.15s ease;
      cursor: pointer;
      user-select: none;
    }
    .pressable:active {
      transform: scale(0.96);
      opacity: 0.8;
    }
    /* Guarantee touch target size */
    .touch-target {
      min-height: 48px;
      min-width: 48px;
    }

    /* Scrollbars */
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

    /* Skeleton Loading Animation */
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .skeleton-box {
      background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 8px;
    }

    /* State Management */
    .is-loading .real-data { display: none !important; opacity: 0; }
    .is-loading .skeleton-data { display: block !important; }
    body:not(.is-loading) .skeleton-data { display: none !important; }
    
    /* Reveal Animation for data */
    .real-data {
      animation: fadeIn 0.3s ease-out forwards;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }
  </style>
</head>
<body class="flex h-[100dvh] text-slate-800 antialiased is-loading">

  <!-- ==========================================
       SIDEBAR (Desktop Only - xl) / Tablet Collapsed (md)
       ========================================== -->
  <aside class="hidden md:flex flex-col w-20 xl:w-64 bg-white border-r border-slate-100 z-40 shadow-[4px_0_24px_rgba(0,0,0,0.02)] shrink-0 transition-all duration-300">
    <!-- Logo -->
    <div class="h-20 flex items-center justify-center xl:justify-start xl:px-6 border-b border-slate-50">
      <div class="w-10 h-10 bg-gradient-to-br from-brand-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-brand-500/30">
        A
      </div>
      <span class="hidden xl:block ml-3 font-black text-xl text-brand-900 tracking-tight truncate">ANT Library</span>
    </div>
    
    <!-- Nav Links -->
    <nav class="flex-1 py-6 px-3 flex flex-col gap-2">
      <a href="#" class="flex items-center justify-center xl:justify-start gap-3 px-3 py-3 xl:px-4 xl:py-3.5 bg-brand-50 text-brand-700 rounded-2xl font-bold transition-colors">
        <i data-lucide="layout-dashboard" class="w-5 h-5 shrink-0"></i>
        <span class="hidden xl:block truncate">Command Center</span>
      </a>
      <a href="#" class="flex items-center justify-center xl:justify-start gap-3 px-3 py-3 xl:px-4 xl:py-3.5 text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-2xl font-semibold transition-colors">
        <i data-lucide="book-open" class="w-5 h-5 shrink-0"></i>
        <span class="hidden xl:block truncate">จัดการหนังสือ</span>
      </a>
      <a href="#" class="flex items-center justify-center xl:justify-start gap-3 px-3 py-3 xl:px-4 xl:py-3.5 text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-2xl font-semibold transition-colors">
        <i data-lucide="users" class="w-5 h-5 shrink-0"></i>
        <span class="hidden xl:block truncate">สมาชิก</span>
      </a>
    </nav>
  </aside>

  <!-- ==========================================
       MAIN CONTENT AREA
       ========================================== -->
  <main class="flex-1 flex flex-col h-full relative overflow-x-hidden">
    
    <!-- Scrollable Body -->
    <div class="flex-1 overflow-y-auto overscroll-contain hide-scrollbar pb-24 md:pb-12" id="main-scroll">
      
      <!-- SECTION 1: Header (Sticky on Mobile) -->
      <header class="sticky top-0 z-30 bg-surface-bg/90 backdrop-blur-xl md:static md:bg-transparent md:backdrop-blur-none px-4 md:px-8 py-4 md:pt-8 md:pb-2 border-b border-slate-200/50 md:border-none" style="padding-top: max(1rem, var(--safe-top))">
        <div class="max-w-[1600px] mx-auto flex flex-row items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl md:text-3xl xl:text-4xl font-black text-slate-900 tracking-tight">Command Center</h1>
            <div class="flex items-center gap-2 mt-0.5 md:mt-1">
              <span class="relative flex h-2 w-2 md:h-2.5 md:w-2.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full bg-emerald-500 w-full h-full"></span>
              </span>
              <p class="text-xs md:text-sm text-slate-500 font-medium">
                เชื่อมต่อแล้ว • อัปเดต <span id="last-update" class="real-data">10:45 น.</span>
                <span class="skeleton-data skeleton-box w-12 h-3 inline-block align-middle ml-1"></span>
              </p>
            </div>
          </div>
          
          <button id="refresh-btn" class="pressable touch-target flex items-center justify-center p-3 md:px-5 md:py-2.5 bg-white border border-slate-200 text-slate-700 rounded-full font-bold shadow-sm hover:border-brand-300 hover:text-brand-600 transition-all shrink-0">
            <i data-lucide="refresh-cw" class="w-5 h-5 md:w-4 md:h-4 md:mr-2" id="refresh-icon"></i>
            <span class="hidden md:inline">อัปเดตข้อมูล</span>
          </button>
        </div>
      </header>

      <div class="max-w-[1600px] mx-auto space-y-6 md:space-y-8 mt-4 md:mt-6">
        
        <!-- SECTION 2: Summary Cards (5 Cards) -->
        <section class="px-0 md:px-8">
          <div class="flex overflow-x-auto px-4 md:px-0 gap-4 snap-x snap-mandatory hide-scrollbar md:grid md:grid-cols-2 xl:grid-cols-5 pb-2">
            
            <!-- 1. Overdue (High Priority) -->
            <div class="pressable shrink-0 w-[85%] sm:w-[300px] md:w-auto snap-center bg-white rounded-3xl p-5 md:p-6 border-2 border-rose-100 shadow-native relative overflow-hidden group">
              <div class="absolute -right-6 -top-6 w-24 h-24 bg-rose-50 rounded-full blur-2xl transition-colors"></div>
              <div class="flex justify-between items-start relative z-10">
                <div class="p-3 bg-rose-100 text-rose-600 rounded-2xl"><i data-lucide="alert-circle" class="w-6 h-6"></i></div>
                <span class="px-2.5 py-1 bg-rose-50 text-rose-600 text-xs font-bold rounded-lg">+3 วันนี้</span>
              </div>
              <div class="mt-4 relative z-10">
                <p class="text-slate-500 font-medium text-sm">หนังสือเลยกำหนด</p>
                <div class="flex items-baseline gap-2 mt-1">
                  <h3 class="text-4xl font-black text-slate-900 real-data">24</h3>
                  <div class="skeleton-data skeleton-box w-16 h-10"></div>
                  <span class="text-slate-500 font-medium real-data">เล่ม</span>
                </div>
              </div>
            </div>

            <!-- 2. Active Loans -->
            <div class="pressable shrink-0 w-[85%] sm:w-[300px] md:w-auto snap-center bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-soft relative overflow-hidden">
              <div class="flex justify-between items-start">
                <div class="p-3 bg-brand-50 text-brand-600 rounded-2xl"><i data-lucide="book-up-2" class="w-6 h-6"></i></div>
              </div>
              <div class="mt-4">
                <p class="text-slate-500 font-medium text-sm">กำลังถูกยืม</p>
                <div class="flex items-baseline gap-2 mt-1">
                  <h3 class="text-4xl font-black text-slate-900 real-data">186</h3>
                  <div class="skeleton-data skeleton-box w-20 h-10"></div>
                  <span class="text-slate-500 font-medium real-data">เล่ม</span>
                </div>
              </div>
            </div>

            <!-- 3. Available -->
            <div class="pressable shrink-0 w-[85%] sm:w-[300px] md:w-auto snap-center bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-soft relative overflow-hidden">
              <div class="flex justify-between items-start">
                <div class="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><i data-lucide="check-circle-2" class="w-6 h-6"></i></div>
              </div>
              <div class="mt-4">
                <p class="text-slate-500 font-medium text-sm">พร้อมให้บริการ</p>
                <div class="flex items-baseline gap-2 mt-1">
                  <h3 class="text-4xl font-black text-slate-900 real-data">1,204</h3>
                  <div class="skeleton-data skeleton-box w-24 h-10"></div>
                </div>
              </div>
            </div>

            <!-- 4. Pending Fines -->
            <div class="pressable shrink-0 w-[85%] sm:w-[300px] md:w-auto snap-center bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-soft relative overflow-hidden">
              <div class="flex justify-between items-start">
                <div class="p-3 bg-amber-50 text-amber-600 rounded-2xl"><i data-lucide="coins" class="w-6 h-6"></i></div>
              </div>
              <div class="mt-4">
                <p class="text-slate-500 font-medium text-sm">ค่าปรับรอดำเนินการ</p>
                <div class="flex items-baseline gap-1 mt-1">
                  <span class="text-slate-500 font-medium text-xl real-data">฿</span>
                  <h3 class="text-4xl font-black text-slate-900 real-data">450</h3>
                  <div class="skeleton-data skeleton-box w-20 h-10"></div>
                </div>
              </div>
            </div>

            <!-- 5. Active Visitors -->
            <div class="pressable shrink-0 w-[85%] sm:w-[300px] md:w-auto snap-center bg-white rounded-3xl p-5 md:p-6 border border-slate-100 shadow-soft relative overflow-hidden md:col-span-2 xl:col-span-1">
              <div class="flex justify-between items-start">
                <div class="p-3 bg-cyan-50 text-cyan-600 rounded-2xl"><i data-lucide="users" class="w-6 h-6"></i></div>
                <span class="flex items-center gap-1 px-2.5 py-1 bg-cyan-50 text-cyan-700 text-xs font-bold rounded-lg"><i data-lucide="trending-up" class="w-3 h-3"></i> 12%</span>
              </div>
              <div class="mt-4">
                <p class="text-slate-500 font-medium text-sm">ผู้เข้าใช้บริการ (วันนี้)</p>
                <div class="flex items-baseline gap-2 mt-1">
                  <h3 class="text-4xl font-black text-slate-900 real-data">42</h3>
                  <div class="skeleton-data skeleton-box w-16 h-10"></div>
                  <span class="text-slate-500 font-medium real-data">คน</span>
                </div>
              </div>
            </div>

          </div>
        </section>

        <!-- SECTION 3: Snapshot Strip (Compact sub-cards) -->
        <section class="px-4 md:px-8">
          <div class="flex md:grid md:grid-cols-4 gap-3 overflow-x-auto hide-scrollbar bg-white rounded-[2rem] p-2 md:p-3 border border-slate-100 shadow-soft">
            <div class="flex items-center gap-3 px-4 py-2 shrink-0 border-r border-slate-100 last:border-0">
              <div class="w-2 h-2 rounded-full bg-brand-500"></div>
              <div>
                <p class="text-xs text-slate-400 font-medium">ยืมวันนี้</p>
                <p class="text-sm font-bold text-slate-700 real-data">45 เล่ม</p>
                <div class="skeleton-data skeleton-box w-12 h-4 mt-0.5"></div>
              </div>
            </div>
            <div class="flex items-center gap-3 px-4 py-2 shrink-0 border-r border-slate-100 last:border-0">
              <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
              <div>
                <p class="text-xs text-slate-400 font-medium">คืนวันนี้</p>
                <p class="text-sm font-bold text-slate-700 real-data">32 เล่ม</p>
                <div class="skeleton-data skeleton-box w-12 h-4 mt-0.5"></div>
              </div>
            </div>
            <div class="flex items-center gap-3 px-4 py-2 shrink-0 border-r border-slate-100 last:border-0">
              <div class="w-2 h-2 rounded-full bg-amber-500"></div>
              <div>
                <p class="text-xs text-slate-400 font-medium">สมาชิกรอคิว</p>
                <p class="text-sm font-bold text-slate-700 real-data">4 คิว</p>
                <div class="skeleton-data skeleton-box w-12 h-4 mt-0.5"></div>
              </div>
            </div>
            <div class="flex items-center gap-3 px-4 py-2 shrink-0">
              <div class="w-2 h-2 rounded-full bg-rose-500"></div>
              <div>
                <p class="text-xs text-slate-400 font-medium">แจ้งซ่อม</p>
                <p class="text-sm font-bold text-slate-700 real-data">1 รายการ</p>
                <div class="skeleton-data skeleton-box w-12 h-4 mt-0.5"></div>
              </div>
            </div>
          </div>
        </section>

        <!-- SECTION 4: Pending Tasks -->
        <section class="px-0 md:px-8 space-y-4">
          <div class="px-4 md:px-0 flex items-center justify-between">
            <h2 class="text-lg font-bold text-slate-800 flex items-center gap-2">
              <i data-lucide="bell-ring" class="w-5 h-5 text-brand-500"></i>
              สิ่งที่ต้องจัดการ
            </h2>
          </div>

          <!-- Mobile Tabs -->
          <div class="md:hidden flex gap-2 overflow-x-auto hide-scrollbar px-4 mb-2">
            <button class="touch-target px-5 py-2 bg-slate-800 text-white rounded-full font-bold text-sm shrink-0 pressable shadow-md">ทั้งหมด <span class="bg-white/20 px-1.5 py-0.5 rounded-md ml-1 real-data">3</span></button>
            <button class="touch-target px-5 py-2 bg-white text-slate-600 border border-slate-200 rounded-full font-bold text-sm shrink-0 pressable">จองหนังสือ <span class="text-slate-400 ml-1 real-data">2</span></button>
            <button class="touch-target px-5 py-2 bg-white text-slate-600 border border-slate-200 rounded-full font-bold text-sm shrink-0 pressable">ยืนยันสมาชิก <span class="text-slate-400 ml-1 real-data">1</span></button>
          </div>

          <!-- Tasks Grid (Desktop 3 Cols / Mobile Feed) -->
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4 px-4 md:px-0">
            <!-- Task 1 -->
            <div class="pressable bg-white p-4 md:p-5 rounded-[1.5rem] border border-slate-100 shadow-soft flex gap-4 items-start">
              <div class="bg-brand-50 p-3 rounded-2xl text-brand-600 shrink-0"><i data-lucide="inbox" class="w-6 h-6"></i></div>
              <div class="flex-1 min-w-0 pt-0.5">
                <h4 class="font-bold text-slate-800 text-base truncate real-data">เตรียมหนังสือจอง (2 เล่ม)</h4>
                <div class="skeleton-data skeleton-box w-full h-5 mb-1"></div>
                <p class="text-sm text-slate-500 truncate real-data">รับวันนี้ 15:00 น. (นายสมชาย)</p>
                <div class="skeleton-data skeleton-box w-3/4 h-4"></div>
              </div>
            </div>
            <!-- Task 2 -->
            <div class="pressable bg-white p-4 md:p-5 rounded-[1.5rem] border border-slate-100 shadow-soft flex gap-4 items-start">
              <div class="bg-amber-50 p-3 rounded-2xl text-amber-600 shrink-0"><i data-lucide="user-check" class="w-6 h-6"></i></div>
              <div class="flex-1 min-w-0 pt-0.5">
                <h4 class="font-bold text-slate-800 text-base truncate real-data">ยืนยันสมาชิกใหม่</h4>
                <div class="skeleton-data skeleton-box w-full h-5 mb-1"></div>
                <p class="text-sm text-slate-500 truncate real-data">รอตรวจสอบ 4 รายการ</p>
                <div class="skeleton-data skeleton-box w-1/2 h-4"></div>
              </div>
            </div>
            <!-- Task 3 -->
            <div class="pressable bg-white p-4 md:p-5 rounded-[1.5rem] border border-rose-100 shadow-soft flex gap-4 items-start bg-rose-50/30">
              <div class="bg-rose-100 p-3 rounded-2xl text-rose-600 shrink-0"><i data-lucide="book-x" class="w-6 h-6"></i></div>
              <div class="flex-1 min-w-0 pt-0.5">
                <h4 class="font-bold text-slate-800 text-base truncate real-data">หนังสือชำรุดรอซ่อม</h4>
                <div class="skeleton-data skeleton-box w-full h-5 mb-1"></div>
                <p class="text-sm text-rose-500/80 truncate font-medium real-data">Barcode: 88500213</p>
                <div class="skeleton-data skeleton-box w-1/2 h-4"></div>
              </div>
            </div>
          </div>
        </section>

        <!-- SECTION 5 & 6: Activities & Quick Actions Split -->
        <div class="px-4 md:px-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-6">
          
          <!-- SECTION 5: Recent Activities (Span 1 on iPad, 2 on Desktop) -->
          <section class="md:col-span-1 xl:col-span-2 flex flex-col h-full">
            <div class="flex justify-between items-center mb-4 px-1">
              <h2 class="text-lg font-bold text-slate-800">กิจกรรมล่าสุด</h2>
              <a href="#" class="touch-target flex items-center text-sm font-bold text-brand-600 hover:text-brand-800 pressable px-2">ดูทั้งหมด</a>
            </div>
            
            <!-- Desktop Table View -->
            <div class="hidden md:flex flex-col bg-white rounded-[2rem] border border-slate-100 shadow-native overflow-hidden h-full">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-bold">
                    <th class="px-6 py-4 rounded-tl-[2rem]">รายการ</th>
                    <th class="px-6 py-4">ผู้ใช้งาน</th>
                    <th class="px-6 py-4">เวลา</th>
                    <th class="px-6 py-4 text-right rounded-tr-[2rem]">สถานะ</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm font-medium">
                  <tr class="hover:bg-slate-50 transition-colors group cursor-pointer">
                    <td class="px-6 py-4">
                      <p class="text-slate-800 font-bold real-data">คืนหนังสือ: Sapiens</p>
                      <div class="skeleton-data skeleton-box w-32 h-4"></div>
                    </td>
                    <td class="px-6 py-4 text-slate-500 real-data">วีระยุทธ พ.</td>
                    <td class="px-6 py-4 text-slate-400 real-data">2 นาทีที่แล้ว</td>
                    <td class="px-6 py-4 text-right">
                      <span class="inline-flex px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg real-data">สำเร็จ</span>
                      <div class="skeleton-data skeleton-box w-12 h-6 rounded-lg ml-auto"></div>
                    </td>
                  </tr>
                  <tr class="hover:bg-slate-50 transition-colors group cursor-pointer">
                    <td class="px-6 py-4">
                      <p class="text-slate-800 font-bold real-data">ยืมหนังสือ: 1984</p>
                      <div class="skeleton-data skeleton-box w-28 h-4"></div>
                    </td>
                    <td class="px-6 py-4 text-slate-500 real-data">สมหญิง ม.</td>
                    <td class="px-6 py-4 text-slate-400 real-data">15 นาทีที่แล้ว</td>
                    <td class="px-6 py-4 text-right">
                      <span class="inline-flex px-3 py-1 bg-brand-50 text-brand-600 text-xs font-bold rounded-lg real-data">สำเร็จ</span>
                    </td>
                  </tr>
                  <tr class="hover:bg-slate-50 transition-colors group cursor-pointer">
                    <td class="px-6 py-4">
                      <p class="text-slate-800 font-bold real-data">จ่ายค่าปรับ</p>
                      <div class="skeleton-data skeleton-box w-24 h-4"></div>
                    </td>
                    <td class="px-6 py-4 text-slate-500 real-data">นภัสกร อ.</td>
                    <td class="px-6 py-4 text-slate-400 real-data">1 ชม. ที่แล้ว</td>
                    <td class="px-6 py-4 text-right">
                      <span class="inline-flex px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg real-data">สำเร็จ</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Mobile Card List View -->
            <div class="md:hidden flex flex-col gap-3">
              <div class="pressable bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold shrink-0 real-data">ว</div>
                  <div class="skeleton-data skeleton-box w-10 h-10 rounded-full"></div>
                  <div>
                    <p class="font-bold text-slate-800 text-sm real-data">คืนหนังสือ: Sapiens</p>
                    <div class="skeleton-data skeleton-box w-32 h-4 mb-1"></div>
                    <p class="text-xs text-slate-500 real-data">วีระยุทธ พ. • 2 นาทีที่แล้ว</p>
                    <div class="skeleton-data skeleton-box w-24 h-3"></div>
                  </div>
                </div>
                <span class="px-3 py-1 bg-emerald-50 text-emerald-600 text-xs font-bold rounded-lg shrink-0 real-data">สำเร็จ</span>
              </div>
              
              <div class="pressable bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold shrink-0 real-data">ส</div>
                  <div class="skeleton-data skeleton-box w-10 h-10 rounded-full"></div>
                  <div>
                    <p class="font-bold text-slate-800 text-sm real-data">ยืมหนังสือ: 1984</p>
                    <div class="skeleton-data skeleton-box w-28 h-4 mb-1"></div>
                    <p class="text-xs text-slate-500 real-data">สมหญิง ม. • 15 นาทีที่แล้ว</p>
                    <div class="skeleton-data skeleton-box w-24 h-3"></div>
                  </div>
                </div>
                <span class="px-3 py-1 bg-brand-50 text-brand-600 text-xs font-bold rounded-lg shrink-0 real-data">สำเร็จ</span>
              </div>
            </div>
          </section>

          <!-- SECTION 6: Quick Actions (Span 1 on Desktop/iPad) -->
          <section class="md:col-span-1 xl:col-span-1 flex flex-col h-full mt-4 md:mt-0">
             <h2 class="text-lg font-bold text-slate-800 mb-4 px-1 hidden md:block">เมนูด่วน (Quick Actions)</h2>
             
             <!-- Desktop/Tablet Wrap Card -->
             <div class="bg-transparent md:bg-white md:rounded-[2rem] md:border md:border-slate-100 md:shadow-native md:p-6 md:h-full flex flex-col justify-center">
               <div class="grid grid-cols-2 gap-3 md:gap-4">
                 <button class="pressable touch-target flex flex-col items-center justify-center p-5 bg-gradient-to-b from-brand-50 to-brand-100/50 text-brand-700 rounded-3xl border border-brand-200 hover:border-brand-300 transition-colors aspect-square md:aspect-auto md:h-32 shadow-sm">
                   <i data-lucide="scan-barcode" class="w-8 h-8 md:w-9 md:h-9 mb-3 text-brand-600"></i>
                   <span class="font-bold text-sm">ยืม - คืน</span>
                 </button>
                 <button class="pressable touch-target flex flex-col items-center justify-center p-5 bg-white text-slate-700 rounded-3xl border border-slate-200 shadow-sm hover:border-brand-300 hover:text-brand-600 transition-colors aspect-square md:aspect-auto md:h-32">
                   <i data-lucide="book-plus" class="w-8 h-8 md:w-9 md:h-9 mb-3 text-slate-400 group-hover:text-brand-500"></i>
                   <span class="font-bold text-sm">เพิ่มหนังสือ</span>
                 </button>
                 <button class="pressable touch-target flex flex-col items-center justify-center p-5 bg-white text-slate-700 rounded-3xl border border-slate-200 shadow-sm hover:border-brand-300 hover:text-brand-600 transition-colors aspect-square md:aspect-auto md:h-32">
                   <i data-lucide="user-plus" class="w-8 h-8 md:w-9 md:h-9 mb-3 text-slate-400"></i>
                   <span class="font-bold text-sm">เพิ่มสมาชิก</span>
                 </button>
                 <button class="pressable touch-target flex flex-col items-center justify-center p-5 bg-white text-slate-700 rounded-3xl border border-slate-200 shadow-sm hover:border-brand-300 hover:text-brand-600 transition-colors aspect-square md:aspect-auto md:h-32">
                   <i data-lucide="file-bar-chart-2" class="w-8 h-8 md:w-9 md:h-9 mb-3 text-slate-400"></i>
                   <span class="font-bold text-sm">ออกรายงาน</span>
                 </button>
               </div>
             </div>
          </section>

        </div>
      </div>
    </div>
  </main>

  <!-- ==========================================
       SECTION 7: BOTTOM NAVIGATION (Mobile Only)
       ========================================== -->
  <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.04)]" style="padding-bottom: var(--safe-bottom)">
    <div class="flex justify-around items-center h-[68px] px-1">
      <a href="#" class="pressable touch-target flex flex-col items-center justify-center w-full h-full text-brand-600">
        <i data-lucide="layout-dashboard" class="w-[22px] h-[22px] mb-1"></i>
        <span class="text-[10px] font-bold">หน้าหลัก</span>
      </a>
      <a href="#" class="pressable touch-target flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-slate-600">
        <i data-lucide="book-open" class="w-[22px] h-[22px] mb-1"></i>
        <span class="text-[10px] font-bold">หนังสือ</span>
      </a>
      
      <!-- Central Floating Action Button (FAB) Area -->
      <div class="relative -top-6 w-full flex justify-center shrink-0" style="min-width: 80px;">
        <button class="pressable w-14 h-14 bg-gradient-to-br from-brand-500 to-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-brand-500/40 border-4 border-white">
          <i data-lucide="scan" class="w-6 h-6"></i>
        </button>
      </div>

      <a href="#" class="pressable touch-target flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-slate-600">
        <i data-lucide="users" class="w-[22px] h-[22px] mb-1"></i>
        <span class="text-[10px] font-bold">สมาชิก</span>
      </a>
      
      <!-- Changed from Settings to More -->
      <a href="#" class="pressable touch-target flex flex-col items-center justify-center w-full h-full text-slate-400 hover:text-slate-600">
        <i data-lucide="more-horizontal" class="w-[22px] h-[22px] mb-1"></i>
        <span class="text-[10px] font-bold">เพิ่มเติม</span>
      </a>
    </div>
  </nav>

  <!-- Interactive Scripts -->
  <script>
    lucide.createIcons();

    // 1. Loading Simulation (Mocking API Call)
    setTimeout(() => {
      document.body.classList.remove('is-loading');
    }, 1200);

    // 2. Refresh Button Logic
    const refreshBtn = document.getElementById('refresh-btn');
    const refreshIcon = document.getElementById('refresh-icon');
    const lastUpdateTxt = document.getElementById('last-update');

    refreshBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (document.body.classList.contains('is-loading')) return;

      document.body.classList.add('is-loading');
      refreshIcon.classList.add('animate-spin');
      
      setTimeout(() => {
        document.body.classList.remove('is-loading');
        refreshIcon.classList.remove('animate-spin');
        
        const now = new Date();
        const timeString = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
        lastUpdateTxt.innerText = `${timeString} น.`;
      }, 1500); // Simulated delay
    });
  </script>
</body>
</html>