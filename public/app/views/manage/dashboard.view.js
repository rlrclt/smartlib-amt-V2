import { showToast } from "../../components/toast.js";
import { renderIconsSafe } from "../../icons.js";
import { escapeHtml } from "../../utils/html.js";
import { SyncEngine } from "../../data/sync_engine.js";
import { store } from "../../state/store.js";
import { apiManageDashboardStats } from "../../data/api.js";

const STATE = {
  loading: false,
  refreshing: false,
  data: null,
  lastLoadedAt: 0,
};

let ACTIVE_ROOT = null;
let ACTIVE_CLEANUP = null;

// --- Custom Styles for Native Look & Skeleton ---
const DASHBOARD_STYLES = `
<style>
  .pressable {
    transition: transform 0.15s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.15s ease, background-color 0.15s ease;
    cursor: pointer;
    user-select: none;
    will-change: transform;
  }
  
  .pressable:hover {
    transform: translateY(-4px);
    box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05) !important;
  }

  .pressable:active {
    transform: scale(0.95);
    opacity: 0.8;
  }

  .touch-target {
    min-height: 48px;
  }
  
  .hide-scrollbar::-webkit-scrollbar { display: none; }
  .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
  
  /* High-Fidelity Shimmer */
  @keyframes shimmer-move {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  
  .skeleton-box {
    background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
    background-size: 200% 100%;
    animation: shimmer-move 1.5s infinite linear;
    border-radius: 12px;
    display: inline-block;
  }

  /* State Switching Logic */
  .skeleton-data { display: none !important; opacity: 0; }
  .is-loading .skeleton-data { display: block !important; opacity: 1; }
  .is-loading .real-data { display: none !important; opacity: 0; }
  
  /* Reveal Animation with Native Curve */
  .real-data {
    animation: native-reveal 0.4s cubic-bezier(0.32, 0.72, 0, 1) forwards;
  }
  
  @keyframes native-reveal {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .spin-active {
    animation: native-spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  }
  @keyframes native-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
`;

