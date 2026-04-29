import { showToast } from "../../components/toast.js";
import { apiFinesList, apiProfileGet, apiProfileUploadPhoto, apiProfileDeletePhoto } from "../../data/api.js";
import { escapeHtml } from "../../utils/html.js";

const DEFAULT_AVATAR = "/assets/img/default-avatar.svg";
const PROFILE_UPLOAD_TARGET_SIZE = 400;
const MAX_JSONP_BASE64_LEN = 1800;
let PHOTO_STATUS_TIMER = 0;

function readAuthSession() {
  const local = window.localStorage.getItem("smartlib.auth");
  const session = window.sessionStorage.getItem("smartlib.auth");
  const raw = local || session;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function patchAuthUser(profile) {
  const stores = [
    { key: "local", storage: window.localStorage },
    { key: "session", storage: window.sessionStorage },
  ];
  stores.forEach(({ storage }) => {
    const raw = storage.getItem("smartlib.auth");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.user) return;
      parsed.user = { ...parsed.user, ...profile };
      storage.setItem("smartlib.auth", JSON.stringify(parsed));
    } catch {
      // ignore
    }
  });
}

function renderRole(profile) {
  const role = String(profile?.role || "-");
  const group = String(profile?.groupType || "-");
  return `${role} (${group})`;
}

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

function isDefaultAvatar(url) {
  const u = String(url || "").trim();
  return !u || u === DEFAULT_AVATAR;
}

function ensureNativeStyles_() {
  if (document.getElementById("profileNativeStyle")) return;
  const style = document.createElement("style");
  style.id = "profileNativeStyle";
  style.textContent = `
    #profileAppRoot {
      overflow-x: hidden;
      container-type: inline-size;
    }
    .profile-shell {
      position: relative;
      width: 100%;
    }
    .profile-surface {
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid rgba(226, 232, 240, 0.95);
      box-shadow: 0 2px 12px rgba(15, 23, 42, 0.04);
    }
    .profile-pressable {
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      transition: transform .12s ease, opacity .12s ease, box-shadow .18s ease;
    }
    .profile-pressable:active {
      transform: scale(0.98);
      opacity: 0.86;
    }
    .profile-skeleton {
      background: #e2e8f0;
    }
    .profile-sheet-overlay {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.42);
      opacity: 0;
      pointer-events: none;
      transition: opacity .2s ease;
      z-index: 40;
    }
    .profile-sheet-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }
    .profile-bottom-sheet {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 50;
      transform: translateY(100%);
      transition: transform .35s cubic-bezier(0.32, 0.72, 0, 1);
      background: rgba(255, 255, 255, 0.98);
      border-top-left-radius: 2rem;
      border-top-right-radius: 2rem;
      box-shadow: 0 -16px 50px rgba(15, 23, 42, 0.14);
    }
    .profile-bottom-sheet.active {
      transform: translateY(0);
    }
    @media (min-width: 768px) {
      .profile-bottom-sheet {
        left: 50%;
        right: auto;
        width: min(92vw, 460px);
        transform: translate(-50%, 100%);
        border-radius: 2rem;
      }
      .profile-bottom-sheet.active {
        transform: translate(-50%, 0);
      }
    }
    .profile-chip {
      border: 1px solid rgba(226, 232, 240, 0.95);
      background: rgba(248, 250, 252, 0.95);
    }
    .profile-top-row {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .profile-responsive-grid {
      display: grid;
      gap: 1rem;
    }
    .profile-fine-grid {
      display: grid;
      gap: 0.75rem;
    }
    @container (min-width: 768px) {
      .profile-top-row {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
      .profile-responsive-grid {
        grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.95fr);
      }
      .profile-fine-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @container (min-width: 1280px) {
      .profile-fine-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
  `;
  document.head.appendChild(style);
}

function parseDataUrl(dataUrl) {
  const m = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mimeType: m[1], base64Data: m[2] };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
    reader.readAsDataURL(file);
  });
}

