import { escapeHtml } from "../utils/html.js";
import { store } from "../state/store.js";
import { MEMBER_SYNC_KEYS } from "../data/member_sync.js";

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

function resolveMeta_(pathname) {
  const path = String(pathname || "/app").replace(/\/+$/, "") || "/app";
  const map = {
    "/app": { title: "หน้าหลักสมาชิก", mobileTitle: "หน้าหลัก" },
    "/app/books": { title: "ค้นหาหนังสือ", mobileTitle: "ค้นหา" },
    "/app/loans": { title: "การยืมของฉัน", mobileTitle: "การยืม" },
    "/app/fines": { title: "ค่าปรับของฉัน", mobileTitle: "ค่าปรับ" },
    "/app/loan-self": { title: "ยืม-คืนด้วยตนเอง", mobileTitle: "ยืม-คืน" },
    "/app/checkin": { title: "เช็คอินห้องสมุด", mobileTitle: "เช็คอิน" },
    "/app/reservations": { title: "การจองของฉัน", mobileTitle: "การจอง" },
    "/app/profile": { title: "โปรไฟล์สมาชิก", mobileTitle: "โปรไฟล์" },
  };
  return map[path] || map["/app"];
}

function resolveInitials_(name) {
  const text = String(name || "").trim();
  if (!text) return "U";
  const parts = text.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] || "") + (parts[1][0] || "").toUpperCase();
}

function buildNavItems_(actor) {
  const role = String(actor?.role || "").toLowerCase();
  const canSwitchToManage = actor?.groupType === "manage" && (role === "admin" || role === "librarian");

  const items = [
    { href: "/app", label: "หน้าหลัก", icon: "layout-dashboard" },
    { href: "/app/books", label: "ค้นหา", icon: "book-open" },
    { href: "/app/loan-self", label: "ยืม-คืน", icon: "scan-line" },
    { href: "/app/checkin", label: "เช็คอิน", icon: "qr-code" },
    { href: "/app/reservations", label: "การจอง", icon: "bookmark" },
    { href: "/app/loans", label: "การยืม", icon: "receipt" },
    { href: "/app/fines", label: "ค่าปรับ", icon: "wallet" },
    { href: "/app/profile", label: "โปรไฟล์", icon: "user" },
  ];

  if (canSwitchToManage) {
    items.push({ href: "/manage", label: "ไปหน้าจัดการ", icon: "shield-check" });
  }

  return items;
}

const MOBILE_PRIMARY_PATHS = ["/app", "/app/books", "/app/loan-self", "/app/checkin"];

function renderDesktopNav_(items, pathname) {
  return items
    .map((item) => {
      const active = pathname === item.href;
      const activeCls = active
        ? "border-sky-200 bg-sky-50 text-sky-800"
        : "border-transparent text-slate-600 hover:border-sky-100 hover:bg-sky-50 hover:text-sky-700";
      return `
        <a data-link href="${item.href}" class="member-nav-item ${activeCls}">
          <div class="relative"><i data-lucide="${item.icon}" class="h-5 w-5"></i><span data-shell-badge="${item.href}" class="absolute -right-1.5 -top-1.5 hidden min-w-[16px] rounded-full bg-rose-500 px-1 py-0.5 text-[9px] font-black leading-none text-white shadow-sm">0</span></div>
          <span class="text-sm font-bold">${escapeHtml(item.label)}</span>
        </a>
      `;
    })
    .join("");
}

