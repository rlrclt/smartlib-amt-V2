import { navigateTo, renderRoute } from "./router.js";
import { renderIconsSafe } from "./icons.js";
import * as apiClient from "./data/api.js";
import { GAS_URL } from "./config.js";
import { gasJsonp } from "./data/gas_jsonp.js";
import { syncManageSidebarUi, toggleManageSidebar } from "./layouts/manage_shell.js";
import { initNotificationHub } from "./components/notification_hub.js";

const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const ANNOUNCEMENT_HIDE_UNTIL_KEY = "smartlib.announcement.hideUntilMs";
const ANNOUNCEMENT_HIDE_DURATION_MS = 60 * 60 * 1000;
let announcementDismissedOnce = false;
let mobileMenuBound = false;
let landingAnnouncements = [];
let landingAnnouncementsLoaded = false;
let landingAnnouncementsLoading = false;

function onLinkClick(e) {
  const sidebarToggle = e.target.closest("[data-sidebar-toggle]");
  if (sidebarToggle) {
    e.preventDefault();
    toggleManageSidebar();
    renderIconsSafe();
    return;
  }

  const a = e.target.closest("a[data-link]");
  if (!a) return;
  const url = new URL(a.href, window.location.href);
  if (url.origin !== window.location.origin) return;
  closeMobileMenu();
  e.preventDefault();
  navigateTo(`${url.pathname}${url.search}${url.hash}`);
  updateAuthCtas();
  syncAnnouncement(url.pathname);
}

function getMobileMenuEls() {
  return {
    btn: document.getElementById("mobileMenuBtn"),
    panel: document.getElementById("mobileMenu"),
    iconOpen: document.querySelector(".mobile-menu-icon-open"),
    iconClose: document.querySelector(".mobile-menu-icon-close"),
  };
}

function isMobileMenuOpen() {
  const { panel } = getMobileMenuEls();
  if (!panel) return false;
  return panel.classList.contains("mobile-menu-expanded");
}

function syncMobileMenuUi(open) {
  const { btn, panel, iconOpen, iconClose } = getMobileMenuEls();
  if (!btn || !panel) return;

  panel.classList.toggle("mobile-menu-expanded", open);
  panel.classList.toggle("mobile-menu-collapsed", !open);
  panel.setAttribute("aria-hidden", open ? "false" : "true");
  btn.setAttribute("aria-expanded", open ? "true" : "false");

  if (iconOpen) iconOpen.classList.toggle("hidden", open);
  if (iconClose) iconClose.classList.toggle("hidden", !open);
}

function openMobileMenu() {
  syncMobileMenuUi(true);
}

function closeMobileMenu() {
  syncMobileMenuUi(false);
}

function toggleMobileMenu() {
  if (isMobileMenuOpen()) {
    closeMobileMenu();
    return;
  }
  openMobileMenu();
}

function bindMobileMenu() {
  if (mobileMenuBound) return;
  const { btn } = getMobileMenuEls();
  if (!btn) return;

  btn.addEventListener("click", toggleMobileMenu);

  document.addEventListener("click", (event) => {
    const { btn: menuBtn, panel } = getMobileMenuEls();
    if (!menuBtn || !panel || !isMobileMenuOpen()) return;
    if (menuBtn.contains(event.target) || panel.contains(event.target)) return;
    closeMobileMenu();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth >= 768) closeMobileMenu();
  });

  mobileMenuBound = true;
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
  if (!auth) return false;
  if (!auth.user || !auth.token || !auth.signedInAt) return false;
  const signedAt = new Date(auth.signedInAt).getTime();
  if (!Number.isFinite(signedAt)) return false;
  return Date.now() - signedAt <= SESSION_MAX_AGE_MS;
}

function resolveHomeByGroup(groupType) {
  if (groupType === "manage") return "/manage";
  if (groupType === "member") return "/app";
  return "/";
}

function updateAuthCtas() {
  const authRaw = readAuthSession();
  const loggedIn = hasActiveSession(authRaw);
  const groupType = String(authRaw?.user?.groupType || "").toLowerCase();
  const homePath = resolveHomeByGroup(groupType);

  const desktopPrimary = document.getElementById("cta-desktop-primary");
  const desktopSecondary = document.getElementById("cta-desktop-secondary");
  const mobilePrimary = document.getElementById("cta-mobile-primary");
  const mobileSecondary = document.getElementById("cta-mobile-secondary");

  if (loggedIn) {
    if (desktopPrimary) {
      desktopPrimary.href = homePath;
      desktopPrimary.textContent = "แดชบอร์ด";
    }
    if (desktopSecondary) {
      desktopSecondary.href = "/logout";
      desktopSecondary.textContent = "ออกจากระบบ";
    }
    if (mobilePrimary) {
      mobilePrimary.href = homePath;
      mobilePrimary.textContent = "แดชบอร์ด";
    }
    if (mobileSecondary) {
      mobileSecondary.href = "/logout";
      mobileSecondary.textContent = "ออกจากระบบ";
    }
    return;
  }

  if (desktopPrimary) {
    desktopPrimary.href = "/signup";
    desktopPrimary.textContent = "เริ่มต้นใช้งานฟรี";
  }
  if (desktopSecondary) {
    desktopSecondary.href = "/login";
    desktopSecondary.textContent = "เข้าสู่ระบบ";
  }
  if (mobilePrimary) {
    mobilePrimary.href = "/signup";
    mobilePrimary.textContent = "เริ่มต้นใช้งานฟรี";
  }
  if (mobileSecondary) {
    mobileSecondary.href = "/login";
    mobileSecondary.textContent = "เข้าสู่ระบบ";
  }
}

