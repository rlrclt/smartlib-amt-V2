import {
  MEMBER_SYNC_KEYS,
  getMemberResource,
  revalidateMemberResource,
  subscribeMemberResource,
} from "../../data/member_sync.js";
import { apiSettingsLibraryHoursList, apiSettingsLibraryRuntimeGet } from "../../data/api.js";
import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";

const STATE = {
  loading: false,
  profile: null,
  stats: {
    activeLoans: 0,
    historyLoans: 0,
    overdueCount: 0,
    unpaidFineTotal: 0,
    nextDueDate: "",
    readyReservations: 0,
  },
  announcements: [],
  upcoming: [],
  businessHours: [],
  runtimeTimezone: "Asia/Bangkok",
  hoursPopupOpen: false,
  checkin: { isActive: false, elapsed: "00:00:00" },
  unsubscribers: [],
  rootAliveTimerId: 0,
};
const DAY_LABELS_TH = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสฯ", "ศุกร์", "เสาร์"];

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
      min-height: 100%;
      container-type: inline-size;
      padding-bottom: 0;
      overflow-x: hidden;
      max-width: 1320px;
      margin-inline: auto;
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
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .fade-in {
      animation: dashboardFadeIn 0.35s ease-out both;
    }
    @keyframes dashboardShimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
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

function toTimestamp_(value) {
  const ts = new Date(String(value || "")).getTime();
  return Number.isFinite(ts) ? ts : Number.POSITIVE_INFINITY;
}

function pickReservationEventDate_(item = {}) {
  const candidates = [
    item.holdUntil,
    item.pickupBy,
    item.pickupDeadline,
    item.expireAt,
    item.expiresAt,
    item.etaDate,
    item.plannedDate,
    item.createdAt,
  ];
  for (const dateValue of candidates) {
    const ts = toTimestamp_(dateValue);
    if (Number.isFinite(ts) && ts !== Number.POSITIVE_INFINITY) return { eventDate: String(dateValue || ""), eventTs: ts };
  }
  return { eventDate: "", eventTs: Number.POSITIVE_INFINITY };
}

function toCurrency(value) {
  return Number(value || 0).toLocaleString("th-TH");
}

function parseHm_(value) {
  const text = String(value || "").trim();
  const m = text.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function currentDayAndMinute_(timeZone) {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: String(timeZone || "Asia/Bangkok"),
      hour12: false,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(now);
    const weekday = String(parts.find((p) => p.type === "weekday")?.value || "");
    const hh = Number(parts.find((p) => p.type === "hour")?.value || 0);
    const mm = Number(parts.find((p) => p.type === "minute")?.value || 0);
    const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return { day: map[weekday] ?? now.getDay(), minuteOfDay: (hh * 60) + mm };
  } catch (_) {
    const now = new Date();
    return { day: now.getDay(), minuteOfDay: (now.getHours() * 60) + now.getMinutes() };
  }
}

