import { apiBookItemsList, apiBooksCatalogList } from "../../data/api.js";
import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";

const SEARCH_DEBOUNCE_MS = 300;
const CATALOG_PAGE_SIZE = 120;
const MAX_CATALOG_PAGES = 10;

const STATE = {
  root: null,
  loading: false,
  loadingDetail: false,
  catalog: [],
  filtered: [],
  categories: [],
  q: "",
  activeCategory: "all",
  viewMode: "grid",
  selectedBookId: "",
  detailItems: [],
};

let SEARCH_TIMER = 0;

function ensureNativeStyles_() {
  if (document.getElementById("memberBooksNativeStyle")) return;
  const style = document.createElement("style");
  style.id = "memberBooksNativeStyle";
  style.textContent = `
    #memberBooksRoot {
      overscroll-behavior: contain;
    }
    .member-books-pressable {
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      transition: transform .12s ease, box-shadow .18s ease;
      position: relative;
      overflow: hidden;
      content-visibility: auto;
      contain-intrinsic-size: 0 320px;
    }
    .member-books-pressable::after {
      content: "";
      position: absolute;
      inset: 0;
      background: linear-gradient(120deg, transparent 30%, rgba(255,255,255,.35) 45%, transparent 60%);
      transform: translateX(-120%);
      transition: transform .28s ease;
      pointer-events: none;
    }
    .member-books-pressable:active {
      transform: scale(0.98);
    }
    .member-books-pressable:active::after {
      transform: translateX(140%);
    }
    .member-books-sheet-backdrop {
      transition: opacity .2s ease;
    }
    .member-books-sheet {
      transition: transform .3s cubic-bezier(0.32, 0.72, 0, 1), opacity .2s ease;
      will-change: transform, opacity;
    }
    @media (max-width: 767px) {
      .member-books-sheet {
        bottom: calc(env(safe-area-inset-bottom, 0px) + 4.9rem) !important;
        max-height: calc(100dvh - env(safe-area-inset-bottom, 0px) - 6rem) !important;
      }
      #memberBooksDetailBody {
        padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 0.9rem);
      }
    }
    .member-books-skeleton {
      background: linear-gradient(100deg, rgba(148,163,184,.12) 20%, rgba(241,245,249,.8) 50%, rgba(148,163,184,.12) 80%);
      background-size: 220% 100%;
      animation: memberBooksShimmer 1.4s infinite linear;
    }
    @keyframes memberBooksShimmer {
      from { background-position: 200% 0; }
      to { background-position: -200% 0; }
    }
  `;
  document.head.appendChild(style);
}

function normalizeText_(value) {
  return String(value || "").trim().toLowerCase();
}

