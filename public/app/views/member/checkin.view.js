import {
  apiVisitsCheckinStart,
  apiVisitsCheckout,
  apiVisitsGetCurrent,
  apiVisitsUpdateActivities,
} from "../../data/api.js";
import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";

const STATE = {
  loading: false,
  saving: false,
  checkingOut: false,
  session: null,
  runtime: null,
  access: null,
  selectedActivities: [],
  timerId: 0,
  root: null,
};

const ACTIVITY_OPTIONS = [
  { id: "borrow", label: "ยืม-คืนหนังสือ" },
  { id: "study", label: "อ่านหนังสือ/ทำการบ้าน" },
  { id: "computer", label: "ใช้คอมพิวเตอร์" },
  { id: "relax", label: "พักผ่อน" },
  { id: "other", label: "อื่นๆ" },
];

function fmtDateTime(value) {
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

function elapsedText(checkInAt) {
  const ms = Date.now() - new Date(String(checkInAt || "")).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "00:00:00";
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600).toString().padStart(2, "0");
  const m = Math.floor((sec % 3600) / 60).toString().padStart(2, "0");
  const s = Math.floor(sec % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

function stopTicker() {
  if (STATE.timerId) {
    clearInterval(STATE.timerId);
    STATE.timerId = 0;
  }
}

function startTicker(root) {
  stopTicker();
  if (!STATE.session || String(STATE.session.status || "").toLowerCase() !== "active") return;
  STATE.timerId = window.setInterval(() => {
    const timer = root.querySelector("#memberCheckinElapsed");
    if (!timer) {
      stopTicker();
      return;
    }
    timer.textContent = elapsedText(STATE.session.checkInAt);
  }, 1000);
}

function readSelectedActivities(root) {
  const inputs = Array.from(root.querySelectorAll('input[name="memberCheckinActivity"]:checked'));
  return inputs.map((el) => String(el.value || "").trim()).filter(Boolean);
}

function renderActivitySelector(selected) {
  const picked = Array.isArray(selected) ? selected : [];
  return `
    <div class="grid gap-2 sm:grid-cols-2">
      ${ACTIVITY_OPTIONS.map((activity) => {
        const checked = picked.includes(activity.id);
        return `
          <label class="flex cursor-pointer items-center gap-2 rounded-xl border ${checked ? "border-sky-300 bg-sky-50" : "border-slate-200 bg-white"} px-3 py-2 text-sm font-bold text-slate-700">
            <input name="memberCheckinActivity" type="checkbox" value="${escapeHtml(activity.id)}" ${checked ? "checked" : ""} class="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-200" />
            <span>${escapeHtml(activity.label)}</span>
          </label>
        `;
      }).join("")}
    </div>
  `;
}

function renderBody(root) {
  if (!root) return;

  if (STATE.loading) {
    root.innerHTML = '<section class="rounded-3xl border border-slate-200 bg-white p-6 text-sm font-semibold text-slate-500">กำลังโหลดสถานะเช็คอิน...</section>';
    return;
  }

  const session = STATE.session;
  const hasActive = session && String(session.status || "").toLowerCase() === "active";

  if (!hasActive) {
    const isClosed = STATE.access && STATE.access.isOpenNow === false;
    const disabled = STATE.saving || isClosed;
    
    root.innerHTML = `
      <div class="space-y-4">
        ${isClosed ? `
          <section class="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
            <div class="flex items-center gap-3 text-rose-700">
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-200 text-lg">⚠️</span>
              <div>
                <h3 class="font-black">ห้องสมุดปิดทำการในขณะนี้</h3>
                <p class="text-xs font-bold opacity-80">
                  เวลาทำการวันนี้: ${STATE.access.openTime || "-"} - ${STATE.access.closeTime || "-"}
                </p>
              </div>
            </div>
          </section>
        ` : ""}

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 class="text-lg font-black text-slate-800">เช็คอินเข้าใช้ห้องสมุด</h2>
          <p class="mt-1 text-sm font-semibold text-slate-500">เลือกกิจกรรมที่คุณต้องการทำ แล้วกดเริ่มใช้งาน</p>
          <p class="mt-2 text-xs font-bold text-slate-400">สถานะระบบบังคับเช็คอิน: ${STATE.runtime?.enforceVisitRequired === false ? "ปิด" : "เปิด"}</p>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="mb-3 text-sm font-black text-slate-700">คุณมาทำอะไรวันนี้?</p>
          ${renderActivitySelector(STATE.selectedActivities)}
          <button id="memberCheckinStartBtn" type="button" class="mt-4 w-full rounded-2xl px-4 py-3 text-sm font-black ${disabled ? "bg-slate-300 text-slate-600" : "bg-sky-600 text-white"}" ${disabled ? "disabled" : ""}>
            ${isClosed ? "ยังไม่เปิดให้บริการ" : (disabled ? "กำลังบันทึก..." : "เริ่มเข้าใช้ห้องสมุด")}
          </button>
        </section>
      </div>
    `;
  } else {
    const activities = Array.isArray(STATE.selectedActivities) ? STATE.selectedActivities : [];
    root.innerHTML = `
      <div class="space-y-4">
        <section class="overflow-hidden rounded-3xl border border-slate-900 bg-slate-900 p-5 text-white shadow-sm">
          <p class="text-[11px] font-black uppercase tracking-widest text-sky-300">กำลังใช้งานห้องสมุด</p>
          <p id="memberCheckinElapsed" class="mt-2 text-4xl font-black tabular-nums">${escapeHtml(elapsedText(session.checkInAt))}</p>
          <p class="mt-2 text-xs font-semibold text-slate-300">เช็คอินเมื่อ ${escapeHtml(fmtDateTime(session.checkInAt))}</p>
        </section>

        <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="mb-3 flex items-center justify-between gap-2">
            <h3 class="text-sm font-black text-slate-800">กิจกรรมที่กำลังทำ</h3>
            <span class="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700">Session ${escapeHtml(session.visitId || "-")}</span>
          </div>
          ${renderActivitySelector(activities)}

          <div class="mt-4 grid gap-2 sm:grid-cols-2">
            <button id="memberCheckinSaveActivitiesBtn" type="button" class="rounded-xl px-4 py-3 text-sm font-black ${STATE.saving ? "bg-slate-300 text-slate-600" : "bg-sky-600 text-white"}" ${STATE.saving ? "disabled" : ""}>
              ${STATE.saving ? "กำลังบันทึก..." : "อัปเดตกิจกรรม"}
            </button>
            <button id="memberCheckinCheckoutBtn" type="button" class="rounded-xl px-4 py-3 text-sm font-black ${STATE.checkingOut ? "bg-slate-300 text-slate-600" : "bg-rose-600 text-white"}" ${STATE.checkingOut ? "disabled" : ""}>
              ${STATE.checkingOut ? "กำลังปิด session..." : "ออกจากห้องสมุด"}
            </button>
          </div>
        </section>
      </div>
    `;
  }

  bindEvents(root);
  startTicker(root);
}

async function loadCurrent(root) {
  STATE.loading = true;
  renderBody(root);
  try {
    const res = await apiVisitsGetCurrent();
    if (!res?.ok) throw new Error(res?.error || "โหลดสถานะเช็คอินไม่สำเร็จ");
    STATE.session = res.data?.session || null;
    STATE.runtime = res.data?.runtime || null;
    STATE.access = res.data?.access || null;
    const preset = Array.isArray(STATE.session?.activities) ? STATE.session.activities : [];
    STATE.selectedActivities = preset;
  } catch (err) {
    STATE.session = null;
    showToast(err?.message || "โหลดสถานะเช็คอินไม่สำเร็จ");
  } finally {
    STATE.loading = false;
    STATE.saving = false;
    STATE.checkingOut = false;
    renderBody(root);
  }
}

function bindEvents(root) {
  root.querySelector("#memberCheckinStartBtn")?.addEventListener("click", async () => {
    if (STATE.saving) return;
    STATE.saving = true;
    STATE.selectedActivities = readSelectedActivities(root);
    renderBody(root);
    try {
      const res = await apiVisitsCheckinStart({ activities: STATE.selectedActivities });
      if (!res?.ok) throw new Error(res?.error || "เช็คอินไม่สำเร็จ");
      showToast("เช็คอินสำเร็จ");
      await loadCurrent(root);
    } catch (err) {
      showToast(err?.message || "เช็คอินไม่สำเร็จ");
      STATE.saving = false;
      renderBody(root);
    }
  });

  root.querySelector("#memberCheckinSaveActivitiesBtn")?.addEventListener("click", async () => {
    if (STATE.saving || !STATE.session) return;
    const activities = readSelectedActivities(root);
    STATE.selectedActivities = activities;
    STATE.saving = true;
    renderBody(root);
    try {
      const res = await apiVisitsUpdateActivities({ visitId: STATE.session.visitId, activities });
      if (!res?.ok) throw new Error(res?.error || "อัปเดตกิจกรรมไม่สำเร็จ");
      showToast("อัปเดตกิจกรรมแล้ว");
      await loadCurrent(root);
    } catch (err) {
      showToast(err?.message || "อัปเดตกิจกรรมไม่สำเร็จ");
      STATE.saving = false;
      renderBody(root);
    }
  });

  root.querySelector("#memberCheckinCheckoutBtn")?.addEventListener("click", async () => {
    if (STATE.checkingOut || !STATE.session) return;
    if (!window.confirm("ยืนยันออกจากห้องสมุด?") ) return;
    STATE.checkingOut = true;
    renderBody(root);
    try {
      const res = await apiVisitsCheckout({ visitId: STATE.session.visitId });
      if (!res?.ok) throw new Error(res?.error || "ปิด session ไม่สำเร็จ");
      showToast("ออกจากห้องสมุดเรียบร้อย");
      await loadCurrent(root);
    } catch (err) {
      showToast(err?.message || "ปิด session ไม่สำเร็จ");
      STATE.checkingOut = false;
      renderBody(root);
    }
  });
}

export function renderMemberCheckinView() {
  return '<section id="memberCheckinRoot" class="view"></section>';
}

export function mountMemberCheckinView(container) {
  const root = container.querySelector("#memberCheckinRoot");
  if (!root) return;

  stopTicker();
  STATE.root = root;
  STATE.loading = false;
  STATE.saving = false;
  STATE.checkingOut = false;
  STATE.session = null;
  STATE.runtime = null;
  STATE.selectedActivities = [];

  loadCurrent(root);

  const cleanup = () => stopTicker();
  window.addEventListener("beforeunload", cleanup, { once: true });
}
