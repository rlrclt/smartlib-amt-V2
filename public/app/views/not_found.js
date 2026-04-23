import { escapeHtml } from "../utils/html.js";

export function renderNotFound(pathname) {
  return `
    <section class="view max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
        <h1 class="text-2xl font-extrabold text-slate-800">404</h1>
        <p class="mt-2 text-slate-600">ไม่พบหน้านี้: <code class="px-2 py-1 bg-slate-50 border rounded">${escapeHtml(
          pathname
        )}</code></p>
        <div class="mt-5">
          <a data-link href="/" class="inline-flex items-center gap-2 font-bold text-sky-700 hover:text-sky-800">กลับหน้าแรก</a>
        </div>
      </div>
    </section>
  `;
}
