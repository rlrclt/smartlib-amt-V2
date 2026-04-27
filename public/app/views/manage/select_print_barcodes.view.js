import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";
import { apiBooksCatalogList, apiBookItemsList } from "../../data/api.js";
import {
  readPrintCart,
  addBarcodesToPrintCart,
  removeBarcodeFromPrintCart,
  clearPrintCart,
  subscribePrintCart,
} from "../../utils/print_cart.js";

const STATE = {
  loadingCatalog: false,
  loadingItems: false,
  catalog: [],
  selectedBookId: "",
  selectedBookTitle: "",
  items: [],
  selectedItemBarcodes: [],
  cart: readPrintCart(),
  unsubscribe: null,
};

function syncSelectedFromCartState() {
  const cartSet = new Set(STATE.cart?.barcodes || []);
  STATE.selectedItemBarcodes = STATE.items
    .map((row) => String(row.barcode || ""))
    .filter((barcode) => cartSet.has(barcode));
}

function renderCatalogList() {
  if (STATE.loadingCatalog) {
    return '<div class="rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">กำลังโหลดรายการหนังสือ...</div>';
  }
  if (!STATE.catalog.length) {
    return '<div class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">ยังไม่มีหนังสือในระบบ</div>';
  }

  return `
    <div class="space-y-2">
      ${STATE.catalog.map((book) => {
        const active = String(book.bookId || "") === STATE.selectedBookId;
        return `
          <button data-action="select-book" data-book-id="${escapeHtml(book.bookId || "")}" data-book-title="${escapeHtml(book.title || "")}" class="w-full rounded-xl border px-3 py-2 text-left transition-colors ${active ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white hover:bg-slate-50"}">
            <p class="text-xs font-black text-slate-800">${escapeHtml(book.title || "-")}</p>
            <p class="mt-1 text-[11px] font-semibold text-slate-500">${escapeHtml(book.bookId || "-")} · ${escapeHtml(book.callNumber || "-")}</p>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderItemsList() {
  if (!STATE.selectedBookId) {
    return '<div class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">เลือกหนังสือจากฝั่งซ้ายก่อน</div>';
  }
  if (STATE.loadingItems) {
    return '<div class="rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">กำลังโหลดรายการเล่มย่อย...</div>';
  }
  if (!STATE.items.length) {
    return '<div class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">ไม่พบรายการเล่มย่อยของหนังสือนี้</div>';
  }

  return `
    <div class="space-y-2">
      ${STATE.items.map((row) => {
        const barcode = String(row.barcode || "");
        const status = String(row.status || "-").toLowerCase();
        const checked = STATE.selectedItemBarcodes.indexOf(barcode) >= 0;
        return `
          <label class="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <div class="min-w-0">
              <p class="text-xs font-black text-slate-800">${escapeHtml(barcode)}</p>
              <p class="mt-1 text-[11px] font-semibold text-slate-600">สถานะ: ${escapeHtml(status)}</p>
            </div>
            <input type="checkbox" data-action="toggle-item" data-barcode="${escapeHtml(barcode)}" ${checked ? "checked" : ""} class="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-200" />
          </label>
        `;
      }).join("")}
    </div>
  `;
}

function renderCartList() {
  const barcodes = STATE.cart?.barcodes || [];
  if (!barcodes.length) {
    return '<div class="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">ตะกร้ายังว่าง</div>';
  }

  return `
    <div class="space-y-2">
      ${barcodes.map((barcode) => `
        <div class="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p class="text-xs font-black text-slate-800">${escapeHtml(barcode)}</p>
          <button data-action="remove-cart" data-barcode="${escapeHtml(barcode)}" class="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-700 hover:bg-rose-100">ลบ</button>
        </div>
      `).join("")}
    </div>
  `;
}

