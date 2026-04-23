import { GAS_URL } from "../../config.js";
import { showToast } from "../../components/toast.js";
import { apiSignin } from "../../data/api.js";

export function renderSigninTestView() {
  return `
    <section class="view min-h-screen bg-slate-50 px-4 py-24">
      <div class="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[420px_1fr]">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 class="text-2xl font-black text-slate-900">Test Sign In</h1>
              <p class="mt-1 text-sm font-medium text-slate-500">ยิง action <code>signin</code> ไป GAS โดยตรง</p>
            </div>
            <a href="/test-signup" data-link class="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700 hover:bg-sky-100">Test Signup</a>
          </div>

          <form id="signinTestForm" class="grid gap-4">
            <label class="grid gap-1.5">
              <span class="text-sm font-bold text-slate-700">อีเมล</span>
              <input name="email" type="email" autocomplete="email" required class="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" placeholder="user@example.com">
            </label>

            <label class="grid gap-1.5">
              <span class="text-sm font-bold text-slate-700">รหัสผ่าน</span>
              <span class="relative">
                <input id="signinTestPassword" name="password" type="password" autocomplete="current-password" required class="w-full rounded-xl border border-slate-200 px-4 py-3 pr-24 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" placeholder="password จากอีเมล">
                <button id="signinTestTogglePassword" type="button" class="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50">
                  แสดง
                </button>
              </span>
            </label>

            <label class="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
              <input name="remember" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-sky-600">
              เก็บผล login ใน localStorage
            </label>

            <button id="signinTestSubmit" type="submit" class="rounded-xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-700">
              Login Test
            </button>
          </form>

          <div class="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div class="text-xs font-bold text-slate-500">GAS URL</div>
            <code id="signinTestGasUrl" class="mt-1 block overflow-hidden text-ellipsis whitespace-nowrap text-xs text-slate-600"></code>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h2 class="text-lg font-black text-slate-900">Response</h2>
            <button id="signinTestClear" type="button" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">ล้าง</button>
          </div>
          <pre id="signinTestOutput" class="min-h-[360px] overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">{}</pre>
        </div>
      </div>
    </section>
  `;
}

export function mountSigninTestView(root) {
  if (!root) return;

  const form = root.querySelector("#signinTestForm");
  const submit = root.querySelector("#signinTestSubmit");
  const output = root.querySelector("#signinTestOutput");
  const gasUrl = root.querySelector("#signinTestGasUrl");
  const passwordInput = root.querySelector("#signinTestPassword");
  const togglePasswordBtn = root.querySelector("#signinTestTogglePassword");

  if (gasUrl) gasUrl.textContent = GAS_URL;

  togglePasswordBtn?.addEventListener("click", () => {
    const nextType = passwordInput?.type === "password" ? "text" : "password";
    if (passwordInput) passwordInput.type = nextType;
    togglePasswordBtn.textContent = nextType === "password" ? "แสดง" : "ซ่อน";
  });

  root.querySelector("#signinTestClear")?.addEventListener("click", () => {
    setOutput(output, {});
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {
      email: String(formData.get("email") || "").trim().toLowerCase(),
      password: String(formData.get("password") || ""),
    };

    setLoading(submit, true);
    setOutput(output, { status: "loading", action: "signin", request: { email: payload.email } });

    try {
      const response = await apiSignin(payload);
      setOutput(output, response);

      if (response?.ok) {
        const storage = formData.get("remember") ? localStorage : sessionStorage;
        storage.setItem("smartlib.auth", JSON.stringify(response.data || {}));
        showToast("login test สำเร็จ");
      } else {
        showToast(response?.error || "login test ไม่สำเร็จ");
      }
    } catch (error) {
      const failure = { ok: false, error: String(error?.message || error) };
      setOutput(output, failure);
      showToast(failure.error);
    } finally {
      setLoading(submit, false);
    }
  });
}

function setLoading(button, loading) {
  if (!button) return;
  button.disabled = loading;
  button.textContent = loading ? "กำลัง Login..." : "Login Test";
}

function setOutput(output, value) {
  if (!output) return;
  output.textContent = JSON.stringify(value, null, 2);
}
