import { showToast } from "../../components/toast.js";
import { apiFinesList, apiProfileGet, apiProfileUploadPhoto, apiProfileDeletePhoto, apiProfileUpdateContact } from "../../data/api.js";
import { escapeHtml } from "../../utils/html.js";
import { GAS_URL } from "../../config.js";

const DEFAULT_AVATAR = "/assets/img/default-avatar.svg";
const PROFILE_UPLOAD_TARGET_SIZE = 400;
const MAX_JSONP_BASE64_LEN = 1800;

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
    <section class="view mx-auto w-full max-w-5xl px-4 py-8 space-y-5">
      <div class="mb-4 flex items-center justify-between">
        <h1 class="text-2xl font-black text-slate-800">ข้อมูลส่วนตัว</h1>
        <a data-link href="/" class="text-sm font-bold text-sky-700 hover:text-sky-800">กลับหน้าหลัก</a>
      </div>
      <div id="profileViewRoot" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="text-sm font-semibold text-slate-500">กำลังโหลดข้อมูล...</div>
      </div>
      <div id="profileFineViewRoot" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="text-sm font-semibold text-slate-500">กำลังโหลดข้อมูลค่าปรับ...</div>
      </div>
      <input type="file" id="profilePhotoFileInput" accept="image/jpeg,image/png,image/webp" class="hidden" />
    </section>
  `;
}

function renderProfileCard(root, profile, stats) {
  const avatar = String(profile.photoURL || "").trim() || DEFAULT_AVATAR;
  const hasCustomPhoto = !isDefaultAvatar(avatar);
  const initials = String(profile.displayName || "U").trim().slice(0, 2).toUpperCase();

  root.innerHTML = `
    <div class="grid gap-5 lg:grid-cols-[260px_1fr]">
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="relative mx-auto mb-3 h-32 w-32">
          <div id="profileAvatarCircle" class="group relative flex h-32 w-32 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow transition-all hover:ring-4 hover:ring-sky-200">
            <img id="profileAvatarImg" src="${escapeHtml(avatar)}" alt="${escapeHtml(profile.displayName || "")}" class="h-full w-full object-cover" onerror="this.onerror=null;this.src='${DEFAULT_AVATAR}';" />
            <div class="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" /></svg>
            </div>
          </div>
          <div id="profilePhotoMenu" class="absolute left-1/2 top-full z-50 mt-2 hidden w-48 -translate-x-1/2 rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
            <button type="button" id="btnChangePhoto" class="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              เปลี่ยนรูปโปรไฟล์
            </button>
            <button type="button" id="btnDeletePhoto" class="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 ${hasCustomPhoto ? "" : "hidden"}" >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              ลบรูปโปรไฟล์
            </button>
          </div>
        </div>
        <div id="profilePhotoStatus" class="mb-2 hidden text-center text-xs font-semibold text-sky-600"></div>
        <p class="text-center text-lg font-black text-slate-800">${escapeHtml(profile.displayName || "-")}</p>
        <p class="text-center text-xs font-semibold uppercase text-slate-500">${escapeHtml(renderRole(profile))}</p>
        <p class="mt-2 text-center text-xs font-semibold text-slate-500">สถานะบัญชี: ${escapeHtml(profile.status || "-")}</p>
      </div>
      <div class="space-y-4">
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-xl border border-slate-200 p-3">
            <p class="text-xs font-black uppercase text-slate-500">อีเมล</p>
            <p class="mt-1 text-sm font-semibold text-slate-800">${escapeHtml(profile.email || "-")}</p>
          </div>
          <div class="rounded-xl border border-slate-200 p-3">
            <p class="text-xs font-black uppercase text-slate-500">เบอร์โทร</p>
            <p class="mt-1 text-sm font-semibold text-slate-800">${escapeHtml(profile.phone || "-")}</p>
          </div>
          <div class="rounded-xl border border-slate-200 p-3 sm:col-span-2">
            <p class="text-xs font-black uppercase text-slate-500">ที่อยู่</p>
            <p class="mt-1 text-sm font-semibold text-slate-800">${escapeHtml(profile.address || "-")}</p>
          </div>
          <div class="rounded-xl border border-slate-200 p-3">
            <p class="text-xs font-black uppercase text-slate-500">Line ID</p>
            <p class="mt-1 text-sm font-semibold text-slate-800">${escapeHtml(profile.lineId || "-")}</p>
          </div>
          <div class="rounded-xl border border-slate-200 p-3">
            <p class="text-xs font-black uppercase text-slate-500">สังกัด/ห้อง</p>
            <p class="mt-1 text-sm font-semibold text-slate-800">${escapeHtml([profile.department, profile.level, profile.classRoom].filter(Boolean).join(" / ") || "-")}</p>
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p class="text-xs font-black uppercase text-amber-700">ยืมค้างอยู่</p>
            <p class="mt-1 text-2xl font-black text-amber-800">${Number(stats.activeLoans || 0)}</p>
          </div>
          <div class="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p class="text-xs font-black uppercase text-rose-700">ยอดค่าปรับค้าง</p>
            <p class="mt-1 text-2xl font-black text-rose-800">${Number(stats.unpaidFineTotal || 0).toLocaleString()} บาท</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <a data-link href="/profile/edit" class="rounded-xl bg-sky-600 px-4 py-2 text-sm font-black text-white hover:bg-sky-700">แก้ไขข้อมูล</a>
          <a data-link href="/profile/change-password" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-100">เปลี่ยนรหัสผ่าน</a>
        </div>
      </div>
    </div>
  `;
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
    <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p class="text-sm font-black text-slate-800">${escapeHtml(fine.fineId || "-")}</p>
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
      ${fine.notes ? `<p class="mt-2 text-xs text-slate-600">${escapeHtml(fine.notes)}</p>` : ""}
    </article>
  `;
}

