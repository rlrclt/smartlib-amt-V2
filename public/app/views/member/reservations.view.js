import {
  apiReservationsBookContext,
  apiReservationsCancel,
  apiReservationsCreate,
  apiReservationsReschedule,
} from "../../data/api.js";
import {
  MEMBER_SYNC_KEYS,
  getMemberResource,
  revalidateMemberResource,
  subscribeMemberResource,
} from "../../data/member_sync.js";
import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";

const STATE = {
  root: null,
  loading: false,
  submitting: false,
  activeTab: "active",
  reservations: [],
  businessHours: null,
  unsubscribe: null,
  policy: {
    loanDays: 7,
    resQuota: 3,
    holdDays: 2,
  },
  bookingModalOpen: false,
  barcodeModalOpen: false,
  barcodeTarget: null,
  booking: {
    mode: "create", // create | reschedule
    resId: "",
    bookId: "",
    selectedBarcode: "",
    title: "",
    author: "",
    coverUrl: "",
    queueWaiting: 0,
    etaDate: "",
    plannedDate: "",
    duration: 7,
    minDuration: 1,
    maxDuration: 7,
    contextLoading: false,
  },
};
const LOG_PREFIX = "[MemberReservations]";
let jsBarcodeLoaderPromise = null;

function ensureJsBarcodeLoaded_() {
  if (window.JsBarcode) return Promise.resolve();
  if (jsBarcodeLoaderPromise) return jsBarcodeLoaderPromise;
  jsBarcodeLoaderPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-jsbarcode="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("โหลด JsBarcode ไม่สำเร็จ")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "/vendor/jsbarcode.min.js";
    script.async = true;
    script.dataset.jsbarcode = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("โหลด JsBarcode ไม่สำเร็จ"));
    document.head.appendChild(script);
  });
  return jsBarcodeLoaderPromise;
}

function ensureNativeStyles_() {
  if (document.getElementById("memberReservationsNativeStyle")) return;
  const style = document.createElement("style");
  style.id = "memberReservationsNativeStyle";
  style.textContent = `
    #memberReservationsRoot {
      min-height: 100%;
      overflow-x: hidden;
      overscroll-behavior-y: auto;
    }
    .segment-btn.active {
      background-color: white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.10);
    }
    .member-reservation-sheet {
      transition: transform .32s cubic-bezier(0.32, 0.72, 0, 1), opacity .22s ease;
      will-change: transform, opacity;
    }
    .member-reservation-backdrop {
      transition: opacity .22s ease;
    }
    @media (max-width: 767px) {
      #memberReservationFab {
        bottom: calc(env(safe-area-inset-bottom, 0px) + 5.2rem) !important;
      }
      #memberReservationBookingSheet,
      #memberReservationBarcodeSheet {
        bottom: calc(env(safe-area-inset-bottom, 0px) + 4.9rem) !important;
        max-height: calc(100dvh - env(safe-area-inset-bottom, 0px) - 6rem) !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function todayIsoDate_() {
  return new Date().toISOString().slice(0, 10);
}

function parseIsoDate_(value) {
  const d = new Date(String(value || ""));
  return Number.isFinite(d.getTime()) ? d : null;
}

function formatDateShort_(value) {
  const d = parseIsoDate_(value);
  if (!d) return "-";
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
}

function formatDateLong_(value) {
  const d = parseIsoDate_(value);
  if (!d) return "-";
  return d.toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" });
}

function holdCountdownLabel_(holdUntil) {
  const d = parseIsoDate_(holdUntil);
  if (!d) return "-";
  const diff = Math.max(0, d.getTime() - Date.now());
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `อีก ${days} วัน ${hours} ชม.`;
  return `อีก ${Math.max(1, hours)} ชม.`;
}

function activeItems_() {
  return STATE.reservations.filter((x) => {
    const st = String(x.status || "").toLowerCase();
    return st === "waiting" || st === "ready";
  });
}

function historyItems_() {
  return STATE.reservations.filter((x) => {
    const st = String(x.status || "").toLowerCase();
    return st === "completed" || st === "cancelled" || st === "expired";
  });
}

function filteredItems_() {
  return STATE.activeTab === "active" ? activeItems_() : historyItems_();
}

function setTab_(tab) {
  STATE.activeTab = tab === "history" ? "history" : "active";
}

function defaultBusinessHours_() {
  return { label: "เวลารับหนังสือจอง (เคาน์เตอร์)", ranges: ["จันทร์ - ศุกร์ 08:30 - 16:30"] };
}

function parseHm_(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const m = text.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return "";
  const hh = String(m[1]).padStart(2, "0");
  const mm = String(m[2]).padStart(2, "0");
  return `${hh}:${mm}`;
}

function formatBusinessHours_(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) return defaultBusinessHours_();
  const map = new Map();

  rows.forEach((row) => {
    const day = Number(row.dayOfWeek);
    if (!Number.isFinite(day)) return;
    const open = parseHm_(row.openTime || row.open_time);
    const close = parseHm_(row.closeTime || row.close_time);
    if (!open || !close) return;
    const key = `${open}-${close}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(day);
  });

  if (map.size === 0) return defaultBusinessHours_();

  const DAYS = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
  const ranges = [];

  for (const [key, days] of map.entries()) {
    const sorted = Array.from(new Set(days)).sort((a, b) => a - b);
    const labels = [];
    let start = sorted[0];
    let prev = sorted[0];
    for (let i = 1; i < sorted.length; i += 1) {
      const cur = sorted[i];
      if (cur === prev + 1) {
        prev = cur;
        continue;
      }
      labels.push(start === prev ? DAYS[start] : `${DAYS[start]} - ${DAYS[prev]}`);
      start = cur;
      prev = cur;
    }
    labels.push(start === prev ? DAYS[start] : `${DAYS[start]} - ${DAYS[prev]}`);
    ranges.push(`${labels.join(", ")} ${key.replace("-", " - ")}`);
  }

  return { label: "เวลารับหนังสือจอง (เคาน์เตอร์)", ranges };
}

