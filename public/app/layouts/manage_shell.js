import { renderSidebarManage } from "../components/sidebar_manage.js";
import { renderFooterManage } from "../components/footer_manage.js";
import { escapeHtml } from "../utils/html.js";

const MANAGE_SIDEBAR_COLLAPSED_KEY = "smartlib.manage.sidebar.collapsed";

function readManageSidebarCollapsed_() {
  try {
    return window.localStorage.getItem(MANAGE_SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeManageSidebarCollapsed_(collapsed) {
  try {
    window.localStorage.setItem(MANAGE_SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // ignore storage write errors (private mode/storage blocked)
  }
}

export function syncManageSidebarUi() {
  const shell = document.querySelector("[data-manage-shell]");
  if (!shell) return;

  const collapsed = readManageSidebarCollapsed_();
  shell.setAttribute("data-sidebar-collapsed", collapsed ? "true" : "false");

  // --- Sync Active Menu Items ---
  const currentPath = window.location.pathname;

  // 1. Desktop Items
  document.querySelectorAll("[data-manage-sidebar] [data-sidebar-item]").forEach((item) => {
    if (item.tagName.toLowerCase() === "a") {
      const href = item.getAttribute("href");
      const isActive = currentPath === href;
      const icon = item.querySelector("i");
      
      if (isActive) {
        item.classList.remove("text-slate-400", "hover:text-white", "hover:bg-white/5");
        item.classList.add("bg-gradient-to-r", "from-sky-500", "to-blue-600", "text-white", "shadow-lg", "shadow-blue-500/20", "font-bold");
        if (icon) {
          icon.classList.remove("group-hover:scale-110", "transition-transform");
          icon.classList.add("text-white");
        }
      } else {
        item.classList.remove("bg-gradient-to-r", "from-sky-500", "to-blue-600", "text-white", "shadow-lg", "shadow-blue-500/20", "font-bold");
        item.classList.add("text-slate-400", "hover:text-white", "hover:bg-white/5");
        if (icon) {
          icon.classList.remove("text-white");
          icon.classList.add("group-hover:scale-110", "transition-transform");
        }
      }
    }
  });

  // 2. Mobile Primary Items (Bottom Bar)
  document.querySelectorAll("nav.lg\\:hidden > div > a[data-link]").forEach((item) => {
    const href = item.getAttribute("href");
    const isActive = currentPath === href;
    const icon = item.querySelector("i");
    const label = item.querySelector("span");

    // Clear old state
    item.innerHTML = ""; // We'll re-render just the inner part to handle the complex gradient background easily
    if (isActive) {
      item.className = "relative flex flex-col items-center justify-center h-12 w-16 transition-all duration-300 flex-1";
      item.innerHTML = `
        <div class="absolute inset-x-1 inset-y-0.5 bg-gradient-to-br from-sky-400 to-blue-600 rounded-2xl shadow-lg shadow-sky-400/30 scale-100 opacity-100"></div>
        <i data-lucide="${item.getAttribute("data-icon-name") || "circle"}" class="w-5 h-5 relative z-10 text-white animate-bounce-short"></i>
        <span class="text-[9px] font-black relative z-10 text-white mt-0.5">${item.getAttribute("data-label-text") || ""}</span>
      `;
    } else {
      item.className = "relative flex flex-col items-center justify-center h-12 w-16 transition-all duration-300 flex-1";
      item.innerHTML = `
        <i data-lucide="${item.getAttribute("data-icon-name") || "circle"}" class="w-5 h-5 text-slate-400"></i>
        <span class="text-[9px] font-bold text-slate-400 mt-0.5">${item.getAttribute("data-label-text") || ""}</span>
      `;
    }
  });

  // 3. More Menu Overlay Items
  document.querySelectorAll("#more-menu-overlay a[data-link]").forEach((item) => {
    const href = item.getAttribute("href");
    const isActive = currentPath === href;
    if (isActive) {
      item.classList.add("border-sky-400", "bg-sky-50");
    } else {
      item.classList.remove("border-sky-400", "bg-sky-50");
    }
  });

  // Re-render Lucide icons for any dynamically updated innerHTML
  if (window.lucide && typeof window.lucide.createIcons === "function") {
    window.lucide.createIcons();
  }
}

export function toggleManageSidebar(forceCollapsed) {
  const current = readManageSidebarCollapsed_();
  const next = typeof forceCollapsed === "boolean" ? forceCollapsed : !current;
  writeManageSidebarCollapsed_(next);
  syncManageSidebarUi();
  return next;
}

function resolveManageShellMeta(pathname) {
  const path = String(pathname || "/manage").replace(/\/+$/, "") || "/manage";
  const map = {
    "/manage": {
      crumb: "Dashboard",
      title: "ระบบจัดการห้องสมุด",
      mobileTitle: "Dashboard",
    },
    "/manage/announcements": {
      crumb: "Announcements",
      title: "จัดการประกาศ",
      mobileTitle: "ประกาศ",
    },
    "/manage/books": {
      crumb: "Books",
      title: "จัดการหนังสือ",
      mobileTitle: "หนังสือ",
    },
    "/manage/register_books": {
      crumb: "Books",
      title: "ลงทะเบียนหนังสือใหม่",
      mobileTitle: "ลงทะเบียนหนังสือ",
    },
    "/manage/add_book_items": {
      crumb: "Books",
      title: "เพิ่มจำนวนเล่มหนังสือ",
      mobileTitle: "เพิ่มรหัสเล่ม",
    },
    "/manage/view_book_items": {
      crumb: "Books",
      title: "คลังรหัสเล่มหนังสือ",
      mobileTitle: "คลังรหัสเล่ม",
    },
    "/manage/print-barcodes": {
      crumb: "Books",
      title: "พิมพ์บาร์โค้ด",
      mobileTitle: "พิมพ์บาร์โค้ด",
    },
    "/manage/books/select-print": {
      crumb: "Books",
      title: "เลือกเล่มสำหรับพิมพ์",
      mobileTitle: "เลือกพิมพ์",
    },
    "/manage/users": {
      crumb: "Users",
      title: "จัดการสมาชิก",
      mobileTitle: "สมาชิก",
    },
    "/manage/users/edit": {
      crumb: "Users",
      title: "แก้ไขสมาชิก",
      mobileTitle: "แก้ไขสมาชิก",
    },
    "/manage/users/import": {
      crumb: "Users",
      title: "Smart Import สมาชิก",
      mobileTitle: "Import",
    },
    "/manage/loans": {
      crumb: "Loans",
      title: "รายการยืม-คืน",
      mobileTitle: "ยืม-คืน",
    },
    "/manage/fines": {
      crumb: "Fines",
      title: "จัดการค่าปรับ",
      mobileTitle: "ค่าปรับ",
    },
    "/manage/settings": {
      crumb: "Settings",
      title: "ตั้งค่าระบบ",
      mobileTitle: "ตั้งค่า",
    },
    "/manage/settings/policies": {
      crumb: "Settings",
      title: "นโยบายการยืม",
      mobileTitle: "Policies",
    },
    "/manage/settings/library": {
      crumb: "Settings",
      title: "เวลาทำการห้องสมุด",
      mobileTitle: "เวลาทำการ",
    },
    "/manage/checkin-qr": {
      crumb: "Check-in",
      title: "พิมพ์ QR เช็คอินห้องสมุด",
      mobileTitle: "พิมพ์ QR",
    },
  };

  return map[path] || {
    crumb: "Manage",
    title: "ระบบจัดการห้องสมุด",
    mobileTitle: "Manage",
  };
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

function resolveInitials_(name) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "U";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Manage Shell Layout
 * Header จะปรับ breadcrumb/title ตามเส้นทางปัจจุบัน
 */
export function renderManageShell(contentHtml) {
  const meta = resolveManageShellMeta(window.location.pathname);
  const collapsedDesktop = readManageSidebarCollapsed_();
  const auth = readAuthSession_();
  const user = auth && auth.user ? auth.user : {};
  const displayName = String(user.displayName || "Manage User");
  const roleLabel = String(user.role || "staff");
  const photoURL = String(user.photoURL || "").trim();
  const avatarFallback = resolveInitials_(displayName);

  return `
    <style>
      @media (min-width: 1024px) {
        [data-manage-shell] [data-manage-sidebar] {
          width: 16rem;
          transition:
            width 280ms cubic-bezier(0.22, 1, 0.36, 1),
            padding 220ms ease;
          will-change: width;
        }

        [data-manage-shell][data-sidebar-collapsed="true"] [data-manage-sidebar] {
          width: 5.25rem;
          padding-left: 0.75rem;
          padding-right: 0.75rem;
        }

        [data-manage-shell] [data-sidebar-item],
        [data-manage-shell] [data-sidebar-brand-row],
        [data-manage-shell] [data-sidebar-user-row] {
          transition:
            gap 220ms ease,
            padding 220ms ease,
            justify-content 220ms ease;
        }

        [data-manage-shell][data-sidebar-collapsed="true"] [data-sidebar-item],
        [data-manage-shell][data-sidebar-collapsed="true"] [data-sidebar-brand-row],
        [data-manage-shell][data-sidebar-collapsed="true"] [data-sidebar-user-row] {
          justify-content: center;
        }

        [data-manage-shell] [data-sidebar-label],
        [data-manage-shell] [data-sidebar-section-label] {
          max-width: 11rem;
          opacity: 1;
          transform: translateX(0);
          transition:
            max-width 240ms cubic-bezier(0.22, 1, 0.36, 1),
            opacity 150ms ease,
            transform 220ms ease;
        }

        [data-manage-shell][data-sidebar-collapsed="true"] [data-sidebar-label],
        [data-manage-shell][data-sidebar-collapsed="true"] [data-sidebar-section-label] {
          max-width: 0;
          opacity: 0;
          transform: translateX(-6px);
          pointer-events: none;
        }

        [data-manage-shell][data-sidebar-collapsed="true"] [data-manage-main] {
          min-width: 0;
        }
      }
    </style>

    <div class="flex min-h-screen bg-slate-50 font-medium text-slate-700" data-manage-shell data-sidebar-collapsed="${collapsedDesktop ? "true" : "false"}">
      ${renderSidebarManage()}

      <main data-manage-main class="flex-1 flex flex-col min-h-screen lg:h-screen overflow-y-auto pb-24 lg:pb-0 transition-all duration-300">
        <header class="sticky top-0 z-30 flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200/60 shadow-sm">
          <div class="flex items-center gap-4">
            <button
              type="button"
              data-sidebar-toggle
              class="hidden lg:inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-all hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
              aria-label="${collapsedDesktop ? "ขยายเมนูด้านข้าง" : "พับเมนูด้านข้าง"}"
              title="${collapsedDesktop ? "ขยายเมนูด้านข้าง" : "พับเมนูด้านข้าง"}"
            >
              <i data-lucide="panel-left-close" data-sidebar-toggle-icon-expanded class="h-5 w-5 ${collapsedDesktop ? "hidden" : ""}"></i>
              <i data-lucide="panel-left-open" data-sidebar-toggle-icon-collapsed class="h-5 w-5 ${collapsedDesktop ? "" : "hidden"}"></i>
            </button>
            <div class="hidden lg:block">
              <div class="mb-0.5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                <span>Admin</span>
                <i data-lucide="chevron-right" class="h-3 w-3"></i>
                <span class="text-sky-600">${escapeHtml(meta.crumb)}</span>
              </div>
              <h1 class="text-base font-bold leading-tight text-slate-800 lg:text-lg">${escapeHtml(meta.title)}</h1>
            </div>
            <h1 class="text-lg font-bold text-slate-800 lg:hidden">${escapeHtml(meta.mobileTitle)}</h1>
          </div>

          <div class="flex items-center gap-3 lg:gap-5">
            <div class="hidden items-center rounded-full border border-transparent bg-slate-100 px-4 py-1.5 transition-all focus-within:border-sky-300 focus-within:bg-white md:flex">
              <i data-lucide="search" class="h-4 w-4 text-slate-400"></i>
              <input type="text" placeholder="ค้นหาข้อมูล..." class="w-40 border-none bg-transparent text-sm focus:ring-0">
            </div>

            <div class="ml-2 flex items-center gap-2 border-l border-slate-200 pl-4">
              <div class="relative">
                <button
                  type="button"
                  data-noti-toggle
                  class="relative rounded-xl p-2 text-slate-400 transition-all hover:bg-sky-50 hover:text-sky-600"
                  aria-label="เปิดรายการแจ้งเตือน"
                >
                  <i data-lucide="bell" class="h-5 w-5"></i>
                  <span data-noti-badge class="absolute -right-1 -top-1 hidden min-w-[18px] rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">0</span>
                </button>
                <div data-noti-panel class="absolute right-0 top-12 z-[2147482000] hidden w-[min(92vw,360px)] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
                  <div class="mb-2 flex items-center justify-between">
                    <p class="text-sm font-black text-slate-800">การแจ้งเตือน</p>
                    <button type="button" data-noti-mark-all class="rounded-lg px-2 py-1 text-xs font-bold text-sky-700 hover:bg-sky-50">อ่านทั้งหมด</button>
                  </div>
                  <div data-noti-list class="max-h-80 space-y-2 overflow-y-auto pr-1"></div>
                </div>
              </div>

              <a data-link href="/profile" class="group ml-2 flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1 hover:bg-slate-50">
                <div class="hidden text-right lg:block">
                  <p class="text-xs font-bold leading-none text-slate-800">${escapeHtml(displayName)}</p>
                  <p class="mt-1 text-[10px] uppercase text-slate-400">${escapeHtml(roleLabel)}</p>
                </div>
                <div class="relative h-9 w-9 overflow-hidden rounded-xl bg-slate-800 text-sm font-bold text-white shadow-md transition-transform group-hover:scale-105">
                  <div class="flex h-full w-full items-center justify-center">${escapeHtml(avatarFallback)}</div>
                  ${photoURL ? `<img src="${escapeHtml(photoURL)}" alt="${escapeHtml(displayName)}" class="absolute inset-0 h-full w-full object-cover" onerror="this.style.display='none';">` : ""}
                </div>
              </a>
            </div>
          </div>
        </header>

        <div id="manage-content" class="mx-auto w-full max-w-[1600px] flex-1 p-4 lg:p-6">
          ${contentHtml}
        </div>

        <div class="mt-auto border-t border-slate-200/50 px-6 py-4">
          ${renderFooterManage()}
        </div>
      </main>
    </div>
  `;
}
