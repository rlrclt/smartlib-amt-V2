import {
  apiBooksCatalogGet,
  apiLoansSelfBootstrap,
  apiLoansSelfCreate,
  apiLoansSelfReturn,
  apiLoansSelfValidate,
  apiSettingsLocationsCheck,
} from "../../data/api.js";
import { closeScanner, isScannerSupported, openScanner } from "../../components/scanner_module.js";
import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";

const TRACKING_REFRESH_MS = 4000;
const GEO_TIMEOUT_MS = 12000;
const FLASH_MS = 1200;
const GEO_FASTPASS_ACCURACY = 45; // Increased for better indoor performance per FIX_GPS_INSTABILITY.md
const GEO_STABLE_ACCURACY = 80;   // Increased for better indoor reliability per FIX_GPS_INSTABILITY.md
const GEO_MAX_SAMPLE_ACCURACY = 150;
const GEO_MIN_STABLE_SAMPLES = 1;
const GEO_JUMP_REJECT_METERS = 5000;
const GEO_JUMP_REJECT_WINDOW_MS = 30000;
const CART_KEY = "smartlib.loanSelf.cart.v2";

const STATE = {
  root: null,
  step: "verifying", // verifying | choose | scan
  mode: "borrow", // borrow | return
  purpose: "borrow",

  bootstrapLoading: false,
  checking: false,
  submitting: false,
  scannerOpen: false,

  policy: null,
  quota: null,
  visit: null,
  activeLoans: [],

  geo: null,
  geoSamples: [],
  geoError: "",
  geoTimeoutHit: false,
  geoVerifyDeadline: 0,
  geoCheckStage: "กำลังเริ่มต้นระบบ",
  lastCheckAt: 0,
  result: null,

  mapOpen: false,
  cameraSupported: isScannerSupported(),
  scanFlash: "",
  scanFlashTimer: 0,

  cart: [],
  bookMetaByBarcode: {},
  bookMetaLoadingByBarcode: {},
  pendingBarcodeByMode: {},
  batchResult: null,

  watchId: null,
  checkTimerId: 0,
  rootAliveTimerId: 0,
};

function ensureNativeStyles_() {
  if (document.getElementById("memberLoanSelfNativeStyle")) return;
  const style = document.createElement("style");
  style.id = "memberLoanSelfNativeStyle";
  style.textContent = `
    #memberLoanSelfRoot {
      min-height: calc(100dvh - env(safe-area-inset-bottom, 0px));
      overscroll-behavior: contain;
    }
    .member-loan-self-glass {
      background: rgba(255, 255, 255, 0.82);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(14, 165, 233, 0.14);
    }
    .member-loan-self-step-panel {
      animation: memberLoanSelfSlideIn .26s cubic-bezier(0.32, 0.72, 0, 1) both;
    }
    @keyframes memberLoanSelfSlideIn {
      from { transform: translateX(18px); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    .member-loan-self-shimmer {
      background: linear-gradient(95deg, rgba(148,163,184,.18) 22%, rgba(241,245,249,.88) 50%, rgba(148,163,184,.18) 78%);
      background-size: 220% 100%;
      animation: memberLoanSelfShimmer 1.4s linear infinite;
    }
    @keyframes memberLoanSelfShimmer {
      from { background-position: 200% 0; }
      to { background-position: -200% 0; }
    }
    .member-loan-self-scanner-sheet {
      transition: transform .32s cubic-bezier(0.32, 0.72, 0, 1), opacity .2s ease;
      will-change: transform, opacity;
    }
    .member-loan-self-viewfinder::before {
      content: "";
      position: absolute;
      inset: 0;
      border: 2px solid rgba(255,255,255,.8);
      border-radius: 18px;
      box-shadow: inset 0 0 0 9999px rgba(2,6,23,.34);
    }
    .member-loan-self-viewfinder::after {
      content: "";
      position: absolute;
      left: 10%;
      right: 10%;
      top: 50%;
      height: 2px;
      background: linear-gradient(90deg, rgba(248,113,113,0), rgba(248,113,113,.95), rgba(248,113,113,0));
      transform: translateY(-50%);
      animation: memberLoanSelfLaser 1.2s ease-in-out infinite alternate;
      box-shadow: 0 0 10px rgba(248,113,113,.8);
    }
    @keyframes memberLoanSelfLaser {
      from { transform: translateY(-32px); }
      to { transform: translateY(32px); }
    }
    @media (max-width: 767px) {
      #memberLoanSelfBottomBar {
        bottom: calc(env(safe-area-inset-bottom, 0px) + 4.9rem) !important;
      }
      #memberLoanSelfMapSheet {
        bottom: calc(env(safe-area-inset-bottom, 0px) + 4.9rem) !important;
        max-height: calc(100dvh - env(safe-area-inset-bottom, 0px) - 6rem) !important;
      }
      #memberLoanSelfScannerSheet {
        bottom: calc(env(safe-area-inset-bottom, 0px) + 4.9rem) !important;
      }
    }
  `;
  document.head.appendChild(style);
}

function purposeByMode_(mode) {
  return mode === "return" ? "return" : "borrow";
}

function normalizeText_(value) {
  return String(value || "").trim().toLowerCase();
}

function roundMeters_(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
}

function safeDate_(value) {
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

function haversineMeters_(lat1, lng1, lat2, lng2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2)
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
    * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function medianNumber_(list) {
  const nums = (Array.isArray(list) ? list : [])
    .map((n) => Number(n))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (!nums.length) return NaN;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2;
}

function getNearestMatch_() {
  const matches = Array.isArray(STATE.result?.matches) ? STATE.result.matches : [];
  return matches.length ? matches[0] : null;
}

function isGeoPreciseEnough_() {
  if (!STATE.geo) return false;
  const accuracy = Number(STATE.geo.accuracy || 0);
  const sampleCount = Number(STATE.geo.sampleCount || 0);
  if (!Number.isFinite(accuracy) || accuracy <= 0) return false;
  
  // Fast Pass: If accuracy is very good, don't wait for multiple samples
  if (accuracy <= GEO_FASTPASS_ACCURACY) return true;
  
  if (sampleCount < GEO_MIN_STABLE_SAMPLES) return false;
  return accuracy <= GEO_STABLE_ACCURACY;
}

function canOperate_() {
  // Allow operation if either geo is precise enough OR we already have a successful result (sticky)
  return Boolean((STATE.result?.allowed && isGeoPreciseEnough_()) || (STATE.result?.allowed && STATE.step !== "verifying"));
}

function canBorrowMore_() {
  const remaining = Number(STATE.quota?.remaining);
  if (!Number.isFinite(remaining)) return false;
  return remaining > 0;
}

function hasActiveVisit_() {
  const required = STATE.visit?.required !== false;
  if (!required) return true;
  return STATE.visit?.active === true;
}

function visitBlockMessage_() {
  if (hasActiveVisit_()) return "";
  return "ต้องเช็คอินห้องสมุดก่อนใช้งาน กรุณาไปที่ /app/checkin";
}

function shouldRejectJump_(sample) {
  const prev = STATE.geoSamples.length ? STATE.geoSamples[STATE.geoSamples.length - 1] : null;
  if (!prev) return false;
  const dtMs = Number(sample.ts || 0) - Number(prev.ts || 0);
  if (!Number.isFinite(dtMs) || dtMs <= 0 || dtMs > GEO_JUMP_REJECT_WINDOW_MS) return false;
  const distance = haversineMeters_(prev.lat, prev.lng, sample.lat, sample.lng);
  return distance > GEO_JUMP_REJECT_METERS && Number(sample.accuracy || 0) >= Number(prev.accuracy || 0);
}

function pushGeoSample_(sample) {
  if (!sample || !Number.isFinite(sample.lat) || !Number.isFinite(sample.lng)) return null;
  if (Number(sample.accuracy || 0) > GEO_MAX_SAMPLE_ACCURACY) return null;
  if (shouldRejectJump_(sample)) return null;

  STATE.geoSamples.push(sample);
  if (STATE.geoSamples.length > 5) STATE.geoSamples = STATE.geoSamples.slice(-5);

  const lat = medianNumber_(STATE.geoSamples.map((s) => s.lat));
  const lng = medianNumber_(STATE.geoSamples.map((s) => s.lng));
  const accuracy = medianNumber_(STATE.geoSamples.map((s) => s.accuracy));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !Number.isFinite(accuracy)) return null;

  return {
    lat,
    lng,
    accuracy,
    sampleCount: STATE.geoSamples.length,
    ts: sample.ts,
  };
}

function vibrate_(ms = 24) {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    navigator.vibrate(ms);
  }
}

function readCartStorage_() {
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => ({ barcode: String(x?.barcode || "").trim(), mode: purposeByMode_(x?.mode), ts: Number(x?.ts || Date.now()) }))
      .filter((x) => x.barcode);
  } catch {
    return [];
  }
}