function openBookingModal_(payload) {
  STATE.bookingModalOpen = true;
  STATE.booking.mode = payload.mode || "create";
  STATE.booking.resId = String(payload.resId || "");
  STATE.booking.bookId = String(payload.bookId || "");
  STATE.booking.selectedBarcode = String(payload.selectedBarcode || "");
  STATE.booking.title = String(payload.title || "");
  STATE.booking.author = String(payload.author || "");
  STATE.booking.coverUrl = String(payload.coverUrl || "");
  STATE.booking.queueWaiting = Number(payload.queueWaiting || 0);
  STATE.booking.etaDate = String(payload.etaDate || "");
  STATE.booking.minDuration = 1;
  STATE.booking.maxDuration = Math.max(1, Number(payload.maxDuration || STATE.policy.loanDays || 7));
  STATE.booking.duration = Math.min(STATE.booking.maxDuration, Math.max(1, Number(payload.duration || STATE.policy.loanDays || 7)));
  STATE.booking.plannedDate = String(payload.plannedDate || todayIsoDate_());
  STATE.booking.contextLoading = Boolean(payload.contextLoading);
}

function closeBookingModal_() {
  STATE.bookingModalOpen = false;
  STATE.booking.contextLoading = false;
}

function openBarcodeModal_(reservation) {
  STATE.barcodeTarget = reservation || null;
  STATE.barcodeModalOpen = Boolean(reservation);
}

function closeBarcodeModal_() {
  STATE.barcodeModalOpen = false;
  STATE.barcodeTarget = null;
}

function updateDuration_(delta) {
  const next = STATE.booking.duration + delta;
  if (next < STATE.booking.minDuration || next > STATE.booking.maxDuration) return;
  STATE.booking.duration = next;
  if (navigator?.vibrate) navigator.vibrate(20);
}

function bookingDueDatePreview_() {
  const planned = parseIsoDate_(STATE.booking.plannedDate);
  if (!planned) return "-";
  const due = new Date(planned.getTime());
  due.setDate(due.getDate() + STATE.booking.duration);
  return formatDateLong_(due.toISOString());
}

function shouldWarnEta_() {
  const planned = parseIsoDate_(STATE.booking.plannedDate);
  const eta = parseIsoDate_(STATE.booking.etaDate);
  if (!planned || !eta) return false;
  return planned.getTime() < eta.getTime();
}

function renderTabs_(root) {
  const activeBtn = root.querySelector("#memberReservationTabActive");
  const historyBtn = root.querySelector("#memberReservationTabHistory");
  const indicator = root.querySelector("#memberReservationTabIndicator");
  if (!activeBtn || !historyBtn || !indicator) return;

  const isActiveTab = STATE.activeTab === "active";
  activeBtn.className = `segment-btn pressable relative z-10 flex-1 rounded-xl py-2 text-sm font-black ${isActiveTab ? "active text-slate-700" : "text-slate-500"}`;
  historyBtn.className = `segment-btn pressable relative z-10 flex-1 rounded-xl py-2 text-sm font-black ${!isActiveTab ? "active text-slate-700" : "text-slate-500"}`;
  indicator.style.left = isActiveTab ? "0.25rem" : "calc(50% + 0.125rem)";
}

function renderSummary_(root) {
  const count = root.querySelector("#memberReservationCount");
  const badge = root.querySelector("#memberReservationActiveBadge");
  const hoursEl = root.querySelector("#memberReservationHours");
  if (count) {
    const num = filteredItems_().length;
    count.textContent = `${num} รายการที่${STATE.activeTab === "active" ? "ใช้งานอยู่" : "เคยจอง"}`;
  }
  if (badge) badge.textContent = String(activeItems_().length);
  if (hoursEl) {
    const hours = STATE.businessHours || defaultBusinessHours_();
    const lines = Array.isArray(hours.ranges) && hours.ranges.length ? hours.ranges : defaultBusinessHours_().ranges;
    hoursEl.innerHTML = `
      <div class="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 shadow-sm">
        <div class="flex items-start gap-3">
          <div class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <span class="text-lg">⏰</span>
          </div>
          <div class="min-w-0">
            <p class="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-700">${escapeHtml(hours.label || "เวลารับหนังสือจอง")}</p>
            ${lines.map((line) => `<p class="mt-1 text-[12px] font-bold text-emerald-900">${escapeHtml(line)}</p>`).join("")}
            <p class="mt-1 text-[10px] font-semibold text-emerald-800/70">กรุณามารับภายในเวลาที่กำหนด มิเช่นนั้นคิวจะถูกยกเลิกอัตโนมัติ</p>
          </div>
        </div>
      </div>
    `;
  }
}

