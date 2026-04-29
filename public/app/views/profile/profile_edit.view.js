import { showToast } from "../../components/toast.js";
import { apiProfileGet, apiProfileUpdateContact } from "../../data/api.js";
import { escapeHtml } from "../../utils/html.js";

function patchAuthUser(profile) {
  const stores = [
    { storage: window.localStorage },
    { storage: window.sessionStorage },
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

function buildReadableErrorMessage(error, phase) {
  const raw = String(error?.message || error || "").trim();
  if (!raw) return `เกิดข้อผิดพลาดระหว่าง${phase}`;
  if (raw === "JSONP request failed") {
    return `เกิดข้อผิดพลาดระหว่าง${phase}: ไม่สามารถติดต่อ Web App ได้`;
  }
  if (raw === "JSONP timeout") {
    return `เกิดข้อผิดพลาดระหว่าง${phase}: การเชื่อมต่อหมดเวลา กรุณาลองใหม่`;
  }
  return `เกิดข้อผิดพลาดระหว่าง${phase}: ${raw}`;
}

function ensureNativeStyles_() {
  if (document.getElementById("profileEditNativeStyle")) return;
  const style = document.createElement("style");
  style.id = "profileEditNativeStyle";
  style.textContent = `
    #profileEditRoot {
      overflow-x: hidden;
      container-type: inline-size;
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
    .profile-top-row {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .profile-edit-grid {
      display: grid;
      gap: 1rem;
    }
    @container (min-width: 768px) {
      .profile-top-row {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
      .profile-edit-grid {
        grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
      }
    }
  `;
  document.head.appendChild(style);
}

function defaultFormValues_() {
  return {
    phone: "",
    lineId: "",
    address: "",
  };
}

function valuesFromForm_(form) {
  return {
    phone: String(form.elements.phone.value || "").trim(),
    lineId: String(form.elements.lineId.value || "").trim(),
    address: String(form.elements.address.value || "").trim(),
  };
}

function valuesEqual_(a, b) {
  return a.phone === b.phone && a.lineId === b.lineId && a.address === b.address;
}

export function renderProfileEditView() {
  return `
    <section id="profileEditRoot" class="mx-auto w-full max-w-[1280px] space-y-4 px-3 pb-4 sm:px-4 lg:px-6">
      <article class="profile-surface rounded-[1.5rem] px-4 py-4 sm:px-5 sm:py-4">
        <div class="profile-top-row">
          <div class="flex min-w-0 items-center gap-3">
            <a data-link href="/profile" class="profile-pressable inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" aria-label="กลับหน้าโปรไฟล์">
              <i data-lucide="arrow-left" class="h-5 w-5"></i>
            </a>
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-sky-600">Profile Settings</p>
              <h1 class="text-base font-black text-slate-800 sm:text-lg">แก้ไขข้อมูลติดต่อ</h1>
              <p class="mt-1 text-xs font-semibold text-slate-500">อัปเดตข้อมูลติดต่อให้สอดคล้องกับหน้าโปรไฟล์หลักและ shell</p>
            </div>
          </div>
          <a data-link href="/profile/change-password" class="profile-pressable inline-flex items-center justify-center gap-2 rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
            <i data-lucide="key-round" class="h-4 w-4"></i>
            เปลี่ยนรหัสผ่าน
          </a>
        </div>
      </article>

      <main class="profile-edit-grid">
        <section id="profileEditPreview" class="profile-surface rounded-[1.75rem] p-5">
          <div class="space-y-3">
            <div class="h-24 rounded-[1.5rem] bg-slate-100"></div>
            <div class="h-10 rounded-[1.25rem] bg-slate-100"></div>
          </div>
        </section>

        <form id="profileEditForm" class="profile-surface space-y-4 rounded-[1.75rem] p-5">
          <div id="profileEditError" class="hidden rounded-[1.1rem] border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700"></div>
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="space-y-1 text-xs font-bold text-slate-600">
              <span>เบอร์โทร</span>
              <input name="phone" placeholder="08xxxxxxxx" class="w-full rounded-[1.1rem] border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
            </label>
            <label class="space-y-1 text-xs font-bold text-slate-600">
              <span>Line ID</span>
              <input name="lineId" placeholder="line id" class="w-full rounded-[1.1rem] border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
            </label>
            <label class="space-y-1 text-xs font-bold text-slate-600 sm:col-span-2">
              <span>ที่อยู่</span>
              <textarea name="address" rows="4" class="w-full rounded-[1.1rem] border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100"></textarea>
            </label>
          </div>

          <div class="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
            <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">สถานะการเปลี่ยนแปลง</p>
            <p id="profileEditSnapshot" class="mt-1 text-sm font-semibold text-slate-700">ยังไม่มีการเปลี่ยนแปลง</p>
          </div>

          <div class="grid gap-2 sm:grid-cols-2">
            <button id="btn-save-profile" type="submit" disabled class="profile-pressable inline-flex items-center justify-center rounded-[1.25rem] bg-sky-600 px-4 py-3 text-sm font-black text-white opacity-60">
              บันทึกการเปลี่ยนแปลง
            </button>
            <a data-link href="/profile/change-password" class="profile-pressable inline-flex items-center justify-center rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">เปลี่ยนรหัสผ่าน</a>
          </div>
        </form>
      </main>
    </section>
  `;
}

export async function mountProfileEditView(container) {
  ensureNativeStyles_();

  const form = container.querySelector("#profileEditForm");
  const preview = container.querySelector("#profileEditPreview");
  if (!form || !preview) return;

  const errorBox = form.querySelector("#profileEditError");
  const snapshotBox = form.querySelector("#profileEditSnapshot");
  const submitBtn = form.querySelector("#btn-save-profile");
  const phoneInput = form.elements.phone;
  const lineIdInput = form.elements.lineId;
  const addressInput = form.elements.address;

  const original = defaultFormValues_();
  let profile = null;
  let loading = true;

  function showError(message) {
    if (!errorBox) return;
    errorBox.textContent = String(message || "เกิดข้อผิดพลาด");
    errorBox.classList.remove("hidden");
  }

  function clearError() {
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.classList.add("hidden");
  }

  function updateSnapshot() {
    const next = valuesFromForm_(form);
    const dirty = !valuesEqual_(next, original);
    const hasAnyValue = next.phone || next.lineId || next.address;
    const enabled = !loading && dirty;
    if (submitBtn) {
      submitBtn.disabled = !enabled;
      submitBtn.classList.toggle("opacity-60", !enabled);
      submitBtn.classList.toggle("cursor-not-allowed", !enabled);
    }
    if (snapshotBox) {
      snapshotBox.textContent = dirty
        ? "ข้อมูลถูกแก้ไขแล้ว"
        : hasAnyValue
          ? "ยังไม่ได้เปลี่ยนข้อมูลจากค่าปัจจุบัน"
          : "ยังไม่มีข้อมูลติดต่อที่แก้ไข";
    }
  }

  try {
    const res = await apiProfileGet();
    if (!res?.ok) throw new Error(res?.error || "โหลดข้อมูลโปรไฟล์ไม่สำเร็จ");
    profile = res.data?.profile || {};
    original.phone = String(profile.phone || "");
    original.lineId = String(profile.lineId || "");
    original.address = String(profile.address || "");
    phoneInput.value = original.phone;
    lineIdInput.value = original.lineId;
    addressInput.value = original.address;

    preview.innerHTML = `
      <div class="flex items-center gap-4">
        <div class="flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-base font-black text-sky-700">${escapeHtml(String(profile.displayName || "U").trim().slice(0, 2).toUpperCase())}</div>
        <div class="min-w-0">
          <p class="text-[10px] font-black uppercase tracking-[0.16em] text-sky-600">Current Profile</p>
          <p class="mt-1 text-lg font-black text-slate-900">${escapeHtml(profile.displayName || "-")}</p>
          <p class="text-sm font-semibold text-slate-600">${escapeHtml([profile.role, profile.groupType].filter(Boolean).join(" / ") || "-")}</p>
        </div>
      </div>
      <div class="mt-3 grid gap-2 sm:grid-cols-3">
        <div class="rounded-[1.1rem] border border-slate-200 bg-white p-3">
          <p class="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">อีเมล</p>
          <p class="mt-1 text-sm font-semibold text-slate-800">${escapeHtml(profile.email || "-")}</p>
        </div>
        <div class="rounded-[1.1rem] border border-slate-200 bg-white p-3">
          <p class="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">เบอร์โทร</p>
          <p class="mt-1 text-sm font-semibold text-slate-800">${escapeHtml(profile.phone || "-")}</p>
        </div>
        <div class="rounded-[1.1rem] border border-slate-200 bg-white p-3">
          <p class="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Line ID</p>
          <p class="mt-1 text-sm font-semibold text-slate-800">${escapeHtml(profile.lineId || "-")}</p>
        </div>
      </div>
    `;
    loading = false;
    clearError();
  } catch (err) {
    loading = false;
    showToast(err?.message || "โหลดข้อมูลโปรไฟล์ไม่สำเร็จ");
    showError(buildReadableErrorMessage(err, "โหลดข้อมูล"));
  } finally {
    updateSnapshot();
  }

  form.addEventListener("input", () => {
    clearError();
    updateSnapshot();
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();
    const next = valuesFromForm_(form);
    if (valuesEqual_(next, original)) {
      showToast("ยังไม่มีการเปลี่ยนแปลง");
      return;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add("opacity-60", "cursor-not-allowed");
    }

    try {
      const res = await apiProfileUpdateContact({
        phone: next.phone,
        lineId: next.lineId,
        address: next.address,
        photoURL: profile?.photoURL || "",
      });
      if (!res?.ok) throw new Error(res?.error || "บันทึกข้อมูลไม่สำเร็จ");

      const nextProfile = res.data?.profile || {};
      patchAuthUser(nextProfile);
      profile = { ...profile, ...nextProfile };
      original.phone = String(next.phone || "");
      original.lineId = String(next.lineId || "");
      original.address = String(next.address || "");
      phoneInput.value = original.phone;
      lineIdInput.value = original.lineId;
      addressInput.value = original.address;
      updateSnapshot();
      showToast("บันทึกข้อมูลสำเร็จ");
    } catch (err) {
      showToast(err?.message || "บันทึกข้อมูลไม่สำเร็จ");
      showError(buildReadableErrorMessage(err, "บันทึกข้อมูล"));
    } finally {
      if (submitBtn) {
        submitBtn.disabled = !loading && valuesEqual_(valuesFromForm_(form), original);
        submitBtn.classList.toggle("opacity-60", submitBtn.disabled);
        submitBtn.classList.toggle("cursor-not-allowed", submitBtn.disabled);
      }
    }
  });
}
