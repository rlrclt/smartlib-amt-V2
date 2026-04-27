import { showToast } from "../../components/toast.js";
import { apiPing, apiProfileGet, apiProfileUpdateContact, apiProfileUploadPhoto } from "../../data/api.js";
import { GAS_URL } from "../../config.js";

const PROFILE_UPLOAD_TARGET_SIZE = 400;
const PROFILE_UPLOAD_TARGET_MAX_BYTES = 150 * 1024;

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
      // ignore broken storage
    }
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
    reader.readAsDataURL(file);
  });
}

function estimateDataUrlBytes(dataUrl) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed || !parsed.base64Data) return 0;
  const len = parsed.base64Data.length;
  const padding = (parsed.base64Data.match(/=+$/) || [""])[0].length;
  return Math.floor((len * 3) / 4) - padding;
}

async function preparePreferredProfileDataUrl(file, maxBytes) {
  const src = await fileToDataUrl(file);
  const img = new Image();
  img.src = src;
  await new Promise((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("เปิดไฟล์รูปไม่สำเร็จ"));
  });

  const canvas = document.createElement("canvas");
  const size = PROFILE_UPLOAD_TARGET_SIZE;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const w = img.width;
  const h = img.height;
  const side = Math.min(w, h);
  const sx = Math.floor((w - side) / 2);
  const sy = Math.floor((h - side) / 2);
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);

  const qualityLevels = [0.85, 0.75, 0.65, 0.55, 0.45];
  let best = "";
  for (let i = 0; i < qualityLevels.length; i += 1) {
    const dataUrl = canvas.toDataURL("image/jpeg", qualityLevels[i]);
    best = dataUrl;
    if (estimateDataUrlBytes(dataUrl) <= maxBytes) return dataUrl;
  }
  return best;
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
  const sizes = [128, 112, 96, 80, 72, 64, 56, 48, 40, 32];
  const qualities = [0.65, 0.5, 0.35, 0.25, 0.18, 0.12, 0.08];
  const formats = ["image/webp", "image/jpeg"];
  let best = "";

  for (let i = 0; i < sizes.length; i += 1) {
    const size = sizes[i];
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);
    ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
    for (let f = 0; f < formats.length; f += 1) {
      const format = formats[f];
      for (let j = 0; j < qualities.length; j += 1) {
        const dataUrl = canvas.toDataURL(format, qualities[j]);
        const parsed = parseDataUrl(dataUrl);
        if (!parsed) continue;
        best = dataUrl;
        if (parsed.base64Data.length <= maxBase64Len) return dataUrl;
      }
    }
  }

  return best;
}

function parseDataUrl(dataUrl) {
  const m = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mimeType: m[1], base64Data: m[2] };
}

function buildReadableErrorMessage(error, phase) {
  const raw = String(error?.message || error || "").trim();
  if (!raw) return `เกิดข้อผิดพลาดระหว่าง${phase}`;
  if (raw === "JSONP request failed") {
    return `เกิดข้อผิดพลาดระหว่าง${phase}: ไม่สามารถติดต่อ Web App ได้ (อาจเป็น URL ผิด/สิทธิ์ deployment ไม่เปิด/เน็ตขัดข้อง)`;
  }
  if (raw === "JSONP timeout") {
    return `เกิดข้อผิดพลาดระหว่าง${phase}: การเชื่อมต่อหมดเวลา กรุณาลองใหม่`;
  }
  return `เกิดข้อผิดพลาดระหว่าง${phase}: ${raw}`;
}

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

function estimateUploadUrlLength(payload) {
  try {
    const auth = readAuthSession();
    const uid = String(auth?.user?.uid || auth?.uid || "").trim();
    const slimAuth = uid
      ? {
          uid,
          user: { uid },
        }
      : auth;
    const query = new URLSearchParams({
      action: "profile_upload_photo",
      callback: "__gas_cb_debug",
      payload: JSON.stringify({
        ...payload,
        auth: slimAuth,
      }),
    });
    return `${GAS_URL}?${query.toString()}`.length;
  } catch {
    return -1;
  }
}