function renderFineSection(root, finesState) {
  const box = root.querySelector("#profileFineViewRoot");
  if (!box) return;

  if (finesState.loading) {
    box.innerHTML = '<div class="text-sm font-semibold text-slate-500">กำลังโหลดข้อมูลค่าปรับ...</div>';
    return;
  }

  const unpaidTotal = finesState.items
    .filter((item) => String(item.status || "") === "unpaid")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  if (!finesState.items.length) {
    box.innerHTML = `
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-black text-slate-800">ค่าปรับของฉัน</h2>
          <p class="text-xs font-semibold text-slate-500">ไม่มีรายการค่าปรับ</p>
        </div>
        <div class="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
          ค้างชำระ 0 บาท
        </div>
      </div>
      <div class="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">ยังไม่มีรายการค่าปรับในระบบ</div>
    `;
    return;
  }

  box.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-base font-black text-slate-800">ค่าปรับของฉัน</h2>
        <p class="text-xs font-semibold text-slate-500">ดูรายการค่าปรับค้างและประวัติการชำระ/ยกเว้น</p>
      </div>
      <div class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">
        ค้างชำระ ${unpaidTotal.toLocaleString("th-TH")} บาท
      </div>
    </div>
    <div class="mt-4 grid gap-3">
      ${finesState.items.map(renderFineCard).join("")}
    </div>
  `;
}

function setPhotoStatus(msg, type = "info") {
  const el = document.getElementById("profilePhotoStatus");
  if (!el) return;
  el.textContent = msg;
  el.className = `mb-2 text-center text-xs font-semibold ${type === "error" ? "text-rose-600" : type === "success" ? "text-emerald-600" : "text-sky-600"}`;
  el.classList.remove("hidden");
  if (type !== "info") {
    setTimeout(() => el.classList.add("hidden"), 4000);
  }
}

function hidePhotoStatus() {
  const el = document.getElementById("profilePhotoStatus");
  if (el) el.classList.add("hidden");
}

export async function mountProfileView(container) {
  const root = container.querySelector("#profileViewRoot");
  const fineRoot = container.querySelector("#profileFineViewRoot");
  if (!root || !fineRoot) return;

  const auth = readAuthSession();
  if (!auth?.user?.uid) {
    root.innerHTML = '<p class="text-sm font-semibold text-rose-600">ไม่พบ session กรุณาเข้าสู่ระบบใหม่</p>';
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
    renderProfileCard(root, profile, profileRes.data?.stats || {});
    finesState.loading = false;
    finesState.items = fineRes?.ok && Array.isArray(fineRes.data?.items) ? fineRes.data.items : [];
    renderFineSection(container, finesState);
  } catch (err) {
    root.innerHTML = '<p class="text-sm font-semibold text-rose-600">โหลดข้อมูลโปรไฟล์ไม่สำเร็จ</p>';
    finesState.loading = false;
    finesState.items = [];
    renderFineSection(container, finesState);
    showToast(err?.message || "โหลดข้อมูลโปรไฟล์ไม่สำเร็จ");
    return;
  }

  // --- Photo menu toggle ---
  const avatarCircle = document.getElementById("profileAvatarCircle");
  const photoMenu = document.getElementById("profilePhotoMenu");
  const fileInput = document.getElementById("profilePhotoFileInput");
  const btnChange = document.getElementById("btnChangePhoto");
  const btnDelete = document.getElementById("btnDeletePhoto");

  if (avatarCircle && photoMenu) {
    avatarCircle.addEventListener("click", (e) => {
      e.stopPropagation();
      photoMenu.classList.toggle("hidden");
    });
    document.addEventListener("click", () => {
      photoMenu.classList.add("hidden");
    });
    photoMenu.addEventListener("click", (e) => e.stopPropagation());
  }

  // --- Change photo ---
  if (btnChange && fileInput) {
    btnChange.addEventListener("click", () => {
      photoMenu?.classList.add("hidden");
      fileInput.value = "";
      fileInput.click();
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

        // อัปเดต session
        profile.photoURL = newUrl || profile.photoURL;
        patchAuthUser(profile);

        // อัปเดต UI
        const img = document.getElementById("profileAvatarImg");
        if (img) img.src = newUrl || DEFAULT_AVATAR;
        const delBtn = document.getElementById("btnDeletePhoto");
        if (delBtn) delBtn.classList.remove("hidden");

        setPhotoStatus("เปลี่ยนรูปโปรไฟล์สำเร็จ", "success");
        showToast("เปลี่ยนรูปโปรไฟล์สำเร็จ");
      } catch (err) {
        setPhotoStatus(err?.message || "อัปโหลดไม่สำเร็จ", "error");
        showToast(err?.message || "อัปโหลดไม่สำเร็จ");
      }
    });
  }

  // --- Delete photo ---
  if (btnDelete) {
    btnDelete.addEventListener("click", async () => {
      photoMenu?.classList.add("hidden");

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
  }
}
