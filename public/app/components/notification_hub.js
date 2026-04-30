import {
  apiNotificationsList,
  apiNotificationsMarkAllRead,
  apiNotificationsMarkRead,
  apiNotificationsUnreadCount,
} from "../data/api.js";
import { escapeHtml } from "../utils/html.js";

const POLL_MS = 60_000;
const LOG_PREFIX = "[MemberNoti]";
const DEV_LOG = /localhost|127\.0\.0\.1/.test(window.location?.hostname || "");
let pollTimer = 0;
let isBound = false;
let isPanelOpen = false;
let closeTimer = 0;
let latestItems = [];
let unreadCountCache = 0;
let visibilityBound = false;
let isRefreshingList = false;
let isRefreshingUnread = false;

function logDebug(message, meta) {
  if (!DEV_LOG) return;
  if (meta !== undefined) {
    console.info(`${LOG_PREFIX} ${message}`, meta);
    return;
  }
  console.info(`${LOG_PREFIX} ${message}`);
}

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
    overlay: document.querySelector("[data-noti-overlay]"),
    panel: document.querySelector("[data-noti-panel]"),
    list: document.querySelector("[data-noti-list]"),
    markAll: document.querySelector("[data-noti-mark-all]"),
    closeBtn: document.querySelector("[data-noti-close]"),
  };
}

function closePanel() {
  const { panel, overlay } = getEls();
  if (!panel) return;
  if (closeTimer) {
    window.clearTimeout(closeTimer);
    closeTimer = 0;
  }
  if (overlay) overlay.classList.add("hidden");
  panel.classList.remove("member-noti-popover-enter");
  panel.classList.add("member-noti-popover-exit");
  closeTimer = window.setTimeout(() => {
    panel.classList.add("hidden");
    panel.classList.remove("member-noti-popover-exit");
    closeTimer = 0;
  }, 200);
  isPanelOpen = false;
  logDebug("panel closed");
}

function openPanel() {
  const { panel, overlay } = getEls();
  if (!panel) return;
  if (closeTimer) {
    window.clearTimeout(closeTimer);
    closeTimer = 0;
  }
  if (overlay) overlay.classList.remove("hidden");
  panel.classList.remove("hidden", "member-noti-popover-exit");
  panel.classList.add("member-noti-popover-enter");
  isPanelOpen = true;
  logDebug("panel opened");
}

function setBadge(count) {
  const { badge } = getEls();
  if (!badge) return;
  const n = Number(count || 0);
  unreadCountCache = Math.max(0, n);
  if (n <= 0) {
    badge.classList.add("hidden");
    badge.textContent = "0";
    return;
  }
  badge.classList.remove("hidden");
  badge.textContent = n > 99 ? "99+" : String(n);
}

function typeIcon_(type) {
  const value = String(type || "").toLowerCase();
  if (value === "fine") return "wallet";
  if (value === "loan") return "book-open-check";
  if (value === "reservation") return "bookmark-check";
  return "bell";
}

function typeTone_(type) {
  const value = String(type || "").toLowerCase();
  if (value === "fine") return "bg-rose-50 text-rose-600 ring-rose-100";
  if (value === "loan") return "bg-emerald-50 text-emerald-600 ring-emerald-100";
  if (value === "reservation") return "bg-amber-50 text-amber-600 ring-amber-100";
  return "bg-sky-50 text-sky-600 ring-sky-100";
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
  const deduped = [];
  const seen = new Set();
  items.forEach((item) => {
    const id = String(item?.notiId || "").trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    deduped.push(item);
  });

  list.innerHTML = deduped.map((item) => {
    const unreadClass = item.isRead ? "opacity-60" : "";
    const unreadDot = item.isRead ? "" : '<span class="absolute left-2 top-5 h-1.5 w-1.5 rounded-full bg-sky-500"></span>';
    const tone = typeTone_(item.type);
    const icon = typeIcon_(item.type);
    const link = String(item.link || "").trim();
    const actionAttr = link ? ` data-link-path="${escapeHtml(link)}"` : "";
    return `
      <button type="button" data-noti-item="${escapeHtml(item.notiId || "")}"${actionAttr}
        class="relative w-full p-3 px-5 text-left transition hover:bg-slate-50 ${unreadClass}">
        <div class="flex items-start gap-3">
          ${unreadDot}
          <span class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ${tone}">
            <i data-lucide="${icon}" class="h-4 w-4"></i>
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[13px] font-bold text-slate-800">${escapeHtml(item.title || "-")}</p>
            <p class="mt-0.5 text-[11px] font-medium text-slate-500">${escapeHtml(item.message || "")}</p>
            <p class="mt-1 text-[10px] font-bold ${item.isRead ? "text-slate-400" : "text-sky-500"}">${escapeHtml(formatRelative(item.createdAt))}</p>
          </div>
        </div>
      </button>
    `;
  }).join("");
  if (window.lucide?.createIcons) window.lucide.createIcons();
  logDebug("list rendered", { count: deduped.length });
}