function renderMobileNav_(items, pathname) {
  // 4 items + 1 "More" button
  const primary = items.slice(0, 4);
  const activeInPrimary = primary.some(item => pathname === item.href);

  const html = primary.map((item) => {
    const active = pathname === item.href;
    const activeCls = active
      ? "bg-sky-50 text-sky-700 ring-1 ring-sky-100 shadow-sm"
      : "text-slate-500";
    return `
      <a data-link href="${item.href}" class="member-bottom-nav-item pressable-native ${activeCls}">
        <div class="relative flex w-full flex-col items-center">
          <div class="relative"><i data-lucide="${item.icon}" class="h-6 w-6"></i><span data-shell-badge="${item.href}" class="absolute -right-1 -top-1 hidden min-w-[16px] rounded-full bg-rose-500 px-1 py-0.5 text-[9px] font-black leading-none text-white shadow-sm">0</span></div>
          <span class="mt-1 max-w-[4.4rem] truncate text-[10px] font-bold leading-tight">${escapeHtml(item.label)}</span>
          ${active ? '<div class="member-bottom-indicator absolute -bottom-1.5 h-1 w-1 rounded-full bg-sky-600"></div>' : ""}
        </div>
      </a>
    `;
  });

  // Add "More" button
  const moreActive = !activeInPrimary && pathname !== "/logout";
  const moreCls = moreActive
    ? "bg-sky-50 text-sky-700 ring-1 ring-sky-100 shadow-sm"
    : "text-slate-500";
  html.push(`
    <button type="button" data-shell-more-toggle data-shell-more-trigger aria-expanded="${moreActive ? "true" : "false"}" class="member-bottom-nav-item pressable-native ${moreCls}">
      <div class="relative flex w-full flex-col items-center">
        <div class="relative"><i data-lucide="more-horizontal" class="h-6 w-6"></i><span data-shell-badge-more class="absolute -right-1 -top-1 hidden h-2.5 w-2.5 rounded-full border-2 border-white bg-rose-500 shadow-sm"></span></div>
        <span class="mt-1 max-w-[4.4rem] truncate text-[10px] font-bold leading-tight">เพิ่มเติม</span>
        ${moreActive ? '<div class="member-bottom-indicator absolute -bottom-1.5 h-1 w-1 rounded-full bg-sky-600"></div>' : ""}
      </div>
    </button>
  `);

  return html.join("");
}

