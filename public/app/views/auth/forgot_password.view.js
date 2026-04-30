import { showToast } from "../../components/toast.js";
import {
  apiPasswordResetConfirm,
  apiPasswordResetRequestOtp,
  apiPasswordResetVerifyOtp,
} from "../../data/api.js";

function navigateSpa(pathname) {
  window.history.pushState({}, "", pathname);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function ensureStyles() {
  if (document.getElementById("forgotPasswordViewStyle")) return;
  const style = document.createElement("style");
  style.id = "forgotPasswordViewStyle";
  style.textContent = `
    .fp-step-dot { width: 2rem; height: 2rem; border-radius: 999px; border: 1px solid #cbd5e1; display: inline-flex; align-items: center; justify-content: center; font-size: .72rem; font-weight: 800; color: #64748b; background: #fff; }
    .fp-step-dot.is-active { border-color: #38bdf8; background: #e0f2fe; color: #0369a1; }
    .fp-step-dot.is-done { border-color: #34d399; background: #d1fae5; color: #047857; }
    .fp-step-line { height: 2px; border-radius: 999px; background: #e2e8f0; }
    .fp-step-line.is-done { background: #86efac; }
  `;
  document.head.appendChild(style);
}

export function renderForgotPasswordView() {
  ensureStyles();
  return `
    <section class="auth-view view min-h-dvh flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div class="auth-shell relative w-full max-w-[780px] overflow-hidden rounded-[2rem] bg-white/70 p-6 sm:p-8 lg:p-10">
        <div class="mb-6 flex items-center justify-between gap-2">
          <div>
            <p class="text-[11px] font-black uppercase tracking-[0.16em] text-sky-600">Account Recovery</p>
            <h1 class="mt-1 text-2xl font-black text-slate-900">ลืมรหัสผ่าน</h1>
          </div>
          <a href="/signin" data-link class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">กลับหน้าเข้าสู่ระบบ</a>
        </div>

        <div class="mb-6 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2">
          <div class="flex flex-col items-center gap-1"><span id="fpDot1" class="fp-step-dot is-active">1</span><span class="text-[10px] font-black text-slate-600">อีเมล</span></div>
          <span id="fpLine1" class="fp-step-line"></span>
          <div class="flex flex-col items-center gap-1"><span id="fpDot2" class="fp-step-dot">2</span><span class="text-[10px] font-black text-slate-600">OTP</span></div>
          <span id="fpLine2" class="fp-step-line"></span>
          <div class="flex flex-col items-center gap-1"><span id="fpDot3" class="fp-step-dot">3</span><span class="text-[10px] font-black text-slate-600">รหัสใหม่</span></div>
        </div>

        <p id="fpHint" class="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">กรอกอีเมลที่ใช้สมัครสมาชิก</p>

        <form id="fpStep1Form" class="space-y-3">
          <input id="fpEmail" type="email" placeholder="example@email.com" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
          <button id="fpStep1Btn" type="submit" class="w-full rounded-xl bg-sky-600 px-4 py-3 text-sm font-black text-white hover:bg-sky-700">ส่งรหัส OTP</button>
        </form>

        <form id="fpStep2Form" class="hidden space-y-3">
          <input id="fpOtp" inputmode="numeric" maxlength="6" placeholder="000000" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-2xl font-black tracking-[0.32em] text-slate-800 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
          <button id="fpStep2Btn" type="submit" class="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700">ยืนยัน OTP</button>
          <button id="fpResendBtn" type="button" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50">ส่ง OTP ใหม่</button>
        </form>

        <form id="fpStep3Form" class="hidden space-y-3">
          <div class="relative">
            <input id="fpNewPassword" type="password" minlength="8" placeholder="รหัสผ่านใหม่ (อย่างน้อย 8 ตัว)" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
            <button id="fpToggleNewPassword" type="button" class="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700" aria-label="แสดงหรือซ่อนรหัสผ่านใหม่">
              <i data-lucide="eye" class="h-4 w-4"></i>
            </button>
          </div>
          <div class="relative">
            <input id="fpConfirmPassword" type="password" minlength="8" placeholder="ยืนยันรหัสผ่านใหม่" class="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 pr-12 text-sm outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
            <button id="fpToggleConfirmPassword" type="button" class="absolute inset-y-0 right-0 px-3 text-slate-500 hover:text-slate-700" aria-label="แสดงหรือซ่อนยืนยันรหัสผ่าน">
              <i data-lucide="eye" class="h-4 w-4"></i>
            </button>
          </div>
          <p class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600">ต้องมีอย่างน้อย 8 ตัว, อักษรพิมพ์ใหญ่, อักษรพิมพ์เล็ก, ตัวเลข และอักขระพิเศษ</p>
          <button id="fpStep3Btn" type="submit" class="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-black text-white hover:bg-blue-700">ยืนยันเปลี่ยนรหัสผ่าน</button>
        </form>
      </div>
    </section>
  `;
}

export function mountForgotPasswordView(root) {
  if (!root) return;
  const dot1 = root.querySelector("#fpDot1");
  const dot2 = root.querySelector("#fpDot2");
  const dot3 = root.querySelector("#fpDot3");
  const line1 = root.querySelector("#fpLine1");
  const line2 = root.querySelector("#fpLine2");
  const hint = root.querySelector("#fpHint");
  const form1 = root.querySelector("#fpStep1Form");
  const form2 = root.querySelector("#fpStep2Form");
  const form3 = root.querySelector("#fpStep3Form");
  const emailInput = root.querySelector("#fpEmail");
  const otpInput = root.querySelector("#fpOtp");
  const newPasswordInput = root.querySelector("#fpNewPassword");
  const confirmPasswordInput = root.querySelector("#fpConfirmPassword");
  const toggleNewPasswordBtn = root.querySelector("#fpToggleNewPassword");
  const toggleConfirmPasswordBtn = root.querySelector("#fpToggleConfirmPassword");
  const step1Btn = root.querySelector("#fpStep1Btn");
  const step2Btn = root.querySelector("#fpStep2Btn");
  const step3Btn = root.querySelector("#fpStep3Btn");
  const resendBtn = root.querySelector("#fpResendBtn");
  if (!dot1 || !dot2 || !dot3 || !line1 || !line2 || !hint || !form1 || !form2 || !form3 || !emailInput || !otpInput || !newPasswordInput || !confirmPasswordInput || !toggleNewPasswordBtn || !toggleConfirmPasswordBtn || !step1Btn || !step2Btn || !step3Btn || !resendBtn) return;

  let step = 1;
  let submitting = false;
  let state = { email: "", uid: "", resetToken: "", cooldownUntil: 0, otpExpireAt: 0 };
  let ticker = 0;

  const bindTogglePassword = (button, input) => {
    button.addEventListener("click", () => {
      const nextType = input.type === "password" ? "text" : "password";
      input.type = nextType;
      button.innerHTML = nextType === "password"
        ? '<i data-lucide="eye" class="h-4 w-4"></i>'
        : '<i data-lucide="eye-off" class="h-4 w-4"></i>';
      window.lucide?.createIcons?.();
    });
  };
  bindTogglePassword(toggleNewPasswordBtn, newPasswordInput);
  bindTogglePassword(toggleConfirmPasswordBtn, confirmPasswordInput);

  const setStep = (nextStep) => {
    step = nextStep;
    form1.classList.toggle("hidden", step !== 1);
    form2.classList.toggle("hidden", step !== 2);
    form3.classList.toggle("hidden", step !== 3);
    dot1.className = `fp-step-dot ${step > 1 ? "is-done" : "is-active"}`;
    dot2.className = `fp-step-dot ${step > 2 ? "is-done" : step === 2 ? "is-active" : ""}`;
    dot3.className = `fp-step-dot ${step === 3 ? "is-active" : ""}`;
    line1.className = `fp-step-line ${step >= 2 ? "is-done" : ""}`;
    line2.className = `fp-step-line ${step >= 3 ? "is-done" : ""}`;
  };

  const renderCooldown = () => {
    if (step !== 2) return;
    const leftMs = Math.max(0, state.cooldownUntil - Date.now());
    const leftSec = Math.ceil(leftMs / 1000);
    const otpMs = Math.max(0, state.otpExpireAt - Date.now());
    const otpSec = Math.ceil(otpMs / 1000);
    const cooldownActive = leftSec > 0;
    step2Btn.disabled = submitting || otpSec <= 0;
    resendBtn.disabled = submitting || cooldownActive;
    resendBtn.textContent = cooldownActive ? `ส่งใหม่ได้ใน ${leftSec}s` : "ส่ง OTP ใหม่";
    if (otpSec > 0) {
      hint.textContent = `OTP จะหมดอายุใน ${Math.floor(otpSec / 60)}:${String(otpSec % 60).padStart(2, "0")}`;
      hint.className = "mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600";
    } else {
      hint.textContent = "OTP หมดอายุแล้ว กรุณาส่งใหม่";
      hint.className = "mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700";
    }
  };

  const startTicker = () => {
    if (ticker) clearInterval(ticker);
    ticker = window.setInterval(renderCooldown, 1000);
  };

  form1.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    const email = String(emailInput.value || "").trim().toLowerCase();
    if (!email) {
      showToast("กรุณากรอกอีเมล");
      return;
    }
    submitting = true;
    step1Btn.textContent = "กำลังส่ง...";
    step1Btn.disabled = true;
    try {
      const res = await apiPasswordResetRequestOtp(email);
      if (!res?.ok) throw new Error(res?.error || "ส่ง OTP ไม่สำเร็จ");
      state.email = email;
      state.cooldownUntil = Date.now() + Number(res.data?.cooldownSec || 60) * 1000;
      state.otpExpireAt = Date.now() + Number(res.data?.ttlSec || 600) * 1000;
      setStep(2);
      hint.textContent = "ส่ง OTP แล้ว กรุณาตรวจอีเมลและกรอกรหัส 6 หลัก";
      hint.className = "mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700";
      showToast("หากอีเมลอยู่ในระบบ จะได้รับ OTP");
      otpInput.focus();
      renderCooldown();
      startTicker();
    } catch (err) {
      showToast(String(err?.message || "ส่ง OTP ไม่สำเร็จ"));
    } finally {
      submitting = false;
      step1Btn.textContent = "ส่งรหัส OTP";
      step1Btn.disabled = false;
    }
  });

  otpInput.addEventListener("input", () => {
    otpInput.value = String(otpInput.value || "").replace(/\D/g, "").slice(0, 6);
  });

  form2.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    const otp = String(otpInput.value || "").replace(/\D/g, "");
    if (otp.length !== 6) {
      showToast("กรุณากรอก OTP 6 หลัก");
      return;
    }
    submitting = true;
    step2Btn.textContent = "กำลังยืนยัน...";
    step2Btn.disabled = true;
    try {
      const res = await apiPasswordResetVerifyOtp(state.email, otp);
      if (!res?.ok) throw new Error(res?.error || "OTP ไม่ถูกต้อง");
      state.uid = String(res.data?.uid || "");
      state.resetToken = String(res.data?.resetToken || "");
      setStep(3);
      hint.textContent = "ตั้งรหัสผ่านใหม่ได้เลย";
      hint.className = "mb-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600";
      showToast("ยืนยัน OTP สำเร็จ");
      newPasswordInput.focus();
    } catch (err) {
      showToast(String(err?.message || "ยืนยัน OTP ไม่สำเร็จ"));
      renderCooldown();
    } finally {
      submitting = false;
      step2Btn.textContent = "ยืนยัน OTP";
      renderCooldown();
    }
  });

  resendBtn.addEventListener("click", () => {
    if (submitting || Date.now() < state.cooldownUntil) return;
    form1.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
  });

  form3.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submitting) return;
    const newPassword = String(newPasswordInput.value || "");
    const confirmPassword = String(confirmPasswordInput.value || "");
    if (!newPassword || !confirmPassword) {
      showToast("กรุณากรอกรหัสผ่านให้ครบ");
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword) || newPassword.length < 8) {
      showToast("รหัสผ่านต้องมี 8 ตัวขึ้นไป และมีพิมพ์ใหญ่ พิมพ์เล็ก ตัวเลข และอักขระพิเศษ");
      return;
    }
    submitting = true;
    step3Btn.textContent = "กำลังบันทึก...";
    step3Btn.disabled = true;
    try {
      const res = await apiPasswordResetConfirm({
        uid: state.uid,
        resetToken: state.resetToken,
        newPassword,
        confirmPassword,
      });
      if (!res?.ok) throw new Error(res?.error || "รีเซ็ตรหัสผ่านไม่สำเร็จ");
      showToast("รีเซ็ตรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่");
      window.setTimeout(() => navigateSpa("/signin"), 400);
    } catch (err) {
      showToast(String(err?.message || "รีเซ็ตรหัสผ่านไม่สำเร็จ"));
    } finally {
      submitting = false;
      step3Btn.textContent = "ยืนยันเปลี่ยนรหัสผ่าน";
      step3Btn.disabled = false;
    }
  });

  renderCooldown();
  setStep(1);
  window.lucide?.createIcons?.();
}