function writeCartStorage_() {
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(STATE.cart));
  } catch {
    // ignore storage failure
  }
}

function clearCartByMode_(mode) {
  STATE.cart = STATE.cart.filter((c) => purposeByMode_(c.mode) !== purposeByMode_(mode));
  writeCartStorage_();
}

function getCartByMode_(mode = STATE.mode) {
  return STATE.cart.filter((item) => purposeByMode_(item.mode) === purposeByMode_(mode));
}

function setMapOpen_(open) {
  STATE.mapOpen = open === true;
}

async function ensureBookMeta_(root, barcode) {
  const code = String(barcode || "").trim();
  if (!code) return;
  if (STATE.bookMetaByBarcode[code] !== undefined) return;
  if (STATE.bookMetaLoadingByBarcode[code] === true) return;

  STATE.bookMetaLoadingByBarcode[code] = true;
  try {
    const res = await apiBooksCatalogGet({ barcode: code });
    const book = res?.ok ? res?.data?.book : null;
    STATE.bookMetaByBarcode[code] = book
      ? {
        title: String(book.title || ""),
        author: String(book.author || ""),
        coverUrl: String(book.coverUrl || ""),
      }
      : null;
  } catch {
    STATE.bookMetaByBarcode[code] = null;
  } finally {
    delete STATE.bookMetaLoadingByBarcode[code];
    renderAll_(root);
  }
}

function ensureStepByGeo_() {
  if (!canOperate_()) {
    STATE.step = "verifying";
    return;
  }
  if (STATE.step === "verifying") {
    STATE.step = "choose";
    vibrate_(28);
  }
}

function renderStatusBanner_(root) {
  const box = root.querySelector("#memberLoanSelfStatus");
  const title = root.querySelector("#memberLoanSelfStatusTitle");
  const detail = root.querySelector("#memberLoanSelfStatusDetail");
  const help = root.querySelector("#memberLoanSelfHelpBtn");
  const retry = root.querySelector("#memberLoanSelfRetryBtn");
  const forceBtn = root.querySelector("#memberLoanSelfForceCheckBtn");
  if (!box || !title || !detail || !help || !retry || !forceBtn) return;

  const nearest = getNearestMatch_();
  const accuracy = roundMeters_(STATE.geo?.accuracy);
  const sampleCount = Number(STATE.geo?.sampleCount || 0);

  help.classList.toggle("hidden", !STATE.geoTimeoutHit);
  retry.classList.toggle("hidden", !STATE.geoTimeoutHit);
  
  // Show force check if accuracy is borderline but not quite at STABLE threshold
  const isBorderline = STATE.geo && accuracy > GEO_FASTPASS_ACCURACY && accuracy <= GEO_MAX_SAMPLE_ACCURACY;
  forceBtn.classList.toggle("hidden", !isBorderline || canOperate_());

  if (STATE.geoError) {
    box.className = "member-loan-self-glass rounded-3xl border border-rose-200 bg-rose-50/90 p-4";
    title.className = "text-sm font-black uppercase tracking-[0.11em] text-rose-700";
    title.textContent = "ไม่สามารถอ่านตำแหน่ง GPS";
    detail.className = "mt-1 text-sm font-bold text-rose-800";
    detail.textContent = STATE.geoError;
    return;
  }

  if (STATE.checking && !STATE.result) {
    box.className = "member-loan-self-glass rounded-3xl border border-sky-200 bg-sky-50/85 p-4";
    title.className = "text-sm font-black uppercase tracking-[0.11em] text-sky-700";
    title.textContent = "กำลังตรวจสอบตำแหน่งจุดบริการ...";
    detail.className = "mt-1 text-sm font-bold text-sky-900";
    detail.textContent = `ระบบกำลังตรวจสอบ: ${STATE.geoCheckStage || "โปรดรอสักครู่"}`;
    return;
  }

  if (!STATE.result || !isGeoPreciseEnough_()) {
    box.className = "member-loan-self-glass rounded-3xl border border-amber-200 bg-amber-50/90 p-4";
    title.className = "text-sm font-black uppercase tracking-[0.11em] text-amber-700";
    title.textContent = "สัญญาณ GPS ยังไม่เสถียร";
    detail.className = "mt-1 text-sm font-bold text-amber-900";
    detail.textContent = `ระบบกำลังตรวจสอบ: ${STATE.geoCheckStage || "รอข้อมูลพิกัด"} · accuracy ${accuracy}m · sample ${sampleCount}/${GEO_MIN_STABLE_SAMPLES} (ต้อง <= ${GEO_STABLE_ACCURACY}m)`;
    return;
  }

  if (STATE.result.allowed) {
    box.className = "member-loan-self-glass rounded-3xl border border-emerald-200 bg-emerald-50/80 p-4";
    title.className = "text-sm font-black uppercase tracking-[0.11em] text-emerald-700";
    title.textContent = "อยู่ในเขตที่อนุญาต";
    detail.className = "mt-1 text-sm font-bold text-emerald-900";
    detail.textContent = nearest
      ? `ใกล้จุด ${nearest.location_name || "-"} ระยะ ${roundMeters_(nearest.distance_meters)}m จากรัศมี ${roundMeters_(nearest.range_meters)}m`
      : "พร้อมทำรายการ";
    return;
  }

  box.className = "member-loan-self-glass rounded-3xl border border-rose-200 bg-rose-50/90 p-4";
  title.className = "text-sm font-black uppercase tracking-[0.11em] text-rose-700";
  title.textContent = "อยู่นอกเขตที่อนุญาต";
  detail.className = "mt-1 text-sm font-bold text-rose-800";
  detail.textContent = nearest
    ? `ห่างจาก ${nearest.location_name || "จุดใกล้สุด"} ${roundMeters_(nearest.distance_meters)}m (อนุญาต ${roundMeters_(nearest.range_meters)}m)`
    : "ไม่พบจุดบริการ";
}

function renderPolicy_(root) {
  const el = root.querySelector("#memberLoanSelfPolicy");
  if (!el) return;
  const policy = STATE.policy;
  const quota = STATE.quota;
  if (!policy || !quota) {
    el.innerHTML = '<p class="text-xs font-semibold text-slate-500">กำลังโหลดสิทธิ์การยืม...</p>';
    return;
  }
  const visitRequired = STATE.visit?.required !== false;
  const visitActive = STATE.visit?.active === true;
  el.innerHTML = `
    <div class="grid gap-2 sm:grid-cols-4">
      <article class="rounded-2xl border border-violet-100 bg-violet-50/60 p-3">
        <p class="text-[10px] font-black uppercase tracking-[0.12em] text-violet-500">สิทธิ์ยืม</p>
        <p class="mt-1 text-lg font-black text-violet-900">${escapeHtml(String(policy.loanDays || 0))} วัน</p>
      </article>
      <article class="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3">
        <p class="text-[10px] font-black uppercase tracking-[0.12em] text-emerald-600">โควตาคงเหลือ</p>
        <p class="mt-1 text-lg font-black text-emerald-900">${escapeHtml(String(quota.remaining || 0))}/${escapeHtml(String(quota.quota || 0))}</p>
      </article>
      <article class="rounded-2xl border border-sky-100 bg-sky-50/60 p-3">
        <p class="text-[10px] font-black uppercase tracking-[0.12em] text-sky-600">สถานะสแกน</p>
        <p class="mt-1 text-sm font-black text-sky-900">${escapeHtml(STATE.scannerOpen ? "กำลังสแกนต่อเนื่อง" : "พร้อมเริ่มสแกน")}</p>
      </article>
      <article class="rounded-2xl border ${visitActive ? "border-cyan-100 bg-cyan-50/70" : "border-rose-100 bg-rose-50/70"} p-3">
        <p class="text-[10px] font-black uppercase tracking-[0.12em] ${visitActive ? "text-cyan-600" : "text-rose-600"}">เช็คอินห้องสมุด</p>
        <p class="mt-1 text-sm font-black ${visitActive ? "text-cyan-900" : "text-rose-800"}">${visitRequired ? (visitActive ? "พร้อมใช้งาน" : "ยังไม่เช็คอิน") : "ไม่บังคับ"}</p>
      </article>
    </div>
  `;
}

