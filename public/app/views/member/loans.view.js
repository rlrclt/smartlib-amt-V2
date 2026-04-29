import { apiFinesList, apiLoansList, apiLoansRenew, apiLoansSelfBootstrap } from "../../data/api.js";
import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";

const STATE = {
  loading: false,
  renewingById: {},
  loanItems: [],
  unpaidFines: [],
  policy: null,
  viewMode: "active",
};

function ensureNativeStyles_() {
  if (document.getElementById("memberLoansNativeStyle")) return;
  const style = document.createElement("style");
  style.id = "memberLoansNativeStyle";
  style.textContent = `
    #memberLoansRoot {
      overscroll-behavior: contain;
    }
    .member-loans-shell {
      container-type: inline-size;
    }
    .member-loans-surface {
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(18px);
      border: 1px solid rgba(226, 232, 240, 0.92);
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
    }
    .member-loans-pressable {
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      transition: transform .15s cubic-bezier(0.32, 0.72, 0, 1), opacity .15s ease, box-shadow .15s ease, background-color .15s ease, border-color .15s ease;
      cursor: pointer;
      user-select: none;
    }
    .member-loans-pressable:active {
      transform: scale(0.96);
      opacity: 0.82;
    }
    .member-loans-segment {
      transition: all .22s ease;
    }
    .member-loans-segment.active {
      background: #fff;
      color: #0284c7;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .member-loans-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .member-loans-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .member-loans-skeleton {
      background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
      background-size: 200% 100%;
      animation: memberLoansShimmer 1.5s infinite;
    }
    @keyframes memberLoansShimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    .shadow-card {
      box-shadow: 0 2px 12px rgba(0,0,0,0.03);
    }
  `;
  (document.head || document.documentElement).appendChild(style);
}

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

function fmtMoney(value) {
  return Number(value || 0).toLocaleString("th-TH");
}

function titleOf_(item) {
  return String(item?.title || item?.bookTitle || item?.book_name || item?.name || item?.barcode || "หนังสือ").trim();
}

function barcodeOf_(item) {
  return String(item?.barcode || item?.bookBarcode || "-").trim() || "-";
}

function coverOf_(item) {
  return String(item?.cover || item?.coverUrl || item?.bookCover || item?.imageUrl || "").trim();
}

function dueDays_(value) {
  const due = new Date(String(value || "")).getTime();
  if (!Number.isFinite(due)) return null;
  return Math.ceil((due - Date.now()) / (24 * 60 * 60 * 1000));
}

function analyzeDueStatus(dueDateStr) {
  const days = dueDays_(dueDateStr);
  if (days === null) {
    return {
      days: null,
      isOverdue: false,
      badgeHtml: '<span class="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-600">ไม่พบวันกำหนดคืน</span>',
    };
  }

  if (days < 0) {
    return {
      days,
      isOverdue: true,
      badgeHtml: `<span class="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-black text-rose-700">เกินกำหนด ${Math.abs(days)} วัน</span>`,
    };
  }

  if (days <= 2) {
    const label = days === 0 ? "ครบกำหนดวันนี้" : `เหลือ ${days} วัน`;
    return {
      days,
      isOverdue: false,
      badgeHtml: `<span class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-black text-amber-700">${label}</span>`,
    };
  }

  return {
    days,
    isOverdue: false,
    badgeHtml: `<span class="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700">อีก ${days} วัน</span>`,
  };
}

