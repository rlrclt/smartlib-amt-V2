import { showToast } from "../../components/toast.js";
import {
  apiSettingsLibraryExceptionsDelete,
  apiSettingsLibraryExceptionsList,
  apiSettingsLibraryExceptionsUpsert,
  apiSettingsLibraryHoursList,
  apiSettingsLibraryHoursUpsert,
  apiSettingsLibraryRuntimeGet,
  apiSettingsLibraryRuntimeUpsert,
  apiVisitsActiveCount,
} from "../../data/api.js";

const DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];

const STATE = {
  loading: false,
  savingHours: false,
  savingRuntime: false,
  activeVisitors: 0,
  hours: [],
  exceptions: [],
  runtime: {
    enforceVisitRequired: true,
    autoCloseEnabled: true,
    autoCloseAfterMinutes: 15,
    timezone: "Asia/Bangkok",
  },
};

function defaultHours() {
  return DAYS.map((_name, dayOfWeek) => ({
    dayOfWeek,
    openTime: "08:30",
    closeTime: "16:30",
    isOpen: dayOfWeek > 0 && dayOfWeek < 6,
  }));
}

function renderHoursRows() {
  const rows = STATE.hours.length ? STATE.hours : defaultHours();
  return rows
    .sort((a, b) => Number(a.dayOfWeek || 0) - Number(b.dayOfWeek || 0))
    .map((row) => `
      <tr class="border-b border-slate-100">
        <td class="px-3 py-2 text-xs font-black text-slate-700">${DAYS[Number(row.dayOfWeek || 0)]}</td>
        <td class="px-3 py-2 text-center"><input type="checkbox" data-hour-open="${row.dayOfWeek}" ${row.isOpen ? "checked" : ""} class="h-4 w-4 rounded border-slate-300 text-sky-600" /></td>
        <td class="px-3 py-2"><input type="time" data-hour-open-time="${row.dayOfWeek}" value="${row.openTime || ""}" class="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm" /></td>
        <td class="px-3 py-2"><input type="time" data-hour-close-time="${row.dayOfWeek}" value="${row.closeTime || ""}" class="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm" /></td>
      </tr>
    `).join("");
}

function renderExceptionsRows() {
  if (!STATE.exceptions.length) {
    return '<tr><td colspan="5" class="px-3 py-4 text-center text-xs font-semibold text-slate-500">ยังไม่มีวันพิเศษ</td></tr>';
  }

  return STATE.exceptions
    .slice()
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")))
    .map((item) => `
      <tr class="border-b border-slate-100">
        <td class="px-3 py-2 text-xs font-black text-slate-700">${item.date || "-"}</td>
        <td class="px-3 py-2 text-xs font-semibold text-slate-700">${item.newOpenTime || "-"}</td>
        <td class="px-3 py-2 text-xs font-semibold text-slate-700">${item.newCloseTime || "-"}</td>
        <td class="px-3 py-2 text-xs font-semibold text-slate-600">${item.reason || "-"}</td>
        <td class="px-3 py-2 text-right">
          <button type="button" data-exception-delete="${item.date}" class="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-black text-rose-700">ลบ</button>
        </td>
      </tr>
    `).join("");
}