function renderProgress_(root) {
  const circles = {
    verify: root.querySelector("#memberLoanSelfStep1Circle"),
    choose: root.querySelector("#memberLoanSelfStep2Circle"),
    scan: root.querySelector("#memberLoanSelfStep3Circle"),
  };
  const labels = {
    verify: root.querySelector("#memberLoanSelfStep1Label"),
    choose: root.querySelector("#memberLoanSelfStep2Label"),
    scan: root.querySelector("#memberLoanSelfStep3Label"),
  };
  const line1 = root.querySelector("#memberLoanSelfLine1Fill");
  const line2 = root.querySelector("#memberLoanSelfLine2Fill");
  if (!circles.verify || !circles.choose || !circles.scan || !labels.verify || !labels.choose || !labels.scan || !line1 || !line2) return;

  const stepIndex = STATE.step === "verifying" ? 1 : (STATE.step === "choose" ? 2 : 3);
  const applyCircle = (el, active, done) => {
    if (!el) return;
    if (done) {
      el.className = "h-6 w-6 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center border border-emerald-500 transition";
      return;
    }
    if (active) {
      el.className = "h-6 w-6 rounded-full bg-sky-600 text-white text-[10px] font-black flex items-center justify-center border border-sky-600 transition";
      return;
    }
    el.className = "h-6 w-6 rounded-full bg-white text-slate-400 text-[10px] font-black flex items-center justify-center border border-slate-200 transition";
  };

  applyCircle(circles.verify, stepIndex === 1, stepIndex > 1 || canOperate_());
  applyCircle(circles.choose, stepIndex === 2, stepIndex > 2);
  applyCircle(circles.scan, stepIndex === 3, false);

  labels.verify.className = `text-[10px] ${stepIndex === 1 ? "font-black text-sky-700" : "font-bold text-emerald-700"}`;
  labels.choose.className = `text-[10px] ${stepIndex === 2 ? "font-black text-sky-700" : (stepIndex > 2 ? "font-black text-emerald-700" : "font-bold text-slate-400")}`;
  labels.scan.className = `text-[10px] ${stepIndex === 3 ? "font-black text-sky-700" : "font-bold text-slate-400"}`;

  line1.style.transform = stepIndex >= 2 ? "translateX(0)" : "translateX(-100%)";
  line2.style.transform = stepIndex >= 3 ? "translateX(0)" : "translateX(-100%)";
}

function renderWorkflow_(root) {
  const verify = root.querySelector("#memberLoanSelfStepVerify");
  const choose = root.querySelector("#memberLoanSelfStepChoose");
  const scan = root.querySelector("#memberLoanSelfStepScan");
  const chooseBorrowReason = root.querySelector("#memberLoanSelfChooseBorrowReason");
  const visitWarn = root.querySelector("#memberLoanSelfVisitWarn");
  if (!verify || !choose || !scan) return;

  verify.classList.toggle("hidden", STATE.step !== "verifying");
  choose.classList.toggle("hidden", STATE.step !== "choose");
  scan.classList.toggle("hidden", STATE.step !== "scan");

  if (chooseBorrowReason) {
    const remaining = Number(STATE.quota?.remaining || 0);
    const quota = Number(STATE.quota?.quota || 0);
    const blocked = !canBorrowMore_() || !hasActiveVisit_();
    chooseBorrowReason.classList.toggle("hidden", !blocked);
    if (blocked) {
      chooseBorrowReason.textContent = !hasActiveVisit_()
        ? visitBlockMessage_()
        : `ยังยืมเพิ่มไม่ได้: โควตาคงเหลือ ${Math.max(0, remaining)}/${Math.max(0, quota)} กรุณาคืนหนังสือก่อน`;
    }
  }
  if (visitWarn) {
    const blocked = !hasActiveVisit_();
    visitWarn.classList.toggle("hidden", !blocked);
    if (blocked) visitWarn.textContent = visitBlockMessage_();
  }
}

function renderMapPopup_(root) {
  const backdrop = root.querySelector("#memberLoanSelfMapBackdrop");
  const sheet = root.querySelector("#memberLoanSelfMapSheet");
  const mapBody = root.querySelector("#memberLoanSelfMapBody");
  const navBtn = root.querySelector("#memberLoanSelfMapNavBtn");
  if (!backdrop || !sheet || !mapBody || !navBtn) return;

  const open = STATE.mapOpen === true;
  backdrop.className = `fixed inset-0 z-40 bg-slate-900/45 transition ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`;
  sheet.className = `fixed inset-x-0 bottom-0 z-50 max-h-[86dvh] overflow-hidden rounded-t-3xl border border-slate-200 bg-white shadow-2xl transition duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)] ${open ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`;

  const nearest = getNearestMatch_();
  navBtn.classList.toggle("hidden", !(nearest && Number.isFinite(Number(nearest.latitude)) && Number.isFinite(Number(nearest.longitude))));

  const matches = Array.isArray(STATE.result?.matches)
    ? STATE.result.matches.filter((m) => Number.isFinite(Number(m.latitude)) && Number.isFinite(Number(m.longitude)))
    : [];

  if (!STATE.geo || !matches.length) {
    mapBody.innerHTML = '<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">ยังไม่มีข้อมูลพิกัดเพียงพอสำหรับแสดงแผนที่</div>';
    return;
  }

  const userLat = Number(STATE.geo.lat);
  const userLng = Number(STATE.geo.lng);
  const centerLat = (userLat + matches.reduce((s, m) => s + Number(m.latitude), 0)) / (matches.length + 1);
  const metersPerDegLat = 111320;
  const metersPerDegLng = Math.max(1, 111320 * Math.cos((centerLat * Math.PI) / 180));

  const points = matches.map((m) => ({
    ...m,
    xM: (Number(m.longitude) - userLng) * metersPerDegLng,
    yM: (Number(m.latitude) - userLat) * metersPerDegLat * -1,
  }));

  let maxExtent = 20;
  points.forEach((p) => {
    const range = Number(p.range_meters || 0);
    maxExtent = Math.max(maxExtent, Math.abs(p.xM) + range, Math.abs(p.yM) + range);
  });

  const size = 360;
  const pad = 18;
  const draw = size - pad * 2;
  const ratio = draw / (maxExtent * 2);
  const proj = (xM, yM) => ({ x: pad + (xM + maxExtent) * ratio, y: pad + (yM + maxExtent) * ratio });
  const userP = proj(0, 0);
  const nearestP = points.find((p) => String(p.id || "") === String(nearest?.id || ""));

  mapBody.innerHTML = `
    <svg viewBox="0 0 ${size} ${size}" class="w-full rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]">
      <rect x="0" y="0" width="${size}" height="${size}" fill="rgba(148,163,184,0.08)"/>
      ${points.map((p) => {
        const pos = proj(p.xM, p.yM);
        const radius = Math.max(10, Number(p.range_meters || 0) * ratio);
        return `
          <circle cx="${pos.x.toFixed(2)}" cy="${pos.y.toFixed(2)}" r="${radius.toFixed(2)}" fill="rgba(34,197,94,0.1)" stroke="rgba(34,197,94,0.35)" stroke-width="1.2"></circle>
          <circle cx="${pos.x.toFixed(2)}" cy="${pos.y.toFixed(2)}" r="5" fill="#16a34a"></circle>
        `;
      }).join("")}
      ${nearestP ? (() => {
        const p = proj(nearestP.xM, nearestP.yM);
        return `<line x1="${userP.x.toFixed(2)}" y1="${userP.y.toFixed(2)}" x2="${p.x.toFixed(2)}" y2="${p.y.toFixed(2)}" stroke="#0f766e" stroke-width="2" stroke-dasharray="6 4"></line>`;
      })() : ""}
      <circle cx="${userP.x.toFixed(2)}" cy="${userP.y.toFixed(2)}" r="6" fill="#2563eb"></circle>
      <circle cx="${userP.x.toFixed(2)}" cy="${userP.y.toFixed(2)}" r="12" fill="rgba(37,99,235,.18)"></circle>
    </svg>
  `;
}