function renderCards_(root) {
  const list = root.querySelector("#memberReservationList");
  if (!list) return;

  if (STATE.loading) {
    list.innerHTML = '<p class="rounded-2xl border border-slate-200 bg-white p-5 text-center text-sm font-bold text-slate-500">กำลังโหลดรายการจอง...</p>';
    return;
  }

  const rows = filteredItems_();
  if (!rows.length) {
    list.innerHTML = `
      <article class="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-8 text-center">
        <p class="text-lg font-black text-slate-700">ยังไม่มีรายการจอง</p>
        <p class="mt-2 text-sm font-semibold text-slate-500">ค้นหาหนังสือที่สนใจแล้วกดจองได้เลย</p>
        <a data-link href="/app/books" class="mt-4 inline-flex rounded-xl bg-slate-900 px-4 py-2 text-xs font-black text-white">ไปหน้าค้นหาหนังสือ</a>
      </article>
    `;
    return;
  }

  list.innerHTML = rows.map((item) => {
    const status = String(item.status || "").toLowerCase();
    const cover = item.coverUrl
      ? `<img src="${escapeHtml(item.coverUrl)}" alt="${escapeHtml(item.bookTitle || item.bookId || "Book")}" class="h-full w-full object-cover" loading="lazy" />`
      : '<div class="h-full w-full bg-gradient-to-br from-slate-100 to-slate-200"></div>';
    if (status === "ready") {
      return `
        <article class="relative overflow-hidden rounded-[1.4rem] border-2 border-emerald-400 bg-white p-3 shadow-lg shadow-emerald-100/70">
          <p class="absolute right-0 top-0 rounded-bl-xl bg-emerald-500 px-3 py-1 text-[10px] font-black text-white">พร้อมรับแล้ว</p>
          <div class="flex gap-3">
            <div class="h-20 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">${cover}</div>
            <div class="min-w-0 flex-1 pt-1">
              <p class="line-clamp-2 text-sm font-black text-slate-800">${escapeHtml(item.bookTitle || item.bookId || "-")}</p>
              <p class="mt-0.5 text-[11px] font-semibold text-slate-400">คิวของคุณถึงแล้ว มารับที่เคาน์เตอร์</p>
              <p class="mt-1.5 text-[11px] font-black text-rose-600">หมดเขตรับ: ${escapeHtml(formatDateShort_(item.holdUntil))} (${escapeHtml(holdCountdownLabel_(item.holdUntil))})</p>
              <div class="mt-2 grid grid-cols-2 gap-2">
                <button type="button" data-action="show-code" data-id="${escapeHtml(item.resId || "")}" class="rounded-xl bg-emerald-50 px-2 py-2 text-[11px] font-black text-emerald-700">แสดงรหัสการจอง</button>
                <button type="button" data-action="cancel" data-id="${escapeHtml(item.resId || "")}" class="rounded-xl border border-rose-200 bg-white px-2 py-2 text-[11px] font-black text-rose-600">ยกเลิก</button>
              </div>
            </div>
          </div>
        </article>
      `;
    }
    if (status === "waiting") {
      return `
        <article class="rounded-[1.4rem] border border-amber-300 bg-white p-3 shadow-sm">
          <div class="flex gap-3">
            <div class="h-20 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">${cover}</div>
            <div class="min-w-0 flex-1 pt-1">
              <div class="flex items-start justify-between gap-2">
                <p class="line-clamp-2 text-sm font-black text-slate-800">${escapeHtml(item.bookTitle || item.bookId || "-")}</p>
                <span class="rounded-lg bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">คิวที่ ${escapeHtml(String(item.queuePos || 1))}</span>
              </div>
              <p class="mt-0.5 text-[11px] font-semibold text-slate-500">คาดว่าจะว่าง: ${escapeHtml(formatDateShort_(item.etaDate))}</p>
              <p class="mt-0.5 text-[10px] font-semibold text-slate-400">วันอาจเปลี่ยนหากผู้ยืมปัจจุบันต่ออายุ</p>
              <div class="mt-2 grid grid-cols-2 gap-2">
                <button type="button" data-action="cancel" data-id="${escapeHtml(item.resId || "")}" class="rounded-xl border border-rose-200 bg-white px-2 py-2 text-[11px] font-black text-rose-600">ยกเลิก</button>
                <button type="button" data-action="reschedule" data-id="${escapeHtml(item.resId || "")}" class="rounded-xl bg-slate-900 px-2 py-2 text-[11px] font-black text-white">นัดหมายวันรับ</button>
              </div>
            </div>
          </div>
        </article>
      `;
    }

    const histLabel = status === "completed" ? "รับแล้ว" : (status === "expired" ? "หมดเวลา" : "ยกเลิกแล้ว");
    const badgeCls = status === "completed" ? "bg-slate-100 text-slate-600" : "bg-rose-50 text-rose-500";
    return `
      <article class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 opacity-80">
        <div class="h-14 w-10 overflow-hidden rounded-md border border-slate-200 bg-slate-100">${cover}</div>
        <div class="min-w-0 flex-1">
          <p class="line-clamp-1 text-xs font-black text-slate-700">${escapeHtml(item.bookTitle || item.bookId || "-")}</p>
          <span class="mt-1 inline-block rounded-lg px-2 py-0.5 text-[10px] font-black ${badgeCls}">${histLabel}</span>
        </div>
      </article>
    `;
  }).join("");
}