async function diagnoseUploadFailure(uploadErr, pendingPhoto) {
  const lines = [];
  lines.push("Debug report:");
  lines.push(`- gas_url: ${GAS_URL}`);
  lines.push(`- raw_error: ${String(uploadErr?.message || uploadErr || "-")}`);
  lines.push(`- mimeType: ${String(pendingPhoto?.mimeType || "-")}`);
  lines.push(`- base64_len: ${Number(pendingPhoto?.base64Data?.length || 0)}`);
  const urlLen = estimateUploadUrlLength(pendingPhoto || {});
  lines.push(`- estimated_upload_url_len: ${urlLen >= 0 ? urlLen : "unknown"}`);

  try {
    const pingRes = await apiPing();
    lines.push(`- ping: ${pingRes?.ok ? "ok" : `fail (${String(pingRes?.error || "unknown")})`}`);
  } catch (err) {
    lines.push(`- ping: exception (${String(err?.message || err)})`);
  }

  try {
    const profileRes = await apiProfileGet();
    lines.push(`- profile_get: ${profileRes?.ok ? "ok" : `fail (${String(profileRes?.error || "unknown")})`}`);
  } catch (err) {
    lines.push(`- profile_get: exception (${String(err?.message || err)})`);
  }

  return lines.join("\n");
}

export function renderProfileEditView() {
  return `
    <section class="view mx-auto w-full max-w-4xl px-4 py-8">
      <div class="mb-4 flex items-center justify-between">
        <h1 class="text-2xl font-black text-slate-800">แก้ไขข้อมูลติดต่อ</h1>
        <a data-link href="/profile" class="text-sm font-bold text-sky-700 hover:text-sky-800">กลับหน้าโปรไฟล์</a>
      </div>
      <form id="profileEditForm" class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div id="profileEditError" class="hidden rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700"></div>
        <pre id="profileEditDebug" class="hidden overflow-x-auto rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-semibold text-amber-900"></pre>
        <div class="grid gap-4 sm:grid-cols-[140px_1fr]">
          <div class="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-slate-100 bg-slate-200" id="profilePhotoPreviewWrap">
            <span id="profilePhotoFallback" class="text-xl font-black text-slate-700">U</span>
            <img id="profilePhotoPreview" alt="profile" class="hidden h-full w-full object-cover" />
          </div>
          <div class="space-y-2">
            <label class="block text-xs font-black uppercase text-slate-500">เปลี่ยนรูปโปรไฟล์</label>
            <input id="profilePhotoInput" type="file" accept="image/jpeg,image/png,image/webp" class="block w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
            <p class="text-xs font-semibold text-slate-500">ระบบจะย่อรูปเป็น 400x400 ก่อนอัปโหลด</p>
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="space-y-1 text-xs font-bold text-slate-600">
            <span>เบอร์โทร</span>
            <input name="phone" placeholder="08xxxxxxxx" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label class="space-y-1 text-xs font-bold text-slate-600">
            <span>Line ID</span>
            <input name="lineId" placeholder="line id" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label class="space-y-1 text-xs font-bold text-slate-600 sm:col-span-2">
            <span>ที่อยู่</span>
            <textarea name="address" rows="3" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
          </label>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="submit" class="rounded-xl bg-sky-600 px-4 py-2 text-sm font-black text-white hover:bg-sky-700">บันทึกการเปลี่ยนแปลง</button>
          <a data-link href="/profile/change-password" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-100">เปลี่ยนรหัสผ่าน</a>
        </div>
      </form>
    </section>
  `;
}

function setPreview(profile) {
  const fallback = document.getElementById("profilePhotoFallback");
  const img = document.getElementById("profilePhotoPreview");
  if (!fallback || !img) return;
  const name = String(profile?.displayName || "U").trim();
  fallback.textContent = name.slice(0, 2).toUpperCase();
  const photoURL = String(profile?.photoURL || "").trim() || "/assets/img/default-avatar.svg";
  fallback.classList.add("hidden");
  img.classList.remove("hidden");
  img.src = photoURL;
}

