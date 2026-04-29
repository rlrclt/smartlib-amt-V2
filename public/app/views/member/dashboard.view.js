import {
  MEMBER_SYNC_KEYS,
  getMemberResource,
  revalidateMemberResource,
  subscribeMemberResource,
} from "../../data/member_sync.js";
import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";

const STATE = {
  loading: false,
  profile: null,
  stats: {
    activeLoans: 0,
    overdueCount: 0,
    unpaidFineTotal: 0,
    nextDueDate: "",
  },
  announcements: [],
  upcoming: [],
  unsubscribe: null,
  rootAliveTimerId: 0,
};

function ensureNativeStyles_() {
  if (document.getElementById("memberDashboardNativeStyle")) return;
  const style = document.createElement("style");
  style.id = "memberDashboardNativeStyle";
  style.textContent = `
    #memberDashboardRoot {
      min-height: 100%;
      background:
        radial-gradient(circle at top left, rgba(14, 165, 233, 0.14), transparent 24%),
        radial-gradient(circle at top right, rgba(96, 165, 250, 0.12), transparent 20%),
        radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.08), transparent 18%),
        linear-gradient(180deg, rgba(248, 251, 255, 0.75) 0%, rgba(248, 250, 252, 0.96) 100%);
      border-radius: 1.5rem;
    }
    .member-dashboard-shell {
      width: 100%;
      min-height: calc(100dvh - env(safe-area-inset-top, 0px));
      container-type: inline-size;
      padding-bottom: calc(6rem + env(safe-area-inset-bottom, 0px));
      overflow-x: hidden;
    }
    .pressable {
      transition: transform 0.16s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease;
      cursor: pointer;
      user-select: none;
      -webkit-tap-highlight-color: transparent;
    }
    .pressable:active {
      transform: scale(0.97);
      opacity: 0.86;
    }
    .skeleton-box {
      background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
      background-size: 200% 100%;
      animation: dashboardShimmer 1.4s infinite;
    }
    @keyframes dashboardShimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .fade-in {
      animation: dashboardFadeIn 0.35s ease-out both;
    }
    @keyframes dashboardFadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .dashboard-accent-card {
      position: relative;
      overflow: hidden;
      isolation: isolate;
    }
    .dashboard-accent-card::after {
      content: "";
      position: absolute;
      inset: auto -16% -46% auto;
      width: 9rem;
      height: 9rem;
      border-radius: 9999px;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.5), transparent 68%);
      filter: blur(6px);
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

function greetByHour_(date = new Date()) {
  const hour = date.getHours();
  if (hour < 5) return "สวัสดีตอนดึก";
  if (hour < 12) return "สวัสดีตอนเช้า";
  if (hour < 17) return "สวัสดีตอนบ่าย";
  return "สวัสดีตอนเย็น";
}

function fmtDate(value) {
  const d = new Date(String(value || ""));
  if (!Number.isFinite(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toCurrency(value) {
  return Number(value || 0).toLocaleString("th-TH");
}

function profileName_() {
  const p = STATE.profile || {};
  return String(
    p.displayName ||
    p.fullName ||
    p.name ||
    p.nickname ||
    p.email ||
    "สมาชิก",
  );
}

function profilePhoto_() {
  const p = STATE.profile || {};
  const photo = String(p.photoURL || p.photoUrl || p.avatar || "").trim();
  if (photo) return photo;
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profileName_())}&backgroundColor=e0f2fe`;
}

function normalizeProfile_(res) {
  const data = res?.data || {};
  return data.profile || data.user || data.member || data;
}

function announcementIcon_(item = {}) {
  const category = String(item.category || item.type || "").toLowerCase();
  if (category.includes("event")) return "calendar-days";
  if (category.includes("alert") || category.includes("important")) return "megaphone";
  if (category.includes("news")) return "newspaper";
  if (category.includes("policy")) return "shield";
  return "megaphone";
}

