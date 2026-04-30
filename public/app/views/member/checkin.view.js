import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";
import {
  checkoutSession,
  fetchCheckinState,
  startCheckin,
  updateCheckinActivities,
} from "../../services/checkin.service.js";

const STATE = {
  loading: false,
  saving: false,
  checkingOut: false,
  session: null,
  runtime: null,
  access: null,
  selectedActivities: [],
  timerId: 0,
};

const ACTIVITY_OPTIONS = [
  { id: "borrow_return", label: "ยืม - คืนหนังสือ", icon: "book-up" },
  { id: "reading", label: "อ่านหนังสือ", icon: "book-open" },
  { id: "computer", label: "ใช้คอมพิวเตอร์", icon: "monitor" },
  { id: "relax", label: "นั่งพักผ่อน", icon: "coffee" },
];

function ensureNativeStyles_() {
  if (document.getElementById("memberCheckinNativeStyle")) return;
  const style = document.createElement("style");
  style.id = "memberCheckinNativeStyle";
  style.textContent = `
    :root {
      --safe-top: env(safe-area-inset-top, 0px);
      --safe-bottom: env(safe-area-inset-bottom, 0px);
    }
    .pressable {
      transition: transform 0.15s cubic-bezier(0.32, 0.72, 0, 1), opacity 0.15s ease, background-color 0.15s ease;
      cursor: pointer;
      user-select: none;
    }
    .pressable:active:not(:disabled) { transform: scale(0.96); opacity: 0.85; }
    .pressable:disabled { opacity: 0.55; cursor: not-allowed; }
    .touch-target { min-height: 48px; min-width: 48px; }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .tabular-timer { font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
    .skeleton-box {
      background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%);
      background-size: 200% 100%;
      animation: memberCheckinShimmer 1.5s infinite;
      border-radius: 12px;
    }
  `;
  document.head.appendChild(style);
}

function elapsedText(checkInAt) {
  const ms = Date.now() - new Date(String(checkInAt || "")).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "00:00:00";
  const sec = Math.floor(ms / 1000);
  return [Math.floor(sec / 3600), Math.floor((sec % 3600) / 60), sec % 60]
    .map((x) => String(x).padStart(2, "0"))
    .join(":");
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
    const el = root.querySelector("#memberCheckinElapsed");
    if (!el) return stopTicker();
    el.textContent = elapsedText(STATE.session.checkInAt);
  }, 1000);
}

function readSelectedActivities(root) {
  return Array.from(root.querySelectorAll('input[name="memberCheckinActivity"]:checked'))
    .map((el) => String(el.value || "").trim())
    .filter(Boolean);
}

function renderSteps(active) {
  const step1 = "bg-sky-600 text-white";
  const step2 = active ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500";
  return `
    <div class="flex items-center justify-between gap-2">
      <div class="flex flex-1 items-center gap-2">
        <div class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${step1}">1</div>
        <p class="text-xs font-black text-sky-700">เลือกกิจกรรม</p>
      </div>
      <div class="h-1 flex-1 rounded bg-slate-200">
        <div class="h-full rounded ${active ? "bg-emerald-400" : "bg-slate-200"}" style="width:${active ? "100" : "0"}%"></div>
      </div>
      <div class="flex flex-1 items-center justify-end gap-2">
        <p class="text-xs font-black ${active ? "text-emerald-700" : "text-slate-400"}">กำลังใช้งาน</p>
        <div class="flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${step2}">2</div>
      </div>
    </div>
  `;
}

function renderActivityGrid(selected) {
  return `
    <div class="grid grid-cols-2 gap-3 md:gap-4">
      ${ACTIVITY_OPTIONS.map((a) => {
    const checked = selected.includes(a.id);
    return `
          <label class="relative cursor-pointer pressable">
            <input type="checkbox" name="memberCheckinActivity" value="${escapeHtml(a.id)}" ${checked ? "checked" : ""} class="peer sr-only" />
            <div class="h-full rounded-[1.5rem] border-2 border-slate-100 bg-white p-4 text-slate-500 shadow-sm transition-all hover:border-slate-200 peer-checked:border-sky-300 peer-checked:bg-sky-50 peer-checked:text-sky-800">
              <div class="mb-2 flex items-start justify-between">
                <div class="rounded-xl bg-slate-50 p-2 text-slate-600 transition-colors peer-checked:bg-sky-100 peer-checked:text-sky-700">
                  <i data-lucide="${escapeHtml(a.icon)}" class="h-5 w-5"></i>
                </div>
                <i data-lucide="check-circle-2" class="h-5 w-5 text-sky-500 opacity-0 scale-50 transition-all peer-checked:opacity-100 peer-checked:scale-100"></i>
              </div>
              <p class="mt-2 text-sm font-black text-slate-800">${escapeHtml(a.label)}</p>
            </div>
          </label>
        `;
  }).join("")}
    </div>
  `;
}

