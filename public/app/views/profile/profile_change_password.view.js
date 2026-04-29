import { showToast } from "../../components/toast.js";
import { apiProfileChangePassword } from "../../data/api.js";
import { MEMBER_SYNC_KEYS, revalidateMemberResource } from "../../data/member_sync.js";
const LOG_PREFIX = "[MemberProfilePassword]";

function ensureNativeStyles_() {
  if (document.getElementById("profilePasswordNativeStyle")) return;
  const style = document.createElement("style");
  style.id = "profilePasswordNativeStyle";
  style.textContent = `
    #profilePasswordRoot {
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
    .profile-top-row {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .profile-password-grid {
      display: grid;
      gap: 1rem;
    }
    @container (min-width: 768px) {
      .profile-top-row {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
      .profile-password-grid {
        grid-template-columns: minmax(0, 0.92fr) minmax(0, 1.08fr);
      }
    }
  `;
  document.head.appendChild(style);
}

function clearSessionAndRedirectSignin() {
  window.localStorage.removeItem("smartlib.auth");
  window.sessionStorage.removeItem("smartlib.auth");
  window.history.replaceState({}, "", "/signin");
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function renderProfileChangePasswordView() {
  return `
    <section id="profilePasswordRoot" class="mx-auto w-full max-w-[1280px] space-y-4 px-3 pb-4 sm:px-4 lg:px-6">
      <article class="profile-surface rounded-[1.5rem] px-4 py-4 sm:px-5 sm:py-4">
        <div class="profile-top-row">
          <div class="flex min-w-0 items-center gap-3">
            <a data-link href="/profile" class="profile-pressable inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" aria-label="กลับหน้าโปรไฟล์">
              <i data-lucide="arrow-left" class="h-5 w-5"></i>
            </a>
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-sky-600">Security</p>
              <h1 class="text-base font-black text-slate-800 sm:text-lg">เปลี่ยนรหัสผ่าน</h1>
              <p class="mt-1 text-xs font-semibold text-slate-500">หน้าความปลอดภัยใช้ responsive pattern เดียวกับโปรไฟล์หลัก</p>
            </div>
          </div>
          <a data-link href="/profile/edit" class="profile-pressable inline-flex items-center justify-center gap-2 rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
            <i data-lucide="badge-info" class="h-4 w-4"></i>
            แก้ไขข้อมูล
          </a>
        </div>
      </article>

      <main class="profile-password-grid">
        <section class="profile-surface rounded-[1.75rem] p-5">
          <p class="text-[11px] font-black uppercase tracking-[0.18em] text-sky-600">Change Password</p>
          <h2 class="mt-1 text-[1.4rem] font-black text-slate-900">ตั้งรหัสผ่านใหม่ให้ปลอดภัยกว่าเดิม</h2>
          <p class="mt-2 text-sm leading-6 text-slate-600">ระบบจะออกจากระบบอัตโนมัติหลังเปลี่ยนรหัสผ่านสำเร็จ เพื่อให้ล็อกอินใหม่ด้วยรหัสล่าสุด</p>
        </section>

        <form id="profileChangePasswordForm" class="profile-surface space-y-4 rounded-[1.75rem] p-5">
          <div id="profileChangePasswordError" class="hidden rounded-[1.1rem] border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700"></div>

          <label class="block space-y-1 text-xs font-bold text-slate-600">
            <span>รหัสผ่านเดิม</span>
            <input name="oldPassword" type="password" required autocomplete="current-password" class="w-full rounded-[1.1rem] border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
          </label>
          <label class="block space-y-1 text-xs font-bold text-slate-600">
            <span>รหัสผ่านใหม่ (ขั้นต่ำ 8 ตัวอักษร)</span>
            <input name="newPassword" type="password" minlength="8" required autocomplete="new-password" class="w-full rounded-[1.1rem] border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
          </label>
          <label class="block space-y-1 text-xs font-bold text-slate-600">
            <span>ยืนยันรหัสผ่านใหม่</span>
            <input name="confirmPassword" type="password" minlength="8" required autocomplete="new-password" class="w-full rounded-[1.1rem] border border-slate-200 bg-white px-3 py-3 text-sm outline-none transition focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
          </label>

          <div class="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
            <p class="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">สถานะรหัสผ่าน</p>
            <p id="profilePasswordHint" class="mt-1 text-sm font-semibold text-slate-700">กรอกรหัสผ่านเดิม รหัสใหม่ และยืนยันให้ตรงกัน</p>
          </div>

          <div class="grid gap-2 sm:grid-cols-2">
            <button type="submit" id="btn-change-password" disabled class="profile-pressable inline-flex items-center justify-center rounded-[1.25rem] bg-sky-600 px-4 py-3 text-sm font-black text-white opacity-60">
              ยืนยันเปลี่ยนรหัสผ่าน
            </button>
            <a data-link href="/profile" class="profile-pressable inline-flex items-center justify-center rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">กลับหน้าโปรไฟล์</a>
          </div>
        </form>
      </main>
    </section>
  `;
}

export function mountProfileChangePasswordView(container) {
  ensureNativeStyles_();

  const form = container.querySelector("#profileChangePasswordForm");
  if (!form) return;

  const errorBox = form.querySelector("#profileChangePasswordError");
  const hintBox = form.querySelector("#profilePasswordHint");
  const submitBtn = form.querySelector("#btn-change-password");

  function clearError() {
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.classList.add("hidden");
  }

  function showError(message) {
    if (!errorBox) return;
    errorBox.textContent = String(message || "เกิดข้อผิดพลาด");
    errorBox.classList.remove("hidden");
  }

  function updateHint() {
    const oldPassword = String(form.elements.oldPassword.value || "");
    const newPassword = String(form.elements.newPassword.value || "");
    const confirmPassword = String(form.elements.confirmPassword.value || "");
    const valid = oldPassword.length > 0 && newPassword.length >= 8 && confirmPassword.length >= 8 && newPassword === confirmPassword;
    if (hintBox) {
      if (!oldPassword || !newPassword || !confirmPassword) {
        hintBox.textContent = "กรอกรหัสผ่านเดิม รหัสใหม่ และยืนยันให้ตรงกัน";
      } else if (newPassword !== confirmPassword) {
        hintBox.textContent = "รหัสผ่านใหม่และการยืนยันยังไม่ตรงกัน";
      } else if (newPassword.length < 8) {
        hintBox.textContent = "รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร";
      } else {
        hintBox.textContent = "พร้อมเปลี่ยนรหัสผ่าน";
      }
      hintBox.className = `mt-1 text-sm font-semibold ${valid ? "text-emerald-700" : "text-slate-700"}`;
    }
    if (submitBtn) {
      submitBtn.disabled = !valid;
      submitBtn.classList.toggle("opacity-60", !valid);
      submitBtn.classList.toggle("cursor-not-allowed", !valid);
    }
    return valid;
  }

  form.addEventListener("input", () => {
    clearError();
    updateHint();
  });

  updateHint();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();
    if (!updateHint()) {
      showToast("กรุณากรอกรหัสผ่านให้ถูกต้อง");
      return;
    }

    const oldPassword = String(form.elements.oldPassword.value || "");
    const newPassword = String(form.elements.newPassword.value || "");
    const confirmPassword = String(form.elements.confirmPassword.value || "");

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add("opacity-60", "cursor-not-allowed");
    }

    try {
      const res = await apiProfileChangePassword({ oldPassword, newPassword, confirmPassword });
      if (!res?.ok) throw new Error(res?.error || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
      console.log(`${LOG_PREFIX} password changed -> revalidate profile`);
      await revalidateMemberResource(MEMBER_SYNC_KEYS.profile, { force: true });
      showToast("เปลี่ยนรหัสผ่านสำเร็จ ระบบจะออกจากระบบอัตโนมัติ");
      window.setTimeout(() => clearSessionAndRedirectSignin(), 600);
    } catch (err) {
      const message = String(err?.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
      showToast(message);
      showError(message);
    } finally {
      const valid = updateHint();
      if (submitBtn) {
        submitBtn.disabled = !valid;
        submitBtn.classList.toggle("opacity-60", !valid);
        submitBtn.classList.toggle("cursor-not-allowed", !valid);
      }
    }
  });

  window.lucide?.createIcons?.();
}
