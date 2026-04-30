import { apiReportsGet } from "../../data/api.js";
import { escapeHtml } from "../../utils/html.js";
import { showToast } from "../../components/toast.js";

const REPORTS = [
  { id: "R1", title: "สมาชิกเข้าใช้บริการ", desc: "สถิติและรายการเช็คอิน" },
  { id: "R2", title: "ธุรกรรมการยืม", desc: "รายการยืมหนังสือตามช่วงเวลา" },
  { id: "R3", title: "รายการเกินกำหนด", desc: "ติดตามการคืนล่าช้า" },
  { id: "R4", title: "ค่าปรับค้างชำระ", desc: "ยอดค้างและรายการละเอียด" },
  { id: "R5", title: "ภาพรวมการจอง", desc: "สถานะการจอง waiting/ready/..." },
  { id: "R6", title: "สมาชิกใหม่", desc: "สมาชิกใหม่ในช่วงเวลา" },
  { id: "R7", title: "คลังหนังสือตามหมวดหมู่", desc: "จำนวนเล่ม available/borrowed" },
  { id: "R8", title: "หนังสือยอดนิยม", desc: "อันดับเล่มที่ถูกยืมสูงสุด" },
];

function getReportIdFromPath_() {
  const path = String(window.location.pathname || "");
  const parts = path.split("/").filter(Boolean);
  const id = String(parts[parts.length - 1] || "").toUpperCase();
  return /^R[1-8]$/.test(id) ? id : "";
}

function currentDate_() {
  return new Date().toISOString().slice(0, 10);
}

function shiftDate_(baseYmd, deltaDays) {
  const d = new Date(String(baseYmd || "") + "T00:00:00");
  if (!Number.isFinite(d.getTime())) return baseYmd;
  d.setDate(d.getDate() + deltaDays);
  return d.toISOString().slice(0, 10);
}

function buildMainCards_() {
  return REPORTS.map((item) => `
    <button
      type="button"
      data-report-open="${escapeHtml(item.id)}"
      class="pressable flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-sky-200 hover:bg-sky-50"
    >
      <div>
        <p class="text-xs font-black tracking-[0.12em] text-sky-700">${escapeHtml(item.id)}</p>
        <h2 class="mt-1 text-base font-black text-slate-800">${escapeHtml(item.title)}</h2>
        <p class="mt-1 text-xs font-semibold text-slate-500">${escapeHtml(item.desc)}</p>
      </div>
      <span class="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">ดู</span>
    </button>
  `).join("");
}

