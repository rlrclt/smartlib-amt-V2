import {
  checkServiceLocationAccess,
  createLoanSelfBorrow,
  createLoanSelfReturn,
  fetchBookCatalogByBarcode,
  fetchLoanSelfBootstrap,
  validateLoanSelfBarcode,
} from "../../services/loan_self.service.js";
import { closeScanner, isScannerSupported, openScanner } from "../../components/scanner_module.js";
import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";

// --- MAP INTEGRATION ---
let leafletLoaderPromise = null;
async function loadLeaflet_() {
  if (window.L) return window.L;
  if (!document.getElementById("leafletCss")) {
    const link = document.createElement("link");
    link.id = "leafletCss";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    document.head.appendChild(link);
  }
  if (!leafletLoaderPromise) {
    leafletLoaderPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById("leafletScript");
      if (existing) {
        existing.addEventListener("load", () => resolve(window.L), { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.id = "leafletScript";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = () => resolve(window.L);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return leafletLoaderPromise;
}

async function initLeafletMap(containerId, lat, lng) {
  const L = await loadLeaflet_();
  const container = document.getElementById(containerId);
  if (!container) return null;
  if (container._leaflet_id) container._leaflet_id = null;
  const map = L.map(container, { zoomControl: true }).setView([lat, lng], 16);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 20,
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
  const marker = L.marker([lat, lng]).addTo(map);
  return { L, map, marker };
}
// --- END MAP ---

const TRACKING_REFRESH_MS = 4000;
const GEO_TIMEOUT_MS = 30000; // เพิ่มเป็น 30s เพื่อให้ indoor มีโอกาสมากขึ้น
const FLASH_MS = 1200;
const GEO_FASTPASS_ACCURACY = Number.POSITIVE_INFINITY;
const GEO_STABLE_ACCURACY = Number.POSITIVE_INFINITY;
const GEO_MAX_SAMPLE_ACCURACY = Number.POSITIVE_INFINITY;
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
  mapPreview: null,
  scannerFacingMode: "environment",
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
  autoCheckStopped: false,
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
    .step-circle {
      transition: all .4s cubic-bezier(.4, 0, .2, 1);
    }
    .mode-card {
      transition: all .3s ease;
      cursor: pointer;
    }
    .mode-card:not(:disabled):hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 25px rgba(0,0,0,.1);
    }
    .cart-item-enter {
      animation: memberLoanSelfCartIn .3s ease-out both;
    }
    @keyframes memberLoanSelfCartIn {
      from { opacity: 0; transform: translateX(-20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    .member-loan-self-glass {
      background: rgba(255, 255, 255, 0.82);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(14, 165, 233, 0.14);
    }
    .member-loan-self-step-panel {
      animation: memberLoanSelfSlideIn .26s cubic-bezier(0.32, 0.72, 0, 1) both;
    }
    .member-loan-self-btn-hover {
      transition: transform .2s ease, background-color .2s ease, color .2s ease, border-color .2s ease;
    }
    .member-loan-self-btn-hover:active {
      transform: scale(.96);
    }
    .member-loan-self-sheet {
      transition: opacity .3s ease;
    }
    .member-loan-self-sheet-content {
      transition: transform .4s cubic-bezier(.4, 0, .2, 1);
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
  return sampleCount >= GEO_MIN_STABLE_SAMPLES;
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

function shouldRejectJump_(sample) {
  const prev = STATE.geoSamples.length ? STATE.geoSamples[STATE.geoSamples.length - 1] : null;
  if (!prev) return false;
  const dtMs = Number(sample.ts || 0) - Number(prev.ts || 0);
  if (!Number.isFinite(dtMs) || dtMs <= 0 || dtMs > GEO_JUMP_REJECT_WINDOW_MS) return false;
  const distance = haversineMeters_(prev.lat, prev.lng, sample.lat, sample.lng);
  return distance > GEO_JUMP_REJECT_METERS && Number(sample.accuracy || 0) >= Number(prev.accuracy || 0);
}

function pushGeoSample_(sample) {
  console.log("[GPS] New Sample:", sample);
  if (!sample || !Number.isFinite(sample.lat) || !Number.isFinite(sample.lng)) {
    console.warn("[GPS] Invalid sample coordinates");
    return null;
  }
  const acc = Number(sample.accuracy || 0);
  if (Number.isFinite(acc) && acc > GEO_MAX_SAMPLE_ACCURACY) {
    console.warn(`[GPS] Sample received with low accuracy: ${acc}m`);
  }
  if (shouldRejectJump_(sample)) {
    console.warn("[GPS] Sample rejected: Jump detected");
    return null;
  }

  STATE.geoSamples.push(sample);
  if (STATE.geoSamples.length > 5) STATE.geoSamples = STATE.geoSamples.slice(-5);

  const lat = medianNumber_(STATE.geoSamples.map((s) => s.lat));
  const lng = medianNumber_(STATE.geoSamples.map((s) => s.lng));
  const accuracy = medianNumber_(STATE.geoSamples.map((s) => s.accuracy));
  
  console.log(`[GPS] Stable Result - Lat: ${lat}, Lng: ${lng}, Acc: ${accuracy}m, Samples: ${STATE.geoSamples.length}`);
  
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
    const res = await fetchBookCatalogByBarcode({ barcode: code });
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
  const needRetry = Boolean(STATE.geoError || !STATE.geo || !isGeoPreciseEnough_() || STATE.geoTimeoutHit);

  help.classList.toggle("hidden", !needRetry);
  retry.classList.toggle("hidden", !needRetry);
  
  // Show force check if accuracy is borderline but not quite at STABLE threshold
  forceBtn.textContent = "ตรวจสอบตำแหน่งอีกครั้ง";
  forceBtn.classList.toggle("hidden", !needRetry);

  if (STATE.geoError) {
    box.className = "bg-white rounded-xl shadow-sm p-4 border border-rose-100";
    title.className = "text-sm font-semibold text-rose-700";
    title.textContent = "ไม่สามารถอ่านตำแหน่ง GPS";
    detail.className = "mt-0.5 text-xs text-rose-600";
    detail.textContent = STATE.geoError;
    return;
  }

  if (STATE.checking && !STATE.result) {
    box.className = "bg-white rounded-xl shadow-sm p-4 border border-sky-100";
    title.className = "text-sm font-semibold text-gray-700";
    title.textContent = "กำลังตรวจสอบพิกัด...";
    detail.className = "mt-0.5 text-xs text-gray-500";
    detail.textContent = `ระบบกำลังตรวจสอบ: ${STATE.geoCheckStage || "โปรดรอสักครู่"}`;
    return;
  }

  if (!STATE.result || !isGeoPreciseEnough_()) {
    const geoAge = STATE.geo?.ts ? Math.round((Date.now() - STATE.geo.ts) / 1000) : "-";
    box.className = "bg-white rounded-xl shadow-sm p-4 border border-amber-100";
    title.className = "text-sm font-semibold text-gray-700";
    title.textContent = "กำลังตรวจสอบพิกัด...";
    detail.className = "mt-0.5 text-xs text-gray-500";
    detail.innerHTML = `
      <div class="space-y-1">
        <p>${STATE.geoCheckStage || "รอข้อมูลพิกัด"}</p>
        <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div class="bg-gray-50 rounded-lg p-2"><span class="text-gray-500">ละติจูด</span><p class="font-mono font-semibold text-gray-700">${STATE.geo ? Number(STATE.geo.lat).toFixed(5) : "--"}</p></div>
          <div class="bg-gray-50 rounded-lg p-2"><span class="text-gray-500">ลองจิจูด</span><p class="font-mono font-semibold text-gray-700">${STATE.geo ? Number(STATE.geo.lng).toFixed(5) : "--"}</p></div>
          <div class="bg-gray-50 rounded-lg p-2"><span class="text-gray-500">ความแม่นยำ</span><p class="font-mono font-semibold text-gray-700">${accuracy || "--"}m</p></div>
          <div class="bg-gray-50 rounded-lg p-2"><span class="text-gray-500">อายุพิกัด</span><p class="font-mono font-semibold text-gray-700">${geoAge}s · ${sampleCount}/${GEO_MIN_STABLE_SAMPLES}</p></div>
        </div>
      </div>
    `;
    return;
  }

  if (STATE.result.allowed) {
    box.className = "bg-white rounded-xl shadow-sm p-4 border border-emerald-100";
    title.className = "text-sm font-semibold text-emerald-700";
    title.textContent = "พร้อมทำรายการ";
    detail.className = "mt-0.5 text-xs text-emerald-700";
    detail.textContent = nearest
      ? `ใกล้จุด ${nearest.location_name || "-"} ระยะ ${roundMeters_(nearest.distance_meters)}m จากรัศมี ${roundMeters_(nearest.range_meters)}m`
      : "พร้อมทำรายการ";
    return;
  }

  box.className = "bg-white rounded-xl shadow-sm p-4 border border-rose-100";
  title.className = "text-sm font-semibold text-rose-700";
  title.textContent = "อยู่นอกเขตที่อนุญาต";
  detail.className = "mt-0.5 text-xs text-rose-600";
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
  el.innerHTML = `
    <div class="flex items-center gap-2 mb-2">
      <span class="text-blue-600">▣</span>
      <h3 class="text-sm font-bold text-blue-800">สิทธิ์การยืมของคุณ</h3>
    </div>
    <div class="grid grid-cols-3 gap-3 mt-2">
      <div class="text-center">
        <p class="text-2xl font-bold text-blue-600">${escapeHtml(String(quota.remaining || 0))}</p>
        <p class="text-xs text-blue-600">โควตาเหลือ</p>
      </div>
      <div class="text-center">
        <p class="text-2xl font-bold text-blue-600">${escapeHtml(String(policy.loanDays || 0))}</p>
        <p class="text-xs text-blue-600">วันยืมสูงสุด</p>
      </div>
      <div class="text-center">
        <p class="text-2xl font-bold text-blue-600">${escapeHtml(String(STATE.activeLoans.length || 0))}</p>
        <p class="text-xs text-blue-600">กำลังยืม</p>
      </div>
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
      el.className = "step-circle w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-emerald-500 text-white";
      return;
    }
    if (active) {
      el.className = "step-circle w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-blue-500 text-white";
      return;
    }
    el.className = "step-circle w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-gray-200 text-gray-500";
  };

  applyCircle(circles.verify, stepIndex === 1, stepIndex > 1 || canOperate_());
  applyCircle(circles.choose, stepIndex === 2, stepIndex > 2);
  applyCircle(circles.scan, stepIndex === 3, false);

  labels.verify.className = `text-xs mt-1 ${stepIndex === 1 ? "text-blue-600" : "text-emerald-600"} font-medium`;
  labels.choose.className = `text-xs mt-1 ${stepIndex === 2 ? "text-blue-600 font-medium" : (stepIndex > 2 ? "text-emerald-600 font-medium" : "text-gray-400")}`;
  labels.scan.className = `text-xs mt-1 ${stepIndex === 3 ? "text-blue-600 font-medium" : "text-gray-400"}`;

  line1.style.transform = stepIndex >= 2 ? "translateX(0)" : "translateX(-100%)";
  line2.style.transform = stepIndex >= 3 ? "translateX(0)" : "translateX(-100%)";
}

function renderWorkflow_(root) {
  const verify = root.querySelector("#memberLoanSelfStepVerify");
  const verifySpinner = root.querySelector("#memberLoanSelfVerifySpinner");
  const verifyTitle = root.querySelector("#memberLoanSelfVerifyTitle");
  const verifyHint = root.querySelector("#memberLoanSelfVerifyHint");
  const choose = root.querySelector("#memberLoanSelfStepChoose");
  const scan = root.querySelector("#memberLoanSelfStepScan");
  const chooseBorrowReason = root.querySelector("#memberLoanSelfChooseBorrowReason");
  if (!verify || !choose || !scan) return;

  verify.classList.toggle("hidden", STATE.step !== "verifying");
  choose.classList.toggle("hidden", STATE.step !== "choose");
  scan.classList.toggle("hidden", STATE.step !== "scan");
  if (verifySpinner && verifyTitle && verifyHint) {
    const waiting = STATE.checking || !STATE.result;
    verifySpinner.className = waiting
      ? "h-10 w-10 animate-spin rounded-full border-4 border-sky-100 border-t-sky-600"
      : "h-10 w-10 rounded-full border-4 border-emerald-100 border-emerald-500";
    verifyTitle.textContent = waiting ? "กำลังตรวจสอบตำแหน่ง" : "ตรวจสอบตำแหน่งแล้ว";
    verifyHint.textContent = waiting
      ? "ระบบกำลังอ่านพิกัดจากอุปกรณ์"
      : "หากตำแหน่งไม่ถูกต้อง กดปุ่ม \"ตรวจสอบตำแหน่งอีกครั้ง\"";
  }

  if (chooseBorrowReason) {
    const remaining = Number(STATE.quota?.remaining || 0);
    const quota = Number(STATE.quota?.quota || 0);
    const blocked = !canBorrowMore_();
    chooseBorrowReason.classList.toggle("hidden", !blocked);
    if (blocked) {
      chooseBorrowReason.textContent = `ยังยืมเพิ่มไม่ได้: โควตาคงเหลือ ${Math.max(0, remaining)}/${Math.max(0, quota)} กรุณาคืนหนังสือก่อน`;
    }
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
  if (!open && STATE.mapPreview?.map) {
    STATE.mapPreview.map.remove();
    STATE.mapPreview = null;
  }

  const nearest = getNearestMatch_();
  navBtn.classList.toggle("hidden", !(nearest && Number.isFinite(Number(nearest.latitude)) && Number.isFinite(Number(nearest.longitude))));

  const matches = Array.isArray(STATE.result?.matches)
    ? STATE.result.matches.filter((m) => Number.isFinite(Number(m.latitude)) && Number.isFinite(Number(m.longitude)))
    : [];

  if (!STATE.geo || !matches.length) {
    if (STATE.mapPreview?.map) {
      STATE.mapPreview.map.remove();
      STATE.mapPreview = null;
    }
    mapBody.innerHTML = '<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">ยังไม่มีข้อมูลพิกัดเพียงพอสำหรับแสดงแผนที่</div>';
    return;
  }

  const userLat = Number(STATE.geo.lat);
  const userLng = Number(STATE.geo.lng);
  const mapKey = JSON.stringify({
    userLat: Number(userLat.toFixed(6)),
    userLng: Number(userLng.toFixed(6)),
    matches: matches.map((m) => [String(m.id || ""), Number(Number(m.latitude).toFixed(6)), Number(Number(m.longitude).toFixed(6)), Number(m.range_meters || 0)]),
    nearestId: String(nearest?.id || ""),
  });
  if (STATE.mapPreview?.key === mapKey && STATE.mapPreview?.map) {
    setTimeout(() => STATE.mapPreview?.map.invalidateSize(), 10);
    return;
  }
  if (STATE.mapPreview?.map) {
    STATE.mapPreview.map.remove();
    STATE.mapPreview = null;
  }

  mapBody.innerHTML = '<div id="memberLoanSelfMapCanvas" class="h-[360px] w-full rounded-2xl border border-slate-200"></div>';
  initLeafletMap("memberLoanSelfMapCanvas", userLat, userLng).then((ctx) => {
    if (!ctx || STATE.mapOpen !== true) return;
    const { L, map, marker } = ctx;
    marker.bindPopup("ตำแหน่งของคุณ");
    const bounds = [[userLat, userLng]];
    matches.forEach((m) => {
      const lat = Number(m.latitude);
      const lng = Number(m.longitude);
      const rangeMeters = Math.max(0, Number(m.range_meters || 0));
      bounds.push([lat, lng]);
      L.circle([lat, lng], {
        radius: Math.max(10, rangeMeters),
        color: "#16a34a",
        fillColor: "#22c55e",
        fillOpacity: 0.12,
        weight: 1.5,
      }).addTo(map);
      L.marker([lat, lng]).addTo(map).bindPopup(escapeHtml(String(m.name || m.id || "จุดบริการ")));
    });
    if (nearest && Number.isFinite(Number(nearest.latitude)) && Number.isFinite(Number(nearest.longitude))) {
      L.polyline([[userLat, userLng], [Number(nearest.latitude), Number(nearest.longitude)]], {
        color: "#0f766e",
        weight: 3,
        dashArray: "6 6",
      }).addTo(map);
    }
    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [24, 24] });
    } else {
      map.setView([userLat, userLng], 16);
    }
    setTimeout(() => map.invalidateSize(), 10);
    STATE.mapPreview = { key: mapKey, map };
  }).catch(() => {
    mapBody.innerHTML = '<div class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">โหลดแผนที่ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</div>';
  });
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
      <div class="bg-white rounded-xl shadow-sm p-4 text-center border border-slate-100">
        <p class="text-xs text-gray-400">ยังไม่มีรายการในตะกร้า</p>
        <p class="text-xs text-gray-300 mt-0.5">สแกนหรือกรอกรหัสบาร์โค้ดเพื่อเริ่มต้น</p>
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
          <article class="cart-item-enter bg-white rounded-xl shadow-sm p-3 border border-slate-100">
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
              <button type="button" data-remove-cart="${escapeHtml(item.barcode)}" class="member-loan-self-btn-hover shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-black text-slate-600">ลบ</button>
            </div>
            <p class="mt-2 text-[11px] font-semibold text-slate-500">ลำดับ ${idx + 1} · ${escapeHtml(safeDate_(item.ts))}</p>
            ${returnHint}
          </article>
        `;
      })
      .join("");
  }

  const borrowBlocked = STATE.mode === "borrow" && !canBorrowMore_();
  confirmBtn.disabled = STATE.submitting || cart.length === 0 || !canOperate_() || borrowBlocked;
  confirmBtn.className = `member-loan-self-btn-hover flex-1 py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 ${confirmBtn.disabled ? "bg-slate-300 text-slate-600 cursor-not-allowed" : "bg-green-500 text-white hover:bg-green-600"}`;
  confirmBtn.textContent = STATE.submitting
    ? "กำลังประมวลผล..."
    : (STATE.mode === "borrow" ? `ยืนยันการยืมทั้งหมด ${cart.length} เล่ม` : `ยืนยันการคืนทั้งหมด ${cart.length} เล่ม`);

  const report = STATE.batchResult;
  if (!report) {
    summary.innerHTML = "";
    return;
  }

  summary.innerHTML = `
    <article class="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
      <p class="text-sm font-black text-slate-800">สรุปผลล่าสุด</p>
      <p class="mt-1 text-xs font-semibold text-emerald-700">สำเร็จ ${report.success.length} รายการ</p>
      <p class="mt-0.5 text-xs font-semibold text-rose-700">ไม่สำเร็จ ${report.failed.length} รายการ</p>
      ${report.failed.length ? `<div class="mt-2 space-y-1">${report.failed.map((f) => `<p class="text-[11px] font-semibold text-rose-700">${escapeHtml(f.barcode)}: ${escapeHtml(f.error)}</p>`).join("")}</div>` : ""}
    </article>
  `;
}

function renderSubmissionOverlays_(root) {
  const submittingOverlay = root.querySelector("#memberLoanSelfSubmittingOverlay");
  const resultSheet = root.querySelector("#memberLoanSelfResultSheet");
  const resultSummary = root.querySelector("#memberLoanSelfResultSummary");
  const resultList = root.querySelector("#memberLoanSelfResultList");

  if (submittingOverlay) {
    submittingOverlay.classList.toggle("hidden", !STATE.submitting);
    submittingOverlay.classList.toggle("flex", STATE.submitting);
  }

  if (!resultSheet || !resultSummary || !resultList) return;
  const report = STATE.batchResult;
  const open = Boolean(report && !STATE.submitting);
  resultSheet.classList.toggle("hidden", !open);
  if (!open) {
    resultSummary.textContent = "";
    resultList.innerHTML = "";
    return;
  }

  const success = Array.isArray(report.success) ? report.success : [];
  const failed = Array.isArray(report.failed) ? report.failed : [];
  resultSummary.textContent = `ดำเนินการทั้งหมด ${success.length + failed.length} รายการ (สำเร็จ ${success.length} | ไม่สำเร็จ ${failed.length})`;
  resultList.innerHTML = [
    ...success.map((item) => ({ barcode: item.barcode, ok: true, message: STATE.mode === "borrow" ? "ยืมสำเร็จ" : "คืนสำเร็จ" })),
    ...failed.map((item) => ({ barcode: item.barcode, ok: false, message: item.error || "ทำรายการไม่สำเร็จ" })),
  ].map((item) => `
    <div class="flex items-center gap-3 p-3 rounded-lg ${item.ok ? "bg-green-50" : "bg-red-50"}">
      <div class="w-8 h-8 rounded-full ${item.ok ? "bg-green-200 text-green-700" : "bg-red-200 text-red-700"} flex items-center justify-center flex-shrink-0 text-sm font-black">
        ${item.ok ? "✓" : "!"}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-mono font-semibold text-gray-700 truncate">${escapeHtml(item.barcode || "-")}</p>
        <p class="text-xs ${item.ok ? "text-green-600" : "text-red-600"}">${escapeHtml(item.message)}</p>
      </div>
    </div>
  `).join("");
}

function renderAll_(root) {
  renderProgress_(root);
  renderStatusBanner_(root);
  renderPolicy_(root);
  renderWorkflow_(root);
  renderMapPopup_(root);
  renderScanCart_(root);
  renderSubmissionOverlays_(root);

  const mapToggles = root.querySelectorAll("[data-member-loan-self-map-toggle]");
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

  if (mapToggles?.length) {
    mapToggles.forEach((btn) => {
      btn.disabled = false;
    });
  }
  if (scanBtn) {
    const borrowBlocked = STATE.mode === "borrow" && !canBorrowMore_();
    scanBtn.disabled = STATE.step !== "scan" || !canOperate_() || !STATE.cameraSupported || borrowBlocked;
    scanBtn.className = `member-loan-self-btn-hover flex-1 py-3 rounded-xl font-semibold text-sm ${scanBtn.disabled ? "bg-slate-200 text-slate-500" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`;
    scanBtn.textContent = STATE.scannerOpen ? "กำลังสแกน" : "สแกนเพิ่ม";
  }
  if (scanInlineBtn) {
    const borrowBlocked = STATE.mode === "borrow" && !canBorrowMore_();
    scanInlineBtn.disabled = STATE.step !== "scan" || !canOperate_() || !STATE.cameraSupported || borrowBlocked;
    scanInlineBtn.className = `member-loan-self-btn-hover w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${scanInlineBtn.disabled ? "bg-slate-200 text-slate-500" : "bg-blue-500 text-white hover:bg-blue-600"}`;
    scanInlineBtn.textContent = STATE.scannerOpen ? "กำลังสแกน..." : "เปิดกล้องสแกน";
  }
  if (cameraHint) {
    cameraHint.textContent = STATE.cameraSupported
      ? "สแกนด้วยกล้องได้ตามปกติ"
      : "อุปกรณ์นี้ไม่รองรับการเข้าถึงกล้อง สามารถกรอกบาร์โค้ดด้านล่างแทนได้";
    cameraHint.className = `text-[11px] font-semibold ${STATE.cameraSupported ? "text-slate-500" : "text-amber-700"}`;
  }
  if (stopScanBtn) {
    stopScanBtn.disabled = !STATE.scannerOpen;
    stopScanBtn.className = `member-loan-self-btn-hover rounded-xl border px-3 py-2 text-xs font-black ${STATE.scannerOpen ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-400"}`;
  }
  if (stepHint) {
    stepHint.textContent = STATE.step === "verifying"
      ? "ขั้นตอนที่ 1: ตรวจสอบพิกัด"
      : STATE.step === "choose"
        ? "ขั้นตอนที่ 2: เลือกรายการ"
        : "ขั้นตอนที่ 3: สแกนเข้าตะกร้าและยืนยัน";
  }
  if (chooseBorrow) {
    const blocked = !canBorrowMore_();
    chooseBorrow.disabled = blocked;
    chooseBorrow.className = `mode-card bg-white rounded-xl shadow-sm p-5 border-2 text-center ${blocked ? "border-slate-200 bg-slate-100 text-slate-500" : "border-transparent hover:border-blue-300"}`;
  }
  if (chooseReturn) {
    chooseReturn.disabled = false;
    chooseReturn.className = "mode-card bg-white rounded-xl shadow-sm p-5 border-2 text-center border-transparent hover:border-blue-300";
  }
  if (manualAddBtn) {
    const blocked = STATE.mode === "borrow" && !canBorrowMore_();
    manualAddBtn.disabled = blocked;
    manualAddBtn.className = `member-loan-self-btn-hover rounded-lg px-4 py-2 text-sm font-medium transition ${blocked ? "bg-slate-200 text-slate-500" : "bg-gray-800 text-white hover:bg-gray-900"}`;
  }
  if (manualInput) {
    manualInput.disabled = STATE.mode === "borrow" && !canBorrowMore_();
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
  const scannerFacing = root.querySelector("#memberLoanSelfScannerFacing");
  const scannerStatus = root.querySelector("#memberLoanSelfScannerStatus");
  if (scannerFacing) {
    scannerFacing.textContent = STATE.scannerFacingMode === "environment" ? "กล้องหลัง" : "กล้องหน้า";
  }
  if (scannerStatus) {
    scannerStatus.textContent = STATE.scannerOpen ? "สแกนบาร์โค้ดได้เลย" : "กำลังเปิดกล้อง...";
  }
  if (bottomBar) {
    const active = STATE.step === "scan";
    bottomBar.className = `fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-30 transition ${active ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`;
    bottomBar.classList.toggle("hidden", !active);
  }
  if (confirmInlineBtn && confirmBtn) {
    confirmInlineBtn.disabled = confirmBtn.disabled;
    confirmInlineBtn.textContent = confirmBtn.textContent;
    confirmInlineBtn.className = `member-loan-self-btn-hover w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${confirmBtn.disabled ? "bg-slate-300 text-slate-600" : "bg-green-500 text-white hover:bg-green-600"}`;
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

function toggleScannerFacingMode_() {
  STATE.scannerFacingMode = STATE.scannerFacingMode === "environment" ? "user" : "environment";
  return STATE.scannerFacingMode;
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

function stopAutoCheck_() {
  STATE.autoCheckStopped = true;
}

function cleanupState_() {
  clearScanFlash_();
  stopScanner_();
  clearTracking_();
  if (STATE.mapPreview?.map) {
    STATE.mapPreview.map.remove();
    STATE.mapPreview = null;
  }
}

function refreshGeoAndRecheck_(root) {
  if (!navigator.geolocation) return;
  STATE.geoTimeoutHit = false;
  STATE.geoError = "";
  STATE.geoCheckStage = "กำลังรีเฟรชพิกัดล่าสุด...";
  STATE.geoVerifyDeadline = Date.now() + GEO_TIMEOUT_MS;
  STATE.geoSamples = [];
  STATE.geo = null;
  STATE.result = null;
  STATE.step = "verifying";
  STATE.autoCheckStopped = true;
  renderAll_(root);

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const sample = {
        lat: Number(pos.coords.latitude),
        lng: Number(pos.coords.longitude),
        accuracy: Number(pos.coords.accuracy || 0),
        ts: Date.now(),
      };
      const stable = pushGeoSample_(sample);
      if (!stable) {
        STATE.geoError = "ได้รับพิกัดใหม่ แต่ความแม่นยำยังไม่พอ";
        renderAll_(root);
        return;
      }
      STATE.geo = stable;
      STATE.geoError = "";
      STATE.geoCheckStage = "รีเฟรชพิกัดแล้ว กำลังตรวจสอบจุดบริการ";
      checkZone_(root, true);
    },
    (err) => {
      const map = {
        1: "ผู้ใช้ปฏิเสธสิทธิ์การเข้าถึงพิกัด",
        2: "ไม่สามารถอ่านตำแหน่งปัจจุบันได้",
        3: "หมดเวลารอพิกัด GPS",
      };
      STATE.geoError = map[err?.code] || "ไม่สามารถใช้งานพิกัดได้";
      STATE.geoCheckStage = "รีเฟรชพิกัดไม่สำเร็จ";
      renderAll_(root);
    },
    { enableHighAccuracy: false, timeout: 20000, maximumAge: 0 }
  );
}

async function checkZone_(root, force = false) {
  if (!STATE.geo || !isGeoPreciseEnough_()) {
    STATE.geoCheckStage = !STATE.geo
      ? "รอรับพิกัด GPS จากอุปกรณ์"
      : "กำลังรอค่าความแม่นยำ GPS ให้อยู่ในเกณฑ์";
    if (!STATE.result) STATE.step = "verifying";
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
    const res = await checkServiceLocationAccess({
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
    if (STATE.result) stopAutoCheck_();
    ensureStepByGeo_();
    renderAll_(root);
  }
  return STATE.result;
}

function mockGeo_(root) {
  console.log("[GPS] Mocking location...");
  const sample = {
    lat: 13.7563, // พิกัดสมมติ (กรุงเทพฯ)
    lng: 100.5018,
    accuracy: 25,
    ts: Date.now(),
  };
  const stable = pushGeoSample_(sample);
  if (stable) {
    STATE.geo = stable;
    STATE.geoCheckStage = "ใช้พิกัดจำลอง (Debug Mode)";
    checkZone_(root, true);
  }
}

function startGeoTracking_(root) {
  if (!navigator.geolocation) {
    STATE.geoError = "อุปกรณ์ไม่รองรับ Geolocation";
    STATE.geoCheckStage = "อุปกรณ์ไม่รองรับ Geolocation";
    renderAll_(root);
    return;
  }

  STATE.geoVerifyDeadline = Date.now() + GEO_TIMEOUT_MS;
  STATE.geoCheckStage = "กำลังร้องขอพิกัดล่าสุด...";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
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
        STATE.geoCheckStage = "ได้พิกัดแล้ว กำลังตรวจสอบจุดบริการ";
        stopAutoCheck_();
        renderAll_(root);
        checkZone_(root, true);
        return;
      }
      STATE.geoError = "ได้รับพิกัดใหม่ แต่ความแม่นยำยังไม่พอ";
      STATE.geoCheckStage = "พิกัดยังไม่แม่นยำพอ กรุณากดตรวจสอบพิกัดอีกครั้ง";
      stopAutoCheck_();
      renderAll_(root);
    },
    (err) => {
      const map = {
        1: "ผู้ใช้ปฏิเสธสิทธิ์การเข้าถึงพิกัด",
        2: "ไม่สามารถอ่านตำแหน่งปัจจุบันได้",
        3: "หมดเวลารอพิกัด GPS",
      };
      STATE.geoError = map[err?.code] || "ไม่สามารถใช้งานพิกัดได้";
      STATE.geoCheckStage = "ไม่สามารถตรวจพิกัดได้";
      stopAutoCheck_();
      renderAll_(root);
    },
    { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
  );
}

async function loadBootstrap_(root) {
  STATE.bootstrapLoading = true;
  renderAll_(root);
  try {
    const res = await fetchLoanSelfBootstrap();
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
    const validateRes = await validateLoanSelfBarcode({
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
    showToast("อุปกรณ์นี้ไม่รองรับการเข้าถึงกล้อง");
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
  if (STATE.mode === "borrow" && !canBorrowMore_()) {
    showToast("โควตาการยืมเต็มแล้ว");
    return;
  }

  stopScanner_();
  STATE.scannerOpen = true;
  renderAll_(root);

  try {
    const video = root.querySelector("#memberLoanSelfScannerVideo");
    const stage = root.querySelector("#memberLoanSelfScannerStage");
    if (!video) {
      stopScanner_();
      renderAll_(root);
      return;
    }

    await openScanner({
      videoEl: video,
      targetEl: stage,
      continuous: true,
      facingMode: STATE.scannerFacingMode,
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
          ? await createLoanSelfBorrow({ ...payloadBase, barcode: row.barcode })
          : await createLoanSelfReturn({ ...payloadBase, barcode: row.barcode });

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
    refreshGeoAndRecheck_(root);
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
  const resultClose = root.querySelector("#memberLoanSelfResultClose");

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
    refreshGeoAndRecheck_(root);
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
  root.querySelector("#memberLoanSelfSwitchCameraBtn")?.addEventListener("click", async () => {
    if (!STATE.cameraSupported) return;
    toggleScannerFacingMode_();
    if (STATE.scannerOpen) {
      stopScanner_();
      renderAll_(root);
      await openScanner_(root);
      return;
    }
    renderAll_(root);
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

  resultClose?.addEventListener("click", () => {
    STATE.batchResult = null;
    renderAll_(root);
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
    <section id="memberLoanSelfRoot" class="view relative min-h-[100dvh] bg-gray-50 pb-24">
      <header class="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-100">
        <div class="max-w-lg mx-auto px-4 py-3">
          <div class="flex items-center justify-between mb-3">
            <h1 class="text-lg font-bold text-gray-800">📚 Loan Self-Service</h1>
            <button id="memberLoanSelfMapToggle" data-member-loan-self-map-toggle type="button" class="rounded-lg p-2 text-gray-500 hover:bg-gray-100" title="ดูแผนที่">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 6l7-4 8 4 7-4v16l-7 4-8-4-7 4z"></path><path d="M8 2v16"></path><path d="M16 6v16"></path></svg>
            </button>
          </div>

          <div class="flex items-center justify-between" id="step-indicator">
            <div class="flex flex-col items-center flex-1">
              <div id="memberLoanSelfStep1Circle" class="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold bg-blue-500 text-white">1</div>
              <span id="memberLoanSelfStep1Label" class="text-xs mt-1 text-blue-600 font-medium">ตรวจพิกัด</span>
            </div>
            <div class="flex-1 h-1 bg-gray-200 rounded mx-1"><div id="memberLoanSelfLine1Fill" class="h-full bg-emerald-400 rounded -translate-x-full transition-transform duration-700"></div></div>
            <div class="flex flex-col items-center flex-1">
              <div id="memberLoanSelfStep2Circle" class="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold bg-gray-200 text-gray-500">2</div>
              <span id="memberLoanSelfStep2Label" class="text-xs mt-1 text-gray-400">เลือกโหมด</span>
            </div>
            <div class="flex-1 h-1 bg-gray-200 rounded mx-1"><div id="memberLoanSelfLine2Fill" class="h-full bg-emerald-400 rounded -translate-x-full transition-transform duration-700"></div></div>
            <div class="flex flex-col items-center flex-1">
              <div id="memberLoanSelfStep3Circle" class="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold bg-gray-200 text-gray-500">3</div>
              <span id="memberLoanSelfStep3Label" class="text-xs mt-1 text-gray-400">สแกน</span>
            </div>
          </div>
          <p id="memberLoanSelfStepHint" class="mt-2 text-[11px] font-bold text-slate-600">ขั้นตอนที่ 1: ตรวจสอบพิกัด</p>
        </div>
      </header>

      <main class="max-w-lg mx-auto px-4 py-4 space-y-4 pb-40">
        <article id="memberLoanSelfStatus" class="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
          <p id="memberLoanSelfStatusTitle" class="text-sm font-black uppercase tracking-[0.11em] text-sky-700">กำลังตรวจสอบตำแหน่งจุดบริการ...</p>
          <p id="memberLoanSelfStatusDetail" class="mt-1 text-sm font-bold text-slate-700">โปรดรอสักครู่</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <button id="memberLoanSelfForceCheckBtn" type="button" class="hidden rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-black text-white">ตรวจสอบพิกัดทันที</button>
            <button id="memberLoanSelfRetryBtn" type="button" class="hidden rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700">ลองใหม่อีกครั้ง</button>
            <button id="memberLoanSelfHelpBtn" type="button" class="hidden rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-black text-white">ขอความช่วยเหลือจากเจ้าหน้าที่</button>
          </div>
        </article>

        <article class="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
          <div class="flex items-center gap-2 mb-3">
            <span class="text-gray-500">◷</span>
            <h3 class="text-sm font-bold text-gray-700">เวลาทำการวันนี้</h3>
          </div>
          <div class="rounded-lg bg-gray-50 p-3 text-sm font-semibold text-gray-700">
            จันทร์ - ศุกร์ · 08:30 - 16:30
          </div>
        </article>

        <article id="memberLoanSelfPolicy" class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm p-4 border border-blue-100"></article>

        <section id="memberLoanSelfStepVerify" class="member-loan-self-step-panel bg-white rounded-xl shadow-sm p-6 text-center border border-slate-100">
          <div id="memberLoanSelfVerifySpinner" class="h-10 w-10 mx-auto animate-spin rounded-full border-4 border-sky-100 border-t-sky-600"></div>
          <p id="memberLoanSelfVerifyTitle" class="mt-4 text-sm font-bold text-gray-700">กำลังรอพิกัด GPS ที่แม่นยำ...</p>
          <p id="memberLoanSelfVerifyHint" class="text-xs text-gray-400 mt-1">ระบบจะตรวจสอบตำแหน่งต่อเนื่องอัตโนมัติ</p>
        </section>

        <section id="memberLoanSelfStepChoose" class="member-loan-self-step-panel hidden">
          <h2 class="text-lg font-bold text-gray-800 mb-3">เลือกโหมดการทำรายการ</h2>
          <div class="grid grid-cols-2 gap-3">
            <button id="memberLoanSelfChooseBorrow" type="button" class="bg-white rounded-xl shadow-sm p-5 border-2 border-emerald-100 text-center">
              <div class="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3 text-2xl">📗</div>
              <h3 class="text-sm font-bold text-gray-800">ยืมหนังสือ</h3>
              <p class="text-xs text-gray-500 mt-1">สแกนบาร์โค้ดเพื่อยืม</p>
            </button>
            <button id="memberLoanSelfChooseReturn" type="button" class="bg-white rounded-xl shadow-sm p-5 border-2 border-sky-100 text-center">
              <div class="w-14 h-14 rounded-full bg-sky-100 flex items-center justify-center mx-auto mb-3 text-2xl">📘</div>
              <h3 class="text-sm font-bold text-gray-800">คืนหนังสือ</h3>
              <p class="text-xs text-gray-500 mt-1">สแกนบาร์โค้ดเพื่อคืน</p>
            </button>
          </div>
          <p id="memberLoanSelfChooseBorrowReason" class="hidden mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700"></p>
        </section>

        <section id="memberLoanSelfStepScan" class="member-loan-self-step-panel hidden space-y-3">
          <div class="bg-white rounded-xl shadow-sm p-4 border border-slate-100 flex items-center gap-2">
            <button id="memberLoanSelfOpenScanInlineBtn" type="button" class="btn-hover flex-1 py-3 bg-blue-500 text-white rounded-xl font-semibold text-sm hover:bg-blue-600 flex items-center justify-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="7" y1="8" x2="7" y2="8.01"></line>
                <line x1="17" y1="8" x2="17" y2="8.01"></line>
                <line x1="7" y1="16" x2="7" y2="16.01"></line>
                <line x1="17" y1="16" x2="17" y2="16.01"></line>
                <line x1="12" y1="12" x2="12" y2="12.01"></line>
              </svg>
              สแกนบาร์โค้ด
            </button>
            <button id="memberLoanSelfMapToggleInline" data-member-loan-self-map-toggle type="button" class="btn-hover p-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 flex items-center justify-center" title="ดูแผนที่">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                <line x1="8" y1="2" x2="8" y2="18"></line>
                <line x1="16" y1="6" x2="16" y2="22"></line>
              </svg>
            </button>
          </div>

          <div class="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
            <label class="text-xs font-semibold text-gray-600 mb-2 block">กรอกรหัสบาร์โค้ดด้วยตัวเอง</label>
            <div class="flex gap-2">
              <input id="memberLoanSelfManualBarcode" type="text" placeholder="เช่น 9786165749123" autocomplete="off" class="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              <button id="memberLoanSelfManualAddBtn" type="button" class="btn-hover rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900">เพิ่ม</button>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-sm p-4 border border-slate-100">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-bold text-gray-800 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                ตะกร้ารายการ
                <span class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full"><span id="memberLoanSelfCartCount">0</span></span>
              </h3>
              <button id="memberLoanSelfClearCartBtn" class="text-xs text-red-500 hover:text-red-600 btn-hover px-2 py-1 rounded" type="button">ลบทั้งหมด</button>
            </div>
            <div id="memberLoanSelfScanFlash" class="hidden mb-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-700"></div>
            <div id="memberLoanSelfCartList" class="space-y-2 max-h-64 overflow-y-auto">
              <div class="text-center py-8">
                <svg class="mx-auto mb-2" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                <p class="text-xs text-gray-400">ยังไม่มีรายการในตะกร้า</p>
                <p class="text-xs text-gray-300 mt-0.5">สแกนหรือกรอกรหัสบาร์โค้ดเพื่อเริ่มต้น</p>
              </div>
            </div>
          </div>

          <p id="memberLoanSelfQuotaWarn" class="hidden text-xs font-black text-rose-700">โควตาการยืมเต็มแล้ว (0 คงเหลือ) กรุณาคืนหนังสือก่อนยืมเพิ่ม</p>
          <p id="memberLoanSelfCameraHint" class="text-[11px] font-semibold text-slate-500">สแกนด้วยกล้องได้ตามปกติ</p>

          <div class="grid grid-cols-2 gap-2">
            <button id="memberLoanSelfStopScanBtn" type="button" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">หยุดสแกน</button>
            <button id="memberLoanSelfBackChoose" type="button" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700">กลับ</button>
          </div>

          <div class="space-y-2">
            <button id="memberLoanSelfConfirmInlineBtn" type="button" class="w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white">ยืนยันรายการ</button>
          </div>

          <div id="memberLoanSelfBatchSummary"></div>
        </section>
      </main>

      <footer id="memberLoanSelfBottomBar" class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-30 hidden">
        <div class="max-w-lg mx-auto flex gap-2">
          <button id="memberLoanSelfOpenScanBtn" type="button" class="h-14 w-24 shrink-0 rounded-xl bg-emerald-100 text-xs font-black text-emerald-800">สแกนเพิ่ม</button>
          <button id="memberLoanSelfConfirmBtn" type="button" class="h-14 flex-1 rounded-xl bg-slate-900 px-4 text-sm font-black text-white">ยืนยันรายการ</button>
        </div>
      </footer>

      <div id="memberLoanSelfScannerBackdrop" class="fixed inset-0 z-50 bg-slate-950/70 opacity-0 pointer-events-none"></div>
      <aside id="memberLoanSelfScannerSheet" class="member-loan-self-scanner-sheet fixed inset-x-0 bottom-0 z-[60] translate-y-full rounded-t-[1.75rem] border border-slate-700 bg-slate-950 p-4 opacity-0">
        <div class="mx-auto w-full max-w-lg">
          <div class="mb-3 flex items-center justify-between border-b border-slate-700 pb-3">
            <p id="memberLoanSelfScannerMode" class="text-sm font-black text-white">สแกนบาร์โค้ด</p>
            <button id="memberLoanSelfCloseScanBtn" type="button" class="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-black text-white">ปิด</button>
          </div>
          <div id="memberLoanSelfScannerStage" class="relative mx-auto mt-4 aspect-square w-full max-w-md overflow-hidden rounded-2xl bg-black min-h-[320px] sm:min-h-[420px]">
            <video id="memberLoanSelfScannerVideo" class="absolute inset-0 h-full w-full rounded-2xl object-cover" playsinline autoplay muted></video>
            <div class="absolute inset-8 pointer-events-none rounded-lg border-2 border-blue-400/50">
              <div class="scan-beam absolute left-2 right-2 h-0.5 bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]"></div>
              <div class="absolute -top-0.5 -left-0.5 h-6 w-6 rounded-tl-lg border-t-4 border-l-4 border-blue-500"></div>
              <div class="absolute -top-0.5 -right-0.5 h-6 w-6 rounded-tr-lg border-t-4 border-r-4 border-blue-500"></div>
              <div class="absolute -bottom-0.5 -left-0.5 h-6 w-6 rounded-bl-lg border-b-4 border-l-4 border-blue-500"></div>
              <div class="absolute -bottom-0.5 -right-0.5 h-6 w-6 rounded-br-lg border-b-4 border-r-4 border-blue-500"></div>
            </div>
            <div id="memberLoanSelfScannerFlash" class="absolute inset-0 rounded-2xl pointer-events-none"></div>
          </div>
          <div class="p-4 text-center">
            <p id="memberLoanSelfScannerStatus" class="text-sm text-gray-300">กำลังเปิดกล้อง...</p>
            <p class="text-xs text-gray-500 mt-1">วางบาร์โค้ดให้อยู่ภายในกรอบ</p>
            <div class="mt-3">
              <button id="memberLoanSelfSwitchCameraBtn" type="button" class="btn-hover rounded-lg bg-gray-700 px-4 py-2 text-sm text-white hover:bg-gray-600">
                <span id="memberLoanSelfScannerFacing">กล้องหลัง</span>
              </button>
            </div>
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

      <div id="memberLoanSelfSubmittingOverlay" class="fixed inset-0 z-[70] hidden items-center justify-center bg-black/60 p-4">
        <div class="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full text-center">
          <div class="h-10 w-10 mx-auto animate-spin rounded-full border-4 border-blue-100 border-t-blue-500"></div>
          <p class="mt-4 text-sm font-bold text-gray-800">กำลังดำเนินการ...</p>
          <p class="mt-1 text-xs text-gray-500">ระบบกำลังบันทึกรายการในตะกร้า</p>
          <div class="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div class="h-full w-2/3 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>

      <div id="memberLoanSelfResultSheet" class="member-loan-self-sheet fixed inset-0 z-[65] hidden bg-black/50">
        <div class="member-loan-self-sheet-content absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl p-5 max-h-[80dvh] overflow-y-auto">
          <div class="max-w-lg mx-auto">
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold text-gray-800">ผลการทำรายการ</h3>
              <button id="memberLoanSelfResultClose" type="button" class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600">ปิด</button>
            </div>
            <p id="memberLoanSelfResultSummary" class="text-sm text-gray-600 mb-3"></p>
            <div id="memberLoanSelfResultList" class="space-y-2"></div>
          </div>
        </div>
      </div>
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
  STATE.autoCheckStopped = false;

  recoverCartOnMount_();
  applyPrefillFromQuery_();
  bindEvents_(root);
  renderAll_(root);

  const onBeforeUnload = () => cleanupState_();
  window.addEventListener("beforeunload", onBeforeUnload);

  loadBootstrap_(root);
  startGeoTracking_(root);
}
