export function renderIconsSafe() {
  try {
    if (window.lucide && typeof window.lucide.createIcons === "function") {
      window.lucide.createIcons();
    }
  } catch {
    // ignore
  }
}

