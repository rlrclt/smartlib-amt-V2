import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";
import { apiBooksCatalogGet, apiBookItemsList } from "../../data/api.js";
import { readPrintCart, removeBarcodeFromPrintCart, subscribePrintCart } from "../../utils/print_cart.js";

const CALIBRATION_STORAGE_KEY = "smartlib.barcode.calibration.v1";
const LAYOUT_PRESET_STORAGE_KEY = "smartlib.print.layout.preset.v1";
const MAX_BATCH = 100;

const LAYOUT_PRESETS = {
  balanced_20_25_55: {
    label: "Balanced 20/25/55",
    cols: "20% 25% 55%",
  },
  preview_focus_15_25_60: {
    label: "Preview Focus 15/25/60",
    cols: "15% 25% 60%",
  },
  even_25_25_50: {
    label: "Even 25/25/50",
    cols: "25% 25% 50%",
  },
  calibration_focus_18_32_50: {
    label: "Calibration Focus 18/32/50",
    cols: "18% 32% 50%",
  },
  compact_cart_12_28_60: {
    label: "Compact Cart 12/28/60",
    cols: "12% 28% 60%",
  },
};

const PAPER_PROFILES = {
  thermal_50x30: {
    label: "Thermal 50x30mm",
    pageWidthMm: 50,
    pageHeightMm: 30,
    cols: 1,
    rows: 1,
    gapXmm: 0,
    gapYmm: 0,
    marginXmm: 0,
    marginYmm: 0,
    labelWidthMm: 50,
    labelHeightMm: 30,
  },
  a4_3x7: {
    label: "A4 Sticker 3x7",
    pageWidthMm: 210,
    pageHeightMm: 297,
    cols: 3,
    rows: 7,
    gapXmm: 2,
    gapYmm: 2,
    marginXmm: 8,
    marginYmm: 10,
    labelWidthMm: 63.5,
    labelHeightMm: 38.1,
  },
  a4_3x8: {
    label: "A4 Sticker 3x8",
    pageWidthMm: 210,
    pageHeightMm: 297,
    cols: 3,
    rows: 8,
    gapXmm: 2,
    gapYmm: 2,
    marginXmm: 8,
    marginYmm: 10,
    labelWidthMm: 63.5,
    labelHeightMm: 33.9,
  },
};

const STATE = {
  loading: false,
  requestedBarcodes: [],
  labels: [],
  totalSourceCount: 0,
  profileKey: "thermal_50x30",
  outputMode: "direct",
  libraryName: "SmartLib AMT",
  options: {
    showTitle: true,
    showCallNumber: true,
    showLibraryName: true,
    showBarcodeText: true,
  },
  calibration: {
    scaleX: 1,
    scaleY: 1,
    offsetXmm: 0,
    offsetYmm: 0,
  },
  cartListenerCleanup: null,
  layoutPresetKey: readLayoutPreset_(),
};

function readLayoutPreset_() {
  try {
    const raw = String(window.localStorage.getItem(LAYOUT_PRESET_STORAGE_KEY) || "").trim();
    return Object.prototype.hasOwnProperty.call(LAYOUT_PRESETS, raw) ? raw : "balanced_20_25_55";
  } catch {
    return "balanced_20_25_55";
  }
}

function persistLayoutPreset_() {
  try {
    window.localStorage.setItem(LAYOUT_PRESET_STORAGE_KEY, STATE.layoutPresetKey);
  } catch {
    // ignore
  }
}

function parseSelectedBarcodesFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const raw = String(params.get("barcodes") || "").trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function readCalibrationStore() {
  try {
    const raw = window.localStorage.getItem(CALIBRATION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeCalibrationStore(nextStore) {
  try {
    window.localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(nextStore));
  } catch {
    // ignore
  }
}

function loadProfileCalibration(profileKey) {
  const store = readCalibrationStore();
  const raw = store[profileKey] || {};
  return {
    scaleX: Number.isFinite(Number(raw.scaleX)) ? Number(raw.scaleX) : 1,
    scaleY: Number.isFinite(Number(raw.scaleY)) ? Number(raw.scaleY) : 1,
    offsetXmm: Number.isFinite(Number(raw.offsetXmm)) ? Number(raw.offsetXmm) : 0,
    offsetYmm: Number.isFinite(Number(raw.offsetYmm)) ? Number(raw.offsetYmm) : 0,
  };
}

function persistCurrentCalibration() {
  const store = readCalibrationStore();
  store[STATE.profileKey] = {
    scaleX: STATE.calibration.scaleX,
    scaleY: STATE.calibration.scaleY,
    offsetXmm: STATE.calibration.offsetXmm,
    offsetYmm: STATE.calibration.offsetYmm,
    updatedAt: new Date().toISOString(),
  };
  writeCalibrationStore(store);
}

function parseQuery() {
  const params = new URLSearchParams(window.location.search);
  return {
    barcodes: parseSelectedBarcodesFromQuery(),
  };
}

function ensureJsBarcodeLoaded() {
  if (window.JsBarcode) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-jsbarcode="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("โหลด JsBarcode ไม่สำเร็จ")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "/vendor/jsbarcode.min.js";
    script.async = true;
    script.dataset.jsbarcode = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("โหลด JsBarcode ไม่สำเร็จ"));
    document.head.appendChild(script);
  });
}