function fmtTime_(value) {
  const d = new Date(String(value || ""));
  if (!Number.isFinite(d.getTime())) return "--:-- น.";
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }) + " น.";
}

function renderSkeleton_(active) {
  return `
    <div class="w-full md:max-w-[860px] lg:max-w-[1024px] bg-white md:rounded-[2.5rem] md:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] flex flex-col md:flex-row min-h-[620px] md:min-h-[640px] md:h-[80vh] relative overflow-hidden md:border border-slate-100 mx-auto">
      <div class="flex w-full md:w-[45%] lg:w-[40%] flex-col bg-white md:bg-slate-50/50 md:border-r border-slate-100">
        <div class="sticky top-0 z-20 bg-white/90 backdrop-blur-xl border-b border-slate-100" style="padding-top: max(1rem, var(--safe-top))">
          <div class="flex items-center justify-between px-5 pb-3 md:pt-5 md:px-8">
            <div class="skeleton-box h-10 w-10 rounded-full"></div>
            <div class="skeleton-box h-5 w-40 rounded-lg"></div>
            <div class="skeleton-box h-10 w-10 rounded-full"></div>
          </div>
        </div>
        <div class="p-5 md:px-8 space-y-4">
          <div class="skeleton-box h-20 w-full rounded-[1.5rem]"></div>
          <div class="skeleton-box h-16 w-full rounded-[1.5rem]"></div>
          ${active ? `<div class="skeleton-box h-40 w-full rounded-[1.75rem]"></div>` : ""}
        </div>
      </div>
      <div class="flex-1 p-5 md:p-8 space-y-4 bg-white">
        <div class="skeleton-box h-6 w-56 rounded-lg"></div>
        <div class="grid grid-cols-2 gap-3 md:gap-4">
          ${Array.from({ length: 4 }).map(() => `<div class="skeleton-box h-28 rounded-[1.5rem]"></div>`).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderBody(root) {
  const session = STATE.session;
  const active = session && String(session.status || "").toLowerCase() === "active";
  const selected = STATE.selectedActivities;
  const isClosed = STATE.access?.isOpenNow === false;
  const noActivities = selected.length === 0;
  const reason = new URLSearchParams(window.location.search || "").get("reason") || "";
  const showSelectServiceNotice = !active && reason === "select_service";

  if (STATE.loading) {
    root.innerHTML = `
      <section class="member-checkin-shell member-page-container view max-w-[1280px]">
        ${renderSkeleton_(active)}
      </section>
    `;
    window.lucide?.createIcons?.();
    return;
  }

  root.innerHTML = `
    <section class="member-checkin-shell member-page-container view max-w-[1280px]">
      <div class="w-full bg-white md:rounded-[2.5rem] md:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] flex flex-col md:flex-row relative overflow-hidden md:border border-slate-100 mx-auto">
        <div class="flex flex-col w-full md:w-[45%] lg:w-[40%] bg-white md:bg-slate-50/50 md:border-r border-slate-100 z-10 md:overflow-y-auto hide-scrollbar shrink-0">
          <header class="z-10 bg-white/90 md:bg-transparent border-b border-slate-100 md:border-none">
            <div class="flex items-center gap-3 px-5 py-4 md:px-8 md:pt-6">
              <div class="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700 border border-sky-100">
                <i data-lucide="qr-code" class="w-5 h-5"></i>
              </div>
              <h1 class="text-lg font-black text-slate-800 tracking-tight">เช็คอินห้องสมุด</h1>
            </div>
          </header>

          <div class="px-5 pb-6 md:px-8 md:pb-8 space-y-4">
            ${showSelectServiceNotice ? `
              <div class="rounded-[1.25rem] border border-amber-200 bg-amber-50 p-3.5 shadow-sm">
                <p class="text-xs font-black text-amber-800">กรุณาเลือกบริการ/กิจกรรมที่มาใช้งานก่อน แล้วจึงไปหน้าอื่นได้</p>
              </div>
            ` : ""}
            <div class="rounded-[1.75rem] border border-sky-100 bg-sky-50/70 p-4 shadow-sm">
              <div class="flex items-start gap-3">
                <div class="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm border border-sky-100">
                  <i data-lucide="clock" class="h-5 w-5"></i>
                </div>
                <div class="min-w-0">
                  <p class="text-[11px] font-black uppercase tracking-[0.16em] text-sky-700">เวลาทำการวันนี้</p>
                  <p class="mt-1 text-sm font-black text-slate-900">${escapeHtml((STATE.access?.openTime || "08:30"))} - ${escapeHtml((STATE.access?.closeTime || "16:30"))}</p>
                  <p class="mt-1 text-[11px] font-semibold ${isClosed ? "text-rose-600" : "text-emerald-600"}">${isClosed ? "ยังไม่เปิดให้บริการ" : "เปิดให้บริการ"}</p>
                </div>
              </div>
            </div>

            <div class="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
              ${renderSteps(active)}
            </div>

            <div class="${active ? "" : "hidden"} rounded-[2rem] bg-gradient-to-br from-sky-600 to-blue-700 p-5 text-white shadow-lg shadow-sky-500/20 relative overflow-hidden">
              <div class="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl"></div>
              <div class="relative z-10">
                <div class="flex items-center justify-between gap-3">
                  <div class="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black">
                    <span class="h-2 w-2 rounded-full bg-emerald-300"></span>
                    กำลังใช้งาน
                  </div>
                  <p class="text-xs font-bold text-white/80">เช็คอิน: ${escapeHtml(fmtTime_(STATE.session?.checkInAt))}</p>
                </div>
                <p id="memberCheckinElapsed" class="tabular-timer mt-4 text-5xl font-black tracking-tight drop-shadow-md">${escapeHtml(elapsedText(STATE.session?.checkInAt))}</p>
                <p class="mt-2 text-xs font-semibold text-white/80">ระบบจะนับเวลาให้โดยอัตโนมัติ</p>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col flex-1 bg-white px-5 pt-5 pb-24 md:p-8 md:pb-8">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-base md:text-lg font-black text-slate-800">เลือกกิจกรรมที่คุณกำลังทำ</h2>
              <p class="mt-1 text-[11px] font-semibold text-slate-500">เลือกได้มากกว่า 1 รายการ</p>
            </div>
            <div class="rounded-xl bg-slate-50 px-3 py-2 text-[10px] font-black text-slate-500 border border-slate-200">${escapeHtml(String(selected.length))} รายการ</div>
          </div>

          <div class="mt-4">
            ${renderActivityGrid(selected)}
            ${!active && noActivities ? '<p class="mt-3 text-xs font-black text-rose-600">กรุณาเลือกอย่างน้อย 1 กิจกรรม</p>' : ""}
          </div>

          <div class="mt-auto pt-6">
            <div class="sticky bottom-0 bg-white/95 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none border-t md:border-none border-slate-100 px-0 pt-4 md:pt-0 pb-2 md:pb-0 z-20 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] md:shadow-none">
              <div class="mx-auto md:mx-0 md:max-w-none max-w-[1024px] ${active ? "flex flex-col sm:flex-row gap-3" : ""}">
                ${active ? `
                  <button id="memberCheckinSaveActivitiesBtn" class="pressable touch-target flex-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 font-black text-sm rounded-full py-4 md:py-3.5 flex items-center justify-center gap-2 transition-all ${STATE.saving ? "opacity-60" : ""}" ${STATE.saving ? "disabled" : ""}>
                    <i data-lucide="save" class="w-4 h-4"></i> ${STATE.saving ? "กำลังอัปเดต..." : "บันทึกกิจกรรม"}
                  </button>
                  <button id="memberCheckinCheckoutBtn" class="pressable touch-target flex-1 bg-rose-600 hover:bg-rose-700 text-white font-black text-sm rounded-full py-4 md:py-3.5 shadow-lg shadow-rose-500/20 flex items-center justify-center gap-2 transition-all ${STATE.checkingOut ? "opacity-60" : ""}" ${STATE.checkingOut ? "disabled" : ""}>
                    <i data-lucide="log-out" class="w-4 h-4"></i> ${STATE.checkingOut ? "กำลังเช็คเอาท์..." : "เช็คเอาท์"}
                  </button>
                ` : `
                  <button id="memberCheckinStartBtn" class="pressable touch-target w-full bg-sky-600 hover:bg-sky-700 text-white font-black text-lg rounded-full py-4 shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all ${STATE.saving || isClosed || noActivities ? "opacity-60" : ""}" ${STATE.saving || isClosed || noActivities ? "disabled" : ""}>
                    <i data-lucide="${STATE.saving ? "loader-2" : "log-in"}" class="w-5 h-5 ${STATE.saving ? "animate-spin" : ""}"></i>
                    ${STATE.saving ? "กำลังเช็คอิน..." : (isClosed ? "ยังไม่เปิดให้บริการ" : (noActivities ? "เลือกกิจกรรมก่อน" : "เริ่มเช็คอินเข้าใช้"))}
                  </button>
                `}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;

  bindEvents(root);
  startTicker(root);
  window.lucide?.createIcons?.();
}

