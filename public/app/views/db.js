import { GAS_URL } from "../config.js";
import { showToast } from "../components/toast.js";
import { apiDelete, apiGet, apiList, apiPing, apiSet } from "../data/api.js";

export function renderDbView() {
  return `
    <section class="view max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="text-2xl font-extrabold text-slate-800">GAS Sheet DB (JSONP)</h1>
            <p class="mt-1 text-slate-600">ทดสอบหลังบ้าน Apps Script ผ่าน JSONP (ไม่ติด CORS)</p>
          </div>
          <a data-link href="/" class="font-bold text-sky-700 hover:text-sky-800">กลับหน้าแรก</a>
        </div>

        <div class="mt-6 grid gap-4">
          <div class="rounded-xl border bg-slate-50 p-3 text-xs text-slate-600 overflow-hidden">
            <div class="font-bold text-slate-700">Web App URL</div>
            <code id="gasUrl" class="block mt-1 whitespace-nowrap overflow-hidden text-ellipsis"></code>
          </div>

          <div class="grid sm:grid-cols-2 gap-4">
            <label class="grid gap-1">
              <span class="text-sm font-bold text-slate-700">key</span>
              <input id="key" class="rounded-xl border border-slate-200 px-3 py-2" placeholder="เช่น user:123" />
            </label>
            <label class="grid gap-1">
              <span class="text-sm font-bold text-slate-700">value</span>
              <input id="value" class="rounded-xl border border-slate-200 px-3 py-2" placeholder="string หรือ json text" />
            </label>
          </div>

          <div class="flex flex-wrap gap-2">
            <button id="btnPing" class="px-3 py-2 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-700">ping</button>
            <button id="btnGet" class="px-3 py-2 rounded-xl border font-bold hover:bg-slate-50">get</button>
            <button id="btnSet" class="px-3 py-2 rounded-xl border font-bold hover:bg-slate-50">set</button>
            <button id="btnDel" class="px-3 py-2 rounded-xl border font-bold hover:bg-slate-50">delete</button>
            <button id="btnList" class="px-3 py-2 rounded-xl border font-bold hover:bg-slate-50">list</button>
          </div>

          <pre id="out" class="rounded-xl border bg-slate-50 p-3 text-xs overflow-auto min-h-36">{}</pre>
        </div>
      </div>
    </section>
  `;
}

export function mountDbView(root) {
  if (!root) return;
  const gasUrl = root.querySelector("#gasUrl");
  if (gasUrl) gasUrl.textContent = GAS_URL;

  const key = root.querySelector("#key");
  const value = root.querySelector("#value");
  const out = root.querySelector("#out");

  const setOut = (obj) => {
    if (!out) return;
    out.textContent = JSON.stringify(obj, null, 2);
  };

  const run = async (fn) => {
    if (out) out.textContent = "loading...";
    try {
      const res = await fn();
      setOut(res);
      if (res && res.ok === false) showToast(res.error || "error");
    } catch (e) {
      setOut({ ok: false, error: String(e?.message || e) });
      showToast("request failed");
    }
  };

  root.querySelector("#btnPing")?.addEventListener("click", () => run(() => apiPing()));
  root.querySelector("#btnGet")?.addEventListener("click", () => run(() => apiGet(key?.value || "")));
  root.querySelector("#btnSet")?.addEventListener("click", () => run(() => apiSet(key?.value || "", value?.value || "")));
  root.querySelector("#btnDel")?.addEventListener("click", () => run(() => apiDelete(key?.value || "")));
  root.querySelector("#btnList")?.addEventListener("click", () => run(() => apiList()));
}
