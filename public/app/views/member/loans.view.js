import { apiFinesList, apiLoansList, apiLoansRenew, apiLoansSelfBootstrap } from "../../data/api.js";
import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";

const STATE = {
  loading: false,
  renewingById: {},
  loanItems: [],
  unpaidFines: [],
  policy: null,
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

function daysUntil_(value) {
  const due = new Date(String(value || "")).getTime();
  if (!Number.isFinite(due)) return null;
  return Math.floor((due - Date.now()) / (24 * 60 * 60 * 1000));
}

function renewUiState_(item) {
  const policy = STATE.policy || {};
  const canRenewByPolicy = policy.canRenew !== false;
  const renewLimit = Math.max(0, Number(policy.renewLimit || 0));
  const renewCount = Math.max(0, Number(item?.renewCount || 0));
  const status = String(item?.status || "").toLowerCase();
  const dueMs = new Date(String(item?.dueDate || "")).getTime();
  const overdueByDate = Number.isFinite(dueMs) ? dueMs < Date.now() : true;

  if (status !== "borrowing") {
    return { disabled: true, label: "ต่ออายุไม่ได้", reason: "ต่ออายุได้เฉพาะรายการที่กำลังยืม" };
  }
  if (overdueByDate) {
    return { disabled: true, label: "เลยกำหนด", reason: "เลยกำหนดคืนแล้ว" };
  }
  if (!canRenewByPolicy || renewLimit <= 0) {
    return { disabled: true, label: "ไม่เปิดต่ออายุ", reason: "นโยบายผู้ใช้ไม่อนุญาตต่ออายุ" };
  }
  if (renewCount >= renewLimit) {
    return { disabled: true, label: "ครบสิทธิ์แล้ว", reason: `ใช้สิทธิ์ครบ ${renewLimit} ครั้ง` };
  }
  return {
    disabled: false,
    label: "ต่ออายุ",
    reason: `คงเหลือ ${Math.max(0, renewLimit - renewCount)} ครั้ง`,
  };
}

function renderLoans_(root) {
  const activeEl = root.querySelector("#memberLoansActive");
  const historyEl = root.querySelector("#memberLoansHistory");
  const fineEl = root.querySelector("#memberLoansFineSummary");
  if (!activeEl || !historyEl || !fineEl) return;

  if (STATE.loading) {
    const loading = '<div class="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">กำลังโหลดข้อมูลการยืม...</div>';
    activeEl.innerHTML = loading;
    historyEl.innerHTML = loading;
    fineEl.textContent = "กำลังโหลด...";
    return;
  }

  const active = STATE.loanItems.filter((item) => ["borrowing", "overdue"].includes(String(item.status || "")));
  const history = STATE.loanItems.filter((item) => ["returned", "lost"].includes(String(item.status || ""))).slice(0, 20);
  const unpaidTotal = STATE.unpaidFines.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  fineEl.textContent = `${unpaidTotal.toLocaleString("th-TH")} บาท`;

  if (!active.length) {
    activeEl.innerHTML = '<div class="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">ตอนนี้ไม่มีหนังสือที่ยืมอยู่</div>';
  } else {
    activeEl.innerHTML = active
      .map((item) => {
        const remainDays = daysUntil_(item.dueDate);
        let dueBadge = '<span class="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600">ไม่พบวันกำหนดคืน</span>';
        if (remainDays !== null) {
          if (remainDays < 0) dueBadge = `<span class="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-black text-rose-700">เกินกำหนด ${Math.abs(remainDays)} วัน</span>`;
          else if (remainDays <= 2) dueBadge = `<span class="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-black text-amber-700">ใกล้ครบกำหนด ${remainDays} วัน</span>`;
          else dueBadge = `<span class="rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-black text-emerald-700">เหลือ ${remainDays} วัน</span>`;
        }
        return `
          <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <p class="text-sm font-black text-slate-800">${escapeHtml(item.barcode || "-")}</p>
              ${dueBadge}
            </div>
            <p class="mt-2 text-xs font-semibold text-slate-500">ยืมเมื่อ ${escapeHtml(fmtDate(item.loanDate))}</p>
            <p class="mt-1 text-xs font-semibold text-slate-500">กำหนดคืน ${escapeHtml(fmtDate(item.dueDate))}</p>
            <div class="mt-3 flex items-center justify-between gap-2">
              <p class="text-[11px] font-semibold text-slate-500">ต่ออายุแล้ว ${escapeHtml(String(Math.max(0, Number(item.renewCount || 0))))} ครั้ง</p>
              ${(() => {
                const renew = renewUiState_(item);
                const busy = STATE.renewingById[item.loanId] === true;
                const disabled = renew.disabled || busy || STATE.loading;
                return `
                  <button
                    type="button"
                    data-renew-loan-id="${escapeHtml(item.loanId || "")}"
                    data-renew-updated-at="${escapeHtml(item.updatedAt || "")}"
                    class="rounded-lg border px-3 py-1.5 text-xs font-black ${disabled ? "border-slate-200 bg-slate-100 text-slate-400" : "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"}"
                    ${disabled ? "disabled" : ""}
                    title="${escapeHtml(renew.reason || "")}"
                  >${escapeHtml(busy ? "กำลังต่ออายุ..." : renew.label)}</button>
                `;
              })()}
            </div>
          </article>
        `;
      })
      .join("");
  }

  if (!history.length) {
    historyEl.innerHTML = '<div class="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">ยังไม่มีประวัติการยืม-คืน</div>';
  } else {
    historyEl.innerHTML = `
      <div class="space-y-2">
        ${history
          .map(
            (item) => `
          <article class="rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div class="flex items-center justify-between gap-2">
              <p class="text-xs font-black text-slate-700">${escapeHtml(item.barcode || "-")}</p>
              <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600">${escapeHtml(item.status || "-")}</span>
            </div>
            <p class="mt-1 text-[11px] font-semibold text-slate-500">คืนเมื่อ ${escapeHtml(fmtDate(item.returnDate))}</p>
          </article>
        `
          )
          .join("")}
      </div>
    `;
  }
}

async function load_(root) {
  STATE.loading = true;
  renderLoans_(root);
  try {
    const [loansRes, finesRes, bootstrapRes] = await Promise.all([
      apiLoansList({ status: "all", page: 1, limit: 120 }),
      apiFinesList({ status: "unpaid", page: 1, limit: 100 }),
      apiLoansSelfBootstrap(),
    ]);

    if (!loansRes?.ok) throw new Error(loansRes?.error || "โหลดรายการยืมไม่สำเร็จ");
    if (!finesRes?.ok) throw new Error(finesRes?.error || "โหลดค่าปรับไม่สำเร็จ");
    STATE.loanItems = Array.isArray(loansRes.data?.items) ? loansRes.data.items : [];
    STATE.unpaidFines = Array.isArray(finesRes.data?.items) ? finesRes.data.items : [];
    STATE.policy = bootstrapRes?.ok ? (bootstrapRes.data?.policy || null) : null;
  } catch (err) {
    STATE.loanItems = [];
    STATE.unpaidFines = [];
    STATE.policy = null;
    showToast(err?.message || "โหลดข้อมูลการยืมไม่สำเร็จ");
  } finally {
    STATE.loading = false;
    renderLoans_(root);
  }
}

async function renewLoan_(root, loanId, updatedAt) {
  const id = String(loanId || "").trim();
  if (!id || STATE.renewingById[id]) return;
  STATE.renewingById[id] = true;
  renderLoans_(root);
  try {
    const res = await apiLoansRenew({ loanId: id, updatedAt: String(updatedAt || "") });
    if (!res?.ok) throw new Error(res?.error || "ต่ออายุไม่สำเร็จ");
    showToast("ต่ออายุสำเร็จ");
    await load_(root);
  } catch (err) {
    showToast(err?.message || "ต่ออายุไม่สำเร็จ");
  } finally {
    delete STATE.renewingById[id];
    renderLoans_(root);
  }
}

export function renderMemberLoansView() {
  return `
    <section id="memberLoansRoot" class="view space-y-4">
      <article class="rounded-2xl border border-rose-100 bg-rose-50 p-4">
        <p class="text-xs font-black uppercase tracking-wide text-rose-700">ค่าปรับค้างชำระ</p>
        <p id="memberLoansFineSummary" class="mt-2 text-2xl font-black text-rose-800">0 บาท</p>
      </article>

      <div class="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <section class="space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-sm font-black uppercase tracking-wide text-slate-600">รายการยืมปัจจุบัน</h2>
            <button id="memberLoansReloadBtn" type="button" class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-100">รีโหลด</button>
          </div>
          <div id="memberLoansActive" class="space-y-3"></div>
        </section>

        <section class="space-y-3">
          <h2 class="text-sm font-black uppercase tracking-wide text-slate-600">ประวัติย้อนหลัง</h2>
          <div id="memberLoansHistory" class="space-y-2"></div>
        </section>
      </div>
    </section>
  `;
}

export function mountMemberLoansView(container) {
  const root = container.querySelector("#memberLoansRoot");
  if (!root) return;
  const reloadBtn = root.querySelector("#memberLoansReloadBtn");
  reloadBtn?.addEventListener("click", () => load_(root));
  root.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-renew-loan-id]");
    if (!btn) return;
    renewLoan_(root, btn.getAttribute("data-renew-loan-id"), btn.getAttribute("data-renew-updated-at"));
  });
  load_(root);
}