function statusMeta_(book) {
  const available = Number(book?.inventory?.available || 0);
  const total = Number(book?.inventory?.total || 0);
  if (available > 0) {
    return {
      key: "available",
      label: `ว่าง ${available}/${Math.max(total, available)}`,
      badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
  }
  if (total > 0) {
    return {
      key: "borrowed",
      label: "ถูกยืม",
      badge: "bg-rose-100 text-rose-700 border-rose-200",
    };
  }
  return {
    key: "unknown",
    label: "ไม่พร้อมให้บริการ",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
  };
}

function coverPlaceholder_(title) {
  return `
    <div class="member-books-skeleton absolute inset-0"></div>
    <div class="absolute inset-0 flex items-end p-2">
      <p class="line-clamp-2 text-[11px] font-black text-slate-500">${escapeHtml(title || "BOOK")}</p>
    </div>
  `;
}

function getSelectedBook_() {
  return STATE.catalog.find((item) => String(item.bookId || "") === STATE.selectedBookId) || null;
}

function categoryLabel_(value) {
  const t = String(value || "").trim();
  return t || "ทั่วไป";
}

function viewTransition_(fn) {
  if (typeof document !== "undefined" && typeof document.startViewTransition === "function") {
    document.startViewTransition(fn);
    return;
  }
  fn();
}

function applyFilters_() {
  const q = normalizeText_(STATE.q);
  const category = normalizeText_(STATE.activeCategory);
  STATE.filtered = STATE.catalog.filter((item) => {
    const itemCategory = normalizeText_(item.category || "ทั่วไป");
    if (category !== "all" && itemCategory !== category) return false;

    if (!q) return true;
    const hay = [item.title, item.author, item.category, item.isbn].map(normalizeText_).join(" ");
    return hay.includes(q);
  });
}

function renderSummary_(root) {
  const summary = root.querySelector("#memberBooksSummary");
  if (!summary) return;
  if (STATE.loading) {
    summary.textContent = "กำลังโหลดคลังหนังสือ...";
    return;
  }
  summary.textContent = `พบ ${STATE.filtered.length.toLocaleString("th-TH")} จาก ${STATE.catalog.length.toLocaleString("th-TH")} รายการ`;
}

function renderFilterChips_(root) {
  const chips = root.querySelector("#memberBooksChips");
  if (!chips) return;
  const list = ["all", ...STATE.categories];
  chips.innerHTML = list
    .map((c) => {
      const active = c === STATE.activeCategory;
      const label = c === "all" ? "ทั้งหมด" : categoryLabel_(c);
      return `<button type="button" data-category="${escapeHtml(c)}" class="rounded-full border px-3 py-1.5 text-xs font-black transition ${active ? "border-sky-300 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}">${escapeHtml(label)}</button>`;
    })
    .join("");
}

function renderCards_(root) {
  const list = root.querySelector("#memberBooksList");
  if (!list) return;

  if (STATE.loading) {
    list.innerHTML = `
      <div class="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        ${Array.from({ length: 10 }).map(() => '<div class="aspect-[3/4] rounded-2xl border border-slate-200 member-books-skeleton"></div>').join("")}
      </div>
    `;
    return;
  }

  if (!STATE.filtered.length) {
    list.innerHTML = '<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-semibold text-slate-500">ไม่พบหนังสือตามคำค้นหรือหมวดหมู่ที่เลือก</div>';
    return;
  }

  if (STATE.viewMode === "list") {
    list.innerHTML = `
      <div class="space-y-2">
        ${STATE.filtered.map((item) => {
          const status = statusMeta_(item);
          const title = String(item.title || "-");
          return `
            <button type="button" data-open-book="${escapeHtml(item.bookId || "")}" class="member-books-pressable w-full rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm hover:shadow-md">
              <div class="grid gap-3 grid-cols-[64px_1fr] items-start">
                <div class="relative aspect-[3/4] overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  ${item.coverUrl ? `<img data-cover loading="lazy" src="${escapeHtml(item.coverUrl)}" alt="${escapeHtml(title)}" class="h-full w-full object-cover" />` : coverPlaceholder_(title)}
                </div>
                <div class="min-w-0">
                  <p class="line-clamp-2 font-black text-slate-800">${escapeHtml(title)}</p>
                  <p class="mt-0.5 text-xs font-semibold text-slate-500">${escapeHtml(item.author || "ไม่ระบุผู้แต่ง")}</p>
                  <div class="mt-2 flex flex-wrap gap-2 text-[11px] font-black">
                    <span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600">${escapeHtml(categoryLabel_(item.category))}</span>
                    <span class="rounded-full border px-2 py-1 ${status.badge}">${escapeHtml(status.label)}</span>
                  </div>
                </div>
              </div>
            </button>
          `;
        }).join("")}
      </div>
    `;
    attachCoverFallback_(root);
    return;
  }

  list.innerHTML = `
    <div class="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      ${STATE.filtered.map((item) => {
        const status = statusMeta_(item);
        const title = String(item.title || "-");
        return `
          <button type="button" data-open-book="${escapeHtml(item.bookId || "")}" class="member-books-pressable rounded-2xl border border-slate-200 bg-white p-2 text-left shadow-sm hover:shadow-md">
            <div class="relative aspect-[3/4] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              ${item.coverUrl
                ? `<img data-cover loading="lazy" src="${escapeHtml(item.coverUrl)}" alt="${escapeHtml(title)}" class="h-full w-full object-cover" />`
                : coverPlaceholder_(title)}
              <span class="absolute left-2 top-2 rounded-full border px-2 py-1 text-[10px] font-black ${status.badge}">${escapeHtml(status.label)}</span>
            </div>
            <div class="pt-2">
              <p class="line-clamp-2 text-sm font-black text-slate-800">${escapeHtml(title)}</p>
              <p class="mt-0.5 line-clamp-1 text-xs font-semibold text-slate-500">${escapeHtml(item.author || "ไม่ระบุผู้แต่ง")}</p>
            </div>
          </button>
        `;
      }).join("")}
    </div>
  `;

  attachCoverFallback_(root);
}

