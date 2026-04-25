import { apiLoansSelfCreate, apiLoansSelfReturn, apiSettingsLocationsCheck } from "../../data/api.js";
import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";

const STATE = {
  checking: false,
  submitting: false,
  scannerOn: false,
  scannerSupported: typeof window !== "undefined" && "BarcodeDetector" in window,
  detector: null,
  stream: null,
  scanRafId: 0,
  geo: null,
  result: null,
  purpose: "borrow",
  mode: "borrow",
  lastResult: null,
};

function purposeByMode_(mode) {
  return mode === "return" ? "return" : "borrow";
}

function getCurrentPosition_() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("อุปกรณ์ไม่รองรับ Geolocation"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    });
  });
}

async function ensureGeoCheck_(root, purpose) {
  STATE.checking = true;
  renderStatus_(root);

  try {
    const pos = await getCurrentPosition_();
    const lat = Number(pos.coords.latitude);
    const lng = Number(pos.coords.longitude);
    const accuracy = Number(pos.coords.accuracy || 0);
    STATE.geo = { lat, lng, accuracy };

    const res = await apiSettingsLocationsCheck({
      latitude: lat,
      longitude: lng,
      accuracy,
      purpose,
    });

    if (!res?.ok) throw new Error(res?.error || "ตรวจสอบพิกัดไม่สำเร็จ");
    STATE.result = res.data || null;

    if (!STATE.result?.allowed) {
      throw new Error("อยู่นอกพื้นที่ที่อนุญาต กรุณาเข้าใกล้จุดบริการ");
    }

    if (STATE.result?.accuracy_warning) {
      showToast("ความแม่นยำพิกัดยังต่ำ แนะนำขยับตำแหน่งหรือเปิด GPS ให้แม่นยำขึ้น");
    }

    return STATE.result;
  } catch (err) {
    STATE.result = null;
    throw err;
  } finally {
    STATE.checking = false;
    renderStatus_(root);
  }
}

function renderStatus_(root) {
  const status = root.querySelector("#memberLoanSelfStatus");
  const detail = root.querySelector("#memberLoanSelfDetail");
  if (!status || !detail) return;

  if (STATE.checking) {
    status.className = "rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm font-semibold text-sky-700";
    status.textContent = "กำลังตรวจสอบพิกัด...";
    detail.innerHTML = "";
    return;
  }

  if (!STATE.result) {
    status.className = "rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-600";
    status.textContent = "ยังไม่ได้ตรวจสอบพิกัด";
    detail.innerHTML = "";
    return;
  }

  if (STATE.result.allowed) {
    status.className = "rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700";
    status.textContent = "อยู่ในพื้นที่ที่อนุญาต พร้อมทำรายการ";
  } else {
    status.className = "rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700";
    status.textContent = "อยู่นอกพื้นที่ที่อนุญาต กรุณาเข้าใกล้จุดบริการ";
  }

  const nearest = Array.isArray(STATE.result.matches) ? STATE.result.matches.slice(0, 3) : [];
  detail.innerHTML = nearest.length
    ? `
      <div class="space-y-2">
        ${nearest
          .map(
            (item) => `
          <article class="rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-600">
            <p class="font-black text-slate-800">${escapeHtml(item.location_name || "-")}</p>
            <p class="mt-1">ระยะห่าง ${Number(item.distance_meters || 0).toLocaleString("th-TH")} เมตร (รัศมี ${Number(item.range_meters || 0).toLocaleString("th-TH")} เมตร)</p>
          </article>
        `
          )
          .join("")}
      </div>
    `
    : '<p class="text-xs font-semibold text-slate-500">ไม่พบจุดพิกัดที่เปิดใช้งาน</p>';
}

function stopScanner_() {
  if (STATE.scanRafId) {
    cancelAnimationFrame(STATE.scanRafId);
    STATE.scanRafId = 0;
  }
  if (STATE.stream) {
    STATE.stream.getTracks().forEach((track) => track.stop());
    STATE.stream = null;
  }
  STATE.scannerOn = false;
}

function loopScan_(video, input) {
  if (!STATE.scannerOn || !STATE.detector) return;
  STATE.scanRafId = requestAnimationFrame(async () => {
    try {
      const barcodes = await STATE.detector.detect(video);
      const first = Array.isArray(barcodes) && barcodes.length ? String(barcodes[0].rawValue || "").trim() : "";
      if (first) {
        input.value = first;
        showToast(`สแกนสำเร็จ: ${first}`);
        stopScanner_();
        return;
      }
    } catch {
      // ignore per frame
    }
    loopScan_(video, input);
  });
}