function statTone_(kind, value) {
  const hasAlert = Number(value || 0) > 0;
  if (kind === "fines") {
    return hasAlert
      ? { bg: "bg-gradient-to-br from-rose-50 via-white to-rose-100 border-rose-100", label: "text-rose-700", value: "text-rose-800", icon: "wallet", badge: "bg-rose-600 text-white" }
      : { bg: "bg-gradient-to-br from-white to-rose-50 border-rose-100", label: "text-slate-500", value: "text-slate-800", icon: "wallet", badge: "bg-rose-100 text-rose-700" };
  }
  if (kind === "overdue") {
    return hasAlert
      ? { bg: "bg-gradient-to-br from-rose-50 via-white to-orange-50 border-rose-100", label: "text-rose-700", value: "text-rose-800", icon: "triangle-alert", badge: "bg-rose-600 text-white" }
      : { bg: "bg-gradient-to-br from-white to-orange-50 border-slate-100", label: "text-slate-500", value: "text-slate-800", icon: "triangle-alert", badge: "bg-orange-100 text-orange-700" };
  }
  if (kind === "due") {
    return hasAlert
      ? { bg: "bg-gradient-to-br from-amber-50 via-white to-yellow-50 border-amber-100", label: "text-amber-700", value: "text-amber-800", icon: "clock", badge: "bg-amber-500 text-white" }
      : { bg: "bg-gradient-to-br from-white to-yellow-50 border-slate-100", label: "text-slate-500", value: "text-slate-800", icon: "clock", badge: "bg-amber-100 text-amber-700" };
  }
  return { bg: "bg-gradient-to-br from-sky-50 via-white to-blue-50 border-sky-100", label: "text-sky-700", value: "text-sky-900", icon: "book-open", badge: "bg-sky-100 text-sky-700" };
}

function renderSkeleton_() {
  return `
    <div class="member-dashboard-shell bg-slate-50">
      <section class="rounded-[1.25rem] border border-cyan-100 bg-cyan-50/60 p-4 shadow-sm">
        <div class="skeleton-box h-3 w-24 rounded-full"></div>
        <div class="mt-2 skeleton-box h-4 w-40 rounded-full"></div>
      </section>
      <section class="mt-5">
        <div class="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-4">
          ${Array.from({ length: 4 })
            .map(() => `
              <article class="h-[92px] rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div class="skeleton-box h-3 w-20 rounded-full"></div>
                <div class="mt-3 skeleton-box h-6 w-12 rounded-full"></div>
              </article>
            `)
            .join("")}
        </div>
      </section>
      <section class="mt-5 rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
        <div class="skeleton-box h-4 w-28 rounded-full"></div>
        <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          ${Array.from({ length: 5 })
            .map(() => `
              <div class="flex flex-col items-center gap-2">
                <div class="skeleton-box h-12 w-12 rounded-full"></div>
                <div class="skeleton-box h-3 w-12 rounded-full"></div>
              </div>
            `)
            .join("")}
        </div>
      </section>
      <section class="mt-5">
        <div class="mb-3 flex items-center justify-between">
          <div class="skeleton-box h-4 w-28 rounded-full"></div>
          <div class="skeleton-box h-3 w-16 rounded-full"></div>
        </div>
        <div class="space-y-3">
          <div class="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div class="skeleton-box h-4 w-1/2 rounded-full"></div>
            <div class="mt-2 skeleton-box h-3 w-2/3 rounded-full"></div>
          </div>
          <div class="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div class="skeleton-box h-4 w-1/2 rounded-full"></div>
            <div class="mt-2 skeleton-box h-3 w-2/3 rounded-full"></div>
          </div>
        </div>
      </section>
      <section class="mt-5 pb-3">
        <div class="mb-3 flex items-center justify-between">
          <div class="skeleton-box h-4 w-24 rounded-full"></div>
        </div>
        <div class="grid gap-3 xl:grid-cols-2">
          <div class="h-[124px] rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"></div>
          <div class="h-[124px] rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"></div>
        </div>
      </section>
    </div>
  `;
}

