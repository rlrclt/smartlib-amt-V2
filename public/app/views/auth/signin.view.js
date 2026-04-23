import { showToast } from "../../components/toast.js";
import { apiSignin } from "../../data/api.js";

function navigateSpa(pathname) {
  window.history.pushState({}, "", pathname);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function resolvePostLoginPath(data) {
  const groupType = String(data?.user?.groupType || "").toLowerCase();
  if (groupType === "manage") return "/manage";
  if (groupType === "member") return "/app";
  return "/";
}

function setButtonLoading(button, loading) {
  if (!button) return;
  button.disabled = loading;
  button.innerHTML = loading
    ? '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i><span>กำลังเข้าสู่ระบบ...</span>'
    : '<span>เข้าสู่ระบบ</span>';
  window.lucide?.createIcons?.();
}

export function renderSigninView() {
  return `
    <section class="auth-view view min-h-dvh flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div class="auth-blob auth-blob-a"></div>
      <div class="auth-blob auth-blob-b"></div>

      <div class="auth-shell relative w-full max-w-[1000px] overflow-hidden rounded-[2rem] md:rounded-[2.5rem] flex flex-col md:flex-row">
        <aside class="hidden md:flex w-full md:w-[45%] lg:w-1/2 bg-gradient-to-br from-sky-500 to-blue-600 p-8 lg:p-12 text-white flex-col justify-between relative overflow-hidden">
          <div class="auth-dot-grid"></div>

          <div class="relative z-10">
            <a href="/" data-link class="inline-flex items-center gap-2 mb-6 lg:mb-8">
              <span class="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
                <img src="/favicon.svg" alt="ANT Library" class="w-6 h-6" />
              </span>
              <span class="text-xl lg:text-2xl font-black tracking-tight">ANT LIBRARY</span>
            </a>
            <h1 class="text-3xl lg:text-4xl font-bold leading-tight mb-4">ยินดีต้อนรับกลับมา</h1>
            <p class="text-sky-100 font-medium text-sm lg:text-base">เข้าสู่ระบบเพื่อค้นหา ยืม และจัดการหนังสือในระบบห้องสมุด</p>
          </div>

          <div class="relative z-10 flex justify-center items-center py-6 lg:py-10">
            <canvas id="wisePuffCanvas" width="220" height="220" class="auth-mascot drop-shadow-2xl"></canvas>
          </div>

          <p class="relative z-10 text-xs lg:text-sm text-sky-100/80 italic">"ความรู้คือการผจญภัยที่ไม่มีวันสิ้นสุด"</p>
        </aside>

        <div class="w-full md:w-[55%] lg:w-1/2 p-6 sm:p-10 lg:p-14 bg-white/50 flex flex-col justify-center">
          <div class="md:hidden flex items-center justify-center gap-2 mb-8">
            <span class="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-md border border-sky-100">
              <img src="/favicon.svg" alt="ANT Library" class="w-5 h-5" />
            </span>
            <span class="text-lg font-black tracking-tight text-blue-600">ANT LIBRARY</span>
          </div>

          <div class="mb-8 text-center md:text-left">
            <h2 class="text-2xl lg:text-3xl font-black text-slate-800 mb-2">เข้าสู่ระบบ</h2>
            <p class="text-sm lg:text-base text-slate-500 font-medium">ระบุอีเมลและรหัสผ่านของคุณ</p>
          </div>

          <form id="signinForm" class="space-y-5 lg:space-y-6" novalidate>
            <div>
              <label for="signinEmail" class="block text-sm font-bold text-slate-700 mb-2 ml-1">อีเมล</label>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <i data-lucide="mail" class="w-5 h-5"></i>
                </div>
                <input id="signinEmail" name="email" type="email" autocomplete="email" required placeholder="example@email.com" class="auth-input w-full bg-white/80 border border-slate-200 rounded-xl lg:rounded-2xl py-3 lg:py-4 pl-12 pr-4 outline-none text-slate-800 font-medium text-sm lg:text-base">
              </div>
            </div>

            <div>
              <div class="flex justify-between items-center mb-2 ml-1">
                <label for="signinPassword" class="text-sm font-bold text-slate-700">รหัสผ่าน</label>
                <button type="button" id="forgotPasswordBtn" class="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">ลืมรหัสผ่าน?</button>
              </div>
              <div class="relative group">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <i data-lucide="lock" class="w-5 h-5"></i>
                </div>
                <input id="signinPassword" name="password" type="password" autocomplete="current-password" required placeholder="••••••••" class="auth-input w-full bg-white/80 border border-slate-200 rounded-xl lg:rounded-2xl py-3 lg:py-4 pl-12 pr-12 outline-none text-slate-800 font-medium text-sm lg:text-base">
                <button type="button" id="toggleSigninPassword" class="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors" aria-label="แสดงหรือซ่อนรหัสผ่าน">
                  <i data-lucide="eye" class="w-5 h-5"></i>
                </button>
              </div>
            </div>

            <label class="flex items-center gap-3 cursor-pointer group ml-1">
              <span class="relative flex items-center justify-center">
                <input name="remember" type="checkbox" class="peer appearance-none w-5 h-5 border-2 border-slate-200 rounded-md checked:bg-blue-500 checked:border-blue-500 transition-all">
                <i data-lucide="check" class="absolute w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity"></i>
              </span>
              <span class="text-xs lg:text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors">จดจำฉันไว้</span>
            </label>

            <button id="signinSubmitBtn" type="submit" class="auth-primary-btn w-full py-3.5 lg:py-4 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black rounded-xl lg:rounded-2xl shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:scale-[1.01] active:scale-[0.98] transition-all text-sm lg:text-base flex items-center justify-center gap-2">
              <span>เข้าสู่ระบบ</span>
            </button>

            <div id="signinMessage" class="hidden rounded-xl border px-4 py-3 text-sm font-medium"></div>
          </form>

          <p class="mt-8 lg:mt-10 text-center text-xs lg:text-sm font-medium text-slate-500">
            ยังไม่มีบัญชี? <a href="/signup" data-link class="text-blue-600 font-bold hover:underline">สมัครสมาชิกใหม่</a>
          </p>
        </div>
      </div>
    </section>
  `;
}

export function mountSigninView(root) {
  if (!root) return;

  const form = root.querySelector("#signinForm");
  const submitBtn = root.querySelector("#signinSubmitBtn");
  const message = root.querySelector("#signinMessage");
  const passwordInput = root.querySelector("#signinPassword");
  const passwordToggle = root.querySelector("#toggleSigninPassword");

  drawWisePuff(root.querySelector("#wisePuffCanvas"));

  passwordToggle?.addEventListener("click", () => {
    const nextType = passwordInput?.type === "password" ? "text" : "password";
    if (passwordInput) passwordInput.type = nextType;
    passwordToggle.innerHTML =
      nextType === "password"
        ? '<i data-lucide="eye" class="w-5 h-5"></i>'
        : '<i data-lucide="eye-off" class="w-5 h-5"></i>';
    window.lucide?.createIcons?.();
  });

  root.querySelector("#forgotPasswordBtn")?.addEventListener("click", () => {
    showToast("ระบบลืมรหัสผ่านจะทำในขั้นถัดไป");
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const email = String(formData.get("email") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "");

    if (!email || !password) {
      setMessage(message, "กรุณากรอกอีเมลและรหัสผ่าน", "error");
      return;
    }

    setButtonLoading(submitBtn, true);
    setMessage(message, "กำลังตรวจสอบบัญชี...", "info");

    try {
      const res = await apiSignin({ email, password });
      if (!res?.ok) throw new Error(res?.error || "เข้าสู่ระบบไม่สำเร็จ");

      const storage = formData.get("remember") ? localStorage : sessionStorage;
      storage.setItem("smartlib.auth", JSON.stringify(res.data || {}));
      setMessage(message, "เข้าสู่ระบบสำเร็จ", "success");
      showToast("เข้าสู่ระบบสำเร็จ");
      window.setTimeout(() => navigateSpa(resolvePostLoginPath(res.data)), 500);
    } catch (error) {
      setMessage(message, error?.message || "เข้าสู่ระบบไม่สำเร็จ", "error");
      showToast(error?.message || "เข้าสู่ระบบไม่สำเร็จ");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });
}

function setMessage(el, text, type) {
  if (!el) return;
  const classes = {
    info: "border-sky-100 bg-sky-50 text-sky-800",
    success: "border-emerald-100 bg-emerald-50 text-emerald-800",
    error: "border-rose-100 bg-rose-50 text-rose-800",
  };
  el.className = `rounded-xl border px-4 py-3 text-sm font-medium ${classes[type] || classes.info}`;
  el.textContent = text;
}

function drawWisePuff(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const size = Math.max(180, Math.round(canvas.getBoundingClientRect().width || 220));
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  ctx.scale(dpr, dpr);

  const cx = size / 2;
  const cy = size / 2;
  const scale = size / 220;

  ctx.clearRect(0, 0, size, size);
  ctx.shadowBlur = 30 * scale;
  ctx.shadowColor = "rgba(0,0,0,0.15)";

  const bodyGrad = ctx.createRadialGradient(cx - 20 * scale, cy - 30 * scale, 5 * scale, cx, cy, 80 * scale);
  bodyGrad.addColorStop(0, "#E0F2FE");
  bodyGrad.addColorStop(1, "#FFFFFF");
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(cx, cy + 20 * scale, 75 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.ellipse(cx, cy + 15 * scale, 60 * scale, 50 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.arc(cx - 30 * scale, cy + 10 * scale, 15 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 30 * scale, cy + 10 * scale, 15 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(cx - 35 * scale, cy + 5 * scale, 6 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + 25 * scale, cy + 5 * scale, 6 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 182, 193, 0.7)";
  ctx.beginPath();
  ctx.ellipse(cx - 45 * scale, cy + 30 * scale, 12 * scale, 8 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + 45 * scale, cy + 30 * scale, 12 * scale, 8 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#FB923C";
  ctx.beginPath();
  ctx.roundRect(cx - 8 * scale, cy + 20 * scale, 16 * scale, 12 * scale, 8 * scale);
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.moveTo(cx, cy - 100 * scale);
  ctx.lineTo(cx - 50 * scale, cy - 50 * scale);
  ctx.lineTo(cx + 50 * scale, cy - 50 * scale);
  ctx.fill();

  ctx.strokeStyle = "#3B82F6";
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.moveTo(cx - 20 * scale, cy - 70 * scale);
  ctx.lineTo(cx + 20 * scale, cy - 70 * scale);
  ctx.stroke();
}