function renderDetailsSheet_(root) {
  const backdrop = root.querySelector("#memberBooksDetailBackdrop");
  const panel = root.querySelector("#memberBooksDetailPanel");
  const body = root.querySelector("#memberBooksDetailBody");
  const title = root.querySelector("#memberBooksDetailTitle");
  if (!backdrop || !panel || !body || !title) return;

  const selected = getSelectedBook_();
  const isOpen = Boolean(selected);

  backdrop.className = `member-books-sheet-backdrop fixed inset-0 z-40 bg-slate-900/45 ${isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`;
  panel.className = `member-books-sheet fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl md:inset-y-0 md:right-0 md:left-auto md:w-[460px] md:max-h-none md:rounded-none md:border-l ${isOpen ? "translate-y-0 md:translate-x-0 opacity-100" : "translate-y-full md:translate-y-0 md:translate-x-full opacity-0"}`;

  if (!selected) {
    title.textContent = "รายละเอียดหนังสือ";
    body.innerHTML = "";
    return;
  }

  title.textContent = selected.title || "รายละเอียดหนังสือ";

  if (STATE.loadingDetail) {
    body.innerHTML = `
      <div class="space-y-3 p-4">
        <div class="h-40 rounded-2xl member-books-skeleton"></div>
        <div class="h-4 w-3/4 rounded member-books-skeleton"></div>
        <div class="h-4 w-1/2 rounded member-books-skeleton"></div>
        <div class="h-24 rounded-xl member-books-skeleton"></div>
      </div>
    `;
    return;
  }

  const availableItems = STATE.detailItems.filter((it) => normalizeText_(it.status) === "available");
  const status = statusMeta_(selected);
  const defaultBarcode = String(availableItems[0]?.barcode || "").trim();
  const desc = String(selected.description || "").trim();

  body.innerHTML = `
    <div class="space-y-4 p-4">
      <div class="grid grid-cols-[110px_1fr] gap-3">
        <div class="relative aspect-[3/4] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          ${selected.coverUrl
            ? `<img loading="lazy" src="${escapeHtml(selected.coverUrl)}" alt="${escapeHtml(selected.title || "")}" class="h-full w-full object-cover" />`
            : coverPlaceholder_(selected.title || "BOOK")}
        </div>
        <div>
          <p class="text-lg font-black text-slate-800">${escapeHtml(selected.title || "-")}</p>
          <p class="mt-1 text-sm font-semibold text-slate-600">${escapeHtml(selected.author || "ไม่ระบุผู้แต่ง")}</p>
          <div class="mt-2 flex flex-wrap gap-2 text-[11px] font-black">
            <span class="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-slate-600">${escapeHtml(categoryLabel_(selected.category))}</span>
            <span class="rounded-full border px-2 py-1 ${status.badge}">${escapeHtml(status.label)}</span>
          </div>
        </div>
      </div>

      <details class="rounded-2xl border border-slate-200 bg-slate-50 p-3" ${desc ? "" : "open"}>
        <summary class="cursor-pointer text-xs font-black uppercase tracking-wide text-slate-600">เรื่องย่อ</summary>
        <p class="mt-2 text-sm leading-6 text-slate-600">${escapeHtml(desc || "ยังไม่มีรายละเอียดหนังสือ")}</p>
      </details>

      <section class="rounded-2xl border border-slate-200 bg-white p-3">
        <div class="mb-2 flex items-center justify-between gap-2">
          <p class="text-xs font-black uppercase tracking-wide text-slate-600">สถานะเล่มจริง</p>
          <span class="text-xs font-semibold text-slate-500">ทั้งหมด ${STATE.detailItems.length} เล่ม</span>
        </div>
        <div class="max-h-56 space-y-2 overflow-y-auto pr-1">
          ${STATE.detailItems.length
            ? STATE.detailItems.map((it) => {
              const isAvailable = normalizeText_(it.status) === "available";
              const isReserved = normalizeText_(it.status) === "reserved";
              const canReserveThisItem = !isReserved;
              const reserveBtnHtml = canReserveThisItem
                ? `<button type="button" data-go-reservation="${escapeHtml(selected.bookId || "")}" data-go-reservation-barcode="${escapeHtml(it.barcode || "")}" class="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs font-black text-amber-700 hover:bg-amber-100">จองเล่มนี้</button>`
                : `<button type="button" disabled class="rounded-lg border border-slate-200 bg-slate-100 px-2 py-1.5 text-xs font-black text-slate-400">มีผู้จองแล้ว</button>`;
              return `
                <article class="rounded-xl border border-slate-200 bg-slate-50 p-2">
                  <div class="flex items-center justify-between gap-2">
                    <p class="text-xs font-black text-slate-700">${escapeHtml(it.barcode || "-")}</p>
                    <span class="rounded-full px-2 py-0.5 text-[10px] font-black ${isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}">${escapeHtml(isAvailable ? "ว่าง" : "ไม่ว่าง")}</span>
                  </div>
                  <p class="mt-1 text-[11px] font-semibold text-slate-500">ที่เก็บ: ${escapeHtml(it.location || "-")} · สภาพ: ${escapeHtml(it.condition || "-")}</p>
                  <div class="mt-2 grid grid-cols-2 gap-2">
                    ${isAvailable ? `<button type="button" data-borrow-barcode="${escapeHtml(it.barcode || "")}" class="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs font-black text-emerald-700 hover:bg-emerald-100">ยืมเล่มนี้</button>` : `<button type="button" disabled class="rounded-lg border border-slate-200 bg-slate-100 px-2 py-1.5 text-xs font-black text-slate-400">ยืมไม่ได้</button>`}
                    ${reserveBtnHtml}
                  </div>
                </article>
              `;
            }).join("")
            : '<p class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-xs font-semibold text-slate-500">ไม่พบข้อมูลเล่ม</p>'}
        </div>
      </section>

      <div class="grid gap-2 sm:grid-cols-3">
        ${defaultBarcode
          ? `<button type="button" data-borrow-barcode="${escapeHtml(defaultBarcode)}" class="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-black text-white hover:bg-emerald-700">ยืมด้วยตนเอง</button>`
          : `<button type="button" disabled class="rounded-xl bg-slate-200 px-3 py-2 text-sm font-black text-slate-500">ยังไม่มีเล่มว่าง</button>`}
        <button type="button" data-go-reservation="${escapeHtml(selected.bookId || "")}" data-go-reservation-barcode="${escapeHtml(defaultBarcode)}" class="rounded-xl bg-amber-500 px-3 py-2 text-sm font-black text-white hover:bg-amber-600">จองหนังสือ</button>
        <button type="button" data-close-detail class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-100">ปิด</button>
      </div>
    </div>
  `;
}

