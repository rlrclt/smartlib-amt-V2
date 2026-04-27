function buildUrl(baseUrl, params) {
  const u = new URL(baseUrl);
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    u.searchParams.set(k, String(v));
  }
  return u.toString();
}

export function gasJsonp(baseUrl, params, { timeoutMs = 12000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!baseUrl) {
      reject(new Error("Missing GAS baseUrl"));
      return;
    }

    const cb = "__gas_cb_" + Date.now().toString(16) + "_" + Math.random().toString(16).slice(2);
    const script = document.createElement("script");

    const cleanup = () => {
      try { delete window[cb]; } catch { window[cb] = undefined; }
      script.remove();
      clearTimeout(timer);
    };

    window[cb] = (payload) => {
      cleanup();
      resolve(payload);
    };

    script.async = true;
    script.src = buildUrl(baseUrl, { ...params, callback: cb });
    script.onerror = () => {
      cleanup();
      reject(new Error("JSONP request failed"));
    };

    const timer = setTimeout(() => {
      // Reassign to a no-op function that cleans itself up so late responses don't throw ReferenceError
      window[cb] = () => {
        try { delete window[cb]; } catch { window[cb] = undefined; }
      };
      script.remove();
      reject(new Error("JSONP timeout"));
    }, timeoutMs);

    document.head.appendChild(script);
  });
}