function fmtNowTime_(timeZone) {
  try {
    return new Intl.DateTimeFormat("th-TH", {
      timeZone: String(timeZone || "Asia/Bangkok"),
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
  } catch (_) {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }
}

function normalizeHours_(items = []) {
  const toBool = (v, fallback = true) => {
    if (typeof v === "boolean") return v;
    const text = String(v || "").trim().toLowerCase();
    if (!text) return fallback;
    if (["true", "1", "yes", "y"].includes(text)) return true;
    if (["false", "0", "no", "n"].includes(text)) return false;
    return fallback;
  };
  return Array.from({ length: 7 }).map((_, day) => {
    const row = items.find((x) => Number(x?.dayOfWeek ?? x?.day_of_week) === day) || {};
    const isOpen = toBool(row.isOpen ?? row.is_open, true);
    return {
      dayOfWeek: day,
      label: DAY_LABELS_TH[day],
      isOpen,
      openTime: String(row.openTime ?? row.open_time ?? ""),
      closeTime: String(row.closeTime ?? row.close_time ?? ""),
    };
  });
}

function todayHoursInfo_() {
  const rows = normalizeHours_(STATE.businessHours || []);
  const { day, minuteOfDay } = currentDayAndMinute_(STATE.runtimeTimezone);
  const today = rows[day] || { isOpen: false, openTime: "", closeTime: "" };
  if (!today.isOpen) return { rows, day, line: "ปิดทำการ", openNow: false };
  const open = parseHm_(today.openTime);
  const close = parseHm_(today.closeTime);
  const hasWindow = Number.isFinite(open) && Number.isFinite(close);
  const openNow = Boolean(hasWindow && minuteOfDay >= open && minuteOfDay < close);
  if (!hasWindow) return { rows, day, line: "ไม่ระบุเวลา", openNow: false };
  return { rows, day, line: `${today.openTime} - ${today.closeTime}`, openNow };
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
  if (kind === "reservations") {
    return hasAlert
      ? { bg: "bg-gradient-to-br from-emerald-50 via-white to-green-50 border-emerald-100", label: "text-emerald-700", value: "text-emerald-800", icon: "calendar-check-2", badge: "bg-emerald-600 text-white" }
      : { bg: "bg-gradient-to-br from-white to-emerald-50 border-emerald-100", label: "text-slate-500", value: "text-slate-800", icon: "calendar-check-2", badge: "bg-emerald-100 text-emerald-700" };
  }
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

function renderStatCard_(title, value, subtext, kind, alertValue, href = "", elementId = "") {
  const tone = statTone_(kind, alertValue);
  const clickableCls = href ? " pressable" : "";
  const attrs = [
    elementId ? `id="${elementId}"` : "",
    href ? `data-link href="${escapeHtml(href)}"` : "",
    href ? `aria-label="${escapeHtml(title)}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `
    <article ${attrs} class="dashboard-accent-card fade-in min-h-[96px] rounded-2xl border ${tone.bg} p-3 sm:p-4 shadow-sm${clickableCls}">
      <div class="flex items-center justify-between gap-2">
        <div class="flex items-center gap-1.5 ${tone.label}">
          <span class="inline-flex h-7 w-7 items-center justify-center rounded-full ${tone.badge || "bg-white text-slate-600"} shadow-sm">
            <i data-lucide="${tone.icon}" class="h-4 w-4"></i>
          </span>
          <span class="max-w-[120px] truncate text-[10px] font-bold sm:max-w-none sm:text-xs">${escapeHtml(title)}</span>
        </div>
        <span class="rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.14em] ${tone.badge || "bg-white text-slate-500"}">${kind}</span>
      </div>
      <div class="mt-2 flex items-end justify-between gap-2">
        <div>
          <h3 class="text-lg font-black sm:text-xl ${tone.value}">${escapeHtml(value)}</h3>
          ${subtext ? `<p class="mt-0.5 line-clamp-2 text-[10px] font-semibold sm:text-[11px] ${tone.label}">${escapeHtml(subtext)}</p>` : ""}
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
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        ${renderStatCard_("กำลังยืม", String(STATE.stats.activeLoans), "เล่มทั้งหมด", "borrow", STATE.stats.activeLoans, "/app/loans")}
        ${renderStatCard_("ประวัติการยืม", String(STATE.stats.historyLoans), "รายการที่ผ่านมา", "due", STATE.stats.historyLoans, "/app/loans")}
        ${renderStatCard_("เกินกำหนด", String(STATE.stats.overdueCount), "รายการที่ต้องจัดการ", "overdue", STATE.stats.overdueCount)}
        ${renderStatCard_("รายการจอง", String(STATE.stats.readyReservations), "พร้อมรับ", "reservations", STATE.stats.readyReservations, "/app/reservations")}
        ${renderStatCard_("ค่าปรับค้าง", `฿${toCurrency(STATE.stats.unpaidFineTotal)}`, "ยอดรวมคงค้าง", "fines", STATE.stats.unpaidFineTotal, "/app/fines", "fineCard")}
        ${renderStatCard_("กำหนดคืนถัดไป", nextDueText, "เล่มใกล้ครบกำหนด", "due", STATE.stats.overdueCount)}
      </div>
    </section>
  `;
}

function renderBusinessHours_() {
  const isOpen = STATE.checkin.isActive;
  const info = todayHoursInfo_();
  const todayStatus = info.openNow ? "เปิดให้บริการ" : "นอกเวลาทำการ";
  return `
    <section>
      <article id="memberDashBusinessHoursCard" class="dashboard-accent-card pressable relative overflow-hidden rounded-[1.4rem] border border-sky-100 bg-gradient-to-r from-sky-500 via-cyan-500 to-blue-500 p-4 shadow-lg shadow-sky-100/70">
        <div class="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/20 blur-2xl"></div>
        <div class="absolute bottom-[-1.5rem] left-[-1rem] h-24 w-24 rounded-full bg-white/14 blur-2xl"></div>
        <div class="relative z-10 flex items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <span class="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/18 text-2xl shadow-inner backdrop-blur-sm">🏛️</span>
            <div class="min-w-0">
              <p class="text-xs font-black uppercase tracking-[0.18em] text-white/90">เวลาทำการวันนี้</p>
              <p class="mt-0.5 text-sm font-bold text-white">${escapeHtml(info.line)} <span class="hidden text-white/80 sm:inline">(${escapeHtml(todayStatus)})</span></p>
              <p class="mt-1 text-[11px] font-black ${isOpen ? "text-emerald-100" : "text-white/85"}">${isOpen ? `เช็คอินแล้ว • ${escapeHtml(STATE.checkin.elapsed)}` : "ยังไม่ได้เช็คอิน"}</p>
            </div>
          </div>
          <a id="memberDashCheckinBtn" data-link href="/app/checkin" aria-label="ไปหน้าเช็คอิน" class="pressable shrink-0 rounded-[0.95rem] border border-white/20 bg-white/18 px-3.5 py-2 text-[11px] font-black text-white shadow-md shadow-sky-900/10 backdrop-blur-sm">${isOpen ? "ดูสถานะ" : "เช็คอินเลย"}</a>
        </div>
      </article>
    </section>
  `;
}

function renderHoursPopup_() {
  if (!STATE.hoursPopupOpen) return "";
  const info = todayHoursInfo_();
  const rows = info.rows || [];
  const updatedAtTime = fmtNowTime_(STATE.runtimeTimezone);
  return `
    <div id="memberDashHoursPopupBackdrop" class="fixed inset-0 z-[120] bg-slate-900/45 p-4 backdrop-blur-[1px]">
      <div class="mx-auto mt-[9vh] w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div class="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 class="text-sm font-black text-slate-800">เวลาทำการห้องสมุด</h3>
          <button id="memberDashHoursPopupClose" type="button" class="pressable rounded-lg border border-slate-200 px-2 py-1 text-xs font-bold text-slate-700">ปิด</button>
        </div>
        <div class="max-h-[65vh] overflow-y-auto p-3">
          <p class="mb-2 px-1 text-[11px] font-semibold text-slate-500">อัปเดตล่าสุด ${escapeHtml(updatedAtTime)} น.</p>
          ${rows.map((row) => `
            <div class="mb-2 flex items-center justify-between rounded-xl border px-3 py-2 ${row.dayOfWeek === info.day ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-white"}">
              <p class="text-sm font-bold text-slate-700">${escapeHtml(row.label)}</p>
              <p class="text-sm font-black ${row.isOpen ? "text-slate-900" : "text-rose-700"}">${row.isOpen ? escapeHtml(`${row.openTime || "--:--"} - ${row.closeTime || "--:--"}`) : "ปิดทำการ"}</p>
            </div>
          `).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderShortcuts_() {
  const items = [
    { href: "/app/books", icon: "search", label: "ค้นหา\nหนังสือ", active: false },
    { href: "/app/checkin", icon: "scan-line", label: "เช็คอิน\nห้องสมุด", active: false },
    { href: "/app/loan-self", icon: "scan-line", label: "ยืมด้วย\nตนเอง", active: true },
    { href: "/app/fines", icon: "wallet", label: "ชำระ\nค่าปรับ", active: false },
    { href: "/app/member-card", icon: "badge", label: "บัตร\nสมาชิก", active: false, badge: true },
  ];
  return `
    <section class="hidden">
      <div class="rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-sm">
        <div class="mb-3 flex items-center justify-between">
          <p class="text-sm font-black text-slate-800">ทางลัด</p>
          <span class="rounded-full bg-sky-50 px-2 py-1 text-[11px] font-bold text-sky-700">เข้าถึงเร็ว</span>
        </div>
        <div class="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
          ${items
            .map(
              (item) => `
                <a data-link href="${escapeHtml(item.href)}" aria-label="${escapeHtml(item.label.replace("\n", " "))}" class="pressable group flex flex-col items-center gap-2 text-center">
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
              <a data-link href="${escapeHtml(item.href || "/app/loans")}" aria-label="${escapeHtml(item.title || item.barcode || "รายการ")}" class="dashboard-accent-card pressable fade-in flex gap-3 rounded-2xl border border-slate-100 bg-gradient-to-br from-white via-white to-sky-50 p-3 shadow-sm">
                <div class="relative h-16 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                  ${item.coverUrl
      ? `<img loading="lazy" src="${escapeHtml(item.coverUrl)}" alt="cover" class="h-full w-full object-cover" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=&quot;flex h-full w-full items-center justify-center text-[8px] font-bold text-slate-400&quot;>?</div>'">`
      : '<div class="flex h-full w-full items-center justify-center text-[8px] font-bold text-slate-400">?</div>'}
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-start justify-between gap-2">
                    <p class="truncate text-sm font-black text-slate-800">${escapeHtml(item.title || item.barcode || "-")}</p>
                    <span class="inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black ${escapeHtml(item.badgeClass || "bg-sky-100 text-sky-700")}">${escapeHtml(item.typeLabel || "รายการ")}</span>
                  </div>
                  <p class="mt-1 text-xs font-semibold text-slate-500">${escapeHtml(item.metaLine || `Barcode: ${item.barcode || "-"}`)}</p>
                  <div class="mt-2 inline-flex rounded-full bg-sky-100 px-2 py-1 text-[11px] font-black text-sky-700">${escapeHtml(item.eventLabel || "กำหนดการ")}: ${escapeHtml(fmtDate(item.eventDate || item.dueDate))}</div>
                </div>
              </a>
            `).join("")}</div>`
          : '<div class="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">ยังไม่มีรายการจองหรือยืมที่ต้องติดตาม</div>'
      }
    </section>
  `;
}

function renderAnnouncementAlerts_() {
  const alerts = (STATE.announcements || []).filter((item) => {
    const type = String(item?.type || item?.category || "").toLowerCase();
    return type.includes("alert") || type.includes("important") || type.includes("urgent");
  });
  if (!alerts.length) return "";
  return `
    <section class="mb-4">
      <div class="max-h-[20vh] overflow-y-auto rounded-2xl border border-rose-200 border-l-[5px] border-l-rose-500 bg-rose-50 p-4">
        ${alerts
    .slice(0, 2)
    .map(
      (item) => `
              <a data-link href="/announcements" aria-label="ประกาศด่วน ${escapeHtml(item.title || "")}" class="block ${item === alerts[0] ? "" : "mt-3 pt-3 border-t border-rose-100"}">
                <p class="text-xs font-black uppercase tracking-wide text-rose-700">ประกาศด่วน</p>
                <p class="mt-1 text-sm font-black text-rose-900 line-clamp-2">${escapeHtml(item.title || "-")}</p>
              </a>
            `,
    )
    .join("")}
      </div>
    </section>
  `;
}

function renderAnnouncements_() {
  const items = STATE.announcements || [];
  return `
    <section class="pb-4 min-w-0">
      <div class="mb-3 flex items-center justify-between px-1">
        <h2 class="text-sm font-black text-slate-800">ประกาศล่าสุด</h2>
        <a data-link href="/announcements" class="rounded-full bg-violet-50 px-2 py-1 text-[11px] font-bold text-violet-700">ดูทั้งหมด</a>
      </div>
      ${
        items.length
          ? `<div class="hide-scrollbar flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 xl:grid xl:snap-none xl:grid-cols-2 xl:overflow-visible xl:px-0">
              ${items.map((item) => `
                <a data-link href="/announcements" aria-label="ประกาศ ${escapeHtml(item.title || "")}" class="dashboard-accent-card pressable snap-center shrink-0 w-[min(84vw,320px)] rounded-2xl border border-slate-100 bg-gradient-to-br from-white via-violet-50/40 to-sky-50 p-4 shadow-sm xl:w-auto xl:min-w-0">
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
    <div class="member-dashboard-shell px-3 sm:px-4 lg:px-6 xl:px-8 2xl:px-10">
      ${renderAnnouncementAlerts_()}
      ${renderBusinessHours_()}
      <div class="mt-5 space-y-5">
        ${renderStats_()}
        ${renderShortcuts_()}
        ${renderUpcoming_()}
        ${renderAnnouncements_()}
      </div>
      ${renderHoursPopup_()}
    </div>
  `;

  root.querySelector("#memberDashBusinessHoursCard")?.addEventListener("click", () => {
    STATE.hoursPopupOpen = true;
    renderBody_(root);
  });
  root.querySelector("#memberDashCheckinBtn")?.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  root.querySelector("#memberDashHoursPopupBackdrop")?.addEventListener("click", (event) => {
    if (event.target?.id !== "memberDashHoursPopupBackdrop") return;
    STATE.hoursPopupOpen = false;
    renderBody_(root);
  });
  root.querySelector("#memberDashHoursPopupClose")?.addEventListener("click", () => {
    STATE.hoursPopupOpen = false;
    renderBody_(root);
  });

  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

export function renderMemberDashboardView() {
  ensureNativeStyles_();
  return '<section id="memberDashboardRoot" class="member-page-container view"></section>';
}

function applyDashboardBundle_(bundle) {
  const profileRes = bundle?.profileRes || {};
  const annRes = bundle?.annRes || {};
  const loansRes = bundle?.loansRes || {};
  const finesRes = bundle?.finesRes || {};
  const reservationsBundle = getMemberResource(MEMBER_SYNC_KEYS.reservations) || {};
  const loanSelfBundle = getMemberResource(MEMBER_SYNC_KEYS.loanSelf) || {};
  const announcementItems = annRes?.ok
    ? (Array.isArray(annRes.data)
      ? annRes.data
      : (Array.isArray(annRes.data?.items) ? annRes.data.items : []))
    : [];

  STATE.profile = normalizeProfile_(profileRes);
  const loans = loansRes?.ok && Array.isArray(loansRes.data?.items) ? loansRes.data.items : [];
  const unpaid = finesRes?.ok && Array.isArray(finesRes.data?.items) ? finesRes.data.items : [];
  const activeLoans = loans.filter((item) => ["borrowing", "overdue"].includes(String(item.status || "")));
  const historyLoans = loans.filter((item) => ["returned", "returned_late", "lost", "completed", "cancelled"].includes(String(item.status || "")));
  const overdueCount = loans.filter((item) => String(item.status || "") === "overdue").length;
  const nextDue = activeLoans
    .map((item) => ({ ...item, dueTs: new Date(String(item.dueDate || "")).getTime() }))
    .filter((item) => Number.isFinite(item.dueTs))
    .sort((a, b) => a.dueTs - b.dueTs);

  const readyReservations = Array.isArray(reservationsBundle.reservations)
    ? reservationsBundle.reservations.filter((item) => String(item?.status || "").toLowerCase() === "ready").length
    : 0;
  const visit = loanSelfBundle?.visit || {};
  const session = visit?.session || null;
  const isActive = Boolean(visit?.active) || String(session?.status || "").toLowerCase() === "active";
  const checkInAt = session?.checkInAt || "";
  const elapsedMs = Date.now() - new Date(String(checkInAt)).getTime();
  const elapsed = Number.isFinite(elapsedMs) && elapsedMs >= 0
    ? [Math.floor(elapsedMs / 3600000), Math.floor((elapsedMs % 3600000) / 60000), Math.floor((elapsedMs % 60000) / 1000)]
      .map((x) => String(x).padStart(2, "0"))
      .join(":")
    : "00:00:00";

  STATE.stats = {
    activeLoans: activeLoans.length,
    historyLoans: historyLoans.length,
    overdueCount,
    unpaidFineTotal: unpaid.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    nextDueDate: nextDue[0]?.dueDate || "",
    readyReservations,
  };
  STATE.announcements = announcementItems.slice(0, 3);
  const overdueLoansFeed = loans
    .filter((item) => String(item?.status || "").toLowerCase() === "overdue")
    .map((item) => ({
      type: "loan_overdue",
      typeLabel: "เกินกำหนด",
      badgeClass: "bg-rose-100 text-rose-700",
      title: item.title || item.bookTitle || item.book_name || item.barcode || "",
      barcode: item.barcode || "",
      coverUrl: item.coverUrl || item.cover || item.coverImage || "",
      eventDate: item.dueDate || "",
      eventTs: toTimestamp_(item.dueDate),
      eventLabel: "ครบกำหนด",
      metaLine: `Barcode: ${item.barcode || "-"}`,
      href: "/app/loans",
    }));
  const nextDueFeed = nextDue.map((item) => ({
    type: "loan_due",
    typeLabel: "คืนถัดไป",
    badgeClass: "bg-sky-100 text-sky-700",
    title: item.title || item.bookTitle || item.book_name || item.barcode || "",
    barcode: item.barcode || "",
    coverUrl: item.coverUrl || item.cover || item.coverImage || "",
    eventDate: item.dueDate || "",
    eventTs: toTimestamp_(item.dueDate),
    eventLabel: "กำหนดคืน",
    metaLine: `Barcode: ${item.barcode || "-"}`,
    href: "/app/loans",
  }));
  const reservations = Array.isArray(reservationsBundle.reservations) ? reservationsBundle.reservations : [];
  const reservationFeed = reservations
    .filter((item) => {
      const status = String(item?.status || "").toLowerCase();
      return status === "ready" || status === "waiting";
    })
    .map((item) => {
      const status = String(item?.status || "").toLowerCase();
      const picked = pickReservationEventDate_(item);
      return {
        type: status === "ready" ? "reservation_ready" : "reservation_waiting",
        typeLabel: status === "ready" ? "จองพร้อมรับ" : "รอคิว",
        badgeClass: status === "ready" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700",
        title: item.title || item.bookTitle || item.book_name || item.bookId || "",
        barcode: item.barcode || item.selectedBarcode || "",
        coverUrl: item.coverUrl || item.cover || item.coverImage || "",
        eventDate: picked.eventDate,
        eventTs: picked.eventTs,
        eventLabel: status === "ready" ? "รับภายใน" : "คาดว่าจะพร้อม",
        metaLine: `รหัสจอง: ${item.resId || "-"}`,
        href: "/app/reservations",
      };
    });
  STATE.upcoming = [...overdueLoansFeed, ...nextDueFeed, ...reservationFeed]
    .sort((a, b) => a.eventTs - b.eventTs)
    .slice(0, 6);
  STATE.checkin = { isActive, elapsed };
}

function cleanupDashboard_() {
  STATE.unsubscribers.forEach((off) => {
    try {
      off?.();
    } catch (_) {}
  });
  STATE.unsubscribers = [];
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
    const [hoursRes, runtimeRes] = await Promise.all([
      apiSettingsLibraryHoursList({}, { bypassCache: true }).catch(() => null),
      apiSettingsLibraryRuntimeGet({}, { bypassCache: true }).catch(() => null),
    ]);
    STATE.businessHours = hoursRes?.ok && Array.isArray(hoursRes.data?.items) ? hoursRes.data.items : [];
    STATE.runtimeTimezone = String(runtimeRes?.ok ? (runtimeRes.data?.timezone || "Asia/Bangkok") : "Asia/Bangkok");

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

    STATE.unsubscribers = [
      subscribeMemberResource(MEMBER_SYNC_KEYS.dashboard, (nextBundle) => {
        if (!nextBundle) return;
        applyDashboardBundle_(nextBundle);
        STATE.loading = false;
        renderBody_(root);
      }),
      subscribeMemberResource(MEMBER_SYNC_KEYS.reservations, () => {
        const nextBundle = getMemberResource(MEMBER_SYNC_KEYS.dashboard);
        if (!nextBundle) return;
        applyDashboardBundle_(nextBundle);
        renderBody_(root);
      }),
      subscribeMemberResource(MEMBER_SYNC_KEYS.loanSelf, () => {
        const nextBundle = getMemberResource(MEMBER_SYNC_KEYS.dashboard);
        if (!nextBundle) return;
        applyDashboardBundle_(nextBundle);
        renderBody_(root);
      }),
    ];
    void revalidateMemberResource(MEMBER_SYNC_KEYS.reservations, { force: true, reason: "hydrate" });
    void revalidateMemberResource(MEMBER_SYNC_KEYS.loanSelf, { force: true, reason: "hydrate" });
    STATE.rootAliveTimerId = window.setInterval(() => {
      if (root.isConnected) return;
      cleanupDashboard_();
    }, 1000);
  } catch (err) {
    showToast(err?.message || "โหลดหน้าหลักสมาชิกไม่สำเร็จ");
    STATE.profile = null;
    STATE.stats = { activeLoans: 0, historyLoans: 0, overdueCount: 0, unpaidFineTotal: 0, nextDueDate: "", readyReservations: 0 };
    STATE.announcements = [];
    STATE.upcoming = [];
    STATE.checkin = { isActive: false, elapsed: "00:00:00" };
  } finally {
    STATE.loading = false;
    renderBody_(root);
  }
}
