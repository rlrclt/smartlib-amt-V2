import { showToast } from "../../components/toast.js";
import { apiFinesList, apiProfileGet } from "../../data/api.js";
import { escapeHtml } from "../../utils/html.js";

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

function renderRole(profile) {
  const role = String(profile?.role || "-");
  const group = String(profile?.groupType || "-");
  return `${role} (${group})`;
}

function fmtDate(value) {
  const d = new Date(String(value || ""));
  if (!Number.isFinite(d.getTime())) return "-";
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function renderProfileView() {
  return `
    <section class="view mx-auto w-full max-w-5xl px-4 py-8 space-y-5">
      <div class="mb-4 flex items-center justify-between">
        <h1 class="text-2xl font-black text-slate-800">ข้อมูลส่วนตัว</h1>
        <a data-link href="/" class="text-sm font-bold text-sky-700 hover:text-sky-800">กลับหน้าหลัก</a>
      </div>
      <div id="profileViewRoot" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="text-sm font-semibold text-slate-500">กำลังโหลดข้อมูล...</div>
      </div>
      <div id="profileFineViewRoot" class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="text-sm font-semibold text-slate-500">กำลังโหลดข้อมูลค่าปรับ...</div>
      </div>
    </section>
  `;
}

function renderProfileCard(root, profile, stats) {
  const avatar = String(profile.photoURL || "").trim() || "/assets/img/default-avatar.svg";
  const initials = String(profile.displayName || "U").trim().slice(0, 2).toUpperCase();
  root.innerHTML = `
    <div class="grid gap-5 lg:grid-cols-[260px_1fr]">
      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="mx-auto mb-3 flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-slate-200 shadow">
          <img src="${escapeHtml(avatar)}" alt="${escapeHtml(profile.displayName || "")}" class="h-full w-full object-cover" />
        </div>
        <p class="text-center text-lg font-black text-slate-800">${escapeHtml(profile.displayName || "-")}</p>
        <p class="text-center text-xs font-semibold uppercase text-slate-500">${escapeHtml(renderRole(profile))}</p>
        <p class="mt-2 text-center text-xs font-semibold text-slate-500">สถานะบัญชี: ${escapeHtml(profile.status || "-")}</p>
      </div>
      <div class="space-y-4">
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-xl border border-slate-200 p-3">
            <p class="text-xs font-black uppercase text-slate-500">อีเมล</p>
            <p class="mt-1 text-sm font-semibold text-slate-800">${escapeHtml(profile.email || "-")}</p>
          </div>
          <div class="rounded-xl border border-slate-200 p-3">
            <p class="text-xs font-black uppercase text-slate-500">เบอร์โทร</p>
            <p class="mt-1 text-sm font-semibold text-slate-800">${escapeHtml(profile.phone || "-")}</p>
          </div>
          <div class="rounded-xl border border-slate-200 p-3 sm:col-span-2">
            <p class="text-xs font-black uppercase text-slate-500">ที่อยู่</p>
            <p class="mt-1 text-sm font-semibold text-slate-800">${escapeHtml(profile.address || "-")}</p>
          </div>
          <div class="rounded-xl border border-slate-200 p-3">
            <p class="text-xs font-black uppercase text-slate-500">Line ID</p>
            <p class="mt-1 text-sm font-semibold text-slate-800">${escapeHtml(profile.lineId || "-")}</p>
          </div>
          <div class="rounded-xl border border-slate-200 p-3">
            <p class="text-xs font-black uppercase text-slate-500">สังกัด/ห้อง</p>
            <p class="mt-1 text-sm font-semibold text-slate-800">${escapeHtml([profile.department, profile.level, profile.classRoom].filter(Boolean).join(" / ") || "-")}</p>
          </div>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p class="text-xs font-black uppercase text-amber-700">ยืมค้างอยู่</p>
            <p class="mt-1 text-2xl font-black text-amber-800">${Number(stats.activeLoans || 0)}</p>
          </div>
          <div class="rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p class="text-xs font-black uppercase text-rose-700">ยอดค่าปรับค้าง</p>
            <p class="mt-1 text-2xl font-black text-rose-800">${Number(stats.unpaidFineTotal || 0).toLocaleString()} บาท</p>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <a data-link href="/profile/edit" class="rounded-xl bg-sky-600 px-4 py-2 text-sm font-black text-white hover:bg-sky-700">แก้ไขข้อมูล</a>
          <a data-link href="/profile/change-password" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-100">เปลี่ยนรหัสผ่าน</a>
        </div>
      </div>
    </div>
  `;
}

function renderFineCard(fine) {
  const status = String(fine.status || "").toLowerCase();
  const statusCls =
    status === "paid"
      ? "bg-emerald-100 text-emerald-700"
      : status === "waived"
        ? "bg-slate-100 text-slate-700"
        : "bg-rose-100 text-rose-700";
  const typeLabel = {
    overdue: "คืนเกินกำหนด",
    damaged: "หนังสือชำรุด",
    lost: "หนังสือสูญหาย",
  }[String(fine.type || "").toLowerCase()] || String(fine.type || "-");

  return `
    <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div class="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p class="text-sm font-black text-slate-800">${escapeHtml(fine.fineId || "-")}</p>
          <p class="mt-1 text-xs font-semibold text-slate-500">Loan: ${escapeHtml(fine.loanId || "-")}</p>
        </div>
        <span class="rounded-full px-2 py-1 text-[11px] font-black ${statusCls}">${escapeHtml(status || "-")}</span>
      </div>
      <div class="mt-3 grid gap-2 text-xs font-semibold text-slate-600 sm:grid-cols-2">
        <p>ประเภท: <span class="font-black text-slate-800">${escapeHtml(typeLabel)}</span></p>
        <p>จำนวนเงิน: <span class="font-black text-slate-800">${Number(fine.amount || 0).toLocaleString("th-TH")} บาท</span></p>
        <p>สร้าง: <span class="font-black text-slate-800">${escapeHtml(fmtDate(fine.createdAt))}</span></p>
        <p>อัปเดต: <span class="font-black text-slate-800">${escapeHtml(fmtDate(fine.updatedAt))}</span></p>
        ${fine.paidAt ? `<p>ชำระเมื่อ: <span class="font-black text-slate-800">${escapeHtml(fmtDate(fine.paidAt))}</span></p>` : ""}
        ${fine.receivedBy ? `<p>รับชำระ/ยกเว้นโดย: <span class="font-black text-slate-800">${escapeHtml(fine.receivedBy)}</span></p>` : ""}
      </div>
      ${fine.bookTitle ? `<p class="mt-2 text-xs text-slate-500">${escapeHtml(fine.bookTitle)}${fine.barcode ? ` · ${escapeHtml(fine.barcode)}` : ""}</p>` : ""}
      ${fine.notes ? `<p class="mt-2 text-xs text-slate-600">${escapeHtml(fine.notes)}</p>` : ""}
    </article>
  `;
}

function renderFineSection(root, finesState) {
  const box = root.querySelector("#profileFineViewRoot");
  if (!box) return;

  if (finesState.loading) {
    box.innerHTML = '<div class="text-sm font-semibold text-slate-500">กำลังโหลดข้อมูลค่าปรับ...</div>';
    return;
  }

  const unpaidTotal = finesState.items
    .filter((item) => String(item.status || "") === "unpaid")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  if (!finesState.items.length) {
    box.innerHTML = `
      <div class="flex items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-black text-slate-800">ค่าปรับของฉัน</h2>
          <p class="text-xs font-semibold text-slate-500">ไม่มีรายการค่าปรับ</p>
        </div>
        <div class="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
          ค้างชำระ 0 บาท
        </div>
      </div>
      <div class="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-5 text-sm font-semibold text-slate-500">ยังไม่มีรายการค่าปรับในระบบ</div>
    `;
    return;
  }

  box.innerHTML = `
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-base font-black text-slate-800">ค่าปรับของฉัน</h2>
        <p class="text-xs font-semibold text-slate-500">ดูรายการค่าปรับค้างและประวัติการชำระ/ยกเว้น</p>
      </div>
      <div class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">
        ค้างชำระ ${unpaidTotal.toLocaleString("th-TH")} บาท
      </div>
    </div>
    <div class="mt-4 grid gap-3">
      ${finesState.items.map(renderFineCard).join("")}
    </div>
  `;
}

export async function mountProfileView(container) {
  const root = container.querySelector("#profileViewRoot");
  const fineRoot = container.querySelector("#profileFineViewRoot");
  if (!root || !fineRoot) return;

  const auth = readAuthSession();
  if (!auth?.user?.uid) {
    root.innerHTML = '<p class="text-sm font-semibold text-rose-600">ไม่พบ session กรุณาเข้าสู่ระบบใหม่</p>';
    fineRoot.innerHTML = "";
    return;
  }

  const finesState = {
    loading: true,
    items: [],
  };

  renderFineSection(container, finesState);

  try {
    const [profileRes, fineRes] = await Promise.all([
      apiProfileGet(),
      apiFinesList({ status: "all", page: 1, limit: 100 }),
    ]);
    if (!profileRes?.ok) throw new Error(profileRes?.error || "โหลดข้อมูลโปรไฟล์ไม่สำเร็จ");
    renderProfileCard(root, profileRes.data?.profile || {}, profileRes.data?.stats || {});
    finesState.loading = false;
    finesState.items = fineRes?.ok && Array.isArray(fineRes.data?.items) ? fineRes.data.items : [];
    renderFineSection(container, finesState);
  } catch (err) {
    root.innerHTML = '<p class="text-sm font-semibold text-rose-600">โหลดข้อมูลโปรไฟล์ไม่สำเร็จ</p>';
    finesState.loading = false;
    finesState.items = [];
    renderFineSection(container, finesState);
    showToast(err?.message || "โหลดข้อมูลโปรไฟล์ไม่สำเร็จ");
  }
}
