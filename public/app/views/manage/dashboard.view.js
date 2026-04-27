import { showToast } from "../../components/toast.js";
import { renderIconsSafe } from "../../icons.js";
import { escapeHtml } from "../../utils/html.js";
import { apiManageDashboardStats } from "../../data/api.js";

const STATE = {
  loading: false,
  refreshing: false,
  data: null,
  lastLoadedAt: 0,
};

let ACTIVE_ROOT = null;
let ACTIVE_CLEANUP = null;

function fmtDate(value, withTime = false) {
  const d = new Date(String(value || ""));
  if (!Number.isFinite(d.getTime())) return "-";
  return d.toLocaleString("th-TH", withTime
    ? { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
    : { year: "numeric", month: "short", day: "numeric" });
}

function fmtMoney(value) {
  return Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 });
}

function trendChip(trend, tone = "slate") {
  const t = trend || {};
  const dir = String(t.direction || "flat").toLowerCase();

  if (dir === "up") {
    if (tone === "rose") return `<span class="inline-flex rounded-full bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-700">${escapeHtml(t.label || "+0%")}</span>`;
    return `<span class="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">${escapeHtml(t.label || "+0%")}</span>`;
  }

  if (dir === "down") {
    if (tone === "rose") return `<span class="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-black text-emerald-700">${escapeHtml(t.label || "-0%")}</span>`;
    return `<span class="inline-flex rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">${escapeHtml(t.label || "-0%")}</span>`;
  }

  return `<span class="inline-flex rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">${escapeHtml(t.label || "0%")}</span>`;
}

function statusTone(status) {
  const key = String(status || "").toLowerCase();
  if (key === "returned") return "bg-emerald-50 text-emerald-700";
  if (key === "overdue") return "bg-amber-50 text-amber-700";
  if (key === "lost") return "bg-rose-50 text-rose-700";
  return "bg-sky-50 text-sky-700";
}

function summaryCardsHtml(summary) {
  const cards = summary?.cards || {};
  return `
    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <article class="rounded-3xl border border-sky-100 bg-gradient-to-b from-sky-50 to-white p-5 shadow-sm">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-[11px] font-black uppercase tracking-widest text-sky-700">Active Loans</p>
            <p class="mt-2 text-3xl font-black text-slate-900">${Number(cards.activeLoans?.value || 0).toLocaleString("th-TH")}</p>
          </div>
          <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><i data-lucide="book-marked" class="h-5 w-5"></i></span>
        </div>
        <div class="mt-3">${trendChip(cards.activeLoans?.trend, "sky")}</div>
      </article>

      <article class="rounded-3xl border border-rose-100 bg-gradient-to-b from-rose-50 to-white p-5 shadow-sm">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-[11px] font-black uppercase tracking-widest text-rose-700">Overdue Books</p>
            <p class="mt-2 text-3xl font-black text-slate-900">${Number(cards.overdueBooks?.value || 0).toLocaleString("th-TH")}</p>
          </div>
          <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700"><i data-lucide="alert-triangle" class="h-5 w-5"></i></span>
        </div>
        <div class="mt-3">${trendChip(cards.overdueBooks?.trend, "rose")}</div>
      </article>

      <article class="rounded-3xl border border-emerald-100 bg-gradient-to-b from-emerald-50 to-white p-5 shadow-sm">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-[11px] font-black uppercase tracking-widest text-emerald-700">Available Items</p>
            <p class="mt-2 text-3xl font-black text-slate-900">${Number(cards.availableItems?.value || 0).toLocaleString("th-TH")}</p>
          </div>
          <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><i data-lucide="package-check" class="h-5 w-5"></i></span>
        </div>
        <div class="mt-3">${trendChip(cards.availableItems?.trend, "emerald")}</div>
      </article>

      <article class="rounded-3xl border border-amber-100 bg-gradient-to-b from-amber-50 to-white p-5 shadow-sm">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-[11px] font-black uppercase tracking-widest text-amber-700">Pending Fines</p>
            <p class="mt-2 text-3xl font-black text-slate-900">${fmtMoney(cards.pendingFines?.value || 0)}</p>
            <p class="mt-1 text-[11px] font-bold text-slate-500">บาท</p>
          </div>
          <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><i data-lucide="wallet" class="h-5 w-5"></i></span>
        </div>
        <div class="mt-3">${trendChip(cards.pendingFines?.trend, "amber")}</div>
      </article>

      <article class="rounded-3xl border border-cyan-100 bg-gradient-to-b from-cyan-50 to-white p-5 shadow-sm">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-[11px] font-black uppercase tracking-widest text-cyan-700">Active Visitors</p>
            <p class="mt-2 text-3xl font-black text-slate-900">${Number(cards.activeVisitors?.value || 0).toLocaleString("th-TH")}</p>
          </div>
          <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-100 text-cyan-700"><i data-lucide="users-round" class="h-5 w-5"></i></span>
        </div>
        <div class="mt-3">${trendChip(cards.activeVisitors?.trend, "sky")}</div>
      </article>
    </section>
  `;
}