function renderBookingModal_(root) {
  const backdrop = root.querySelector("#memberReservationBookingBackdrop");
  const sheet = root.querySelector("#memberReservationBookingSheet");
  if (!backdrop || !sheet) return;

  backdrop.className = `member-reservation-backdrop fixed inset-0 z-40 bg-black/45 ${STATE.bookingModalOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`;
  sheet.className = `member-reservation-sheet fixed inset-x-0 bottom-0 z-50 overflow-y-auto rounded-t-[28px] border border-slate-200 bg-white p-4 ${STATE.bookingModalOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`;

  const title = root.querySelector("#memberReservationBookingTitle");
  const subtitle = root.querySelector("#memberReservationBookingSub");
  const plannedDate = root.querySelector("#memberReservationPlannedDate");
  const duration = root.querySelector("#memberReservationDuration");
  const duePreview = root.querySelector("#memberReservationDuePreview");
  const etaWarn = root.querySelector("#memberReservationEtaWarn");
  const etaWarnText = root.querySelector("#memberReservationEtaWarnText");
  const btnMinus = root.querySelector("#memberReservationMinus");
  const btnPlus = root.querySelector("#memberReservationPlus");
  const confirm = root.querySelector("#memberReservationConfirm");

  if (title) title.textContent = STATE.booking.title || "นัดหมายวันเข้ายืม";
  if (subtitle) {
    const base = STATE.booking.contextLoading
      ? "กำลังโหลดรายละเอียดสำหรับจอง โปรดรอสักครู่..."
      : (STATE.booking.queueWaiting > 0
        ? `มีคิวรอ ${STATE.booking.queueWaiting} ท่าน · คาดว่าจะว่าง ${formatDateShort_(STATE.booking.etaDate)}`
        : "ว่าง พร้อมล็อคเล่มทันที");
    subtitle.textContent = STATE.booking.selectedBarcode
      ? `${base} · เล่มที่เลือก ${STATE.booking.selectedBarcode}`
      : base;
  }
  if (plannedDate) {
    plannedDate.value = STATE.booking.plannedDate || todayIsoDate_();
    plannedDate.disabled = STATE.submitting || STATE.booking.contextLoading;
  }
  if (duration) duration.textContent = `${STATE.booking.duration} วัน`;
  if (duePreview) duePreview.textContent = `จะครบกำหนดคืนวันที่ ${bookingDueDatePreview_()}`;
  if (etaWarn && etaWarnText) {
    const show = shouldWarnEta_();
    etaWarn.classList.toggle("hidden", !show);
    etaWarnText.textContent = show
      ? "หนังสืออาจยังไม่ว่างในวันดังกล่าว คุณต้องการจองคิวต่อหรือไม่?"
      : "";
  }
  if (btnMinus) btnMinus.disabled = STATE.booking.contextLoading || STATE.booking.duration <= STATE.booking.minDuration || STATE.submitting;
  if (btnPlus) btnPlus.disabled = STATE.booking.contextLoading || STATE.booking.duration >= STATE.booking.maxDuration || STATE.submitting;
  if (confirm) {
    confirm.disabled = STATE.submitting || STATE.booking.contextLoading || !STATE.booking.bookId;
    confirm.textContent = STATE.submitting
      ? "กำลังบันทึก..."
      : (STATE.booking.contextLoading
        ? "กำลังโหลดข้อมูล..."
        : (STATE.booking.mode === "reschedule" ? "ยืนยันการแก้ไขนัดหมาย" : "ยืนยันการนัดหมาย"));
  }
}