function renderAll(root) {
  const catalogEl = root.querySelector("#printSelectCatalog");
  const itemsEl = root.querySelector("#printSelectItems");
  const cartEl = root.querySelector("#printSelectCart");
  const cartCount = root.querySelector("#printSelectCartCount");
  const selectedCount = root.querySelector("#printSelectSelectedCount");
  const goPrintBtn = root.querySelector("#printSelectGoPrintBtn");

  syncSelectedFromCartState();
  const cartSize = (STATE.cart?.barcodes || []).length;
  if (catalogEl) catalogEl.innerHTML = renderCatalogList();
  if (itemsEl) itemsEl.innerHTML = renderItemsList();
  if (cartEl) cartEl.innerHTML = renderCartList();
  if (cartCount) cartCount.textContent = String(cartSize);
  if (selectedCount) selectedCount.textContent = String(STATE.selectedItemBarcodes.length);
  if (goPrintBtn) {
    if (cartSize > 0) {
      goPrintBtn.className = "rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800";
      goPrintBtn.removeAttribute("aria-disabled");
    } else {
      goPrintBtn.className = "cursor-not-allowed rounded-xl bg-slate-200 px-4 py-2 text-sm font-black text-slate-500";
      goPrintBtn.setAttribute("aria-disabled", "true");
    }
  }
}

async function loadCatalog(root) {
  STATE.loadingCatalog = true;
  renderAll(root);
  try {
    const res = await apiBooksCatalogList({ status: "active", page: 1, limit: 200 });
    if (!res?.ok) throw new Error(res?.error || "โหลดรายการหนังสือไม่สำเร็จ");
    STATE.catalog = Array.isArray(res?.data?.items) ? res.data.items : [];
  } catch (error) {
    STATE.catalog = [];
    showToast(String(error?.message || error));
  } finally {
    STATE.loadingCatalog = false;
    renderAll(root);
  }
}

async function loadItemsForBook(root, bookId) {
  STATE.loadingItems = true;
  STATE.items = [];
  STATE.selectedItemBarcodes = [];
  renderAll(root);

  try {
    let page = 1;
    const rows = [];
    while (page <= 60) {
      const res = await apiBookItemsList({ bookId, status: "all", page, limit: 100 });
      if (!res?.ok) throw new Error(res?.error || "โหลดรายการเล่มย่อยไม่สำเร็จ");
      const list = Array.isArray(res?.data?.items) ? res.data.items : [];
      rows.push(...list);
      if (!res?.data?.hasMore) break;
      page += 1;
    }
    STATE.items = rows;
  } catch (error) {
    STATE.items = [];
    showToast(String(error?.message || error));
  } finally {
    STATE.loadingItems = false;
    renderAll(root);
  }
}

export function renderManageSelectPrintBarcodesView() {
  return `
    <section class="p-4 lg:p-6">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-black tracking-tight text-slate-800">เลือกเล่มพิมพ์บาร์โค้ด</h2>
          <p class="text-sm font-medium text-slate-500">โหมดตะกร้า: เลือกข้ามเล่ม/ข้ามเรื่องแล้วพิมพ์รวมได้</p>
        </div>
        <a id="printSelectGoPrintBtn" data-link href="/manage/print-barcodes" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white hover:bg-slate-800">ไปหน้าพิมพ์</a>
      </div>

      <div class="grid gap-4 xl:grid-cols-[25%_40%_35%]">
        <article class="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <h3 class="mb-3 text-sm font-black uppercase tracking-widest text-slate-500">Catalog</h3>
          <div id="printSelectCatalog"></div>
        </article>

        <article class="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <div class="mb-3 flex items-center justify-between gap-2">
            <h3 class="text-sm font-black uppercase tracking-widest text-slate-500">Inventory</h3>
            <div class="flex items-center gap-2">
              <button id="printSelectAllAvailableBtn" type="button" class="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-700 hover:bg-slate-50">เลือกทั้งหมด</button>
              <button id="printSelectUnselectAllBtn" type="button" class="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-700 hover:bg-slate-50">ยกเลิกทั้งหมด</button>
              <span class="rounded-lg border border-sky-100 bg-sky-50 px-2 py-1 text-[11px] font-black text-sky-700">เลือก <span id="printSelectSelectedCount">0</span></span>
            </div>
          </div>
          <div id="printSelectItems"></div>
        </article>

        <article class="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
          <div class="mb-3 flex items-center justify-between gap-2">
            <h3 class="text-sm font-black uppercase tracking-widest text-slate-500">Cart</h3>
            <div class="flex items-center gap-2">
              <span class="rounded-lg border border-emerald-100 bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700"><span id="printSelectCartCount">0</span> รายการ</span>
              <button id="printSelectClearCartBtn" type="button" class="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-700 hover:bg-slate-50">ล้างตะกร้า</button>
            </div>
          </div>
          <div id="printSelectCart"></div>
        </article>
      </div>
    </section>
  `;
}