function pendingSectionHtml(data) {
  const pending = data?.pendingTasks || {};
  const reservationReady = Array.isArray(pending.reservationReady) ? pending.reservationReady : [];
  const memberVerification = Array.isArray(pending.newMemberVerification) ? pending.newMemberVerification : [];
  const damaged = Array.isArray(pending.damagedBooksAlert) ? pending.damagedBooksAlert : [];

  return `
    <section class="grid gap-4 xl:grid-cols-3">
      <article class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-black text-slate-800">Reservation Ready</h3>
          <span class="rounded-full bg-sky-50 px-2 py-1 text-[10px] font-black text-sky-700">${reservationReady.length}</span>
        </div>
        <div class="space-y-2">
          ${reservationReady.length
            ? reservationReady.map((row) => `
              <div class="rounded-xl border border-sky-100 bg-sky-50/40 p-3">
                <p class="text-xs font-black text-slate-800">${escapeHtml(row.bookTitle || "-")}</p>
                <p class="mt-1 text-[11px] font-semibold text-slate-600">ผู้จอง: ${escapeHtml(row.memberName || "-")}</p>
                <p class="mt-1 text-[11px] font-semibold text-slate-500">รับภายใน: ${escapeHtml(fmtDate(row.holdUntil, true))}</p>
              </div>
            `).join("")
            : '<div class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs font-semibold text-slate-500">ไม่มีรายการพร้อมรับ</div>'}
        </div>
      </article>

      <article class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-black text-slate-800">New Member Verification</h3>
          <span class="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-black text-amber-700">${memberVerification.length}</span>
        </div>
        <div class="space-y-2">
          ${memberVerification.length
            ? memberVerification.map((row) => `
              <div class="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
                <p class="text-xs font-black text-slate-800">${escapeHtml(row.displayName || row.uid || "-")}</p>
                <p class="mt-1 text-[11px] font-semibold text-slate-600">${escapeHtml(row.email || "-")}</p>
                <p class="mt-1 text-[11px] font-semibold text-slate-500">สมัครเมื่อ: ${escapeHtml(fmtDate(row.createdAt, true))}</p>
              </div>
            `).join("")
            : '<div class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs font-semibold text-slate-500">ไม่มีสมาชิกที่รอตรวจสอบ</div>'}
        </div>
      </article>

      <article class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-black text-slate-800">Damaged Books Alert</h3>
          <span class="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-700">${damaged.length}</span>
        </div>
        <div class="space-y-2">
          ${damaged.length
            ? damaged.map((row) => `
              <div class="rounded-xl border border-rose-100 bg-rose-50/40 p-3">
                <p class="text-xs font-black text-slate-800">${escapeHtml(row.bookTitle || row.barcode || "-")}</p>
                <p class="mt-1 text-[11px] font-semibold text-slate-600">Barcode: ${escapeHtml(row.barcode || "-")}</p>
                <p class="mt-1 text-[11px] font-semibold text-slate-500">อัปเดต: ${escapeHtml(fmtDate(row.updatedAt, true))}</p>
              </div>
            `).join("")
            : '<div class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-xs font-semibold text-slate-500">ไม่มีหนังสือชำรุดค้างตรวจ</div>'}
        </div>
      </article>
    </section>
  `;
}

