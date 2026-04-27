import {
  apiReservationsBookContext,
  apiReservationsCancel,
  apiReservationsCreate,
  apiReservationsList,
  apiReservationsReschedule,
} from "../../data/api.js";
import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";

const STATE = {
  root: null,
  loading: false,
  submitting: false,
  activeTab: "active",
  reservations: [],
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
  },
};

function ensureNativeStyles_() {
  if (document.getElementById("memberReservationsNativeStyle")) return;
  const style = document.createElement("style");
  style.id = "memberReservationsNativeStyle";
  style.textContent = `
    #memberReservationsRoot {
      min-height: calc(100dvh - env(safe-area-inset-bottom, 0px));
      overscroll-behavior: contain;
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
}

function closeBookingModal_() {
  STATE.bookingModalOpen = false;
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
  activeBtn.className = `relative z-10 flex-1 py-2 text-sm ${isActiveTab ? "font-black text-slate-900" : "font-semibold text-slate-400"}`;
  historyBtn.className = `relative z-10 flex-1 py-2 text-sm ${!isActiveTab ? "font-black text-slate-900" : "font-semibold text-slate-400"}`;
  indicator.style.left = isActiveTab ? "0%" : "50%";
}

function renderHeader_(root) {
  const count = root.querySelector("#memberReservationCount");
  if (!count) return;
  const num = filteredItems_().length;
  count.textContent = `${num} รายการที่${STATE.activeTab === "active" ? "ใช้งานอยู่" : "เคยจอง"}`;
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
    const base = STATE.booking.queueWaiting > 0
      ? `มีคิวรอ ${STATE.booking.queueWaiting} ท่าน · คาดว่าจะว่าง ${formatDateShort_(STATE.booking.etaDate)}`
      : "ว่าง พร้อมล็อคเล่มทันที";
    subtitle.textContent = STATE.booking.selectedBarcode
      ? `${base} · เล่มที่เลือก ${STATE.booking.selectedBarcode}`
      : base;
  }
  if (plannedDate) plannedDate.value = STATE.booking.plannedDate || todayIsoDate_();
  if (duration) duration.textContent = `${STATE.booking.duration} วัน`;
  if (duePreview) duePreview.textContent = `จะครบกำหนดคืนวันที่ ${bookingDueDatePreview_()}`;
  if (etaWarn && etaWarnText) {
    const show = shouldWarnEta_();
    etaWarn.classList.toggle("hidden", !show);
    etaWarnText.textContent = show
      ? "หนังสืออาจยังไม่ว่างในวันดังกล่าว คุณต้องการจองคิวต่อหรือไม่?"
      : "";
  }
  if (btnMinus) btnMinus.disabled = STATE.booking.duration <= STATE.booking.minDuration || STATE.submitting;
  if (btnPlus) btnPlus.disabled = STATE.booking.duration >= STATE.booking.maxDuration || STATE.submitting;
  if (confirm) {
    confirm.disabled = STATE.submitting || !STATE.booking.bookId;
    confirm.textContent = STATE.submitting
      ? "กำลังบันทึก..."
      : (STATE.booking.mode === "reschedule" ? "ยืนยันการแก้ไขนัดหมาย" : "ยืนยันการนัดหมาย");
  }
}

function renderBarcodeModal_(root) {
  const backdrop = root.querySelector("#memberReservationBarcodeBackdrop");
  const sheet = root.querySelector("#memberReservationBarcodeSheet");
  const code = root.querySelector("#memberReservationBarcodeCode");
  const expiry = root.querySelector("#memberReservationBarcodeExpiry");
  if (!backdrop || !sheet || !code || !expiry) return;

  backdrop.className = `member-reservation-backdrop fixed inset-0 z-40 bg-black/45 ${STATE.barcodeModalOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`;
  sheet.className = `member-reservation-sheet fixed inset-x-0 bottom-0 z-50 overflow-hidden rounded-t-[28px] border border-slate-200 bg-white p-5 ${STATE.barcodeModalOpen ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`;

  const target = STATE.barcodeTarget;
  code.textContent = target?.resId || "RS-0000";
  expiry.textContent = `หมดเขต: ${formatDateLong_(target?.holdUntil)}`;
}

function renderAll_(root) {
  renderHeader_(root);
  renderTabs_(root);
  renderCards_(root);
  renderBookingModal_(root);
  renderBarcodeModal_(root);
}

async function loadReservations_(root) {
  STATE.loading = true;
  renderAll_(root);
  try {
    const res = await apiReservationsList({ filter: "all" });
    if (!res?.ok) throw new Error(res?.error || "โหลดรายการจองไม่สำเร็จ");
    STATE.reservations = Array.isArray(res.data?.items) ? res.data.items : [];
    STATE.policy = res.data?.policy || STATE.policy;
    STATE.booking.maxDuration = Math.max(1, Number(STATE.policy.loanDays || 7));
    if (STATE.booking.duration > STATE.booking.maxDuration) {
      STATE.booking.duration = STATE.booking.maxDuration;
    }
  } catch (err) {
    STATE.reservations = [];
    showToast(err?.message || "โหลดรายการจองไม่สำเร็จ");
  } finally {
    STATE.loading = false;
    renderAll_(root);
  }
}

async function openBookingByBookId_(root, bookId, barcode = "") {
  const id = String(bookId || "").trim();
  const selectedBarcode = String(barcode || "").trim();
  if (!id && !selectedBarcode) return;
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
    await loadReservations_(root);
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
    await loadReservations_(root);
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
    <section id="memberReservationsRoot" class="view relative overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50">
      <header class="border-b border-slate-100 bg-white px-4 py-3">
        <h2 class="text-xl font-black text-slate-800">การจองของฉัน</h2>
        <p id="memberReservationCount" class="mt-0.5 text-[11px] font-medium text-slate-400">0 รายการที่ใช้งานอยู่</p>
      </header>

      <nav class="relative border-b border-slate-100 bg-white px-4">
        <div class="relative flex">
          <button id="memberReservationTabActive" type="button" class="relative z-10 flex-1 py-2 text-sm font-black text-slate-900">รายการปัจจุบัน</button>
          <button id="memberReservationTabHistory" type="button" class="relative z-10 flex-1 py-2 text-sm font-semibold text-slate-400">ประวัติการจอง</button>
          <span id="memberReservationTabIndicator" class="absolute bottom-0 left-0 h-[2px] w-1/2 bg-slate-900 transition-all duration-300"></span>
        </div>
      </nav>

      <main id="memberReservationList" class="space-y-3 overflow-y-auto p-4 pb-28"></main>

      <button id="memberReservationFab" type="button" class="fixed bottom-6 right-4 z-30 rounded-full bg-slate-900 px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/20">+ จองหนังสือใหม่</button>

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
  const root = container.querySelector("#memberReservationsRoot");
  if (!root) return;
  ensureNativeStyles_();

  STATE.root = root;
  STATE.loading = false;
  STATE.submitting = false;
  STATE.activeTab = "active";
  STATE.reservations = [];
  STATE.bookingModalOpen = false;
  STATE.barcodeModalOpen = false;
  STATE.barcodeTarget = null;
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
  };

  bindEvents_(root);
  renderAll_(root);

  loadReservations_(root).then(() => {
    const query = readQueryBookId_();
    if (!query.bookId && !query.barcode) return;
    openBookingByBookId_(root, query.bookId, query.barcode);
  });
}