function renderBarcodeModal_(root) {
  const backdrop = root.querySelector("#memberReservationBarcodeBackdrop");
  const sheet = root.querySelector("#memberReservationBarcodeSheet");
  const code = root.querySelector("#memberReservationBarcodeCode");
  const barcodeSvg = root.querySelector("#memberReservationBarcodeSvg");
  const barcodeWrap = root.querySelector("#memberReservationBarcodeWrap");
  const expiry = root.querySelector("#memberReservationBarcodeExpiry");
  if (!backdrop || !sheet || !code || !expiry || !barcodeSvg || !barcodeWrap) return;

  backdrop.className = `member-reservation-backdrop fixed inset-0 z-40 bg-black/45 ${STATE.barcodeModalOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`;
  sheet.className = `member-reservation-sheet fixed inset-x-0 bottom-0 z-50 overflow-hidden rounded-t-[28px] border border-slate-200 bg-white p-5 ${STATE.barcodeModalOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`;

  const target = STATE.barcodeTarget;
  const reservationCode = String(target?.resId || "RS-0000").trim();
  code.textContent = reservationCode;
  expiry.textContent = `หมดเขต: ${formatDateLong_(target?.holdUntil)}`;

  try {
    if (window.JsBarcode && reservationCode) {
      window.JsBarcode(barcodeSvg, reservationCode, {
        format: "CODE128",
        displayValue: false,
        height: 58,
        width: 2,
        margin: 2,
        lineColor: "#0f172a",
      });
      barcodeWrap.classList.remove("hidden");
    } else {
      barcodeWrap.classList.add("hidden");
      if (STATE.barcodeModalOpen) {
        ensureJsBarcodeLoaded_()
          .then(() => renderBarcodeModal_(root))
          .catch((err) => console.warn(`${LOG_PREFIX} jsbarcode load failed`, err?.message || err));
      }
    }
  } catch (err) {
    console.warn(`${LOG_PREFIX} barcode render failed`, err);
    barcodeWrap.classList.add("hidden");
  }
}

function renderAll_(root) {
  renderSummary_(root);
  renderTabs_(root);
  renderCards_(root);
  renderBookingModal_(root);
  renderBarcodeModal_(root);
}

async function loadReservations_(root) {
  STATE.loading = true;
  renderAll_(root);
  try {
    const cached = getMemberResource(MEMBER_SYNC_KEYS.reservations);
    if (cached) {
      console.log(`${LOG_PREFIX} use cached reservations bundle`);
      applyReservationsBundle_(cached);
      void revalidateMemberResource(MEMBER_SYNC_KEYS.reservations, { force: true });
    } else {
      console.log(`${LOG_PREFIX} cache miss -> force revalidate`);
      const res = await revalidateMemberResource(MEMBER_SYNC_KEYS.reservations, { force: true });
      if (!res?.ok || !res.data) throw new Error(res?.error || "โหลดรายการจองไม่สำเร็จ");
      applyReservationsBundle_(res.data);
    }

    STATE.booking.maxDuration = Math.max(1, Number(STATE.policy.loanDays || 7));
    if (STATE.booking.duration > STATE.booking.maxDuration) {
      STATE.booking.duration = STATE.booking.maxDuration;
    }
  } catch (err) {
    STATE.reservations = [];
    STATE.businessHours = defaultBusinessHours_();
    showToast(err?.message || "โหลดรายการจองไม่สำเร็จ");
  } finally {
    STATE.loading = false;
    renderAll_(root);
  }
}

function applyReservationsBundle_(data) {
  STATE.reservations = Array.isArray(data?.reservations) ? data.reservations : [];
  STATE.policy = data?.policy || STATE.policy;
  STATE.businessHours = data?.businessHours || defaultBusinessHours_();
}

async function openBookingByBookId_(root, bookId, barcode = "") {
  const id = String(bookId || "").trim();
  const selectedBarcode = String(barcode || "").trim();
  if (!id && !selectedBarcode) return;
  openBookingModal_({
    mode: "create",
    bookId: id,
    selectedBarcode,
    title: "กำลังเตรียมข้อมูลหนังสือ...",
    author: "",
    coverUrl: "",
    queueWaiting: 0,
    etaDate: "",
    plannedDate: todayIsoDate_(),
    duration: Math.max(1, Number(STATE.policy.loanDays || 7)),
    maxDuration: Math.max(1, Number(STATE.policy.loanDays || 7)),
    contextLoading: true,
  });
  renderAll_(root);
  try {
    const res = await apiReservationsBookContext({ bookId: id, barcode: selectedBarcode });
    if (!res?.ok) throw new Error(res?.error || "โหลดข้อมูลหนังสือสำหรับจองไม่สำเร็จ");
    const data = res.data || {};
    const policy = data.policy || STATE.policy;
    const pickedBarcode = String(data.selectedItem?.barcode || selectedBarcode || "");
    openBookingModal_({
      mode: "create",
      bookId: String(data.book?.bookId || id),
      selectedBarcode: pickedBarcode,
      title: String(data.book?.title || id),
      author: String(data.book?.author || ""),
      coverUrl: String(data.book?.coverUrl || ""),
      queueWaiting: Number(data.queue?.waitingCount || 0),
      etaDate: String(data.queue?.etaDate || ""),
      plannedDate: todayIsoDate_(),
      duration: Math.max(1, Number(policy.loanDays || STATE.policy.loanDays || 7)),
      maxDuration: Math.max(1, Number(policy.loanDays || STATE.policy.loanDays || 7)),
      contextLoading: false,
    });
    if (window.location.search) {
      window.history.replaceState({}, "", "/app/reservations");
    }
    renderAll_(root);
  } catch (err) {
    showToast(err?.message || "เปิดฟอร์มจองไม่สำเร็จ");
  }
}

