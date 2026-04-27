import { apiAnnouncementList, apiFinesList, apiLoansList, apiProfileGet } from "../../data/api.js";
import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";

const STATE = {
  loading: false,
  stats: {
    activeLoans: 0,
    overdueCount: 0,
    unpaidFineTotal: 0,
    nextDueDate: "",
  },
  announcements: [],
  upcoming: [],
};

function fmtDate(value) {
  const d = new Date(String(value || ""));
  if (!Number.isFinite(d.getTime())) return "-";
  return d.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function renderSummaryCards_() {
  return `
    <div class="member-grid-cards">
      <article class="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
        <p class="text-xs font-black uppercase tracking-wide text-slate-500">กำลังยืมอยู่</p>
        <p class="mt-2 text-2xl font-black text-slate-800">${STATE.stats.activeLoans}</p>
      </article>
      <article class="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
        <p class="text-xs font-black uppercase tracking-wide text-amber-700">เกินกำหนด</p>
        <p class="mt-2 text-2xl font-black text-amber-800">${STATE.stats.overdueCount}</p>
      </article>
      <article class="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm">
        <p class="text-xs font-black uppercase tracking-wide text-rose-700">ค่าปรับค้าง</p>
        <p class="mt-2 text-2xl font-black text-rose-800">${Number(STATE.stats.unpaidFineTotal || 0).toLocaleString("th-TH")} บ.</p>
      </article>
      <article class="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
        <p class="text-xs font-black uppercase tracking-wide text-emerald-700">กำหนดคืนถัดไป</p>
        <p class="mt-2 text-base font-black text-emerald-800">${escapeHtml(fmtDate(STATE.stats.nextDueDate))}</p>
      </article>
    </div>
  `;
}

function renderAnnouncements_() {
  if (!STATE.announcements.length) {
    return '<div class="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">ยังไม่มีประกาศล่าสุด</div>';
  }

  return `
    <div class="space-y-3">
      ${STATE.announcements
        .map(
          (item) => `
        <a data-link href="/announcements?id=${encodeURIComponent(item.id || "")}" class="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow">
          <p class="text-sm font-black text-slate-800">${escapeHtml(item.title || "-")}</p>
          <p class="mt-1 line-clamp-2 text-xs font-medium text-slate-500">${escapeHtml(item.summary || "")}</p>
          <p class="mt-2 text-[11px] font-bold text-sky-700">${escapeHtml(item.date || "")}</p>
        </a>
      `
        )
        .join("")}
    </div>
  `;
}

function renderUpcoming_() {
  if (!STATE.upcoming.length) {
    return '<div class="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">ยังไม่มีรายการกำหนดคืนที่ต้องติดตาม</div>';
  }

  return `
    <div class="space-y-3">
      ${STATE.upcoming
        .map(
          (item) => `
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p class="text-sm font-black text-slate-800">${escapeHtml(item.barcode || "-")}</p>
          <p class="mt-1 text-xs font-semibold text-slate-500">กำหนดคืน: ${escapeHtml(fmtDate(item.dueDate))}</p>
          <p class="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600">สถานะ ${escapeHtml(item.status || "-")}</p>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function renderBody_(root) {
  if (STATE.loading) {
    root.innerHTML = '<div class="rounded-2xl border border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">กำลังโหลดข้อมูลสมาชิก...</div>';
    return;
  }

  root.innerHTML = `
    <div class="space-y-5">
      ${renderSummaryCards_()}

      <div class="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <section>
          <div class="mb-2 flex items-center justify-between">
            <h2 class="text-sm font-black uppercase tracking-wide text-slate-600">ประกาศล่าสุด</h2>
            <a data-link href="/announcements" class="text-xs font-black text-sky-700 hover:text-sky-800">ดูทั้งหมด</a>
          </div>
          ${renderAnnouncements_()}
        </section>

        <section>
          <div class="mb-2 flex items-center justify-between">
            <h2 class="text-sm font-black uppercase tracking-wide text-slate-600">กำหนดคืนใกล้ถึง</h2>
            <a data-link href="/app/loans" class="text-xs font-black text-sky-700 hover:text-sky-800">ดูรายการยืม</a>
          </div>
          ${renderUpcoming_()}
        </section>
      </div>

      <section class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p class="text-sm font-black text-slate-800">ทางลัด</p>
        <div class="mt-3 grid gap-2 sm:grid-cols-3">
          <a data-link href="/app/books" class="rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-center text-sm font-black text-sky-700 hover:bg-sky-100">ค้นหาหนังสือ</a>
          <a data-link href="/app/checkin" class="rounded-xl border border-cyan-100 bg-cyan-50 px-3 py-2 text-center text-sm font-black text-cyan-700 hover:bg-cyan-100">เช็คอินห้องสมุด</a>
          <a data-link href="/app/loan-self" class="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-center text-sm font-black text-emerald-700 hover:bg-emerald-100">ยืม-คืนด้วยตนเอง</a>
          <a data-link href="/app/fines" class="rounded-xl border border-rose-100 bg-rose-50 px-3 py-2 text-center text-sm font-black text-rose-700 hover:bg-rose-100">ค่าปรับของฉัน</a>
          <a data-link href="/app/profile" class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm font-black text-slate-700 hover:bg-slate-100">บัตรสมาชิก</a>
        </div>
      </section>
    </div>
  `;
}

export function renderMemberDashboardView() {
  return '<section id="memberDashboardRoot" class="view"></section>';
}

export async function mountMemberDashboardView(container) {
  const root = container.querySelector("#memberDashboardRoot");
  if (!root) return;

  STATE.loading = true;
  renderBody_(root);

  try {
    const [profileRes, annRes, loansRes, finesRes] = await Promise.all([
      apiProfileGet(),
      apiAnnouncementList({ page: 1, limit: 3 }),
      apiLoansList({ status: "all", page: 1, limit: 100 }),
      apiFinesList({ status: "unpaid", page: 1, limit: 100 }),
    ]);

    if (!profileRes?.ok) throw new Error(profileRes?.error || "โหลดโปรไฟล์ไม่สำเร็จ");

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

    STATE.upcoming = nextDue.slice(0, 4);
  } catch (err) {
    showToast(err?.message || "โหลดหน้าหลักสมาชิกไม่สำเร็จ");
    STATE.stats = { activeLoans: 0, overdueCount: 0, unpaidFineTotal: 0, nextDueDate: "" };
    STATE.announcements = [];
    STATE.upcoming = [];
  } finally {
    STATE.loading = false;
    renderBody_(root);
  }
}