async function loadCurrent(root) {
  STATE.loading = true;
  try {
    const data = await fetchCheckinState();
    STATE.session = data.session || null;
    STATE.runtime = data.runtime || null;
    STATE.access = data.access || null;
    STATE.selectedActivities = Array.isArray(STATE.session?.activities) ? STATE.session.activities : [];
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
  root.querySelectorAll('input[name="memberCheckinActivity"]').forEach((input) => {
    input.addEventListener("change", () => {
      STATE.selectedActivities = readSelectedActivities(root);
      renderBody(root);
    });
  });

  root.querySelector("#memberCheckinStartBtn")?.addEventListener("click", async () => {
    if (STATE.saving) return;
    const activities = readSelectedActivities(root);
    if (activities.length === 0) return showToast("กรุณาเลือกกิจกรรมอย่างน้อย 1 รายการ");
    STATE.saving = true;
    renderBody(root);
    try {
      await startCheckin({ activities });
      showToast("เช็คอินสำเร็จ");
      await loadCurrent(root);
    } catch (err) {
      STATE.saving = false;
      showToast(err?.message || "เช็คอินไม่สำเร็จ");
      renderBody(root);
    }
  });

  root.querySelector("#memberCheckinSaveActivitiesBtn")?.addEventListener("click", async () => {
    if (STATE.saving || !STATE.session) return;
    STATE.saving = true;
    const activities = readSelectedActivities(root);
    renderBody(root);
    try {
      await updateCheckinActivities({ visitId: STATE.session.visitId, activities });
      showToast("อัปเดตกิจกรรมแล้ว");
      await loadCurrent(root);
    } catch (err) {
      STATE.saving = false;
      showToast(err?.message || "อัปเดตกิจกรรมไม่สำเร็จ");
      renderBody(root);
    }
  });

  root.querySelector("#memberCheckinCheckoutBtn")?.addEventListener("click", async () => {
    if (STATE.checkingOut || !STATE.session) return;
    if (!window.confirm("ยืนยันออกจากห้องสมุด?")) return;
    STATE.checkingOut = true;
    renderBody(root);
    try {
      await checkoutSession({ visitId: STATE.session.visitId });
      showToast("เช็คเอาท์เรียบร้อย");
      await loadCurrent(root);
    } catch (err) {
      STATE.checkingOut = false;
      showToast(err?.message || "เช็คเอาท์ไม่สำเร็จ");
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
  ensureNativeStyles_();
  STATE.loading = false;
  STATE.saving = false;
  STATE.checkingOut = false;
  STATE.session = null;
  STATE.runtime = null;
  STATE.access = null;
  STATE.selectedActivities = [];

  loadCurrent(root);
  window.addEventListener("beforeunload", () => stopTicker(), { once: true });
}
