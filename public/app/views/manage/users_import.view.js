import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";
import { apiUsersImportApply, apiUsersImportPreview } from "../../data/api.js";

const STATE = {
  rows: [],
  preview: [],
  summary: null,
  applying: false,
};

function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    const next = line[i + 1];
    if (ch === '"') {
      if (inQuote && next === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuote = !inQuote;
      }
      continue;
    }
    if (ch === "," && !inQuote) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((v) => String(v || "").trim());
}

function parseCsvText(text) {
  const lines = String(text || "")
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (!lines.length) return [];

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] || "";
    });
    return obj;
  });
  return rows;
}

function renderPreview(root) {
  const status = root.querySelector("#importStatus");
  const previewEl = root.querySelector("#importPreview");
  if (!status || !previewEl) return;

  if (!STATE.preview.length) {
    status.textContent = "ยังไม่มี preview";
    previewEl.innerHTML = '<div class="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm font-bold text-slate-500">อัปโหลดไฟล์ CSV แล้วกดตรวจสอบข้อมูล</div>';
    return;
  }

  const s = STATE.summary || { total: 0, ready: 0, conflicts: 0, errors: 0 };
  status.textContent = `ทั้งหมด ${s.total} | ready ${s.ready} | conflicts ${s.conflicts} | errors ${s.errors}`;

  previewEl.innerHTML = `
    <div class="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table class="min-w-full text-left text-xs">
        <thead class="bg-slate-50 font-black uppercase tracking-wide text-slate-500">
          <tr>
            <th class="px-2 py-2">#</th>
            <th class="px-2 py-2">Name</th>
            <th class="px-2 py-2">Email</th>
            <th class="px-2 py-2">Role</th>
            <th class="px-2 py-2">Mode</th>
            <th class="px-2 py-2">Errors</th>
          </tr>
        </thead>
        <tbody>
          ${STATE.preview.map((row) => {
            const u = row.user || {};
            const modeClass = row.mode === "ready"
              ? "text-emerald-700"
              : row.mode === "conflict"
                ? "text-amber-700"
                : "text-rose-700";
            return `
              <tr class="border-t border-slate-100">
                <td class="px-2 py-2">${row.index + 1}</td>
                <td class="px-2 py-2 font-semibold text-slate-700">${escapeHtml(u.displayName || "-")}</td>
                <td class="px-2 py-2">${escapeHtml(u.email || "-")}</td>
                <td class="px-2 py-2">${escapeHtml(u.role || "-")}</td>
                <td class="px-2 py-2 font-black ${modeClass}">${escapeHtml(row.mode || "-")}</td>
                <td class="px-2 py-2">${escapeHtml((row.errors || []).join("; ") || "-")}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function runPreview(root) {
  if (!STATE.rows.length) {
    showToast("ยังไม่มีข้อมูลให้นำเข้า");
    return;
  }
  try {
    const res = await apiUsersImportPreview(STATE.rows);
    if (!res?.ok) throw new Error(res?.error || "ตรวจสอบข้อมูลไม่สำเร็จ");
    STATE.preview = Array.isArray(res.data?.preview) ? res.data.preview : [];
    STATE.summary = res.data?.summary || null;
    renderPreview(root);
  } catch (err) {
    showToast(err?.message || "ตรวจสอบข้อมูลไม่สำเร็จ");
  }
}

export function renderManageUsersImportView() {
  return `
    <div class="space-y-5 p-2 lg:p-4">
      <section class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-black text-slate-800">Smart Import สมาชิก</h2>
            <p class="text-sm font-semibold text-slate-500">รองรับ CSV โดยต้องมี header ตาม schema เช่น email, displayName, role, groupType, phone ...</p>
          </div>
          <a data-link href="/manage/users" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-100">กลับไปรายการ</a>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
        <div class="flex flex-wrap items-center gap-2">
          <input id="usersImportFile" type="file" accept=".csv,text/csv" class="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <button id="usersImportPreviewBtn" class="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 hover:bg-sky-100">ตรวจสอบข้อมูล</button>
          <select id="usersImportMode" class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700">
            <option value="skip">เมื่อซ้ำ: skip</option>
            <option value="overwrite">เมื่อซ้ำ: overwrite</option>
          </select>
          <button id="usersImportApplyBtn" class="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700">ยืนยันนำเข้า</button>
        </div>
        <p class="mt-3 text-xs font-bold text-slate-500">ไฟล์ต้องเป็น UTF-8 CSV</p>
      </section>

      <section class="space-y-3">
        <div id="importStatus" class="text-xs font-black uppercase tracking-wider text-slate-500">ยังไม่มี preview</div>
        <div id="importPreview"></div>
      </section>
    </div>
  `;
}

export function mountManageUsersImportView(container) {
  const root = container.querySelector("#manage-content") || container;
  const fileInput = root.querySelector("#usersImportFile");
  const previewBtn = root.querySelector("#usersImportPreviewBtn");
  const applyBtn = root.querySelector("#usersImportApplyBtn");
  const modeEl = root.querySelector("#usersImportMode");

  fileInput?.addEventListener("change", async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      STATE.rows = parseCsvText(text);
      STATE.preview = [];
      STATE.summary = null;
      renderPreview(root);
      showToast(`โหลดไฟล์แล้ว ${STATE.rows.length} แถว`);
    } catch {
      STATE.rows = [];
      showToast("อ่านไฟล์ไม่สำเร็จ");
    }
  });

  previewBtn?.addEventListener("click", () => runPreview(root));

  applyBtn?.addEventListener("click", async () => {
    if (STATE.applying) return;
    if (!STATE.rows.length) {
      showToast("ยังไม่มีข้อมูลให้นำเข้า");
      return;
    }
    if (!window.confirm("ยืนยันนำเข้าข้อมูลสมาชิก?")) return;

    STATE.applying = true;
    try {
      const mode = String(modeEl?.value || "skip");
      const res = await apiUsersImportApply(STATE.rows, mode);
      if (!res?.ok) throw new Error(res?.error || "นำเข้าไม่สำเร็จ");
      const d = res.data || {};
      showToast(`นำเข้าเสร็จ inserted:${d.inserted || 0} updated:${d.updated || 0} skipped:${d.skipped || 0}`);
      await runPreview(root);
    } catch (err) {
      showToast(err?.message || "นำเข้าไม่สำเร็จ");
    } finally {
      STATE.applying = false;
    }
  });

  renderPreview(root);
}