function findReservation_(resId) {
  const id = String(resId || "");
  return STATE.reservations.find((x) => String(x.resId || "") === id) || null;
}

async function submitBooking_(root) {
  if (STATE.submitting) return;
  if (!STATE.booking.bookId) {
    showToast("ไม่พบข้อมูลหนังสือสำหรับจอง");
    return;
  }
  STATE.submitting = true;
  renderAll_(root);
  try {
    const payload = {
      bookId: STATE.booking.bookId,
      barcode: STATE.booking.selectedBarcode,
      plannedDate: STATE.booking.plannedDate || todayIsoDate_(),
      plannedDuration: STATE.booking.duration,
    };
    const res = STATE.booking.mode === "reschedule"
      ? await apiReservationsReschedule({ ...payload, resId: STATE.booking.resId })
      : await apiReservationsCreate(payload);
    if (!res?.ok) throw new Error(res?.error || "บันทึกการนัดหมายไม่สำเร็จ");

    if (navigator?.vibrate) navigator.vibrate([50, 30, 80]);
    showToast(STATE.booking.mode === "reschedule" ? "อัปเดตนัดหมายสำเร็จ" : "จองหนังสือสำเร็จ");
    closeBookingModal_();
    console.log(`${LOG_PREFIX} mutation success -> revalidate reservations`);
    const syncRes = await revalidateMemberResource(MEMBER_SYNC_KEYS.reservations, { force: true });
    if (syncRes?.ok && syncRes.data) applyReservationsBundle_(syncRes.data);
    renderAll_(root);
  } catch (err) {
    showToast(err?.message || "บันทึกการนัดหมายไม่สำเร็จ");
  } finally {
    STATE.submitting = false;
    renderAll_(root);
  }
}

async function cancelReservation_(root, resId) {
  const target = findReservation_(resId);
  if (!target) return;
  if (!window.confirm("ยืนยันยกเลิกรายการจองนี้?")) return;
  try {
    const res = await apiReservationsCancel({ resId: target.resId });
    if (!res?.ok) throw new Error(res?.error || "ยกเลิกรายการไม่สำเร็จ");
    showToast("ยกเลิกการจองแล้ว");
    console.log(`${LOG_PREFIX} cancel success -> revalidate reservations`);
    const syncRes = await revalidateMemberResource(MEMBER_SYNC_KEYS.reservations, { force: true });
    if (syncRes?.ok && syncRes.data) applyReservationsBundle_(syncRes.data);
    renderAll_(root);
  } catch (err) {
    showToast(err?.message || "ยกเลิกรายการไม่สำเร็จ");
  }
}

function readQueryBookId_() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    return {
      bookId: String(params.get("bookId") || "").trim(),
      barcode: String(params.get("barcode") || "").trim(),
    };
  } catch {
    return { bookId: "", barcode: "" };
  }
}

