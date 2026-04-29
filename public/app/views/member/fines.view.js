import {
  MEMBER_SYNC_KEYS,
  getMemberResource,
  revalidateMemberResource,
  subscribeMemberResource,
} from "../../data/member_sync.js";
import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";

const STATE = {
  loading: false,
  items: [],
  filter: "all",
  unsubscribe: null,
  rootAliveTimerId: 0,
};

function ensureNativeStyles_() {
  if (document.getElementById("memberFinesNativeStyle")) return;
  const style = document.createElement("style");
  style.id = "memberFinesNativeStyle";
  style.textContent = `
    #memberFinesRoot {
      overscroll-behavior: contain;
    }
    .member-fines-shell {
      container-type: inline-size;
    }
    .member-fines-pressable {
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      transition: transform .12s ease, opacity .12s ease, box-shadow .18s ease, background-color .18s ease, border-color .18s ease;
    }
    .member-fines-pressable:active {
      transform: scale(0.98);
      opacity: 0.86;
    }
    .member-fines-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .member-fines-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .member-fines-skeleton {
      background: #e2e8f0;
    }
    .member-fines-shadow {
      box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
    }
    .member-fines-unpaid {
      border-left: 4px solid #f43f5e;
    }
    .member-fines-shell-card {
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(18px);
      border: 1px solid rgba(226, 232, 240, 0.92);
      box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
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

function typeLabel(type) {
  const key = String(type || "").toLowerCase();
  return {
    overdue: "ส่งคืนล่าช้า",
    damaged: "หนังสือชำรุด",
    lost: "หนังสือสูญหาย",
  }[key] || key || "-";
}

function statusClass(status) {
  const key = String(status || "").toLowerCase();
  if (key === "paid") return "bg-emerald-100 text-emerald-700";
  if (key === "waived") return "bg-slate-100 text-slate-700";
  return "bg-rose-100 text-rose-700";
}

function statusLabel(status) {
  const key = String(status || "").toLowerCase();
  return {
    unpaid: "ค้างชำระ",
    paid: "ชำระแล้ว",
    waived: "ยกเว้น",
  }[key] || key || "-";
}

function normalizeStatus_(value) {
  const key = String(value || "").toLowerCase();
  return ["unpaid", "paid", "waived"].includes(key) ? key : "all";
}

function getStats_(items) {
  const all = Array.isArray(items) ? items : [];
  const unpaid = all.filter((item) => String(item.status || "") === "unpaid");
  const paid = all.filter((item) => String(item.status || "") === "paid");
  const waived = all.filter((item) => String(item.status || "") === "waived");
  return {
    allCount: all.length,
    unpaidCount: unpaid.length,
    paidCount: paid.length,
    waivedCount: waived.length,
    unpaidTotal: unpaid.reduce((sum, item) => sum + Number(item.amount || 0), 0),
  };
}

function getVisibleItems_(items, filter) {
  const key = normalizeStatus_(filter);
  if (key === "all") return Array.isArray(items) ? items : [];
  return (Array.isArray(items) ? items : []).filter((item) => String(item.status || "").toLowerCase() === key);
}

function renderStats_(stats) {
  return `
    <section class="grid grid-cols-2 gap-3">
      <article class="member-fines-shadow col-span-2 overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-rose-500 to-rose-600 p-5 text-white shadow-lg shadow-rose-500/20 relative">
        <p class="relative z-10 text-sm font-semibold text-rose-100">ยอดค้างชำระรวม</p>
        <div class="relative z-10 mt-1 flex items-baseline gap-1.5">
          <span class="text-xl font-bold">฿</span>
          <h3 id="sum-unpaid-amount" class="text-4xl font-black">${fmtMoney(stats.unpaidTotal)}</h3>
        </div>
      </article>

      <article class="member-fines-shadow flex h-[92px] flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-bold text-slate-500">ค้างชำระ</p>
        <div class="flex items-baseline gap-1">
          <h4 id="sum-unpaid-count" class="text-2xl font-black text-rose-500">${stats.unpaidCount}</h4>
          <span class="text-xs font-semibold text-slate-400">รายการ</span>
        </div>
      </article>

      <div class="flex flex-col gap-3">
        <article class="member-fines-shadow flex flex-1 items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
          <p class="text-xs font-bold text-slate-500">ชำระแล้ว</p>
          <h4 id="sum-paid-count" class="text-lg font-black text-emerald-500">${stats.paidCount}</h4>
        </article>
        <article class="member-fines-shadow flex flex-1 items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
          <p class="text-xs font-bold text-slate-500">ยกเว้น</p>
          <h4 id="sum-waived-count" class="text-lg font-black text-slate-700">${stats.waivedCount}</h4>
        </article>
      </div>
    </section>
  `;
}

function renderTabs_(stats, activeFilter) {
  const buttons = [
    {
      value: "all",
      label: "ทั้งหมด",
      cls: "bg-slate-800 text-white shadow-md shadow-slate-200",
      badge: stats.allCount,
      badgeCls: "bg-white/15 text-white",
    },
    {
      value: "unpaid",
      label: "ค้างชำระ",
      cls: "bg-white text-slate-600 border border-slate-200 shadow-sm",
      badge: stats.unpaidCount,
      badgeCls: "bg-rose-100 text-rose-600",
    },
    {
      value: "paid",
      label: "ชำระแล้ว",
      cls: "bg-white text-slate-600 border border-slate-200 shadow-sm",
      badge: stats.paidCount,
      badgeCls: "bg-emerald-100 text-emerald-600",
    },
    {
      value: "waived",
      label: "ยกเว้น",
      cls: "bg-white text-slate-600 border border-slate-200 shadow-sm",
      badge: stats.waivedCount,
      badgeCls: "bg-slate-100 text-slate-600",
    },
  ];

  return `
    <section class="member-fines-shell-card rounded-[1.5rem] p-3 sm:p-4">
      <div class="mb-3 flex items-center justify-between gap-3">
        <div>
          <p class="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">ตัวกรองสถานะ</p>
          <p class="mt-1 text-sm font-bold text-slate-800">เลือกดูรายการค่าปรับตามสถานะ</p>
        </div>
        <p class="hidden text-xs font-semibold text-slate-500 sm:block">แตะเพื่อสลับมุมมอง</p>
      </div>
      <div class="member-fines-scrollbar flex gap-2 overflow-x-auto pb-1">
        ${buttons
          .map((button) => {
            const active = activeFilter === button.value;
            const activeCls = active
              ? "bg-slate-800 text-white shadow-md shadow-slate-200"
              : button.cls;
            const badgeCls = active && button.value !== "all"
              ? "bg-white/15 text-white"
              : button.badgeCls;
            return `
              <button
                type="button"
                data-fines-filter="${escapeHtml(button.value)}"
                aria-pressed="${active ? "true" : "false"}"
                class="member-fines-pressable inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2 font-bold text-sm ${activeCls}"
              >
                <span>${escapeHtml(button.label)}</span>
                <span class="rounded-md px-1.5 text-[10px] font-black ${badgeCls}">${Number(button.badge || 0)}</span>
              </button>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderLoadingList_() {
  return `
    <div class="space-y-3">
      <div class="member-fines-skeleton h-[168px] rounded-[1.5rem]"></div>
      <div class="member-fines-skeleton h-[168px] rounded-[1.5rem]"></div>
      <div class="member-fines-skeleton h-[168px] rounded-[1.5rem]"></div>
    </div>
  `;
}

function renderEmptyState_(filter) {
  const label = statusLabel(filter);
  const message = filter === "all" ? "ไม่พบรายการค่าปรับในตอนนี้" : `ไม่พบรายการค่าปรับสถานะ ${label}`;
  return `
    <div class="rounded-[1.5rem] border border-dashed border-slate-200 bg-white p-6 text-center shadow-sm">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
        <i data-lucide="receipt-text" class="h-6 w-6"></i>
      </div>
      <h3 class="mt-4 text-sm font-black text-slate-800">ไม่พบรายการค่าปรับ</h3>
      <p class="mt-1 text-xs font-semibold text-slate-500">${escapeHtml(message)}</p>
    </div>
  `;
}

function renderFineCard(item) {
  const isUnpaid = String(item.status || "").toLowerCase() === "unpaid";
  const receivedBy = String(item.receivedBy || item.paidTo || "").trim();
  return `
    <article class="member-fines-shadow ${isUnpaid ? "member-fines-unpaid" : ""} overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white p-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <p class="text-sm font-black text-slate-800">${escapeHtml(item.fineId || "-")}</p>
          <p class="mt-1 text-xs font-semibold text-slate-500">Loan: ${escapeHtml(item.loanId || "-")}${item.uid ? ` · UID: ${escapeHtml(item.uid)}` : ""}</p>
        </div>
        <div class="flex flex-col items-end gap-2">
          <span class="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${statusClass(item.status)}">${escapeHtml(statusLabel(item.status))}</span>
          <p class="text-lg font-black text-slate-800">${fmtMoney(item.amount)} <span class="text-xs font-bold text-slate-500">บาท</span></p>
        </div>
      </div>

      <div class="mt-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
        <p class="text-sm font-bold text-slate-700 truncate">${escapeHtml(item.bookTitle || "-")}</p>
        <div class="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500">
          <span class="rounded-lg bg-white px-2 py-1 shadow-sm">สาเหตุ: ${escapeHtml(typeLabel(item.type))}</span>
          ${item.barcode ? `<span class="rounded-lg bg-white px-2 py-1 shadow-sm">${escapeHtml(item.barcode)}</span>` : ""}
        </div>
        <div class="mt-3 grid gap-2 text-[11px] font-bold text-slate-500 sm:grid-cols-2">
          <p>สร้างเมื่อ: <span class="text-slate-700">${escapeHtml(fmtDate(item.createdAt))}</span></p>
          <p>อัปเดตล่าสุด: <span class="text-slate-700">${escapeHtml(fmtDate(item.updatedAt))}</span></p>
          ${item.paidAt ? `<p>ชำระเมื่อ: <span class="text-slate-700">${escapeHtml(fmtDate(item.paidAt))}</span></p>` : ""}
          ${receivedBy ? `<p>ผู้รับเงิน: <span class="text-slate-700">${escapeHtml(receivedBy)}</span></p>` : ""}
        </div>
        ${item.notes ? `<p class="mt-3 text-xs leading-5 text-slate-600">${escapeHtml(item.notes)}</p>` : ""}
      </div>
    </article>
  `;
}

function renderList_(items, filter) {
  const visibleItems = getVisibleItems_(items, filter);
  if (STATE.loading) return renderLoadingList_();
  if (!visibleItems.length) return renderEmptyState_(filter);

  return `
    <div class="space-y-3">
      ${visibleItems.map(renderFineCard).join("")}
    </div>
  `;
}

async function load_(root) {
  STATE.loading = true;
  render_(root);

  try {
    const cached = getMemberResource(MEMBER_SYNC_KEYS.fines);
    if (cached) {
      applyFinesBundle_(cached);
      STATE.loading = false;
      render_(root);
      void revalidateMemberResource(MEMBER_SYNC_KEYS.fines, { force: true });
      return;
    }
    const res = await revalidateMemberResource(MEMBER_SYNC_KEYS.fines, { force: true });
    if (!res?.ok || !res.data) throw new Error(res?.error || "โหลดรายการค่าปรับไม่สำเร็จ");
    applyFinesBundle_(res.data);
  } catch (err) {
    STATE.items = [];
    showToast(err?.message || "โหลดรายการค่าปรับไม่สำเร็จ");
  } finally {
    STATE.loading = false;
    render_(root);
  }
}

function applyFinesBundle_(bundle) {
  STATE.items = Array.isArray(bundle?.items) ? bundle.items : [];
}

function cleanupFines_() {
  STATE.unsubscribe?.();
  STATE.unsubscribe = null;
  if (STATE.rootAliveTimerId) {
    clearInterval(STATE.rootAliveTimerId);
    STATE.rootAliveTimerId = 0;
  }
}

function render_(root) {
  const summary = root.querySelector("#memberFinesSummary");
  const tabs = root.querySelector("#memberFinesTabs");
  const list = root.querySelector("#memberFinesList");
  const reloadBtn = root.querySelector("#memberFinesReloadBtn");
  if (!summary || !tabs || !list || !reloadBtn) return;

  const stats = getStats_(STATE.items);
  const heroUnpaidAmount = root.querySelector("#memberFinesHeroUnpaidAmount");
  summary.innerHTML = renderStats_(stats);
  tabs.innerHTML = renderTabs_(stats, STATE.filter);
  list.innerHTML = renderList_(STATE.items, STATE.filter);
  if (heroUnpaidAmount) heroUnpaidAmount.textContent = fmtMoney(stats.unpaidTotal);
  reloadBtn.disabled = STATE.loading;
  reloadBtn.setAttribute("aria-busy", STATE.loading ? "true" : "false");
  reloadBtn.classList.toggle("opacity-60", STATE.loading);
  reloadBtn.classList.toggle("pointer-events-none", STATE.loading);
}

export function renderMemberFinesView() {
  return `
    <section id="memberFinesRoot" class="member-fines-shell view mx-auto w-full max-w-[1440px] space-y-4 px-3 pb-4 sm:px-4 lg:px-6">
      <article class="member-fines-shell-card overflow-hidden rounded-[1.75rem]">
        <div class="p-4 sm:p-5">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0">
              <p class="text-[11px] font-black uppercase tracking-[0.18em] text-rose-500">Fine Overview</p>
              <h1 class="mt-1 text-[clamp(1.35rem,2vw,1.9rem)] font-black leading-tight text-slate-900">ค่าปรับของฉัน</h1>
              <p class="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600 sm:text-[15px]">ดูค่าปรับค้าง ชำระแล้ว และรายการที่ยกเว้นในมุมมองเดียว</p>
            </div>
            <div class="flex min-w-0 flex-col gap-2 sm:flex-row lg:min-w-[18rem] lg:flex-col">
              <div class="rounded-[1.1rem] border border-rose-100 bg-rose-50/90 p-3 shadow-sm">
                <p class="text-[10px] font-black uppercase tracking-[0.16em] text-rose-500">ยอดค้างชำระรวม</p>
                <p id="memberFinesHeroUnpaidAmount" class="mt-1 text-lg font-black text-rose-700">0</p>
              </div>
              <button id="memberFinesReloadBtn" type="button" class="member-fines-pressable inline-flex items-center justify-center gap-2 rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 shadow-sm hover:bg-slate-50">
                <i data-lucide="rotate-cw" class="h-4 w-4"></i>
                รีเฟรชรายการ
              </button>
            </div>
          </div>

          <article class="mt-4 flex items-start gap-3 rounded-[1.2rem] border border-amber-100 bg-amber-50/90 p-3 shadow-sm">
            <div class="mt-0.5 rounded-full bg-amber-100 p-2 text-amber-600">
              <i data-lucide="clock" class="h-4 w-4"></i>
            </div>
            <div class="min-w-0">
              <p class="text-[11px] font-black uppercase tracking-[0.16em] text-amber-700">เวลาทำการชำระเงิน</p>
              <p class="mt-1 text-sm font-semibold leading-6 text-amber-800">09:00 - 16:00 น. (เว้นวันหยุดราชการ)</p>
            </div>
          </article>
        </div>
      </article>

      <section id="memberFinesSummary"></section>
      <div id="memberFinesTabs"></div>

      <section id="memberFinesList" class="space-y-3 pb-24"></section>
    </section>
  `;
}

export function mountMemberFinesView(container) {
  ensureNativeStyles_();
  const root = container.querySelector("#memberFinesRoot");
  if (!root) return;
  cleanupFines_();

  const reloadBtn = root.querySelector("#memberFinesReloadBtn");
  const tabs = root.querySelector("#memberFinesTabs");

  reloadBtn?.addEventListener("click", () => load_(root));
  tabs?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-fines-filter]");
    if (!button) return;
    const nextFilter = normalizeStatus_(button.getAttribute("data-fines-filter"));
    if (STATE.filter === nextFilter) return;
    STATE.filter = nextFilter;
    render_(root);
  });

  STATE.unsubscribe = subscribeMemberResource(MEMBER_SYNC_KEYS.fines, (nextBundle) => {
    if (!nextBundle) return;
    applyFinesBundle_(nextBundle);
    STATE.loading = false;
    render_(root);
  });
  STATE.rootAliveTimerId = window.setInterval(() => {
    if (root.isConnected) return;
    cleanupFines_();
  }, 1000);

  load_(root);
}
