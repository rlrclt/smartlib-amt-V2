import { escapeHtml } from "../../utils/html.js";
import { showToast } from "../../components/toast.js";
import { apiRequestEmailChangeOtp, apiVerifyEmailChangeOtp } from "../../data/api.js";

const OTP_COOLDOWN_KEY = "smartlib.email_change.cooldown_until";
const OTP_EXPIRES_KEY = "smartlib.email_change.expires_until";

function ensureNativeStyles_() {
  if (document.getElementById("profileChangeEmailNativeStyle")) return;
  const style = document.createElement("style");
  style.id = "profileChangeEmailNativeStyle";
  style.textContent = `
    #profileChangeEmailRoot { overflow-x: hidden; container-type: inline-size; }
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
    .profile-pressable:active { transform: scale(0.98); opacity: 0.86; }
    .profile-top-row { display: flex; flex-direction: column; gap: 1rem; }
    .profile-stepper { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; gap: .5rem; align-items: center; }
    .profile-step-dot {
      width: 2rem;
      height: 2rem;
      border-radius: 999px;
      border: 1px solid #cbd5e1;
      background: #fff;
      color: #64748b;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: .72rem;
      font-weight: 800;
    }
    .profile-step-dot.is-active { border-color: #38bdf8; background: #e0f2fe; color: #0369a1; }
    .profile-step-dot.is-done { border-color: #34d399; background: #d1fae5; color: #047857; }
    .profile-step-line { height: 2px; background: #e2e8f0; border-radius: 999px; }
    .profile-step-line.is-done { background: #86efac; }
    @container (min-width: 768px) {
      .profile-top-row { flex-direction: row; align-items: center; justify-content: space-between; }
    }
  `;
  document.head.appendChild(style);
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

export function renderProfileChangeEmailView() {
  ensureNativeStyles_();
  const auth = readAuthSession();
  const user = auth?.user || {};
  const currentEmail = String(user.email || "").trim();

  return `
    <section id="profileChangeEmailRoot" class="member-page-container view w-full max-w-[1280px] space-y-4">
      <article class="profile-surface rounded-[1.5rem] px-4 py-4 sm:px-5 sm:py-4">
        <div class="profile-top-row">
          <div class="flex min-w-0 items-center gap-3">
            <a data-link href="/profile/edit" class="profile-pressable inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" aria-label="กลับหน้าแก้ไขโปรไฟล์">
              <i data-lucide="arrow-left" class="h-5 w-5"></i>
            </a>
            <div class="min-w-0">
              <p class="text-[10px] font-black uppercase tracking-[0.18em] text-sky-600">Email Settings</p>
              <h1 class="text-base font-black text-slate-800 sm:text-lg">เปลี่ยนอีเมลเข้าสู่ระบบ</h1>
              <p class="mt-1 text-xs font-semibold text-slate-500">หน้านี้แยกเพื่อรองรับ flow ยืนยันอีเมลด้วย PIN 6 หลัก</p>
            </div>
          </div>
          <a data-link href="/profile/change-password" class="profile-pressable inline-flex items-center justify-center gap-2 rounded-[1.1rem] border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">
            <i data-lucide="key-round" class="h-4 w-4"></i>
            เปลี่ยนรหัสผ่าน
          </a>
        </div>
      </article>

      <section class="profile-surface rounded-[1.75rem] p-5 space-y-4">
        <div class="profile-stepper">
          <div class="flex flex-col items-center gap-1">
            <span id="profileStepDot1" class="profile-step-dot is-active">1</span>
            <span class="text-[10px] font-black text-slate-600">อีเมล</span>
          </div>
          <div id="profileStepLine1" class="profile-step-line"></div>
          <div class="flex flex-col items-center gap-1">
            <span id="profileStepDot2" class="profile-step-dot">2</span>
            <span class="text-[10px] font-black text-slate-600">OTP</span>
          </div>
          <div id="profileStepLine2" class="profile-step-line"></div>
          <div class="flex flex-col items-center gap-1">
            <span id="profileStepDot3" class="profile-step-dot">3</span>
            <span class="text-[10px] font-black text-slate-600">เสร็จสิ้น</span>
          </div>
        </div>

        <div class="rounded-[1.1rem] border border-slate-200 bg-white p-4">
          <p class="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">อีเมลปัจจุบัน</p>
          <p class="mt-1 text-sm font-semibold text-slate-900">${escapeHtml(currentEmail || "-")}</p>
        </div>

        <div class="rounded-[1.25rem] border border-amber-200 bg-amber-50 p-4">
          <p class="text-[11px] font-black uppercase tracking-[0.14em] text-amber-700">ความปลอดภัย</p>
          <p class="mt-1 text-sm font-semibold text-amber-800">ส่งรหัส OTP 6 หลักไปยังอีเมลใหม่ และยืนยันภายใน 10 นาที</p>
        </div>

        <form id="profileChangeEmailForm" class="space-y-3">
          <label class="block space-y-1 text-xs font-bold text-slate-600">
            <span>อีเมลใหม่</span>
            <input name="newEmail" type="email" placeholder="example@email.com" class="w-full rounded-[1.1rem] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
          </label>
          <button id="profileEmailRequestBtn" type="submit" class="profile-pressable inline-flex w-full items-center justify-center rounded-[1.25rem] bg-sky-600 px-4 py-3 text-sm font-black text-white hover:bg-sky-700">
            ส่งรหัสยืนยัน
          </button>
        </form>

        <form id="profileVerifyEmailForm" class="hidden space-y-3">
          <label class="block space-y-1 text-xs font-bold text-slate-600">
            <span>รหัส OTP 6 หลัก</span>
            <input name="pin" inputmode="numeric" maxlength="6" placeholder="000000" class="w-full rounded-[1.1rem] border border-slate-200 bg-white px-3 py-3 text-center text-xl font-black tracking-[0.32em] text-slate-800 outline-none focus:border-sky-300 focus:ring-4 focus:ring-sky-100" />
          </label>
          <button id="profileEmailVerifyBtn" type="submit" class="profile-pressable inline-flex w-full items-center justify-center rounded-[1.25rem] bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700">
            ยืนยันรหัสและอัปเดตอีเมล
          </button>
          <button id="profileEmailResendBtn" type="button" class="profile-pressable inline-flex w-full items-center justify-center rounded-[1rem] border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50">
            ส่งรหัสใหม่
          </button>
        </form>
        <div id="profileEmailDone" class="hidden rounded-[1rem] border border-emerald-200 bg-emerald-50 p-3">
          <p class="text-xs font-black text-emerald-700">เปลี่ยนอีเมลสำเร็จ</p>
          <p class="mt-1 text-xs font-semibold text-emerald-800">แนะนำให้ออกจากระบบและเข้าสู่ระบบใหม่เพื่อ sync session</p>
        </div>
        <p id="profileEmailHint" class="text-xs font-semibold text-slate-500">ยังไม่ได้ขอรหัส OTP</p>
      </section>
    </section>
  `;
}

export function mountProfileChangeEmailView(container) {
  const requestForm = container.querySelector("#profileChangeEmailForm");
  const verifyForm = container.querySelector("#profileVerifyEmailForm");
  const requestBtn = container.querySelector("#profileEmailRequestBtn");
  const verifyBtn = container.querySelector("#profileEmailVerifyBtn");
  const resendBtn = container.querySelector("#profileEmailResendBtn");
  const doneBox = container.querySelector("#profileEmailDone");
  const hintEl = container.querySelector("#profileEmailHint");
  const emailInput = requestForm?.querySelector("input[name='newEmail']");
  const pinInput = verifyForm?.querySelector("input[name='pin']");
  const stepDot1 = container.querySelector("#profileStepDot1");
  const stepDot2 = container.querySelector("#profileStepDot2");
  const stepDot3 = container.querySelector("#profileStepDot3");
  const stepLine1 = container.querySelector("#profileStepLine1");
  const stepLine2 = container.querySelector("#profileStepLine2");
  if (!requestForm || !verifyForm || !requestBtn || !verifyBtn || !resendBtn || !emailInput || !pinInput || !hintEl || !doneBox || !stepDot1 || !stepDot2 || !stepDot3 || !stepLine1 || !stepLine2) return;

  let submittingRequest = false;
  let submittingVerify = false;
  let cooldownTimer = 0;
  let step = 1;

  const renderStep = () => {
    requestForm.classList.toggle("hidden", step !== 1);
    verifyForm.classList.toggle("hidden", step !== 2);
    doneBox.classList.toggle("hidden", step !== 3);
    stepDot1.className = `profile-step-dot ${step >= 1 ? (step > 1 ? "is-done" : "is-active") : ""}`;
    stepDot2.className = `profile-step-dot ${step >= 2 ? (step > 2 ? "is-done" : "is-active") : ""}`;
    stepDot3.className = `profile-step-dot ${step >= 3 ? "is-active" : ""}`;
    stepLine1.className = `profile-step-line ${step >= 2 ? "is-done" : ""}`;
    stepLine2.className = `profile-step-line ${step >= 3 ? "is-done" : ""}`;
  };

  const getCooldownUntil = () => Number(window.localStorage.getItem(OTP_COOLDOWN_KEY) || 0);
  const setCooldownUntil = (ms) => window.localStorage.setItem(OTP_COOLDOWN_KEY, String(ms));
  const getOtpExpiresUntil = () => Number(window.localStorage.getItem(OTP_EXPIRES_KEY) || 0);
  const setOtpExpiresUntil = (ms) => window.localStorage.setItem(OTP_EXPIRES_KEY, String(ms));

  const formatRemainTime = (ms) => {
    const sec = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const renderCooldown = () => {
    const leftMs = Math.max(0, getCooldownUntil() - Date.now());
    const leftSec = Math.ceil(leftMs / 1000);
    const cooldownActive = leftSec > 0;
    const ttlMs = Math.max(0, getOtpExpiresUntil() - Date.now());
    const ttlActive = ttlMs > 0;
    requestBtn.disabled = cooldownActive || submittingRequest;
    resendBtn.disabled = cooldownActive || submittingRequest;
    const otpExpired = !ttlActive && getOtpExpiresUntil() > 0;
    verifyBtn.disabled = submittingVerify || otpExpired;
    requestBtn.classList.toggle("opacity-60", requestBtn.disabled);
    requestBtn.classList.toggle("pointer-events-none", requestBtn.disabled);
    resendBtn.classList.toggle("opacity-60", resendBtn.disabled);
    resendBtn.classList.toggle("pointer-events-none", resendBtn.disabled);
    verifyBtn.classList.toggle("opacity-60", verifyBtn.disabled);
    verifyBtn.classList.toggle("pointer-events-none", verifyBtn.disabled);
    requestBtn.textContent = cooldownActive ? `ส่งใหม่ได้ใน ${leftSec} วินาที` : (submittingRequest ? "กำลังส่งรหัส..." : "ส่งรหัสยืนยัน");
    resendBtn.textContent = cooldownActive ? `ส่งใหม่ได้ใน ${leftSec} วินาที` : (submittingRequest ? "กำลังส่งรหัส..." : "ส่งรหัสใหม่");
    verifyBtn.textContent = submittingVerify
      ? "กำลังยืนยัน..."
      : (otpExpired ? "OTP หมดอายุ กรุณาส่งรหัสใหม่" : "ยืนยันรหัสและอัปเดตอีเมล");
    if (cooldownActive) {
      const ttlText = ttlActive ? ` · OTP หมดอายุใน ${formatRemainTime(ttlMs)}` : "";
      hintEl.textContent = `ส่งรหัสแล้ว กรุณาตรวจอีเมลใหม่ (${leftSec}s)${ttlText}`;
      hintEl.className = "text-xs font-semibold text-sky-600";
      return;
    }
    if (ttlActive) {
      hintEl.textContent = `OTP ยังใช้งานได้อีก ${formatRemainTime(ttlMs)}`;
      hintEl.className = "text-xs font-semibold text-slate-600";
      return;
    }
    if (otpExpired) {
      hintEl.textContent = "OTP หมดอายุแล้ว กรุณากดส่งรหัสใหม่";
      hintEl.className = "text-xs font-semibold text-rose-600";
    }
  };

  const startCooldownTicker = () => {
    if (cooldownTimer) clearInterval(cooldownTimer);
    renderCooldown();
    cooldownTimer = window.setInterval(renderCooldown, 1000);
  };

  startCooldownTicker();
  renderStep();

  requestForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submittingRequest) return;
    const newEmail = String(emailInput.value || "").trim().toLowerCase();
    if (!newEmail) {
      showToast("กรุณากรอกอีเมลใหม่");
      return;
    }
    submittingRequest = true;
    renderCooldown();
    try {
      const res = await apiRequestEmailChangeOtp(newEmail);
      if (!res?.ok) throw new Error(res?.error || "ส่งรหัสไม่สำเร็จ");
      const cool = Number(res.data?.cooldownSec || 60);
      const ttl = Number(res.data?.ttlSec || 600);
      setCooldownUntil(Date.now() + (cool * 1000));
      setOtpExpiresUntil(Date.now() + (ttl * 1000));
      renderCooldown();
      hintEl.textContent = "ส่งรหัส OTP ไปยังอีเมลใหม่แล้ว กรุณาตรวจกล่องจดหมาย";
      hintEl.className = "text-xs font-semibold text-emerald-600";
      showToast(res.data?.message || "ส่งรหัสยืนยันแล้ว");
      step = 2;
      renderStep();
      pinInput.focus();
    } catch (err) {
      console.error("[ProfileEmail] request OTP failed", err);
      showToast(err?.message || "ส่งรหัสไม่สำเร็จ");
    } finally {
      submittingRequest = false;
      renderCooldown();
    }
  });

  resendBtn.addEventListener("click", async () => {
    if (submittingRequest || resendBtn.disabled) return;
    requestForm.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
  });

  pinInput.addEventListener("input", () => {
    pinInput.value = String(pinInput.value || "").replace(/\D/g, "").slice(0, 6);
  });

  verifyForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (submittingVerify) return;
    const pin = String(pinInput.value || "").replace(/\D/g, "");
    if (pin.length !== 6) {
      showToast("กรุณากรอกรหัส OTP 6 หลัก");
      return;
    }
    submittingVerify = true;
    renderCooldown();
    try {
      const res = await apiVerifyEmailChangeOtp(pin);
      if (!res?.ok) throw new Error(res?.error || "ยืนยันไม่สำเร็จ");

      const localRaw = window.localStorage.getItem("smartlib.auth");
      const sessRaw = window.sessionStorage.getItem("smartlib.auth");
      const raw = localRaw || sessRaw;
      if (raw) {
        try {
          const auth = JSON.parse(raw);
          if (auth && auth.user) {
            auth.user.email = String(res.data?.email || auth.user.email || "").trim();
            const payload = JSON.stringify(auth);
            if (localRaw) window.localStorage.setItem("smartlib.auth", payload);
            if (sessRaw) window.sessionStorage.setItem("smartlib.auth", payload);
          }
        } catch (e) {}
      }

      hintEl.textContent = "อัปเดตอีเมลสำเร็จ แนะนำให้เข้าสู่ระบบใหม่เพื่อซิงก์ข้อมูลล่าสุด";
      hintEl.className = "text-xs font-semibold text-emerald-600";
      showToast(res.data?.message || "อัปเดตอีเมลสำเร็จ");
      pinInput.value = "";
      emailInput.value = "";
      step = 3;
      renderStep();
      window.localStorage.removeItem(OTP_EXPIRES_KEY);
      window.localStorage.removeItem(OTP_COOLDOWN_KEY);
      window.setTimeout(() => {
        const refresh = new PopStateEvent("popstate");
        window.dispatchEvent(refresh);
      }, 300);
    } catch (err) {
      console.error("[ProfileEmail] verify OTP failed", err);
      hintEl.textContent = err?.message || "ยืนยันรหัสไม่สำเร็จ";
      hintEl.className = "text-xs font-semibold text-rose-600";
      showToast(err?.message || "ยืนยันรหัสไม่สำเร็จ");
    } finally {
      submittingVerify = false;
      renderCooldown();
    }
  });
}
