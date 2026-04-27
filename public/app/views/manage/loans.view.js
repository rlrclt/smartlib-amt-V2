import { showToast } from "../../components/toast.js";
import { renderIconsSafe } from "../../icons.js";
import { escapeHtml } from "../../utils/html.js";
import {
  apiLoansCreate,
  apiLoansList,
  apiLoansReturn,
  apiLoansRunOverdueCheck,
} from "../../data/api.js";

const STATE = {
  loading: false,
  submitting: false,
  items: [],
  filterStatus: "all",
  initialized: false,
};

function fmtDate(value) {
  const d = new Date(String(value || ""));
  if (!Number.isFinite(d.getTime())) return "-";
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadge(status) {
  const key = String(status || "").toLowerCase();
  if (key === "returned") return '<span class="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700">returned</span>';
  if (key === "overdue") return '<span class="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-700">overdue</span>';
  if (key === "lost") return '<span class="rounded-full bg-rose-50 px-2 py-1 text-[11px] font-black text-rose-700">lost</span>';
  return '<span class="rounded-full bg-sky-50 px-2 py-1 text-[11px] font-black text-sky-700">borrowing</span>';
}

function renderRows(root) {
  const list = root.querySelector("#loanList");
  const totalEl = root.querySelector("#loanTotal");
  if (!list) return;

  if (totalEl) totalEl.textContent = String(STATE.items.length);

  if (STATE.loading && STATE.items.length === 0) {
    list.innerHTML = `
      <div class="rounded-2xl border border-slate-100 bg-white p-4 text-sm font-bold text-slate-500">กำลังโหลดข้อมูล...</div>
    `;
    return;
  }

  if (!STATE.items.length) {
    list.innerHTML = `
      <div class="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm font-bold text-slate-500">ยังไม่มีรายการยืม-คืน</div>
    `;
    return;
  }

  list.innerHTML = STATE.items.map((item) => `
    <div class="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p class="text-sm font-black text-slate-800">${escapeHtml(item.loanId)}</p>
          <p class="text-xs font-semibold text-slate-500">${escapeHtml(item.uid)} · ${escapeHtml(item.barcode)}</p>
        </div>
        ${statusBadge(item.status)}
      </div>
      <div class="mt-3 grid gap-2 text-xs font-semibold text-slate-500 md:grid-cols-3">
        <p>ยืม: ${fmtDate(item.loanDate)}</p>
        <p>กำหนดคืน: ${fmtDate(item.dueDate)}</p>
        <p>คืนจริง: ${fmtDate(item.returnDate)}</p>
      </div>
      <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500">
        <span class="rounded-lg bg-slate-100 px-2 py-1">fine ${Number(item.fineAmount || 0).toLocaleString("th-TH")} บาท</span>
        ${item.locationId ? `<span class="rounded-lg bg-slate-100 px-2 py-1">location ${escapeHtml(item.locationId)}</span>` : ""}
      </div>
      ${item.notes ? `<p class="mt-2 text-xs text-slate-600">${escapeHtml(item.notes)}</p>` : ""}
    </div>
  `).join("");
}

async function loadLoans(root, { silent = false } = {}) {
  if (!silent && STATE.items.length === 0) STATE.loading = true;
  renderRows(root);
  try {
    const res = await apiLoansList({ status: STATE.filterStatus, limit: 100 });
    if (!res?.ok) throw new Error(res?.error || "โหลดรายการยืมไม่สำเร็จ");
    STATE.items = Array.isArray(res.data?.items) ? res.data.items : [];
  } catch (err) {
    STATE.items = [];
    showToast(err?.message || "โหลดรายการยืมไม่สำเร็จ");
  } finally {
    STATE.loading = false;
    renderRows(root);
  }
}

export function renderManageLoansView() {
  return `
    <div class="space-y-6 p-2 lg:p-4">
      <section class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-black text-slate-800">ยืม-คืนหนังสือ</h2>
            <p class="text-sm font-semibold text-slate-500">MVP: staff-assisted only</p>
          </div>
          <button id="loanRunOverdueBtn" type="button" class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100">อัปเดต overdue ตอนนี้</button>
        </div>
      </section>

      <section class="grid gap-6 xl:grid-cols-2">
        <form id="loanCreateForm" class="rounded-3xl border border-sky-100 bg-white p-4 shadow-sm lg:p-6">
          <h3 class="mb-4 text-base font-black text-slate-800">สร้างรายการยืม</h3>
          <div class="space-y-3">
            <input name="uid" required placeholder="UID ผู้ยืม" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input name="barcode" required placeholder="Barcode หนังสือ" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input name="locationId" placeholder="Location ID (ไม่บังคับ)" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <textarea name="notes" rows="2" placeholder="หมายเหตุ" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
          </div>
          <button type="submit" class="mt-4 w-full rounded-xl bg-sky-600 px-4 py-2 text-sm font-black text-white hover:bg-sky-700">ยืนยันยืม</button>
        </form>

        <form id="loanReturnForm" class="rounded-3xl border border-emerald-100 bg-white p-4 shadow-sm lg:p-6">
          <h3 class="mb-4 text-base font-black text-slate-800">บันทึกคืนหนังสือ</h3>
          <div class="space-y-3">
            <input name="loanId" required placeholder="Loan ID" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <select name="condition" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">
              <option value="good">good</option>
              <option value="fair">fair</option>
              <option value="poor">poor (ชำรุด)</option>
              <option value="lost">lost (สูญหาย)</option>
            </select>
            <input type="number" min="0" step="1" name="damagedFineAmount" placeholder="ค่าปรับชำรุด (บาท)" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input type="number" min="0" step="1" name="lostFineAmount" placeholder="ค่าปรับสูญหาย (บาท)" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <textarea name="notes" rows="2" placeholder="หมายเหตุการคืน" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
          </div>
          <button type="submit" class="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700">ยืนยันคืน</button>
        </form>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:p-6">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 class="text-base font-black text-slate-800">รายการล่าสุด <span id="loanTotal" class="text-slate-400">0</span></h3>
          <div class="flex items-center gap-2">
            <select id="loanStatusFilter" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
              <option value="all">all</option>
              <option value="borrowing">borrowing</option>
              <option value="overdue">overdue</option>
              <option value="returned">returned</option>
              <option value="lost">lost</option>
            </select>
            <button id="loanReloadBtn" type="button" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-100">รีโหลด</button>
          </div>
        </div>
        <div id="loanList" class="space-y-3"></div>
      </section>
    </div>
  `;
}

export function mountManageLoansView(container) {
  const root = container.querySelector("#manage-content") || container;
  const createForm = root.querySelector("#loanCreateForm");
  const returnForm = root.querySelector("#loanReturnForm");
  const reloadBtn = root.querySelector("#loanReloadBtn");
  const overdueBtn = root.querySelector("#loanRunOverdueBtn");
  const statusFilter = root.querySelector("#loanStatusFilter");

  createForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (STATE.submitting) return;
    STATE.submitting = true;
    const form = event.currentTarget;

    try {
      const payload = {
        uid: String(form.elements.uid.value || "").trim(),
        barcode: String(form.elements.barcode.value || "").trim(),
        locationId: String(form.elements.locationId.value || "").trim(),
        notes: String(form.elements.notes.value || "").trim(),
      };

      const res = await apiLoansCreate(payload);
      if (!res?.ok) throw new Error(res?.error || "สร้างรายการยืมไม่สำเร็จ");
      showToast(`สร้างรายการ ${res.data?.loan?.loanId || "สำเร็จ"}`);
      form.reset();
      await loadLoans(root);
    } catch (err) {
      showToast(err?.message || "สร้างรายการยืมไม่สำเร็จ");
    } finally {
      STATE.submitting = false;
    }
  });

  returnForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (STATE.submitting) return;
    STATE.submitting = true;
    const form = event.currentTarget;

    try {
      const payload = {
        loanId: String(form.elements.loanId.value || "").trim(),
        condition: String(form.elements.condition.value || "good"),
        damagedFineAmount: Number(form.elements.damagedFineAmount.value || 0),
        lostFineAmount: Number(form.elements.lostFineAmount.value || 0),
        notes: String(form.elements.notes.value || "").trim(),
      };

      const res = await apiLoansReturn(payload);
      if (!res?.ok) throw new Error(res?.error || "บันทึกคืนไม่สำเร็จ");
      showToast(`บันทึกคืน ${res.data?.loan?.loanId || "สำเร็จ"}`);
      form.reset();
      await loadLoans(root);
    } catch (err) {
      showToast(err?.message || "บันทึกคืนไม่สำเร็จ");
    } finally {
      STATE.submitting = false;
    }
  });

  reloadBtn?.addEventListener("click", () => {
    loadLoans(root);
  });

  overdueBtn?.addEventListener("click", async () => {
    if (STATE.submitting) return;
    STATE.submitting = true;
    try {
      const res = await apiLoansRunOverdueCheck();
      if (!res?.ok) throw new Error(res?.error || "อัปเดต overdue ไม่สำเร็จ");
      showToast(`อัปเดต ${res.data?.changedCount || 0} รายการ`);
      await loadLoans(root);
    } catch (err) {
      showToast(err?.message || "อัปเดต overdue ไม่สำเร็จ");
    } finally {
      STATE.submitting = false;
    }
  });

  statusFilter?.addEventListener("change", (event) => {
    STATE.filterStatus = String(event.target.value || "all");
    loadLoans(root, { silent: false });
  });

  if (!STATE.initialized) {
    STATE.initialized = true;
    loadLoans(root, { silent: false });
  } else {
    // Render immediately from state
    renderRows(root);
    // Fetch silently to update
    loadLoans(root, { silent: true });
  }
  renderIconsSafe();
}
