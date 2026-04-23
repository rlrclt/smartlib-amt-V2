import { GAS_URL } from "../../config.js";
import { showToast } from "../../components/toast.js";
import { apiSignupRequest } from "../../data/api.js";

const GROUP_ROLE_MAP = {
  manage: ["admin", "librarian"],
  member: ["student", "teacher", "staff", "external"],
};

const ROLE_DEFAULTS = {
  admin: { personnelType: "ผู้บริหาร", department: "งานบริหาร", idCode: "ADM" },
  librarian: { personnelType: "เจ้าหน้าที่", department: "งานห้องสมุด", idCode: "LIB" },
  teacher: { personnelType: "ข้าราชการ", department: "แผนกวิชาสามัญ", idCode: "TCH" },
  staff: { personnelType: "เจ้าหน้าที่", department: "งานธุรการ", idCode: "STF" },
  student: { level: "ปวช.", classRoom: "1/1", department: "สาขาวิชาคอมพิวเตอร์ธุรกิจ", idCode: "STD" },
  external: { idType: "nationalId", organization: "หน่วยงานภายนอก", idCode: "EXT" },
};

export function renderSignupTestView() {
  return `
    <section class="view min-h-screen bg-slate-50 px-4 py-24">
      <div class="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[520px_1fr]">
        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 class="text-2xl font-black text-slate-900">Test Signup</h1>
              <p class="mt-1 text-sm font-medium text-slate-500">เลือกแค่ <code>groupType → role</code> แล้วส่งทดสอบ</p>
            </div>
            <a href="/test-signin" data-link class="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-700 hover:bg-sky-100">Test Signin</a>
          </div>

          <form id="signupTestForm" class="grid gap-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <label class="grid gap-1.5">
                <span class="text-sm font-bold text-slate-700">groupType</span>
                <select name="groupType" id="signupGroupType" class="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100">
                  <option value="member">member</option>
                  <option value="manage">manage</option>
                </select>
              </label>

              <label class="grid gap-1.5">
                <span class="text-sm font-bold text-slate-700">role</span>
                <select name="role" id="signupRole" class="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"></select>
              </label>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <label class="grid gap-1.5">
                <span class="text-sm font-bold text-slate-700">ชื่อ-นามสกุล</span>
                <input name="displayName" type="text" required class="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100">
              </label>
              <label class="grid gap-1.5">
                <span class="text-sm font-bold text-slate-700">อีเมล</span>
                <input name="email" type="email" required class="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100">
              </label>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <label class="grid gap-1.5">
                <span class="text-sm font-bold text-slate-700">เบอร์โทร</span>
                <input name="phone" type="tel" required placeholder="0812345678" class="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100">
              </label>
              <label class="grid gap-1.5">
                <span class="text-sm font-bold text-slate-700">idCode</span>
                <input name="idCode" type="text" required class="rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100">
              </label>
            </div>

            <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
              ฟิลด์ตาม role เช่น <code>personnelType</code>, <code>idType</code>, <code>level/classRoom</code> จะถูก set ให้อัตโนมัติ
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <button id="signupTestFill" type="button" class="rounded-xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">เติมข้อมูลตัวอย่าง</button>
              <button id="signupTestSubmit" type="submit" class="rounded-xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:bg-sky-700">Signup Test</button>
            </div>
          </form>

          <div class="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div class="text-xs font-bold text-slate-500">GAS URL</div>
            <code id="signupTestGasUrl" class="mt-1 block overflow-hidden text-ellipsis whitespace-nowrap text-xs text-slate-600"></code>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h2 class="text-lg font-black text-slate-900">Request / Response</h2>
            <button id="signupTestClear" type="button" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">ล้าง</button>
          </div>
          <pre id="signupTestOutput" class="min-h-[520px] overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">{}</pre>
        </div>
      </div>
    </section>
  `;
}

export function mountSignupTestView(root) {
  if (!root) return;

  const form = root.querySelector("#signupTestForm");
  const submit = root.querySelector("#signupTestSubmit");
  const output = root.querySelector("#signupTestOutput");
  const gasUrl = root.querySelector("#signupTestGasUrl");
  const groupTypeSelect = root.querySelector("#signupGroupType");
  const roleSelect = root.querySelector("#signupRole");

  if (gasUrl) gasUrl.textContent = GAS_URL;

  const syncRoles = () => {
    const groupType = String(groupTypeSelect?.value || "member");
    const roles = GROUP_ROLE_MAP[groupType] || GROUP_ROLE_MAP.member;
    const current = roleSelect?.value;
    if (!roleSelect) return;
    roleSelect.innerHTML = roles.map((role) => `<option value="${role}">${role}</option>`).join("");
    if (current && roles.includes(current)) roleSelect.value = current;
  };

  const fill = () => fillSample(form);

  groupTypeSelect?.addEventListener("change", () => {
    syncRoles();
    fill();
  });

  roleSelect?.addEventListener("change", fill);

  root.querySelector("#signupTestFill")?.addEventListener("click", () => {
    fill();
    setOutput(output, { status: "sample-ready", request: collectPayload(form) });
  });

  root.querySelector("#signupTestClear")?.addEventListener("click", () => setOutput(output, {}));

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = collectPayload(form);
    setLoading(submit, true);
    setOutput(output, { status: "loading", action: "signup_request", request: payload });

    try {
      const response = await apiSignupRequest(payload);
      setOutput(output, { request: payload, response });
      showToast(response?.ok ? "signup test สำเร็จ" : response?.error || "signup test ไม่สำเร็จ");
    } catch (error) {
      const failure = { ok: false, error: String(error?.message || error) };
      setOutput(output, { request: payload, response: failure });
      showToast(failure.error);
    } finally {
      setLoading(submit, false);
    }
  });

  syncRoles();
  fill();
}

function collectPayload(form) {
  const formData = new FormData(form);
  const groupType = String(formData.get("groupType") || "member");
  const role = String(formData.get("role") || "student");
  const defaults = ROLE_DEFAULTS[role] || {};

  return {
    displayName: String(formData.get("displayName") || "").trim(),
    email: String(formData.get("email") || "").trim().toLowerCase(),
    phone: String(formData.get("phone") || "").replace(/\D/g, ""),
    groupType,
    role,
    idCode: String(formData.get("idCode") || "").trim(),
    department: defaults.department || "",
    personnelType: defaults.personnelType || "",
    level: defaults.level || "",
    classRoom: defaults.classRoom || "",
    idType: defaults.idType || "",
    organization: defaults.organization || "",
    status: "pending",
    isVerified: false,
    photoURL: "/assets/img/default-avatar.png",
  };
}

function fillSample(form) {
  if (!form) return;
  const role = String(form.elements.role?.value || "student");
  const defaults = ROLE_DEFAULTS[role] || {};
  const stamp = Date.now().toString().slice(-8);

  form.elements.displayName.value = `Test ${role} ${stamp}`;
  form.elements.email.value = `smartlib.${role}.${stamp}@gmail.com`;
  form.elements.phone.value = "0812345678";
  form.elements.idCode.value = `${defaults.idCode || "USR"}${stamp}`;
}

function setLoading(button, loading) {
  if (!button) return;
  button.disabled = loading;
  button.textContent = loading ? "กำลัง Signup..." : "Signup Test";
}

function setOutput(output, value) {
  if (!output) return;
  output.textContent = JSON.stringify(value, null, 2);
}
