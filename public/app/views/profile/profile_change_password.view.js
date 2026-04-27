import { showToast } from "../../components/toast.js";
import { apiProfileChangePassword } from "../../data/api.js";

function clearSessionAndRedirectSignin() {
  window.localStorage.removeItem("smartlib.auth");
  window.sessionStorage.removeItem("smartlib.auth");
  window.history.replaceState({}, "", "/signin");
  window.dispatchEvent(new PopStateEvent("popstate"));
}

export function renderProfileChangePasswordView() {
  return `
    <section class="view mx-auto w-full max-w-3xl px-4 py-8">
      <div class="mb-4 flex items-center justify-between">
        <h1 class="text-2xl font-black text-slate-800">เปลี่ยนรหัสผ่าน</h1>
        <a data-link href="/profile" class="text-sm font-bold text-sky-700 hover:text-sky-800">กลับหน้าโปรไฟล์</a>
      </div>
      <form id="profileChangePasswordForm" class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <label class="block space-y-1 text-xs font-bold text-slate-600">
          <span>รหัสผ่านเดิม</span>
          <input name="oldPassword" type="password" required autocomplete="current-password" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <label class="block space-y-1 text-xs font-bold text-slate-600">
          <span>รหัสผ่านใหม่ (ขั้นต่ำ 8 ตัวอักษร)</span>
          <input name="newPassword" type="password" minlength="8" required autocomplete="new-password" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <label class="block space-y-1 text-xs font-bold text-slate-600">
          <span>ยืนยันรหัสผ่านใหม่</span>
          <input name="confirmPassword" type="password" minlength="8" required autocomplete="new-password" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </label>
        <button type="submit" class="rounded-xl bg-sky-600 px-4 py-2 text-sm font-black text-white hover:bg-sky-700">ยืนยันเปลี่ยนรหัสผ่าน</button>
      </form>
    </section>
  `;
}

export function mountProfileChangePasswordView(container) {
  const form = container.querySelector("#profileChangePasswordForm");
  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const oldPassword = String(form.elements.oldPassword.value || "");
    const newPassword = String(form.elements.newPassword.value || "");
    const confirmPassword = String(form.elements.confirmPassword.value || "");

    try {
      const res = await apiProfileChangePassword({ oldPassword, newPassword, confirmPassword });
      if (!res?.ok) throw new Error(res?.error || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
      showToast("เปลี่ยนรหัสผ่านสำเร็จ ระบบจะออกจากระบบอัตโนมัติ");
      window.setTimeout(() => clearSessionAndRedirectSignin(), 600);
    } catch (err) {
      showToast(err?.message || "เปลี่ยนรหัสผ่านไม่สำเร็จ");
    }
  });
}
