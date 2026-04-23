export function renderStaticPage({ title, bodyHtml }) {
  return `
    <section class="view max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div class="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <h1 class="text-2xl font-extrabold text-slate-800">${title}</h1>
          <a data-link href="/" class="font-bold text-sky-700 hover:text-sky-800">กลับหน้าแรก</a>
        </div>
        <div class="mt-4 prose max-w-none">
          ${bodyHtml}
        </div>
      </div>
    </section>
  `;
}