function renderScanCart_(root) {
  const modeLabel = root.querySelector("#memberLoanSelfScanMode");
  const list = root.querySelector("#memberLoanSelfCartList");
  const count = root.querySelector("#memberLoanSelfCartCount");
  const flash = root.querySelector("#memberLoanSelfScanFlash");
  const confirmBtn = root.querySelector("#memberLoanSelfConfirmBtn");
  const summary = root.querySelector("#memberLoanSelfBatchSummary");

  if (!modeLabel || !list || !count || !flash || !confirmBtn || !summary) return;

  const cart = getCartByMode_(STATE.mode);
  count.textContent = String(cart.length);
  modeLabel.textContent = STATE.mode === "borrow" ? "โหมดยืม (Scan to Cart)" : "โหมดคืน (Scan to Cart)";

  if (STATE.scanFlash) {
    flash.classList.remove("hidden");
    flash.textContent = STATE.scanFlash;
  } else {
    flash.classList.add("hidden");
    flash.textContent = "";
  }

  if (!cart.length) {
    list.innerHTML = `
      <div class="rounded-[1.5rem] border-2 border-dashed border-slate-200 bg-white/70 p-6 text-center">
        <p class="text-sm font-black text-slate-600">ตะกร้ายังว่าง</p>
        <p class="mt-1 text-xs font-semibold text-slate-400">กดปุ่มสแกนหรือกรอกบาร์โค้ดด้านล่างเพื่อเพิ่มรายการ</p>
      </div>
    `;
  } else {
    list.innerHTML = cart
      .map((item, idx) => {
        const meta = STATE.bookMetaByBarcode[item.barcode];
        if (meta === undefined) ensureBookMeta_(root, item.barcode);
        const coverHtml = meta?.coverUrl
          ? `<img src="${escapeHtml(meta.coverUrl)}" alt="${escapeHtml(meta.title || item.barcode)}" class="h-full w-full object-cover" loading="lazy" />`
          : '<div class="h-full w-full bg-gradient-to-br from-slate-100 to-slate-200"></div>';
        const titleText = meta?.title || item.barcode;
        const authorText = meta?.author || "";
        const matchedLoan = STATE.activeLoans.find((x) => String(x.barcode || "") === String(item.barcode || ""));
        const returnHint = STATE.mode === "return"
          ? `<p class="mt-1 text-[11px] font-semibold ${matchedLoan ? "text-emerald-700" : "text-rose-700"}">${matchedLoan ? "พบในรายการยืมของคุณ" : "ไม่พบในรายการยืมปัจจุบัน"}</p>`
          : "";
        return `
          <article class="member-loan-self-glass rounded-2xl p-3 member-loan-self-step-panel">
            <div class="flex items-start justify-between gap-3">
              <div class="flex min-w-0 items-start gap-3">
                <div class="member-loan-self-shimmer h-20 w-14 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                  ${coverHtml}
                </div>
                <div class="min-w-0">
                  <p class="line-clamp-2 text-sm font-black text-slate-800">${escapeHtml(titleText)}</p>
                  <p class="mt-1 line-clamp-1 text-[11px] font-bold text-slate-500">${escapeHtml(authorText || "ไม่ทราบผู้แต่ง")}</p>
                  <p class="mt-1 text-[10px] font-semibold text-slate-500">Barcode: ${escapeHtml(item.barcode)}</p>
                </div>
              </div>
              <button type="button" data-remove-cart="${escapeHtml(item.barcode)}" class="shrink-0 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-black text-slate-600">ลบ</button>
            </div>
            <p class="mt-2 text-[11px] font-semibold text-slate-500">ลำดับ ${idx + 1} · ${escapeHtml(safeDate_(item.ts))}</p>
            ${returnHint}
          </article>
        `;
      })
      .join("");
  }

  const borrowBlocked = STATE.mode === "borrow" && !canBorrowMore_();
  const visitBlocked = !hasActiveVisit_();
  confirmBtn.disabled = STATE.submitting || cart.length === 0 || !canOperate_() || borrowBlocked || visitBlocked;
  confirmBtn.className = `h-14 flex-1 rounded-2xl px-4 text-sm font-black transition ${confirmBtn.disabled ? "bg-slate-300 text-slate-600" : `${STATE.mode === "borrow" ? "bg-slate-900 text-white" : "bg-sky-600 text-white"}`}`;
  confirmBtn.textContent = STATE.submitting
    ? "กำลังประมวลผล..."
    : (STATE.mode === "borrow" ? `ยืนยันการยืมทั้งหมด ${cart.length} เล่ม` : `ยืนยันการคืนทั้งหมด ${cart.length} เล่ม`);

  const report = STATE.batchResult;
  if (!report) {
    summary.innerHTML = "";
    return;
  }

  summary.innerHTML = `
    <article class="rounded-2xl border border-slate-200 bg-white p-3">
      <p class="text-sm font-black text-slate-800">สรุปผลล่าสุด</p>
      <p class="mt-1 text-xs font-semibold text-emerald-700">สำเร็จ ${report.success.length} รายการ</p>
      <p class="mt-0.5 text-xs font-semibold text-rose-700">ไม่สำเร็จ ${report.failed.length} รายการ</p>
      ${report.failed.length ? `<div class="mt-2 space-y-1">${report.failed.map((f) => `<p class="text-[11px] font-semibold text-rose-700">${escapeHtml(f.barcode)}: ${escapeHtml(f.error)}</p>`).join("")}</div>` : ""}
    </article>
  `;
}

