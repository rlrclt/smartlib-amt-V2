import { showToast } from "../../components/toast.js";
import {
  MEMBER_SYNC_KEYS,
  getMemberResource,
  revalidateMemberResource,
  subscribeMemberResource,
} from "../../data/member_sync.js";
import { escapeHtml } from "../../utils/html.js";

const DEFAULT_AVATAR = "/assets/img/default-avatar.svg";
const CARD_WIDTH = 400;
const CARD_HEIGHT = 250;
const CARD_RADIUS = 24;
const LOG_PREFIX = "[MemberCard]";

const STATE = {
  profile: null,
  stats: null,
  unsub: null,
  resizeTimer: 0,
  avatarImage: null,
  cardCode: "",
  cardName: "",
  cardStatus: "",
  activeLoansCount: 0,
  reportedCorsPhotoUrl: "",
};

function ensureStyles_() {
  if (document.getElementById("memberCardNativeStyle")) return;
  const style = document.createElement("style");
  style.id = "memberCardNativeStyle";
  style.textContent = `
    #memberCardRoot { overflow-x: hidden; }
    .member-card-shell { width: 100%; max-width: 1280px; margin-inline: auto; }
    .member-card-surface {
      background: rgba(255,255,255,0.95);
      border: 1px solid rgba(226,232,240,0.95);
      box-shadow: 0 2px 12px rgba(15,23,42,0.04);
    }
    .member-card-pressable {
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      transition: transform .12s ease, opacity .12s ease;
    }
    .member-card-pressable:active { transform: scale(0.98); opacity: 0.88; }
    #memberCardCanvas {
      width: 100%;
      max-width: 400px;
      aspect-ratio: 400 / 250;
      border-radius: 24px;
      box-shadow: 0 18px 40px -14px rgba(14, 165, 233, 0.45);
      overflow: hidden;
      display: block;
    }
    .member-card-loader {
      background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
      background-size: 200% 100%;
      animation: memberCardShimmer 1.3s infinite;
    }
    @keyframes memberCardShimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
  `;
  document.head.appendChild(style);
}

function setupCanvas_(canvas) {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(CARD_WIDTH * dpr);
  canvas.height = Math.floor(CARD_HEIGHT * dpr);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  return ctx;
}

function roundRect_(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function normalizeProfile_(bundle = {}) {
  const profile = bundle?.profile || {};
  const stats = bundle?.stats || {};
  const displayName = String(profile.displayName || profile.fullName || profile.name || "สมาชิกห้องสมุด").trim();
  const code = String(profile.idCode || profile.uid || profile.memberId || "").trim();
  const status = String(profile.status || "active").trim().toLowerCase();
  const activeLoansCount = Number(
    stats.activeLoans ??
      stats.activeLoansCount ??
      profile.activeLoansCount ??
      profile.activeLoans ??
      0,
  ) || 0;
  return {
    profile,
    displayName,
    code: code || "UNKNOWN-MEMBER",
    status,
    activeLoansCount,
    photoURL: String(profile.photoURL || "").trim() || DEFAULT_AVATAR,
    issueDate: profile.updatedAt || profile.createdAt || new Date().toISOString(),
  };
}

function isCanvasSafeImageUrl_(url) {
  const src = String(url || "").trim();
  if (!src) return false;
  if (src.startsWith("data:image/")) return true;
  if (src.startsWith("/")) return true;
  try {
    const parsed = new URL(src, window.location.origin);
    if (parsed.origin === window.location.origin) return true;
    const host = parsed.hostname.toLowerCase();
    if (host.endsWith("drive.google.com") || host.endsWith("google.com")) return false;
    return false;
  } catch {
    return false;
  }
}

function loadImage_(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.error(`${LOG_PREFIX} image load failed`, { src });
      if (src === DEFAULT_AVATAR) resolve(null);
      else resolve(loadImage_(DEFAULT_AVATAR));
    };
    img.src = src;
  });
}