function renderStatCard_(title, value, subtext, kind, alertValue) {
  const tone = statTone_(kind, alertValue);
  return `
    <article class="dashboard-accent-card fade-in h-[92px] rounded-2xl border ${tone.bg} p-4 shadow-sm">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5 ${tone.label}">
          <span class="inline-flex h-7 w-7 items-center justify-center rounded-full ${tone.badge || "bg-white text-slate-600"} shadow-sm">
            <i data-lucide="${tone.icon}" class="h-4 w-4"></i>
          </span>
          <span class="text-xs font-bold">${escapeHtml(title)}</span>
        </div>
        <span class="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${tone.badge || "bg-white text-slate-500"}">${kind}</span>
      </div>
      <div class="mt-2 flex items-end justify-between gap-2">
        <div>
          <h3 class="text-xl font-black ${tone.value}">${escapeHtml(value)}</h3>
          ${subtext ? `<p class="mt-0.5 text-[11px] font-semibold ${tone.label}">${escapeHtml(subtext)}</p>` : ""}
        </div>
      </div>
    </article>
  `;
}

function renderStats_() {
  const nextDueText = STATE.stats.nextDueDate ? fmtDate(STATE.stats.nextDueDate) : "-";
  return `
    <section>
      <h2 class="mb-3 px-1 text-sm font-black text-slate-800">ภาพรวมบัญชีของคุณ</h2>
      <div class="grid grid-cols-2 gap-3 xl:grid-cols-4">
        ${renderStatCard_("กำลังยืมอยู่", String(STATE.stats.activeLoans), "เล่มทั้งหมด", "borrow", STATE.stats.activeLoans)}
        ${renderStatCard_("เกินกำหนด", String(STATE.stats.overdueCount), "รายการที่ต้องจัดการ", "overdue", STATE.stats.overdueCount)}
        ${renderStatCard_("ค่าปรับค้าง", `฿${toCurrency(STATE.stats.unpaidFineTotal)}`, "ยอดรวมคงค้าง", "fines", STATE.stats.unpaidFineTotal)}
        ${renderStatCard_("กำหนดคืนถัดไป", nextDueText, "เล่มใกล้ครบกำหนด", "due", STATE.stats.overdueCount)}
      </div>
    </section>
  `;
}

function renderBusinessHours_() {
  const isOpen = true;
  return `
    <section>
      <article class="dashboard-accent-card relative overflow-hidden rounded-[1.4rem] border border-sky-100 bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-500 p-4 shadow-lg shadow-sky-100/70">
        <div class="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/20 blur-2xl"></div>
        <div class="absolute bottom-[-1.5rem] left-[-1rem] h-24 w-24 rounded-full bg-white/14 blur-2xl"></div>
        <div class="relative z-10 flex items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/18 text-2xl shadow-inner backdrop-blur-sm">🏛️</span>
            <div class="min-w-0">
              <p class="text-xs font-black uppercase tracking-[0.18em] text-white/90">เวลาทำการวันนี้</p>
              <p class="mt-0.5 text-sm font-bold text-white">${isOpen ? "08:30 - 16:30" : "ปิดให้บริการ"} <span class="text-white/80">${isOpen ? "(เปิดให้บริการ)" : ""}</span></p>
            </div>
          </div>
          <a data-link href="/app/checkin" class="pressable shrink-0 rounded-[0.95rem] border border-white/20 bg-white/18 px-3.5 py-2 text-[11px] font-black text-white shadow-md shadow-sky-900/10 backdrop-blur-sm">เช็คอินเลย</a>
        </div>
      </article>
    </section>
  `;
}

