const SCAN_STATE = {
  stream: null,
  detector: null,
  open: false,
  rafId: 0,
  lastCode: "",
  lastCodeAt: 0,
  mode: "",
  quaggaHandler: null,
  videoEl: null,
  detectBusy: false,
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

function resetVideoEl_(videoEl) {
  if (!videoEl) return;
  try {
    videoEl.pause();
  } catch {
    // ignore pause errors
  }
  try {
    videoEl.srcObject = null;
  } catch {
    // ignore detach errors
  }
  videoEl.hidden = false;
  videoEl.classList.remove("hidden");
}

function prepareVideoEl_(videoEl, facingMode) {
  if (!videoEl) return;
  videoEl.hidden = false;
  videoEl.classList.remove("hidden");
  videoEl.autoplay = true;
  videoEl.muted = true;
  videoEl.playsInline = true;
  videoEl.setAttribute("autoplay", "");
  videoEl.setAttribute("muted", "");
  videoEl.setAttribute("playsinline", "");
  videoEl.setAttribute("webkit-playsinline", "true");
  videoEl.style.transform = facingMode === "user" ? "scaleX(-1)" : "none";
}

function applyQuaggaStageLayout_(targetEl, facingMode) {
  const root = targetEl || null;
  if (!root || !root.querySelectorAll) return;

  // Quagga injects its own video/canvas nodes; force them to fully cover scanner stage.
  const videos = root.querySelectorAll("video");
  videos.forEach((el) => {
    el.style.position = "absolute";
    el.style.inset = "0";
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.objectFit = "cover";
    el.style.zIndex = "1";
    el.style.transform = facingMode === "user" ? "scaleX(-1)" : "none";
  });

  const canvases = root.querySelectorAll("canvas");
  canvases.forEach((el) => {
    el.style.position = "absolute";
    el.style.inset = "0";
    el.style.width = "100%";
    el.style.height = "100%";
    // drawingBuffer should be overlay on top of camera frame.
    el.style.zIndex = String(el.classList.contains("drawingBuffer") ? 2 : 1);
    el.style.pointerEvents = "none";
  });
}

async function requestStream_(facingMode) {
  const tries = [
    { facingMode: { exact: facingMode } },
    { facingMode: { ideal: facingMode } },
    true,
  ];
  let lastErr = null;
  for (const video of tries) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video,
        audio: false,
      });
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("ไม่สามารถเปิดกล้องได้");
}

async function attachStream_(videoEl, stream) {
  videoEl.srcObject = stream;
  await new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    videoEl.addEventListener("loadedmetadata", done, { once: true });
    window.setTimeout(done, 450);
  });
  await videoEl.play();
}

let quaggaLoaderPromise = null;

