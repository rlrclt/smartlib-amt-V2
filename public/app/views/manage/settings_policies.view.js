import { showToast } from "../../components/toast.js";
import {
  apiPoliciesList,
  apiPoliciesResetDefaults,
  apiPoliciesUpsert,
} from "../../data/api.js";

const STATE = {
  loading: false,
  saving: false,
  items: [],
};

function renderRows(root) {
  const tbody = root.querySelector("#policyRows");
  if (!tbody) return;

  if (STATE.loading) {
    tbody.innerHTML = '<tr><td colspan="8" class="px-3 py-6 text-center text-sm font-bold text-slate-500">กำลังโหลดนโยบาย...</td></tr>';
    return;
  }

  if (!STATE.items.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="px-3 py-6 text-center text-sm font-bold text-slate-500">ยังไม่มีนโยบาย</td></tr>';
    return;
  }

  tbody.innerHTML = STATE.items.map((item) => `
    <tr class="border-b border-slate-100">
      <td class="px-3 py-3 text-xs font-black uppercase text-slate-700">${item.role}</td>
      <td class="px-3 py-3"><input data-field="loanQuota" data-role="${item.role}" type="number" min="1" max="200" value="${item.loanQuota}" class="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm" /></td>
      <td class="px-3 py-3"><input data-field="loanDays" data-role="${item.role}" type="number" min="1" max="365" value="${item.loanDays}" class="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm" /></td>
      <td class="px-3 py-3 text-center"><input data-field="canRenew" data-role="${item.role}" type="checkbox" ${item.canRenew ? "checked" : ""} class="h-4 w-4" /></td>
      <td class="px-3 py-3"><input data-field="renewLimit" data-role="${item.role}" type="number" min="0" max="20" value="${item.renewLimit}" class="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm" /></td>
      <td class="px-3 py-3"><input data-field="resQuota" data-role="${item.role}" type="number" min="1" max="20" value="${item.resQuota || 3}" class="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm" /></td>
      <td class="px-3 py-3"><input data-field="holdDays" data-role="${item.role}" type="number" min="1" max="14" value="${item.holdDays || 2}" class="w-20 rounded-lg border border-slate-200 px-2 py-1 text-sm" /></td>
      <td class="px-3 py-3 text-xs font-semibold text-slate-500">${new Date(item.updatedAt || "").toLocaleString("th-TH") || "-"}</td>
    </tr>
  `).join("");
}

async function loadPolicies(root) {
  STATE.loading = true;
  renderRows(root);
  try {
    const res = await apiPoliciesList();
    if (!res?.ok) throw new Error(res?.error || "โหลดนโยบายไม่สำเร็จ");
    STATE.items = Array.isArray(res.data?.items) ? res.data.items : [];
  } catch (err) {
    STATE.items = [];
    showToast(err?.message || "โหลดนโยบายไม่สำเร็จ");
  } finally {
    STATE.loading = false;
    renderRows(root);
  }
}

function collectPolicies(root) {
  return STATE.items.map((item) => {
    const role = item.role;
    const quota = root.querySelector(`[data-field=\"loanQuota\"][data-role=\"${role}\"]`);
    const days = root.querySelector(`[data-field=\"loanDays\"][data-role=\"${role}\"]`);
    const canRenew = root.querySelector(`[data-field=\"canRenew\"][data-role=\"${role}\"]`);
    const renewLimit = root.querySelector(`[data-field=\"renewLimit\"][data-role=\"${role}\"]`);
    const resQuota = root.querySelector(`[data-field=\"resQuota\"][data-role=\"${role}\"]`);
    const holdDays = root.querySelector(`[data-field=\"holdDays\"][data-role=\"${role}\"]`);

    return {
      role,
      loanQuota: Number(quota?.value || item.loanQuota || 1),
      loanDays: Number(days?.value || item.loanDays || 1),
      canRenew: Boolean(canRenew?.checked),
      renewLimit: Number(renewLimit?.value || item.renewLimit || 0),
      resQuota: Number(resQuota?.value || item.resQuota || 3),
      holdDays: Number(holdDays?.value || item.holdDays || 2),
    };
  });
}

export function renderManageSettingsPoliciesView() {
  return `
    <div class="space-y-6 p-2 lg:p-4">
      <section class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
        <h2 class="text-xl font-black text-slate-800">นโยบายการยืม (Policies)</h2>
        <p class="text-sm font-semibold text-slate-500">ตั้งค่า quota / จำนวนวันยืม / สิทธิ์ต่ออายุ แยกตาม role</p>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
        <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-base font-black text-slate-800">ตารางนโยบาย</h3>
          <div class="flex gap-2">
            <button id="policyReloadBtn" type="button" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 hover:bg-slate-100">รีโหลด</button>
            <button id="policyResetBtn" type="button" class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700 hover:bg-amber-100">รีเซ็ตค่าเริ่มต้น</button>
            <button id="policySaveBtn" type="button" class="rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white hover:bg-sky-700">บันทึกทั้งหมด</button>
          </div>
        </div>

        <div class="overflow-x-auto rounded-2xl border border-slate-200">
          <table class="min-w-full bg-white text-left">
            <thead class="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th class="px-3 py-3">บทบาท</th>
                <th class="px-3 py-3">โควตายืม</th>
                <th class="px-3 py-3">จำนวนวันยืม</th>
                <th class="px-3 py-3 text-center">ต่ออายุได้</th>
                <th class="px-3 py-3">จำนวนครั้งที่ต่อได้</th>
                <th class="px-3 py-3">โควตาจอง</th>
                <th class="px-3 py-3">จำนวนวันจอง</th>
                <th class="px-3 py-3">อัปเดตล่าสุด</th>
              </tr>
            </thead>
            <tbody id="policyRows"></tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

export function mountManageSettingsPoliciesView(container) {
  const root = container.querySelector("#manage-content") || container;
  const reloadBtn = root.querySelector("#policyReloadBtn");
  const saveBtn = root.querySelector("#policySaveBtn");
  const resetBtn = root.querySelector("#policyResetBtn");

  reloadBtn?.addEventListener("click", () => {
    loadPolicies(root);
  });

  saveBtn?.addEventListener("click", async () => {
    if (STATE.saving) return;
    STATE.saving = true;
    try {
      const payload = collectPolicies(root);
      const res = await apiPoliciesUpsert(payload);
      if (!res?.ok) throw new Error(res?.error || "บันทึกนโยบายไม่สำเร็จ");
      showToast("บันทึกนโยบายเรียบร้อยแล้ว");
      await loadPolicies(root);
    } catch (err) {
      showToast(err?.message || "บันทึกนโยบายไม่สำเร็จ");
    } finally {
      STATE.saving = false;
    }
  });

  resetBtn?.addEventListener("click", async () => {
    if (STATE.saving) return;
    if (!window.confirm("ยืนยันรีเซ็ตนโยบายกลับค่าเริ่มต้น?")) return;

    STATE.saving = true;
    try {
      const res = await apiPoliciesResetDefaults();
      if (!res?.ok) throw new Error(res?.error || "รีเซ็ตนโยบายไม่สำเร็จ");
      showToast("รีเซ็ตนโยบายเรียบร้อยแล้ว");
      await loadPolicies(root);
    } catch (err) {
      showToast(err?.message || "รีเซ็ตนโยบายไม่สำเร็จ");
    } finally {
      STATE.saving = false;
    }
  });

  loadPolicies(root);
}
