# CANVAS: ระบบนำทางสำหรับหน้า Manage บนมือถือ (Mobile Navigation Redesign)

**วันที่จัดทำ:** 2026-04-27
**สถานะ:** ดำเนินการเสร็จสมบูรณ์ (Implemented)
**ปัญหาปัจจุบัน:** 
1. Bottom Navigation Bar มีปุ่มเยอะเกินไป (6 ปุ่ม) ทำให้ปุ่มเบียดกันในจอแคบ
2. เมนูพิเศษสำหรับ Admin (ประกาศ, นโยบาย, เวลาทำการ) เข้าถึงไม่ได้เลยบนมือถือ เพราะถูกซ่อนไว้เฉพาะ Desktop Sidebar

---

## 1. แนวคิดการออกแบบ (Design Concepts)

### ทางเลือกที่ A: Tab Bar + "More" Menu (แนะนำ)
แสดงเฉพาะเมนูหลักที่ใช้บ่อย 4 อัน และใช้ปุ่มสุดท้ายเป็นเมนู "เพิ่มเติม" (More) เพื่อเปิด Modal หรือ Bottom Sheet รวบรวมเมนูที่เหลือทั้งหมด

**โครงสร้าง:**
1. [แดชบอร์ด]
2. [ยืม-คืน] (ย้ายมาไว้ข้างล่างเพราะ Staff ใช้บ่อย)
3. [สมาชิก]
4. [หนังสือ]
5. [เพิ่มเติม...] -> เปิด Full Screen Overlay เมนูที่เหลือ

### ทางเลือกที่ B: Floating Action Button (FAB) + Menu
ใช้ปุ่มลอยที่มุมขวาล่างเพื่อเปิดเมนูนำทางทั้งหมด และด้านล่างแสดงเฉพาะสถานะหรือเมนูที่สำคัญที่สุดเพียง 1-2 อัน

---

## 2. ข้อมูลเมนู (Menu Architecture)

### กลุ่มที่ 1: หน้าหลัก (Primary - แสดงที่ Bottom Bar)
- **แดชบอร์ด** (Dashboard)
- **ยืม-คืน** (Loans)
- **จัดการหนังสือ** (Books)
- **สมาชิก** (Users)

### กลุ่มที่ 2: ตั้งค่าและจัดการ (Secondary - ซ่อนใน "More")
- **ค่าปรับ** (Fines)
- **ประกาศ** (Announcements)
- **นโยบายการยืม** (Policies)
- **เวลาทำการ** (Library Hours)
- **พิมพ์ QR เช็คอิน** (Check-in QR)
- **ตั้งค่าระบบ** (Settings)
- **โปรไฟล์** (Profile)

---

## 3. รายละเอียด UI (UX/UI Specification)

### 3.1 Bottom Navigation Bar (Mobile)
- **ความสูง:** 64px - 72px (รวมพื้นที่ Safe Area)
- **สไตล์:** Glassmorphism (bg-white/90 backdrop-blur-lg)
- **ความจุ:** จำกัดที่ 4-5 ไอคอนสูงสุด

### 3.2 "More" Overlay (Bottom Sheet Style)
- **อนิเมชัน:** Slide up จากด้านล่าง
- **การจัดวาง:** แสดงเป็น Grid 3 คอลัมน์ (ไอคอนใหญ่ + ข้อความ)
- **ฟีเจอร์:** มีปุ่ม [ออกจากระบบ] ที่ด้านล่างสุดของเมนูนี้ชัดเจน

---

## 4. แผนการแก้ไขโค้ด (Implementation Strategy)

1. **Refactor `sidebar_manage.js`**: 
   - แยก `mobileMenuItems` ออกเป็น 2 ชุด: `primary` และ `secondary`.
   - เพิ่มสถานะ `isMoreMenuOpen` ในการจัดการ UI (หรือใช้ CSS `:target` / Hidden Checkbox / JS Event).
2. **สร้าง "More Menu" Component**:
   - ออกแบบ Overlay ที่แสดงเฉพาะบน Mobile เมื่อกดปุ่ม "เพิ่มเติม".