export function renderMemberShell(contentHtml) {
  const pathname = window.location.pathname;
  const meta = resolveMeta_(pathname);
  const auth = readAuthSession_();
  const user = auth?.user || {};
  const displayName = String(user.displayName || "Member");
  const photoURL = String(user.photoURL || "").trim();
  const initials = resolveInitials_(displayName);
  const navItems = buildNavItems_(user);
  const secondaryItems = navItems.slice(4);

  return `
    <style>
      .member-shell { min-height: 100dvh; }
      .pressable-native { -webkit-tap-highlight-color: transparent; transition: transform 0.1s ease, opacity 0.1s ease; }
      .pressable-native:active { transform: scale(0.96); opacity: 0.8; }
      .safe-pb { padding-bottom: env(safe-area-inset-bottom); }
      .safe-pt { padding-top: env(safe-area-inset-top); }
      .member-bottom-nav-item {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 0.95rem;
        padding: 0.5rem 0.2rem;
        transition: background-color .2s ease, color .2s ease, box-shadow .2s ease;
      }
      .member-bottom-indicator {
        animation: memberBottomIndicatorPop .35s cubic-bezier(0.2, 0.8, 0.2, 1);
      }
      .member-bottom-nav-item i,
      .member-bottom-nav-item svg {
        width: 1.25rem;
        height: 1.25rem;
      }
      .member-more-card {
        border: 1px solid rgb(226 232 240 / 0.7);
        background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        border-radius: 1rem;
      }
      .member-more-card:active {
        transform: scale(0.98);
      }
      
      @keyframes slideUp {
        from { transform: translateY(100%); }
        to { transform: translateY(0); }
      }
      .animate-slide-up { animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1); }
      @keyframes memberBottomIndicatorPop {
        from { transform: scale(.2); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
    </style>

    <div class="member-shell flex flex-col lg:flex-row bg-[radial-gradient(circle_at_top,_#e0f2fe_0%,_#f8fbff_40%,_#f8fafc_100%)] text-slate-700">
      <div class="flex flex-1 w-full flex-col lg:flex-row">
        <!-- Desktop Sidebar -->
        <aside class="hidden lg:flex w-72 shrink-0 flex-col border-r border-sky-100/80 bg-white/80 px-4 py-5 backdrop-blur-xl">
          <a data-link href="/app" class="mb-6 flex items-center gap-3 rounded-2xl border border-sky-100 bg-white px-3 py-3 shadow-sm pressable-native">
            <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-lg shadow-sky-400/25">
              <i data-lucide="shield-check" class="h-5 w-5"></i>
            </div>
            <div>
              <p class="text-sm font-black text-slate-800">ANT Library</p>
              <p class="text-xs font-semibold text-sky-700">Member Area</p>
            </div>
          </a>

          <nav class="space-y-1">${renderDesktopNav_(navItems, pathname)}</nav>

          <div class="mt-auto rounded-2xl border border-slate-200 bg-white p-3">
              <div class="flex items-center gap-3">
                <div class="member-avatar h-11 w-11 relative overflow-hidden bg-slate-800 text-white border border-slate-100 shadow-sm">
                  <div class="flex h-full w-full items-center justify-center">${escapeHtml(initials)}</div>
                  ${photoURL ? `<img src="${escapeHtml(photoURL)}" alt="${escapeHtml(displayName)}" class="absolute inset-0 h-full w-full object-cover rounded-full" onerror="this.style.display='none';">` : ""}
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-black text-slate-800">${escapeHtml(displayName)}</p>
                  <p class="truncate text-xs font-semibold text-slate-500">${escapeHtml(user.role || "member")}</p>
                </div>
              </div>
            <a data-link href="/logout" class="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-100 pressable-native">ออกจากระบบ</a>
          </div>
        </aside>

        <!-- Main Content -->
        <main class="flex min-w-0 flex-1 flex-col pb-24 lg:pb-0">
          <header class="sticky top-0 z-40 border-b border-sky-100/80 bg-white/90 px-4 py-3 backdrop-blur-xl lg:px-6 safe-pt">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[10px] font-black uppercase tracking-[0.12em] text-sky-600 lg:text-xs">Member Space</p>
                <h1 class="text-base font-black text-slate-800 lg:text-lg">${escapeHtml(meta.title)}</h1>
              </div>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  data-noti-toggle
                  class="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sky-100 bg-white text-slate-500 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 pressable-native"
                  aria-label="เปิดรายการแจ้งเตือน"
                >
                  <i data-lucide="bell" class="h-5 w-5"></i>
                  <span data-noti-badge class="absolute -right-1 -top-1 hidden min-w-[18px] rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-white shadow-sm">0</span>
                </button>

                <a data-link href="/app/profile" class="member-avatar h-10 w-10 relative overflow-hidden border border-sky-100 bg-white text-xs font-black text-slate-700 pressable-native">
                  <div class="flex h-full w-full items-center justify-center uppercase">${escapeHtml(initials)}</div>
                  ${photoURL ? `<img src="${escapeHtml(photoURL)}" alt="${escapeHtml(displayName)}" class="absolute inset-0 h-full w-full object-cover rounded-full">` : ""}
                </a>
              </div>
            </div>
          </header>

          <div class="flex-1">${contentHtml}</div>
        </main>
      </div>

      <!-- Mobile Bottom Nav -->
      <nav class="fixed bottom-0 left-0 right-0 z-50 border-t border-sky-100/80 bg-white/95 px-2 pt-1.5 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:hidden safe-pb">
        <div class="mx-auto flex w-full max-w-xl items-stretch gap-1">
          ${renderMobileNav_(navItems, pathname)}
        </div>
      </nav>

      <!-- More Menu Bottom Sheet (Hidden by default) -->
      <div id="shell-more-menu" class="fixed inset-0 z-[60] hidden">
        <div data-shell-more-toggle data-shell-more-overlay class="absolute inset-0 bg-slate-900/40 opacity-0 backdrop-blur-sm transition-opacity duration-200"></div>
        <div data-shell-more-panel class="absolute bottom-0 left-0 right-0 translate-y-4 opacity-0 rounded-t-[2rem] border-t border-sky-100 bg-white p-6 shadow-2xl transition-all duration-300 [transition-timing-function:cubic-bezier(0.2,0.85,0.2,1)] safe-pb">
          <div class="mx-auto mb-5 h-1.5 w-12 rounded-full bg-slate-200"></div>
          <div class="mb-5 rounded-2xl border border-sky-100 bg-gradient-to-r from-sky-50 to-indigo-50 px-4 py-3">
            <p class="text-[11px] font-black uppercase tracking-[0.12em] text-sky-700">Quick Access</p>
            <h2 class="mt-1 text-lg font-black text-slate-800">เมนูเพิ่มเติม</h2>
          </div>
          <div class="grid grid-cols-3 gap-4">
            ${secondaryItems.map((item) => {
              const active = pathname === item.href;
              const activeCls = active ? "border-sky-200 bg-sky-50 text-sky-700 shadow-sm" : "text-slate-600";
              return `
                <a data-link href="${item.href}" data-shell-more-link class="member-more-card pressable-native flex flex-col items-center justify-center gap-2 p-4 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 ${activeCls}">
                  <div class="relative"><i data-lucide="${item.icon}" class="h-6 w-6"></i><span data-shell-badge="${item.href}" class="absolute -right-1 -top-1 hidden min-w-[16px] rounded-full bg-rose-500 px-1 py-0.5 text-[9px] font-black leading-none text-white shadow-sm">0</span></div>
                  <span class="text-xs font-bold text-center">${escapeHtml(item.label)}</span>
                </a>
              `;
            }).join("")}
          </div>
          <div class="mt-8 border-t border-slate-100 pt-6">
            <a data-link href="/logout" data-shell-more-link class="flex w-full items-center justify-center gap-3 rounded-2xl bg-rose-50 p-4 font-black text-rose-600 pressable-native">
              <i data-lucide="log-out" class="h-5 w-5"></i>
              <span>ออกจากระบบ</span>
            </a>
          </div>
        </div>
      </div>
    </div>

  `;
}