export async function mountProfileEditView(container) {
  const form = container.querySelector("#profileEditForm");
  if (!form) return;
  const errorBox = form.querySelector("#profileEditError");
  const debugBox = form.querySelector("#profileEditDebug");
  const photoInput = form.querySelector("#profilePhotoInput");
  const phoneInput = form.elements.phone;
  const lineIdInput = form.elements.lineId;
  const addressInput = form.elements.address;
  const submitBtn = form.querySelector('button[type="submit"]');
  const MAX_JSONP_BASE64_LEN = 1800;

  function showFormError(message) {
    if (!errorBox) return;
    errorBox.textContent = String(message || "เกิดข้อผิดพลาด");
    errorBox.classList.remove("hidden");
  }

  function showDebug(message) {
    if (!debugBox) return;
    debugBox.textContent = String(message || "");
    debugBox.classList.remove("hidden");
  }

  function clearFormError() {
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.classList.add("hidden");
    if (debugBox) {
      debugBox.textContent = "";
      debugBox.classList.add("hidden");
    }
  }

  let profile = null;
  let pendingPhoto = null;

  try {
    const res = await apiProfileGet();
    if (!res?.ok) throw new Error(res?.error || "โหลดข้อมูลโปรไฟล์ไม่สำเร็จ");
    profile = res.data?.profile || {};
    setPreview(profile);
    phoneInput.value = String(profile.phone || "");
    lineIdInput.value = String(profile.lineId || "");
    addressInput.value = String(profile.address || "");
  } catch (err) {
    showToast(err?.message || "โหลดข้อมูลโปรไฟล์ไม่สำเร็จ");
    showFormError(buildReadableErrorMessage(err, "โหลดข้อมูล"));
  }

  photoInput?.addEventListener("change", async (event) => {
    clearFormError();
    const file = event.target.files && event.target.files[0];
    if (!file) {
      pendingPhoto = null;
      setPreview(profile || {});
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast("ไฟล์ต้องไม่เกิน 2MB");
      event.target.value = "";
      return;
    }
    if (["image/jpeg", "image/png", "image/webp"].indexOf(file.type) < 0) {
      showToast("รองรับเฉพาะไฟล์ JPEG, PNG, WEBP");
      event.target.value = "";
      return;
    }
    try {
      let dataUrl = await preparePreferredProfileDataUrl(file, PROFILE_UPLOAD_TARGET_MAX_BYTES);
      let parsed = parseDataUrl(dataUrl);
      if (!parsed || parsed.base64Data.length > MAX_JSONP_BASE64_LEN) {
        const compact = await prepareJsonpSafeImage(file, MAX_JSONP_BASE64_LEN);
        dataUrl = compact || dataUrl;
        parsed = parseDataUrl(dataUrl);
      }
      if (!parsed) throw new Error("ไม่สามารถอ่านไฟล์รูปภาพได้");
      // JSONP upload has URL length constraints because payload is sent via query string.
      if (parsed.base64Data.length > MAX_JSONP_BASE64_LEN) {
        throw new Error("รูปนี้ยังใหญ่เกินข้อจำกัดระบบอัปโหลด (JSONP) กรุณาใช้รูปขนาดเล็กลงหรือบันทึกรูปเป็น JPG แล้วลองใหม่");
      }
      pendingPhoto = {
        mimeType: parsed.mimeType,
        base64Data: parsed.base64Data,
        fileName: file.name || "profile.jpg",
      };
      setPreview({ ...(profile || {}), photoURL: dataUrl });
    } catch (err) {
      pendingPhoto = null;
      event.target.value = "";
      setPreview(profile || {});
      showToast(err?.message || "เตรียมรูปภาพไม่สำเร็จ");
      showFormError(buildReadableErrorMessage(err, "เตรียมรูปภาพ"));
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFormError();
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add("opacity-60", "cursor-not-allowed");
    }
    try {
      let photoURL = profile?.photoURL || "";
      if (pendingPhoto) {
        try {
          const upload = await apiProfileUploadPhoto(pendingPhoto);
          if (!upload?.ok) throw new Error(upload?.error || "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ");
          photoURL = String(upload.data?.photoURL || photoURL || "");
        } catch (uploadErr) {
          const readable = buildReadableErrorMessage(uploadErr, "อัปโหลดรูปโปรไฟล์");
          const debug = await diagnoseUploadFailure(uploadErr, pendingPhoto);
          throw new Error(`${readable}\n${debug}`);
        }
      }

      const payload = {
        phone: String(phoneInput.value || "").trim(),
        lineId: String(lineIdInput.value || "").trim(),
        address: String(addressInput.value || "").trim(),
        photoURL: photoURL,
      };
      let res;
      try {
        res = await apiProfileUpdateContact(payload);
      } catch (saveErr) {
        throw new Error(buildReadableErrorMessage(saveErr, "บันทึกข้อมูล"));
      }
      if (!res?.ok) throw new Error(buildReadableErrorMessage(res?.error || "บันทึกข้อมูลไม่สำเร็จ", "บันทึกข้อมูล"));

      const nextProfile = res.data?.profile || {};
      patchAuthUser(nextProfile);
      profile = nextProfile;
      pendingPhoto = null;
      setPreview(profile);
      showToast("บันทึกข้อมูลสำเร็จ");
    } catch (err) {
      const all = String(err?.message || "บันทึกข้อมูลไม่สำเร็จ");
      const [message, ...debugLines] = all.split("\n");
      showToast(message);
      showFormError(message);
      if (debugLines.length) showDebug(debugLines.join("\n"));
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove("opacity-60", "cursor-not-allowed");
      }
    }
  });
}
