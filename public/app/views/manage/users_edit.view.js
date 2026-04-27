import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";
import { apiUsersManageGet, apiUsersManageUpdate } from "../../data/api.js";

const STATE = {
  loading: false,
  saving: false,
  user: null,
};

function getUidFromUrl() {
  const params = new URLSearchParams(window.location.search || "");
  return String(params.get("uid") || "").trim();
}

function setForm(form, user) {
  if (!form || !user) return;
  [
    "uid", "email", "displayName", "groupType", "role", "personnelType", "idCode", "idType",
    "department", "level", "classRoom", "organization", "status", "phone", "lineId", "address", "photoURL", "isVerified"
  ].forEach((key) => {
    if (form.elements[key]) form.elements[key].value = user[key] ?? "";
  });
}

function readForm(form) {
  const data = {};
  [
    "uid", "email", "displayName", "groupType", "role", "personnelType", "idCode", "idType",
    "department", "level", "classRoom", "organization", "status", "phone", "lineId", "address", "photoURL", "isVerified"
  ].forEach((key) => {
    data[key] = String(form.elements[key]?.value || "").trim();
  });
  return data;
}

async function loadUser(root) {
  const uid = getUidFromUrl();
  if (!uid) {
    showToast("ไม่พบ uid ใน URL");
    return;
  }

  STATE.loading = true;
  const form = root.querySelector("#userEditForm");
  const hint = root.querySelector("#userEditHint");
  if (hint) hint.textContent = "กำลังโหลดข้อมูล...";

  try {
    const res = await apiUsersManageGet(uid);
    if (!res?.ok) throw new Error(res?.error || "โหลดข้อมูลผู้ใช้ไม่สำเร็จ");
    STATE.user = res.data || null;
    setForm(form, STATE.user);
    if (hint) hint.textContent = `UID: ${uid}`;
  } catch (err) {
    showToast(err?.message || "โหลดข้อมูลผู้ใช้ไม่สำเร็จ");
    if (hint) hint.textContent = "ไม่สามารถโหลดข้อมูลได้";
  } finally {
    STATE.loading = false;
  }
}

export function renderManageUsersEditView() {
  const uid = getUidFromUrl();
  return `
    <div class="space-y-5 p-2 lg:p-4">
      <section class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-black text-slate-800">แก้ไขสมาชิก</h2>
            <p id="userEditHint" class="text-sm font-semibold text-slate-500">UID: ${escapeHtml(uid || "-")}</p>
          </div>
          <a data-link href="/manage/users" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">กลับไปรายการ</a>
        </div>
      </section>

      <form id="userEditForm" class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
        <div class="grid gap-3 md:grid-cols-2">
          <input name="uid" readonly class="rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm" />
          <input name="email" placeholder="email" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input name="displayName" placeholder="displayName" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input name="phone" placeholder="phone" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />

          <select name="groupType" class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">
            <option value="member">member</option>
            <option value="manage">manage</option>
          </select>
          <select name="role" class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">
            <option value="admin">admin</option>
            <option value="librarian">librarian</option>
            <option value="teacher">teacher</option>
            <option value="staff">staff</option>
            <option value="student">student</option>
            <option value="external">external</option>
          </select>

          <select name="status" class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">
            <option value="active">active</option>
            <option value="inactive">inactive</option>
            <option value="suspended">suspended</option>
          </select>
          <select name="isVerified" class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold">
            <option value="true">verified</option>
            <option value="false">not verified</option>
          </select>

          <input name="personnelType" placeholder="personnelType" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input name="idCode" placeholder="idCode" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input name="idType" placeholder="idType" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input name="department" placeholder="department" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input name="level" placeholder="level" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input name="classRoom" placeholder="classRoom" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input name="organization" placeholder="organization" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input name="lineId" placeholder="lineId" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input name="photoURL" placeholder="photoURL" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </div>
        <textarea name="address" rows="3" placeholder="address" class="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
        <button type="submit" class="mt-4 rounded-xl bg-sky-600 px-5 py-2 text-sm font-black text-white hover:bg-sky-700">บันทึกข้อมูล</button>
      </form>
    </div>
  `;
}

export function mountManageUsersEditView(container) {
  const root = container.querySelector("#manage-content") || container;
  const form = root.querySelector("#userEditForm");

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (STATE.saving) return;
    STATE.saving = true;
    try {
      const payload = readForm(event.currentTarget);
      const res = await apiUsersManageUpdate(payload);
      if (!res?.ok) throw new Error(res?.error || "บันทึกไม่สำเร็จ");
      showToast("บันทึกข้อมูลสำเร็จ");
      STATE.user = res.data;
      setForm(form, STATE.user);
    } catch (err) {
      showToast(err?.message || "บันทึกไม่สำเร็จ");
    } finally {
      STATE.saving = false;
    }
  });

  loadUser(root);
}