function setMoreMenuOpen_(open) {
  const menu = document.getElementById("shell-more-menu");
  const overlay = document.querySelector("[data-shell-more-overlay]");
  const panel = document.querySelector("[data-shell-more-panel]");
  if (!menu || !overlay || !panel) return;

  const openState = Boolean(open);
  document.querySelectorAll("[data-shell-more-trigger]").forEach((el) => {
    el.setAttribute("aria-expanded", openState ? "true" : "false");
  });

  if (openState) {
    menu.classList.remove("hidden");
    requestAnimationFrame(() => {
      overlay.classList.remove("opacity-0");
      overlay.classList.add("opacity-100");
      panel.classList.remove("translate-y-4", "opacity-0");
      panel.classList.add("translate-y-0", "opacity-100");
    });
    return;
  }

  overlay.classList.remove("opacity-100");
  overlay.classList.add("opacity-0");
  panel.classList.remove("translate-y-0", "opacity-100");
  panel.classList.add("translate-y-4", "opacity-0");
  window.setTimeout(() => {
    if (!panel.classList.contains("opacity-0")) return;
    menu.classList.add("hidden");
  }, 210);
}

export function syncMemberSidebarUi() {
  const currentPath = window.location.pathname;
  document.querySelectorAll(".member-nav-item, .member-bottom-nav-item").forEach((item) => {
    const href = item.getAttribute("href");
    const isMobile = item.classList.contains("member-bottom-nav-item");
    const isMoreTrigger = item.hasAttribute("data-shell-more-trigger");
    let isActive = currentPath === href;
    if (isMoreTrigger) {
      isActive = !MOBILE_PRIMARY_PATHS.includes(currentPath) && currentPath !== "/logout";
    }

    if (isMobile) {
      item.classList.toggle("bg-sky-50", isActive);
      item.classList.toggle("ring-1", isActive);
      item.classList.toggle("ring-sky-100", isActive);
      item.classList.toggle("shadow-sm", isActive);
      item.classList.toggle("text-sky-700", isActive);
      item.classList.toggle("text-slate-500", !isActive);
      return;
    }

    item.classList.toggle("border-sky-200", isActive);
    item.classList.toggle("bg-sky-50", isActive);
    item.classList.toggle("text-sky-800", isActive);
    item.classList.toggle("border-transparent", !isActive);
    item.classList.toggle("text-slate-600", !isActive);
  });

  document.querySelectorAll("[data-shell-more-toggle]").forEach((el) => {
    if (el.dataset.boundClick === "1") return;
    el.dataset.boundClick = "1";
    el.addEventListener("click", () => {
      const isTrigger = el.hasAttribute("data-shell-more-trigger");
      const menu = document.getElementById("shell-more-menu");
      const currentlyOpen = menu && !menu.classList.contains("hidden");
      if (isTrigger) {
        setMoreMenuOpen_(!currentlyOpen);
        return;
      }
      setMoreMenuOpen_(false);
    });
  });

  document.querySelectorAll("[data-shell-more-link]").forEach((el) => {
    if (el.dataset.boundClick === "1") return;
    el.dataset.boundClick = "1";
    el.addEventListener("click", () => setMoreMenuOpen_(false));
  });
}

export function initMemberShellSync() {
  const updateBadges = (dashboard) => {
    const fines = dashboard?.finesRes?.data?.items || [];
    const unpaidCount = fines.length;

    // Update Fine Badge
    document.querySelectorAll('[data-shell-badge="/app/fines"]').forEach(el => {
      if (unpaidCount > 0) {
        el.textContent = unpaidCount > 99 ? "99+" : String(unpaidCount);
        el.classList.remove("hidden");
      } else {
        el.classList.add("hidden");
      }
    });

    // Update More Badge (if any secondary item has a badge)
    const moreBadge = document.querySelector('[data-shell-badge-more]');
    if (moreBadge) {
      if (unpaidCount > 0) {
        moreBadge.classList.remove("hidden");
      } else {
        moreBadge.classList.add("hidden");
      }
    }
  };

  const dashboard = store.get(MEMBER_SYNC_KEYS.dashboard);
  if (dashboard) updateBadges(dashboard);

  return store.subscribe(MEMBER_SYNC_KEYS.dashboard, (val) => {
    updateBadges(val);
  });
}