export function mountManageSelectPrintBarcodesView(root) {
  if (!root) return;

  const syncCart = () => {
    STATE.cart = readPrintCart();
    renderAll(root);
  };

  STATE.unsubscribe?.();
  STATE.unsubscribe = subscribePrintCart(() => syncCart());

  root.addEventListener("click", async (event) => {
    const goPrintBtn = event.target.closest("#printSelectGoPrintBtn");
    if (goPrintBtn) {
      const cartSize = (readPrintCart().barcodes || []).length;
      if (cartSize <= 0) {
        event.preventDefault();
        event.stopPropagation();
        showToast("ยังไม่ได้เลือกรายการสำหรับพิมพ์");
        return;
      }
    }

    const selectBookBtn = event.target.closest('[data-action="select-book"]');
    if (selectBookBtn) {
      const bookId = String(selectBookBtn.getAttribute("data-book-id") || "");
      const bookTitle = String(selectBookBtn.getAttribute("data-book-title") || "");
      if (!bookId) return;
      STATE.selectedBookId = bookId;
      STATE.selectedBookTitle = bookTitle;
      await loadItemsForBook(root, bookId);
      return;
    }

    const toggleItem = event.target.closest('[data-action="toggle-item"]');
    if (toggleItem) {
      const barcode = String(toggleItem.getAttribute("data-barcode") || "");
      const checked = Boolean(toggleItem.checked);
      if (!barcode) return;
      if (checked) addBarcodesToPrintCart([barcode]);
      else removeBarcodeFromPrintCart(barcode);
      syncCart();
      return;
    }

    const removeBtn = event.target.closest('[data-action="remove-cart"]');
    if (removeBtn) {
      const barcode = String(removeBtn.getAttribute("data-barcode") || "");
      removeBarcodeFromPrintCart(barcode);
      syncCart();
      return;
    }
  });

  root.querySelector("#printSelectAllAvailableBtn")?.addEventListener("click", () => {
    const available = STATE.items
      .map((row) => String(row.barcode || ""))
      .filter(Boolean);
    const before = readPrintCart().barcodes;
    const after = addBarcodesToPrintCart(available).barcodes;
    const added = Math.max(0, after.length - before.length);
    syncCart();
    showToast(added > 0 ? `เลือกทั้งหมดแล้ว เพิ่มเข้าตะกร้า ${added} รายการ` : "รายการที่เลือกมีในตะกร้าแล้ว");
  });

  root.querySelector("#printSelectUnselectAllBtn")?.addEventListener("click", () => {
    const selected = Array.from(new Set(STATE.selectedItemBarcodes));
    if (!selected.length) {
      showToast("ยังไม่มีรายการที่เลือกอยู่");
      return;
    }
    selected.forEach((barcode) => removeBarcodeFromPrintCart(barcode));
    syncCart();
    showToast(`ยกเลิกแล้ว ${selected.length} รายการ`);
  });

  root.querySelector("#printSelectClearCartBtn")?.addEventListener("click", () => {
    clearPrintCart();
    syncCart();
    showToast("ล้างตะกร้าแล้ว");
  });

  syncCart();
  renderAll(root);
  loadCatalog(root);
}
