const SERVICE_SELECT_SESSION_KEY = "smartlib.service.selected";

function readAuthSession_() {
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

export function renderMemberServiceSelectView() {
  const auth = readAuthSession_();
  const user = auth?.user || {};
  const role = String(user.role || "").toLowerCase();
  const groupType = String(user.groupType || "").toLowerCase();
  const canManage = groupType === "manage" && (role === "admin" || role === "librarian");

  return `
    <section class="member-page-container view mx-auto max-w-3xl">
      <div class="rounded-3xl border border-sky-100 bg-white p-6 shadow-sm sm:p-8">
        <p class="text-xs font-black uppercase tracking-[0.14em] text-sky-600">Service Selection</p>
        <h1 class="mt-1 text-2xl font-black text-slate-900">เลือกบริการที่ต้องการใช้งาน</h1>
        <p class="mt-2 text-sm font-semibold text-slate-500">ระบบจะจดจำเฉพาะใน session นี้ และจะถามใหม่เมื่อออกจากระบบหรือ session หมดอายุ</p>

        <div class="mt-6 grid gap-3 sm:grid-cols-2">
          <button data-service-target="member" class="rounded-2xl border border-sky-100 bg-sky-50 p-4 text-left transition hover:border-sky-200 hover:bg-sky-100">
            <p class="text-sm font-black text-sky-800">พื้นที่สมาชิก</p>
            <p class="mt-1 text-xs font-semibold text-sky-700">ค้นหาหนังสือ ยืม-คืน จอง และจัดการโปรไฟล์</p>
          </button>
          ${canManage ? `
          <button data-service-target="manage" class="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-left transition hover:border-violet-200 hover:bg-violet-100">
            <p class="text-sm font-black text-violet-800">พื้นที่จัดการ</p>
            <p class="mt-1 text-xs font-semibold text-violet-700">แดชบอร์ดผู้ดูแล รายงาน และเครื่องมือห้องสมุด</p>
          </button>
          ` : `
          <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p class="text-sm font-black text-slate-700">พื้นที่จัดการ</p>
            <p class="mt-1 text-xs font-semibold text-slate-500">บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานโหมดจัดการ</p>
          </div>
          `}
        </div>
      </div>
    </section>
  `;
}

export function mountMemberServiceSelectView(root) {
  if (!root) return;
  const auth = readAuthSession_();
  const user = auth?.user || {};
  const role = String(user.role || "").toLowerCase();
  const groupType = String(user.groupType || "").toLowerCase();
  const canManage = groupType === "manage" && (role === "admin" || role === "librarian");
  root.querySelectorAll("[data-service-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const target = String(button.getAttribute("data-service-target") || "member").toLowerCase();
      const safeTarget = target === "manage" && canManage ? "manage" : "member";
      window.sessionStorage.setItem(SERVICE_SELECT_SESSION_KEY, safeTarget);
      const path = safeTarget === "manage" ? "/manage" : "/app";
      window.history.replaceState({}, "", path);
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
  });
}