function renderAll_(root) {
  renderProgress_(root);
  renderStatusBanner_(root);
  renderPolicy_(root);
  renderWorkflow_(root);
  renderMapPopup_(root);
  renderScanCart_(root);

  const mapToggle = root.querySelector("#memberLoanSelfMapToggle");
  const scanBtn = root.querySelector("#memberLoanSelfOpenScanBtn");
  const scanInlineBtn = root.querySelector("#memberLoanSelfOpenScanInlineBtn");
  const stopScanBtn = root.querySelector("#memberLoanSelfStopScanBtn");
  const cameraHint = root.querySelector("#memberLoanSelfCameraHint");
  const quotaWarn = root.querySelector("#memberLoanSelfQuotaWarn");
  const stepHint = root.querySelector("#memberLoanSelfStepHint");
  const chooseBorrow = root.querySelector("#memberLoanSelfChooseBorrow");
  const chooseReturn = root.querySelector("#memberLoanSelfChooseReturn");
  const manualAddBtn = root.querySelector("#memberLoanSelfManualAddBtn");
  const manualInput = root.querySelector("#memberLoanSelfManualBarcode");
  const scannerBackdrop = root.querySelector("#memberLoanSelfScannerBackdrop");
  const scannerSheet = root.querySelector("#memberLoanSelfScannerSheet");
  const scannerCount = root.querySelector("#memberLoanSelfScannerCartCount");
  const scannerMode = root.querySelector("#memberLoanSelfScannerMode");
  const bottomBar = root.querySelector("#memberLoanSelfBottomBar");
  const confirmInlineBtn = root.querySelector("#memberLoanSelfConfirmInlineBtn");
  const confirmBtn = root.querySelector("#memberLoanSelfConfirmBtn");

  if (mapToggle) {
    mapToggle.disabled = false;
  }
  if (scanBtn) {
    const borrowBlocked = STATE.mode === "borrow" && !canBorrowMore_();
    const visitBlocked = !hasActiveVisit_();
    scanBtn.disabled = STATE.step !== "scan" || !canOperate_() || !STATE.cameraSupported || borrowBlocked || visitBlocked;
    scanBtn.className = `h-14 w-20 shrink-0 rounded-2xl px-2 text-xs font-black transition ${scanBtn.disabled ? "bg-slate-200 text-slate-500" : `${STATE.mode === "borrow" ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"}`}`;
    scanBtn.textContent = STATE.scannerOpen ? "กำลังสแกน" : "สแกนเพิ่ม";
  }
  if (scanInlineBtn) {
    const borrowBlocked = STATE.mode === "borrow" && !canBorrowMore_();
    const visitBlocked = !hasActiveVisit_();
    scanInlineBtn.disabled = STATE.step !== "scan" || !canOperate_() || !STATE.cameraSupported || borrowBlocked || visitBlocked;
    scanInlineBtn.className = `w-full rounded-2xl px-4 py-3 text-sm font-black transition ${scanInlineBtn.disabled ? "bg-slate-200 text-slate-500" : `${STATE.mode === "borrow" ? "bg-emerald-100 text-emerald-800" : "bg-sky-100 text-sky-800"}`}`;
    scanInlineBtn.textContent = STATE.scannerOpen ? "กำลังสแกน..." : "เปิดกล้องสแกน";
  }
  if (cameraHint) {
    cameraHint.textContent = STATE.cameraSupported
      ? "สแกนด้วยกล้องได้ตามปกติ"
      : "อุปกรณ์นี้ไม่รองรับกล้องสแกน สามารถกรอกบาร์โค้ดด้านล่างแทนได้";
    cameraHint.className = `text-[11px] font-semibold ${STATE.cameraSupported ? "text-slate-500" : "text-amber-700"}`;
  }
  if (stopScanBtn) {
    stopScanBtn.disabled = !STATE.scannerOpen;
    stopScanBtn.className = `rounded-xl border px-3 py-2 text-xs font-black ${STATE.scannerOpen ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-400"}`;
  }
  if (stepHint) {
    stepHint.textContent = STATE.step === "verifying"
      ? "ขั้นตอนที่ 1: ตรวจสอบพิกัด"
      : STATE.step === "choose"
        ? "ขั้นตอนที่ 2: เลือกรายการ"
        : "ขั้นตอนที่ 3: สแกนเข้าตะกร้าและยืนยัน";
  }
  if (chooseBorrow) {
    const blocked = !canBorrowMore_() || !hasActiveVisit_();
    chooseBorrow.disabled = blocked;
    chooseBorrow.className = `rounded-[1.6rem] border p-5 text-center transition ${blocked ? "border-slate-200 bg-slate-100 text-slate-500" : "border-emerald-200 bg-emerald-50"}`;
  }
  if (chooseReturn) {
    const blocked = !hasActiveVisit_();
    chooseReturn.disabled = blocked;
    chooseReturn.className = `rounded-[1.6rem] border p-5 text-center transition ${blocked ? "border-slate-200 bg-slate-100 text-slate-500" : "border-sky-200 bg-sky-50"}`;
  }
  if (manualAddBtn) {
    const blocked = (STATE.mode === "borrow" && !canBorrowMore_()) || !hasActiveVisit_();
    manualAddBtn.disabled = blocked;
    manualAddBtn.className = `rounded-xl border px-3 py-2 text-sm font-black transition ${blocked ? "border-slate-200 bg-slate-100 text-slate-400" : "border-sky-200 bg-sky-50 text-sky-700"}`;
  }
  if (manualInput) {
    manualInput.disabled = (STATE.mode === "borrow" && !canBorrowMore_()) || !hasActiveVisit_();
  }
  if (quotaWarn) {
    const show = STATE.mode === "borrow" && !canBorrowMore_();
    quotaWarn.classList.toggle("hidden", !show);
  }
  if (scannerBackdrop && scannerSheet) {
    const open = STATE.scannerOpen === true;
    scannerBackdrop.className = `fixed inset-0 z-50 bg-slate-950/70 transition ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`;
    scannerSheet.className = `member-loan-self-scanner-sheet fixed inset-x-0 bottom-0 z-[60] rounded-t-[1.75rem] border border-slate-700 bg-slate-950 p-4 text-white ${open ? "translate-y-0 opacity-100" : "translate-y-full opacity-0"}`;
  }
  if (scannerCount) scannerCount.textContent = String(getCartByMode_(STATE.mode).length);
  if (scannerMode) scannerMode.textContent = STATE.mode === "borrow" ? "โหมดยืม" : "โหมดคืน";
  if (bottomBar) {
    const active = STATE.step === "scan";
    bottomBar.className = `fixed inset-x-0 z-30 border-t border-slate-200 bg-white/90 px-3 py-3 backdrop-blur-xl transition ${active ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`;
    bottomBar.classList.toggle("hidden", !active);
  }
  if (confirmInlineBtn && confirmBtn) {
    confirmInlineBtn.disabled = confirmBtn.disabled;
    confirmInlineBtn.textContent = confirmBtn.textContent;
    confirmInlineBtn.className = `w-full rounded-2xl px-4 py-3 text-sm font-black transition ${confirmBtn.disabled ? "bg-slate-300 text-slate-600" : `${STATE.mode === "borrow" ? "bg-slate-900 text-white" : "bg-sky-600 text-white"}`}`;
  }
}

function clearScanFlash_() {
  if (STATE.scanFlashTimer) {
    clearTimeout(STATE.scanFlashTimer);
    STATE.scanFlashTimer = 0;
  }
  STATE.scanFlash = "";
}

function setScanFlash_(message) {
  clearScanFlash_();
  STATE.scanFlash = String(message || "");
  STATE.scanFlashTimer = window.setTimeout(() => {
    STATE.scanFlash = "";
    STATE.scanFlashTimer = 0;
    if (STATE.root) renderAll_(STATE.root);
  }, FLASH_MS);
}

function stopScanner_() {
  closeScanner();
  STATE.scannerOpen = false;
}

function clearTracking_() {
  if (STATE.watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(STATE.watchId);
  }
  STATE.watchId = null;
  if (STATE.checkTimerId) {
    clearInterval(STATE.checkTimerId);
    STATE.checkTimerId = 0;
  }
  if (STATE.rootAliveTimerId) {
    clearInterval(STATE.rootAliveTimerId);
    STATE.rootAliveTimerId = 0;
  }
}

function cleanupState_() {
  clearScanFlash_();
  stopScanner_();
  clearTracking_();
}

async function checkZone_(root, force = false) {
  if (!STATE.geo || !isGeoPreciseEnough_()) {
    STATE.geoCheckStage = !STATE.geo
      ? "รอรับพิกัด GPS จากอุปกรณ์"
      : "กำลังรอค่าความแม่นยำ GPS ให้อยู่ในเกณฑ์";
    STATE.result = null;
    ensureStepByGeo_();
    renderAll_(root);
    return null;
  }
  if (STATE.checking) return STATE.result;

  const now = Date.now();
  if (!force && now - STATE.lastCheckAt < 1500) return STATE.result;

  STATE.checking = true;
  STATE.lastCheckAt = now;
  STATE.geoCheckStage = "กำลังคำนวณระยะจากพิกัดกับจุดบริการ";
  renderAll_(root);
  try {
    STATE.geoCheckStage = "กำลังตรวจสอบการอยู่ในเขตที่อนุญาต";
    const res = await apiSettingsLocationsCheck({
      latitude: STATE.geo.lat,
      longitude: STATE.geo.lng,
      accuracy: STATE.geo.accuracy,
      purpose: STATE.purpose,
    });
    if (!res?.ok) throw new Error(res?.error || "ตรวจสอบพิกัดไม่สำเร็จ");
    STATE.result = res.data || null;
  } catch (err) {
    STATE.result = null;
    showToast(err?.message || "ตรวจสอบพิกัดไม่สำเร็จ");
  } finally {
    STATE.checking = false;
    ensureStepByGeo_();
    renderAll_(root);
  }
  return STATE.result;
}

function startGeoTracking_(root) {
  if (!navigator.geolocation) {
    STATE.geoError = "อุปกรณ์ไม่รองรับ Geolocation";
    STATE.geoCheckStage = "อุปกรณ์ไม่รองรับ Geolocation";
    renderAll_(root);
    return;
  }

  STATE.geoVerifyDeadline = Date.now() + GEO_TIMEOUT_MS;
  STATE.geoCheckStage = "กำลังร้องขอสิทธิ์เข้าถึงพิกัด GPS";

  STATE.watchId = navigator.geolocation.watchPosition(
    (pos) => {
      STATE.geoCheckStage = "ได้รับพิกัดแล้ว กำลังตรวจสอบความแม่นยำ";
      const sample = {
        lat: Number(pos.coords.latitude),
        lng: Number(pos.coords.longitude),
        accuracy: Number(pos.coords.accuracy || 0),
        ts: Date.now(),
      };
      const stable = pushGeoSample_(sample);
      if (stable) {
        STATE.geo = stable;
        STATE.geoError = "";
        STATE.geoCheckStage = "พิกัดพร้อมใช้งาน กำลังตรวจสอบเขตบริการ";
        // Immediate check on first stable sample to speed up UI
        checkZone_(root, false);
      }

      STATE.geoTimeoutHit = Date.now() > STATE.geoVerifyDeadline && !canOperate_();
      ensureStepByGeo_();
      renderAll_(root);
      checkZone_(root, false);
    },
    (err) => {
      const map = {
        1: "ผู้ใช้ปฏิเสธสิทธิ์การเข้าถึงพิกัด",
        2: "ไม่สามารถอ่านตำแหน่งปัจจุบันได้",
        3: "หมดเวลารอพิกัด GPS",
      };
      STATE.geoError = map[err?.code] || "ไม่สามารถใช้งานพิกัดได้";
      STATE.geoCheckStage = "ไม่สามารถตรวจพิกัดได้";
      STATE.result = null;
      STATE.geoTimeoutHit = true;
      STATE.step = "verifying";
      renderAll_(root);
    },
    { enableHighAccuracy: true, timeout: GEO_TIMEOUT_MS, maximumAge: 15000 }
  );

  STATE.checkTimerId = window.setInterval(() => {
    if (!STATE.root || !document.body.contains(STATE.root)) {
      cleanupState_();
      return;
    }
    STATE.geoTimeoutHit = Date.now() > STATE.geoVerifyDeadline && !canOperate_();
    checkZone_(root, true);
  }, TRACKING_REFRESH_MS);

  STATE.rootAliveTimerId = window.setInterval(() => {
    if (!STATE.root || !document.body.contains(STATE.root)) cleanupState_();
  }, 2000);
}

async function loadBootstrap_(root) {
  STATE.bootstrapLoading = true;
  renderAll_(root);
  try {
    const res = await apiLoansSelfBootstrap();
    if (!res?.ok) throw new Error(res?.error || "โหลดข้อมูลสิทธิ์ไม่สำเร็จ");
    STATE.policy = res.data?.policy || null;
    STATE.quota = res.data?.quota || null;
    STATE.visit = res.data?.visit || { required: true, active: false, session: null };
    STATE.activeLoans = Array.isArray(res.data?.activeLoans) ? res.data.activeLoans : [];
  } catch (err) {
    showToast(err?.message || "โหลดข้อมูลสิทธิ์ไม่สำเร็จ");
    STATE.policy = null;
    STATE.quota = null;
    STATE.visit = { required: true, active: false, session: null };
    STATE.activeLoans = [];
  } finally {
    STATE.bootstrapLoading = false;
    renderAll_(root);
  }
}

async function addCartBarcode_(barcode, mode) {
  const code = String(barcode || "").trim();
  const normalizedMode = purposeByMode_(mode);
  if (!code) return;
  if (!hasActiveVisit_()) {
    showToast(visitBlockMessage_());
    setScanFlash_("ต้องเช็คอินก่อน");
    if (STATE.root) renderAll_(STATE.root);
    return;
  }
  if (normalizedMode === "borrow" && !canBorrowMore_()) {
    showToast("โควตาการยืมเต็มแล้ว ไม่สามารถยืมเพิ่มได้");
    setScanFlash_("โควตาการยืมเต็ม");
    if (STATE.root) renderAll_(STATE.root);
    return;
  }
  const normalizedCode = normalizeText_(code);
  const cartKey = `${normalizedMode}:${normalizedCode}`;
  const exists = STATE.cart.some((c) => normalizeText_(c.barcode) === normalizedCode && purposeByMode_(c.mode) === normalizedMode);
  if (exists) {
    setScanFlash_("มีในรายการแล้ว");
    if (STATE.root) renderAll_(STATE.root);
    return;
  }
  if (STATE.pendingBarcodeByMode[cartKey]) {
    setScanFlash_("กำลังตรวจสอบบาร์โค้ด...");
    if (STATE.root) renderAll_(STATE.root);
    return;
  }

  STATE.pendingBarcodeByMode[cartKey] = true;
  setScanFlash_("กำลังตรวจสอบบาร์โค้ด...");
  if (STATE.root) renderAll_(STATE.root);

  try {
    const validateRes = await apiLoansSelfValidate({
      barcode: code,
      mode: normalizedMode,
    });
    if (!validateRes?.ok) throw new Error(validateRes?.error || "ตรวจสอบบาร์โค้ดไม่สำเร็จ");

    const validateData = validateRes.data || {};
    const book = validateData.book || {};
    STATE.bookMetaByBarcode[code] = {
      title: String(book.title || ""),
      author: String(book.author || ""),
      coverUrl: String(book.coverUrl || ""),
    };

    STATE.cart.push({ barcode: code, mode: normalizedMode, ts: Date.now() });
    writeCartStorage_();
    vibrate_(18);
    setScanFlash_("เพิ่มเข้ารายการแล้ว");
  } catch (err) {
    showToast(err?.message || "บาร์โค้ดนี้ไม่สามารถทำรายการได้");
    setScanFlash_("บาร์โค้ดไม่ผ่านเงื่อนไข");
  } finally {
    delete STATE.pendingBarcodeByMode[cartKey];
    if (STATE.root) renderAll_(STATE.root);
  }
}

async function openScanner_(root) {
  if (!STATE.cameraSupported) {
    showToast("อุปกรณ์นี้ไม่รองรับ BarcodeDetector");
    return;
  }
  if (!navigator.onLine) {
    showToast("ขาดการเชื่อมต่ออินเทอร์เน็ต");
    return;
  }
  if (!canOperate_()) {
    showToast("ยังไม่พร้อมทำรายการ กรุณาตรวจพิกัดก่อน");
    return;
  }
  if (!hasActiveVisit_()) {
    showToast(visitBlockMessage_());
    return;
  }
  if (STATE.mode === "borrow" && !canBorrowMore_()) {
    showToast("โควตาการยืมเต็มแล้ว");
    return;
  }

  stopScanner_();
  STATE.scannerOpen = true;
  renderAll_(root);

  try {
    const video = root.querySelector("#memberLoanSelfScannerVideo");
    if (!video) {
      stopScanner_();
      renderAll_(root);
      return;
    }

    await openScanner({
      videoEl: video,
      continuous: true,
      onDetected: async (code) => {
        await addCartBarcode_(code, STATE.mode);
        renderAll_(root);
      },
    });
    renderAll_(root);
  } catch (err) {
    stopScanner_();
    renderAll_(root);
    showToast(err?.message || "เปิดกล้องไม่สำเร็จ");
  }
}

async function submitBatch_(root) {
  if (STATE.submitting) return;
  if (!navigator.onLine) {
    showToast("ขาดการเชื่อมต่ออินเทอร์เน็ต");
    return;
  }

  const cart = getCartByMode_(STATE.mode);
  if (!cart.length) {
    showToast("ยังไม่มีรายการในตะกร้า");
    return;
  }

  STATE.submitting = true;
  STATE.batchResult = null;
  renderAll_(root);

  try {
    await checkZone_(root, true);
    if (!canOperate_()) throw new Error("พิกัดยังไม่พร้อมทำรายการ");
    if (!hasActiveVisit_()) throw new Error(visitBlockMessage_());

    const nearest = getNearestMatch_();
    const payloadBase = {
      latitude: Number(STATE.geo?.lat),
      longitude: Number(STATE.geo?.lng),
      accuracy: Number(STATE.geo?.accuracy || 0),
      locationId: String(nearest?.id || ""),
      timestamp: new Date().toISOString(),
      notes: "",
    };

    const success = [];
    const failed = [];

    for (let i = 0; i < cart.length; i += 1) {
      const row = cart[i];
      try {
        const res = STATE.mode === "borrow"
          ? await apiLoansSelfCreate({ ...payloadBase, barcode: row.barcode })
          : await apiLoansSelfReturn({ ...payloadBase, barcode: row.barcode });

        if (!res?.ok) throw new Error(res?.error || "ทำรายการไม่สำเร็จ");
        success.push({ barcode: row.barcode, data: res.data || null });
      } catch (err) {
        failed.push({ barcode: row.barcode, error: String(err?.message || "ทำรายการไม่สำเร็จ") });
      }
    }

    STATE.batchResult = { success, failed };

    if (success.length) {
      const successSet = new Set(success.map((s) => normalizeText_(s.barcode)));
      STATE.cart = STATE.cart.filter((c) => {
        if (purposeByMode_(c.mode) !== purposeByMode_(STATE.mode)) return true;
        return !successSet.has(normalizeText_(c.barcode));
      });
      writeCartStorage_();
    }

    await loadBootstrap_(root);

    const msg = failed.length
      ? `สำเร็จ ${success.length} รายการ, ไม่สำเร็จ ${failed.length} รายการ`
      : `สำเร็จ ${success.length} รายการ`;
    showToast(msg);
  } catch (err) {
    showToast(err?.message || "บันทึกรายการไม่สำเร็จ");
  } finally {
    STATE.submitting = false;
    renderAll_(root);
  }
}

function recoverCartOnMount_() {
  const saved = readCartStorage_();
  if (!saved.length) {
    STATE.cart = [];
    return;
  }
  const yes = window.confirm("พบรายการสแกนค้างอยู่ ต้องการกู้คืนหรือไม่?");
  STATE.cart = yes ? saved : [];
  writeCartStorage_();
}

function applyPrefillFromQuery_() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const mode = String(params.get("mode") || "").trim().toLowerCase();
    const barcode = String(params.get("barcode") || "").trim();

    if (mode === "borrow" || mode === "return") {
      STATE.mode = mode;
      STATE.purpose = purposeByMode_(mode);
    }
    if (barcode) addCartBarcode_(barcode, STATE.mode);
  } catch {
    // ignore malformed query
  }
}
function bindEvents_(root) {
  const mapToggle = root.querySelector("#memberLoanSelfMapToggle");
  const helpBtn = root.querySelector("#memberLoanSelfHelpBtn");
  const retryBtn = root.querySelector("#memberLoanSelfRetryBtn");
  const forceBtn = root.querySelector("#memberLoanSelfForceCheckBtn");
  const mapBackdrop = root.querySelector("#memberLoanSelfMapBackdrop");
  const mapClose = root.querySelector("#memberLoanSelfMapClose");
  const mapNav = root.querySelector("#memberLoanSelfMapNavBtn");

  forceBtn?.addEventListener("click", () => {
    checkZone_(root, true);
  });

  const chooseBorrow = root.querySelector("#memberLoanSelfChooseBorrow");
  const chooseReturn = root.querySelector("#memberLoanSelfChooseReturn");
  const backChoose = root.querySelector("#memberLoanSelfBackChoose");

  const openScan = root.querySelector("#memberLoanSelfOpenScanBtn");
  const openScanInline = root.querySelector("#memberLoanSelfOpenScanInlineBtn");
  const stopScan = root.querySelector("#memberLoanSelfStopScanBtn");
  const scannerBackdrop = root.querySelector("#memberLoanSelfScannerBackdrop");
  const clearCart = root.querySelector("#memberLoanSelfClearCartBtn");
  const manualInput = root.querySelector("#memberLoanSelfManualBarcode");
  const manualAddBtn = root.querySelector("#memberLoanSelfManualAddBtn");
  const confirmBtn = root.querySelector("#memberLoanSelfConfirmBtn");
  const confirmInlineBtn = root.querySelector("#memberLoanSelfConfirmInlineBtn");
  const cartList = root.querySelector("#memberLoanSelfCartList");

  mapToggle?.addEventListener("click", () => {
    setMapOpen_(true);
    renderAll_(root);
  });
  mapBackdrop?.addEventListener("click", () => {
    setMapOpen_(false);
    renderAll_(root);
  });
  mapClose?.addEventListener("click", () => {
    setMapOpen_(false);
    renderAll_(root);
  });
  mapNav?.addEventListener("click", () => {
    const nearest = getNearestMatch_();
    if (!nearest) return;
    const lat = Number(nearest.latitude);
    const lng = Number(nearest.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const origin = STATE.geo ? `&origin=${encodeURIComponent(`${STATE.geo.lat},${STATE.geo.lng}`)}` : "";
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${lat},${lng}`)}${origin}`;
    window.open(url, "_blank", "noopener,noreferrer");
  });

  helpBtn?.addEventListener("click", () => {
    showToast("กรุณาติดต่อเจ้าหน้าที่ห้องสมุดเพื่อช่วยตรวจสอบตำแหน่งและการทำรายการ");
  });
  retryBtn?.addEventListener("click", () => {
    STATE.geoTimeoutHit = false;
    STATE.geoVerifyDeadline = Date.now() + GEO_TIMEOUT_MS;
    STATE.geoSamples = [];
    STATE.geo = null;
    STATE.result = null;
    STATE.geoCheckStage = "เริ่มตรวจพิกัดใหม่";
    STATE.step = "verifying";
    renderAll_(root);
  });

  chooseBorrow?.addEventListener("click", () => {
    if (!canOperate_()) {
      showToast("ยังไม่ผ่านการตรวจพิกัด");
      return;
    }
    if (!canBorrowMore_()) {
      showToast("โควตาการยืมเต็มแล้ว ไม่สามารถยืมเพิ่มได้");
      return;
    }
    if (!hasActiveVisit_()) {
      showToast(visitBlockMessage_());
      return;
    }
    STATE.mode = "borrow";
    STATE.purpose = "borrow";
    STATE.step = "scan";
    STATE.batchResult = null;
    renderAll_(root);
  });
  chooseReturn?.addEventListener("click", () => {
    if (!canOperate_()) {
      showToast("ยังไม่ผ่านการตรวจพิกัด");
      return;
    }
    if (!hasActiveVisit_()) {
      showToast(visitBlockMessage_());
      return;
    }
    STATE.mode = "return";
    STATE.purpose = "return";
    STATE.step = "scan";
    STATE.batchResult = null;
    renderAll_(root);
  });
  backChoose?.addEventListener("click", () => {
    stopScanner_();
    STATE.step = "choose";
    renderAll_(root);
  });

  openScan?.addEventListener("click", () => {
    openScanner_(root);
  });
  openScanInline?.addEventListener("click", () => {
    openScanner_(root);
  });
  stopScan?.addEventListener("click", () => {
    stopScanner_();
    renderAll_(root);
  });
  scannerBackdrop?.addEventListener("click", () => {
    stopScanner_();
    renderAll_(root);
  });

  manualAddBtn?.addEventListener("click", async () => {
    const code = String(manualInput?.value || "").trim();
    if (!code) {
      showToast("กรุณากรอกบาร์โค้ดก่อนเพิ่มเข้าตะกร้า");
      return;
    }
    await addCartBarcode_(code, STATE.mode);
    if (manualInput) manualInput.value = "";
    renderAll_(root);
  });

  manualInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    manualAddBtn?.click();
  });

  clearCart?.addEventListener("click", () => {
    clearCartByMode_(STATE.mode);
    STATE.batchResult = null;
    renderAll_(root);
  });

  confirmBtn?.addEventListener("click", () => {
    submitBatch_(root);
  });
  confirmInlineBtn?.addEventListener("click", () => {
    submitBatch_(root);
  });

  cartList?.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-remove-cart]");
    if (!btn) return;
    const code = String(btn.getAttribute("data-remove-cart") || "").trim();
    if (!code) return;
    STATE.cart = STATE.cart.filter((x) => !(purposeByMode_(x.mode) === purposeByMode_(STATE.mode) && normalizeText_(x.barcode) === normalizeText_(code)));
    writeCartStorage_();
    renderAll_(root);
  });
}