function renderCurrentRoute() {
  renderRoute(window.location.pathname);
  syncManageSidebarUi();
  initNotificationHub();
  renderLandingAnnouncements();
  updateAuthCtas();
  syncAnnouncement(window.location.pathname);
  closeMobileMenu();
  renderIconsSafe();
}

function renderLandingAnnouncements() {
  const list = document.getElementById("landingAnnouncementsList");
  if (!list) return;

  const teaserItems = landingAnnouncements.slice(0, 3);

  if (!landingAnnouncementsLoaded && !landingAnnouncementsLoading) {
    loadLandingAnnouncements();
  }

  if (!teaserItems.length && landingAnnouncementsLoading) {
    list.innerHTML = '<div class="rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-500">กำลังโหลดประกาศ...</div>';
    return;
  }

  if (!teaserItems.length) {
    list.innerHTML = '<div class="rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-500">ยังไม่มีประกาศ</div>';
    return;
  }

  list.innerHTML = teaserItems.map((item, index) => {
    const rotation = index % 3 === 0 ? "-rotate-2" : index % 3 === 1 ? "rotate-1" : "-rotate-1";
    const tag = index % 3 === 0 ? "Event" : index % 3 === 1 ? "Notice" : "Update";
    const href = `/announcements?id=${encodeURIComponent(item.id)}`;

    return `
      <article
        class="quest-news-paper p-6 rounded-xl relative ${rotation} cursor-pointer"
        data-announcement-href="${href}"
      >
        <div class="washi-strip washi-strip-left"></div>
        <div class="washi-strip washi-strip-right"></div>
        <span class="inline-block bg-[#475569] text-[#f8fafc] text-[10px] font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-tighter">${tag}</span>
        <h3 class="quest-mitr text-xl font-bold mb-2 leading-tight text-[#3a2512]">${escapeHtml(item.title)}</h3>
        <p class="text-[11px] font-bold uppercase tracking-wider text-[#6b4320]">${escapeHtml(item.date)}</p>
        <p class="text-sm text-[#4b311a] opacity-85 line-clamp-3 mt-2 mb-4">${escapeHtml(item.summary)}</p>
        <button type="button" class="quest-btn-game w-full py-3 text-[#1e293b] font-bold rounded-xl text-sm">อ่านรายละเอียด</button>
      </article>
    `;
  }).join("");

  list.querySelectorAll("[data-announcement-href]").forEach((el) => {
    const href = el.getAttribute("data-announcement-href");
    if (!href) return;
    el.addEventListener("click", () => {
      window.open(href, "_blank", "noopener,noreferrer");
    });
  });
}

function callAnnouncementList(params = {}) {
  if (typeof apiClient.apiAnnouncementList === "function") {
    return apiClient.apiAnnouncementList(params);
  }
  return gasJsonp(GAS_URL, { action: "announcement_list", ...params });
}

async function loadLandingAnnouncements() {
  landingAnnouncementsLoading = true;
  try {
    const res = await callAnnouncementList();
    if (res?.ok && Array.isArray(res.data)) {
      landingAnnouncements = res.data;
    } else {
      landingAnnouncements = [];
    }
  } catch {
    landingAnnouncements = [];
  } finally {
    landingAnnouncementsLoaded = true;
    landingAnnouncementsLoading = false;
    if (isLandingPath(window.location.pathname)) renderLandingAnnouncements();
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getAnnouncementEls() {
  const overlay = document.getElementById("announcementOverlay");
  const checkbox = document.getElementById("announcementHide1h");
  return { overlay, checkbox };
}

function isLandingPath(pathname) {
  return pathname === "/" || pathname === "/home";
}

function shouldSuppressAnnouncement() {
  const hideUntilRaw = window.localStorage.getItem(ANNOUNCEMENT_HIDE_UNTIL_KEY);
  const hideUntil = Number(hideUntilRaw || 0);
  return Number.isFinite(hideUntil) && hideUntil > Date.now();
}

function showAnnouncement() {
  const { overlay } = getAnnouncementEls();
  if (!overlay) return;
  overlay.hidden = false;
}

function hideAnnouncement() {
  const { overlay } = getAnnouncementEls();
  if (!overlay) return;
  overlay.hidden = true;
}

function dismissAnnouncement() {
  const { checkbox } = getAnnouncementEls();
  if (checkbox?.checked) {
    const hideUntil = Date.now() + ANNOUNCEMENT_HIDE_DURATION_MS;
    window.localStorage.setItem(ANNOUNCEMENT_HIDE_UNTIL_KEY, String(hideUntil));
  }
  announcementDismissedOnce = true;
  hideAnnouncement();
}

function syncAnnouncement(pathname) {
  if (!isLandingPath(pathname)) {
    hideAnnouncement();
    return;
  }
  if (announcementDismissedOnce || shouldSuppressAnnouncement()) {
    hideAnnouncement();
    return;
  }
  showAnnouncement();
}

export function initSpa() {
  document.addEventListener("click", onLinkClick);
  window.addEventListener("popstate", renderCurrentRoute);
  window.addEventListener("storage", updateAuthCtas);
  bindMobileMenu();

  document.querySelectorAll("[data-announcement-close]").forEach((el) => {
    el.addEventListener("click", dismissAnnouncement);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const { overlay } = getAnnouncementEls();
    if (overlay && !overlay.hidden) dismissAnnouncement();
  });

  renderCurrentRoute();
}
