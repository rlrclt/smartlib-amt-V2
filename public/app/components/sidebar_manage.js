/**
 * Sidebar Manage Component - Bold Gradient Accent Style
 * Desktop: Left Sidebar (Dark Theme) | Mobile: Bottom Navigation (Glassy)
 */
export function renderSidebarManage() {
  const baseMenuItems = [
    { icon: "layout-dashboard", label: "แดชบอร์ด", path: "/manage" },
    { icon: "book-open", label: "จัดการหนังสือ", path: "/manage/books" },
    { icon: "users", label: "จัดการสมาชิก", path: "/manage/users" },
    { icon: "history", label: "รายการยืม-คืน", path: "/manage/loans" },
    { icon: "settings", label: "ตั้งค่า", path: "/manage/settings" },
  ];
  const adminOnlyDesktopItems = [
    { icon: "megaphone", label: "ประกาศ", path: "/manage/announcements" },
  ];

  const currentPath = window.location.pathname;
  const auth = readAuthSession_();
  const isAdmin = String(auth?.user?.groupType || "").toLowerCase() === "manage" &&
    String(auth?.user?.role || "").toLowerCase() === "admin";
  const desktopMenuItems = isAdmin
    ? [...baseMenuItems.slice(0, 4), ...adminOnlyDesktopItems, baseMenuItems[4]]
    : baseMenuItems;
  const mobileMenuItems = baseMenuItems;

  // Desktop Item Renderer
  const desktopItemsHtml = desktopMenuItems.map((item) => {
    const isActive = currentPath === item.path;
    return `
      <a data-link href="${item.path}" 
         class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
                ${isActive 
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-lg shadow-blue-500/20 font-bold' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'}">
        <i data-lucide="${item.icon}" class="w-5 h-5 ${isActive ? 'text-white' : 'group-hover:scale-110 transition-transform'}"></i>
        <span class="text-sm">${item.label}</span>
      </a>
    `;
  }).join("");

  // Mobile Item Renderer
  const mobileItemsHtml = mobileMenuItems.map((item) => {
    const isActive = currentPath === item.path;
    return `
      <a data-link href="${item.path}" 
         class="flex flex-col items-center gap-1 p-2 rounded-xl transition-all
                ${isActive ? 'text-sky-600 font-bold' : 'text-slate-400'}">
        <i data-lucide="${item.icon}" class="w-5 h-5"></i>
        <span class="text-[10px]">${item.label}</span>
      </a>
    `;
  }).join("");

  return `
    <!-- Desktop Sidebar (Left - Bold Dark) -->
    <aside class="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-slate-950 p-4 shadow-2xl z-50">
      <!-- Brand Header -->
      <div class="mb-8 px-4 py-6 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
        <div class="flex items-center gap-3">
           <div class="w-10 h-10 bg-gradient-to-br from-sky-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20 rotate-3">
              <i data-lucide="shield-check" class="text-white w-6 h-6"></i>
           </div>
           <div>
              <h2 class="text-sm font-black text-white uppercase tracking-wider leading-none">Manage</h2>
              <p class="text-[10px] text-sky-400 font-bold uppercase tracking-widest mt-1">Admin Panel</p>
           </div>
        </div>
      </div>
      
      <!-- Navigation -->
      <nav class="flex-1 flex flex-col gap-2">
        <p class="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Main Menu</p>
        ${desktopItemsHtml}
      </nav>

      <!-- User Profile & Logout Area -->
      <div class="mt-auto bg-white/5 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
        <div class="flex items-center gap-3 mb-4">
          <div class="relative">
            <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-400 to-blue-500 flex items-center justify-center text-white text-xs font-black shadow-inner border border-white/20">
              AD
            </div>
            <span class="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-950 rounded-full"></span>
          </div>
          <div class="overflow-hidden">
            <p class="text-xs font-bold text-white truncate">Administrator</p>
            <p class="text-[10px] text-slate-500 uppercase font-medium">Librarian Role</p>
          </div>
        </div>
        <button class="flex items-center justify-center gap-2 w-full py-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-xl text-xs font-bold transition-all duration-300 group shadow-sm hover:shadow-red-500/40">
          <i data-lucide="log-out" class="w-4 h-4 transition-transform group-hover:-translate-x-1"></i>
          <span>ออกจากระบบ</span>
        </button>
      </div>
    </aside>

    <!-- Mobile Navigation (Bottom - Glassy Light) -->
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-slate-100 px-2 py-1 pb-safe shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
      <div class="flex justify-around items-center max-w-md mx-auto">
        ${mobileItemsHtml}
      </div>
    </nav>
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