function renderBody(root) {
  if (!root) return;

  if (STATE.loading) {
    root.innerHTML = '<section class="rounded-3xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500">กำลังโหลดข้อมูลเวลาทำการ...</section>';
    return;
  }

  root.innerHTML = `
    <div class="space-y-4 p-2 lg:p-4">
      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-xl font-black text-slate-800">ตั้งค่าเวลาเปิด-ปิดห้องสมุด</h2>
            <p class="text-sm font-semibold text-slate-500">กำหนดเวลาทำการรายวัน วันพิเศษ และการปิด session อัตโนมัติ</p>
          </div>
          <a data-link href="/manage/checkin-qr" class="rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-xs font-black text-fuchsia-700 hover:bg-fuchsia-100">พิมพ์ QR เช็คอิน</a>
          <div class="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-center">
            <p class="text-[11px] font-black uppercase tracking-widest text-cyan-700">ผู้ใช้ในห้องสมุดตอนนี้</p>
            <p class="mt-1 text-3xl font-black text-cyan-900">${Number(STATE.activeVisitors || 0).toLocaleString("th-TH")}</p>
          </div>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="mb-3 flex items-center justify-between gap-2">
          <h3 class="text-sm font-black text-slate-800">เวลาทำการปกติ</h3>
          <button id="libraryHoursSaveBtn" type="button" class="rounded-xl px-3 py-2 text-xs font-black ${STATE.savingHours ? "bg-slate-300 text-slate-600" : "bg-sky-600 text-white"}" ${STATE.savingHours ? "disabled" : ""}>${STATE.savingHours ? "กำลังบันทึก..." : "บันทึกเวลาทำการ"}</button>
        </div>
        <div class="overflow-x-auto rounded-2xl border border-slate-200">
          <table class="min-w-full bg-white text-left">
            <thead class="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th class="px-3 py-2">วัน</th>
                <th class="px-3 py-2 text-center">เปิดใช้งาน</th>
                <th class="px-3 py-2">เปิด</th>
                <th class="px-3 py-2">ปิด</th>
              </tr>
            </thead>
            <tbody>${renderHoursRows()}</tbody>
          </table>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="mb-3 flex items-center justify-between gap-2">
          <h3 class="text-sm font-black text-slate-800">วันพิเศษ (Exceptions)</h3>
        </div>

        <form id="libraryExceptionForm" class="grid gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-5">
          <input required name="date" type="date" class="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm" />
          <input name="newOpenTime" type="time" class="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm" />
          <input name="newCloseTime" type="time" class="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm" />
          <input name="reason" type="text" maxlength="160" placeholder="เหตุผล" class="rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm sm:col-span-2 lg:col-span-1" />
          <button type="submit" class="rounded-lg bg-amber-500 px-3 py-2 text-sm font-black text-white hover:bg-amber-600">เพิ่ม/แก้ไข</button>
        </form>

        <div class="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
          <table class="min-w-full bg-white text-left">
            <thead class="bg-slate-50 text-xs font-black uppercase tracking-wide text-slate-500">
              <tr>
                <th class="px-3 py-2">วันที่</th>
                <th class="px-3 py-2">เวลาเปิดใหม่</th>
                <th class="px-3 py-2">เวลาปิดใหม่</th>
                <th class="px-3 py-2">เหตุผล</th>
                <th class="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody id="libraryExceptionRows">${renderExceptionsRows()}</tbody>
          </table>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 class="mb-3 text-sm font-black text-slate-800">Runtime & Automation</h3>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
            <input id="libraryRuntimeRequireVisit" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-sky-600" ${STATE.runtime.enforceVisitRequired ? "checked" : ""} />
            บังคับเช็คอินก่อนใช้งาน /app/loan-self
          </label>
          <label class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
            <input id="libraryRuntimeAutoClose" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-sky-600" ${STATE.runtime.autoCloseEnabled ? "checked" : ""} />
            เปิดระบบปิด session อัตโนมัติ
          </label>
          <label class="block text-xs font-black uppercase tracking-widest text-slate-500">
            ปิดอัตโนมัติหลังเวลาปิด (นาที)
            <input id="libraryRuntimeAutoCloseMinutes" type="number" min="0" max="720" step="1" value="${Number(STATE.runtime.autoCloseAfterMinutes || 0)}" class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700" />
          </label>
          <label class="block text-xs font-black uppercase tracking-widest text-slate-500">
            Timezone
            <input id="libraryRuntimeTimezone" type="text" value="${STATE.runtime.timezone || "Asia/Bangkok"}" class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700" />
          </label>
        </div>

        <button id="libraryRuntimeSaveBtn" type="button" class="mt-3 rounded-xl px-4 py-2 text-sm font-black ${STATE.savingRuntime ? "bg-slate-300 text-slate-600" : "bg-slate-900 text-white"}" ${STATE.savingRuntime ? "disabled" : ""}>${STATE.savingRuntime ? "กำลังบันทึก..." : "บันทึก Runtime"}</button>
      </section>
    </div>
  `;

  bindEvents(root);
}

function collectHoursFromDom(root) {
  const rows = [];
  for (let day = 0; day <= 6; day += 1) {
    const isOpen = root.querySelector(`[data-hour-open="${day}"]`)?.checked === true;
    let openTime = String(root.querySelector(`[data-hour-open-time="${day}"]`)?.value || "").trim();
    let closeTime = String(root.querySelector(`[data-hour-close-time="${day}"]`)?.value || "").trim();

    // ป้องกันค่าว่างส่งไปติด Regex ของ Backend (ใช้ค่า default หากไม่ได้กรอก)
    if (!openTime) openTime = "00:00";
    if (!closeTime) closeTime = "00:00";

    rows.push({ dayOfWeek: day, openTime, closeTime, isOpen });
  }
  return rows;
}

