const PRINT_CART_KEY = "smartlib.print.cart.v1";

function normalizeBarcodeList(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  list.forEach((value) => {
    const barcode = String(value || "").trim();
    if (!barcode || seen.has(barcode)) return;
    seen.add(barcode);
    out.push(barcode);
  });
  return out;
}

export function readPrintCart() {
  try {
    const raw = window.localStorage.getItem(PRINT_CART_KEY);
    if (!raw) return { barcodes: [] };
    const parsed = JSON.parse(raw);
    return { barcodes: normalizeBarcodeList(parsed?.barcodes) };
  } catch {
    return { barcodes: [] };
  }
}

export function writePrintCart(next) {
  const payload = { barcodes: normalizeBarcodeList(next?.barcodes) };
  window.localStorage.setItem(PRINT_CART_KEY, JSON.stringify(payload));
  return payload;
}

export function clearPrintCart() {
  return writePrintCart({ barcodes: [] });
}

export function addBarcodesToPrintCart(barcodes) {
  const current = readPrintCart();
  const merged = normalizeBarcodeList([...(current.barcodes || []), ...(Array.isArray(barcodes) ? barcodes : [])]);
  return writePrintCart({ barcodes: merged });
}

export function removeBarcodeFromPrintCart(barcode) {
  const current = readPrintCart();
  const target = String(barcode || "").trim();
  return writePrintCart({
    barcodes: current.barcodes.filter((item) => item !== target),
  });
}

export function subscribePrintCart(listener) {
  if (typeof listener !== "function") return () => {};
  const onStorage = (event) => {
    if (event.key !== PRINT_CART_KEY) return;
    listener(readPrintCart());
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}
