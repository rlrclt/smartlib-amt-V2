import { showToast } from "../../components/toast.js";
import { apiProfileUpdateContact } from "../../data/api.js";
import {
  MEMBER_SYNC_KEYS,
  getMemberResource,
  revalidateMemberResource,
  subscribeMemberResource,
} from "../../data/member_sync.js";
import { escapeHtml } from "../../utils/html.js";
const LOG_PREFIX = "[MemberProfileEdit]";

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
    displayName: "",
    personnelType: "",
    department: "",
    level: "",
    classRoom: "",
    organization: "",
    idType: "",
    phone: "",
    lineId: "",
    address: "",
  };
}

function valuesFromForm_(form) {
  return {
    displayName: String(form.elements.displayName.value || "").trim(),
    personnelType: String(form.elements.personnelType.value || "").trim(),
    department: String(form.elements.department.value || "").trim(),
    level: String(form.elements.level.value || "").trim(),
    classRoom: String(form.elements.classRoom.value || "").trim(),
    organization: String(form.elements.organization.value || "").trim(),
    idType: String(form.elements.idType.value || "").trim(),
    phone: String(form.elements.phone.value || "").trim(),
    lineId: String(form.elements.lineId.value || "").trim(),
    address: String(form.elements.address.value || "").trim(),
  };
}

function valuesEqual_(a, b) {
  return a.displayName === b.displayName
    && a.personnelType === b.personnelType
    && a.department === b.department
    && a.level === b.level
    && a.classRoom === b.classRoom
    && a.organization === b.organization
    && a.idType === b.idType
    && a.phone === b.phone
    && a.lineId === b.lineId
    && a.address === b.address;
}

function normalizeClassRoomValue_(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const matched = text.match(/\d+\s*\/\s*\d+/);
  if (matched && matched[0]) return matched[0].replace(/\s+/g, "");
  const d = new Date(text);
  if (Number.isFinite(d.getTime())) return `${d.getMonth() + 1}/${d.getDate()}`;
  return text;
}

