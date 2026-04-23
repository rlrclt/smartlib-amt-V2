/**
 * Footer Manage Component
 */
export function renderFooterManage() {
  const year = new Date().getFullYear();
  return `
    <footer class="mt-auto border-t border-slate-100 px-4 py-4 lg:px-8 lg:py-6">
      <div class="flex flex-col gap-3 text-[11px] font-bold text-slate-500 md:flex-row md:items-center md:justify-between md:text-xs md:uppercase md:tracking-widest md:text-slate-400">
        <div class="flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <span class="rounded-md px-2 py-1 text-sky-700">v2.0.26</span>
          <span class="leading-relaxed">© ${year} SmartLib AMT - Management System</span>
        </div>
        <div class="hidden w-full grid-cols-2 gap-2 md:flex md:w-auto md:items-center md:gap-4">
          <a href="#" class="text-xs font-bold transition-colors hover:text-sky-600 underline decoration-sky-100">Help Center</a>
          <a href="#" class="text-xs font-bold transition-colors hover:text-sky-600 underline decoration-sky-100">Report Bug</a>
        </div>
      </div>
    </footer>
  `;
}
