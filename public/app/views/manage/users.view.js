import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";
import { apiUsersManageArchive, apiUsersManageCreate, apiUsersManageList } from "../../data/api.js";

const STATE = {
  items: [],
  loading: false,
  status: "all",
  role: "all",
  q: "",
  creating: false,
};

function statusPill(status) {
  const key = String(status || "").toLowerCase();
  if (key === "active") return '<span class="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700">active</span>';
  if (key === "suspended") return '<span class="rounded-full bg-rose-50 px-2 py-1 text-[11px] font-black text-rose-700">suspended</span>';
  return '<span class="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600">inactive</span>';
}

function renderTable(root) {
  const el = root.querySelector("#usersList");
  const count = root.querySelector("#usersCount");
  if (!el) return;
  if (count) count.textContent = String(STATE.items.length);

  if (STATE.loading) {
    el.innerHTML = '<div class="rounded-2xl border border-slate-100 bg-white p-4 text-sm font-bold text-slate-500">กำลังโหลดรายชื่อสมาชิก...</div>';
    return;
  }

  if (!STATE.items.length) {
    el.innerHTML = '<div class="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm font-bold text-slate-500">ไม่พบข้อมูลสมาชิก</div>';
    return;
  }

  el.innerHTML = `
    <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table class="min-w-full text-left text-sm">
        <thead class="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-3 py-3">ชื่อ</th>
            <th class="px-3 py-3">อีเมล</th>
            <th class="px-3 py-3">บทบาท</th>
            <th class="px-3 py-3">สถานะ</th>
            <th class="px-3 py-3">การจัดการ</th>
          </tr>
        </thead>
        <tbody>
          ${STATE.items.map((u) => `
            <tr class="border-t border-slate-100">
              <td class="px-3 py-3">
                <p class="font-black text-slate-800">${escapeHtml(u.displayName || "-")}</p>
                <p class="text-xs font-semibold text-slate-500">${escapeHtml(u.uid)}</p>
              </td>
              <td class="px-3 py-3 text-slate-700">${escapeHtml(u.email || "-")}</td>
              <td class="px-3 py-3">
                <p class="font-bold text-slate-700">${escapeHtml(u.role || "-")}</p>
                <p class="text-xs text-slate-500">${escapeHtml(u.groupType || "-")}</p>
              </td>
              <td class="px-3 py-3">${statusPill(u.status)}</td>
              <td class="px-3 py-3">
                <div class="flex flex-wrap gap-2">
                  <a data-link href="/manage/users/edit?uid=${encodeURIComponent(u.uid)}" class="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-black text-white hover:bg-sky-700">แก้ไข</a>
                  <button data-archive-uid="${escapeHtml(u.uid)}" class="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 hover:bg-rose-100">เก็บถาวร</button>
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function loadUsers(root) {
  STATE.loading = true;
  renderTable(root);
  try {
    const res = await apiUsersManageList({
      status: STATE.status,
      role: STATE.role,
      q: STATE.q,
      limit: 200,
    });
    if (!res?.ok) throw new Error(res?.error || "โหลดสมาชิกไม่สำเร็จ");
    STATE.items = Array.isArray(res.data?.items) ? res.data.items : [];
  } catch (err) {
    STATE.items = [];
    showToast(err?.message || "โหลดสมาชิกไม่สำเร็จ");
  } finally {
    STATE.loading = false;
    renderTable(root);
  }
}

function openCreatePanel(root) {
  const panel = root.querySelector("#usersCreatePanel");
  const drawer = root.querySelector("#usersCreateDrawer");
  if (!panel || !drawer) return;
  panel.classList.remove("invisible", "opacity-0", "pointer-events-none");
  drawer.classList.remove("translate-x-full");
}

function closeCreatePanel(root) {
  const panel = root.querySelector("#usersCreatePanel");
  const drawer = root.querySelector("#usersCreateDrawer");
  if (!panel || !drawer) return;
  panel.classList.add("invisible", "opacity-0", "pointer-events-none");
  drawer.classList.add("translate-x-full");
}

function readCreateForm(form) {
  const keys = [
    "email", "displayName", "groupType", "role", "status", "phone", "password", "personnelType",
    "idCode", "idType", "department", "level", "classRoom", "organization",
    "lineId", "address", "photoURL", "notes", "isVerified"
  ];
  const out = {};
  keys.forEach((k) => {
    out[k] = String(form.elements[k]?.value || "").trim();
  });
  return out;
}

function syncPasswordVisibility(root) {
  const input = root.querySelector("#usersCreatePassword");
  const toggle = root.querySelector("#usersCreatePasswordToggle");
  if (!input || !toggle) return;

  const isVisible = input.type === "text";
  toggle.innerHTML = isVisible
    ? '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m3 3 18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.2A10.9 10.9 0 0 1 12 5c7 0 10 7 10 7a17.5 17.5 0 0 1-3.1 4.2"/><path d="M6.6 6.6A17.4 17.4 0 0 0 2 12s3 7 10 7a11 11 0 0 0 4.2-.8"/></svg>'
    : '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
  toggle.setAttribute("aria-pressed", isVisible ? "true" : "false");
  toggle.setAttribute("aria-label", isVisible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน");
}

export function renderManageUsersView() {
  return `
    <div class="space-y-5 p-2 lg:p-4">
      <section class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-black text-slate-800">จัดการสมาชิก</h2>
            <p class="text-sm font-semibold text-slate-500">ค้นหา, เพิ่ม, แก้ไข, ระงับ หรือ archive สมาชิก</p>
          </div>
          <div class="flex gap-2">
            <button id="usersOpenCreateBtn" class="rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white hover:bg-sky-700">เพิ่มผู้ใช้ใหม่</button>
            <a data-link href="/manage/users/import" class="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 hover:bg-emerald-100">นำเข้าข้อมูล</a>
            <button id="usersReloadBtn" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">รีโหลด</button>
          </div>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-slate-50 p-4 lg:p-5">
        <div class="grid gap-3 md:grid-cols-[1.2fr_auto_auto]">
          <input id="usersSearchInput" type="text" placeholder="ค้นหาชื่อ, อีเมล, UID, รหัสเอกสาร" class="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
          <select id="usersStatusFilter" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">
            <option value="all">สถานะ: ทั้งหมด</option>
            <option value="active">ใช้งานอยู่</option>
            <option value="inactive">ไม่ใช้งาน</option>
            <option value="suspended">ระงับ</option>
          </select>
          <select id="usersRoleFilter" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">
            <option value="all">บทบาท: ทั้งหมด</option>
            <option value="admin">ผู้ดูแลระบบ</option>
            <option value="librarian">บรรณารักษ์</option>
            <option value="teacher">ครู</option>
            <option value="staff">เจ้าหน้าที่</option>
            <option value="student">นักเรียน</option>
            <option value="external">บุคคลภายนอก</option>
          </select>
        </div>
      </section>

      <section>
        <div class="mb-3 text-xs font-black uppercase tracking-wider text-slate-500">จำนวนสมาชิก <span id="usersCount">0</span> รายการ</div>
        <div id="usersList"></div>
      </section>

      <div id="usersCreatePanel" class="fixed inset-0 z-[3000] invisible opacity-0 pointer-events-none transition-all duration-300">
        <button type="button" data-users-create-close class="absolute inset-0 bg-slate-950/40 backdrop-blur-sm"></button>
        <div id="usersCreateDrawer" class="absolute right-0 top-0 h-full w-full max-w-2xl translate-x-full overflow-y-auto bg-white shadow-2xl transition-transform duration-300">
          <div class="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
            <div>
              <h3 class="text-lg font-black text-slate-800">เพิ่มผู้ใช้ใหม่</h3>
              <p class="text-xs font-bold text-slate-400">กรอกข้อมูลให้ครบตามบทบาท</p>
            </div>
            <button type="button" data-users-create-close class="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700">ปิด</button>
          </div>

          <form id="usersCreateForm" class="space-y-3 p-5">
            <p class="text-xs font-semibold text-slate-500">ช่องที่มี <span class="font-black text-rose-600">*</span> จำเป็นต้องกรอก</p>
            <div class="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs font-semibold text-sky-900">
              <p class="font-black">ค่าอัตโนมัติเมื่อเว้นว่าง (ช่องที่ไม่มี <span class="text-rose-600">*</span>)</p>
              <p>idCode: ระบบสุ่มให้สำหรับ student/teacher/staff/external</p>
              <p>idType: ถ้า role เป็น external จะใช้ nationalId</p>
              <p>phone: ใช้ 0000000000</p>
              <p>department: ใช้ - (ยกเว้น external)</p>
              <p>level และ classRoom: ถ้า role เป็น student จะใช้ ปวช. และ 1/1</p>
            </div>
            <div class="grid gap-3 md:grid-cols-2">
              <label class="space-y-1 text-xs font-bold text-slate-600">
                <span>อีเมล <span class="text-rose-600">*</span></span>
                <input name="email" required placeholder="example@mail.com" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800" />
              </label>
              <label class="space-y-1 text-xs font-bold text-slate-600">
                <span>ชื่อที่แสดง <span class="text-rose-600">*</span></span>
                <input name="displayName" required placeholder="ชื่อผู้ใช้งาน" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800" />
              </label>
              <label class="space-y-1 text-xs font-bold text-slate-600">
                <span>รหัสผ่าน <span class="text-rose-600">*</span></span>
                <div class="relative">
                  <input id="usersCreatePassword" name="password" required type="password" placeholder="กรอกรหัสผ่าน" class="w-full rounded-xl border border-slate-200 px-3 py-2 pr-11 text-sm font-medium text-slate-800" />
                  <button type="button" id="usersCreatePasswordToggle" class="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100" aria-label="แสดงรหัสผ่าน"></button>
                </div>
              </label>
              <label class="space-y-1 text-xs font-bold text-slate-600">
                <span>กลุ่มผู้ใช้ <span class="text-rose-600">*</span></span>
                <select name="groupType" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">
                  <option value="member">สมาชิก</option>
                  <option value="manage">ผู้จัดการ</option>
                </select>
              </label>
              <label class="space-y-1 text-xs font-bold text-slate-600">
                <span>บทบาท <span class="text-rose-600">*</span></span>
                <select name="role" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">
                  <option value="student">นักเรียน</option>
                  <option value="teacher">ครู</option>
                  <option value="staff">เจ้าหน้าที่</option>
                  <option value="external">บุคคลภายนอก</option>
                  <option value="librarian">บรรณารักษ์</option>
                  <option value="admin">ผู้ดูแลระบบ</option>
                </select>
              </label>
              <label class="space-y-1 text-xs font-bold text-slate-600">
                <span>สถานะ <span class="text-rose-600">*</span></span>
                <select name="status" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">
                  <option value="active">ใช้งานอยู่</option>
                  <option value="inactive">ไม่ใช้งาน</option>
                  <option value="suspended">ระงับ</option>
                </select>
              </label>
              <label class="space-y-1 text-xs font-bold text-slate-600">
                <span>เบอร์โทร</span>
                <input name="phone" placeholder="เบอร์โทร 10 หลัก" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800" />
              </label>
              <label class="space-y-1 text-xs font-bold text-slate-600">
                <span>ประเภทบุคลากร</span>
                <input name="personnelType" placeholder="เช่น พนักงานประจำ" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800" />
              </label>
              <label class="space-y-1 text-xs font-bold text-slate-600">
                <span>รหัสเอกสาร</span>
                <input name="idCode" placeholder="เว้นว่างได้ ระบบจะสุ่มให้" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800" />
              </label>
              <label class="space-y-1 text-xs font-bold text-slate-600">
                <span>ประเภทเอกสาร</span>
                <input name="idType" placeholder="เช่น student_id" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800" />
              </label>
              <label class="space-y-1 text-xs font-bold text-slate-600">
                <span>แผนก / สาขา</span>
                <input name="department" placeholder="แผนกหรือสาขา" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800" />
              </label>
              <label class="space-y-1 text-xs font-bold text-slate-600">
                <span>ระดับชั้น</span>
                <input name="level" placeholder="เช่น ปวช." class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800" />
              </label>
              <label class="space-y-1 text-xs font-bold text-slate-600">
                <span>ห้องเรียน</span>
                <input name="classRoom" placeholder="เช่น 1/1" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800" />
              </label>
              <label class="space-y-1 text-xs font-bold text-slate-600">
                <span>หน่วยงาน / องค์กร</span>
                <input name="organization" placeholder="ชื่อหน่วยงาน" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800" />
              </label>
              <label class="space-y-1 text-xs font-bold text-slate-600">
                <span>LINE ID</span>
                <input name="lineId" placeholder="line id" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800" />
              </label>
              <label class="space-y-1 text-xs font-bold text-slate-600">
                <span>URL รูปโปรไฟล์</span>
                <input name="photoURL" placeholder="https://..." class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800" />
              </label>
              <label class="space-y-1 text-xs font-bold text-slate-600">
                <span>สถานะการยืนยัน</span>
                <select name="isVerified" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">
                  <option value="true">ยืนยันแล้ว</option>
                  <option value="false">ยังไม่ยืนยัน</option>
                </select>
              </label>
            </div>
            <label class="block space-y-1 text-xs font-bold text-slate-600">
              <span>ที่อยู่</span>
              <textarea name="address" rows="2" placeholder="ที่อยู่" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800"></textarea>
            </label>
            <label class="block space-y-1 text-xs font-bold text-slate-600">
              <span>หมายเหตุ</span>
              <textarea name="notes" rows="2" placeholder="หมายเหตุเพิ่มเติม" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-800"></textarea>
            </label>

            <button type="submit" class="w-full rounded-xl bg-sky-600 px-4 py-2 text-sm font-black text-white hover:bg-sky-700">บันทึกผู้ใช้ใหม่</button>
          </form>
        </div>
      </div>
    </div>
  `;
}

export function mountManageUsersView(container) {
  const root = container.querySelector("#manage-content") || container;
  const reloadBtn = root.querySelector("#usersReloadBtn");
  const qInput = root.querySelector("#usersSearchInput");
  const statusFilter = root.querySelector("#usersStatusFilter");
  const roleFilter = root.querySelector("#usersRoleFilter");
  const openCreateBtn = root.querySelector("#usersOpenCreateBtn");
  const createForm = root.querySelector("#usersCreateForm");
  const passwordInput = root.querySelector("#usersCreatePassword");
  const passwordToggle = root.querySelector("#usersCreatePasswordToggle");

  reloadBtn?.addEventListener("click", () => loadUsers(root));
  openCreateBtn?.addEventListener("click", () => openCreatePanel(root));
  root.querySelectorAll("[data-users-create-close]").forEach((el) => {
    el.addEventListener("click", () => closeCreatePanel(root));
  });
  passwordToggle?.addEventListener("click", () => {
    if (!passwordInput) return;
    passwordInput.type = passwordInput.type === "password" ? "text" : "password";
    syncPasswordVisibility(root);
  });
  syncPasswordVisibility(root);

  statusFilter?.addEventListener("change", (e) => {
    STATE.status = String(e.target.value || "all");
    loadUsers(root);
  });
  roleFilter?.addEventListener("change", (e) => {
    STATE.role = String(e.target.value || "all");
    loadUsers(root);
  });

  let searchTimer = 0;
  qInput?.addEventListener("input", (e) => {
    window.clearTimeout(searchTimer);
    searchTimer = window.setTimeout(() => {
      STATE.q = String(e.target.value || "").trim();
      loadUsers(root);
    }, 260);
  });

  createForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (STATE.creating) return;
    STATE.creating = true;
    try {
      const payload = readCreateForm(event.currentTarget);
      const res = await apiUsersManageCreate(payload);
      if (!res?.ok) throw new Error(res?.error || "สร้างผู้ใช้ไม่สำเร็จ");
      const pwd = res.data?.generatedPassword ? ` รหัสผ่านเริ่มต้น: ${res.data.generatedPassword}` : "";
      const idCode = res.data?.generatedIdCode ? ` idCode: ${res.data.generatedIdCode}` : "";
      showToast(`สร้างผู้ใช้สำเร็จ${pwd}${idCode}`);
      event.currentTarget.reset();
      closeCreatePanel(root);
      await loadUsers(root);
    } catch (err) {
      showToast(err?.message || "สร้างผู้ใช้ไม่สำเร็จ");
    } finally {
      STATE.creating = false;
    }
  });

  root.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-archive-uid]");
    if (!btn) return;
    const uid = btn.getAttribute("data-archive-uid");
    if (!uid) return;
    if (!window.confirm("ยืนยัน archive ผู้ใช้นี้?")) return;

    try {
      const res = await apiUsersManageArchive(uid);
      if (!res?.ok) throw new Error(res?.error || "archive ไม่สำเร็จ");
      showToast("archive สำเร็จ");
      loadUsers(root);
    } catch (err) {
      showToast(err?.message || "archive ไม่สำเร็จ");
    }
  });

  loadUsers(root);
}