function ensureBarcodeLib_() {
  if (window.JsBarcode) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const exists = document.querySelector('script[data-jsbarcode="1"]');
    if (exists) {
      exists.addEventListener("load", () => resolve(), { once: true });
      exists.addEventListener("error", () => reject(new Error("โหลด JsBarcode ไม่สำเร็จ")), { once: true });
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
}

function buildBarcodeDataUrl_(code) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  window.JsBarcode(svg, code, {
    format: "CODE128",
    displayValue: false,
    margin: 0,
    width: 1.5,
    height: 48,
  });
  const text = new XMLSerializer().serializeToString(svg);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(text)}`;
}

async function drawCard_(root) {
  const canvas = root.querySelector("#memberCardCanvas");
  const loading = root.querySelector("#memberCardLoading");
  if (!canvas) return;

  const ctx = setupCanvas_(canvas);
  const statusActive = STATE.cardStatus === "active";
  const initials = String(STATE.cardName || "M").trim().slice(0, 2).toUpperCase();
  const issueDateLabel = new Date(String(STATE.profile?.createdAt || Date.now())).toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  ctx.clearRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
  roundRect_(ctx, 0, 0, CARD_WIDTH, CARD_HEIGHT, CARD_RADIUS);
  ctx.save();
  ctx.clip();

  const gradient = ctx.createLinearGradient(0, 0, CARD_WIDTH, CARD_HEIGHT);
  if (statusActive) {
    gradient.addColorStop(0, "#0284c7");
    gradient.addColorStop(0.55, "#0ea5e9");
    gradient.addColorStop(1, "#4f46e5");
  } else {
    gradient.addColorStop(0, "#475569");
    gradient.addColorStop(0.55, "#64748b");
    gradient.addColorStop(1, "#334155");
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  ctx.globalAlpha = 0.14;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(330, -10, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(30, 250, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "700 12px Bai Jamjuree, sans-serif";
  ctx.fillText("ANT LIBRARY PASS", 18, 18);
  ctx.font = "600 10px Bai Jamjuree, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillText(`ออกบัตร ${issueDateLabel}`, 18, 34);

  ctx.fillStyle = "rgba(255,255,255,0.25)";
  ctx.beginPath();
  ctx.arc(46, 76, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.font = "800 14px Bai Jamjuree, sans-serif";
  ctx.fillText(initials, 36, 70);

  ctx.fillStyle = "#ffffff";
  ctx.font = "800 20px Bai Jamjuree, sans-serif";
  ctx.fillText(STATE.cardName.slice(0, 26), 82, 62);
  ctx.font = "700 12px Space Mono, monospace";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillText(STATE.cardCode, 82, 87);

  roundRect_(ctx, 18, 116, 364, 72, 14);
  ctx.fillStyle = "rgba(255,255,255,0.96)";
  ctx.fill();
  ctx.strokeStyle = "rgba(148,163,184,0.35)";
  ctx.stroke();

  if (window.JsBarcode && STATE.cardCode) {
    try {
      const barcodeSrc = buildBarcodeDataUrl_(STATE.cardCode);
      const barcodeImage = await loadImage_(barcodeSrc);
      if (barcodeImage) {
        ctx.drawImage(barcodeImage, 40, 128, 320, 40);
      }
    } catch (_) {
      console.error(`${LOG_PREFIX} barcode render failed`, { code: STATE.cardCode });
      ctx.fillStyle = "#94a3b8";
      ctx.font = "700 11px Bai Jamjuree, sans-serif";
      ctx.fillText("BARCODE UNAVAILABLE", 134, 146);
    }
  } else {
    if (!window.JsBarcode) {
      console.error(`${LOG_PREFIX} JsBarcode not available`);
    }
    ctx.fillStyle = "#94a3b8";
    ctx.font = "700 11px Bai Jamjuree, sans-serif";
    ctx.fillText("BARCODE UNAVAILABLE", 134, 146);
  }

  ctx.restore();
  if (loading) loading.classList.add("hidden");
}

async function applyBundle_(root, bundle) {
  const normalized = normalizeProfile_(bundle);
  STATE.profile = normalized.profile;
  STATE.stats = bundle?.stats || {};
  STATE.cardName = normalized.displayName;
  STATE.cardCode = normalized.code;
  STATE.cardStatus = normalized.status;
  STATE.activeLoansCount = normalized.activeLoansCount;
  const avatarSrc = isCanvasSafeImageUrl_(normalized.photoURL)
    ? normalized.photoURL
    : DEFAULT_AVATAR;
  if (!isCanvasSafeImageUrl_(normalized.photoURL) && normalized.photoURL) {
    if (STATE.reportedCorsPhotoUrl !== normalized.photoURL) {
      STATE.reportedCorsPhotoUrl = normalized.photoURL;
      console.warn(`${LOG_PREFIX} drive photo cannot be drawn on canvas (CORS). fallback to default avatar`, {
        photoURL: normalized.photoURL,
      });
    }
  }
  STATE.avatarImage = await loadImage_(avatarSrc);
  const avatarImg = root.querySelector("#memberCardAvatarImg");
  const avatarFallback = root.querySelector("#memberCardAvatarFallback");
  if (avatarImg) {
    avatarImg.src = normalized.photoURL || DEFAULT_AVATAR;
    avatarImg.onerror = () => {
      avatarImg.style.display = "none";
      if (avatarFallback) {
        avatarFallback.textContent = String(normalized.displayName || "M").trim().slice(0, 2).toUpperCase();
        avatarFallback.classList.remove("hidden");
      }
    };
    avatarImg.onload = () => {
      avatarImg.style.display = "";
      if (avatarFallback) avatarFallback.classList.add("hidden");
    };
  }
  await ensureBarcodeLib_().catch((err) => {
    console.error(`${LOG_PREFIX} jsbarcode load failed`, err?.message || err);
  });
  await drawCard_(root);
}

function renderBody_(profile) {
  const displayName = String(profile?.displayName || profile?.fullName || profile?.name || "สมาชิกห้องสมุด");
  const code = String(profile?.idCode || profile?.uid || profile?.memberId || "UNKNOWN-MEMBER");
  return `
    <section id="memberCardRoot" class="member-page-container view">
      <div class="member-card-shell space-y-4">
        <article class="member-card-surface rounded-[1.5rem] px-4 py-4 sm:px-5">
          <div class="flex items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-3">
              <a data-link href="/app" class="member-card-pressable inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" aria-label="กลับหน้าหลัก">
                <i data-lucide="arrow-left" class="h-5 w-5"></i>
              </a>
              <div class="min-w-0">
                <p class="text-[10px] font-black uppercase tracking-[0.18em] text-sky-600">Digital Member Card</p>
                <h1 class="truncate text-base font-black text-slate-900 sm:text-lg">บัตรสมาชิกดิจิทัล</h1>
                <p class="text-xs font-semibold text-slate-500">แสดงบัตรสำหรับสแกนยืนยันตัวตนที่ห้องสมุด</p>
              </div>
            </div>
            <a data-link href="/app/profile" class="member-card-pressable inline-flex items-center justify-center rounded-[1rem] border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">โปรไฟล์</a>
          </div>
        </article>

        <article class="member-card-surface rounded-[1.75rem] p-5">
          <div class="mx-auto w-full max-w-[400px]">
            <div class="relative aspect-[400/250] w-full">
              <div id="memberCardLoading" class="member-card-loader absolute inset-0 rounded-[24px]"></div>
              <canvas id="memberCardCanvas" class="absolute inset-0"></canvas>
              <div class="absolute z-10 overflow-hidden rounded-full border border-white/70 bg-white/20 shadow-sm" style="left:5%;top:20%;width:13%;height:20.8%;">
                <img id="memberCardAvatarImg" src="${escapeHtml(profile?.photoURL || DEFAULT_AVATAR)}" alt="avatar" class="h-full w-full object-cover" />
                <div id="memberCardAvatarFallback" class="hidden flex h-full w-full items-center justify-center text-sm font-black text-white"></div>
              </div>
            </div>
          </div>
          <div class="mt-4 grid gap-2 sm:grid-cols-2">
            <a data-link href="/profile/edit" class="member-card-pressable inline-flex items-center justify-center rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">แก้ไขข้อมูล</a>
            <a data-link href="/app/books" class="member-card-pressable inline-flex items-center justify-center rounded-[1.1rem] bg-sky-600 px-4 py-3 text-sm font-black text-white hover:bg-sky-700">ค้นหาหนังสือ</a>
          </div>
        </article>
      </div>
    </section>
  `;
}

function cleanup_() {
  try {
    STATE.unsub?.();
  } catch (_) {}
  STATE.unsub = null;
  if (STATE.resizeTimer) clearTimeout(STATE.resizeTimer);
  STATE.resizeTimer = 0;
}

export function renderMemberCardView() {
  ensureStyles_();
  const cached = getMemberResource(MEMBER_SYNC_KEYS.profile);
  return renderBody_(cached?.profile || null);
}

export async function mountMemberCardView(container) {
  ensureStyles_();
  cleanup_();
  const root = container.querySelector("#memberCardRoot");
  if (!root) return;
  if (window.lucide?.createIcons) window.lucide.createIcons();

  try {
    const cached = getMemberResource(MEMBER_SYNC_KEYS.profile);
    if (cached) {
      console.log(`${LOG_PREFIX} use cached profile`);
      await applyBundle_(root, cached);
      void revalidateMemberResource(MEMBER_SYNC_KEYS.profile, { force: true });
    } else {
      const res = await revalidateMemberResource(MEMBER_SYNC_KEYS.profile, { force: true });
      if (!res?.ok || !res.data) throw new Error(res?.error || "โหลดข้อมูลบัตรสมาชิกไม่สำเร็จ");
      await applyBundle_(root, res.data);
    }

    STATE.unsub = subscribeMemberResource(MEMBER_SYNC_KEYS.profile, async (nextBundle) => {
      if (!nextBundle) return;
      console.log(`${LOG_PREFIX} profile updated -> redraw`);
      await applyBundle_(root, nextBundle);
    });
  } catch (err) {
    console.error(`${LOG_PREFIX} mount failed`, err);
    showToast(err?.message || "โหลดบัตรสมาชิกไม่สำเร็จ");
  }

  const onResize = () => {
    if (STATE.resizeTimer) clearTimeout(STATE.resizeTimer);
    STATE.resizeTimer = window.setTimeout(() => {
      drawCard_(root).catch(() => {});
    }, 120);
  };
  window.addEventListener("resize", onResize);
  const cleanupOnDetach = window.setInterval(() => {
    if (root.isConnected) return;
    window.removeEventListener("resize", onResize);
    clearInterval(cleanupOnDetach);
    cleanup_();
  }, 1000);
}