export function renderMemberLoanSelfView() {
  return `
    <section id="memberLoanSelfRoot" class="view relative overflow-hidden rounded-[1.7rem] border border-violet-100 bg-[radial-gradient(circle_at_top,#f5f3ff_0%,#f8fafc_45%,#f8fafc_100%)] pb-24">
      <header class="sticky top-0 z-20 border-b border-slate-100 bg-white/90 px-3 py-3 backdrop-blur-xl">
        <div class="mx-auto flex w-full max-w-xl items-center justify-between gap-2">
          <div class="flex min-w-0 items-center gap-2">
            <div class="h-6 w-6 rounded-full bg-sky-600 text-center text-[10px] font-black leading-6 text-white">1</div>
            <p id="memberLoanSelfStepHint" class="truncate text-xs font-black text-slate-700">ขั้นตอนที่ 1: ตรวจสอบพิกัด</p>
          </div>
          <button id="memberLoanSelfMapToggle" type="button" class="rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-black text-slate-700">ดูแผนที่</button>
        </div>
        <div class="mx-auto mt-2 flex w-full max-w-xl items-center gap-2">
          <div class="flex flex-col items-center gap-1">
            <div id="memberLoanSelfStep1Circle" class="h-6 w-6 rounded-full border border-slate-200 bg-white text-[10px] font-black text-slate-400 flex items-center justify-center">1</div>
            <span id="memberLoanSelfStep1Label" class="text-[10px] font-bold text-slate-400">ตรวจพิกัด</span>
          </div>
          <div class="h-[2px] flex-1 overflow-hidden rounded bg-slate-100"><div id="memberLoanSelfLine1Fill" class="h-full w-full -translate-x-full bg-emerald-400 transition-transform duration-700"></div></div>
          <div class="flex flex-col items-center gap-1">
            <div id="memberLoanSelfStep2Circle" class="h-6 w-6 rounded-full border border-slate-200 bg-white text-[10px] font-black text-slate-400 flex items-center justify-center">2</div>
            <span id="memberLoanSelfStep2Label" class="text-[10px] font-bold text-slate-400">เลือกโหมด</span>
          </div>
          <div class="h-[2px] flex-1 overflow-hidden rounded bg-slate-100"><div id="memberLoanSelfLine2Fill" class="h-full w-full -translate-x-full bg-emerald-400 transition-transform duration-700"></div></div>
          <div class="flex flex-col items-center gap-1">
            <div id="memberLoanSelfStep3Circle" class="h-6 w-6 rounded-full border border-slate-200 bg-white text-[10px] font-black text-slate-400 flex items-center justify-center">3</div>
            <span id="memberLoanSelfStep3Label" class="text-[10px] font-bold text-slate-400">สแกน</span>
          </div>
        </div>
      </header>

      <main class="mx-auto flex w-full max-w-xl flex-col gap-3 px-3 py-3 pb-40">
        <article id="memberLoanSelfStatus" class="member-loan-self-glass rounded-3xl p-4">
          <p id="memberLoanSelfStatusTitle" class="text-sm font-black uppercase tracking-[0.11em] text-sky-700">กำลังตรวจสอบตำแหน่งจุดบริการ...</p>
          <p id="memberLoanSelfStatusDetail" class="mt-1 text-sm font-bold text-slate-700">โปรดรอสักครู่</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button id="memberLoanSelfForceCheckBtn" type="button" class="hidden rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-black text-white">ตรวจสอบพิกัดทันที</button>
            <button id="memberLoanSelfRetryBtn" type="button" class="hidden rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700">ลองใหม่อีกครั้ง</button>
            <button id="memberLoanSelfHelpBtn" type="button" class="hidden rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-black text-white">ขอความช่วยเหลือจากเจ้าหน้าที่</button>
          </div>
        </article>

        <article id="memberLoanSelfPolicy" class="member-loan-self-glass rounded-3xl p-3"></article>

        <section id="memberLoanSelfStepVerify" class="member-loan-self-step-panel rounded-3xl border border-slate-200 bg-white p-5">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 animate-spin rounded-full border-4 border-sky-100 border-t-sky-600"></div>
            <div>
              <p class="text-base font-black text-slate-800">กำลังตรวจสอบตำแหน่ง</p>
              <p class="text-xs font-semibold text-slate-500">ระบบอัปเดตพิกัดทุก 5 วินาทีจนกว่าจะพร้อม</p>
            </div>
          </div>
        </section>

        <section id="memberLoanSelfStepChoose" class="member-loan-self-step-panel hidden rounded-3xl border border-slate-200 bg-white p-4">
          <p class="text-center text-lg font-black text-slate-800">คุณต้องการทำรายการอะไร?</p>
          <p class="mt-1 text-center text-sm font-semibold text-slate-500">เลือกโหมดการใช้งาน</p>
          <div class="mt-4 grid gap-3">
            <button id="memberLoanSelfChooseBorrow" type="button" class="rounded-[1.6rem] border border-emerald-200 bg-emerald-50 p-5 text-center">
              <p class="text-lg font-black text-emerald-900">ฉันต้องการยืมหนังสือ</p>
              <p class="mt-1 text-xs font-semibold text-emerald-700">สแกนบาร์โค้ดเพื่อยืมเล่มใหม่</p>
            </button>
            <p id="memberLoanSelfChooseBorrowReason" class="hidden rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700"></p>
            <button id="memberLoanSelfChooseReturn" type="button" class="rounded-[1.6rem] border border-sky-200 bg-sky-50 p-5 text-center">
              <p class="text-lg font-black text-sky-900">ฉันต้องการคืนหนังสือ</p>
              <p class="mt-1 text-xs font-semibold text-sky-700">สแกนบาร์โค้ดเพื่อคืนรายการ</p>
            </button>
          </div>
        </section>

        <section id="memberLoanSelfStepScan" class="member-loan-self-step-panel hidden space-y-3 rounded-3xl border border-slate-200 bg-white p-4">
          <div class="flex items-center justify-between gap-2">
            <p id="memberLoanSelfScanMode" class="text-sm font-black text-slate-800">โหมดยืม (Scan to Cart)</p>
            <button id="memberLoanSelfBackChoose" type="button" class="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-600">กลับ</button>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p class="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">รายการในตะกร้า</p>
            <p class="mt-1 text-2xl font-black text-slate-800"><span id="memberLoanSelfCartCount">0</span> เล่ม</p>
            <div id="memberLoanSelfScanFlash" class="mt-2 hidden rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700"></div>
          </div>

          <div id="memberLoanSelfCartList" class="space-y-2"></div>

          <div class="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input id="memberLoanSelfManualBarcode" type="text" placeholder="กรอกบาร์โค้ด (กรณีกล้องใช้งานไม่ได้)" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700" />
            <button id="memberLoanSelfManualAddBtn" type="button" class="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-black text-sky-700">เพิ่มเข้าตะกร้า</button>
          </div>
          <p id="memberLoanSelfQuotaWarn" class="hidden text-xs font-black text-rose-700">โควตาการยืมเต็มแล้ว (0 คงเหลือ) กรุณาคืนหนังสือก่อนยืมเพิ่ม</p>
          <p id="memberLoanSelfVisitWarn" class="hidden text-xs font-black text-rose-700">ต้องเช็คอินห้องสมุดก่อนใช้งาน กรุณาไปที่ /app/checkin</p>

          <p id="memberLoanSelfCameraHint" class="text-[11px] font-semibold text-slate-500">สแกนด้วยกล้องได้ตามปกติ</p>

          <div class="grid grid-cols-2 gap-2">
            <button id="memberLoanSelfStopScanBtn" type="button" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">หยุดสแกน</button>
            <button id="memberLoanSelfClearCartBtn" type="button" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">ล้างตะกร้า</button>
          </div>

          <div class="space-y-2">
            <button id="memberLoanSelfOpenScanInlineBtn" type="button" class="w-full rounded-2xl bg-emerald-100 px-4 py-3 text-sm font-black text-emerald-800">เปิดกล้องสแกน</button>
            <button id="memberLoanSelfConfirmInlineBtn" type="button" class="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white">ยืนยันรายการ</button>
          </div>

          <div id="memberLoanSelfBatchSummary"></div>
        </section>
      </main>

      <footer id="memberLoanSelfBottomBar" class="fixed inset-x-0 bottom-0 z-30 hidden border-t border-slate-200 bg-white/90 px-3 py-3 backdrop-blur-xl">
        <div class="mx-auto flex w-full max-w-xl items-center gap-2">
          <button id="memberLoanSelfOpenScanBtn" type="button" class="h-14 w-20 shrink-0 rounded-2xl bg-emerald-100 text-xs font-black text-emerald-800">สแกนเพิ่ม</button>
          <button id="memberLoanSelfConfirmBtn" type="button" class="h-14 flex-1 rounded-2xl bg-slate-900 px-4 text-sm font-black text-white">ยืนยันรายการ</button>
        </div>
      </footer>

      <div id="memberLoanSelfScannerBackdrop" class="fixed inset-0 z-50 bg-slate-950/70 opacity-0 pointer-events-none"></div>
      <aside id="memberLoanSelfScannerSheet" class="member-loan-self-scanner-sheet fixed inset-x-0 bottom-0 z-[60] translate-y-full rounded-t-[1.75rem] border border-slate-700 bg-slate-950 p-4 opacity-0">
        <div class="mx-auto w-full max-w-xl">
          <div class="mb-3 flex items-center justify-between">
            <p id="memberLoanSelfScannerMode" class="text-sm font-black text-white">โหมดยืม</p>
            <p class="rounded-full bg-white/15 px-3 py-1 text-xs font-black text-white">ในตะกร้า <span id="memberLoanSelfScannerCartCount">0</span></p>
          </div>
          <div class="relative overflow-hidden rounded-2xl border border-slate-700 bg-black">
            <video id="memberLoanSelfScannerVideo" class="aspect-[4/3] w-full object-cover" playsinline muted></video>
            <div class="member-loan-self-viewfinder pointer-events-none absolute inset-3 rounded-[1.1rem]"></div>
          </div>
        </div>
      </aside>

      <div id="memberLoanSelfMapBackdrop" class="fixed inset-0 z-40 bg-slate-900/45 opacity-0 pointer-events-none backdrop-blur-[2px]"></div>
      <aside id="memberLoanSelfMapSheet" class="fixed inset-x-0 bottom-0 z-50 max-h-[86dvh] translate-y-full overflow-hidden rounded-t-3xl border border-slate-200 bg-white/95 opacity-0 shadow-2xl backdrop-blur transition duration-300 [transition-timing-function:cubic-bezier(0.32,0.72,0,1)]">
        <header class="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h3 class="text-sm font-black text-slate-800">ตำแหน่งและจุดบริการ</h3>
          <button id="memberLoanSelfMapClose" type="button" class="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-black text-slate-600">ปิด</button>
        </header>
        <div class="space-y-3 overflow-y-auto p-4">
          <div id="memberLoanSelfMapBody"></div>
          <button id="memberLoanSelfMapNavBtn" type="button" class="hidden w-full rounded-xl bg-sky-600 px-3 py-2 text-sm font-black text-white">เปิดแอปนำทาง</button>
        </div>
      </aside>
    </section>
  `;
}