function renderRowsTable_(rows) {
  if (!Array.isArray(rows) || !rows.length) {
    return '<div class="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-xs font-semibold text-slate-500">ไม่พบข้อมูลในช่วงเวลานี้</div>';
  }
  const cols = Object.keys(rows[0] || {});
  return `
    <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table class="min-w-full">
        <thead class="bg-slate-50">
          <tr>${cols.map((c) => `<th class="px-3 py-2 text-left text-[11px] font-black uppercase tracking-wider text-slate-600">${escapeHtml(c)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${rows.map((row) => `
            <tr class="border-b border-slate-100">
              ${cols.map((c) => `<td class="px-3 py-2 align-top text-xs font-semibold text-slate-700">${escapeHtml(String(row[c] ?? ""))}</td>`).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderManageReportsShell_() {
  const today = currentDate_();
  return `
    <section id="manageReportsNativeRoot" class="reports-native-shell">
      <div id="manageReportsMainPane" class="reports-pane reports-pane-main p-4 lg:p-6">
        <header class="mb-5">
          <p class="text-xs font-black uppercase tracking-[0.14em] text-brand-600">Reporting Hub</p>
          <h1 class="mt-1 text-2xl font-black text-slate-900">รายงานห้องสมุด (R1-R8)</h1>
          <p class="mt-1 text-sm font-semibold text-slate-500">เลือกประเภทรายงานเพื่อดูข้อมูลแบบกำหนดช่วงเวลา</p>
        </header>
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">${buildMainCards_()}</div>
      </div>

      <div id="manageReportsSubPane" class="reports-pane reports-pane-sub p-4 lg:p-6">
        <header class="mb-4 flex items-center justify-between gap-3">
          <button type="button" id="manageReportsBackBtn" class="pressable rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 lg:hidden">← กลับ</button>
          <h2 id="manageReportsTitle" class="text-lg font-black text-slate-900">รายงาน</h2>
          <span id="manageReportsIdBadge" class="rounded-lg bg-sky-100 px-2 py-1 text-xs font-black text-sky-700">R1</span>
        </header>

        <div class="mb-4 grid gap-2 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-4">
          <select id="manageReportsPeriod" class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
            <option value="today">วันนี้</option>
            <option value="week">7 วันล่าสุด</option>
            <option value="month" selected>30 วันล่าสุด</option>
            <option value="custom">กำหนดเอง</option>
          </select>
          <input id="manageReportsFrom" type="date" value="${today}" class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" disabled />
          <input id="manageReportsTo" type="date" value="${today}" class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" disabled />
          <button id="manageReportsRefresh" type="button" class="pressable rounded-xl bg-slate-900 px-3 py-2 text-sm font-black text-white">โหลดรายงาน</button>
        </div>

        <div id="manageReportsSummary" class="mb-3 rounded-2xl border border-slate-200 bg-white p-4 text-xs font-semibold text-slate-600"></div>
        <div id="manageReportsBody"></div>
      </div>
    </section>
  `;
}

export function renderManageReportsHubView() {
  return renderManageReportsShell_();
}

export function mountManageReportsHubView(container) {
  const root = container.querySelector("#manageReportsNativeRoot") || container;
  const mainPane = root.querySelector("#manageReportsMainPane");
  const subPane = root.querySelector("#manageReportsSubPane");
  const titleEl = root.querySelector("#manageReportsTitle");
  const badgeEl = root.querySelector("#manageReportsIdBadge");
  const periodEl = root.querySelector("#manageReportsPeriod");
  const fromEl = root.querySelector("#manageReportsFrom");
  const toEl = root.querySelector("#manageReportsTo");
  const summaryEl = root.querySelector("#manageReportsSummary");
  const bodyEl = root.querySelector("#manageReportsBody");
  if (!mainPane || !subPane || !titleEl || !badgeEl || !periodEl || !fromEl || !toEl || !summaryEl || !bodyEl) return;

  const state = {
    reportId: "R1",
    loading: false,
  };

  function applyPaneState_(openSub) {
    mainPane.classList.toggle("reports-pane-hidden", openSub);
    subPane.classList.toggle("reports-pane-active", openSub);
  }

  function syncRangeInputs_() {
    const today = currentDate_();
    if (periodEl.value === "today") {
      fromEl.value = today;
      toEl.value = today;
      fromEl.disabled = true;
      toEl.disabled = true;
      return;
    }
    if (periodEl.value === "week") {
      fromEl.value = shiftDate_(today, -6);
      toEl.value = today;
      fromEl.disabled = true;
      toEl.disabled = true;
      return;
    }
    if (periodEl.value === "month") {
      fromEl.value = shiftDate_(today, -29);
      toEl.value = today;
      fromEl.disabled = true;
      toEl.disabled = true;
      return;
    }
    fromEl.disabled = false;
    toEl.disabled = false;
  }

  async function loadReport_(forceRefresh) {
    state.loading = true;
    summaryEl.innerHTML = '<div class="skeleton-box h-4 w-2/3"></div>';
    bodyEl.innerHTML = `
      <div class="space-y-2">
        <div class="skeleton-box h-10 w-full"></div>
        <div class="skeleton-box h-10 w-full"></div>
        <div class="skeleton-box h-10 w-full"></div>
      </div>
    `;
    try {
      const res = await apiReportsGet({
        reportId: state.reportId,
        period: periodEl.value,
        from: fromEl.value,
        to: toEl.value,
      }, { forceRefresh: forceRefresh === true });
      if (!res?.ok) throw new Error(res?.error || "โหลดรายงานไม่สำเร็จ");
      const data = res.data || {};
      summaryEl.textContent = `ช่วงข้อมูล ${String(data.range?.from || "-")} ถึง ${String(data.range?.to || "-")} • อัปเดต ${String(data.generatedAt || "-")}`;
      bodyEl.innerHTML = renderRowsTable_(Array.isArray(data.rows) ? data.rows : []);
    } catch (err) {
      summaryEl.textContent = "โหลดรายงานไม่สำเร็จ";
      bodyEl.innerHTML = `<div class="rounded-xl border border-rose-100 bg-rose-50 p-4 text-xs font-semibold text-rose-700">${escapeHtml(String(err?.message || err || "Unknown error"))}</div>`;
      showToast(err?.message || "โหลดรายงานไม่สำเร็จ");
    } finally {
      state.loading = false;
    }
  }

  function openReport_(id, pushState) {
    const item = REPORTS.find((x) => x.id === id) || REPORTS[0];
    state.reportId = item.id;
    titleEl.textContent = item.title;
    badgeEl.textContent = item.id;
    applyPaneState_(true);
    syncRangeInputs_();
    if (pushState) {
      window.history.pushState({}, "", `/manage/reports/${encodeURIComponent(item.id)}`);
    }
    void loadReport_(true);
  }

  function backToMain_(pushState) {
    applyPaneState_(false);
    if (pushState) {
      window.history.pushState({}, "", "/manage/reports");
    }
  }

  root.querySelectorAll("[data-report-open]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = String(btn.getAttribute("data-report-open") || "").toUpperCase();
      if (!/^R[1-8]$/.test(id)) return;
      openReport_(id, true);
    });
  });

  root.querySelector("#manageReportsBackBtn")?.addEventListener("click", () => backToMain_(true));
  root.querySelector("#manageReportsRefresh")?.addEventListener("click", () => void loadReport_(true));
  periodEl.addEventListener("change", () => syncRangeInputs_());
  window.addEventListener("popstate", () => {
    if (!root.isConnected) return;
    const id = getReportIdFromPath_();
    if (id) {
      openReport_(id, false);
      return;
    }
    backToMain_(false);
  });

  const deepId = getReportIdFromPath_();
  if (deepId) {
    openReport_(deepId, false);
  } else {
    backToMain_(false);
  }
}