function renderLoading() {
  const { list } = getEls();
  if (!list) return;
  list.innerHTML = `
    <div class="space-y-2 px-4 py-3">
      <div class="h-16 animate-pulse rounded-xl bg-slate-100"></div>
      <div class="h-16 animate-pulse rounded-xl bg-slate-100"></div>
      <div class="h-16 animate-pulse rounded-xl bg-slate-100"></div>
    </div>
  `;
}

function renderError(message) {
  const { list } = getEls();
  if (!list) return;
  list.innerHTML = `<div class="rounded-xl border border-rose-100 bg-rose-50 p-4 text-xs font-semibold text-rose-700">${escapeHtml(message || "โหลดการแจ้งเตือนไม่สำเร็จ")}</div>`;
}

async function refreshUnreadCount() {
  if (isRefreshingUnread) return;
  isRefreshingUnread = true;
  try {
    const res = await apiNotificationsUnreadCount();
    if (!res?.ok) return;
    setBadge(res.data?.count || 0);
    logDebug("unread synced", { count: res.data?.count || 0 });
  } catch {
    // silent
  } finally {
    isRefreshingUnread = false;
  }
}

async function refreshList() {
  if (isRefreshingList) return;
  isRefreshingList = true;
  try {
    renderLoading();
    const res = await apiNotificationsList({ limit: 30 });
    if (!res?.ok) {
      renderError("โหลดรายการแจ้งเตือนไม่สำเร็จ");
      return;
    }
    latestItems = Array.isArray(res.data?.items) ? res.data.items : [];
    renderList(latestItems);
    logDebug("list synced", { count: latestItems.length });
  } catch (err) {
    renderError(err?.message || "โหลดรายการแจ้งเตือนไม่สำเร็จ");
  } finally {
    isRefreshingList = false;
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
    const { toggle, panel, overlay, closeBtn } = getEls();
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
      const snapshot = latestItems.slice();
      const prevUnread = unreadCountCache;
      latestItems = latestItems.map((item) => ({ ...item, isRead: true }));
      renderList(latestItems);
      setBadge(0);
      apiNotificationsMarkAllRead()
        .then(() => refreshUnreadCount())
        .catch(() => {
          latestItems = snapshot;
          renderList(latestItems);
          setBadge(prevUnread);
          refreshUnreadCount();
        });
      return;
    }

    const itemBtn = event.target.closest("[data-noti-item]");
    if (itemBtn) {
      const notiId = itemBtn.getAttribute("data-noti-item");
      if (notiId) {
        let changed = false;
        latestItems = latestItems.map((item) => {
          if (String(item.notiId || "") !== String(notiId) || item.isRead) return item;
          changed = true;
          return { ...item, isRead: true };
        });
        if (changed) {
          const previousUnread = unreadCountCache;
          renderList(latestItems);
          setBadge(Math.max(0, unreadCountCache - 1));
          itemBtn.dataset.previousUnread = String(previousUnread);
        }
      }
      const path = itemBtn.getAttribute("data-link-path");
      closePanel();
      if (notiId) {
        apiNotificationsMarkRead(notiId)
          .then(() => refreshUnreadCount())
          .catch(() => {
            latestItems = latestItems.map((item) => {
              if (String(item.notiId || "") !== String(notiId)) return item;
              return { ...item, isRead: false };
            });
            renderList(latestItems);
            const rollbackUnread = Number(itemBtn.dataset.previousUnread || unreadCountCache + 1);
            setBadge(rollbackUnread);
            refreshUnreadCount();
          });
      }
      if (path) navigateInternal(path);
      return;
    }

    const closeBtnClick = event.target.closest("[data-noti-close]");
    if (closeBtnClick || (overlay && event.target === overlay) || (closeBtn && event.target === closeBtn)) {
      closePanel();
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

function tickPoll() {
  if (document.visibilityState !== "visible") return;
  refreshUnreadCount();
  if (isPanelOpen) refreshList();
}

function bindVisibilityEvents() {
  if (visibilityBound) return;
  visibilityBound = true;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    tickPoll();
  });
}

export function initNotificationHub() {
  clearPolling();
  closePanel();

  const auth = readAuthSession();
  if (!hasActiveSession(auth)) return;

  bindPanelEvents();
  bindVisibilityEvents();
  refreshUnreadCount();

  pollTimer = window.setInterval(tickPoll, POLL_MS);
  logDebug("hub initialized");
}