async function loadAll(root) {
  STATE.loading = true;
  renderBody(root);
  try {
    const [hoursRes, excRes, runtimeRes, activeRes] = await Promise.all([
      apiSettingsLibraryHoursList(),
      apiSettingsLibraryExceptionsList(),
      apiSettingsLibraryRuntimeGet(),
      apiVisitsActiveCount(),
    ]);

    if (!hoursRes?.ok) throw new Error(hoursRes?.error || "โหลดเวลาทำการไม่สำเร็จ");
    if (!excRes?.ok) throw new Error(excRes?.error || "โหลดวันพิเศษไม่สำเร็จ");
    if (!runtimeRes?.ok) throw new Error(runtimeRes?.error || "โหลด runtime ไม่สำเร็จ");

    STATE.hours = Array.isArray(hoursRes.data?.items) ? hoursRes.data.items : defaultHours();
    STATE.exceptions = Array.isArray(excRes.data?.items) ? excRes.data.items : [];
    STATE.runtime = runtimeRes.data || STATE.runtime;
    STATE.activeVisitors = activeRes?.ok ? Number(activeRes.data?.activeCount || 0) : 0;
  } catch (err) {
    showToast(err?.message || "โหลดข้อมูลไม่สำเร็จ");
    STATE.hours = defaultHours();
    STATE.exceptions = [];
  } finally {
    STATE.loading = false;
    STATE.savingHours = false;
    STATE.savingRuntime = false;
    renderBody(root);
  }
}

function bindEvents(root) {
  root.querySelector("#libraryHoursSaveBtn")?.addEventListener("click", async () => {
    if (STATE.savingHours) return;
    
    // Collect data BEFORE re-rendering, because re-rendering replaces the DOM elements
    const items = collectHoursFromDom(root);
    
    STATE.savingHours = true;
    renderBody(root);
    
    try {
      const res = await apiSettingsLibraryHoursUpsert(items);
      if (!res?.ok) throw new Error(res?.error || "บันทึกเวลาทำการไม่สำเร็จ");
      showToast("บันทึกเวลาทำการแล้ว");
      await loadAll(root);
    } catch (err) {
      showToast(err?.message || "บันทึกเวลาทำการไม่สำเร็จ");
      STATE.savingHours = false;
      renderBody(root);
    }
  });

  root.querySelector("#libraryExceptionForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = {
      date: String(form.elements.date.value || "").trim(),
      newOpenTime: String(form.elements.newOpenTime.value || "").trim(),
      newCloseTime: String(form.elements.newCloseTime.value || "").trim(),
      reason: String(form.elements.reason.value || "").trim(),
    };

    try {
      const res = await apiSettingsLibraryExceptionsUpsert(payload);
      if (!res?.ok) throw new Error(res?.error || "บันทึกวันพิเศษไม่สำเร็จ");
      showToast("บันทึกวันพิเศษแล้ว");
      form.reset();
      await loadAll(root);
    } catch (err) {
      showToast(err?.message || "บันทึกวันพิเศษไม่สำเร็จ");
    }
  });

  root.querySelector("#libraryExceptionRows")?.addEventListener("click", async (event) => {
    const btn = event.target.closest("button[data-exception-delete]");
    if (!btn) return;
    const date = String(btn.getAttribute("data-exception-delete") || "").trim();
    if (!date) return;
    if (!window.confirm(`ลบวันพิเศษ ${date} ?`)) return;

    try {
      const res = await apiSettingsLibraryExceptionsDelete(date);
      if (!res?.ok) throw new Error(res?.error || "ลบวันพิเศษไม่สำเร็จ");
      showToast("ลบวันพิเศษแล้ว");
      await loadAll(root);
    } catch (err) {
      showToast(err?.message || "ลบวันพิเศษไม่สำเร็จ");
    }
  });

  root.querySelector("#libraryRuntimeSaveBtn")?.addEventListener("click", async () => {
    if (STATE.savingRuntime) return;
    STATE.savingRuntime = true;
    renderBody(root);

    try {
      const payload = {
        enforceVisitRequired: root.querySelector("#libraryRuntimeRequireVisit")?.checked === true,
        autoCloseEnabled: root.querySelector("#libraryRuntimeAutoClose")?.checked === true,
        autoCloseAfterMinutes: Number(root.querySelector("#libraryRuntimeAutoCloseMinutes")?.value || 0),
        timezone: String(root.querySelector("#libraryRuntimeTimezone")?.value || "Asia/Bangkok").trim() || "Asia/Bangkok",
      };
      const res = await apiSettingsLibraryRuntimeUpsert(payload);
      if (!res?.ok) throw new Error(res?.error || "บันทึก runtime ไม่สำเร็จ");
      showToast("บันทึก runtime แล้ว");
      await loadAll(root);
    } catch (err) {
      showToast(err?.message || "บันทึก runtime ไม่สำเร็จ");
      STATE.savingRuntime = false;
      renderBody(root);
    }
  });
}

export function renderManageLibrarySettingsView() {
  return '<section id="manageLibrarySettingsRoot" class="view"></section>';
}

export function mountManageLibrarySettingsView(container) {
  const root = container.querySelector("#manageLibrarySettingsRoot") || container;
  if (!root) return;

  STATE.loading = false;
  STATE.savingHours = false;
  STATE.savingRuntime = false;
  STATE.hours = [];
  STATE.exceptions = [];
  STATE.activeVisitors = 0;

  loadAll(root);
}