function renderShortcuts_() {
  const items = [
    { href: "/app/books", icon: "search", label: "ค้นหา\nหนังสือ", active: false },
    { href: "/app/checkin", icon: "scan-line", label: "เช็คอิน\nห้องสมุด", active: false },
    { href: "/app/loan-self", icon: "scan-line", label: "ยืมด้วย\nตนเอง", active: true },
    { href: "/app/fines", icon: "wallet", label: "ชำระ\nค่าปรับ", active: false },
    { href: "/app/profile", icon: "badge", label: "บัตร\nสมาชิก", active: false, badge: true },
  ];
  return `
    <section>
      <div class="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
        <div class="mb-3 flex items-center justify-between">
          <p class="text-sm font-black text-slate-800">ทางลัด</p>
          <span class="rounded-full bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-700">เข้าถึงเร็ว</span>
        </div>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
          ${items
            .map(
              (item) => `
                <a data-link href="${escapeHtml(item.href)}" class="pressable group flex flex-col items-center gap-2 text-center">
                  <div class="relative flex h-12 w-12 items-center justify-center rounded-full border shadow-sm transition-colors ${item.active ? "border-sky-100 bg-gradient-to-br from-sky-50 via-white to-blue-50 text-sky-600" : "border-slate-100 bg-gradient-to-br from-white to-slate-50 text-slate-600"} group-hover:border-sky-100 group-hover:bg-gradient-to-br group-hover:from-sky-50 group-hover:via-white group-hover:to-blue-50 group-hover:text-sky-600">
                    ${item.badge ? '<span class="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-brand-500"></span>' : ""}
                    <i data-lucide="${item.icon}" class="h-5 w-5"></i>
                  </div>
                  <span class="whitespace-pre-line text-[10px] font-bold leading-tight ${item.active ? "text-sky-700" : "text-slate-500"}">${escapeHtml(item.label)}</span>
                </a>
              `,
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderUpcoming_() {
  const items = STATE.upcoming || [];
  return `
    <section>
      <div class="mb-3 flex items-center justify-between px-1">
        <h2 class="text-sm font-black text-slate-800">กำหนดคืนที่ใกล้มาถึง</h2>
        <a data-link href="/app/loans" class="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">ดูทั้งหมด</a>
      </div>
      ${
        items.length
          ? `<div class="space-y-3">${items.map((item) => `
              <article class="dashboard-accent-card fade-in flex gap-3 rounded-2xl border border-slate-100 bg-gradient-to-br from-white via-white to-sky-50 p-3 shadow-sm">
                <div class="flex h-16 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 text-sky-500">
                  <i data-lucide="book-open" class="h-5 w-5"></i>
                </div>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-black text-slate-800">${escapeHtml(item.title || item.barcode || "-")}</p>
                  <p class="mt-1 text-xs font-semibold text-slate-500">Barcode: ${escapeHtml(item.barcode || "-")}</p>
                  <div class="mt-2 inline-flex rounded-full bg-sky-100 px-2 py-1 text-[11px] font-black text-sky-700">กำหนดคืน: ${escapeHtml(fmtDate(item.dueDate))}</div>
                </div>
              </article>
            `).join("")}</div>`
          : '<div class="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">ยังไม่มีรายการกำหนดคืนที่ต้องติดตาม</div>'
      }
    </section>
  `;
}

function renderAnnouncements_() {
  const items = STATE.announcements || [];
  return `
    <section class="pb-4">
      <div class="mb-3 flex items-center justify-between px-1">
        <h2 class="text-sm font-black text-slate-800">ประกาศล่าสุด</h2>
        <a data-link href="/announcements" class="rounded-full bg-violet-50 px-2 py-1 text-[11px] font-bold text-violet-700">ดูทั้งหมด</a>
      </div>
      ${
        items.length
          ? `<div class="hide-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 xl:grid xl:snap-none xl:grid-cols-2 xl:overflow-visible xl:px-0">
              ${items.map((item) => `
                <a data-link href="/announcements" class="dashboard-accent-card pressable snap-center shrink-0 w-[280px] rounded-2xl border border-slate-100 bg-gradient-to-br from-white via-violet-50/40 to-sky-50 p-4 shadow-sm xl:w-auto xl:min-w-0">
                  <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2 text-violet-700">
                      <i data-lucide="${announcementIcon_(item)}" class="h-4 w-4"></i>
                      <span class="text-[11px] font-bold uppercase tracking-wide">${escapeHtml(item.category || "ประกาศ")}</span>
                    </div>
                    <span class="text-[10px] font-bold text-slate-400">${escapeHtml(item.date || "")}</span>
                  </div>
                  <p class="mt-3 text-sm font-black text-slate-800">${escapeHtml(item.title || "-")}</p>
                  <p class="mt-1 line-clamp-2 text-xs font-medium text-slate-500">${escapeHtml(item.summary || "")}</p>
                </a>
              `).join("")}
            </div>`
          : '<div class="px-4"><div class="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">ยังไม่มีประกาศล่าสุด</div></div>'
      }
    </section>
  `;
}

function renderBody_(root) {
  if (STATE.loading) {
    root.innerHTML = renderSkeleton_();
    return;
  }

  root.innerHTML = `
    <div class="member-dashboard-shell px-4 pt-2 lg:px-6 xl:px-8">
      ${renderBusinessHours_()}
      <div class="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]">
        <div class="space-y-5">
          ${renderStats_()}
          ${renderShortcuts_()}
        </div>
        <div class="space-y-5">
          ${renderUpcoming_()}
          ${renderAnnouncements_()}
        </div>
      </div>
    </div>
  `;

  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

export function renderMemberDashboardView() {
  ensureNativeStyles_();
  return '<section id="memberDashboardRoot" class="view"></section>';
}

function applyDashboardBundle_(bundle) {
  const profileRes = bundle?.profileRes || {};
  const annRes = bundle?.annRes || {};
  const loansRes = bundle?.loansRes || {};
  const finesRes = bundle?.finesRes || {};

  STATE.profile = normalizeProfile_(profileRes);
  const loans = loansRes?.ok && Array.isArray(loansRes.data?.items) ? loansRes.data.items : [];
  const unpaid = finesRes?.ok && Array.isArray(finesRes.data?.items) ? finesRes.data.items : [];
  const activeLoans = loans.filter((item) => ["borrowing", "overdue"].includes(String(item.status || "")));
  const overdueCount = loans.filter((item) => String(item.status || "") === "overdue").length;
  const nextDue = activeLoans
    .map((item) => ({ ...item, dueTs: new Date(String(item.dueDate || "")).getTime() }))
    .filter((item) => Number.isFinite(item.dueTs))
    .sort((a, b) => a.dueTs - b.dueTs);

  STATE.stats = {
    activeLoans: activeLoans.length,
    overdueCount,
    unpaidFineTotal: unpaid.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    nextDueDate: nextDue[0]?.dueDate || "",
  };
  STATE.announcements = annRes?.ok && Array.isArray(annRes.data?.items)
    ? annRes.data.items.slice(0, 3)
    : [];
  STATE.upcoming = nextDue.slice(0, 4).map((item) => ({
    barcode: item.barcode,
    title: item.title || item.bookTitle || item.book_name || "",
    dueDate: item.dueDate,
    status: item.status,
  }));
}

function cleanupDashboard_() {
  STATE.unsubscribe?.();
  STATE.unsubscribe = null;
  if (STATE.rootAliveTimerId) {
    clearInterval(STATE.rootAliveTimerId);
    STATE.rootAliveTimerId = 0;
  }
}

export async function mountMemberDashboardView(container) {
  const root = container.querySelector("#memberDashboardRoot");
  if (!root) return;

  ensureNativeStyles_();
  cleanupDashboard_();
  STATE.loading = true;
  renderBody_(root);

  try {
    const cached = getMemberResource(MEMBER_SYNC_KEYS.dashboard);
    if (cached) {
      applyDashboardBundle_(cached);
      STATE.loading = false;
      renderBody_(root);
      void revalidateMemberResource(MEMBER_SYNC_KEYS.dashboard, { force: true });
    } else {
      const res = await revalidateMemberResource(MEMBER_SYNC_KEYS.dashboard, { force: true });
      if (!res?.ok || !res.data) throw new Error(res?.error || "โหลดหน้าหลักสมาชิกไม่สำเร็จ");
      applyDashboardBundle_(res.data);
    }

    STATE.unsubscribe = subscribeMemberResource(MEMBER_SYNC_KEYS.dashboard, (nextBundle) => {
      if (!nextBundle) return;
      applyDashboardBundle_(nextBundle);
      STATE.loading = false;
      renderBody_(root);
    });
    STATE.rootAliveTimerId = window.setInterval(() => {
      if (root.isConnected) return;
      cleanupDashboard_();
    }, 1000);
  } catch (err) {
    showToast(err?.message || "โหลดหน้าหลักสมาชิกไม่สำเร็จ");
    STATE.profile = null;
    STATE.stats = { activeLoans: 0, overdueCount: 0, unpaidFineTotal: 0, nextDueDate: "" };
    STATE.announcements = [];
    STATE.upcoming = [];
  } finally {
    STATE.loading = false;
    renderBody_(root);
  }
}