function renderAll_(root) {
  renderSummary_(root);
  renderFilterChips_(root);
  renderCards_(root);
  renderDetailsSheet_(root);

  const gridBtn = root.querySelector("#memberBooksGridBtn");
  const listBtn = root.querySelector("#memberBooksListBtn");
  if (gridBtn) {
    gridBtn.className = `rounded-lg border px-2.5 py-1.5 text-xs font-black ${STATE.viewMode === "grid" ? "border-sky-300 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-600"}`;
  }
  if (listBtn) {
    listBtn.className = `rounded-lg border px-2.5 py-1.5 text-xs font-black ${STATE.viewMode === "list" ? "border-sky-300 bg-sky-50 text-sky-700" : "border-slate-200 bg-white text-slate-600"}`;
  }
}

async function loadCatalog_(root) {
  STATE.loading = true;
  renderAll_(root);

  try {
    const all = [];
    for (let page = 1; page <= MAX_CATALOG_PAGES; page += 1) {
      const res = await apiBooksCatalogList({
        status: "active",
        page,
        limit: CATALOG_PAGE_SIZE,
      });
      if (!res?.ok) throw new Error(res?.error || "โหลดคลังหนังสือไม่สำเร็จ");
      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      all.push(...items);
      if (!res.data?.hasMore || items.length === 0) break;
    }

    STATE.catalog = all;
    const catMap = new Map();
    all.forEach((item) => {
      const raw = categoryLabel_(item.category);
      const key = normalizeText_(raw);
      if (!key || catMap.has(key)) return;
      catMap.set(key, raw);
    });
    STATE.categories = Array.from(catMap.values()).sort((a, b) => String(a).localeCompare(String(b), "th"));
    applyFilters_();
  } catch (err) {
    STATE.catalog = [];
    STATE.filtered = [];
    STATE.categories = [];
    showToast(err?.message || "โหลดคลังหนังสือไม่สำเร็จ");
  } finally {
    STATE.loading = false;
    renderAll_(root);
  }
}