function getEffectiveProfile() {
  const base = PAPER_PROFILES[STATE.profileKey] || PAPER_PROFILES.thermal_50x30;
  const scaleX = Math.max(0.85, Math.min(1.15, Number(STATE.calibration.scaleX) || 1));
  const scaleY = Math.max(0.85, Math.min(1.15, Number(STATE.calibration.scaleY) || 1));

  return {
    ...base,
    labelWidthMm: Number((base.labelWidthMm * scaleX).toFixed(2)),
    labelHeightMm: Number((base.labelHeightMm * scaleY).toFixed(2)),
    offsetXmm: Number((Number(STATE.calibration.offsetXmm) || 0).toFixed(2)),
    offsetYmm: Number((Number(STATE.calibration.offsetYmm) || 0).toFixed(2)),
  };
}

function getLabelsPerPage(profile) {
  return Math.max(1, profile.cols * profile.rows);
}

function chunkArray(list, size) {
  const output = [];
  for (let i = 0; i < list.length; i += size) {
    output.push(list.slice(i, i + size));
  }
  return output;
}

function renderLabelCard(label, idx, profile) {
  const showTitle = STATE.options.showTitle;
  const showCallNumber = STATE.options.showCallNumber;
  const showLibraryName = STATE.options.showLibraryName;
  const showBarcodeText = STATE.options.showBarcodeText;

  const titleHtml = showTitle ? `<div class="barcode-title">${escapeHtml(label.title || "-")}</div>` : "";
  const callNumberHtml = showCallNumber ? `<div class="barcode-call">${escapeHtml(label.callNumber || "-")}</div>` : "";
  const libraryHtml = showLibraryName ? `<div class="barcode-library">${escapeHtml(STATE.libraryName || "SmartLib AMT")}</div>` : "";

  return `
    <article class="barcode-label" style="width:${profile.labelWidthMm}mm;height:${profile.labelHeightMm}mm">
      ${libraryHtml}
      ${titleHtml}
      ${callNumberHtml}
      <div class="barcode-svg-wrap">
        <svg data-jsbarcode-value="${escapeHtml(label.barcode)}" data-jsbarcode-text="${showBarcodeText ? "1" : "0"}" id="barcode-svg-${idx}"></svg>
      </div>
    </article>
  `;
}

function renderPreviewPages(profile) {
  if (!STATE.labels.length) {
    return '<div class="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm font-semibold text-slate-500">ยังไม่มีรายการบาร์โค้ดสำหรับพิมพ์</div>';
  }

  const labelsPerPage = getLabelsPerPage(profile);
  const pages = chunkArray(STATE.labels, labelsPerPage);

  return pages
    .map((pageLabels, pageIdx) => {
      const gridHtml = pageLabels
        .map((label, idx) => renderLabelCard(label, pageIdx * labelsPerPage + idx, profile))
        .join("");

      return `
        <section class="barcode-page-preview" style="width:${profile.pageWidthMm}mm;height:${profile.pageHeightMm}mm;padding-top:${profile.offsetYmm}mm;padding-left:${profile.offsetXmm}mm;">
          <div class="barcode-grid" style="grid-template-columns:repeat(${profile.cols}, ${profile.labelWidthMm}mm);grid-auto-rows:${profile.labelHeightMm}mm;column-gap:${profile.gapXmm}mm;row-gap:${profile.gapYmm}mm;padding:${profile.marginYmm}mm ${profile.marginXmm}mm;">
            ${gridHtml}
          </div>
        </section>
      `;
    })
    .join("");
}

