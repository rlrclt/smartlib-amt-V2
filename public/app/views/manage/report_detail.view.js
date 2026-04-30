import { apiReportsGet } from "../../data/api.js";
import { escapeHtml } from "../../utils/html.js";
import { showToast } from "../../components/toast.js";

function getReportId_() {
  const path = String(window.location.pathname || "");
  const parts = path.split("/").filter(Boolean);
  const id = String(parts[parts.length - 1] || "").toUpperCase();
  return /^R[1-8]$/.test(id) ? id : "R1";
}

function currentDate_() {
  return new Date().toISOString().slice(0, 10);
}

function rowHtml_(row) {
  const keys = Object.keys(row || {});
  return `
    <tr class="border-b border-slate-100">
      ${keys.map((key) => `<td class="px-3 py-2 align-top text-xs font-semibold text-slate-700">${escapeHtml(String(row[key] ?? ""))}</td>`).join("")}
    </tr>
  `;
}

function renderTable_(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    return `<div class="rounded-xl border border-dashed border-slate-200 p-4 text-xs font-semibold text-slate-500">ไม่พบข้อมูลในช่วงเวลาที่เลือก</div>`;
  }
  const columns = Object.keys(rows[0] || {});
  return `
    <div class="overflow-x-auto rounded-2xl border border-slate-200">
      <table class="min-w-full bg-white">
        <thead class="bg-slate-50">
          <tr>
            ${columns.map((key) => `<th class="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-600">${escapeHtml(key)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${rows.map(rowHtml_).join("")}
        </tbody>
      </table>
    </div>
  `;
}

export function renderManageReportDetailView() {
  const reportId = getReportId_();
  const today = currentDate_();
  return `
    <section class="p-4 lg:p-6">
      <header class="mb-4">
        <a data-link href="/manage/reports" class="text-xs font-black text-brand-600 hover:underline">← กลับ Reporting Hub</a>
        <h1 class="mt-1 text-2xl font-black text-slate-900">รายงาน ${escapeHtml(reportId)}</h1>
      </header>
      <div class="mb-4 grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-4">
        <select id="reportPeriod" class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
          <option value="today">วันนี้</option>
          <option value="week">7 วันล่าสุด</option>
          <option value="month" selected>30 วันล่าสุด</option>
          <option value="custom">กำหนดเอง</option>
        </select>
        <input id="reportFrom" type="date" value="${today}" class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" />
        <input id="reportTo" type="date" value="${today}" class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" />
        <button id="reportRefresh" class="rounded-xl bg-slate-900 px-3 py-2 text-sm font-black text-white">โหลดรายงาน</button>
      </div>
      <div id="reportSummary" class="mb-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs font-semibold text-slate-600">กำลังโหลด...</div>
      <div id="reportTable"></div>
    </section>
  `;
}

export function mountManageReportDetailView(root) {
  if (!root) return;
  const periodEl = root.querySelector("#reportPeriod");
  const fromEl = root.querySelector("#reportFrom");
  const toEl = root.querySelector("#reportTo");
  const refreshBtn = root.querySelector("#reportRefresh");
  const summaryEl = root.querySelector("#reportSummary");
  const tableEl = root.querySelector("#reportTable");
  const reportId = getReportId_();

  const load = async () => {
    if (!summaryEl || !tableEl || !periodEl || !fromEl || !toEl) return;
    summaryEl.textContent = "กำลังโหลด...";
    const params = {
      reportId,
      period: periodEl.value,
      from: fromEl.value,
      to: toEl.value,
    };
    try {
      const res = await apiReportsGet(params, { forceRefresh: true });
      if (!res?.ok) throw new Error(res?.error || "โหลดรายงานไม่สำเร็จ");
      const data = res.data || {};
      summaryEl.textContent = `ช่วงข้อมูล ${String(data.range?.from || "-")} ถึง ${String(data.range?.to || "-")} • อัปเดต ${String(data.generatedAt || "-")}`;
      tableEl.innerHTML = renderTable_(Array.isArray(data.rows) ? data.rows : []);
    } catch (err) {
      summaryEl.textContent = "โหลดรายงานไม่สำเร็จ";
      tableEl.innerHTML = `<div class="rounded-xl border border-rose-100 bg-rose-50 p-4 text-xs font-semibold text-rose-700">${escapeHtml(String(err?.message || err || "Unknown error"))}</div>`;
      showToast(err?.message || "โหลดรายงานไม่สำเร็จ");
    }
  };

  periodEl?.addEventListener("change", () => {
    const isCustom = periodEl.value === "custom";
    if (fromEl) fromEl.disabled = !isCustom;
    if (toEl) toEl.disabled = !isCustom;
  });
  refreshBtn?.addEventListener("click", load);
  load();
}