async function startScanner_(root) {
  const video = root.querySelector("#memberLoanSelfVideo");
  const input = root.querySelector("#memberLoanSelfBarcode");
  const scannerHint = root.querySelector("#memberLoanSelfScannerHint");
  if (!video || !input || !scannerHint) return;

  if (!STATE.scannerSupported) {
    scannerHint.textContent = "เบราว์เซอร์นี้ไม่รองรับสแกนอัตโนมัติ กรุณากรอกบาร์โค้ดด้วยตนเอง";
    showToast("อุปกรณ์นี้ไม่รองรับ BarcodeDetector");
    return;
  }

  stopScanner_();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" } },
      audio: false,
    });
    STATE.stream = stream;
    video.srcObject = stream;
    await video.play();
    STATE.detector = new window.BarcodeDetector({ formats: ["code_128", "ean_13", "ean_8"] });
    STATE.scannerOn = true;
    scannerHint.textContent = "กำลังสแกน... นำบาร์โค้ดให้อยู่ในกรอบกล้อง";
    loopScan_(video, input);
  } catch (err) {
    stopScanner_();
    scannerHint.textContent = "เปิดกล้องไม่สำเร็จ กรุณาตรวจสิทธิ์กล้องและลองใหม่";
    showToast(err?.message || "เปิดกล้องไม่สำเร็จ");
  }
}

function renderResult_(root) {
  const box = root.querySelector("#memberLoanSelfResult");
  if (!box) return;
  if (!STATE.lastResult) {
    box.innerHTML = "";
    return;
  }

  const loan = STATE.lastResult.loan || {};
  box.innerHTML = `
    <article class="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
      <p class="font-black">ทำรายการสำเร็จ</p>
      <p class="mt-1">Loan ID: ${escapeHtml(loan.loanId || "-")}</p>
      <p class="mt-1">Barcode: ${escapeHtml(loan.barcode || "-")}</p>
      <p class="mt-1">สถานะ: ${escapeHtml(loan.status || "-")}</p>
    </article>
  `;
}

async function submitSelfLoan_(root) {
  if (STATE.submitting) return;
  const mode = String(STATE.mode || "borrow");
  const purpose = purposeByMode_(mode);

  const barcodeInput = root.querySelector("#memberLoanSelfBarcode");
  const noteInput = root.querySelector("#memberLoanSelfNote");
  const barcode = String(barcodeInput?.value || "").trim();
  const notes = String(noteInput?.value || "").trim();
  if (!barcode) {
    showToast("กรุณาระบุบาร์โค้ดก่อนทำรายการ");
    return;
  }

  STATE.submitting = true;
  try {
    await ensureGeoCheck_(root, purpose);
    const geo = STATE.geo || {};

    const payload = {
      barcode,
      notes,
      latitude: geo.lat,
      longitude: geo.lng,
      accuracy: geo.accuracy,
    };

    const res = mode === "borrow"
      ? await apiLoansSelfCreate(payload)
      : await apiLoansSelfReturn(payload);
    if (!res?.ok) throw new Error(res?.error || "ทำรายการไม่สำเร็จ");

    STATE.lastResult = res.data || null;
    renderResult_(root);
    showToast(mode === "borrow" ? "ยืมหนังสือสำเร็จ" : "คืนหนังสือสำเร็จ");
    if (barcodeInput) barcodeInput.value = "";
    if (noteInput) noteInput.value = "";
  } catch (err) {
    showToast(err?.message || "ทำรายการไม่สำเร็จ");
  } finally {
    STATE.submitting = false;
  }
}

function syncModeLabel_(root) {
  const modeTitle = root.querySelector("#memberLoanSelfModeTitle");
  const modeHint = root.querySelector("#memberLoanSelfModeHint");
  const submitBtn = root.querySelector("#memberLoanSelfSubmitBtn");
  const mode = STATE.mode;
  if (modeTitle) modeTitle.textContent = mode === "borrow" ? "โหมดยืมด้วยตนเอง" : "โหมดคืนด้วยตนเอง";
  if (modeHint) {
    modeHint.textContent = mode === "borrow"
      ? "ระบบจะตรวจพิกัดในรัศมียืมก่อนสร้างรายการ"
      : "ระบบจะตรวจพิกัดในรัศมีคืนก่อนปิดรายการ";
  }
  if (submitBtn) submitBtn.textContent = mode === "borrow" ? "ยืนยันการยืม" : "ยืนยันการคืน";
}

