import { apiBookItemsList, apiBooksCatalogList, apiSettingsLibraryHoursList } from "../../data/api.js";
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
  businessHours: "",
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
    .member-books-shell {
      container-type: inline-size;
    }
    .member-books-hero {
      background:
        radial-gradient(circle at top left, rgba(14, 165, 233, 0.16), transparent 36%),
        radial-gradient(circle at top right, rgba(56, 189, 248, 0.12), transparent 30%),
        linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.92));
      box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
    }
    .member-books-hero::before {
      content: "";
      position: absolute;
      inset: auto -20% -36% auto;
      width: 16rem;
      height: 16rem;
      border-radius: 9999px;
      background: radial-gradient(circle, rgba(125, 211, 252, 0.28), transparent 70%);
      pointer-events: none;
    }
    .member-books-hero::after {
      content: "";
      position: absolute;
      inset: -20% auto auto -10%;
      width: 12rem;
      height: 12rem;
      border-radius: 9999px;
      background: radial-gradient(circle, rgba(224, 242, 254, 0.9), transparent 68%);
      pointer-events: none;
    }
    .member-books-shell-card {
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(18px);
      border: 1px solid rgba(226, 232, 240, 0.9);
    }
    .member-books-toolbar {
      display: grid;
      gap: 0.75rem;
    }
    @media (min-width: 768px) {
      .member-books-toolbar {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    @media (min-width: 1024px) {
      .member-books-toolbar {
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: end;
      }
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
    .member-books-chip-row {
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .member-books-chip-row::-webkit-scrollbar {
      display: none;
    }
    .member-books-chip {
      transition: background-color .18s ease, color .18s ease, border-color .18s ease, transform .12s ease;
    }
    .member-books-chip:active {
      transform: scale(0.98);
    }
    @media (min-width: 768px) {
      .member-books-chip-row {
        flex-wrap: wrap;
        overflow: visible;
      }
    }
    .member-books-sheet-backdrop {
      transition: opacity .2s ease;
    }
    .member-books-sheet {
      transition: transform .3s cubic-bezier(0.32, 0.72, 0, 1), opacity .2s ease, box-shadow .2s ease;
      will-change: transform, opacity;
      box-shadow: 0 24px 60px rgba(15, 23, 42, 0.18);
    }
    @media (max-width: 767px) {
      .member-books-sheet {
        bottom: calc(env(safe-area-inset-bottom, 0px) + 4.2rem) !important;
        max-height: calc(100dvh - env(safe-area-inset-bottom, 0px) - 5.2rem) !important;
        border-radius: 1.75rem 1.75rem 0 0 !important;
      }
      #memberBooksDetailBody {
        padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 1rem);
      }
    }
    @media (min-width: 768px) {
      .member-books-shell-card {
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
      }
    }
    @media (min-width: 768px) and (max-width: 1023px) {
      .member-books-sheet {
        bottom: 1rem !important;
        right: 1rem !important;
        left: auto !important;
        width: min(92vw, 520px) !important;
        max-height: calc(100dvh - 2rem) !important;
        border-radius: 1.75rem !important;
      }
    }
    @media (min-width: 1024px) {
      .member-books-sheet {
        top: 1rem !important;
        bottom: 1rem !important;
        right: 1rem !important;
        left: auto !important;
        width: min(44vw, 580px) !important;
        max-height: calc(100dvh - 2rem) !important;
        border-radius: 2rem !important;
        transform: translateX(100%);
      }
      .member-books-sheet.is-open {
        transform: translateX(0);
      }
      .member-books-sheet-backdrop {
        backdrop-filter: blur(2px);
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
      tone: "emerald",
    };
  }
  if (total > 0) {
    return {
      key: "borrowed",
      label: "ถูกยืม",
      badge: "bg-rose-100 text-rose-700 border-rose-200",
      tone: "rose",
    };
  }
  return {
    key: "unknown",
    label: "ไม่พร้อมให้บริการ",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    tone: "amber",
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

function defaultBusinessHours_() {
  return "จันทร์ - ศุกร์ | 08:30 - 16:30 น.";
}

function compressDayRange_(dayIndexes) {
  const DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
  const sorted = Array.from(new Set(dayIndexes.map((day) => Number(day)).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))).sort((a, b) => a - b);
  if (!sorted.length) return "";
  const ranges = [];
  let start = sorted[0];
  let prev = sorted[0];
  for (let i = 1; i < sorted.length; i += 1) {
    const day = sorted[i];
    if (day === prev + 1) {
      prev = day;
      continue;
    }
    ranges.push(start === prev ? DAYS[start] : `${DAYS[start]} - ${DAYS[prev]}`);
    start = day;
    prev = day;
  }
  ranges.push(start === prev ? DAYS[start] : `${DAYS[start]} - ${DAYS[prev]}`);
  return ranges.join(", ");
}

function formatBusinessHours_(items) {
  if (!Array.isArray(items) || !items.length) return defaultBusinessHours_();
  const openRows = items.filter((row) => row && row.isOpen !== false);
  if (!openRows.length) return defaultBusinessHours_();

  const grouped = new Map();
  openRows.forEach((row) => {
    const openTime = String(row.openTime || "").trim();
    const closeTime = String(row.closeTime || "").trim();
    const key = `${openTime}|${closeTime}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(Number(row.dayOfWeek));
  });

  const [firstKey] = grouped.keys();
  const [openTime = "08:30", closeTime = "16:30"] = String(firstKey || "").split("|");
  const days = compressDayRange_(grouped.get(firstKey) || []);
  if (!days) return `${openTime || "08:30"} - ${closeTime || "16:30"} น.`;
  return `${days} | ${openTime || "08:30"} - ${closeTime || "16:30"} น.`;
}

function computeStats_() {
  const availableBooks = STATE.filtered.filter((book) => Number(book?.inventory?.available || 0) > 0).length;
  return {
    total: STATE.catalog.length,
    filtered: STATE.filtered.length,
    availableBooks,
    categories: STATE.categories.length,
  };
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
  const catStat = root.querySelector("#memberBooksCategoriesStat");
  const availStat = root.querySelector("#memberBooksAvailableStat");
  const businessHours = root.querySelector("#memberBooksBusinessHours");
  const stats = computeStats_();
  if (!summary) return;
  if (STATE.loading) {
    summary.textContent = "กำลังโหลดคลังหนังสือ...";
    if (catStat) catStat.textContent = "0";
    if (availStat) availStat.textContent = "0";
    if (businessHours) businessHours.textContent = defaultBusinessHours_();
    return;
  }
  if (catStat) catStat.textContent = stats.categories.toLocaleString("th-TH");
  if (availStat) availStat.textContent = stats.availableBooks.toLocaleString("th-TH");
  if (businessHours) businessHours.textContent = STATE.businessHours || defaultBusinessHours_();
  summary.innerHTML = `
    <span class="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-sky-700">
      พบ ${stats.filtered.toLocaleString("th-TH")} / ${stats.total.toLocaleString("th-TH")}
    </span>
    <span class="hidden sm:inline text-xs font-semibold text-slate-500">ว่าง ${stats.availableBooks.toLocaleString("th-TH")} เล่ม · ${stats.categories.toLocaleString("th-TH")} หมวด</span>
  `;
}

function renderFilterChips_(root) {
  const chips = root.querySelector("#memberBooksChips");
  if (!chips) return;
  const list = ["all", ...STATE.categories];
  chips.innerHTML = list
    .map((c) => {
      const active = c === STATE.activeCategory;
      const label = c === "all" ? "ทั้งหมด" : categoryLabel_(c);
      return `<button type="button" data-category="${escapeHtml(c)}" class="member-books-chip snap-start shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-black ${active ? "border-sky-300 bg-sky-50 text-sky-700 shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}">${escapeHtml(label)}</button>`;
    })
    .join("");
}

function renderCards_(root) {
  const list = root.querySelector("#memberBooksList");
  if (!list) return;

  if (STATE.loading) {
    list.innerHTML = `
      <div class="grid gap-3 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        ${Array.from({ length: 10 }).map(() => `
          <div class="rounded-[1.5rem] border border-slate-200 bg-white p-2 shadow-sm">
            <div class="aspect-[3/4] rounded-[1.1rem] member-books-skeleton"></div>
            <div class="mt-3 h-4 w-3/4 rounded member-books-skeleton"></div>
            <div class="mt-2 h-3 w-1/2 rounded member-books-skeleton"></div>
          </div>
        `).join("")}
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
      <div class="space-y-3">
        ${STATE.filtered.map((item) => {
          const status = statusMeta_(item);
          const title = String(item.title || "-");
          const available = Number(item?.inventory?.available || 0);
          const total = Number(item?.inventory?.total || 0);
          return `
            <button type="button" data-open-book="${escapeHtml(item.bookId || "")}" class="member-books-pressable w-full rounded-[1.5rem] border border-slate-200 bg-white p-3 text-left shadow-sm hover:shadow-md">
              <div class="grid gap-3 grid-cols-[76px_1fr] items-start sm:grid-cols-[88px_1fr]">
                <div class="relative aspect-[3/4] overflow-hidden rounded-[1.1rem] border border-slate-200 bg-slate-100">
                  ${item.coverUrl ? `<img data-cover loading="lazy" src="${escapeHtml(item.coverUrl)}" alt="${escapeHtml(title)}" class="h-full w-full object-cover" />` : coverPlaceholder_(title)}
                  <span class="absolute left-2 top-2 rounded-full border px-2 py-1 text-[10px] font-black ${status.badge}">${escapeHtml(status.label)}</span>
                </div>
                <div class="min-w-0 py-0.5">
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="line-clamp-2 text-[15px] font-black leading-tight text-slate-800">${escapeHtml(title)}</p>
                      <p class="mt-1 text-xs font-semibold text-slate-500">${escapeHtml(item.author || "ไม่ระบุผู้แต่ง")}</p>
                    </div>
                    <i data-lucide="chevron-right" class="mt-0.5 h-4 w-4 shrink-0 text-slate-300"></i>
                  </div>
                  <div class="mt-3 flex flex-wrap gap-2 text-[11px] font-black">
                    <span class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">${escapeHtml(categoryLabel_(item.category))}</span>
                    <span class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">${available.toLocaleString("th-TH")}/${Math.max(total, available).toLocaleString("th-TH")} เล่ม</span>
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
    <div class="grid gap-3 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      ${STATE.filtered.map((item) => {
        const status = statusMeta_(item);
        const title = String(item.title || "-");
        const available = Number(item?.inventory?.available || 0);
        const total = Number(item?.inventory?.total || 0);
        return `
          <button type="button" data-open-book="${escapeHtml(item.bookId || "")}" class="member-books-pressable rounded-[1.5rem] border border-slate-200 bg-white p-2.5 text-left shadow-sm hover:shadow-md">
            <div class="relative aspect-[3/4] overflow-hidden rounded-[1.15rem] border border-slate-200 bg-slate-100">
              ${item.coverUrl
                ? `<img data-cover loading="lazy" src="${escapeHtml(item.coverUrl)}" alt="${escapeHtml(title)}" class="h-full w-full object-cover" />`
                : coverPlaceholder_(title)}
              <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-900/25 to-transparent"></div>
              <span class="absolute left-2 top-2 rounded-full border px-2 py-1 text-[10px] font-black shadow-sm ${status.badge}">${escapeHtml(status.label)}</span>
            </div>
            <div class="pt-2.5">
              <p class="line-clamp-2 text-[13px] font-black leading-tight text-slate-800">${escapeHtml(title)}</p>
              <p class="mt-1 line-clamp-1 text-xs font-semibold text-slate-500">${escapeHtml(item.author || "ไม่ระบุผู้แต่ง")}</p>
              <div class="mt-2 flex items-center justify-between gap-2">
                <span class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">${escapeHtml(categoryLabel_(item.category))}</span>
                <span class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black text-slate-500">${available.toLocaleString("th-TH")}/${Math.max(total, available).toLocaleString("th-TH")}</span>
              </div>
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
  panel.className = `member-books-sheet fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] overflow-hidden rounded-t-[1.75rem] border border-slate-200 bg-white shadow-2xl md:inset-y-4 md:right-4 md:left-auto md:w-[min(92vw,520px)] md:max-w-[calc(100vw-2rem)] md:max-h-[calc(100dvh-2rem)] md:rounded-[2rem] md:border ${isOpen ? "is-open translate-y-0 md:translate-x-0 opacity-100" : "translate-y-full md:translate-y-0 md:translate-x-full opacity-0"}`;

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
  const totalAvailable = Number(selected?.inventory?.available || availableItems.length || 0);
  const totalCount = Number(selected?.inventory?.total || STATE.detailItems.length || 0);
  const shelfLabel = categoryLabel_(selected.category);

  body.innerHTML = `
    <div class="space-y-4 p-4 sm:p-5">
      <div class="grid grid-cols-[112px_1fr] gap-3 sm:grid-cols-[128px_1fr] sm:gap-4">
        <div class="relative aspect-[3/4] overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-100 shadow-sm">
          ${selected.coverUrl
            ? `<img loading="lazy" src="${escapeHtml(selected.coverUrl)}" alt="${escapeHtml(selected.title || "")}" class="h-full w-full object-cover" />`
            : coverPlaceholder_(selected.title || "BOOK")}
          <div class="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-900/20 to-transparent"></div>
        </div>
        <div class="min-w-0">
          <p class="text-[1.05rem] font-black leading-tight text-slate-900 sm:text-[1.15rem]">${escapeHtml(selected.title || "-")}</p>
          <p class="mt-1 text-sm font-semibold text-slate-600">${escapeHtml(selected.author || "ไม่ระบุผู้แต่ง")}</p>
          <div class="mt-2 flex flex-wrap gap-2 text-[11px] font-black">
            <span class="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-600">${escapeHtml(shelfLabel)}</span>
            <span class="rounded-full border px-2.5 py-1 ${status.badge}">${escapeHtml(status.label)}</span>
            <span class="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-500">${totalAvailable.toLocaleString("th-TH")}/${Math.max(totalCount, totalAvailable).toLocaleString("th-TH")} เล่ม</span>
          </div>
          <p class="mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">แตะปุ่มด้านล่างเพื่อจองหรือยืมต่อ</p>
        </div>
      </div>

      <details class="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-3" ${desc ? "" : "open"}>
        <summary class="cursor-pointer text-xs font-black uppercase tracking-wide text-slate-600">เรื่องย่อ</summary>
        <p class="mt-2 text-sm leading-6 text-slate-600">${escapeHtml(desc || "ยังไม่มีรายละเอียดหนังสือ")}</p>
      </details>

      <section class="rounded-[1.25rem] border border-slate-200 bg-white p-3">
        <div class="mb-3 flex items-center justify-between gap-2">
          <div>
            <p class="text-xs font-black uppercase tracking-wide text-slate-600">สถานะเล่มจริง</p>
            <p class="mt-0.5 text-[11px] font-semibold text-slate-500">เชื่อมกับสถานะคงคลังและพื้นที่จริง</p>
          </div>
          <span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500">ทั้งหมด ${STATE.detailItems.length.toLocaleString("th-TH")} เล่ม</span>
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
                <article class="rounded-[1rem] border border-slate-200 bg-slate-50 p-3">
                  <div class="flex items-center justify-between gap-2">
                    <div>
                      <p class="text-xs font-black text-slate-700">${escapeHtml(it.barcode || "-")}</p>
                      <p class="mt-0.5 text-[11px] font-semibold text-slate-500">ที่เก็บ: ${escapeHtml(it.location || "-")}</p>
                    </div>
                    <span class="rounded-full px-2.5 py-0.5 text-[10px] font-black ${isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}">${escapeHtml(isAvailable ? "ว่าง" : "ไม่ว่าง")}</span>
                  </div>
                  <p class="mt-2 text-[11px] font-semibold text-slate-500">สภาพ: ${escapeHtml(it.condition || "-")}</p>
                  <div class="mt-3 grid grid-cols-2 gap-2">
                    ${isAvailable ? `<button type="button" data-borrow-barcode="${escapeHtml(it.barcode || "")}" class="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100">ยืมเล่มนี้</button>` : `<button type="button" disabled class="rounded-xl border border-slate-200 bg-slate-100 px-2.5 py-2 text-xs font-black text-slate-400">ยืมไม่ได้</button>`}
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
          ? `<button type="button" data-borrow-barcode="${escapeHtml(defaultBarcode)}" class="rounded-[1rem] bg-emerald-600 px-3 py-3 text-sm font-black text-white hover:bg-emerald-700">ยืมด้วยตนเอง</button>`
          : `<button type="button" disabled class="rounded-[1rem] bg-slate-200 px-3 py-3 text-sm font-black text-slate-500">ยังไม่มีเล่มว่าง</button>`}
        <button type="button" data-go-reservation="${escapeHtml(selected.bookId || "")}" data-go-reservation-barcode="${escapeHtml(defaultBarcode)}" class="rounded-[1rem] bg-amber-500 px-3 py-3 text-sm font-black text-white hover:bg-amber-600">จองหนังสือ</button>
        <button type="button" data-close-detail class="rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-sm font-black text-slate-700 hover:bg-slate-100">ปิด</button>
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

  if (window.lucide?.createIcons) {
    window.lucide.createIcons();
  }
}