export function renderProfileEditView() {
  return `
    <section id="profileEditRoot" class="member-page-container view w-full max-w-[1280px] space-y-4">
      <article class="profile-surface rounded-[1.5rem] px-4 py-4 sm:px-5 sm:py-4">
        <div class="profile-top-row">
          <div class="flex min-w-0 items-center gap-3">
            <a data-link href="/profile" class="profile-pressable inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" aria-label="กลับหน้าโปรไฟล์">
              <i data-lucide="arrow-left" class="h-5 w-5"></i>
            </a>
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-sky-600">Profile Settings</p>
              <h1 class="text-base font-black text-slate-800 sm:text-lg">แก้ไขข้อมูลส่วนตัว</h1>
              <p class="mt-1 text-xs font-semibold text-slate-500">อัปเดตข้อมูลส่วนตัวตาม schema ผู้ใช้งาน (อีเมลแยกไปอีกหน้า)</p>
            </div>
          </div>
          <div class="flex flex-wrap gap-2">
            <a data-link href="/profile/email" class="profile-pressable inline-flex items-center justify-center gap-2 rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
              <i data-lucide="mail" class="h-4 w-4"></i>
              เปลี่ยนอีเมล
            </a>
            <a data-link href="/profile/change-password" class="profile-pressable inline-flex items-center justify-center gap-2 rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
              <i data-lucide="key-round" class="h-4 w-4"></i>
              เปลี่ยนรหัสผ่าน
            </a>
          </div>
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
            <label class="space-y-1 text-xs font-bold text-slate-600 sm:col-span-2">
              <span>ชื่อที่แสดงในระบบ</span>
              <input name="displayName" placeholder="ชื่อ-นามสกุล" class="w-full rounded-[1.1rem] border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
            </label>
            <label class="hidden space-y-1 text-xs font-bold text-slate-600">
              <span>ประเภทบุคลากร</span>
              <input name="personnelType" placeholder="เช่น เจ้าหน้าที่ / ข้าราชการ" class="w-full rounded-[1.1rem] border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
            </label>
            <label class="space-y-1 text-xs font-bold text-slate-600">
              <span>แผนก / สาขา</span>
              <input name="department" placeholder="เช่น สาขาคอมพิวเตอร์ธุรกิจ" class="w-full rounded-[1.1rem] border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
            </label>
            <label class="space-y-1 text-xs font-bold text-slate-600">
              <span>ระดับการศึกษา</span>
              <select name="level" class="w-full rounded-[1.1rem] border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100">
                <option value="">ไม่ระบุ</option>
                <option value="ปวช.">ปวช.</option>
                <option value="ปวส.">ปวส.</option>
              </select>
            </label>
            <label class="space-y-1 text-xs font-bold text-slate-600">
              <span>ห้องเรียน</span>
              <input name="classRoom" placeholder="เช่น 1/1" class="w-full rounded-[1.1rem] border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
            </label>
            <label class="hidden space-y-1 text-xs font-bold text-slate-600">
              <span>หน่วยงาน/สังกัด</span>
              <input name="organization" placeholder="กรณี external" class="w-full rounded-[1.1rem] border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
            </label>
            <label class="hidden space-y-1 text-xs font-bold text-slate-600">
              <span>ประเภทบัตร</span>
              <select name="idType" class="w-full rounded-[1.1rem] border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100">
                <option value="">ไม่ระบุ</option>
                <option value="nationalId">nationalId</option>
                <option value="passport">passport</option>
                <option value="studentCard">studentCard</option>
              </select>
            </label>
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

          <div class="rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4">
            <p class="text-[10px] font-black uppercase tracking-[0.16em] text-amber-700">อีเมลเข้าสู่ระบบ</p>
            <p class="mt-1 text-sm font-semibold text-amber-800">การเปลี่ยนอีเมลแยกเป็นอีกหน้าเพื่อรองรับการยืนยันด้วยรหัส PIN 6 หลัก</p>
            <a data-link href="/profile/email" class="mt-3 inline-flex items-center justify-center rounded-[1rem] border border-amber-300 bg-white px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100">ไปหน้าจัดการอีเมล</a>
          </div>

          <div class="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
            <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">สถานะการเปลี่ยนแปลง</p>
            <p id="profileEditSnapshot" class="mt-1 text-sm font-semibold text-slate-700">ยังไม่มีการเปลี่ยนแปลง</p>
          </div>

          <div class="flex justify-center">
            <button id="btn-save-profile" type="submit" disabled class="profile-pressable inline-flex items-center justify-center rounded-[1.25rem] bg-sky-600 px-4 py-3 text-sm font-black text-white opacity-60">
              บันทึกการเปลี่ยนแปลง
            </button>
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
  let unsubscribe = null;

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
    const hasAnyValue = Object.values(next).some(Boolean);
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
    const cached = getMemberResource(MEMBER_SYNC_KEYS.profile);
    if (cached?.profile) {
      console.log(`${LOG_PREFIX} use cached profile bundle`);
      profile = cached.profile || {};
      void revalidateMemberResource(MEMBER_SYNC_KEYS.profile, { force: true });
    } else {
      console.log(`${LOG_PREFIX} cache miss -> force revalidate profile`);
      const res = await revalidateMemberResource(MEMBER_SYNC_KEYS.profile, { force: true });
      if (!res?.ok || !res.data?.profile) throw new Error(res?.error || "โหลดข้อมูลโปรไฟล์ไม่สำเร็จ");
      profile = res.data.profile || {};
    }
    original.phone = String(profile.phone || "");
    original.lineId = String(profile.lineId || "");
    original.address = String(profile.address || "");
    original.displayName = String(profile.displayName || "");
    original.personnelType = String(profile.personnelType || "");
    original.department = String(profile.department || "");
    original.level = String(profile.level || "");
    original.classRoom = normalizeClassRoomValue_(profile.classRoom);
    original.organization = String(profile.organization || "");
    original.idType = String(profile.idType || "");
    form.elements.displayName.value = original.displayName;
    form.elements.personnelType.value = original.personnelType;
    form.elements.department.value = original.department;
    form.elements.level.value = original.level;
    form.elements.classRoom.value = original.classRoom;
    form.elements.organization.value = original.organization;
    form.elements.idType.value = original.idType;
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
      <div class="mt-2 grid gap-2 sm:grid-cols-3">
        <div class="rounded-[1.1rem] border border-slate-200 bg-white p-3">
          <p class="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">รหัสประจำตัว</p>
          <p class="mt-1 text-sm font-semibold text-slate-800">${escapeHtml(profile.idCode || "-")}</p>
        </div>
        <div class="rounded-[1.1rem] border border-slate-200 bg-white p-3">
          <p class="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">แผนก / ระดับ</p>
          <p class="mt-1 text-sm font-semibold text-slate-800">${escapeHtml([profile.department, profile.level].filter(Boolean).join(" / ") || "-")}</p>
        </div>
        <div class="rounded-[1.1rem] border border-slate-200 bg-white p-3">
          <p class="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">ห้องเรียน</p>
          <p class="mt-1 text-sm font-semibold text-slate-800">${escapeHtml(normalizeClassRoomValue_(profile.classRoom) || "-")}</p>
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

  unsubscribe = subscribeMemberResource(MEMBER_SYNC_KEYS.profile, (nextBundle) => {
    if (!nextBundle?.profile || !form?.isConnected) return;
    const p = nextBundle.profile;
    profile = { ...profile, ...p };
    original.phone = String(p.phone || "");
    original.lineId = String(p.lineId || "");
    original.address = String(p.address || "");
    original.displayName = String(p.displayName || "");
    original.personnelType = String(p.personnelType || "");
    original.department = String(p.department || "");
    original.level = String(p.level || "");
    original.classRoom = normalizeClassRoomValue_(p.classRoom);
    original.organization = String(p.organization || "");
    original.idType = String(p.idType || "");
    form.elements.displayName.value = original.displayName;
    form.elements.personnelType.value = original.personnelType;
    form.elements.department.value = original.department;
    form.elements.level.value = original.level;
    form.elements.classRoom.value = original.classRoom;
    form.elements.organization.value = original.organization;
    form.elements.idType.value = original.idType;
    phoneInput.value = original.phone;
    lineIdInput.value = original.lineId;
    addressInput.value = original.address;
    updateSnapshot();
  });
  const rootAliveTimer = window.setInterval(() => {
    if (form?.isConnected) return;
    unsubscribe?.();
    clearInterval(rootAliveTimer);
  }, 1000);

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
        displayName: next.displayName,
        personnelType: next.personnelType,
        department: next.department,
        level: next.level,
        classRoom: next.classRoom,
        organization: next.organization,
        idType: next.idType,
        phone: next.phone,
        lineId: next.lineId,
        address: next.address,
        photoURL: profile?.photoURL || "",
      });
      if (!res?.ok) throw new Error(res?.error || "บันทึกข้อมูลไม่สำเร็จ");

      const nextProfile = res.data?.profile || {};
      patchAuthUser(nextProfile);
      profile = { ...profile, ...nextProfile };
      original.displayName = String(next.displayName || "");
      original.personnelType = String(next.personnelType || "");
      original.department = String(next.department || "");
      original.level = String(next.level || "");
      original.classRoom = normalizeClassRoomValue_(next.classRoom);
      original.organization = String(next.organization || "");
      original.idType = String(next.idType || "");
      original.phone = String(next.phone || "");
      original.lineId = String(next.lineId || "");
      original.address = String(next.address || "");
      form.elements.displayName.value = original.displayName;
      form.elements.personnelType.value = original.personnelType;
      form.elements.department.value = original.department;
      form.elements.level.value = original.level;
      form.elements.classRoom.value = original.classRoom;
      form.elements.organization.value = original.organization;
      form.elements.idType.value = original.idType;
      phoneInput.value = original.phone;
      lineIdInput.value = original.lineId;
      addressInput.value = original.address;
      console.log(`${LOG_PREFIX} update contact success -> revalidate profile`);
      await revalidateMemberResource(MEMBER_SYNC_KEYS.profile, { force: true });
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