3. **ปรับปรุง CSS**:
   - ใช้ Grid หรือ Flexbox ที่ยืดหยุ่นกว่าเดิมในส่วนของ Mobile Nav.

---

## 5. โค้ดอ้างอิงปัจจุบัน (Current Code Reference)

เพื่อให้เห็นภาพการจัดการข้อมูลในปัจจุบัน ต่อไปนี้คือส่วนของโค้ดใน `sidebar_manage.js` ที่เกี่ยวข้อง:

### 5.1 การนิยามเมนู (Menu Definitions)
```javascript
const baseMenuItems = [
  { icon: "layout-dashboard", label: "แดชบอร์ด", path: "/manage" },
  { icon: "book-open", label: "จัดการหนังสือ", path: "/manage/books" },
  { icon: "users", label: "จัดการสมาชิก", path: "/manage/users" },
  { icon: "history", label: "รายการยืม-คืน", path: "/manage/loans" },
  { icon: "receipt-text", label: "ค่าปรับ", path: "/manage/fines" },
  { icon: "settings", label: "ตั้งค่า", path: "/manage/settings" },
];
const adminOnlyDesktopItems = [
  { icon: "megaphone", label: "ประกาศ", path: "/manage/announcements" },
  { icon: "sliders-horizontal", label: "นโยบายยืม", path: "/manage/settings/policies" },
  { icon: "clock-3", label: "เวลาทำการ", path: "/manage/settings/library" },
  { icon: "qr-code", label: "พิมพ์ QR เช็คอิน", path: "/manage/checkin-qr" },
];
```

### 5.2 โครงสร้าง Mobile Nav ในปัจจุบัน (Current Mobile HTML)
ปัจจุบันมีการใช้ `justify-around` ซึ่งถ้าไอคอนเยอะเกินไปจะเกิดอาการเบียดกัน:
```javascript
<!-- Mobile Navigation (Bottom) -->
<nav class="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-slate-100 px-2 py-1 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">  
  <div class="flex justify-around items-center max-w-md mx-auto">
    ${mobileItemsHtml}
  </div>
</nav>
```

---
*จัดทำแผนงานเพื่อแก้ปัญหา UX บนมือถือโดย Gemini CLI - 2026-04-27*


canvas

