import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";

const STATE = {
  size: 360,
  title: "เช็คอินเข้าใช้ห้องสมุด",
  subtitle: "กรุณาสแกนก่อนเข้าใช้งานพื้นที่ห้องสมุด",
  locationId: "",
};

function buildCheckinUrl() {
  const origin = window.location.origin || "";
  const base = `${origin}/app/checkin`;
  const locationId = String(STATE.locationId || "").trim();
  if (!locationId) return base;
  const qs = new URLSearchParams({ locationId });
  return `${base}?${qs.toString()}`;
}

function buildQrImageUrl(targetUrl) {
  const size = Math.max(200, Math.min(1200, Number(STATE.size || 360)));
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=16&data=${encodeURIComponent(targetUrl)}`;
}

function printTemplateHtml() {
  const targetUrl = buildCheckinUrl();
  const qrUrl = buildQrImageUrl(targetUrl);

  return `
    <div class="print-card mx-auto w-full max-w-[700px] rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p class="text-center text-xs font-black uppercase tracking-[0.2em] text-sky-600">ANT LIBRARY</p>
      <h2 class="mt-2 text-center text-3xl font-black text-slate-900">${escapeHtml(STATE.title)}</h2>
      <p class="mt-2 text-center text-sm font-semibold text-slate-500">${escapeHtml(STATE.subtitle)}</p>

      <div class="mt-5 flex justify-center">
        <img src="${escapeHtml(qrUrl)}" alt="Check-in QR" class="h-auto w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-3" loading="eager" />
      </div>

      <div class="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
        <p class="text-[11px] font-black uppercase tracking-widest text-slate-500">ลิงก์ปลายทาง</p>
        <p class="mt-1 break-all text-xs font-semibold text-slate-700">${escapeHtml(targetUrl)}</p>
      </div>

      <ol class="mt-4 list-decimal space-y-1 pl-5 text-sm font-semibold text-slate-700">
        <li>เปิดกล้องมือถือแล้วสแกน QR นี้</li>
        <li>เข้าสู่ระบบสมาชิก</li>
        <li>เลือกกิจกรรมและกดเช็คอิน</li>
      </ol>
    </div>
  `;
}

function renderBody(root) {
  const targetUrl = buildCheckinUrl();
  const qrUrl = buildQrImageUrl(targetUrl);

  root.innerHTML = `
    <style>
      @media print {
        body * { visibility: hidden !important; }
        #manageCheckinQrRoot, #manageCheckinQrRoot * { visibility: visible !important; }
        #manageCheckinQrRoot { position: static !important; inset: auto !important; padding: 0 !important; margin: 0 !important; }
        [data-qr-controls] { display: none !important; }
        .print-card { border: 0 !important; box-shadow: none !important; border-radius: 0 !important; max-width: none !important; }
      }
    </style>

    <div class="space-y-4 p-2 lg:p-4">
      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm" data-qr-controls>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 class="text-xl font-black text-slate-800">พิมพ์ QR เช็คอินห้องสมุด</h2>
            <p class="text-sm font-semibold text-slate-500">สร้างป้าย QR สำหรับหน้า <code>/app/checkin</code> พร้อมพิมพ์ทันที</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <button id="manageCheckinQrCopyUrlBtn" type="button" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">คัดลอกลิงก์</button>
            <button id="manageCheckinQrPrintBtn" type="button" class="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-800">พิมพ์ป้าย QR</button>
          </div>
        </div>

        <div class="mt-4 grid gap-3 md:grid-cols-2">
          <label class="block text-xs font-black uppercase tracking-widest text-slate-500">
            หัวข้อป้าย
            <input id="manageCheckinQrTitle" type="text" value="${escapeHtml(STATE.title)}" maxlength="120" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700" />
          </label>
          <label class="block text-xs font-black uppercase tracking-widest text-slate-500">
            คำอธิบาย
            <input id="manageCheckinQrSubtitle" type="text" value="${escapeHtml(STATE.subtitle)}" maxlength="160" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700" />
          </label>
          <label class="block text-xs font-black uppercase tracking-widest text-slate-500">
            Location ID (ไม่บังคับ)
            <input id="manageCheckinQrLocationId" type="text" value="${escapeHtml(STATE.locationId)}" maxlength="40" placeholder="เช่น LOC-001" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700" />
          </label>
          <label class="block text-xs font-black uppercase tracking-widest text-slate-500">
            ขนาด QR (px)
            <input id="manageCheckinQrSize" type="number" min="200" max="1200" step="10" value="${Number(STATE.size || 360)}" class="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700" />
          </label>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="mb-3 flex items-center justify-between gap-2" data-qr-controls>
          <h3 class="text-sm font-black text-slate-800">Preview</h3>
          <a data-link href="/app/checkin" target="_blank" rel="noopener" class="rounded-lg border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-black text-sky-700 hover:bg-sky-100">เปิดหน้าเช็คอิน</a>
        </div>

        ${printTemplateHtml()}

        <div class="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3" data-qr-controls>
          <p class="text-xs font-black text-slate-700">Direct QR URL</p>
          <p class="mt-1 break-all text-xs font-semibold text-slate-500">${escapeHtml(qrUrl)}</p>
        </div>
      </section>
    </div>
  `;

  bindEvents(root);
}

function bindEvents(root) {
  root.querySelector("#manageCheckinQrTitle")?.addEventListener("input", (event) => {
    STATE.title = String(event.target.value || "").trim();
    renderBody(root);
  });

  root.querySelector("#manageCheckinQrSubtitle")?.addEventListener("input", (event) => {
    STATE.subtitle = String(event.target.value || "").trim();
    renderBody(root);
  });

  root.querySelector("#manageCheckinQrLocationId")?.addEventListener("input", (event) => {
    STATE.locationId = String(event.target.value || "").trim();
    renderBody(root);
  });

  root.querySelector("#manageCheckinQrSize")?.addEventListener("input", (event) => {
    const n = Number(event.target.value || 360);
    STATE.size = Number.isFinite(n) ? Math.max(200, Math.min(1200, Math.round(n))) : 360;
    renderBody(root);
  });

  root.querySelector("#manageCheckinQrCopyUrlBtn")?.addEventListener("click", async () => {
    const text = buildCheckinUrl();
    try {
      await navigator.clipboard.writeText(text);
      showToast("คัดลอกลิงก์เช็คอินแล้ว");
    } catch {
      showToast("คัดลอกลิงก์ไม่สำเร็จ");
    }
  });

  root.querySelector("#manageCheckinQrPrintBtn")?.addEventListener("click", () => {
    window.print();
  });
}

export function renderManageCheckinQrView() {
  return '<section id="manageCheckinQrRoot" class="view"></section>';
}

export function mountManageCheckinQrView(container) {
  const root = container.querySelector("#manageCheckinQrRoot") || container;
  if (!root) return;
  renderBody(root);
}