function bindEvents_(root) {
  const tabActive = root.querySelector("#memberReservationTabActive");
  const tabHistory = root.querySelector("#memberReservationTabHistory");
  const list = root.querySelector("#memberReservationList");
  const bookingBackdrop = root.querySelector("#memberReservationBookingBackdrop");
  const barcodeBackdrop = root.querySelector("#memberReservationBarcodeBackdrop");
  const closeBooking = root.querySelector("#memberReservationCloseBooking");
  const closeBarcode = root.querySelector("#memberReservationCloseBarcode");
  const plannedDate = root.querySelector("#memberReservationPlannedDate");
  const minusBtn = root.querySelector("#memberReservationMinus");
  const plusBtn = root.querySelector("#memberReservationPlus");
  const confirmBtn = root.querySelector("#memberReservationConfirm");
  const fab = root.querySelector("#memberReservationFab");

  tabActive?.addEventListener("click", () => {
    setTab_("active");
    renderAll_(root);
  });
  tabHistory?.addEventListener("click", () => {
    setTab_("history");
    renderAll_(root);
  });

  list?.addEventListener("click", (event) => {
    const showCode = event.target.closest("button[data-action='show-code']");
    if (showCode) {
      const row = findReservation_(showCode.getAttribute("data-id"));
      if (row) {
        openBarcodeModal_(row);
        renderAll_(root);
        ensureJsBarcodeLoaded_()
          .then(() => renderAll_(root))
          .catch((err) => console.warn(`${LOG_PREFIX} jsbarcode load failed`, err?.message || err));
      }
      return;
    }
    const reschedule = event.target.closest("button[data-action='reschedule']");
    if (reschedule) {
      const row = findReservation_(reschedule.getAttribute("data-id"));
      if (!row) return;
      openBookingModal_({
        mode: "reschedule",
        resId: row.resId,
        bookId: row.bookId,
        selectedBarcode: row.reservedBarcode || "",
        title: row.bookTitle,
        author: row.bookAuthor,
        coverUrl: row.coverUrl,
        queueWaiting: Math.max(0, Number(row.queuePos || 1) - 1),
        etaDate: row.etaDate,
        plannedDate: row.plannedDate || todayIsoDate_(),
        duration: row.plannedDuration || STATE.policy.loanDays,
        maxDuration: STATE.policy.loanDays || 7,
      });
      renderAll_(root);
      return;
    }
    const cancel = event.target.closest("button[data-action='cancel']");
    if (cancel) {
      cancelReservation_(root, cancel.getAttribute("data-id"));
    }
  });

  bookingBackdrop?.addEventListener("click", () => {
    if (STATE.submitting) return;
    closeBookingModal_();
    renderAll_(root);
  });
  closeBooking?.addEventListener("click", () => {
    if (STATE.submitting) return;
    closeBookingModal_();
    renderAll_(root);
  });
  barcodeBackdrop?.addEventListener("click", () => {
    closeBarcodeModal_();
    renderAll_(root);
  });
  closeBarcode?.addEventListener("click", () => {
    closeBarcodeModal_();
    renderAll_(root);
  });

  plannedDate?.addEventListener("change", (event) => {
    STATE.booking.plannedDate = String(event.target.value || todayIsoDate_());
    renderAll_(root);
  });
  minusBtn?.addEventListener("click", () => {
    updateDuration_(-1);
    renderAll_(root);
  });
  plusBtn?.addEventListener("click", () => {
    updateDuration_(1);
    renderAll_(root);
  });
  confirmBtn?.addEventListener("click", () => {
    submitBooking_(root);
  });

  fab?.addEventListener("click", () => {
    window.history.pushState({}, "", "/app/books");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
}

export function renderMemberReservationsView() {
  return `
    <section id="memberReservationsRoot" class="member-page-container view relative">
      <div class="space-y-4">
        <div id="memberReservationHours"></div>

        <div class="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
          <div class="relative flex items-center rounded-2xl bg-slate-100 p-1">
            <button id="memberReservationTabActive" type="button" class="segment-btn pressable relative z-10 flex-1 rounded-xl py-2 text-sm font-black text-slate-700">
              ใช้งานอยู่ <span id="memberReservationActiveBadge" class="ml-1 rounded-md bg-sky-100 px-1.5 py-0.5 text-[10px] font-black text-sky-700">0</span>
            </button>
            <button id="memberReservationTabHistory" type="button" class="segment-btn pressable relative z-10 flex-1 rounded-xl py-2 text-sm font-black text-slate-500">
              ประวัติการจอง
            </button>
            <span id="memberReservationTabIndicator" class="pointer-events-none absolute top-1 h-[calc(100%-0.5rem)] w-[calc(50%-0.25rem)] rounded-xl bg-white shadow-sm transition-all duration-300"></span>
          </div>
          <div class="mt-2 flex items-center justify-between px-1 pb-1">
            <p id="memberReservationCount" class="text-[11px] font-semibold text-slate-500">0 รายการที่ใช้งานอยู่</p>
            <button id="memberReservationRefresh" type="button" class="pressable inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-700">
              <span aria-hidden="true">↻</span> รีเฟรช
            </button>
          </div>
        </div>
      </div>

      <main id="memberReservationList" class="mt-4 space-y-3"></main>

      <button id="memberReservationFab" type="button" class="fixed bottom-24 right-4 z-30 rounded-full bg-slate-900 px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/20 lg:bottom-6 lg:right-8">+ จองหนังสือใหม่</button>

      <div id="memberReservationBookingBackdrop" class="member-reservation-backdrop fixed inset-0 z-40 bg-black/45 opacity-0 pointer-events-none"></div>
      <aside id="memberReservationBookingSheet" class="member-reservation-sheet fixed inset-x-0 bottom-0 z-50 max-h-[86dvh] translate-y-full overflow-y-auto rounded-t-[28px] border border-slate-200 bg-white p-4 opacity-0">
        <div class="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200"></div>
        <div class="mb-4 flex items-start justify-between gap-2">
          <div>
            <p class="text-lg font-black text-slate-800" id="memberReservationBookingTitle">นัดหมายวันเข้ายืม</p>
            <p class="text-xs font-semibold text-slate-500" id="memberReservationBookingSub">กำลังโหลด...</p>
          </div>
          <button id="memberReservationCloseBooking" type="button" class="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-600">ปิด</button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">วันที่เข้ามายืม</label>
            <input id="memberReservationPlannedDate" type="date" class="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-800" />
          </div>

          <div id="memberReservationEtaWarn" class="hidden rounded-2xl border border-amber-200 bg-amber-50 p-3">
            <p class="text-[11px] font-black uppercase tracking-tight text-amber-800">คำเตือน ETA</p>
            <p id="memberReservationEtaWarnText" class="mt-0.5 text-[11px] font-semibold text-amber-700"></p>
          </div>

          <div>
            <label class="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">จำนวนวันยืม</label>
            <div class="flex items-center justify-between rounded-2xl bg-slate-50 p-2">
              <button id="memberReservationMinus" type="button" class="h-10 w-10 rounded-xl bg-white text-lg font-black text-slate-700 shadow-sm">-</button>
              <p id="memberReservationDuration" class="text-lg font-black text-slate-800">7 วัน</p>
              <button id="memberReservationPlus" type="button" class="h-10 w-10 rounded-xl bg-white text-lg font-black text-slate-700 shadow-sm">+</button>
            </div>
            <p id="memberReservationDuePreview" class="mt-2 text-center text-[11px] font-bold italic text-slate-400">จะครบกำหนดคืนวันที่ -</p>
          </div>

          <p class="text-center text-[10px] font-semibold italic text-slate-300">วันเวลาอาจมีการเปลี่ยนแปลงหากผู้ยืมปัจจุบันทำการต่ออายุ</p>

          <button id="memberReservationConfirm" type="button" class="w-full rounded-2xl bg-slate-900 py-3 text-sm font-black text-white">ยืนยันการนัดหมาย</button>
        </div>
      </aside>

      <div id="memberReservationBarcodeBackdrop" class="member-reservation-backdrop fixed inset-0 z-40 bg-black/45 opacity-0 pointer-events-none"></div>
      <aside id="memberReservationBarcodeSheet" class="member-reservation-sheet fixed inset-x-0 bottom-0 z-50 max-h-[70dvh] translate-y-full overflow-hidden rounded-t-[28px] border border-slate-200 bg-white p-5 opacity-0">
        <div class="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200"></div>
        <p class="text-center text-lg font-black text-slate-800">รหัสการจองของคุณ</p>
        <p class="mb-6 text-center text-sm font-semibold text-slate-400">แสดงให้เจ้าหน้าที่สแกนเพื่อรับหนังสือ</p>
        <div id="memberReservationBarcodeWrap" class="mb-3 rounded-2xl border border-slate-200 bg-white p-3">
          <svg id="memberReservationBarcodeSvg" class="mx-auto block h-[64px] w-full max-w-[320px]" role="img" aria-label="reservation barcode"></svg>
        </div>
        <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
          <p id="memberReservationBarcodeCode" class="font-mono text-2xl font-black tracking-[0.18em] text-slate-700">RS-0000</p>
        </div>
        <p id="memberReservationBarcodeExpiry" class="mt-4 text-center text-xs font-black uppercase tracking-wide text-rose-600">หมดเขต: -</p>
        <button id="memberReservationCloseBarcode" type="button" class="mt-6 w-full rounded-2xl border border-slate-200 bg-white py-3 text-sm font-black text-slate-700">ปิด</button>
      </aside>
    </section>
  `;
}

export function mountMemberReservationsView(container) {
  STATE.unsubscribe?.();
  const root = container.querySelector("#memberReservationsRoot");
  if (!root) return;
  ensureNativeStyles_();
  void ensureJsBarcodeLoaded_().catch((err) => console.warn(`${LOG_PREFIX} jsbarcode preload failed`, err?.message || err));

  STATE.root = root;
  STATE.loading = false;
  STATE.submitting = false;
  STATE.activeTab = "active";
  STATE.reservations = [];
  STATE.businessHours = null;
  STATE.bookingModalOpen = false;
  STATE.barcodeModalOpen = false;
  STATE.barcodeTarget = null;
  STATE.unsubscribe = null;
  STATE.booking = {
    mode: "create",
    resId: "",
    bookId: "",
    selectedBarcode: "",
    title: "",
    author: "",
    coverUrl: "",
    queueWaiting: 0,
    etaDate: "",
    plannedDate: todayIsoDate_(),
    duration: 7,
    minDuration: 1,
    maxDuration: 7,
    contextLoading: false,
  };

  bindEvents_(root);
  root.querySelector("#memberReservationRefresh")?.addEventListener("click", async () => {
    if (STATE.loading || STATE.submitting) return;
    STATE.loading = true;
    renderAll_(root);
    try {
      const syncRes = await revalidateMemberResource(MEMBER_SYNC_KEYS.reservations, { force: true });
      if (!syncRes?.ok || !syncRes.data) throw new Error(syncRes?.error || "รีเฟรชข้อมูลไม่สำเร็จ");
      applyReservationsBundle_(syncRes.data);
    } finally {
      STATE.loading = false;
      renderAll_(root);
    }
  });

  STATE.unsubscribe = subscribeMemberResource(MEMBER_SYNC_KEYS.reservations, (newData) => {
    if (!newData || STATE.root !== root) return;
    applyReservationsBundle_(newData);
    STATE.booking.maxDuration = Math.max(1, Number(STATE.policy.loanDays || 7));
    if (STATE.booking.duration > STATE.booking.maxDuration) {
      STATE.booking.duration = STATE.booking.maxDuration;
    }
    renderAll_(root);
  });
  renderAll_(root);

  const query = readQueryBookId_();
  if (query.bookId || query.barcode) {
    void openBookingByBookId_(root, query.bookId, query.barcode);
  }
  void loadReservations_(root);
}