function activitiesAndActionsHtml(data) {
  const rows = Array.isArray(data?.recentActivities) ? data.recentActivities : [];
  return `
    <section class="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
      <article class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="mb-3 flex items-center justify-between">
          <h3 class="text-sm font-black text-slate-800">Recent Activities</h3>
          <span class="text-xs font-bold text-slate-400">ล่าสุด 10 รายการ</span>
        </div>

        ${rows.length
          ? `<div class="overflow-x-auto">
              <table class="min-w-full text-left text-xs">
                <thead>
                  <tr class="border-b border-slate-200 text-slate-500">
                    <th class="px-2 py-2 font-black">เวลา</th>
                    <th class="px-2 py-2 font-black">ผู้ใช้</th>
                    <th class="px-2 py-2 font-black">หนังสือ</th>
                    <th class="px-2 py-2 font-black">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows.map((row) => `
                    <tr class="border-b border-slate-100 last:border-0">
                      <td class="px-2 py-2 font-semibold text-slate-600">${escapeHtml(fmtDate(row.updatedAt || row.returnDate || row.loanDate, true))}</td>
                      <td class="px-2 py-2 font-semibold text-slate-700">${escapeHtml(row.memberName || row.uid || "-")}</td>
                      <td class="px-2 py-2 font-semibold text-slate-700">
                        <p class="font-black text-slate-800">${escapeHtml(row.bookTitle || row.bookId || "-")}</p>
                        <p class="text-[11px] text-slate-500">${escapeHtml(row.barcode || "-")}</p>
                      </td>
                      <td class="px-2 py-2">
                        <span class="rounded-full px-2 py-1 text-[11px] font-black ${statusTone(row.status)}">${escapeHtml(row.actionLabel || row.status || "-")}</span>
                      </td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            </div>`
          : '<div class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-xs font-semibold text-slate-500">ยังไม่มีกิจกรรมล่าสุด</div>'}
      </article>

      <article class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 class="text-sm font-black text-slate-800">Quick Actions</h3>
        <div class="mt-3 grid gap-2">
          <a data-link href="/manage/register_books" class="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm font-black text-sky-700 hover:bg-sky-100">ลงทะเบียนหนังสือใหม่</a>
          <a data-link href="/manage/add_book_items" class="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700 hover:bg-emerald-100">เพิ่มรหัสเล่มลูก</a>
          <a data-link href="/manage/users/import" class="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-black text-amber-700 hover:bg-amber-100">นำเข้าสมาชิกแบบกลุ่ม</a>
          <a data-link href="/manage/settings" class="rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-sm font-black text-violet-700 hover:bg-violet-100">จัดการพิกัด/นโยบาย</a>
          <a data-link href="/manage/settings/library" class="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-sm font-black text-cyan-700 hover:bg-cyan-100">ตั้งค่าเวลาเปิด-ปิด</a>
          <a data-link href="/manage/checkin-qr" class="rounded-xl border border-fuchsia-100 bg-fuchsia-50 px-3 py-2 text-sm font-black text-fuchsia-700 hover:bg-fuchsia-100">พิมพ์ QR เช็คอิน</a>
        </div>
      </article>
    </section>
  `;
}

function snapshotPanelHtml(summary) {
  return `
    <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <article class="rounded-2xl border border-slate-200 bg-white p-3">
        <p class="text-[11px] font-black uppercase tracking-widest text-slate-400">Books</p>
        <p class="mt-1 text-xs font-bold text-slate-700">ทั้งหมด ${Number(summary?.books?.total || 0).toLocaleString("th-TH")} · พร้อมใช้ ${Number(summary?.books?.available || 0).toLocaleString("th-TH")}</p>
      </article>
      <article class="rounded-2xl border border-slate-200 bg-white p-3">
        <p class="text-[11px] font-black uppercase tracking-widest text-slate-400">Loans Today</p>
        <p class="mt-1 text-xs font-bold text-slate-700">ยืม ${Number(summary?.loans?.borrowedToday || 0).toLocaleString("th-TH")} · คืน ${Number(summary?.loans?.returnedToday || 0).toLocaleString("th-TH")}</p>
      </article>
      <article class="rounded-2xl border border-slate-200 bg-white p-3">
        <p class="text-[11px] font-black uppercase tracking-widest text-slate-400">Members</p>
        <p class="mt-1 text-xs font-bold text-slate-700">ทั้งหมด ${Number(summary?.members?.total || 0).toLocaleString("th-TH")} · ใหม่สัปดาห์นี้ ${Number(summary?.members?.newThisWeek || 0).toLocaleString("th-TH")}</p>
      </article>
      <article class="rounded-2xl border border-slate-200 bg-white p-3">
        <p class="text-[11px] font-black uppercase tracking-widest text-slate-400">Reservations</p>
        <p class="mt-1 text-xs font-bold text-slate-700">รอคิว ${Number(summary?.reservations?.waitingQueue || 0).toLocaleString("th-TH")} · พร้อมรับ ${Number(summary?.reservations?.readyToPickUp || 0).toLocaleString("th-TH")}</p>
      </article>
      <article class="rounded-2xl border border-slate-200 bg-white p-3">
        <p class="text-[11px] font-black uppercase tracking-widest text-slate-400">Library Visits</p>
        <p class="mt-1 text-xs font-bold text-slate-700">อยู่ในห้องสมุด ${Number(summary?.visits?.activeVisitors || 0).toLocaleString("th-TH")} · เช็คอินวันนี้ ${Number(summary?.visits?.checkedInToday || 0).toLocaleString("th-TH")}</p>
      </article>
    </section>
  `;
}

function renderBody(root) {
  if (!root) return;

  if (STATE.loading) {
    root.innerHTML = `
      <section class="rounded-3xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500">กำลังโหลดข้อมูลแดชบอร์ด...</section>
    `;
    return;
  }

  if (!STATE.data) {
    root.innerHTML = `
      <section class="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-semibold text-rose-700">
        โหลดข้อมูลไม่สำเร็จ กรุณากดรีเฟรชอีกครั้ง
      </section>
    `;
    return;
  }

  const summary = STATE.data.summary || {};
  root.innerHTML = `
    <div class="space-y-4">
      <section class="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <h2 class="text-lg font-black text-slate-800">Command Center</h2>
          <p class="text-xs font-semibold text-slate-500">อัปเดตล่าสุด ${escapeHtml(fmtDate(STATE.data.generatedAt || "", true))}</p>
        </div>
        <button id="dashboardRefreshBtn" type="button" class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100 ${STATE.refreshing ? "opacity-70" : ""}" ${STATE.refreshing ? "disabled" : ""}>
          ${STATE.refreshing ? "กำลังรีเฟรช..." : "รีเฟรชข้อมูล"}
        </button>
      </section>

      ${summaryCardsHtml(summary)}
      ${snapshotPanelHtml(summary)}
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

  if (!forceRefresh) STATE.loading = true;
  else STATE.refreshing = true;

  renderBody(root);

  try {
    const params = forceRefresh
      ? { refreshAt: Date.now() }
      : {};
    const res = await apiManageDashboardStats(params);
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