function renderPrintDocument(profile) {
  const labelsPerPage = getLabelsPerPage(profile);
  const pages = chunkArray(STATE.labels, labelsPerPage);

  const pagesHtml = pages
    .map((pageLabels, pageIdx) => {
      const rowChunks = chunkArray(pageLabels, profile.cols);
      const rowsHtml = rowChunks
        .map((rowLabels, rowIdx) => {
          const labelsHtml = rowLabels
            .map((label, colIdx) => {
              const globalIndex = pageIdx * labelsPerPage + rowIdx * profile.cols + colIdx;
              return `
                <div class="print-label-cell" style="margin-right:${colIdx === rowLabels.length - 1 ? 0 : profile.gapXmm}mm;">
                  ${renderLabelCard(label, globalIndex, profile)}
                </div>
              `;
            })
            .join("");
          return `<div class="print-label-row" style="margin-bottom:${rowIdx === rowChunks.length - 1 ? 0 : profile.gapYmm}mm;">${labelsHtml}</div>`;
        })
        .join("");

      return `
        <section class="print-page" style="width:${profile.pageWidthMm}mm;height:${profile.pageHeightMm}mm;padding-top:${profile.offsetYmm}mm;padding-left:${profile.offsetXmm}mm;">
          <div class="print-label-container" style="padding:${profile.marginYmm}mm ${profile.marginXmm}mm;">
            ${rowsHtml}
          </div>
        </section>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Barcode Print</title>
  <style media="screen">
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body { margin: 8mm; background: #fff; color: #111827; font-family: "Bai Jamjuree", system-ui, sans-serif; }
  </style>
  <style media="print">
    * { box-sizing: border-box; }
    body { margin: 0; background: #fff; color: #111827; font-family: "Bai Jamjuree", system-ui, sans-serif; }
    .print-page { page-break-after: always; overflow: hidden; }
    .print-page:last-child { page-break-after: auto; }
    .print-label-container { display: block; }
    .print-label-row { display: block; white-space: nowrap; line-height: 0; }
    .print-label-cell { display: inline-block; vertical-align: top; line-height: normal; }
    .barcode-label {
      border: 0.25mm dashed rgba(148,163,184,.35);
      background: #fff;
      display: flex;
      flex-direction: column;
      justify-content: flex-start;
      align-items: stretch;
      padding: 1.2mm 1.6mm;
      overflow: hidden;
    }
    .barcode-library { font-size: 2.7mm; font-weight: 800; line-height: 1.1; color: #0f172a; text-align: center; margin-bottom: 0.6mm; }
    .barcode-title { font-size: 2.5mm; font-weight: 700; line-height: 1.15; color: #334155; text-align: center; margin-bottom: 0.4mm; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .barcode-call { font-size: 2.4mm; font-weight: 800; line-height: 1.1; color: #0f172a; text-align: center; margin-bottom: 0.7mm; }
    .barcode-svg-wrap { display: flex; justify-content: center; align-items: center; margin-top: auto; }
    .barcode-svg-wrap svg { shape-rendering: crispEdges; text-rendering: geometricPrecision; }

    @page {
      size: ${profile.pageWidthMm}mm ${profile.pageHeightMm}mm;
      margin: 0;
    }

    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .barcode-label { border-color: transparent; }
  </style>
</head>
<body>
  ${pagesHtml}
  <script src="/vendor/jsbarcode.min.js"></script>
  <script>
    (function () {
      var nodes = document.querySelectorAll('svg[data-jsbarcode-value]');
      nodes.forEach(function (node) {
        var value = node.getAttribute('data-jsbarcode-value') || '';
        var textFlag = node.getAttribute('data-jsbarcode-text') === '1';
        try {
          window.JsBarcode(node, value, {
            format: 'CODE128',
            width: 2,
            height: 60,
            margin: 5,
            displayValue: textFlag,
            fontSize: 12,
            textMargin: 2,
            lineColor: '#111827',
            background: '#ffffff'
          });
        } catch (err) {
          node.outerHTML = '<div style="font-size:10px;color:#b91c1c;font-weight:700;">ERR ' + value + '</div>';
        }
      });
    })();
  </script>
</body>
</html>`;
}

function openPrintWindow(profile, mode) {
  const html = renderPrintDocument(profile);
  const popup = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");
  if (!popup) {
    showToast("เบราว์เซอร์บล็อก popup กรุณาอนุญาตแล้วลองใหม่");
    return;
  }

  popup.document.open();
  popup.document.write(html);
  popup.document.close();

  popup.onload = () => {
    if (mode === "pdf") {
      popup.alert("โหมดดาวน์โหลด PDF: เมื่อ dialog เปิดขึ้น ให้เลือกปลายทางเป็น Save as PDF");
    }
    popup.focus();
    popup.print();
  };
}

async function fetchAllItemsForBook(bookId) {
  const result = [];
  let page = 1;
  const limit = 100;

  while (page <= 60) {
    const res = await apiBookItemsList({
      bookId,
      status: "all",
      page,
      limit,
    });
    if (!res?.ok) throw new Error(res?.error || "โหลดรายการ book_items ไม่สำเร็จ");

    const payload = res.data || {};
    const rows = Array.isArray(payload.items) ? payload.items : [];
    result.push(...rows);

    if (!payload.hasMore) break;
    page += 1;
  }

  return result;
}

async function loadPrintData() {
  STATE.loading = true;

  const queryBarcodes = parseQuery().barcodes;
  const cartBarcodes = readPrintCart().barcodes;
  const sourceBarcodes = cartBarcodes.length ? cartBarcodes : queryBarcodes;
  STATE.totalSourceCount = Array.from(new Set(sourceBarcodes)).length;
  STATE.requestedBarcodes = Array.from(new Set(sourceBarcodes)).slice(0, MAX_BATCH);

  if (!STATE.requestedBarcodes.length) throw new Error("ตะกร้าพิมพ์ว่าง กรุณาเลือกเล่มจากหน้าเลือกพิมพ์ก่อน");

  const bookCache = new Map();
  const bookItemsCache = new Map();
  const labels = [];
  const invalid = [];
  const unavailable = [];

  for (const barcode of STATE.requestedBarcodes) {
    const bookRes = await apiBooksCatalogGet({ barcode });
    const book = bookRes?.ok ? bookRes?.data?.book : null;
    if (!book) {
      invalid.push(barcode);
      continue;
    }

    const bookId = String(book.bookId || "");
    if (!bookItemsCache.has(bookId)) {
      const rows = await fetchAllItemsForBook(bookId);
      bookItemsCache.set(bookId, rows);
      bookCache.set(bookId, book);
    }

    const rows = bookItemsCache.get(bookId) || [];
    const target = rows.find((row) => String(row.barcode || "") === barcode);
    if (!target) {
      invalid.push(barcode);
      continue;
    }

    if (String(target.status || "").toLowerCase() !== "available") {
      unavailable.push(barcode);
      continue;
    }

    labels.push({
      barcode,
      bookId,
      title: String(book.title || ""),
      callNumber: String(book.callNumber || ""),
    });
  }

  if (invalid.length) {
    throw new Error(`พบ barcode ที่ไม่อยู่ในระบบ: ${invalid.slice(0, 3).join(", ")}${invalid.length > 3 ? "..." : ""}`);
  }
  if (unavailable.length) {
    throw new Error(`พบ barcode ที่ไม่ได้อยู่สถานะ available: ${unavailable.slice(0, 3).join(", ")}${unavailable.length > 3 ? "..." : ""}`);
  }

  STATE.labels = labels;
}

function renderCalibrationPanel() {
  return `
    <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 class="text-sm font-black uppercase tracking-widest text-slate-500">Calibration (ต่อเครื่อง)</h3>
      <p class="mt-1 text-xs font-medium text-slate-500">ปรับเพื่อแก้อาการเพี้ยนระหว่าง preview และงานพิมพ์จริง</p>

      <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label class="grid gap-1 text-xs font-bold text-slate-600">Scale X
          <input id="calScaleX" type="number" step="0.001" min="0.85" max="1.15" value="${STATE.calibration.scaleX}" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700" />
        </label>
        <label class="grid gap-1 text-xs font-bold text-slate-600">Scale Y
          <input id="calScaleY" type="number" step="0.001" min="0.85" max="1.15" value="${STATE.calibration.scaleY}" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700" />
        </label>
        <label class="grid gap-1 text-xs font-bold text-slate-600">Offset X (mm)
          <input id="calOffsetX" type="number" step="0.1" min="-10" max="10" value="${STATE.calibration.offsetXmm}" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700" />
        </label>
        <label class="grid gap-1 text-xs font-bold text-slate-600">Offset Y (mm)
          <input id="calOffsetY" type="number" step="0.1" min="-10" max="10" value="${STATE.calibration.offsetYmm}" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700" />
        </label>
      </div>

      <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label class="grid gap-1 text-xs font-bold text-slate-600">วัดจริงกว้าง (mm)
          <input id="calMeasuredW" type="number" step="0.1" min="1" placeholder="เช่น 49.2" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700" />
        </label>
        <label class="grid gap-1 text-xs font-bold text-slate-600">วัดจริงสูง (mm)
          <input id="calMeasuredH" type="number" step="0.1" min="1" placeholder="เช่น 29.7" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700" />
        </label>
        <button id="calAutoBtn" type="button" class="mt-5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-black text-white hover:bg-slate-800">คำนวณอัตโนมัติ</button>
        <button id="calResetBtn" type="button" class="mt-5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">รีเซ็ตค่า</button>
      </div>
    </div>
  `;
}

function renderControlPanel() {
  const cartBarcodes = readPrintCart().barcodes;
  return `
    <div class="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
      <div class="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div class="mb-2 flex items-center justify-between gap-2">
          <p class="text-xs font-black uppercase tracking-widest text-slate-500">Print Cart</p>
          <span class="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700">${cartBarcodes.length} รายการ</span>
        </div>
        <div class="max-h-32 space-y-1 overflow-auto pr-1">
          ${cartBarcodes.length
            ? cartBarcodes.map((barcode) => `
                <div class="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5">
                  <span class="text-[11px] font-black text-slate-700">${escapeHtml(barcode)}</span>
                  <button type="button" data-action="remove-cart-item" data-barcode="${escapeHtml(barcode)}" class="rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-black text-rose-700 hover:bg-rose-100">ลบ</button>
                </div>
              `).join("")
            : '<p class="text-[11px] font-semibold text-slate-500">ตะกร้าว่าง</p>'}
        </div>
      </div>

      <div class="grid gap-3 xl:grid-cols-4">
        <label class="grid gap-1 text-xs font-bold text-slate-600">Output Mode
          <select id="barcodeOutputMode" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
            <option value="direct" ${STATE.outputMode === "direct" ? "selected" : ""}>พิมพ์ตรงจาก Browser</option>
            <option value="pdf" ${STATE.outputMode === "pdf" ? "selected" : ""}>ดาวน์โหลด PDF (ผ่าน Print)</option>
          </select>
        </label>

        <label class="grid gap-1 text-xs font-bold text-slate-600">Paper Profile
          <select id="barcodePaperProfile" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700">
            ${Object.entries(PAPER_PROFILES)
              .map(([key, profile]) => `<option value="${key}" ${STATE.profileKey === key ? "selected" : ""}>${escapeHtml(profile.label)}</option>`)
              .join("")}
          </select>
        </label>

        <label class="grid gap-1 text-xs font-bold text-slate-600">ชื่อห้องสมุด
          <input id="barcodeLibraryName" value="${escapeHtml(STATE.libraryName)}" class="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700" />
        </label>

        <div class="mt-5 flex items-center gap-2">
          <button id="barcodeRunPrint" type="button" class="rounded-lg bg-sky-600 px-3 py-2 text-xs font-black text-white hover:bg-sky-700">สั่งพิมพ์</button>
          <button id="barcodeSaveCal" type="button" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">บันทึกค่า</button>
        </div>
      </div>

      <div class="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label class="inline-flex items-center gap-2 text-xs font-semibold text-slate-600"><input id="optShowTitle" type="checkbox" ${STATE.options.showTitle ? "checked" : ""} /> แสดงชื่อหนังสือ</label>
        <label class="inline-flex items-center gap-2 text-xs font-semibold text-slate-600"><input id="optShowCall" type="checkbox" ${STATE.options.showCallNumber ? "checked" : ""} /> แสดงเลขเรียก</label>
        <label class="inline-flex items-center gap-2 text-xs font-semibold text-slate-600"><input id="optShowLibrary" type="checkbox" ${STATE.options.showLibraryName ? "checked" : ""} /> แสดงชื่อห้องสมุด</label>
        <label class="inline-flex items-center gap-2 text-xs font-semibold text-slate-600"><input id="optShowCode" type="checkbox" ${STATE.options.showBarcodeText ? "checked" : ""} /> แสดงรหัสใต้บาร์โค้ด</label>
      </div>

      <div class="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
        ก่อนพิมพ์จริงตั้งค่าใน Print Dialog เป็น <span class="font-black">Scale 100% / Actual size</span> และปิด Fit to page
      </div>
    </div>
  `;
}

function renderPreviewSection(profile) {
  return `
    <div class="rounded-2xl border border-slate-200 bg-slate-100 p-4 shadow-sm">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p class="text-xs font-black uppercase tracking-widest text-slate-500">Preview</p>
        <p class="text-xs font-semibold text-slate-500">${escapeHtml(PAPER_PROFILES[STATE.profileKey].label)} · ${STATE.labels.length} ดวง</p>
      </div>
      <div id="barcodePreviewRoot" class="barcode-preview-wrap">${renderPreviewPages(profile)}</div>
    </div>
  `;
}

export function renderManagePrintBarcodesView() {
  const profile = getEffectiveProfile();
  const activeLayout = LAYOUT_PRESETS[STATE.layoutPresetKey] || LAYOUT_PRESETS.balanced_20_25_55;

  return `
    <section class="p-4 lg:p-6">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-black tracking-tight text-slate-800">พิมพ์บาร์โค้ด</h2>
          <p id="barcodePrintMeta" class="text-sm font-medium text-slate-500">กำลังโหลดข้อมูล...</p>
        </div>
        <a id="barcodeBackLink" data-link href="/manage/books/select-print" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">กลับหน้าเลือกพิมพ์</a>
      </div>

      <div id="barcodePrintError"></div>

      <div class="mb-3 flex items-center justify-end gap-2">
        <label for="barcodeLayoutPreset" class="text-xs font-black uppercase tracking-wider text-slate-500">Layout Preset</label>
        <select id="barcodeLayoutPreset" class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
          ${Object.entries(LAYOUT_PRESETS).map(([key, preset]) => `
            <option value="${key}" ${key === STATE.layoutPresetKey ? "selected" : ""}>${escapeHtml(preset.label)}</option>
          `).join("")}
        </select>
      </div>

      <div id="barcodeLayoutShell" class="barcode-layout-shell mt-4 grid gap-4" style="--print-layout-cols:${activeLayout.cols};">
        <div id="barcodeControlPanel" class="barcode-panel barcode-panel-cart">${renderControlPanel()}</div>
        <div class="barcode-panel barcode-panel-calibration">${renderCalibrationPanel()}</div>
        <div class="barcode-panel barcode-panel-preview">${renderPreviewSection(profile)}</div>
      </div>

      <style>
        .barcode-layout-shell {
          grid-template-columns: 1fr;
        }
        .barcode-panel {
          min-width: 0;
        }
        @media (min-width: 1024px) {
          .barcode-layout-shell {
            grid-template-columns: minmax(300px, 1fr) minmax(360px, 1fr);
          }
          .barcode-panel-preview {
            grid-column: 1 / -1;
          }
        }
        @media (min-width: 1536px) {
          .barcode-layout-shell {
            grid-template-columns: var(--print-layout-cols);
          }
          .barcode-panel-preview {
            grid-column: auto;
          }
        }
        .barcode-preview-wrap {
          display: grid;
          gap: 16px;
          justify-content: start;
          overflow: auto;
          max-height: 72vh;
          padding: 4px;
        }
        .barcode-page-preview {
          background: #fff;
          border: 1px solid #cbd5e1;
          box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
        }
        .barcode-grid {
          display: grid;
          align-content: start;
          justify-content: start;
        }
        .barcode-label {
          border: 1px dashed rgba(148, 163, 184, 0.5);
          background: #fff;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          justify-content: flex-start;
          padding: 1.2mm 1.6mm;
          overflow: hidden;
        }
        .barcode-library {
          font-size: 2.7mm;
          font-weight: 800;
          line-height: 1.1;
          color: #0f172a;
          text-align: center;
          margin-bottom: 0.6mm;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .barcode-title {
          font-size: 2.5mm;
          font-weight: 700;
          line-height: 1.15;
          color: #334155;
          text-align: center;
          margin-bottom: 0.5mm;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .barcode-call {
          font-size: 2.4mm;
          font-weight: 800;
          line-height: 1.1;
          color: #0f172a;
          text-align: center;
          margin-bottom: 0.7mm;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .barcode-svg-wrap {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-top: auto;
        }
        .barcode-svg-wrap svg {
          shape-rendering: crispEdges;
          text-rendering: geometricPrecision;
        }
      </style>
    </section>
  `;
}

async function renderBarcodes(container) {
  if (!container || !window.JsBarcode) return;

  container.querySelectorAll("svg[data-jsbarcode-value]").forEach((node) => {
    const value = String(node.getAttribute("data-jsbarcode-value") || "");
    const textFlag = node.getAttribute("data-jsbarcode-text") === "1";
    try {
      window.JsBarcode(node, value, {
        format: "CODE128",
        width: 2,
        height: 60,
        margin: 5,
        displayValue: textFlag,
        fontSize: 12,
        textMargin: 2,
        lineColor: "#111827",
        background: "#ffffff",
      });
    } catch {
      node.outerHTML = `<div style="font-size:10px;color:#b91c1c;font-weight:700;">ERR ${escapeHtml(value)}</div>`;
    }
  });
}

async function updatePreview(root) {
  const previewRoot = root.querySelector("#barcodePreviewRoot");
  if (!previewRoot) return;
  const profile = getEffectiveProfile();
  previewRoot.innerHTML = renderPreviewPages(profile);
  await renderBarcodes(previewRoot);
}

function syncMeta(root) {
  const meta = root.querySelector("#barcodePrintMeta");
  if (!meta) return;
  const extra = Math.max(0, STATE.totalSourceCount - STATE.labels.length);
  meta.textContent = extra > 0
    ? `พิมพ์รอบนี้ ${STATE.labels.length} ดวง จากทั้งหมด ${STATE.totalSourceCount} ดวง (เหลือ ${extra} ดวงสำหรับรอบถัดไป)`
    : `รายการในตะกร้าสำหรับพิมพ์ ${STATE.labels.length} ดวง (สูงสุดต่อรอบ ${MAX_BATCH})`;
}

function bindControlEvents(root) {
  const profileSelect = root.querySelector("#barcodePaperProfile");
  const outputModeSelect = root.querySelector("#barcodeOutputMode");
  const libraryNameInput = root.querySelector("#barcodeLibraryName");
  const saveCalBtn = root.querySelector("#barcodeSaveCal");
  const printBtn = root.querySelector("#barcodeRunPrint");
  const errorBox = root.querySelector("#barcodePrintError");
  const layoutPresetSelect = root.querySelector("#barcodeLayoutPreset");

  const renderAll = async () => updatePreview(root);

  const readCalibrationInputs = () => {
    const scaleX = Number(root.querySelector("#calScaleX")?.value || 1);
    const scaleY = Number(root.querySelector("#calScaleY")?.value || 1);
    const offsetXmm = Number(root.querySelector("#calOffsetX")?.value || 0);
    const offsetYmm = Number(root.querySelector("#calOffsetY")?.value || 0);

    STATE.calibration = {
      scaleX: Number.isFinite(scaleX) ? scaleX : 1,
      scaleY: Number.isFinite(scaleY) ? scaleY : 1,
      offsetXmm: Number.isFinite(offsetXmm) ? offsetXmm : 0,
      offsetYmm: Number.isFinite(offsetYmm) ? offsetYmm : 0,
    };
  };

  const bindRerenderOnChange = (selector, callback) => {
    root.querySelectorAll(selector).forEach((el) => {
      el.addEventListener("change", callback);
      el.addEventListener("input", callback);
    });
  };

  profileSelect?.addEventListener("change", async () => {
    STATE.profileKey = String(profileSelect.value || "thermal_50x30");
    STATE.calibration = loadProfileCalibration(STATE.profileKey);

    const inputs = [
      ["#calScaleX", STATE.calibration.scaleX],
      ["#calScaleY", STATE.calibration.scaleY],
      ["#calOffsetX", STATE.calibration.offsetXmm],
      ["#calOffsetY", STATE.calibration.offsetYmm],
    ];
    inputs.forEach(([selector, value]) => {
      const input = root.querySelector(selector);
      if (input) input.value = String(value);
    });

    await renderAll();
  });

  outputModeSelect?.addEventListener("change", () => {
    STATE.outputMode = String(outputModeSelect.value || "direct");
  });

  libraryNameInput?.addEventListener("input", async () => {
    STATE.libraryName = String(libraryNameInput.value || "").trim() || "SmartLib AMT";
    await renderAll();
  });

  bindRerenderOnChange("#optShowTitle, #optShowCall, #optShowLibrary, #optShowCode", async () => {
    STATE.options.showTitle = Boolean(root.querySelector("#optShowTitle")?.checked);
    STATE.options.showCallNumber = Boolean(root.querySelector("#optShowCall")?.checked);
    STATE.options.showLibraryName = Boolean(root.querySelector("#optShowLibrary")?.checked);
    STATE.options.showBarcodeText = Boolean(root.querySelector("#optShowCode")?.checked);
    await renderAll();
  });

  bindRerenderOnChange("#calScaleX, #calScaleY, #calOffsetX, #calOffsetY", async () => {
    readCalibrationInputs();
    await renderAll();
  });

  root.querySelector("#calAutoBtn")?.addEventListener("click", async () => {
    const measuredW = Number(root.querySelector("#calMeasuredW")?.value || 0);
    const measuredH = Number(root.querySelector("#calMeasuredH")?.value || 0);
    const base = PAPER_PROFILES[STATE.profileKey] || PAPER_PROFILES.thermal_50x30;

    if (!(measuredW > 0) || !(measuredH > 0)) {
      showToast("กรุณากรอกค่าที่วัดจริงทั้งกว้างและสูง");
      return;
    }

    const scaleX = Number((base.labelWidthMm / measuredW).toFixed(4));
    const scaleY = Number((base.labelHeightMm / measuredH).toFixed(4));

    STATE.calibration.scaleX = Math.max(0.85, Math.min(1.15, scaleX));
    STATE.calibration.scaleY = Math.max(0.85, Math.min(1.15, scaleY));

    const scaleXInput = root.querySelector("#calScaleX");
    const scaleYInput = root.querySelector("#calScaleY");
    if (scaleXInput) scaleXInput.value = String(STATE.calibration.scaleX);
    if (scaleYInput) scaleYInput.value = String(STATE.calibration.scaleY);

    await renderAll();
    showToast("คำนวณ calibration อัตโนมัติแล้ว");
  });

  root.querySelector("#calResetBtn")?.addEventListener("click", async () => {
    STATE.calibration = { scaleX: 1, scaleY: 1, offsetXmm: 0, offsetYmm: 0 };
    const map = {
      "#calScaleX": "1",
      "#calScaleY": "1",
      "#calOffsetX": "0",
      "#calOffsetY": "0",
    };
    Object.entries(map).forEach(([selector, value]) => {
      const input = root.querySelector(selector);
      if (input) input.value = value;
    });
    await renderAll();
    showToast("รีเซ็ต calibration แล้ว");
  });

  saveCalBtn?.addEventListener("click", () => {
    readCalibrationInputs();
    persistCurrentCalibration();
    showToast("บันทึก calibration ต่อเครื่องแล้ว");
  });

  printBtn?.addEventListener("click", () => {
    if (!STATE.labels.length) {
      showToast("ไม่มีรายการสำหรับพิมพ์");
      return;
    }

    if (STATE.labels.length > MAX_BATCH) {
      showToast(`พิมพ์ได้สูงสุด ${MAX_BATCH} ดวงต่อครั้ง`);
      return;
    }

    readCalibrationInputs();
    const profile = getEffectiveProfile();
    if (errorBox) errorBox.innerHTML = "";
    openPrintWindow(profile, STATE.outputMode);
  });

  layoutPresetSelect?.addEventListener("change", () => {
    const key = String(layoutPresetSelect.value || "");
    if (!Object.prototype.hasOwnProperty.call(LAYOUT_PRESETS, key)) return;
    STATE.layoutPresetKey = key;
    persistLayoutPreset_();
    const shell = root.querySelector("#barcodeLayoutShell");
    const preset = LAYOUT_PRESETS[key];
    if (shell && preset) shell.style.setProperty("--print-layout-cols", preset.cols);
  });

  root.addEventListener("click", (event) => {
    const removeBtn = event.target.closest('[data-action="remove-cart-item"]');
    if (!removeBtn) return;
    const barcode = String(removeBtn.getAttribute("data-barcode") || "");
    if (!barcode) return;
    removeBarcodeFromPrintCart(barcode);
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
}

export async function mountManagePrintBarcodesView(root) {
  if (!root) return;

  const errorBox = root.querySelector("#barcodePrintError");

  try {
    STATE.cartListenerCleanup?.();
    STATE.cartListenerCleanup = subscribePrintCart(() => {
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await ensureJsBarcodeLoaded();
    STATE.calibration = loadProfileCalibration(STATE.profileKey);

    await loadPrintData();
    syncMeta(root);
    await updatePreview(root);

    bindControlEvents(root);
  } catch (error) {
    const message = String(error?.message || error || "โหลดระบบพิมพ์ไม่สำเร็จ");
    if (errorBox) {
      errorBox.innerHTML = `<div class="mb-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">${escapeHtml(message)}</div>`;
    }
    showToast(message);
  } finally {
    STATE.loading = false;
  }
}