async function prepareJsonpSafeImage(file, maxBase64Len) {
  const src = await fileToDataUrl(file);
  const img = new Image();
  img.src = src;
  await new Promise((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("เปิดไฟล์รูปไม่สำเร็จ"));
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const w = img.width;
  const h = img.height;
  const side = Math.min(w, h);
  const sx = Math.floor((w - side) / 2);
  const sy = Math.floor((h - side) / 2);

  // ลองหลายขนาด & คุณภาพ
  const sizes = [PROFILE_UPLOAD_TARGET_SIZE, 256, 192, 128, 96, 80, 64, 48];
  const qualities = [0.75, 0.6, 0.5, 0.4, 0.3, 0.2, 0.15];
  const formats = ["image/webp", "image/jpeg"];
  let best = "";

  for (let i = 0; i < sizes.length; i += 1) {
    const size = sizes[i];
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    for (let f = 0; f < formats.length; f += 1) {
      for (let j = 0; j < qualities.length; j += 1) {
        const dataUrl = canvas.toDataURL(formats[f], qualities[j]);
        const parsed = parseDataUrl(dataUrl);
        if (!parsed) continue;
        best = dataUrl;
        if (parsed.base64Data.length <= maxBase64Len) return dataUrl;
      }
    }
  }
  return best;
}

export function renderProfileView() {
  return `
    <section id="profileAppRoot" class="profile-shell mx-auto w-full max-w-[1280px] space-y-4 px-3 pb-4 sm:px-4 lg:px-6">
      <article class="profile-surface rounded-[1.5rem] px-4 py-4 sm:px-5 sm:py-4">
        <div class="profile-top-row">
          <div class="flex min-w-0 items-center gap-3">
            <a data-link href="/app" class="profile-pressable inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" aria-label="กลับหน้าหลัก">
              <i data-lucide="arrow-left" class="h-5 w-5"></i>
            </a>
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-sky-600">Member Profile</p>
              <h1 class="text-base font-black text-slate-800 sm:text-lg">โปรไฟล์ของฉัน</h1>
              <p class="mt-1 text-xs font-semibold text-slate-500">จัดการข้อมูลส่วนตัว รูปโปรไฟล์ และดูค่าปรับที่ค้างได้ในหน้าเดียว</p>
            </div>
          </div>
          <a data-link href="/logout" class="profile-pressable inline-flex items-center justify-center gap-2 rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600 hover:bg-rose-50 hover:text-rose-600" aria-label="ออกจากระบบ">
            <i data-lucide="log-out" class="h-4 w-4"></i>
            ออกจากระบบ
          </a>
        </div>
      </article>

      <main class="profile-responsive-grid">
        <div id="profileViewRoot" class="profile-surface rounded-[1.75rem] p-5">
          <div class="space-y-3">
            <div class="h-32 rounded-[1.5rem] bg-slate-100"></div>
            <div class="grid grid-cols-2 gap-3">
              <div class="h-24 rounded-[1.25rem] bg-slate-100"></div>
              <div class="h-24 rounded-[1.25rem] bg-slate-100"></div>
            </div>
            <div class="h-24 rounded-[1.5rem] bg-slate-100"></div>
          </div>
        </div>

        <div id="profileFineViewRoot" class="profile-surface rounded-[1.75rem] p-5">
          <div class="space-y-3">
            <div class="h-6 w-44 rounded bg-slate-100"></div>
            <div class="h-24 rounded-[1.5rem] bg-slate-100"></div>
            <div class="h-24 rounded-[1.5rem] bg-slate-100"></div>
          </div>
        </div>
      </main>

      <input type="file" id="profilePhotoFileInput" accept="image/jpeg,image/png,image/webp" class="hidden" />

      <div id="profileAvatarSheetBackdrop" class="profile-sheet-overlay"></div>
      <div id="profileAvatarSheet" class="profile-bottom-sheet px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] pt-3">
        <div class="w-12 h-1.5 rounded-full bg-slate-200 mx-auto"></div>
        <div class="mt-4 flex items-center justify-between gap-2">
          <div>
            <p class="text-sm font-black text-slate-800">จัดการรูปโปรไฟล์</p>
            <p class="text-xs font-semibold text-slate-500">อัปโหลดรูปใหม่หรือลบรูปเดิม</p>
          </div>
          <button type="button" id="btnCloseAvatarSheet" class="profile-pressable inline-flex h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 hover:bg-slate-50">ปิด</button>
        </div>
        <div class="mt-4 space-y-2">
          <button type="button" id="btnChangePhoto" class="profile-pressable flex w-full items-center justify-center gap-2 rounded-[1.25rem] bg-sky-50 px-4 py-4 text-sm font-black text-sky-700">
            <i data-lucide="image-plus" class="h-5 w-5"></i>
            อัปโหลดรูปใหม่
          </button>
          <button type="button" id="btnDeletePhoto" class="profile-pressable flex w-full items-center justify-center gap-2 rounded-[1.25rem] border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-black text-rose-700 hidden">
            <i data-lucide="trash-2" class="h-5 w-5"></i>
            ลบรูปโปรไฟล์
          </button>
        </div>
        <div id="profilePhotoStatus" class="mt-3 hidden rounded-[1.1rem] border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-semibold text-slate-600"></div>
      </div>
    </section>
  `;
}

function renderProfileCard(root, profile, stats) {
  const avatar = String(profile.photoURL || "").trim() || DEFAULT_AVATAR;
  const hasCustomPhoto = !isDefaultAvatar(avatar);
  const initials = String(profile.displayName || "U").trim().slice(0, 2).toUpperCase();
  const uid = String(profile.uid || profile.userId || "-").trim();

  root.innerHTML = `
    <section class="profile-surface rounded-[1.75rem] p-5">
      <div class="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div class="flex items-center gap-4">
          <button type="button" id="btnAvatarOpen" class="profile-pressable relative h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow-lg">
            <img id="profileAvatarImg" src="${escapeHtml(avatar)}" alt="${escapeHtml(profile.displayName || "")}" class="h-full w-full object-cover" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';" />
            <div class="absolute inset-0 flex items-center justify-center rounded-full bg-slate-950/35 opacity-0 transition-opacity hover:opacity-100">
              <span class="text-xs font-black text-white">${escapeHtml(initials)}</span>
            </div>
          </button>
          <div class="min-w-0">
            <p class="text-[11px] font-black uppercase tracking-[0.18em] text-sky-600">ข้อมูลส่วนตัว</p>
            <h2 class="mt-1 text-[1.45rem] font-black leading-tight text-slate-900 sm:text-[1.6rem]">${escapeHtml(profile.displayName || "-")}</h2>
            <p class="mt-1 text-sm font-semibold text-slate-600">${escapeHtml(renderRole(profile))}</p>
            <div class="mt-2 flex flex-wrap gap-2">
              <span class="profile-chip rounded-full px-3 py-1 text-[11px] font-black text-slate-600">UID ${escapeHtml(uid)}</span>
              <span class="profile-chip rounded-full px-3 py-1 text-[11px] font-black text-sky-700">${escapeHtml(profile.status || "active")}</span>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 sm:max-w-[19rem] md:grid-cols-3 md:max-w-none">
          <div class="rounded-[1.25rem] border border-amber-100 bg-amber-50 px-3 py-3">
            <p class="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">ยืมค้าง</p>
            <p class="mt-1 text-2xl font-black text-amber-800">${Number(stats.activeLoans || 0)}</p>
          </div>
          <div class="rounded-[1.25rem] border border-rose-100 bg-rose-50 px-3 py-3">
            <p class="text-[10px] font-black uppercase tracking-[0.16em] text-rose-700">ค่าปรับค้าง</p>
            <p class="mt-1 text-2xl font-black text-rose-800">${Number(stats.unpaidFineTotal || 0).toLocaleString("th-TH")}</p>
          </div>
          <div class="hidden rounded-[1.25rem] border border-sky-100 bg-sky-50 px-3 py-3 md:block">
            <p class="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">สถานะ</p>
            <p class="mt-1 text-lg font-black text-sky-900">${escapeHtml(profile.groupType || "-")}</p>
          </div>
        </div>
      </div>

      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <div class="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
          <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">อีเมล</p>
          <p class="mt-1 text-sm font-semibold text-slate-800">${escapeHtml(profile.email || "-")}</p>
        </div>
        <div class="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
          <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">เบอร์โทร</p>
          <p class="mt-1 text-sm font-semibold text-slate-800">${escapeHtml(profile.phone || "-")}</p>
        </div>
        <div class="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
          <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">ที่อยู่</p>
          <p class="mt-1 text-sm leading-6 font-semibold text-slate-800">${escapeHtml(profile.address || "-")}</p>
        </div>
        <div class="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
          <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Line ID</p>
          <p class="mt-1 text-sm font-semibold text-slate-800">${escapeHtml(profile.lineId || "-")}</p>
        </div>
        <div class="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
          <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">สังกัด/ห้อง</p>
          <p class="mt-1 text-sm font-semibold text-slate-800">${escapeHtml([profile.department, profile.level, profile.classRoom].filter(Boolean).join(" / ") || "-")}</p>
        </div>
      </div>

      <nav class="mt-4 grid gap-2 sm:grid-cols-3">
        <a data-link href="/profile/edit" class="profile-pressable inline-flex items-center justify-center rounded-[1.25rem] bg-sky-600 px-4 py-3 text-sm font-black text-white hover:bg-sky-700">แก้ไขข้อมูล</a>
        <a data-link href="/profile/change-password" class="profile-pressable inline-flex items-center justify-center rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">เปลี่ยนรหัสผ่าน</a>
        <a data-link href="/app/books" class="profile-pressable inline-flex items-center justify-center rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">ค้นหาหนังสือ</a>
      </nav>

      <p class="mt-4 text-[11px] font-semibold text-slate-400">แตะรูปโปรไฟล์เพื่อเปิดแผงจัดการรูปภาพ</p>
    </section>
  `;

  const btnDelete = document.getElementById("btnDeletePhoto");
  if (btnDelete) btnDelete.classList.toggle("hidden", !hasCustomPhoto);
}

function renderFineCard(fine) {
  const status = String(fine.status || "").toLowerCase();
  const statusCls =
    status === "paid"
      ? "bg-emerald-100 text-emerald-700"
      : status === "waived"
        ? "bg-slate-100 text-slate-700"
        : "bg-rose-100 text-rose-700";
  const typeLabel = {
    overdue: "คืนเกินกำหนด",
    damaged: "หนังสือชำรุด",
    lost: "หนังสือสูญหาย",
  }[String(fine.type || "").toLowerCase()] || String(fine.type || "-");

  return `
    <article class="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p class="text-sm font-black text-slate-900">${escapeHtml(fine.fineId || "-")}</p>
          <p class="mt-1 text-xs font-semibold text-slate-500">Loan: ${escapeHtml(fine.loanId || "-")}</p>
        </div>
        <span class="rounded-full px-2 py-1 text-[11px] font-black ${statusCls}">${escapeHtml(status || "-")}</span>
      </div>
      <div class="mt-3 grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-2">
        <p>ประเภท: <span class="font-black text-slate-800">${escapeHtml(typeLabel)}</span></p>
        <p>จำนวนเงิน: <span class="font-black text-slate-800">${Number(fine.amount || 0).toLocaleString("th-TH")} บาท</span></p>
        <p>สร้าง: <span class="font-black text-slate-800">${escapeHtml(fmtDate(fine.createdAt))}</span></p>
        <p>อัปเดต: <span class="font-black text-slate-800">${escapeHtml(fmtDate(fine.updatedAt))}</span></p>
        ${fine.paidAt ? `<p>ชำระเมื่อ: <span class="font-black text-slate-800">${escapeHtml(fmtDate(fine.paidAt))}</span></p>` : ""}
        ${fine.receivedBy ? `<p>รับชำระ/ยกเว้นโดย: <span class="font-black text-slate-800">${escapeHtml(fine.receivedBy)}</span></p>` : ""}
      </div>
      ${fine.bookTitle ? `<p class="mt-2 text-xs text-slate-500">${escapeHtml(fine.bookTitle)}${fine.barcode ? ` · ${escapeHtml(fine.barcode)}` : ""}</p>` : ""}
      ${fine.notes ? `<p class="mt-2 text-xs leading-5 text-slate-600">${escapeHtml(fine.notes)}</p>` : ""}
    </article>
  `;
}

function renderFineSection(root, finesState) {
  const box = root.querySelector("#profileFineViewRoot");
  if (!box) return;

  if (finesState.loading) {
    box.innerHTML = `
      <div class="space-y-3">
        <div class="h-6 w-40 rounded profile-skeleton"></div>
        <div class="h-24 rounded-[1.25rem] profile-skeleton"></div>
        <div class="h-24 rounded-[1.25rem] profile-skeleton"></div>
      </div>
    `;
    return;
  }

  const unpaidTotal = finesState.items
    .filter((item) => String(item.status || "") === "unpaid")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  box.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <p class="text-[11px] font-black uppercase tracking-[0.18em] text-sky-600">Fine Overview</p>
        <h2 class="mt-1 text-base font-black text-slate-900">ค่าปรับของฉัน</h2>
        <p class="mt-1 text-xs font-semibold text-slate-500">ดูรายการค่าปรับค้างและประวัติการชำระ/ยกเว้น</p>
      </div>
      <div class="rounded-[1.1rem] border border-rose-100 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">
        ค้างชำระ ${unpaidTotal.toLocaleString("th-TH")} บาท
      </div>
    </div>
    <div class="mt-4 profile-fine-grid">
      ${finesState.items.length
        ? finesState.items.map(renderFineCard).join("")
        : '<div class="rounded-[1.25rem] border border-dashed border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">ยังไม่มีรายการค่าปรับในระบบ</div>'}
    </div>
  `;
}

function setPhotoStatus(msg, type = "info") {
  const el = document.getElementById("profilePhotoStatus");
  if (!el) return;
  if (PHOTO_STATUS_TIMER) clearTimeout(PHOTO_STATUS_TIMER);
  el.textContent = msg;
  el.className = `mt-3 rounded-[1.1rem] border px-3 py-2 text-center text-xs font-semibold ${
    type === "error"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : type === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-50 text-slate-600"
  }`;
  el.classList.remove("hidden");
  if (type !== "info") {
    PHOTO_STATUS_TIMER = window.setTimeout(() => el.classList.add("hidden"), 4000);
  }
}

function hidePhotoStatus() {
  const el = document.getElementById("profilePhotoStatus");
  if (PHOTO_STATUS_TIMER) clearTimeout(PHOTO_STATUS_TIMER);
  if (el) {
    el.textContent = "";
    el.classList.add("hidden");
  }
}

function setAvatarSheetOpen(open) {
  const backdrop = document.getElementById("profileAvatarSheetBackdrop");
  const sheet = document.getElementById("profileAvatarSheet");
  if (!backdrop || !sheet) return;
  backdrop.classList.toggle("active", open);
  sheet.classList.toggle("active", open);
  document.body.style.overflow = open ? "hidden" : "";
  if (!open) hidePhotoStatus();
}

export async function mountProfileView(container) {
  ensureNativeStyles_();

  const root = container.querySelector("#profileViewRoot");
  const fineRoot = container.querySelector("#profileFineViewRoot");
  const fileInput = container.querySelector("#profilePhotoFileInput");
  if (!root || !fineRoot || !fileInput) return;

  const auth = readAuthSession();
  if (!auth?.user?.uid) {
    root.innerHTML = '<div class="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">ไม่พบ session กรุณาเข้าสู่ระบบใหม่</div>';
    fineRoot.innerHTML = "";
    return;
  }

  const finesState = {
    loading: true,
    items: [],
  };

  renderFineSection(container, finesState);

  let profile = null;
  try {
    const [profileRes, fineRes] = await Promise.all([
      apiProfileGet(),
      apiFinesList({ status: "all", page: 1, limit: 100 }),
    ]);
    if (!profileRes?.ok) throw new Error(profileRes?.error || "โหลดข้อมูลโปรไฟล์ไม่สำเร็จ");
    profile = profileRes.data?.profile || {};
    patchAuthUser(profile);
    renderProfileCard(root, profile, profileRes.data?.stats || {});
    finesState.loading = false;
    finesState.items = fineRes?.ok && Array.isArray(fineRes.data?.items) ? fineRes.data.items : [];
    renderFineSection(container, finesState);
  } catch (err) {
    root.innerHTML = '<div class="rounded-[1.5rem] border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">โหลดข้อมูลโปรไฟล์ไม่สำเร็จ</div>';
    finesState.loading = false;
    finesState.items = [];
    renderFineSection(container, finesState);
    showToast(err?.message || "โหลดข้อมูลโปรไฟล์ไม่สำเร็จ");
    return;
  }

  const avatarBtn = document.getElementById("btnAvatarOpen");
  const sheetBackdrop = document.getElementById("profileAvatarSheetBackdrop");
  const sheet = document.getElementById("profileAvatarSheet");
  const btnCloseSheet = document.getElementById("btnCloseAvatarSheet");
  const btnChange = document.getElementById("btnChangePhoto");
  const btnDelete = document.getElementById("btnDeletePhoto");

  const closeSheet = () => setAvatarSheetOpen(false);
  const openSheet = () => setAvatarSheetOpen(true);

  avatarBtn?.addEventListener("click", openSheet);
  sheetBackdrop?.addEventListener("click", closeSheet);
  btnCloseSheet?.addEventListener("click", closeSheet);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeSheet();
  });

  btnChange?.addEventListener("click", () => {
    closeSheet();
    fileInput.value = "";
    fileInput.click();
  });

  btnDelete?.addEventListener("click", async () => {
    closeSheet();
    if (!confirm("ต้องการลบรูปโปรไฟล์หรือไม่?")) return;
    setPhotoStatus("กำลังลบรูปโปรไฟล์...");
    try {
      const res = await apiProfileDeletePhoto();
      if (!res?.ok) throw new Error(res?.error || "ลบรูปไม่สำเร็จ");

      profile.photoURL = DEFAULT_AVATAR;
      patchAuthUser(profile);

      const img = document.getElementById("profileAvatarImg");
      if (img) img.src = DEFAULT_AVATAR;
      btnDelete.classList.add("hidden");
      setPhotoStatus("ลบรูปโปรไฟล์สำเร็จ", "success");
      showToast("ลบรูปโปรไฟล์สำเร็จ");
    } catch (err) {
      setPhotoStatus(err?.message || "ลบรูปไม่สำเร็จ", "error");
      showToast(err?.message || "ลบรูปไม่สำเร็จ");
    }
  });

  fileInput.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("ไฟล์ต้องไม่เกิน 5MB");
      return;
    }
    if (["image/jpeg", "image/png", "image/webp"].indexOf(file.type) < 0) {
      showToast("รองรับเฉพาะไฟล์ JPEG, PNG, WEBP");
      return;
    }

    setPhotoStatus("กำลังเตรียมรูปภาพ...");
    try {
      const dataUrl = await prepareJsonpSafeImage(file, MAX_JSONP_BASE64_LEN);
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) throw new Error("ไม่สามารถอ่านไฟล์รูปภาพได้");
      if (parsed.base64Data.length > MAX_JSONP_BASE64_LEN) {
        throw new Error("รูปนี้ยังใหญ่เกินข้อจำกัดระบบ กรุณาใช้รูปขนาดเล็กลง");
      }

      setPhotoStatus("กำลังอัปโหลด...");
      const uploadRes = await apiProfileUploadPhoto({
        mimeType: parsed.mimeType,
        base64Data: parsed.base64Data,
        fileName: file.name || "profile.jpg",
      });
      if (!uploadRes?.ok) throw new Error(uploadRes?.error || "อัปโหลดไม่สำเร็จ");

      const newUrl = String(uploadRes.data?.photoURL || "");
      profile.photoURL = newUrl || profile.photoURL;
      patchAuthUser(profile);

      const img = document.getElementById("profileAvatarImg");
      if (img) img.src = newUrl || DEFAULT_AVATAR;
      btnDelete?.classList.remove("hidden");

      setPhotoStatus("เปลี่ยนรูปโปรไฟล์สำเร็จ", "success");
      showToast("เปลี่ยนรูปโปรไฟล์สำเร็จ");
    } catch (err) {
      setPhotoStatus(err?.message || "อัปโหลดไม่สำเร็จ", "error");
      showToast(err?.message || "อัปโหลดไม่สำเร็จ");
    }
  });

  window.lucide?.createIcons?.();
}