function renewUiState_(item) {
  const policy = STATE.policy || {};
  const canRenewByPolicy = policy.canRenew !== false;
  const renewLimit = Math.max(0, Number(policy.renewLimit || 0));
  const renewCount = Math.max(0, Number(item?.renewCount || 0));
  const status = String(item?.status || "").toLowerCase();
  const overdue = analyzeDueStatus(item?.dueDate).isOverdue;

  if (status !== "borrowing") {
    return { disabled: true, label: "ต่ออายุไม่ได้", reason: "ต่ออายุได้เฉพาะรายการที่กำลังยืม" };
  }
  if (overdue) {
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

function loansByMode_(mode) {
  const active = STATE.loanItems.filter((item) => ["borrowing", "overdue"].includes(String(item.status || "").toLowerCase()));
  const history = STATE.loanItems.filter((item) => ["returned", "returned_late", "lost", "completed", "cancelled"].includes(String(item.status || "").toLowerCase()));
  return mode === "history" ? history.slice(0, 20) : active;
}

function activeLoanCount_() {
  return STATE.loanItems.filter((item) => ["borrowing", "overdue"].includes(String(item.status || "").toLowerCase())).length;
}

function historyLoanCount_() {
  return STATE.loanItems.filter((item) => ["returned", "returned_late", "lost", "completed", "cancelled"].includes(String(item.status || "").toLowerCase())).length;
}

function unpaidFineTotal_() {
  return STATE.unpaidFines.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

function statusLabel_(status) {
  const key = String(status || "").toLowerCase();
  return {
    borrowing: "กำลังยืม",
    overdue: "เกินกำหนด",
    returned: "คืนแล้ว",
    returned_late: "คืนล่าช้า",
    lost: "สูญหาย",
    completed: "เสร็จสิ้น",
    cancelled: "ยกเลิก",
  }[key] || key || "-";
}

function renderLoadingList_() {
  return `
    <div class="space-y-3">
      <div class="member-loans-skeleton h-[156px] rounded-[1.5rem]"></div>
      <div class="member-loans-skeleton h-[156px] rounded-[1.5rem]"></div>
      <div class="member-loans-skeleton h-[156px] rounded-[1.5rem]"></div>
    </div>
  `;
}

function renderFineAlert_() {
  const total = unpaidFineTotal_();
  if (!total) return "";
  return `
    <article class="rounded-[1.25rem] border border-rose-200 bg-rose-50 p-4 shadow-sm">
      <div class="flex items-center justify-between gap-3">
        <div class="flex min-w-0 items-center gap-3">
          <div class="shrink-0 rounded-full bg-rose-100 p-2.5 text-rose-600">
            <i data-lucide="alert-circle" class="h-5 w-5"></i>
          </div>
          <div class="min-w-0">
            <p class="text-xs font-black text-rose-800">มียอดค่าปรับค้างชำระ</p>
            <p class="mt-1 text-lg font-black text-rose-600">${fmtMoney(total)} บาท</p>
          </div>
        </div>
        <a data-link href="/app/fines" class="member-loans-pressable rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white">ตรวจสอบ</a>
      </div>
    </article>
  `;
}

function renderDropBoxBanner_() {
  return `
    <article class="rounded-[1.25rem] border border-sky-100 bg-sky-50 p-3 shadow-sm">
      <div class="flex gap-3">
        <div class="shrink-0 rounded-full bg-sky-100 p-2 text-sky-600">
          <i data-lucide="info" class="h-4 w-4"></i>
        </div>
        <div>
          <p class="text-[11px] font-bold leading-tight text-sky-800">
            บริการคืนหนังสือด้วยตนเอง (Drop Box)<br />
            เปิดให้บริการตลอด 24 ชม.
          </p>
        </div>
      </div>
    </article>
  `;
}

function renderSegmentedControl_() {
  const activeCount = activeLoanCount_();
  const historyCount = historyLoanCount_();
  const activeCls = STATE.viewMode === "active" ? "active bg-white text-sky-600 shadow-sm" : "text-slate-500";
  const historyCls = STATE.viewMode === "history" ? "active bg-white text-sky-600 shadow-sm" : "text-slate-500";
  return `
    <div class="mt-4 rounded-[1.1rem] bg-slate-100 p-1">
      <div class="grid grid-cols-2 gap-1">
        <button type="button" data-loans-tab="active" class="member-loans-segment ${activeCls} member-loans-pressable rounded-lg px-3 py-2 text-sm font-bold">
          กำลังยืม <span id="badge-active" class="ml-1 rounded-md bg-brand-100 px-1.5 py-0.5 text-[10px] font-black text-brand-600">${activeCount}</span>
        </button>
        <button type="button" data-loans-tab="history" class="member-loans-segment ${historyCls} member-loans-pressable rounded-lg px-3 py-2 text-sm font-bold">
          ประวัติยืม-คืน <span id="badge-history" class="ml-1 rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-black text-slate-600">${historyCount}</span>
        </button>
      </div>
    </div>
  `;
}

function renderLoanCard_(item) {
  const status = analyzeDueStatus(item?.dueDate);
  const renew = renewUiState_(item);
  const loanId = String(item?.loanId || item?.id || "").trim();
  const busy = STATE.renewingById[loanId] === true;
  const disabled = renew.disabled || busy || STATE.loading;
  const title = titleOf_(item);
  const barcode = barcodeOf_(item);
  const cover = coverOf_(item);
  const renewCount = Math.max(0, Number(item?.renewCount || 0));
  const renewLimit = Math.max(0, Number((STATE.policy || {}).renewLimit || 0));

  return `
    <article class="shadow-card overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-4">
      <div class="flex gap-3">
        <div class="h-24 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          ${
            cover
              ? `<img src="${escapeHtml(cover)}" alt="${escapeHtml(title)}" class="h-full w-full object-cover" loading="lazy" />`
              : `<div class="flex h-full w-full items-center justify-center text-slate-300"><i data-lucide="book-open" class="h-6 w-6"></i></div>`
          }
        </div>

        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <p class="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">หนังสือที่ยืม</p>
              <h3 class="mt-1 line-clamp-2 text-sm font-black leading-tight text-slate-800">${escapeHtml(title)}</h3>
              <p class="mt-1 text-[11px] font-bold text-slate-400">${escapeHtml(barcode)}</p>
            </div>
            ${status.badgeHtml}
          </div>

          <div class="mt-3 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-2">
            <p>ยืมเมื่อ: <span class="text-slate-700">${escapeHtml(fmtDate(item?.loanDate || item?.borrowedAt || item?.createdAt))}</span></p>
            <p>กำหนดคืน: <span class="text-slate-700">${escapeHtml(fmtDate(item?.dueDate))}</span></p>
          </div>

          <div class="mt-3 flex items-center justify-between gap-2">
            <p class="text-[11px] font-semibold text-slate-500">ต่ออายุแล้ว ${escapeHtml(String(renewCount))}/${escapeHtml(String(renewLimit))} ครั้ง</p>
            <button
              type="button"
              data-renew-loan-id="${escapeHtml(loanId)}"
              data-renew-updated-at="${escapeHtml(item.updatedAt || "")}"
              class="member-loans-pressable rounded-xl border px-3 py-2 text-xs font-black ${disabled ? "border-slate-200 bg-slate-100 text-slate-400" : "border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100"}"
              ${disabled ? "disabled" : ""}
              title="${escapeHtml(renew.reason || "")}"
            >${escapeHtml(busy ? "กำลังต่ออายุ..." : renew.label)}</button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderHistoryCard_(item) {
  const title = titleOf_(item);
  const barcode = barcodeOf_(item);
  const status = String(item?.status || "").toLowerCase();
  const badgeCls =
    status === "returned"
      ? "bg-slate-100 text-slate-600"
      : status === "returned_late"
        ? "bg-amber-100 text-amber-700"
        : status === "lost"
          ? "bg-rose-100 text-rose-700"
          : "bg-slate-100 text-slate-600";

  return `
    <article class="shadow-card rounded-[1.25rem] border border-slate-200 bg-white p-4">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <p class="text-sm font-black text-slate-800">${escapeHtml(title)}</p>
          <p class="mt-1 text-xs font-semibold text-slate-500">${escapeHtml(barcode)}</p>
        </div>
        <span class="rounded-full px-2 py-1 text-[11px] font-black ${badgeCls}">${escapeHtml(statusLabel_(status))}</span>
      </div>
      <div class="mt-3 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-2">
        <p>ยืมเมื่อ: <span class="text-slate-700">${escapeHtml(fmtDate(item?.loanDate || item?.borrowedAt || item?.createdAt))}</span></p>
        <p>คืนเมื่อ: <span class="text-slate-700">${escapeHtml(fmtDate(item?.returnDate || item?.returnedAt || item?.updatedAt))}</span></p>
      </div>
    </article>
  `;
}

function renderList_(root) {
  const list = root.querySelector("#memberLoansList");
  if (!list) return;

  if (STATE.loading) {
    list.innerHTML = renderLoadingList_();
    return;
  }

  const items = loansByMode_(STATE.viewMode);
  if (!items.length) {
    const message = STATE.viewMode === "history" ? "ยังไม่มีประวัติการยืม-คืน" : "ตอนนี้ไม่มีหนังสือที่ยืมอยู่";
    list.innerHTML = `
      <div class="rounded-[1.25rem] border border-dashed border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">${escapeHtml(message)}</div>
    `;
    return;
  }

  list.innerHTML = `
    <div class="space-y-3">
      ${STATE.viewMode === "history" ? items.map(renderHistoryCard_).join("") : items.map(renderLoanCard_).join("")}
    </div>
  `;
}

function render_(root) {
  const fineAlert = root.querySelector("#memberLoansFineAlert");
  const reloadBtn = root.querySelector("#memberLoansReloadBtn");
  const tabs = root.querySelectorAll("[data-loans-tab]");
  const countEl = root.querySelector("#memberLoansCount");
  const fineSummaryEl = root.querySelector("#memberLoansFineSummary");
  const modeLabelEl = root.querySelector("#memberLoansModeLabel");
  const content = root.querySelector("#memberLoansList");
  if (!fineAlert || !reloadBtn || !tabs.length || !countEl || !content || !fineSummaryEl || !modeLabelEl) return;

  countEl.textContent = STATE.viewMode === "history" ? String(historyLoanCount_()) : String(activeLoanCount_());
  fineSummaryEl.textContent = `${fmtMoney(unpaidFineTotal_())} บาท`;
  modeLabelEl.textContent = STATE.viewMode === "history" ? "ประวัติย้อนหลัง" : "รายการที่กำลังยืม";
  fineAlert.innerHTML = renderFineAlert_();
  renderList_(root);

  tabs.forEach((tab) => {
    const mode = String(tab.getAttribute("data-loans-tab") || "active");
    const active = STATE.viewMode === mode;
    tab.classList.toggle("active", active);
    tab.classList.toggle("bg-white", active);
    tab.classList.toggle("text-sky-600", active);
    tab.classList.toggle("text-slate-500", !active);
    tab.classList.toggle("shadow-sm", active);
  });

  reloadBtn.disabled = STATE.loading;
  reloadBtn.setAttribute("aria-busy", STATE.loading ? "true" : "false");
  reloadBtn.classList.toggle("opacity-60", STATE.loading);
  reloadBtn.classList.toggle("pointer-events-none", STATE.loading);

  window.lucide?.createIcons?.();
}

async function load_(root) {
  STATE.loading = true;
  render_(root);

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
    render_(root);
  }
}

async function renewLoan_(root, loanId, updatedAt) {
  const id = String(loanId || "").trim();
  if (!id || STATE.renewingById[id]) return;
  STATE.renewingById[id] = true;
  render_(root);
  try {
    const res = await apiLoansRenew({ loanId: id, updatedAt: String(updatedAt || "") });
    if (!res?.ok) throw new Error(res?.error || "ต่ออายุไม่สำเร็จ");
    showToast("ต่ออายุสำเร็จ");
    await load_(root);
  } catch (err) {
    showToast(err?.message || "ต่ออายุไม่สำเร็จ");
  } finally {
    delete STATE.renewingById[id];
    render_(root);
  }
}

export function renderMemberLoansView() {
  ensureNativeStyles_();
  return `
    <section id="memberLoansRoot" class="member-loans-shell view mx-auto w-full max-w-[1440px] space-y-4 px-3 pb-4 sm:px-4 lg:px-6">
      <article class="member-loans-surface overflow-hidden rounded-[1.75rem]">
        <div class="p-4 sm:p-5">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0">
              <p class="text-[11px] font-black uppercase tracking-[0.18em] text-sky-600">Member Loans</p>
              <h1 class="mt-1 text-[clamp(1.35rem,2vw,1.9rem)] font-black leading-tight text-slate-900">หนังสือของฉัน</h1>
              <p class="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600 sm:text-[15px]">ดูรายการยืมปัจจุบัน ประวัติย้อนหลัง และต่ออายุได้ในที่เดียว</p>
            </div>
            <div class="flex min-w-0 flex-col gap-2 sm:flex-row lg:min-w-[18rem] lg:flex-col">
              <button id="memberLoansReloadBtn" type="button" class="member-loans-pressable inline-flex items-center justify-center gap-2 rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50">
                <i data-lucide="rotate-cw" class="h-4 w-4"></i>
                รีเฟรชรายการ
              </button>
              <div class="rounded-[1.1rem] border border-rose-100 bg-rose-50/90 p-3 shadow-sm">
                <p class="text-[10px] font-black uppercase tracking-[0.16em] text-rose-500">ค่าปรับค้างชำระ</p>
                <p id="memberLoansFineSummary" class="mt-1 text-lg font-black text-rose-700">0 บาท</p>
              </div>
            </div>
          </div>

          <div class="mt-4">
            ${renderSegmentedControl_()}
          </div>
        </div>
      </article>

      ${renderDropBoxBanner_()}

      <div id="memberLoansFineAlert"></div>

      <section class="member-loans-surface rounded-[1.5rem] p-4 sm:p-5">
        <div class="mb-3 flex items-center justify-between gap-3">
          <div>
            <p class="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">รายการแสดงผล</p>
            <h2 class="mt-1 text-sm font-black text-slate-800">ทั้งหมด <span id="memberLoansCount">0</span> รายการ</h2>
          </div>
          <p id="memberLoansModeLabel" class="text-xs font-semibold text-slate-500">${STATE.viewMode === "history" ? "ประวัติย้อนหลัง" : "รายการที่กำลังยืม"}</p>
        </div>
        <div id="memberLoansList" class="space-y-3 min-h-[300px]"></div>
      </section>
    </section>
  `;
}

export function mountMemberLoansView(container) {
  ensureNativeStyles_();
  const root = container.querySelector("#memberLoansRoot");
  if (!root) return;

  const reloadBtn = root.querySelector("#memberLoansReloadBtn");
  reloadBtn?.addEventListener("click", () => load_(root));

  root.addEventListener("click", (event) => {
    const tabBtn = event.target.closest("[data-loans-tab]");
    if (tabBtn) {
      const nextMode = String(tabBtn.getAttribute("data-loans-tab") || "active");
      if (STATE.viewMode !== nextMode) {
        STATE.viewMode = nextMode;
        render_(root);
      }
      return;
    }

    const btn = event.target.closest("button[data-renew-loan-id]");
    if (!btn) return;
    renewLoan_(root, btn.getAttribute("data-renew-loan-id"), btn.getAttribute("data-renew-updated-at"));
  });

  load_(root);
}