async function loadQuagga_() {
  if (typeof window !== "undefined" && window.Quagga) return window.Quagga;
  if (!quaggaLoaderPromise) {
    quaggaLoaderPromise = new Promise((resolve, reject) => {
      const existing = document.getElementById("quaggaScript");
      if (existing) {
        existing.addEventListener("load", () => resolve(window.Quagga), {
          once: true,
        });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.id = "quaggaScript";
      script.src = "https://unpkg.com/quagga@0.12.1/dist/quagga.min.js";
      script.onload = () => resolve(window.Quagga);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return quaggaLoaderPromise;
}

function cooldownPass_(code, cooldownMs) {
  const now = Date.now();
  if (
    code === SCAN_STATE.lastCode &&
    now - SCAN_STATE.lastCodeAt < cooldownMs
  ) {
    return false;
  }
  SCAN_STATE.lastCode = code;
  SCAN_STATE.lastCodeAt = now;
  return true;
}

function supported_() {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia)
  );
}

async function closeScanner() {
  stopLoop_();
  stopStream_();
  if (
    typeof window !== "undefined" &&
    window.Quagga &&
    SCAN_STATE.mode === "quagga"
  ) {
    try {
      if (SCAN_STATE.quaggaHandler) {
        window.Quagga.offDetected(SCAN_STATE.quaggaHandler);
      }
      window.Quagga.stop();
    } catch {
      // ignore cleanup errors
    }
  }
  if (SCAN_STATE.videoEl) {
    resetVideoEl_(SCAN_STATE.videoEl);
    SCAN_STATE.videoEl = null;
  }
  SCAN_STATE.detector = null;
  SCAN_STATE.open = false;
  SCAN_STATE.mode = "";
  SCAN_STATE.quaggaHandler = null;
  SCAN_STATE.detectBusy = false;
}

function isScannerOpen() {
  return SCAN_STATE.open;
}

async function openScanner(options = {}) {
  const {
    videoEl,
    targetEl,
    onDetected,
    formats = ["code_128", "ean_13", "ean_8"],
    continuous = true,
    cooldownMs = 900,
    facingMode = "environment",
  } = options;

  if (!videoEl) {
    throw new Error("ไม่พบ video element สำหรับสแกน");
  }
  if (typeof onDetected !== "function") {
    throw new Error("onDetected callback ไม่ถูกต้อง");
  }
  if (!supported_()) {
    throw new Error("อุปกรณ์นี้ไม่รองรับการเข้าถึงกล้อง");
  }

  await closeScanner();

  prepareVideoEl_(videoEl, facingMode);

  if (typeof window !== "undefined" && "BarcodeDetector" in window) {
    try {
      const stream = await requestStream_(facingMode);
      SCAN_STATE.stream = stream;
      SCAN_STATE.videoEl = videoEl;
      await attachStream_(videoEl, stream);

      SCAN_STATE.detector = new window.BarcodeDetector({ formats });
      SCAN_STATE.mode = "native";
      SCAN_STATE.open = true;

      const loop = async () => {
        if (!SCAN_STATE.open || !SCAN_STATE.detector) return;
        SCAN_STATE.rafId = requestAnimationFrame(async () => {
          try {
            const list = await SCAN_STATE.detector.detect(videoEl);
            const code =
              Array.isArray(list) && list.length
                ? String(list[0].rawValue || "").trim()
                : "";
            if (code && cooldownPass_(code, cooldownMs)) {
              if (SCAN_STATE.detectBusy) return;
              SCAN_STATE.detectBusy = true;
              try {
                await onDetected(code);
              } finally {
                SCAN_STATE.detectBusy = false;
              }
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
    } catch {
      stopStream_();
      resetVideoEl_(videoEl);
    }
  }

  const Quagga = await loadQuagga_();
  if (!Quagga) {
    throw new Error("ไม่สามารถโหลดตัวสแกนสำรองได้");
  }

  SCAN_STATE.mode = "quagga";
  SCAN_STATE.open = true;
  SCAN_STATE.videoEl = videoEl;
  const quaggaTarget = targetEl || videoEl.parentElement || videoEl;

  await new Promise((resolve, reject) => {
    Quagga.init(
      {
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: quaggaTarget,
          constraints: {
            facingMode: { ideal: facingMode },
          },
        },
        locator: {
          patchSize: "medium",
          halfSample: true,
        },
        numOfWorkers: Math.max(
          1,
          Math.min(4, navigator.hardwareConcurrency || 2),
        ),
        frequency: 10,
        decoder: {
          readers: ["ean_reader", "ean_8_reader", "code_128_reader"],
        },
      },
      (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Keep host video visible to avoid blank stage when Quagga output video is delayed.
        videoEl.hidden = false;
        videoEl.classList.remove("hidden");
        applyQuaggaStageLayout_(quaggaTarget, facingMode);
        SCAN_STATE.quaggaHandler = (result) => {
          const code = String(result?.codeResult?.code || "").trim();
          if (!code || !cooldownPass_(code, cooldownMs)) return;
          if (SCAN_STATE.detectBusy) return;
          SCAN_STATE.detectBusy = true;
          Promise.resolve(onDetected(code))
            .catch(() => {})
            .finally(() => {
              SCAN_STATE.detectBusy = false;
            });
          if (!continuous) {
            closeScanner();
          }
        };

        Quagga.onDetected(SCAN_STATE.quaggaHandler);
        Quagga.start();
        // Re-apply layout once stream is actually running.
        window.setTimeout(() => applyQuaggaStageLayout_(quaggaTarget, facingMode), 120);
        window.setTimeout(() => applyQuaggaStageLayout_(quaggaTarget, facingMode), 480);
        resolve();
      },
    );
  });

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
