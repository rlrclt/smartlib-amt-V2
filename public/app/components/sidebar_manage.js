/**
 * Sidebar Manage Component - Bold Gradient Accent Style
 * Desktop: Left Sidebar (Dark Theme) | Mobile: Bottom Navigation (Vibrant Tab Bar)
 */
export function renderSidebarManage() {
  const menuGroups = [
    {
      id: "overview",
      label: "ภาพรวมและรายการ",
      items: [
        { icon: "layout-dashboard", label: "แดชบอร์ด", path: "/manage", color: "sky" },
        { icon: "history", label: "ยืม-คืน", path: "/manage/loans", color: "indigo" },
        { icon: "receipt-text", label: "จัดการค่าปรับ", path: "/manage/fines", color: "rose" },
      ],
    },
    {
      id: "resources",
      label: "ทรัพยากรและสมาชิก",
      items: [
        { icon: "book-open", label: "จัดการหนังสือ", path: "/manage/books", color: "blue" },
        { icon: "users", label: "จัดการสมาชิก", path: "/manage/users", color: "emerald" },
      ],
    },
    {
      id: "system",
      label: "ระบบและประกาศ",
      adminOnly: true,
      items: [
        { icon: "megaphone", label: "จัดการประกาศ", path: "/manage/announcements", color: "amber" },
        { icon: "sliders-horizontal", label: "นโยบายการยืม", path: "/manage/settings/policies", color: "violet" },
        { icon: "clock-3", label: "เวลาทำการ", path: "/manage/settings/library", color: "cyan" },
        { icon: "qr-code", label: "พิมพ์ QR เช็คอิน", path: "/manage/checkin-qr", color: "fuchsia" },
        { icon: "settings", label: "ตั้งค่าระบบ", path: "/manage/settings", color: "slate" },
      ],
    },
  ];

  const currentPath = window.location.pathname;
  const auth = readAuthSession_();
  const isAdmin = String(auth?.user?.groupType || "").toLowerCase() === "manage" &&
    String(auth?.user?.role || "").toLowerCase() === "admin";

  // Desktop Rendering with Groups
  const desktopGroupsHtml = menuGroups
    .filter((group) => !group.adminOnly || isAdmin)
    .map((group) => {
      const itemsHtml = group.items
        .map((item) => {
          const isActive = currentPath === item.path;
          return `
          <a data-link href="${item.path}"
             data-sidebar-item
             class="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group mb-1
                    ${isActive
                      ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-blue-500/20 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'}">
            <i data-lucide="${item.icon}" class="w-5 h-5 ${isActive ? 'text-white' : 'group-hover:scale-110 transition-transform'}"></i>
            <span data-sidebar-label class="text-sm whitespace-nowrap overflow-hidden">${item.label}</span>
          </a>
        `;
        })
        .join("");

      return `
        <div class="mb-6 last:mb-0">
          <p data-sidebar-section-label class="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 whitespace-nowrap overflow-hidden">
            ${group.label}
          </p>
          ${itemsHtml}
        </div>
      `;
    })
    .join("");

  // Mobile Primary (4 most important)
  const mobilePrimary = [
    menuGroups[0].items[0], // Dashboard
    menuGroups[0].items[1], // Loans
    menuGroups[1].items[1], // Users
    menuGroups[1].items[0], // Books
  ];

  const mobilePrimaryHtml = mobilePrimary.map((item) => {
    const isActive = currentPath === item.path;
    return `
      <a data-link href="${item.path}"
         data-icon-name="${item.icon}"
         data-label-text="${item.label}"
         class="relative flex flex-col items-center justify-center h-12 w-16 transition-all duration-300 flex-1">
        ${isActive ? `
          <div class="absolute inset-x-1 inset-y-0.5 bg-gradient-to-br from-sky-400 to-blue-600 rounded-2xl shadow-lg shadow-sky-400/30 scale-100 opacity-100"></div>
          <i data-lucide="${item.icon}" class="w-5 h-5 relative z-10 text-white animate-bounce-short"></i>
          <span class="text-[9px] font-black relative z-10 text-white mt-0.5">${item.label}</span>
        ` : `
          <i data-lucide="${item.icon}" class="w-5 h-5 text-slate-400"></i>
          <span class="text-[9px] font-bold text-slate-400 mt-0.5">${item.label}</span>
        `}
      </a>
    `;
  }).join("");

  // Mobile More (Secondary items)
  const allDesktopItems = menuGroups.flatMap((g) => g.items);
  const mobileMoreItems = allDesktopItems.filter((item) => !mobilePrimary.find((m) => m.path === item.path));

  const colorMap = {
    sky: "bg-sky-50 text-sky-600 border-sky-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    rose: "bg-rose-50 text-rose-600 border-rose-100",
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    violet: "bg-violet-50 text-violet-600 border-violet-100",
    cyan: "bg-cyan-50 text-cyan-600 border-cyan-100",
    fuchsia: "bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  };

  const mobileSecondaryHtml = mobileMoreItems.map((item) => {
    const theme = colorMap[item.color] || colorMap.slate;
    return `
      <a data-link href="${item.path}"
         onclick="const m = document.getElementById('more-menu-overlay'); if(m) m.classList.add('hidden')"
         class="flex flex-col items-center justify-center gap-3 p-4 rounded-3xl bg-white border border-slate-100 hover:border-sky-200 hover:bg-sky-50/30 transition-all active:scale-95 group shadow-sm">
        <div class="w-14 h-14 ${theme.split(' ')[0]} rounded-2xl flex items-center justify-center ${theme.split(' ')[1]} border ${theme.split(' ')[2]} shadow-inner transition-transform group-hover:rotate-3 group-hover:scale-110">
          <i data-lucide="${item.icon}" class="w-7 h-7"></i>
        </div>
        <span class="text-xs font-black text-slate-700 group-hover:text-sky-700 text-center leading-tight">${item.label}</span>
      </a>
    `;
  }).join("");

  return `
    <style>
      @keyframes bounce-short {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-2px); }
      }
      .animate-bounce-short { animation: bounce-short 1.5s infinite; }
      
      .mobile-nav-glass {
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border-top: 1px solid rgba(226, 232, 240, 0.5);
      }

      .more-menu-sheet {
        box-shadow: 0 -10px 40px -10px rgba(0,0,0,0.15);
      }
    </style>

    <!-- Desktop Sidebar -->
    <aside
      data-manage-sidebar
      class="hidden lg:flex flex-col h-screen sticky top-0 bg-slate-950 p-4 shadow-2xl z-50"
    >
      <div class="mb-8 px-4 py-6 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
        <div class="flex items-center gap-3" data-sidebar-brand-row>
           <div class="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20 rotate-3">
              <i data-lucide="shield-check" class="text-white w-6 h-6"></i>
           </div>
           <div class="min-w-0">
              <h2 data-sidebar-label class="text-sm font-black text-white uppercase tracking-wider leading-none">Manage</h2>
              <p data-sidebar-label class="text-[10px] text-sky-400 font-bold uppercase tracking-widest mt-1">Admin Panel</p>
           </div>
        </div>
      </div>

      <nav class="flex-1 flex flex-col overflow-y-auto no-scrollbar">
        ${desktopGroupsHtml}
      </nav>

      <div class="mt-auto bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
        <div class="flex items-center gap-3 mb-4" data-sidebar-user-row>
          <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-blue-500 flex items-center justify-center text-white text-xs font-black border border-white/20">
            ${auth?.user?.displayName ? auth.user.displayName.slice(0, 2).toUpperCase() : "AD"}
          </div>
          <div class="overflow-hidden min-w-0">
            <p data-sidebar-label class="text-xs font-bold text-white truncate">${auth?.user?.displayName || "Administrator"}</p>
            <p data-sidebar-label class="text-[10px] text-slate-500 uppercase font-medium truncate">${auth?.user?.role || "Staff"}</p>
          </div>
        </div>
        <button onclick="window.location.href='/logout'" data-sidebar-item class="flex items-center justify-center gap-2 w-full py-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl text-xs font-bold transition-all duration-300">
          <i data-lucide="log-out" class="w-4 h-4"></i>
          <span data-sidebar-label>ออกจากระบบ</span>
        </button>
      </div>
    </aside>

    <!-- Mobile Bottom Navigation -->
    <nav class="lg:hidden fixed bottom-4 left-4 right-4 z-50 mobile-nav-glass rounded-[2.5rem] px-2 py-2 shadow-2xl flex items-center justify-around border border-white/40">  
      ${mobilePrimaryHtml}
      <!-- More Button -->
      <button type="button" 
              onclick="const m = document.getElementById('more-menu-overlay'); if(m) m.classList.remove('hidden')"
              class="relative flex flex-col items-center justify-center h-12 w-16 transition-all duration-300 flex-1 active:scale-90">
        <div class="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 shadow-inner">
           <i data-lucide="grid" class="w-5 h-5"></i>
        </div>
        <span class="text-[9px] font-black text-slate-500 mt-0.5">เพิ่มเติม</span>
      </button>
    </nav>

    <!-- More Menu Overlay -->
    <div id="more-menu-overlay" class="lg:hidden fixed inset-0 z-[100] hidden">
       <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300" onclick="this.parentElement.classList.add('hidden')"></div>
       <div class="absolute bottom-0 left-0 right-0 bg-slate-50 rounded-t-[3rem] more-menu-sheet overflow-hidden flex flex-col max-h-[90vh] transition-transform duration-500">
          <div class="w-full flex justify-center pt-4 pb-2" onclick="this.parentElement.parentElement.classList.add('hidden')">
             <div class="w-12 h-1.5 bg-slate-300 rounded-full"></div>
          </div>
          <div class="px-8 py-6 flex items-center justify-between">
             <div>
                <h3 class="text-xl font-black text-slate-900">จัดการระบบ</h3>
                <p class="text-xs font-bold text-slate-400">เลือกเมนูจัดการอื่นๆ เพิ่มเติม</p>
             </div>
             <button onclick="this.parentElement.parentElement.parentElement.classList.add('hidden')" class="w-10 h-10 flex items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm border border-slate-100">
                <i data-lucide="x" class="w-5 h-5"></i>
             </button>
          </div>
          <div class="flex-1 overflow-y-auto p-6 pt-2 grid grid-cols-3 gap-3 pb-12">
             ${mobileSecondaryHtml}
          </div>
          <div class="p-6 border-t border-slate-200 bg-white/50 pb-safe">
             <button onclick="window.location.href='/logout'" class="w-full py-4 bg-white border-2 border-rose-100 text-rose-600 rounded-[2rem] font-black hover:bg-rose-50 flex items-center justify-center gap-3 shadow-lg shadow-rose-500/10 active:scale-95 transition-all">
                <div class="w-8 h-8 bg-rose-100 rounded-full flex items-center justify-center"><i data-lucide="log-out" class="w-4 h-4"></i></div>
                <span>ออกจากบัญชี</span>
             </button>
          </div>
       </div>
    </div>
  `;
}

function readAuthSession_() {
  const local = window.localStorage.getItem("smartlib.auth");
  const session = window.sessionStorage.getItem("smartlib.auth");
  const raw = local || session;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