function fmtDate(value, withTime = false) {
  const d = new Date(String(value || ""));
  if (!Number.isFinite(d.getTime())) return "-";
  return d.toLocaleString("th-TH", withTime
    ? { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
    : { year: "numeric", month: "short", day: "numeric" });
}

function fmtTimeOnly(value) {
  const d = new Date(String(value || ""));
  if (!Number.isFinite(d.getTime())) return "-";
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.";
}

function fmtMoney(value) {
  return Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

function trendChip(trend, tone = "slate") {
  const t = trend || {};
  const dir = String(t.direction || "flat").toLowerCase();
  const label = escapeHtml(t.label || "0%");

  if (dir === "up") {
    const bg = tone === "rose" ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600";
    return `<span class="px-2.5 py-1 ${bg} text-[10px] font-bold rounded-lg">${label}</span>`;
  }
  if (dir === "down") {
    const bg = tone === "rose" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600";
    return `<span class="px-2.5 py-1 ${bg} text-[10px] font-bold rounded-lg">${label}</span>`;
  }
  return `<span class="px-2.5 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-lg">${label}</span>`;
}

function statusTone(status) {
  const key = String(status || "").toLowerCase();
  if (key === "returned" || key === "success" || key === "สำเร็จ") return "bg-emerald-50 text-emerald-600";
  if (key === "overdue" || key === "pending" || key === "รอ") return "bg-amber-50 text-amber-600";
  if (key === "lost" || key === "damaged" || key === "ชำรุด") return "bg-rose-50 text-rose-600";
  return "bg-brand-50 text-brand-600";
}

function summaryCardsHtml(summary) {
  const cards = summary?.cards || {};
  return `
    <section class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <!-- 1. Overdue -->
      <article class="pressable group relative overflow-hidden rounded-3xl border-2 border-rose-100 bg-white p-6 shadow-sm">
        <div class="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-rose-50 blur-2xl"></div>
        <div class="relative z-10 flex items-start justify-between">
          <div class="rounded-2xl bg-rose-100 p-3 text-rose-600"><i data-lucide="alert-circle" class="h-6 w-6"></i></div>
          <div class="real-data">${trendChip(cards.overdueBooks?.trend, "rose")}</div>
          <div class="skeleton-data skeleton-box h-6 w-12"></div>
        </div>
        <div class="relative z-10 mt-4">
          <p class="text-sm font-medium text-slate-500">หนังสือเลยกำหนด</p>
          <div class="mt-1 flex items-baseline gap-2">
            <h3 class="real-data text-4xl font-black text-slate-900">${Number(cards.overdueBooks?.value || 0).toLocaleString("th-TH")}</h3>
            <div class="skeleton-data skeleton-box h-10 w-16"></div>
            <span class="real-data font-medium text-slate-500">เล่ม</span>
          </div>
        </div>
      </article>

      <!-- 2. Active Loans -->
      <article class="pressable relative rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div class="flex items-start justify-between">
          <div class="rounded-2xl bg-brand-50 p-3 text-brand-600"><i data-lucide="book-up-2" class="h-6 w-6"></i></div>
          <div class="real-data">${trendChip(cards.activeLoans?.trend, "sky")}</div>
          <div class="skeleton-data skeleton-box h-6 w-12"></div>
        </div>
        <div class="mt-4">
          <p class="text-sm font-medium text-slate-500">กำลังถูกยืม</p>
          <div class="mt-1 flex items-baseline gap-2">
            <h3 class="real-data text-4xl font-black text-slate-900">${Number(cards.activeLoans?.value || 0).toLocaleString("th-TH")}</h3>
            <div class="skeleton-data skeleton-box h-10 w-20"></div>
            <span class="real-data font-medium text-slate-500">เล่ม</span>
          </div>
        </div>
      </article>

      <!-- 3. Available -->
      <article class="pressable relative rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div class="flex items-start justify-between">
          <div class="rounded-2xl bg-emerald-50 p-3 text-emerald-600"><i data-lucide="check-circle-2" class="h-6 w-6"></i></div>
          <div class="real-data">${trendChip(cards.availableItems?.trend, "emerald")}</div>
          <div class="skeleton-data skeleton-box h-6 w-12"></div>
        </div>
        <div class="mt-4">
          <p class="text-sm font-medium text-slate-500">พร้อมให้บริการ</p>
          <div class="mt-1 flex items-baseline gap-2">
            <h3 class="real-data text-4xl font-black text-slate-900">${Number(cards.availableItems?.value || 0).toLocaleString("th-TH")}</h3>
            <div class="skeleton-data skeleton-box h-10 w-24"></div>
          </div>
        </div>
      </article>

      <!-- 4. Pending Fines -->
      <article class="pressable relative rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div class="flex items-start justify-between">
          <div class="rounded-2xl bg-amber-50 p-3 text-amber-600"><i data-lucide="coins" class="h-6 w-6"></i></div>
          <div class="real-data">${trendChip(cards.pendingFines?.trend, "amber")}</div>
          <div class="skeleton-data skeleton-box h-6 w-12"></div>
        </div>
        <div class="mt-4">
          <p class="text-sm font-medium text-slate-500">ค่าปรับรอดำเนินการ</p>
          <div class="mt-1 flex items-baseline gap-1">
            <span class="real-data text-xl font-medium text-slate-500">฿</span>
            <h3 class="real-data text-4xl font-black text-slate-900">${fmtMoney(cards.pendingFines?.value || 0)}</h3>
            <div class="skeleton-data skeleton-box h-10 w-20"></div>
          </div>
        </div>
      </article>

      <!-- 5. Active Visitors -->
      <article class="pressable relative rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
        <div class="flex items-start justify-between">
          <div class="rounded-2xl bg-cyan-50 p-3 text-cyan-600"><i data-lucide="users" class="h-6 w-6"></i></div>
          <div class="real-data">${trendChip(cards.activeVisitors?.trend, "sky")}</div>
          <div class="skeleton-data skeleton-box h-6 w-12"></div>
        </div>
        <div class="mt-4">
          <p class="text-sm font-medium text-slate-500">อยู่ในห้องสมุด (ตอนนี้)</p>
          <div class="mt-1 flex items-baseline gap-2">
            <h3 class="real-data text-4xl font-black text-slate-900">${Number(cards.activeVisitors?.value || 0).toLocaleString("th-TH")}</h3>
            <div class="skeleton-data skeleton-box h-10 w-16"></div>
            <span class="real-data font-medium text-slate-500">คน</span>
          </div>
        </div>
      </article>
    </section>
  `;
}

function snapshotStripHtml(summary) {
  const items = [
    { label: "ยืมวันนี้", value: (summary?.loans?.borrowedToday || 0) + " เล่ม", color: "bg-brand-500" },
    { label: "คืนวันนี้", value: (summary?.loans?.returnedToday || 0) + " เล่ม", color: "bg-emerald-500" },
    { label: "สมาชิกรอคิว", value: (summary?.reservations?.waitingQueue || 0) + " คิว", color: "bg-amber-500" },
    { label: "หนังสือซ่อม", value: (summary?.books?.damaged || 0) + " รายการ", color: "bg-rose-500" },
  ];

  return `
    <section class="hide-scrollbar flex gap-3 overflow-x-auto rounded-[2rem] border border-slate-100 bg-white p-2 shadow-sm md:grid md:grid-cols-4 md:p-3">
      ${items.map((it) => `
        <div class="flex shrink-0 items-center gap-3 border-r border-slate-100 px-4 py-2 last:border-0">
          <div class="h-2 w-2 rounded-full ${it.color}"></div>
          <div>
            <p class="text-xs font-medium text-slate-400">${it.label}</p>
            <p class="real-data text-sm font-bold text-slate-700">${it.value}</p>
            <div class="skeleton-data skeleton-box mt-0.5 h-4 w-12"></div>
          </div>
        </div>
      `).join("")}
    </section>
  `;
}

function pendingSectionHtml(data) {
  const pending = data?.pendingTasks || {};
  const reservationReady = Array.isArray(pending.reservationReady) ? pending.reservationReady : [];
  const memberVerification = Array.isArray(pending.newMemberVerification) ? pending.newMemberVerification : [];
  const damaged = Array.isArray(pending.damagedBooksAlert) ? pending.damagedBooksAlert : [];

  const sections = [
    { title: "เตรียมหนังสือจอง", icon: "inbox", color: "brand", count: reservationReady.length, data: reservationReady, empty: "ไม่มีรายการพร้อมรับ", link: "/manage/loans", render: (row) => `
        <div class="rounded-xl border border-brand-100 bg-brand-50/40 p-3">
          <p class="text-xs font-black text-slate-800">${escapeHtml(row.bookTitle || "-")}</p>
          <p class="mt-1 text-[11px] font-semibold text-slate-500">รับภายใน: ${escapeHtml(fmtDate(row.holdUntil, true))}</p>
        </div>` },
    { title: "ยืนยันสมาชิกใหม่", icon: "user-check", color: "amber", count: memberVerification.length, data: memberVerification, empty: "ไม่มีสมาชิกที่รอตรวจสอบ", link: "/manage/users", render: (row) => `
        <div class="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
          <p class="text-xs font-black text-slate-800">${escapeHtml(row.displayName || row.uid || "-")}</p>
          <p class="mt-1 text-[11px] font-semibold text-slate-500">สมัครเมื่อ: ${escapeHtml(fmtDate(row.createdAt, true))}</p>
        </div>` },
    { title: "หนังสือชำรุดรอซ่อม", icon: "book-x", color: "rose", count: damaged.length, data: damaged, empty: "ไม่มีหนังสือชำรุดค้างตรวจ", link: "/manage/books", render: (row) => `
        <div class="rounded-xl border border-rose-100 bg-rose-50/40 p-3">
          <p class="text-xs font-black text-slate-800">${escapeHtml(row.bookTitle || row.barcode || "-")}</p>
          <p class="mt-1 text-[11px] font-semibold text-rose-500/80">Barcode: ${escapeHtml(row.barcode || "-")}</p>
        </div>` }
  ];

  return `
    <section class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="flex items-center gap-2 text-lg font-bold text-slate-800">
          <i data-lucide="bell-ring" class="h-5 w-5 text-brand-500"></i>
          สิ่งที่ต้องจัดการ
        </h2>
      </div>
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        ${sections.map((s) => `
          <article class="pressable rounded-[1.5rem] border border-slate-100 bg-white p-5 shadow-sm overflow-hidden" onclick="app.router.navigate('${s.link}')">
            <div class="mb-4 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="rounded-2xl bg-${s.color}-50 p-2.5 text-${s.color}-600"><i data-lucide="${s.icon}" class="h-5 w-5"></i></div>
                <h3 class="text-sm font-black text-slate-800">${s.title}</h3>
              </div>
              <span class="real-data rounded-full bg-${s.color}-50 px-2 py-1 text-[10px] font-black text-${s.color}-700">${s.count}</span>
              <div class="skeleton-data skeleton-box h-5 w-8 rounded-full"></div>
            </div>
            <div class="space-y-2">
              <div class="skeleton-data space-y-2">
                <div class="skeleton-box h-16 w-full"></div>
                <div class="skeleton-box h-16 w-full"></div>
              </div>
              <div class="real-data space-y-2">
                ${s.data.length ? s.data.slice(0, 2).map(s.render).join("") : `<div class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs font-semibold text-slate-500">${s.empty}</div>`}
              </div>
            </div>
          </article>`).join("")}
      </div>
    </section>
  `;
}

function activitiesAndActionsHtml(data) {
  const rows = Array.isArray(data?.recentActivities) ? data.recentActivities : [];
  const visitors = Array.isArray(data?.activeVisitorsList) ? data.activeVisitorsList : [];
  
  return `
    <section class="grid grid-cols-1 gap-6 pb-6 xl:grid-cols-[1.6fr_1fr]">
      <!-- Recent Activities -->
      <article class="flex flex-col">
        <div class="mb-4 flex items-center justify-between px-1">
          <h2 class="text-lg font-bold text-slate-800">กิจกรรมล่าสุด</h2>
          <a data-link href="/manage/loans" class="pressable touch-target flex items-center px-2 text-sm font-bold text-brand-600 hover:text-brand-800">ดูทั้งหมด</a>
        </div>
        <!-- Desktop View -->
        <div class="hidden md:block overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-sm">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                <th class="px-6 py-4">รายการ</th>
                <th class="px-6 py-4">ผู้ใช้งาน</th>
                <th class="px-6 py-4 text-right">สถานะ</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-sm font-medium">
              ${rows.length ? rows.slice(0, 5).map(row => `
                <tr class="pressable hover:bg-slate-50 transition-colors">
                  <td class="px-6 py-4">
                    <p class="text-slate-800 font-bold">${escapeHtml(row.bookTitle || row.actionLabel || "-")}</p>
                    <p class="text-[11px] text-slate-400">${escapeHtml(fmtTimeOnly(row.updatedAt || row.returnDate))}</p>
                  </td>
                  <td class="px-6 py-4 text-slate-500">${escapeHtml(row.memberName || row.uid || "-")}</td>
                  <td class="px-6 py-4 text-right">
                    <span class="inline-flex px-3 py-1 ${statusTone(row.status)} text-[10px] font-bold rounded-lg">${escapeHtml(row.status || "สำเร็จ")}</span>
                  </td>
                </tr>`).join("") : '<tr><td colspan="3" class="px-6 py-10 text-center text-slate-400">ยังไม่มีกิจกรรม</td></tr>'}
            </tbody>
          </table>
        </div>
        <!-- Mobile View -->
        <div class="space-y-3 md:hidden">
          ${rows.slice(0, 3).map(row => `
            <div class="pressable flex items-center justify-between rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-500">${escapeHtml((row.memberName || "U")[0].toUpperCase())}</div>
                <div>
                  <p class="text-sm font-bold text-slate-800">${escapeHtml(row.bookTitle || row.actionLabel || "-")}</p>
                  <p class="text-xs text-slate-500">${escapeHtml(fmtTimeOnly(row.updatedAt || row.returnDate))}</p>
                </div>
              </div>
              <span class="shrink-0 rounded-lg px-2.5 py-1 ${statusTone(row.status)} text-[10px] font-bold">${escapeHtml(row.status || "สำเร็จ")}</span>
            </div>`).join("")}
        </div>
      </article>

      <!-- People in Library (Active Visitors) -->
      <article class="flex flex-col">
        <div class="mb-4 flex items-center justify-between px-1">
          <h2 class="text-lg font-bold text-slate-800">ผู้ใช้บริการในห้องสมุด</h2>
          <span class="real-data rounded-full bg-cyan-50 px-2.5 py-1 text-[10px] font-black text-cyan-700">${visitors.length} คน</span>
          <div class="skeleton-data skeleton-box h-5 w-12 rounded-full"></div>
        </div>
        
        <div class="rounded-[2rem] border border-slate-100 bg-white p-4 shadow-sm flex-1">
          <div class="space-y-3">
            <div class="skeleton-data space-y-3">
              <div class="flex items-center gap-3 p-2">
                <div class="skeleton-box h-10 w-10 rounded-full"></div>
                <div class="flex-1"><div class="skeleton-box h-4 w-3/4"></div><div class="skeleton-box h-3 w-1/2 mt-1"></div></div>
              </div>
              <div class="flex items-center gap-3 p-2">
                <div class="skeleton-box h-10 w-10 rounded-full"></div>
                <div class="flex-1"><div class="skeleton-box h-4 w-2/3"></div><div class="skeleton-box h-3 w-1/3 mt-1"></div></div>
              </div>
            </div>

            <div class="real-data space-y-2">
              ${visitors.length ? visitors.map(v => {
                const activityLabels = {
                  borrow: "ยืม-คืน",
                  study: "อ่านหนังสือ",
                  computer: "ใช้คอมฯ",
                  relax: "พักผ่อน",
                  other: "ทั่วไป"
                };
                const acts = Array.isArray(v.activities) ? v.activities : [];
                const actText = acts.map(a => activityLabels[a] || a).join(", ") || "ทั่วไป";
                return `
                  <div class="pressable flex items-center gap-3 p-2 rounded-2xl hover:bg-slate-50 transition-colors">
                    <div class="relative">
                      <img src="${escapeHtml(v.photoURL)}" class="h-10 w-10 rounded-full object-cover border border-slate-100" onerror="this.src='/assets/img/default-avatar.svg'">
                      <span class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-white"></span>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-bold text-slate-800 truncate">${escapeHtml(v.displayName || v.uid || "ไม่ทราบชื่อ")}</p>
                      <p class="text-[11px] text-slate-500 truncate">${escapeHtml(actText)} • ${escapeHtml(fmtTimeOnly(v.checkInAt))}</p>
                    </div>
                  </div>
                `;
              }).join("") : `
                <div class="flex flex-col items-center justify-center py-10 text-center">
                  <div class="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 mb-3">
                    <i data-lucide="users" class="h-6 w-6"></i>
                  </div>
                  <p class="text-xs font-semibold text-slate-400 text-balance">ขณะนี้ยังไม่มีผู้ใช้บริการเช็คอิน</p>
                </div>
              `}
            </div>
          </div>
        </div>

        <!-- Quick Links (Moved below for utility) -->
        <div class="mt-4 grid grid-cols-2 gap-2">
           <a data-link href="/manage/checkin-qr" class="pressable flex items-center justify-center gap-2 p-3 bg-slate-50 text-slate-600 rounded-2xl text-xs font-bold hover:bg-slate-100">
             <i data-lucide="qr-code" class="h-4 w-4"></i> พิมพ์ QR เช็คอิน
           </a>
           <a data-link href="/manage/settings/library" class="pressable flex items-center justify-center gap-2 p-3 bg-slate-50 text-slate-600 rounded-2xl text-xs font-bold hover:bg-slate-100">
             <i data-lucide="clock" class="h-4 w-4"></i> เวลาเปิด-ปิด
           </a>
        </div>
      </article>
    </section>
  `;
}

function renderBody(root) {
  if (!root) return;
  const containerClass = `space-y-6 md:space-y-8 mt-4 md:mt-6 ${STATE.loading ? "is-loading" : ""}`;
  
  const summary = STATE.data?.summary || {};
  const generatedAt = STATE.data?.generatedAt || new Date();

  root.innerHTML = `
    ${DASHBOARD_STYLES}
    <div class="${containerClass}">
      <!-- Header -->
      <header class="flex flex-row items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-black tracking-tight text-slate-900 md:text-3xl xl:text-4xl">Command Center</h1>
          <div class="mt-0.5 flex items-center gap-2 md:mt-1">
            <span class="relative flex h-2 w-2 md:h-2.5 md:w-2.5">
              <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span class="relative inline-flex h-full w-full rounded-full bg-emerald-500"></span>
            </span>
            <p class="text-xs font-medium text-slate-500 md:text-sm">
              เชื่อมต่อแล้ว • อัปเดต <span class="real-data">${fmtTimeOnly(generatedAt)}</span>
              <span class="skeleton-data skeleton-box h-3 w-12 align-middle"></span>
            </p>
          </div>
        </div>
        <button id="dashboardRefreshBtn" class="pressable touch-target flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white p-3 font-bold text-slate-700 shadow-sm transition-all hover:border-brand-300 hover:text-brand-600 md:px-5 md:py-2.5">
          <i data-lucide="refresh-cw" class="h-5 w-5 md:mr-2 md:h-4 md:w-4 ${STATE.refreshing ? "spin-active" : ""}"></i>
          <span class="hidden md:inline">${STATE.refreshing ? "กำลังรีเฟรช..." : "อัปเดตข้อมูล"}</span>
        </button>
      </header>

      ${summaryCardsHtml(summary)}
      ${snapshotStripHtml(summary)}
      ${pendingSectionHtml(STATE.data)}
      ${activitiesAndActionsHtml(STATE.data)}
    </div>
  `;

  root.querySelector("#dashboardRefreshBtn")?.addEventListener("click", () => {
    loadDashboard(root, { forceRefresh: true });
  });
  renderIconsSafe();
}

async function loadDashboard(root, opts = {}) {
  const forceRefresh = opts.forceRefresh === true;
  if (STATE.loading || STATE.refreshing) return;

  if (!forceRefresh && !STATE.data) STATE.loading = true;
  else if (forceRefresh) STATE.refreshing = true;

  renderBody(root);

  try {
    let res;
    if (forceRefresh) {
      res = await apiManageDashboardStats({ refreshAt: Date.now() });
      if (res?.ok) store.setWithTTL("manage_dashboard_stats", res.data, 5 * 60 * 1000);
    } else {
      res = await SyncEngine.getManageDashboardStats();
    }
    
    if (!res?.ok) throw new Error(res?.error || "โหลดแดชบอร์ดไม่สำเร็จ");
    STATE.data = res.data || null;
    STATE.lastLoadedAt = Date.now();
  } catch (err) {
    showToast(err?.message || "โหลดแดชบอร์ดไม่สำเร็จ");
    if (!STATE.data) STATE.data = null;
  } finally {
    STATE.loading = false;
    STATE.refreshing = false;
    renderBody(root);
  }
}

function bindAutoRefresh(root) {
  const unsubscribe = store.subscribe("manage_dashboard_stats", (newData) => {
    if (newData && ACTIVE_ROOT === root) {
      STATE.data = newData;
      STATE.lastLoadedAt = Date.now();
      STATE.loading = false;
      renderBody(root);
    }
  });

  const onFocus = () => {
    if (!ACTIVE_ROOT || ACTIVE_ROOT !== root) return;
    const idleMs = Date.now() - (STATE.lastLoadedAt || 0);
    if (idleMs < 15_000) return;
    loadDashboard(root, { forceRefresh: true });
  };

  const onVisibilityChange = () => {
    if (document.visibilityState !== "visible") return;
    onFocus();
  };

  window.addEventListener("focus", onFocus);
  document.addEventListener("visibilitychange", onVisibilityChange);

  return () => {
    unsubscribe();
    window.removeEventListener("focus", onFocus);
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}

export function renderDashboardView() {
  return '<section id="manageDashboardRoot" class="view"></section>';
}

export function mountDashboardView(container) {
  ACTIVE_CLEANUP?.();
  const root = container.querySelector("#manageDashboardRoot") || container.querySelector("#manage-content") || container;
  ACTIVE_ROOT = root;
  ACTIVE_CLEANUP = bindAutoRefresh(root);
  loadDashboard(root);
  renderIconsSafe();
}