function attachCoverFallback_(root) {
  root.querySelectorAll("img[data-cover]").forEach((img) => {
    img.addEventListener("error", () => {
      const wrap = img.closest(".relative");
      if (!wrap) return;
      img.remove();
      wrap.insertAdjacentHTML("beforeend", coverPlaceholder_(img.getAttribute("alt") || "BOOK"));
    }, { once: true });
  });
}

async function openBookDetail_(root, bookId) {
  const id = String(bookId || "").trim();
  if (!id) return;

  const run = () => {
    STATE.selectedBookId = id;
    STATE.loadingDetail = true;
    STATE.detailItems = [];
    renderAll_(root);
  };

  viewTransition_(run);

  try {
    const res = await apiBookItemsList({
      bookId: id,
      status: "all",
      page: 1,
      limit: 200,
    });

    if (!res?.ok) throw new Error(res?.error || "โหลดรายละเอียดเล่มไม่สำเร็จ");
    STATE.detailItems = Array.isArray(res.data?.items) ? res.data.items : [];
  } catch (err) {
    STATE.detailItems = [];
    showToast(err?.message || "โหลดรายละเอียดเล่มไม่สำเร็จ");
  } finally {
    STATE.loadingDetail = false;
    renderAll_(root);
  }
}

function closeBookDetail_(root) {
  viewTransition_(() => {
    STATE.selectedBookId = "";
    STATE.loadingDetail = false;
    STATE.detailItems = [];
    renderAll_(root);
  });
}

