import { escapeHtml } from "../utils/html.js";

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
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

function buildNavItems_(actor) {
  const role = String(actor?.role || "").toLowerCase();
  const canSwitchToManage = actor?.groupType === "manage" && (role === "admin" || role === "librarian");

  const items = [
    { href: "/app", label: "หน้าหลัก", icon: "layout-dashboard" },
    { href: "/app/books", label: "ค้นหา", icon: "book-open" },
    { href: "/app/loan-self", label: "ยืม-คืน", icon: "scan-line" },
    { href: "/app/checkin", label: "เช็คอิน", icon: "qr-code" },
    { href: "/app/reservations", label: "การจอง", icon: "bookmark-check" },
    { href: "/app/loans", label: "การยืม", icon: "receipt-text" },
    { href: "/app/fines", label: "ค่าปรับ", icon: "badge-dollar-sign" },
    { href: "/app/profile", label: "โปรไฟล์", icon: "user-round" },
  ];

  if (canSwitchToManage) {
    items.push({ href: "/manage", label: "ไปหน้าจัดการ", icon: "shield-check" });
  }

  return items;
}

function renderDesktopNav_(items, pathname) {
  return items
    .map((item) => {
      const active = pathname === item.href;
      const activeCls = active
        ? "border-sky-200 bg-sky-50 text-sky-800"
        : "border-transparent text-slate-600 hover:border-sky-100 hover:bg-sky-50 hover:text-sky-700";
      return `
        <a data-link href="${item.href}" class="member-nav-item ${activeCls}">
          <i data-lucide="${item.icon}" class="h-5 w-5"></i>
          <span class="text-sm font-bold">${escapeHtml(item.label)}</span>
        </a>
      `;
    })
    .join("");
}

function renderMobileNav_(items, pathname) {
  const visible = items.slice(0, 5);
  return visible
    .map((item) => {
      const active = pathname === item.href;
      const activeCls = active ? "text-sky-700" : "text-slate-500";
      return `
        <a data-link href="${item.href}" class="member-bottom-item ${activeCls}">
          <i data-lucide="${item.icon}" class="h-5 w-5"></i>
          <span>${escapeHtml(item.label)}</span>
        </a>
      `;
    })
    .join("");
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

  return `
    <div class="member-shell min-h-screen bg-[radial-gradient(circle_at_top,_#e0f2fe_0%,_#f8fbff_40%,_#f8fafc_100%)] text-slate-700">
      <div class="flex min-h-screen w-full flex-col lg:flex-row">
        <aside class="hidden lg:flex w-72 shrink-0 flex-col border-r border-sky-100/80 bg-white/80 px-4 py-5 backdrop-blur-xl">
          <a data-link href="/app" class="mb-6 flex items-center gap-3 rounded-2xl border border-sky-100 bg-white px-3 py-3 shadow-sm">
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
                <div class="member-avatar h-11 w-11 relative overflow-hidden bg-slate-800 text-white">
                  <div class="flex h-full w-full items-center justify-center">${escapeHtml(initials)}</div>
                  ${photoURL ? `<img src="${escapeHtml(photoURL)}" alt="${escapeHtml(displayName)}" class="absolute inset-0 h-full w-full object-cover rounded-full" onerror="this.style.display='none';">` : ""}
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-black text-slate-800">${escapeHtml(displayName)}</p>
                  <p class="truncate text-xs font-semibold text-slate-500">${escapeHtml(user.role || "member")}</p>
                </div>
              </div>
            <a data-link href="/logout" class="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-100">ออกจากระบบ</a>
          </div>
        </aside>

        <main class="flex min-h-screen min-w-0 flex-1 flex-col pb-20 lg:pb-0">
          <header class="sticky top-0 z-40 border-b border-sky-100/80 bg-white/90 px-4 py-3 backdrop-blur-xl lg:px-6">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs font-black uppercase tracking-[0.12em] text-sky-600">Member</p>
                <h1 class="text-base font-black text-slate-800 lg:text-lg">${escapeHtml(meta.title)}</h1>
              </div>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  data-noti-toggle
                  class="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sky-100 bg-white text-slate-500 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                  aria-label="เปิดรายการแจ้งเตือน"
                >
                  <i data-lucide="bell" class="h-5 w-5"></i>
                  <span data-noti-badge class="absolute -right-1 -top-1 hidden min-w-[18px] rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">0</span>
                </button>

                <a data-link href="/app/profile" class="member-avatar h-10 w-10 relative overflow-hidden border border-sky-100 bg-white text-xs font-black text-slate-700">
                  <div class="flex h-full w-full items-center justify-center uppercase">${escapeHtml(initials)}</div>
                  ${photoURL ? `<img src="${escapeHtml(photoURL)}" alt="${escapeHtml(displayName)}" class="absolute inset-0 h-full w-full object-cover rounded-full" onerror="this.style.display='none';">` : ""}
                </a>
              </div>
            </div>

            <div data-noti-panel class="absolute right-4 top-[68px] z-[2147482000] hidden w-[min(92vw,360px)] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl lg:right-6">
              <div class="mb-2 flex items-center justify-between">
                <p class="text-sm font-black text-slate-800">การแจ้งเตือน</p>
                <button type="button" data-noti-mark-all class="rounded-lg px-2 py-1 text-xs font-bold text-sky-700 hover:bg-sky-50">อ่านทั้งหมด</button>
              </div>
              <div data-noti-list class="max-h-80 space-y-2 overflow-y-auto pr-1"></div>
            </div>
          </header>

          <section id="member-content" class="member-content flex-1 px-3 py-4 lg:px-6 lg:py-6">
            ${contentHtml}
          </section>
        </main>
      </div>

      <nav class="member-bottom-nav lg:hidden">
        ${renderMobileNav_(navItems, pathname)}
      </nav>
    </div>
  `;
}

export function syncMemberSidebarUi() {
  const currentPath = window.location.pathname;
  document.querySelectorAll(".member-nav-item, .member-bottom-nav-item").forEach((item) => {
    const href = item.getAttribute("href");
    const isActive = currentPath === href;
    const isMobile = item.classList.contains("member-bottom-nav-item");

    if (isMobile) {
      if (isActive) {
        item.classList.remove("text-slate-400");
        item.classList.add("text-sky-600");
      } else {
        item.classList.remove("text-sky-600");
        item.classList.add("text-slate-400");
      }
    } else {
      if (isActive) {
        item.classList.remove("border-transparent", "text-slate-600", "hover:border-sky-100", "hover:bg-sky-50", "hover:text-sky-700");
        item.classList.add("border-sky-200", "bg-sky-50", "text-sky-800");
      } else {
        item.classList.remove("border-sky-200", "bg-sky-50", "text-sky-800");
        item.classList.add("border-transparent", "text-slate-600", "hover:border-sky-100", "hover:bg-sky-50", "hover:text-sky-700");
      }
    }
  });
}