async function loadCatalog_(root) {
  STATE.loading = true;
  renderAll_(root);

  try {
    const hoursPromise = apiSettingsLibraryHoursList().catch(() => null);
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

    const hoursRes = await hoursPromise;
    STATE.businessHours = hoursRes?.ok
      ? formatBusinessHours_(Array.isArray(hoursRes.data?.items) ? hoursRes.data.items : [])
      : defaultBusinessHours_();

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
    STATE.businessHours = defaultBusinessHours_();
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
    document.body.style.overflow = "hidden";
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
    document.body.style.overflow = "";
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
    <section id="memberBooksRoot" class="member-books-shell view mx-auto w-full max-w-[1440px] space-y-4 px-3 pb-4 sm:px-4 lg:px-6">
      <article class="member-books-hero sticky top-3 z-20 overflow-hidden rounded-[1.75rem] border border-sky-100/80">
        <div class="relative z-10 p-4 sm:p-5">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div class="min-w-0">
              <p class="text-[11px] font-black uppercase tracking-[0.18em] text-sky-600">Member Catalog</p>
              <h2 class="mt-1 text-[clamp(1.4rem,2vw,2.1rem)] font-black leading-tight text-slate-900">ค้นหาหนังสือ</h2>
              <p class="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600 sm:text-[15px]">ค้นหา ดูสถานะเล่มจริง และไปต่อได้ทันทีตามมาตรฐาน responsive 2026</p>
            </div>
            <div class="grid min-w-0 gap-2 sm:grid-cols-2 lg:min-w-[18rem]">
              <div class="rounded-[1.1rem] border border-sky-100 bg-white/90 p-3 shadow-sm">
                <p class="text-[10px] font-black uppercase tracking-[0.16em] text-sky-500">หมวดหมู่</p>
                <p id="memberBooksCategoriesStat" class="mt-1 text-lg font-black text-slate-900">0</p>
              </div>
              <div class="rounded-[1.1rem] border border-sky-100 bg-white/90 p-3 shadow-sm">
                <p class="text-[10px] font-black uppercase tracking-[0.16em] text-sky-500">เล่มพร้อมยืม</p>
                <p id="memberBooksAvailableStat" class="mt-1 text-lg font-black text-slate-900">0</p>
              </div>
            </div>
          </div>

          <div class="member-books-toolbar mt-4">
            <div class="grid gap-2 lg:grid-cols-[1fr_auto]">
              <label class="relative block">
                <span class="sr-only">ค้นหาจากชื่อหนังสือ หรือผู้แต่ง</span>
                <i data-lucide="search" class="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"></i>
                <input id="memberBooksSearchInput" type="search" placeholder="ค้นหาจากชื่อหนังสือ หรือผู้แต่ง" class="w-full rounded-[1.1rem] border border-slate-200 bg-white/95 px-11 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
              </label>
              <div class="flex gap-2">
                <button id="memberBooksGridBtn" type="button" class="member-books-chip inline-flex flex-1 items-center justify-center gap-2 rounded-[1rem] border border-sky-200 bg-sky-50 px-3 py-3 text-xs font-black text-sky-700">
                  <i data-lucide="layout-grid" class="h-4 w-4"></i>
                  Grid
                </button>
                <button id="memberBooksListBtn" type="button" class="member-books-chip inline-flex flex-1 items-center justify-center gap-2 rounded-[1rem] border border-slate-200 bg-white px-3 py-3 text-xs font-black text-slate-600">
                  <i data-lucide="rows-3" class="h-4 w-4"></i>
                  List
                </button>
              </div>
            </div>
            <div id="memberBooksSummary" class="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 lg:justify-end">กำลังเตรียมข้อมูล...</div>
          </div>

          <article class="mt-3 flex items-start gap-3 rounded-[1.2rem] border border-emerald-100 bg-emerald-50/85 p-3 shadow-sm">
            <div class="mt-0.5 rounded-full bg-emerald-100 p-2 text-emerald-600">
              <i data-lucide="clock-3" class="h-4 w-4"></i>
            </div>
            <div class="min-w-0">
              <p class="text-[13px] font-bold leading-tight text-emerald-800">เวลารับหนังสือจอง &amp; ติดต่อเจ้าหน้าที่</p>
              <p id="memberBooksBusinessHours" class="mt-1 text-[11px] font-semibold text-emerald-700/90">จันทร์ - ศุกร์ | 08:30 - 16:30 น.</p>
            </div>
          </article>

          <div class="member-books-chip-row mt-3 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1" id="memberBooksChips"></div>
        </div>
      </article>

      <div class="flex flex-col gap-1 px-1 sm:flex-row sm:items-center sm:justify-between">
        <p class="text-xs font-semibold text-slate-500">แตะหนังสือเพื่อดูรายละเอียดและการทำรายการ</p>
        <p class="text-xs font-semibold text-slate-400">1 / 1 / 2 / 3 / 4 / 5 columns ตาม breakpoint</p>
      </div>

      <div id="memberBooksList" class="min-h-[180px]"></div>

      <div id="memberBooksDetailBackdrop" class="member-books-sheet-backdrop fixed inset-0 z-40 bg-slate-900/45 opacity-0 pointer-events-none"></div>
      <aside id="memberBooksDetailPanel" class="member-books-sheet fixed inset-x-0 bottom-0 z-50 max-h-[88dvh] translate-y-full overflow-hidden rounded-t-[1.75rem] border border-slate-200 bg-white opacity-0 md:inset-y-4 md:right-4 md:left-auto md:w-[min(92vw,560px)] md:max-h-[calc(100dvh-2rem)] md:rounded-[2rem] md:border md:translate-x-full md:translate-y-0">
        <header class="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3.5 sm:px-5">
          <div>
            <p class="text-[10px] font-black uppercase tracking-[0.16em] text-sky-500">Book Detail</p>
            <h3 id="memberBooksDetailTitle" class="text-sm font-black text-slate-900">รายละเอียดหนังสือ</h3>
          </div>
          <button type="button" data-close-detail class="inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 hover:bg-slate-100">ปิด</button>
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
  STATE.businessHours = "";
  STATE.q = "";
  STATE.activeCategory = "all";
  STATE.viewMode = "grid";
  STATE.selectedBookId = "";
  STATE.detailItems = [];

  bindEvents_(root);
  renderAll_(root);
  loadCatalog_(root);
}