<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes, viewport-fit=cover">
    <title>ANT Library | Manage</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        @import url('https://cdn.jsdelivr.net/fontsource/fonts/bai-jamjuree@5/400.css');
        @import url('https://cdn.jsdelivr.net/fontsource/fonts/bai-jamjuree@5/500.css');
        @import url('https://cdn.jsdelivr.net/fontsource/fonts/bai-jamjuree@5/700.css');
        @import url('https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-thai@5/400.css');
        @import url('https://cdn.jsdelivr.net/fontsource/fonts/noto-sans-thai@5/700.css');

        body {
            font-family: 'Bai Jamjuree', 'Noto Sans Thai', sans-serif;
            background-color: #f8fafc;
            overscroll-behavior-y: contain;
        }

        /* Utilities */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        
        /* Animations */
        @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slideDown {
            from { transform: translateY(0); }
            to { transform: translateY(100%); }
        }
        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }

        .sheet-enter { animation: slideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .backdrop-enter { animation: fadeIn 0.25s ease both; }
        .sheet-exit { animation: slideDown 0.25s cubic-bezier(0.22, 1, 0.36, 1) both; }
        .backdrop-exit { animation: fadeOut 0.2s ease both; }

        /* Glassmorphism */
        .glass {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
        }
        .glass-nav {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-top: 1px solid rgba(226, 232, 240, 0.6);
        }

        /* Mobile Safe Area */
        .pb-safe { padding-bottom: max(12px, env(safe-area-inset-bottom)); }
        .pt-safe { padding-top: env(safe-area-inset-top); }

        /* Active Nav State */
        .nav-item.active { color: #0f172a; }
        .nav-item.active .nav-bg { background-color: #f1f5f9; transform: scale(1); opacity: 1; }
        .nav-item { color: #94a3b8; transition: color 0.2s; }
        .nav-bg {
            position: absolute;
            inset: 4px;
            border-radius: 12px;
            background-color: transparent;
            transform: scale(0);
            opacity: 0;
            transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
            z-index: -1;
        }

        /* More Menu Grid */
        .more-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
        }
        
        /* Hide scrollbar on bottom nav */
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    </style>
</head>
<body class="min-h-[100dvh] text-slate-800">

    <!-- App Container -->
    <div class="flex min-h-[100dvh]">
        
        <!-- Desktop Sidebar -->
        <aside id="sidebar-desktop" class="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 h-[100dvh] sticky top-0 shrink-0 z-30">
            <!-- Logo -->
            <div class="h-16 flex items-center px-6 border-b border-slate-100">
                <div class="w-8 h-8 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-lg flex items-center justify-center text-white mr-3 shadow-lg shadow-sky-500/20">
                    <i data-lucide="book-open" class="w-5 h-5"></i>
                </div>
                <span class="text-lg font-black text-slate-900 tracking-tight">ANT Manage</span>
            </div>

            <!-- Menu -->
            <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1" id="sidebar-menu">
                <!-- Injected by JS -->
            </nav>

            <!-- User Profile -->
            <div class="p-4 border-t border-slate-100">
                <div class="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">
                    <div class="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold">A</div>
                    <div class="min-w-0">
                        <p class="text-sm font-bold text-slate-800 truncate">Admin สมศักดิ์</p>
                        <p class="text-[10px] font-medium text-slate-400 truncate">Role: Super Admin</p>
                    </div>
                </div>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="flex-1 flex flex-col min-w-0 bg-slate-50/50 relative">
            <!-- Mobile Header -->
            <header class="lg:hidden h-14 glass border-b border-slate-200/50 flex items-center justify-between px-4 sticky top-0 z-20 pt-safe">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
                        <i data-lucide="book-open" class="w-5 h-5"></i>
                    </div>
                    <span class="text-base font-black text-slate-900">ANT Manage</span>
                </div>
                <button class="w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 text-slate-500 hover:bg-slate-100">
                    <i data-lucide="bell" class="w-5 h-5"></i>
                </button>
            </header>

            <!-- Page Content -->
            <div class="flex-1 overflow-y-auto p-4 lg:p-8 pb-24 lg:pb-8 no-scrollbar" id="page-content">
                <div id="content-area">
                    <!-- Dynamic Content -->
                </div>
            </div>

            <!-- Mobile Bottom Navigation -->
            <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass-nav pb-safe shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div class="flex items-center justify-around h-16 max-w-lg mx-auto px-2" id="mobile-nav-container">
                    <!-- Primary Nav Items -->
                    <button onclick="navigateTo('/manage')" data-path="/manage" class="nav-item relative flex flex-col items-center justify-center w-16 h-14 gap-1 rounded-2xl active:scale-95 transition-transform">
                        <div class="nav-bg"></div>
                        <i data-lucide="layout-dashboard" class="w-5 h-5 relative z-10"></i>
                        <span class="text-[10px] font-bold relative z-10">แดชบอร์ด</span>
                    </button>
                    
                    <button onclick="navigateTo('/manage/loans')" data-path="/manage/loans" class="nav-item relative flex flex-col items-center justify-center w-16 h-14 gap-1 rounded-2xl active:scale-95 transition-transform">
                        <div class="nav-bg"></div>
                        <i data-lucide="history" class="w-5 h-5 relative z-10"></i>
                        <span class="text-[10px] font-bold relative z-10">ยืม-คืน</span>
                    </button>
                    
                    <button onclick="navigateTo('/manage/books')" data-path="/manage/books" class="nav-item relative flex flex-col items-center justify-center w-16 h-14 gap-1 rounded-2xl active:scale-95 transition-transform">
                        <div class="nav-bg"></div>
                        <i data-lucide="book-open" class="w-5 h-5 relative z-10"></i>
                        <span class="text-[10px] font-bold relative z-10">หนังสือ</span>
                    </button>
                    
                    <button onclick="navigateTo('/manage/users')" data-path="/manage/users" class="nav-item relative flex flex-col items-center justify-center w-16 h-14 gap-1 rounded-2xl active:scale-95 transition-transform">
                        <div class="nav-bg"></div>
                        <i data-lucide="users" class="w-5 h-5 relative z-10"></i>
                        <span class="text-[10px] font-bold relative z-10">สมาชิก</span>
                    </button>
                    
                    <!-- More Button -->
                    <button onclick="toggleMoreMenu(true)" class="nav-item relative flex flex-col items-center justify-center w-16 h-14 gap-1 rounded-2xl active:scale-95 transition-transform">
                        <div class="nav-bg"></div>
                        <i data-lucide="grid" class="w-5 h-5 relative z-10"></i>
                        <span class="text-[10px] font-bold relative z-10">เพิ่มเติม</span>
                    </button>
                </div>
            </nav>
        </main>
    </div>

    <!-- More Menu (Bottom Sheet) -->
    <div id="more-menu" class="fixed inset-0 z-50 hidden">
        <!-- Backdrop -->
        <div id="more-backdrop" class="sheet-backdrop absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onclick="toggleMoreMenu(false)"></div>
        
        <!-- Sheet -->
        <div id="more-sheet" class="sheet-panel absolute bottom-0 left-0 right-0 bg-white rounded-t-[28px] shadow-2xl overflow-hidden max-h-[85dvh] flex flex-col">
            <!-- Handle -->
            <div class="w-full flex justify-center pt-3 pb-1 cursor-pointer" onclick="toggleMoreMenu(false)">
                <div class="w-10 h-1 bg-slate-200 rounded-full"></div>
            </div>
            
            <!-- Header -->
            <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 class="text-lg font-black text-slate-800">เมนูเพิ่มเติม</h3>
                <button onclick="toggleMoreMenu(false)" class="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>

            <!-- Grid Menu -->
            <div class="flex-1 overflow-y-auto p-6 no-scrollbar">
                <div class="more-grid" id="more-menu-grid">
                    <!-- Secondary Items Injected Here -->
                </div>
            </div>

            <!-- Footer / Logout -->
            <div class="p-4 border-t border-slate-100 bg-slate-50/50 pb-safe">
                <button onclick="handleLogout()" class="w-full py-3.5 bg-white border border-rose-200 text-rose-600 rounded-2xl font-bold hover:bg-rose-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm">
                    <i data-lucide="log-out" class="w-4 h-4"></i>
                    <span>ออกจากระบบ</span>
                </button>
            </div>
        </div>
    </div>

    <!-- Toast Notification -->
    <div id="toast-container" class="fixed top-6 right-1/2 translate-x-1/2 md:translate-x-0 md:right-6 z-[100] flex flex-col items-center gap-3 pointer-events-none"></div>

    <script>
        // --- Data & Config ---
        const MENU_ITEMS = {
            primary: [
                { icon: 'layout-dashboard', label: 'แดชบอร์ด', path: '/manage' },
                { icon: 'history', label: 'ยืม-คืน', path: '/manage/loans' },
                { icon: 'book-open', label: 'หนังสือ', path: '/manage/books' },
                { icon: 'users', label: 'สมาชิก', path: '/manage/users' },
            ],
            secondary: [
                { icon: 'receipt-text', label: 'ค่าปรับ', path: '/manage/fines' },
                { icon: 'megaphone', label: 'ประกาศ', path: '/manage/announcements' },
                { icon: 'sliders-horizontal', label: 'นโยบาย', path: '/manage/policies' },
                { icon: 'clock-3', label: 'เวลาทำการ', path: '/manage/hours' },
                { icon: 'qr-code', label: 'QR เช็คอิน', path: '/manage/checkin' },
                { icon: 'settings', label: 'ตั้งค่า', path: '/manage/settings' },
            ]
        };

        const CONTENT_TEMPLATES = {
            '/manage': `
                <div class="space-y-6">
                    <h2 class="text-2xl font-black text-slate-900">ภาพรวมระบบ</h2>
                    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-10 h-10 bg-sky-100 text-sky-600 rounded-xl flex items-center justify-center"><i data-lucide="book-open" class="w-5 h-5"></i></div>
                                <span class="text-sm font-bold text-slate-500">หนังสือทั้งหมด</span>
                            </div>
                            <p class="text-3xl font-black text-slate-800">1,240</p>
                        </div>
                        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center"><i data-lucide="users" class="w-5 h-5"></i></div>
                                <span class="text-sm font-bold text-slate-500">สมาชิก</span>
                            </div>
                            <p class="text-3xl font-black text-slate-800">856</p>
                        </div>
                        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center"><i data-lucide="alert-circle" class="w-5 h-5"></i></div>
                                <span class="text-sm font-bold text-slate-500">ค้างส่ง</span>
                            </div>
                            <p class="text-3xl font-black text-rose-600">12</p>
                        </div>
                        <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div class="flex items-center gap-3 mb-3">
                                <div class="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center"><i data-lucide="wallet" class="w-5 h-5"></i></div>
                                <span class="text-sm font-bold text-slate-500">ค่าปรับคงค้าง</span>
                            </div>
                            <p class="text-3xl font-black text-rose-600">฿450</p>
                        </div>
                    </div>
                    <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 class="text-lg font-bold text-slate-800 mb-4">กิจกรรมล่าสุด</h3>
                        <div class="space-y-4">
                            <div class="flex items-center gap-3">
                                <div class="w-2 h-2 bg-emerald-500 rounded-full"></div>
                                <p class="text-sm text-slate-600"><span class="font-bold text-slate-800">นายสมชาย</span> ยืมหนังสือ "Atomic Habits"</p>
                                <span class="ml-auto text-xs text-slate-400">2 นาทีที่แล้ว</span>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="w-2 h-2 bg-sky-500 rounded-full"></div>
                                <p class="text-sm text-slate-600"><span class="font-bold text-slate-800">นางสาวใจดี</span> คืนหนังสือ "Designing Data-Intensive Applications"</p>
                                <span class="ml-auto text-xs text-slate-400">15 นาทีที่แล้ว</span>
                            </div>
                            <div class="flex items-center gap-3">
                                <div class="w-2 h-2 bg-amber-500 rounded-full"></div>
                                <p class="text-sm text-slate-600"><span class="font-bold text-slate-800">ระบบ</span> แจ้งเตือนหนังสือใกล้ถึงกำหนดคืน 5 รายการ</p>
                                <span class="ml-auto text-xs text-slate-400">1 ชั่วโมงที่แล้ว</span>
                            </div>
                        </div>
                    </div>
                </div>
            `,
            default: `
                <div class="flex flex-col items-center justify-center py-16 text-center">
                    <div class="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mb-4">
                        <i data-lucide="construction" class="w-8 h-8 text-slate-400"></i>
                    </div>
                    <h2 class="text-xl font-bold text-slate-700">หน้ากำลังพัฒนา</h2>
                    <p class="text-slate-400 mt-2 max-w-xs">เมนูนี้ยังอยู่ในระหว่างการออกแบบและเขียนโค้ด</p>
                </div>
            `
        };

        // --- State ---
        let currentPath = '/manage';
        let isMoreMenuOpen = false;

        // --- Core Logic ---

        function init() {
            renderSidebar();
            renderMoreMenu();
            updateActiveNav();
            loadContent(currentPath);
            lucide.createIcons();
        }

        function renderSidebar() {
            const container = document.getElementById('sidebar-menu');
            const allItems = [...MENU_ITEMS.primary, ...MENU_ITEMS.secondary];
            
            container.innerHTML = allItems.map(item => `
                <a href="#" onclick="navigateTo('${item.path}'); return false;" 
                   class="nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-slate-50 ${item.path === currentPath ? 'bg-slate-100 text-slate-900' : 'text-slate-500 hover:text-slate-800'}" data-path="${item.path}">
                    <i data-lucide="${item.icon}" class="w-5 h-5"></i>
                    <span>${item.label}</span>
                </a>
            `).join('');
        }

        function renderMoreMenu() {
            const container = document.getElementById('more-menu-grid');
            container.innerHTML = MENU_ITEMS.secondary.map(item => `
                <button onclick="navigateTo('${item.path}'); toggleMoreMenu(false);" class="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl hover:bg-slate-50 active:scale-95 transition-all group">
                    <div class="w-12 h-12 bg-slate-50 group-hover:bg-white rounded-2xl flex items-center justify-center text-slate-500 group-hover:text-slate-800 shadow-sm transition-all">
                        <i data-lucide="${item.icon}" class="w-6 h-6"></i>
                    </div>
                    <span class="text-xs font-bold text-slate-500 group-hover:text-slate-800">${item.label}</span>
                </button>
            `).join('');
        }

        function navigateTo(path) {
            currentPath = path;
            updateActiveNav();
            renderSidebar(); // Refresh sidebar active state
            loadContent(path);
        }

        function updateActiveNav() {
            // Update Bottom Nav
            document.querySelectorAll('#mobile-nav-container .nav-item').forEach(btn => {
                const btnPath = btn.getAttribute('data-path');
                const isMatch = btnPath === currentPath;
                
                if (isMatch) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            // Update Sidebar
            document.querySelectorAll('#sidebar-menu .nav-link').forEach(link => {
                if (link.getAttribute('data-path') === currentPath) {
                    link.classList.add('bg-slate-100', 'text-slate-900');
                    link.classList.remove('text-slate-500', 'hover:bg-slate-50');
                } else {
                    link.classList.remove('bg-slate-100', 'text-slate-900');
                    link.classList.add('text-slate-500', 'hover:bg-slate-50');
                }
            });
        }

        function loadContent(path) {
            const contentArea = document.getElementById('content-area');
            const content = CONTENT_TEMPLATES[path] || CONTENT_TEMPLATES.default;
            contentArea.innerHTML = content;
            lucide.createIcons();
        }

        function toggleMoreMenu(show) {
            const modal = document.getElementById('more-menu');
            const sheet = document.getElementById('more-sheet');
            const backdrop = document.getElementById('more-backdrop');
            const isMobile = window.innerWidth < 1024;

            if (show) {
                if (!isMobile) return; // Don't open on desktop
                modal.classList.remove('hidden');
                // Reset animations
                sheet.classList.remove('sheet-exit');
                backdrop.classList.remove('backdrop-exit');
                sheet.classList.add('sheet-enter');
                backdrop.classList.add('backdrop-enter');
                isMoreMenuOpen = true;
            } else {
                isMoreMenuOpen = false;
                sheet.classList.remove('sheet-enter');
                backdrop.classList.remove('backdrop-enter');
                sheet.classList.add('sheet-exit');
                backdrop.classList.add('backdrop-exit');
                
                setTimeout(() => {
                    if (!isMoreMenuOpen) modal.classList.add('hidden');
                }, 250);
            }
        }

        function handleLogout() {
            toggleMoreMenu(false);
            showToast('กำลังออกจากระบบ...', 'info');
            setTimeout(() => {
                alert('Logout Simulation: Redirecting to login...');
                location.reload();
            }, 1000);
        }

        // --- Helpers ---
        function showToast(msg, type = 'success') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            const bg = type === 'success' ? 'bg-emerald-600' : type === 'error' ? 'bg-rose-600' : 'bg-slate-800';
            const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info';
            
            toast.className = `${bg} text-white px-4 py-3 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2`;
            toast.style.animation = 'slideUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both';
            toast.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4"></i><span>${msg}</span>`;
            
            container.appendChild(toast);
            lucide.createIcons();
            
            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translateY(-10px)';
                setTimeout(() => toast.remove(), 300);
            }, 2000);
        }

        // --- Event Listeners ---
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 1024) {
                toggleMoreMenu(false);
            }
        });

        // Initialize
        window.onload = init;
    </script>
</body>
</html>

