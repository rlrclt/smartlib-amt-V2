const toast = document.getElementById("toast");

export function showToast(msg) {
  if (!toast) return;
  toast.textContent = String(msg);
  toast.classList.add("show");
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(() => toast.classList.remove("show"), 2200);
}

