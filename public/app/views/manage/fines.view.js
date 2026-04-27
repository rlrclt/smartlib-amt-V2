import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";
import {
  apiFinesCreateManual,
  apiFinesList,
  apiFinesPay,
  apiFinesWaive,
} from "../../data/api.js";

const STATE = {
  loading: false,
  items: [],
  filterStatus: "unpaid",
  submitting: false,
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

function statusClass(status) {
  const key = String(status || "").toLowerCase();
  if (key === "paid") return "bg-emerald-50 text-emerald-700";
  if (key === "waived") return "bg-slate-100 text-slate-700";
  return "bg-rose-50 text-rose-700";
}

function renderFines(root) {
  const list = root.querySelector("#finesList");
  const total = root.querySelector("#finesUnpaidTotal");
  if (!list) return;

  const unpaid = STATE.items
    .filter((item) => String(item.status) === "unpaid")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  if (total) total.textContent = `${unpaid.toLocaleString("th-TH")} บาท`;

  if (STATE.loading) {
    list.innerHTML = '<div class="rounded-2xl border border-slate-100 bg-white p-4 text-sm font-bold text-slate-500">กำลังโหลดค่าปรับ...</div>';
    return;
  }

  if (!STATE.items.length) {
    list.innerHTML = '<div class="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm font-bold text-slate-500">ไม่พบรายการค่าปรับ</div>';
    return;
  }

  list.innerHTML = STATE.items.map((item) => {
    const unpaid = String(item.status || "") === "unpaid";
    return `
      <div class="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-sm font-black text-slate-800">${escapeHtml(item.fineId)}</p>
            <p class="text-xs font-semibold text-slate-500">loan ${escapeHtml(item.loanId)} · ${escapeHtml(item.uid)}</p>
            <p class="text-xs text-slate-500">${escapeHtml(item.bookTitle || "-")} (${escapeHtml(item.barcode || "-")})</p>
          </div>
          <div class="text-right">
            <p class="text-lg font-black text-slate-800">${Number(item.amount || 0).toLocaleString("th-TH")} บาท</p>
            <span class="rounded-full px-2 py-1 text-[11px] font-black ${statusClass(item.status)}">${escapeHtml(item.status)}</span>
          </div>
        </div>
        <div class="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-slate-500">
          <span class="rounded-lg bg-slate-100 px-2 py-1">type ${escapeHtml(item.type)}</span>
          <span class="rounded-lg bg-slate-100 px-2 py-1">created ${fmtDate(item.createdAt)}</span>
          ${item.paidAt ? `<span class="rounded-lg bg-slate-100 px-2 py-1">paid ${fmtDate(item.paidAt)}</span>` : ""}
        </div>
        ${item.notes ? `<p class="mt-2 text-xs text-slate-600">${escapeHtml(item.notes)}</p>` : ""}
        ${unpaid ? `
          <div class="mt-3 flex flex-wrap gap-2">
            <button data-fine-pay="${escapeHtml(item.fineId)}" class="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700">บันทึกรับชำระ</button>
            <button data-fine-waive="${escapeHtml(item.fineId)}" class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-100">ยกเว้นค่าปรับ (admin)</button>
          </div>
        ` : ""}
      </div>
    `;
  }).join("");
}

async function loadFines(root) {
  STATE.loading = true;
  renderFines(root);
  try {
    const res = await apiFinesList({ status: STATE.filterStatus, limit: 120 });
    if (!res?.ok) throw new Error(res?.error || "โหลดค่าปรับไม่สำเร็จ");
    STATE.items = Array.isArray(res.data?.items) ? res.data.items : [];
  } catch (err) {
    STATE.items = [];
    showToast(err?.message || "โหลดค่าปรับไม่สำเร็จ");
  } finally {
    STATE.loading = false;
    renderFines(root);
  }
}

export function renderManageFinesView() {
  return `
    <div class="space-y-6 p-2 lg:p-4">
      <section class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
        <h2 class="text-xl font-black text-slate-800">จัดการค่าปรับ</h2>
        <p class="text-sm font-semibold text-slate-500">รับชำระ, ยกเว้น, และเพิ่มรายการค่าปรับแบบ manual</p>
      </section>

      <section class="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <form id="fineCreateForm" class="rounded-3xl border border-rose-100 bg-white p-4 shadow-sm lg:p-6">
          <h3 class="mb-4 text-base font-black text-slate-800">เพิ่มค่าปรับด้วยมือ</h3>
          <div class="space-y-3">
            <input name="loanId" required placeholder="Loan ID" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <input name="uid" placeholder="UID (เว้นว่างได้)" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <select name="type" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">
              <option value="overdue">overdue</option>
              <option value="damaged">damaged</option>
              <option value="lost">lost</option>
            </select>
            <input type="number" min="1" step="1" required name="amount" placeholder="จำนวนเงิน (บาท)" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <textarea name="notes" rows="2" placeholder="หมายเหตุ" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
          </div>
          <button type="submit" class="mt-4 w-full rounded-xl bg-rose-600 px-4 py-2 text-sm font-black text-white hover:bg-rose-700">เพิ่มค่าปรับ</button>
        </form>

        <div class="rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:p-6">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 class="text-base font-black text-slate-800">รายการค่าปรับ</h3>
              <p class="text-xs font-bold text-slate-500">ยอด unpaid: <span id="finesUnpaidTotal">0 บาท</span></p>
            </div>
            <div class="flex gap-2">
              <select id="finesStatusFilter" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
                <option value="all">all</option>
                <option value="unpaid" selected>unpaid</option>
                <option value="paid">paid</option>
                <option value="waived">waived</option>
              </select>
              <button id="finesReloadBtn" type="button" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-100">รีโหลด</button>
            </div>
          </div>
          <div id="finesList" class="space-y-3"></div>
        </div>
      </section>
    </div>
  `;
}

export function mountManageFinesView(container) {
  const root = container.querySelector("#manage-content") || container;
  const form = root.querySelector("#fineCreateForm");
  const reloadBtn = root.querySelector("#finesReloadBtn");
  const statusFilter = root.querySelector("#finesStatusFilter");

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (STATE.submitting) return;
    STATE.submitting = true;
    const target = event.currentTarget;

    try {
      const payload = {
        loanId: String(target.elements.loanId.value || "").trim(),
        uid: String(target.elements.uid.value || "").trim(),
        type: String(target.elements.type.value || "overdue"),
        amount: Number(target.elements.amount.value || 0),
        notes: String(target.elements.notes.value || "").trim(),
      };
      const res = await apiFinesCreateManual(payload);
      if (!res?.ok) throw new Error(res?.error || "เพิ่มค่าปรับไม่สำเร็จ");
      showToast(`เพิ่ม ${res.data?.fine?.fineId || "ค่าปรับ"} สำเร็จ`);
      target.reset();
      await loadFines(root);
    } catch (err) {
      showToast(err?.message || "เพิ่มค่าปรับไม่สำเร็จ");
    } finally {
      STATE.submitting = false;
    }
  });

  reloadBtn?.addEventListener("click", () => loadFines(root));

  statusFilter?.addEventListener("change", (event) => {
    STATE.filterStatus = String(event.target.value || "all");
    loadFines(root);
  });

  root.addEventListener("click", async (event) => {
    const payBtn = event.target.closest("[data-fine-pay]");
    const waiveBtn = event.target.closest("[data-fine-waive]");
    if (!payBtn && !waiveBtn) return;
    if (STATE.submitting) return;

    STATE.submitting = true;
    try {
      if (payBtn) {
        const fineId = payBtn.getAttribute("data-fine-pay");
        const note = window.prompt("หมายเหตุการรับชำระ (ถ้ามี)", "") || "";
        const res = await apiFinesPay({ fineId, notes: note });
        if (!res?.ok) throw new Error(res?.error || "บันทึกรับชำระไม่สำเร็จ");
        showToast(`รับชำระ ${res.data?.fine?.fineId || "สำเร็จ"}`);
      }

      if (waiveBtn) {
        const fineId = waiveBtn.getAttribute("data-fine-waive");
        const reason = window.prompt("เหตุผลการยกเว้นค่าปรับ", "");
        if (!reason) throw new Error("ยกเลิกการยกเว้น");
        const res = await apiFinesWaive({ fineId, notes: reason });
        if (!res?.ok) throw new Error(res?.error || "ยกเว้นค่าปรับไม่สำเร็จ");
        showToast(`ยกเว้น ${res.data?.fine?.fineId || "สำเร็จ"}`);
      }

      await loadFines(root);
    } catch (err) {
      if (String(err?.message || "").indexOf("ยกเลิก") >= 0) {
        // no-op
      } else {
        showToast(err?.message || "ทำรายการไม่สำเร็จ");
      }
    } finally {
      STATE.submitting = false;
    }
  });

  loadFines(root);
}
