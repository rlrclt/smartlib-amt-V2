import {
  apiNotificationsList,
  apiNotificationsMarkAllRead,
  apiNotificationsMarkRead,
  apiNotificationsUnreadCount,
} from "../data/api.js";
import { escapeHtml } from "../utils/html.js";

const POLL_MS = 60_000;
let pollTimer = 0;
let isBound = false;
let isPanelOpen = false;
let latestItems = [];

function readAuthSession() {
  const local = window.localStorage.getItem("smartlib.auth");
  const session = window.sessionStorage.getItem("smartlib.auth");
  const raw = local || session;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function hasActiveSession(auth) {
  if (!auth || !auth.user || !auth.token || !auth.signedInAt) return false;
  const signedAt = new Date(auth.signedInAt).getTime();
  if (!Number.isFinite(signedAt)) return false;
  return Date.now() - signedAt <= 12 * 60 * 60 * 1000;
}

function getEls() {
  return {
    toggle: document.querySelector("[data-noti-toggle]"),
    badge: document.querySelector("[data-noti-badge]"),
    panel: document.querySelector("[data-noti-panel]"),
    list: document.querySelector("[data-noti-list]"),
    markAll: document.querySelector("[data-noti-mark-all]"),
  };
}

function closePanel() {
  const { panel } = getEls();
  if (!panel) return;
  panel.classList.add("hidden");
  isPanelOpen = false;
}

function openPanel() {
  const { panel } = getEls();
  if (!panel) return;
  panel.classList.remove("hidden");
  isPanelOpen = true;
}

function setBadge(count) {
  const { badge } = getEls();
  if (!badge) return;
  const n = Number(count || 0);
  if (n <= 0) {
    badge.classList.add("hidden");
    badge.textContent = "0";
    return;
  }
  badge.classList.remove("hidden");
  badge.textContent = n > 99 ? "99+" : String(n);
}

function formatRelative(iso) {
  const ts = new Date(String(iso || "")).getTime();
  if (!Number.isFinite(ts)) return "-";
  const sec = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) return sec + " วินาทีที่แล้ว";
  const min = Math.floor(sec / 60);
  if (min < 60) return min + " นาทีที่แล้ว";
  const hr = Math.floor(min / 60);
  if (hr < 24) return hr + " ชั่วโมงที่แล้ว";
  const day = Math.floor(hr / 24);
  return day + " วันที่แล้ว";
}

function renderList(items) {
  const { list } = getEls();
  if (!list) return;
  if (!Array.isArray(items) || !items.length) {
    list.innerHTML = '<div class="rounded-xl border border-dashed border-slate-200 p-4 text-xs font-semibold text-slate-500">ยังไม่มีการแจ้งเตือน</div>';
    return;
  }
  list.innerHTML = items.map((item) => {
    const unreadClass = item.isRead ? "border-slate-200 bg-white" : "border-sky-200 bg-sky-50";
    const unreadDot = item.isRead ? "" : '<span class="mt-1 h-2 w-2 rounded-full bg-sky-500"></span>';
    const link = String(item.link || "").trim();
    const actionAttr = link ? ` data-link-path="${escapeHtml(link)}"` : "";
    return `
      <button type="button" data-noti-item="${escapeHtml(item.notiId || "")}"${actionAttr}
        class="w-full rounded-xl border ${unreadClass} p-3 text-left transition hover:border-sky-300">
        <div class="flex items-start gap-2">
          ${unreadDot}
          <div class="min-w-0 flex-1">
            <p class="truncate text-xs font-black text-slate-800">${escapeHtml(item.title || "-")}</p>
            <p class="mt-1 text-xs text-slate-600">${escapeHtml(item.message || "")}</p>
            <p class="mt-1 text-[11px] font-semibold text-slate-400">${escapeHtml(formatRelative(item.createdAt))}</p>
          </div>
        </div>
      </button>
    `;
  }).join("");
}

async function refreshUnreadCount() {
  try {
    const res = await apiNotificationsUnreadCount();
    if (!res?.ok) return;
    setBadge(res.data?.count || 0);
  } catch {
    // silent
  }
}

async function refreshList() {
  try {
    const res = await apiNotificationsList({ limit: 30 });
    if (!res?.ok) return;
    latestItems = Array.isArray(res.data?.items) ? res.data.items : [];
    renderList(latestItems);
  } catch {
    // silent
  }
}

function navigateInternal(path) {
  if (!path || path[0] !== "/") return;
  if (window.location.pathname === path) return;
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function bindPanelEvents() {
  if (isBound) return;
  isBound = true;

  document.addEventListener("click", async (event) => {
    const { toggle, panel } = getEls();
    const toggleBtn = event.target.closest("[data-noti-toggle]");
    if (toggleBtn && toggle) {
      if (isPanelOpen) {
        closePanel();
      } else {
        openPanel();
        await refreshList();
      }
      return;
    }

    const markAllBtn = event.target.closest("[data-noti-mark-all]");
    if (markAllBtn) {
      await apiNotificationsMarkAllRead();
      await refreshList();
      await refreshUnreadCount();
      return;
    }

    const itemBtn = event.target.closest("[data-noti-item]");
    if (itemBtn) {
      const notiId = itemBtn.getAttribute("data-noti-item");
      if (notiId) await apiNotificationsMarkRead(notiId);
      const path = itemBtn.getAttribute("data-link-path");
      closePanel();
      await refreshUnreadCount();
      await refreshList();
      if (path) navigateInternal(path);
      return;
    }

    if (isPanelOpen && panel && !panel.contains(event.target)) {
      closePanel();
    }
  });
}

function clearPolling() {
  if (!pollTimer) return;
  window.clearInterval(pollTimer);
  pollTimer = 0;
}

export function initNotificationHub() {
  clearPolling();
  closePanel();

  const auth = readAuthSession();
  if (!hasActiveSession(auth)) return;

  bindPanelEvents();
  refreshUnreadCount();

  pollTimer = window.setInterval(() => {
    refreshUnreadCount();
    if (isPanelOpen) refreshList();
  }, POLL_MS);
}
