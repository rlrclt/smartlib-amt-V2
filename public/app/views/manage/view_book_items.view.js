import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";
import {
  apiBooksCatalogGet,
  apiBookItemsList,
  apiBookItemUpdateStatus,
} from "../../data/api.js";

const STATE = {
  bookId: "",
  status: "all",
  page: 1,
  limit: 50,
  hasMore: false,
  loading: false,
  items: [],
  bookTitle: "",
  initialized: false,
  selectedBarcodes: [],
};

function toDateTimeLabel(value) {
  const d = new Date(String(value || ""));
  if (!Number.isFinite(d.getTime())) return "-";
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderStatusBadge(status) {
  const key = String(status || "").toLowerCase();
  if (key === "available") return '<span class="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700">available</span>';
  if (key === "borrowed") return '<span class="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-700">borrowed</span>';
  if (key === "lost") return '<span class="rounded-full bg-rose-50 px-2 py-1 text-[11px] font-black text-rose-700">lost</span>';
  if (key === "reserved") return '<span class="rounded-full bg-indigo-50 px-2 py-1 text-[11px] font-black text-indigo-700">reserved</span>';
  if (key === "damaged") return '<span class="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-700">damaged</span>';
  return '<span class="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500">unknown</span>';
}

function renderRow(item) {
  const statusKey = String(item.status || "").toLowerCase();
  const checked = STATE.selectedBarcodes.indexOf(String(item.barcode || "")) >= 0;
  return `
    <tr class="border-b border-slate-100">
      <td class="px-3 py-3 text-xs">
        <input type="checkbox" data-action="toggle-select" data-barcode="${escapeHtml(item.barcode || "")}" ${checked ? "checked" : ""} class="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-200">
      </td>
      <td class="px-3 py-3 text-xs font-bold text-slate-700">${escapeHtml(item.barcode || "-")}</td>
      <td class="px-3 py-3 text-xs">${renderStatusBadge(item.status)}</td>
      <td class="px-3 py-3">
        <select data-field="status" data-barcode="${escapeHtml(item.barcode || "")}" class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700">
          <option value="available" ${statusKey === "available" ? "selected" : ""}>available</option>
          <option value="borrowed" ${statusKey === "borrowed" ? "selected" : ""}>borrowed</option>
          <option value="lost" ${statusKey === "lost" ? "selected" : ""}>lost</option>
          <option value="damaged" ${statusKey === "damaged" ? "selected" : ""}>damaged</option>
          <option value="reserved" ${statusKey === "reserved" ? "selected" : ""}>reserved</option>
        </select>
      </td>
      <td class="px-3 py-3">
        <select data-field="condition" data-barcode="${escapeHtml(item.barcode || "")}" class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700">
          <option value="good" ${String(item.condition) === "good" ? "selected" : ""}>good</option>
          <option value="fair" ${String(item.condition) === "fair" ? "selected" : ""}>fair</option>
          <option value="poor" ${String(item.condition) === "poor" ? "selected" : ""}>poor</option>
        </select>
      </td>
      <td class="px-3 py-3">
        <input data-field="location" data-barcode="${escapeHtml(item.barcode || "")}" value="${escapeHtml(item.location || "")}" class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700">
      </td>
      <td class="px-3 py-3">
        <input data-field="notes" data-barcode="${escapeHtml(item.barcode || "")}" value="${escapeHtml(item.notes || "")}" class="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-700">
      </td>
      <td class="px-3 py-3 text-[11px] font-semibold text-slate-500">${toDateTimeLabel(item.updatedAt)}</td>
      <td class="px-3 py-3">
        <button data-action="save-item" data-barcode="${escapeHtml(item.barcode || "")}" class="rounded-lg bg-sky-600 px-2.5 py-1.5 text-[11px] font-black text-white hover:bg-sky-700">บันทึก</button>
      </td>
    </tr>
  `;
}

function renderCard(item) {
  const statusKey = String(item.status || "").toLowerCase();
  const checked = STATE.selectedBarcodes.indexOf(String(item.barcode || "")) >= 0;
  return `
    <article class="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
      <div class="mb-2 flex items-center justify-between gap-2">
        <h3 class="text-sm font-black text-slate-800">${escapeHtml(item.barcode || "-")}</h3>
        <div class="flex items-center gap-2">
          ${renderStatusBadge(item.status)}
          <input type="checkbox" data-action="toggle-select" data-barcode="${escapeHtml(item.barcode || "")}" ${checked ? "checked" : ""} class="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-200">
        </div>
      </div>

      <div class="grid gap-2">
        <label class="grid gap-1 text-xs font-semibold text-slate-600">
          status
          <select data-field="status" data-barcode="${escapeHtml(item.barcode || "")}" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
            <option value="available" ${statusKey === "available" ? "selected" : ""}>available</option>
            <option value="borrowed" ${statusKey === "borrowed" ? "selected" : ""}>borrowed</option>
            <option value="lost" ${statusKey === "lost" ? "selected" : ""}>lost</option>
            <option value="damaged" ${statusKey === "damaged" ? "selected" : ""}>damaged</option>
            <option value="reserved" ${statusKey === "reserved" ? "selected" : ""}>reserved</option>
          </select>
        </label>

        <label class="grid gap-1 text-xs font-semibold text-slate-600">
          condition
          <select data-field="condition" data-barcode="${escapeHtml(item.barcode || "")}" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
            <option value="good" ${String(item.condition) === "good" ? "selected" : ""}>good</option>
            <option value="fair" ${String(item.condition) === "fair" ? "selected" : ""}>fair</option>
            <option value="poor" ${String(item.condition) === "poor" ? "selected" : ""}>poor</option>
          </select>
        </label>

        <label class="grid gap-1 text-xs font-semibold text-slate-600">
          location
          <input data-field="location" data-barcode="${escapeHtml(item.barcode || "")}" value="${escapeHtml(item.location || "")}" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
        </label>

        <label class="grid gap-1 text-xs font-semibold text-slate-600">
          notes
          <input data-field="notes" data-barcode="${escapeHtml(item.barcode || "")}" value="${escapeHtml(item.notes || "")}" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
        </label>
      </div>

      <div class="mt-3 flex items-center justify-between gap-2">
        <span class="text-[11px] font-semibold text-slate-500">อัปเดต ${toDateTimeLabel(item.updatedAt)}</span>
        <button data-action="save-item" data-barcode="${escapeHtml(item.barcode || "")}" class="rounded-lg bg-sky-600 px-3 py-2 text-xs font-black text-white hover:bg-sky-700">บันทึก</button>
      </div>
    </article>
  `;
}

function renderList(items) {
  if (!items.length) {
    return '<div class="rounded-2xl border border-dashed border-sky-200 bg-sky-50/40 p-8 text-center text-sm font-semibold text-slate-500">ยังไม่พบข้อมูลรหัสเล่ม</div>';
  }

  return `
    <div class="hidden overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm lg:block">
      <div class="overflow-x-auto">
        <table class="min-w-full text-left">
          <thead class="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
            <tr>
              <th class="px-3 py-2">เลือก</th>
              <th class="px-3 py-2">Barcode</th>
              <th class="px-3 py-2">สถานะ</th>
              <th class="px-3 py-2">แก้ status</th>
              <th class="px-3 py-2">condition</th>
              <th class="px-3 py-2">location</th>
              <th class="px-3 py-2">notes</th>
              <th class="px-3 py-2">updatedAt</th>
              <th class="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>${items.map(renderRow).join("")}</tbody>
        </table>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-3 lg:hidden">
      ${items.map(renderCard).join("")}
    </div>
  `;
}

function collectItemPayload(root, barcode) {
  const escapedBarcode = typeof CSS !== "undefined" && typeof CSS.escape === "function"
    ? CSS.escape(barcode)
    : String(barcode).replace(/"/g, '\\"');
  const find = (field) => root.querySelector(`[data-field="${field}"][data-barcode="${escapedBarcode}"]`);
  return {
    barcode,
    status: String(find("status")?.value || "").trim(),
    condition: String(find("condition")?.value || "").trim(),
    location: String(find("location")?.value || "").trim(),
    notes: String(find("notes")?.value || "").trim(),
  };
}

async function fetchBookInfo(root) {
  const metaEl = root.querySelector("#bookItemsMeta");
  if (!metaEl || !STATE.bookId) return;

  try {
    const response = await apiBooksCatalogGet({ bookId: STATE.bookId });
    if (!response?.ok || !response?.data?.book) {
      STATE.bookTitle = "";
      metaEl.textContent = `Book ID: ${STATE.bookId}`;
      return;
    }

    STATE.bookTitle = String(response.data.book.title || "");
    metaEl.textContent = `${STATE.bookId} • ${STATE.bookTitle || "ไม่ระบุชื่อเรื่อง"}`;
  } catch {
    metaEl.textContent = `Book ID: ${STATE.bookId}`;
  }
}

async function fetchItems(root, { append = false } = {}) {
  if (STATE.loading || !STATE.bookId) return;
  STATE.loading = true;

  const listEl = root.querySelector("#bookItemsList");
  const statusEl = root.querySelector("#bookItemsStatus");
  const loadMoreBtn = root.querySelector("#bookItemsLoadMore");

  if (!append && listEl && STATE.items.length === 0) {
    listEl.innerHTML = '<div class="rounded-2xl border border-sky-100 bg-white p-4 text-sm font-semibold text-slate-500">กำลังโหลดรายการ...</div>';
  }
  if (loadMoreBtn) loadMoreBtn.disabled = true;

  try {
    const response = await apiBookItemsList({
      bookId: STATE.bookId,
      status: STATE.status,
      page: STATE.page,
      limit: STATE.limit,
    });

    if (!response?.ok) throw new Error(response?.error || "โหลดรายการรหัสเล่มไม่สำเร็จ");

    const payload = response.data || {};
    const incoming = Array.isArray(payload.items) ? payload.items : [];

    STATE.items = append ? STATE.items.concat(incoming) : incoming;
    STATE.hasMore = Boolean(payload.hasMore);

    if (listEl) listEl.innerHTML = renderList(STATE.items);
    if (statusEl) statusEl.textContent = `แสดง ${STATE.items.length.toLocaleString("th-TH")} รายการ`;
    if (loadMoreBtn) {
      loadMoreBtn.hidden = !STATE.hasMore;
      loadMoreBtn.disabled = false;
    }
  } catch (error) {
    const message = String(error?.message || error);
    if (listEl) {
      listEl.innerHTML = `<div class="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">${escapeHtml(message)}</div>`;
    }
    showToast(message);
  } finally {
    STATE.loading = false;
  }
}

async function saveItem(root, barcode) {
  if (!barcode) return;
  const payload = collectItemPayload(root, barcode);

  try {
    const response = await apiBookItemUpdateStatus(payload);
    if (!response?.ok) throw new Error(response?.error || "บันทึกรหัสเล่มไม่สำเร็จ");
    showToast(`บันทึกแล้ว: ${barcode}`);
  } catch (error) {
    showToast(String(error?.message || error));
  }
}

export function renderViewBookItemsView() {
  return `
    <section class="p-4 lg:p-6">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-black tracking-tight text-slate-800">คลังรหัสเล่มหนังสือ</h2>
          <p id="bookItemsMeta" class="text-sm font-medium text-slate-500">เลือก Book ID แล้วกดค้นหา</p>
        </div>
        <a data-link href="/manage/books" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">กลับหน้ารายการหนังสือ</a>
      </div>

      <div class="mb-4 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
        <div class="grid gap-3 md:grid-cols-[1fr_180px_auto]">
          <label class="grid gap-1 text-sm font-semibold text-slate-700">
            Book ID
            <input id="bookItemsBookId" placeholder="เช่น BK-001" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
          </label>

          <label class="grid gap-1 text-sm font-semibold text-slate-700">
            สถานะ
            <select id="bookItemsFilterStatus" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
              <option value="all">all</option>
              <option value="available">available</option>
              <option value="borrowed">borrowed</option>
              <option value="lost">lost</option>
              <option value="damaged">damaged</option>
              <option value="reserved">reserved</option>
            </select>
          </label>

          <button id="bookItemsSearchBtn" class="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800">ค้นหา</button>
        </div>

        <div class="mt-3 flex items-center justify-between gap-2">
          <span id="bookItemsStatus" class="text-xs font-black uppercase tracking-wider text-slate-400">-</span>
          <div class="flex flex-wrap items-center gap-2">
            <span id="bookItemsSelectedCount" class="rounded-lg border border-sky-100 bg-sky-50 px-2 py-1 text-[11px] font-black text-sky-700">เลือก 0 รายการ</span>
            <button id="bookItemsSelectAllBtn" type="button" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">เลือกทั้งหมดในหน้า</button>
            <button id="bookItemsClearSelectBtn" type="button" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">ล้างเลือก</button>
            <button id="bookItemsPrintBtn" type="button" class="rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-800">พิมพ์บาร์โค้ด</button>
            <a data-link href="/manage/add_book_items" class="rounded-lg bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 hover:bg-sky-100">+ เพิ่มจำนวนเล่ม</a>
          </div>
        </div>
      </div>

      <div id="bookItemsList"></div>

      <div class="mt-4 flex justify-center">
        <button id="bookItemsLoadMore" hidden class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">โหลดเพิ่ม</button>
      </div>
    </section>
  `;
}

export function mountViewBookItemsView(root) {
  if (!root) return;

  const inputBookId = root.querySelector("#bookItemsBookId");
  const statusFilter = root.querySelector("#bookItemsFilterStatus");
  const searchBtn = root.querySelector("#bookItemsSearchBtn");
  const loadMoreBtn = root.querySelector("#bookItemsLoadMore");
  const selectedCountEl = root.querySelector("#bookItemsSelectedCount");
  const selectAllBtn = root.querySelector("#bookItemsSelectAllBtn");
  const clearSelectBtn = root.querySelector("#bookItemsClearSelectBtn");
  const printBtn = root.querySelector("#bookItemsPrintBtn");

  const query = new URLSearchParams(window.location.search);
  const initialBookId = String(query.get("bookId") || "").trim();

  if (initialBookId && inputBookId) inputBookId.value = initialBookId;
  else if (STATE.bookId && inputBookId) inputBookId.value = STATE.bookId;
  if (statusFilter) statusFilter.value = STATE.status;

  const listEl = root.querySelector("#bookItemsList");
  const statusEl = root.querySelector("#bookItemsStatus");
  const updateSelectedCount = () => {
    if (!selectedCountEl) return;
    selectedCountEl.textContent = `เลือก ${STATE.selectedBarcodes.length.toLocaleString("th-TH")} รายการ`;
  };
  updateSelectedCount();
  if (STATE.initialized && listEl) {
    listEl.innerHTML = renderList(STATE.items);
    if (statusEl) statusEl.textContent = `แสดง ${STATE.items.length.toLocaleString("th-TH")} รายการ`;
    fetchBookInfo(root);
  }

  const runSearch = async () => {
    const bookId = String(inputBookId?.value || "").trim();
    if (!bookId) {
      showToast("กรุณาระบุ Book ID");
      return;
    }

    STATE.bookId = bookId;
    STATE.status = String(statusFilter?.value || "all");
    STATE.page = 1;
    STATE.items = [];
    STATE.selectedBarcodes = [];
    updateSelectedCount();

    await fetchBookInfo(root);
    await fetchItems(root, { append: false });
  };

  searchBtn?.addEventListener("click", runSearch);
  inputBookId?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    runSearch();
  });

  statusFilter?.addEventListener("change", () => {
    if (!STATE.bookId) return;
    STATE.status = String(statusFilter.value || "all");
    STATE.page = 1;
    fetchItems(root, { append: false });
  });

  loadMoreBtn?.addEventListener("click", () => {
    if (!STATE.hasMore || STATE.loading) return;
    STATE.page += 1;
    fetchItems(root, { append: true });
  });

  root.addEventListener("click", (event) => {
    const selectBox = event.target.closest('[data-action="toggle-select"]');
    if (selectBox) {
      const barcode = String(selectBox.getAttribute("data-barcode") || "");
      const checked = Boolean(selectBox.checked);
      if (barcode) {
        const nextSet = new Set(STATE.selectedBarcodes);
        if (checked) nextSet.add(barcode);
        else nextSet.delete(barcode);
        STATE.selectedBarcodes = Array.from(nextSet);
        updateSelectedCount();
      }
      return;
    }

    const btn = event.target.closest('[data-action="save-item"]');
    if (!btn) return;
    const barcode = String(btn.getAttribute("data-barcode") || "");
    saveItem(root, barcode);
  });

  selectAllBtn?.addEventListener("click", () => {
    const nextSet = new Set(STATE.selectedBarcodes);
    STATE.items.forEach((item) => nextSet.add(String(item.barcode || "")));
    STATE.selectedBarcodes = Array.from(nextSet);
    if (listEl) listEl.innerHTML = renderList(STATE.items);
    updateSelectedCount();
  });

  clearSelectBtn?.addEventListener("click", () => {
    STATE.selectedBarcodes = [];
    if (listEl) listEl.innerHTML = renderList(STATE.items);
    updateSelectedCount();
  });

  printBtn?.addEventListener("click", () => {
    if (!STATE.bookId) {
      showToast("กรุณาค้นหา Book ID ก่อน");
      return;
    }
    if (!STATE.selectedBarcodes.length) {
      showToast("กรุณาเลือกรหัสบาร์โค้ดอย่างน้อย 1 รายการ");
      return;
    }
    if (STATE.selectedBarcodes.length > 100) {
      showToast("พิมพ์ได้สูงสุดครั้งละ 100 รายการ");
      return;
    }
    const barcodes = encodeURIComponent(STATE.selectedBarcodes.join(","));
    window.history.pushState({}, "", `/manage/print-barcodes?bookId=${encodeURIComponent(STATE.bookId)}&barcodes=${barcodes}`);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

  if (initialBookId) {
    runSearch();
  }
  STATE.initialized = true;
}
