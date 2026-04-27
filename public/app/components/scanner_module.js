const SCAN_STATE = {
  stream: null,
  detector: null,
  open: false,
  rafId: 0,
  lastCode: "",
  lastCodeAt: 0,
};

function stopLoop_() {
  if (SCAN_STATE.rafId) {
    cancelAnimationFrame(SCAN_STATE.rafId);
    SCAN_STATE.rafId = 0;
  }
}

function stopStream_() {
  if (SCAN_STATE.stream) {
    SCAN_STATE.stream.getTracks().forEach((t) => t.stop());
    SCAN_STATE.stream = null;
  }
}

function cooldownPass_(code, cooldownMs) {
  const now = Date.now();
  if (code === SCAN_STATE.lastCode && now - SCAN_STATE.lastCodeAt < cooldownMs) {
    return false;
  }
  SCAN_STATE.lastCode = code;
  SCAN_STATE.lastCodeAt = now;
  return true;
}

function supported_() {
  return typeof window !== "undefined" && "BarcodeDetector" in window;
}

async function closeScanner() {
  stopLoop_();
  stopStream_();
  SCAN_STATE.detector = null;
  SCAN_STATE.open = false;
}

function isScannerOpen() {
  return SCAN_STATE.open;
}

async function openScanner(options = {}) {
  const {
    videoEl,
    onDetected,
    formats = ["code_128", "ean_13", "ean_8"],
    continuous = true,
    cooldownMs = 900,
    facingMode = "environment",
  } = options;

  if (!supported_()) {
    throw new Error("อุปกรณ์นี้ไม่รองรับ BarcodeDetector");
  }
  if (!videoEl) {
    throw new Error("ไม่พบ video element สำหรับสแกน");
  }
  if (typeof onDetected !== "function") {
    throw new Error("onDetected callback ไม่ถูกต้อง");
  }

  await closeScanner();

  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: facingMode } },
    audio: false,
  });

  SCAN_STATE.stream = stream;
  videoEl.srcObject = stream;
  await videoEl.play();

  SCAN_STATE.detector = new window.BarcodeDetector({ formats });
  SCAN_STATE.open = true;

  const loop = async () => {
    if (!SCAN_STATE.open || !SCAN_STATE.detector) return;
    SCAN_STATE.rafId = requestAnimationFrame(async () => {
      try {
        const list = await SCAN_STATE.detector.detect(videoEl);
        const code = Array.isArray(list) && list.length ? String(list[0].rawValue || "").trim() : "";
        if (code && cooldownPass_(code, cooldownMs)) {
          await onDetected(code);
          if (!continuous) {
            await closeScanner();
            return;
          }
        }
      } catch {
        // ignore per-frame error
      }
      loop();
    });
  };

  loop();

  return {
    close: closeScanner,
    isOpen: isScannerOpen,
  };
}

export {
  supported_ as isScannerSupported,
  openScanner,
  closeScanner,
  isScannerOpen,
};
