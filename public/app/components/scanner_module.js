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
    SCAN_STATE.videoEl.hidden = false;
    SCAN_STATE.videoEl.classList.remove("hidden");
    SCAN_STATE.videoEl = null;
  }
  SCAN_STATE.detector = null;
  SCAN_STATE.open = false;
  SCAN_STATE.mode = "";
  SCAN_STATE.quaggaHandler = null;
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

  if (typeof window !== "undefined" && "BarcodeDetector" in window) {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode } },
      audio: false,
    });

    SCAN_STATE.stream = stream;
    SCAN_STATE.videoEl = videoEl;
    videoEl.srcObject = stream;
    await videoEl.play();

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

        videoEl.hidden = true;
        videoEl.classList.add("hidden");
        SCAN_STATE.quaggaHandler = (result) => {
          const code = String(result?.codeResult?.code || "").trim();
          if (!code || !cooldownPass_(code, cooldownMs)) return;
          onDetected(code);
          if (!continuous) {
            closeScanner();
          }
        };

        Quagga.onDetected(SCAN_STATE.quaggaHandler);
        Quagga.start();
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