export function renderMemberLoanSelfView() {
  return `
    <section id="memberLoanSelfRoot" class="view space-y-4">
      <article class="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
        <h2 id="memberLoanSelfModeTitle" class="text-base font-black text-slate-800">โหมดยืมด้วยตนเอง</h2>
        <p id="memberLoanSelfModeHint" class="mt-1 text-xs font-semibold text-slate-500">ระบบจะตรวจพิกัดในรัศมียืมก่อนสร้างรายการ</p>
      </article>

      <article class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="mb-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <select id="memberLoanSelfMode" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700">
            <option value="borrow">ยืมหนังสือ</option>
            <option value="return">คืนหนังสือ</option>
          </select>
          <button id="memberLoanSelfCheckBtn" type="button" class="rounded-xl bg-sky-600 px-4 py-2 text-sm font-black text-white hover:bg-sky-700">ตรวจสอบพิกัด</button>
        </div>

        <div id="memberLoanSelfStatus" class="rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-600">ยังไม่ได้ตรวจสอบพิกัด</div>
        <div id="memberLoanSelfDetail" class="mt-3"></div>
      </article>

      <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div class="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <input id="memberLoanSelfBarcode" type="text" placeholder="สแกนหรือกรอกบาร์โค้ดหนังสือ" class="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700" />
          <button id="memberLoanSelfStartScanBtn" type="button" class="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-black text-sky-700 hover:bg-sky-100">เปิดกล้องสแกน</button>
          <button id="memberLoanSelfStopScanBtn" type="button" class="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700 hover:bg-slate-100">หยุดกล้อง</button>
        </div>
        <p id="memberLoanSelfScannerHint" class="mt-2 text-xs font-semibold text-slate-500">รองรับสแกนอัตโนมัติเมื่อเบราว์เซอร์รองรับ BarcodeDetector</p>
        <video id="memberLoanSelfVideo" class="mt-3 w-full max-h-64 rounded-xl border border-slate-200 bg-black/90 object-contain" playsinline muted></video>
        <textarea id="memberLoanSelfNote" rows="2" placeholder="หมายเหตุ (ไม่บังคับ)" class="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"></textarea>
        <button id="memberLoanSelfSubmitBtn" type="button" class="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-2 text-sm font-black text-white hover:bg-emerald-700">ยืนยันการยืม</button>
        <div id="memberLoanSelfResult" class="mt-3"></div>
      </article>

      <article class="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p class="text-sm font-black text-amber-800">หมายเหตุการใช้งาน</p>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-amber-700">
          <li>ระบบ self-service บังคับตรวจพิกัดทุกครั้งก่อนทำรายการ</li>
          <li>ถ้ามีค่าปรับค้าง ระบบจะไม่อนุญาตให้คืนด้วยตนเอง</li>
          <li>หากสแกนไม่สำเร็จ สามารถกรอกบาร์โค้ดด้วยตนเองได้</li>
        </ul>
      </article>
    </section>
  `;
}

export function mountMemberLoanSelfView(container) {
  const root = container.querySelector("#memberLoanSelfRoot");
  if (!root) return;

  const modeSelect = root.querySelector("#memberLoanSelfMode");
  const checkBtn = root.querySelector("#memberLoanSelfCheckBtn");
  const startScanBtn = root.querySelector("#memberLoanSelfStartScanBtn");
  const stopScanBtn = root.querySelector("#memberLoanSelfStopScanBtn");
  const submitBtn = root.querySelector("#memberLoanSelfSubmitBtn");

  modeSelect?.addEventListener("change", (event) => {
    STATE.mode = String(event.target.value || "borrow");
    STATE.purpose = purposeByMode_(STATE.mode);
    STATE.result = null;
    renderStatus_(root);
    syncModeLabel_(root);
  });

  checkBtn?.addEventListener("click", async () => {
    try {
      await ensureGeoCheck_(root, purposeByMode_(STATE.mode));
    } catch (err) {
      showToast(err?.message || "ตรวจสอบพิกัดไม่สำเร็จ");
    }
  });

  startScanBtn?.addEventListener("click", () => {
    startScanner_(root);
  });

  stopScanBtn?.addEventListener("click", () => {
    stopScanner_();
    showToast("ปิดกล้องสแกนแล้ว");
  });

  submitBtn?.addEventListener("click", () => {
    submitSelfLoan_(root);
  });

  window.addEventListener("beforeunload", stopScanner_);
  renderStatus_(root);
  syncModeLabel_(root);
  renderResult_(root);
}