function gotoPath_(path) {
  if (!path) return;
  if (window.location.pathname === path && !window.location.search) return;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function gotoLoanSelfWithBarcode_(barcode) {
  const code = String(barcode || "").trim();
  if (!code) {
    showToast("ไม่พบ barcode สำหรับยืมเล่มนี้");
    return;
  }
  const path = `/app/loan-self?barcode=${encodeURIComponent(code)}&mode=borrow`;
  gotoPath_(path);
}

function bindEvents_(root) {
  const searchInput = root.querySelector("#memberBooksSearchInput");
  const gridBtn = root.querySelector("#memberBooksGridBtn");
  const listBtn = root.querySelector("#memberBooksListBtn");
  const chips = root.querySelector("#memberBooksChips");
  const list = root.querySelector("#memberBooksList");
  const overlay = root.querySelector("#memberBooksDetailBackdrop");
  const panel = root.querySelector("#memberBooksDetailPanel");

  searchInput?.addEventListener("input", (event) => {
    const next = String(event.target.value || "");
    STATE.q = next;
    if (SEARCH_TIMER) clearTimeout(SEARCH_TIMER);
    SEARCH_TIMER = window.setTimeout(() => {
      applyFilters_();
      renderAll_(root);
    }, SEARCH_DEBOUNCE_MS);
  });

  gridBtn?.addEventListener("click", () => {
    STATE.viewMode = "grid";
    renderAll_(root);
  });

  listBtn?.addEventListener("click", () => {
    STATE.viewMode = "list";
    renderAll_(root);
  });

  chips?.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-category]");
    if (!btn) return;
    STATE.activeCategory = String(btn.getAttribute("data-category") || "all");
    applyFilters_();
    renderAll_(root);
  });

  list?.addEventListener("click", (event) => {
    const card = event.target.closest("button[data-open-book]");
    if (!card) return;
    openBookDetail_(root, card.getAttribute("data-open-book"));
  });

  overlay?.addEventListener("click", () => closeBookDetail_(root));

  panel?.addEventListener("click", (event) => {
    const close = event.target.closest("button[data-close-detail]");
    if (close) {
      closeBookDetail_(root);
      return;
    }

    const borrow = event.target.closest("button[data-borrow-barcode]");
    if (borrow) {
      gotoLoanSelfWithBarcode_(borrow.getAttribute("data-borrow-barcode"));
      return;
    }

    const reserve = event.target.closest("button[data-go-reservation]");
    if (reserve) {
      const bookId = String(reserve.getAttribute("data-go-reservation") || "").trim();
      const barcode = String(reserve.getAttribute("data-go-reservation-barcode") || "").trim();
      const qs = new URLSearchParams();
      if (bookId) qs.set("bookId", bookId);
      if (barcode) qs.set("barcode", barcode);
      const path = qs.toString() ? `/app/reservations?${qs.toString()}` : "/app/reservations";
      gotoPath_(path);
      return;
    }
  });
}

export function renderMemberBooksView() {
  return `
    <section id="memberBooksRoot" class="view space-y-3 pb-2">
      <article class="sticky top-0 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div class="grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-center">
          <input id="memberBooksSearchInput" type="search" placeholder="ค้นหาจากชื่อหนังสือ หรือผู้แต่ง" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
          <button id="memberBooksGridBtn" type="button" class="rounded-lg border border-sky-300 bg-sky-50 px-2.5 py-1.5 text-xs font-black text-sky-700">Grid</button>
          <button id="memberBooksListBtn" type="button" class="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-black text-slate-600">List</button>
        </div>
        <p id="memberBooksSummary" class="mt-2 text-xs font-black uppercase tracking-wide text-slate-500">กำลังเตรียมข้อมูล...</p>
        <div id="memberBooksChips" class="mt-2 flex gap-2 overflow-x-auto pb-1"></div>
      </article>

      <div id="memberBooksList" class="min-h-[180px]"></div>

      <div id="memberBooksDetailBackdrop" class="member-books-sheet-backdrop fixed inset-0 z-40 bg-slate-900/45 opacity-0 pointer-events-none"></div>
      <aside id="memberBooksDetailPanel" class="member-books-sheet fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] translate-y-full overflow-hidden rounded-t-3xl border border-slate-200 bg-white opacity-0 shadow-2xl md:inset-y-0 md:right-0 md:left-auto md:w-[460px] md:max-h-none md:rounded-none md:border-l md:translate-x-full md:translate-y-0">
        <header class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 id="memberBooksDetailTitle" class="text-sm font-black text-slate-800">รายละเอียดหนังสือ</h3>
          <button type="button" data-close-detail class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-600 hover:bg-slate-100">ปิด</button>
        </header>
        <div id="memberBooksDetailBody" class="overflow-y-auto"></div>
      </aside>
    </section>
  `;
}

export function mountMemberBooksView(container) {
  const root = container.querySelector("#memberBooksRoot");
  if (!root) return;

  ensureNativeStyles_();

  STATE.root = root;
  STATE.loading = false;
  STATE.loadingDetail = false;
  STATE.catalog = [];
  STATE.filtered = [];
  STATE.categories = [];
  STATE.q = "";
  STATE.activeCategory = "all";
  STATE.viewMode = "grid";
  STATE.selectedBookId = "";
  STATE.detailItems = [];

  bindEvents_(root);
  renderAll_(root);
  loadCatalog_(root);
}
