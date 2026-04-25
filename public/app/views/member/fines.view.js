import { apiFinesList } from "../../data/api.js";
import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";

const STATE = {
  loading: false,
  items: [],
  filter: "all",
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

function typeLabel(type) {
  const key = String(type || "").toLowerCase();
  return {
    overdue: "คืนเกินกำหนด",
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

function renderFineCard(item) {
  return `
    <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p class="text-sm font-black text-slate-800">${escapeHtml(item.fineId || "-")}</p>
          <p class="mt-1 text-xs font-semibold text-slate-500">Loan: ${escapeHtml(item.loanId || "-")}</p>
        </div>
        <span class="rounded-full px-2 py-1 text-[11px] font-black ${statusClass(item.status)}">${escapeHtml(item.status || "-")}</span>
      </div>

      <div class="mt-3 grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-2">
        <p>ประเภท: <span class="font-black text-slate-800">${escapeHtml(typeLabel(item.type))}</span></p>
        <p>จำนวนเงิน: <span class="font-black text-slate-800">${Number(item.amount || 0).toLocaleString("th-TH")} บาท</span></p>
        <p>สร้างเมื่อ: <span class="font-black text-slate-800">${escapeHtml(fmtDate(item.createdAt))}</span></p>
        <p>อัปเดตล่าสุด: <span class="font-black text-slate-800">${escapeHtml(fmtDate(item.updatedAt))}</span></p>
        ${item.paidAt ? `<p>ชำระเมื่อ: <span class="font-black text-slate-800">${escapeHtml(fmtDate(item.paidAt))}</span></p>` : ""}
        ${item.receivedBy ? `<p>ดำเนินการโดย: <span class="font-black text-slate-800">${escapeHtml(item.receivedBy)}</span></p>` : ""}
      </div>

      ${item.bookTitle ? `<p class="mt-2 text-xs text-slate-500">${escapeHtml(item.bookTitle)}${item.barcode ? ` · ${escapeHtml(item.barcode)}` : ""}</p>` : ""}
      ${item.notes ? `<p class="mt-2 text-xs text-slate-600">${escapeHtml(item.notes)}</p>` : ""}
    </article>
  `;
}

function renderSummary(items) {
  const unpaid = items.filter((item) => String(item.status || "") === "unpaid");
  const paid = items.filter((item) => String(item.status || "") === "paid");
  const waived = items.filter((item) => String(item.status || "") === "waived");
  const unpaidTotal = unpaid.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return `
    <div class="grid gap-3 md:grid-cols-4">
      <article class="rounded-2xl border border-rose-100 bg-rose-50 p-4">
        <p class="text-xs font-black uppercase tracking-wide text-rose-700">ค้างชำระ</p>
        <p class="mt-2 text-2xl font-black text-rose-800">${Number(unpaid.length)}</p>
      </article>
      <article class="rounded-2xl border border-amber-100 bg-amber-50 p-4">
        <p class="text-xs font-black uppercase tracking-wide text-amber-700">ยอดค้าง</p>
        <p class="mt-2 text-2xl font-black text-amber-800">${unpaidTotal.toLocaleString("th-TH")} บาท</p>
      </article>
      <article class="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
        <p class="text-xs font-black uppercase tracking-wide text-emerald-700">ชำระแล้ว</p>
        <p class="mt-2 text-2xl font-black text-emerald-800">${Number(paid.length)}</p>
      </article>
      <article class="rounded-2xl border border-slate-200 bg-white p-4">
        <p class="text-xs font-black uppercase tracking-wide text-slate-500">ยกเว้น</p>
        <p class="mt-2 text-2xl font-black text-slate-800">${Number(waived.length)}</p>
      </article>
    </div>
  `;
}

async function load_(root) {
  STATE.loading = true;
  render_(root);

  try {
    const res = await apiFinesList({
      status: STATE.filter,
      page: 1,
      limit: 100,
    });
    if (!res?.ok) throw new Error(res?.error || "โหลดรายการค่าปรับไม่สำเร็จ");
    STATE.items = Array.isArray(res.data?.items) ? res.data.items : [];
  } catch (err) {
    STATE.items = [];
    showToast(err?.message || "โหลดรายการค่าปรับไม่สำเร็จ");
  } finally {
    STATE.loading = false;
    render_(root);
  }
}

function render_(root) {
  const list = root.querySelector("#memberFinesList");
  const summary = root.querySelector("#memberFinesSummary");
  const total = root.querySelector("#memberFinesCount");
  const filter = root.querySelector("#memberFinesFilter");
  if (!list || !summary || !total || !filter) return;

  total.textContent = String(STATE.items.length);
  summary.innerHTML = renderSummary(STATE.items);
  filter.value = STATE.filter;

  if (STATE.loading) {
    list.innerHTML = '<div class="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">กำลังโหลดรายการค่าปรับ...</div>';
    return;
  }

  if (!STATE.items.length) {
    list.innerHTML = '<div class="rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">ไม่พบรายการค่าปรับ</div>';
    return;
  }

  list.innerHTML = `
    <div class="space-y-3">
      ${STATE.items.map(renderFineCard).join("")}
    </div>
  `;
}

export function renderMemberFinesView() {
  return `
    <section id="memberFinesRoot" class="view space-y-4">
      <article class="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-black text-slate-800">ค่าปรับของฉัน</h2>
            <p class="text-xs font-semibold text-slate-500">ดูรายการค่าปรับค้าง ชำระแล้ว และรายการที่ยกเว้น</p>
          </div>
          <a data-link href="/profile" class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">ดูในโปรไฟล์</a>
        </div>
      </article>

      <section id="memberFinesSummary"></section>

      <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p class="text-sm font-black text-slate-800">รายการค่าปรับ</p>
            <p class="text-xs font-semibold text-slate-500">ทั้งหมด <span id="memberFinesCount">0</span> รายการ</p>
          </div>
          <div class="flex items-center gap-2">
            <select id="memberFinesFilter" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
              <option value="all">all</option>
              <option value="unpaid">unpaid</option>
              <option value="paid">paid</option>
              <option value="waived">waived</option>
            </select>
            <button id="memberFinesReloadBtn" type="button" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-100">รีโหลด</button>
          </div>
        </div>
        <div id="memberFinesList" class="mt-4"></div>
      </article>
    </section>
  `;
}

export function mountMemberFinesView(container) {
  const root = container.querySelector("#memberFinesRoot");
  if (!root) return;

  const reloadBtn = root.querySelector("#memberFinesReloadBtn");
  const filter = root.querySelector("#memberFinesFilter");

  reloadBtn?.addEventListener("click", () => load_(root));
  filter?.addEventListener("change", (event) => {
    STATE.filter = String(event.target.value || "all");
    load_(root);
  });

  load_(root);
}