export function mountMemberLoanSelfView(container) {
  const root = container.querySelector("#memberLoanSelfRoot");
  if (!root) return;

  ensureNativeStyles_();
  cleanupState_();

  STATE.root = root;
  STATE.step = "verifying";
  STATE.mode = "borrow";
  STATE.purpose = "borrow";

  STATE.bootstrapLoading = false;
  STATE.checking = false;
  STATE.submitting = false;
  STATE.scannerOpen = false;

  STATE.policy = null;
  STATE.quota = null;
  STATE.visit = { required: true, active: false, session: null };
  STATE.activeLoans = [];

  STATE.geo = null;
  STATE.geoSamples = [];
  STATE.geoError = "";
  STATE.geoTimeoutHit = false;
  STATE.geoVerifyDeadline = 0;
  STATE.geoCheckStage = "กำลังเริ่มต้นระบบ";
  STATE.lastCheckAt = 0;
  STATE.result = null;

  STATE.mapOpen = false;
  STATE.scanFlash = "";

  STATE.bookMetaByBarcode = {};
  STATE.bookMetaLoadingByBarcode = {};
  STATE.pendingBarcodeByMode = {};
  STATE.batchResult = null;

  recoverCartOnMount_();
  applyPrefillFromQuery_();
  bindEvents_(root);
  renderAll_(root);

  const onBeforeUnload = () => cleanupState_();
  window.addEventListener("beforeunload", onBeforeUnload);

  loadBootstrap_(root);
  startGeoTracking_(root);
}
