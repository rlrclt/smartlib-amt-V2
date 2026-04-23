import { renderSidebarManage } from "../components/sidebar_manage.js";
import { renderFooterManage } from "../components/footer_manage.js";
import { escapeHtml } from "../utils/html.js";

function resolveManageShellMeta(pathname) {
  const path = String(pathname || "/manage").replace(/\/+$/, "") || "/manage";
  const map = {
    "/manage": {
      crumb: "Dashboard",
      title: "ระบบจัดการห้องสมุด",
      mobileTitle: "Dashboard",
    },
    "/manage/announcements": {
      crumb: "Announcements",
      title: "จัดการประกาศ",
      mobileTitle: "ประกาศ",
    },
    "/manage/books": {
      crumb: "Books",
      title: "จัดการหนังสือ",
      mobileTitle: "หนังสือ",
    },
    "/manage/register_books": {
      crumb: "Books",
      title: "ลงทะเบียนหนังสือใหม่",
      mobileTitle: "ลงทะเบียนหนังสือ",
    },
    "/manage/add_book_items": {
      crumb: "Books",
      title: "เพิ่มจำนวนเล่มหนังสือ",
      mobileTitle: "เพิ่มรหัสเล่ม",
    },
    "/manage/view_book_items": {
      crumb: "Books",
      title: "คลังรหัสเล่มหนังสือ",
      mobileTitle: "คลังรหัสเล่ม",
    },
    "/manage/print-barcodes": {
      crumb: "Books",
      title: "พิมพ์บาร์โค้ด",
      mobileTitle: "พิมพ์บาร์โค้ด",
    },
    "/manage/books/select-print": {
      crumb: "Books",
      title: "เลือกเล่มสำหรับพิมพ์",
      mobileTitle: "เลือกพิมพ์",
    },
    "/manage/users": {
      crumb: "Users",
      title: "จัดการสมาชิก",
      mobileTitle: "สมาชิก",
    },
    "/manage/loans": {
      crumb: "Loans",
      title: "รายการยืม-คืน",
      mobileTitle: "ยืม-คืน",
    },
    "/manage/settings": {
      crumb: "Settings",
      title: "ตั้งค่าระบบ",
      mobileTitle: "ตั้งค่า",
    },
  };

  return map[path] || {
    crumb: "Manage",
    title: "ระบบจัดการห้องสมุด",
    mobileTitle: "Manage",
  };
}

/**
 * Manage Shell Layout
 * Header จะปรับ breadcrumb/title ตามเส้นทางปัจจุบัน
 */
export function renderManageShell(contentHtml) {
  const meta = resolveManageShellMeta(window.location.pathname);

  return `
    <div class="flex min-h-screen bg-slate-50 font-medium text-slate-700">
      ${renderSidebarManage()}

      <main class="flex-1 flex flex-col min-h-screen lg:h-screen overflow-y-auto pb-24 lg:pb-0 transition-all duration-300">
        <header class="sticky top-0 z-30 flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200/60 shadow-sm">
          <div class="flex items-center gap-4">
            <div class="hidden lg:block">
              <div class="mb-0.5 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400">
                <span>Admin</span>
                <i data-lucide="chevron-right" class="h-3 w-3"></i>
                <span class="text-sky-600">${escapeHtml(meta.crumb)}</span>
              </div>
              <h1 class="text-base font-bold leading-tight text-slate-800 lg:text-lg">${escapeHtml(meta.title)}</h1>
            </div>
            <h1 class="text-lg font-bold text-slate-800 lg:hidden">${escapeHtml(meta.mobileTitle)}</h1>
          </div>

          <div class="flex items-center gap-3 lg:gap-5">
            <div class="hidden items-center rounded-full border border-transparent bg-slate-100 px-4 py-1.5 transition-all focus-within:border-sky-300 focus-within:bg-white md:flex">
              <i data-lucide="search" class="h-4 w-4 text-slate-400"></i>
              <input type="text" placeholder="ค้นหาข้อมูล..." class="w-40 border-none bg-transparent text-sm focus:ring-0">
            </div>

            <div class="ml-2 flex items-center gap-2 border-l border-slate-200 pl-4">
              <button class="relative rounded-xl p-2 text-slate-400 transition-all hover:bg-sky-50 hover:text-sky-600">
                <i data-lucide="bell" class="h-5 w-5"></i>
                <span class="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-rose-500"></span>
              </button>

              <div class="group ml-2 flex cursor-pointer items-center gap-3">
                <div class="hidden text-right lg:block">
                  <p class="text-xs font-bold leading-none text-slate-800">Admin User</p>
                  <p class="mt-1 text-[10px] text-slate-400">Super Admin</p>
                </div>
                <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-sm font-bold text-white shadow-md transition-transform group-hover:scale-105">
                  AD
                </div>
              </div>
            </div>
          </div>
        </header>

        <div id="manage-content" class="mx-auto w-full max-w-[1600px] flex-1 p-4 lg:p-6">
          ${contentHtml}
        </div>

        <div class="mt-auto border-t border-slate-200/50 px-6 py-4">
          ${renderFooterManage()}
        </div>
      </main>
    </div>
  `;
}
