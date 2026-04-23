import { renderDbView, mountDbView } from "../views/db.js";
import { renderSigninView, mountSigninView } from "../views/auth/signin.view.js";
import { renderSignupView, mountSignupView } from "../views/auth/signup.view.js";
import { renderSigninTestView, mountSigninTestView } from "../views/auth/signin_test.view.js";
import { renderSignupTestView, mountSignupTestView } from "../views/auth/signup_test.view.js";
import { renderAnnouncementsView, mountAnnouncementsView } from "../views/announcements.view.js";
import { renderNotFound } from "../views/not_found.js";
import { renderStaticPage } from "../views/static_page.js";
import { renderManageShell } from "../layouts/manage_shell.js";
import { renderDashboardView, mountDashboardView } from "../views/manage/dashboard.view.js";
import {
  renderManageAnnouncementsView,
  mountManageAnnouncementsView,
} from "../views/manage/announcements.view.js";
import {
  renderManageBooksView,
  mountManageBooksView,
} from "../views/manage/books.view.js";
import {
  renderRegisterBooksView,
  mountRegisterBooksView,
} from "../views/manage/register_books.view.js";
import {
  renderAddBookItemsView,
  mountAddBookItemsView,
} from "../views/manage/add_book_items.view.js";
import {
  renderViewBookItemsView,
  mountViewBookItemsView,
} from "../views/manage/view_book_items.view.js";
import {
  renderManagePrintBarcodesView,
  mountManagePrintBarcodesView,
} from "../views/manage/print_barcodes.view.js";
import {
  renderManageSelectPrintBarcodesView,
  mountManageSelectPrintBarcodesView,
} from "../views/manage/select_print_barcodes.view.js";

const SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000;

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

function clearAuthSession() {
  window.localStorage.removeItem("smartlib.auth");
  window.sessionStorage.removeItem("smartlib.auth");
}

function hasActiveSession(auth) {
  if (!auth) return false;
  if (!auth.user || !auth.token || !auth.signedInAt) return false;
  const signedAt = new Date(auth.signedInAt).getTime();
  if (!Number.isFinite(signedAt)) return false;
  return Date.now() - signedAt <= SESSION_MAX_AGE_MS;
}

function resolveHomeByGroupType(groupType) {
  if (groupType === "manage") return "/manage";
  if (groupType === "member") return "/app";
  return "/";
}

function buildAuthRedirectRoute(groupType) {
  return {
    kind: "view",
    render: () => "",
    mount: () => {
      const target = resolveHomeByGroupType(groupType);
      if (window.location.pathname === target) return;
      window.history.replaceState({}, "", target);
      window.dispatchEvent(new PopStateEvent("popstate"));
    },
  };
}

function renderNeedLogin(targetPath) {
  return renderStaticPage({
    title: "ต้องเข้าสู่ระบบก่อน",
    bodyHtml: `<p>กรุณา <a data-link href="/signin">เข้าสู่ระบบ</a> เพื่อเข้าใช้งาน <code>${targetPath}</code></p>`,
  });
}

function renderForbidden(expectedGroup, actualGroup) {
  return renderStaticPage({
    title: "ไม่มีสิทธิ์เข้าถึงหน้านี้",
    bodyHtml: `<p>หน้านี้ต้องเป็นกลุ่ม <code>${expectedGroup}</code> แต่บัญชีนี้เป็น <code>${actualGroup || "unknown"}</code></p>`,
  });
}

function renderForbiddenRole(expectedRole, actualRole) {
  return renderStaticPage({
    title: "ไม่มีสิทธิ์เข้าถึงหน้านี้",
    bodyHtml: `<p>หน้านี้ต้องใช้สิทธิ์ <code>${expectedRole}</code> แต่บัญชีนี้เป็น <code>${actualRole || "unknown"}</code></p>`,
  });
}

function renderDashboardPlaceholder(groupType) {
  const isManage = groupType === "manage";
  return renderStaticPage({
    title: isManage ? "Manage Home" : "Member Home",
    bodyHtml: [
      `<p>หน้านี้เป็น placeholder สำหรับกลุ่ม <code>${groupType}</code></p>`,
      '<p><a data-link href="/logout">ออกจากระบบ</a></p>',
    ].join(""),
  });
}

function isLocalDevHost() {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export function resolveRoute(pathname) {
  const rawPath = pathname || "/";
  const p = rawPath.length > 1 ? rawPath.replace(/\/+$/, "") : rawPath;
  const authRaw = readAuthSession();
  const auth = hasActiveSession(authRaw) ? authRaw : null;
  if (authRaw && !auth) clearAuthSession();
  const groupType = String(auth?.user?.groupType || "").toLowerCase();
  const role = String(auth?.user?.role || "").toLowerCase();

  if (p === "/" || p === "/home") return { kind: "landing" };
  if (p === "/logout") {
    return {
      kind: "view",
      render: () => "",
      mount: () => {
        clearAuthSession();
        window.history.replaceState({}, "", "/signin");
        window.dispatchEvent(new PopStateEvent("popstate"));
      },
    };
  }
  if (p === "/db") return { kind: "view", render: renderDbView, mount: mountDbView };
  if (p === "/signin" || p === "/login") {
    if (auth) return buildAuthRedirectRoute(groupType);
    return { kind: "view", render: renderSigninView, mount: mountSigninView };
  }
  if (p === "/signup") {
    if (auth) return buildAuthRedirectRoute(groupType);
    return { kind: "view", render: renderSignupView, mount: mountSignupView };
  }
  if (p === "/announcements") return { kind: "view", render: renderAnnouncementsView, mount: mountAnnouncementsView };
  if (p === "/test-signin") {
    if (!isLocalDevHost()) return { kind: "view", render: () => renderNotFound(p) };
    return { kind: "view", render: renderSigninTestView, mount: mountSigninTestView };
  }
  if (p === "/test-signup") {
    if (!isLocalDevHost()) return { kind: "view", render: () => renderNotFound(p) };
    return { kind: "view", render: renderSignupTestView, mount: mountSignupTestView };
  }
  if (p === "/manage") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    return { 
      kind: "view", 
      render: () => renderManageShell(renderDashboardView()),
      mount: (container) => mountDashboardView(container)
    };
  }
  if (p === "/manage/announcements") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage/announcements") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    if (role !== "admin") return { kind: "view", render: () => renderForbiddenRole("admin", role) };
    return {
      kind: "view",
      render: () => renderManageShell(renderManageAnnouncementsView()),
      mount: (container) => mountManageAnnouncementsView(container),
    };
  }
  if (p === "/manage/books") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage/books") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    if (role !== "admin") return { kind: "view", render: () => renderForbiddenRole("admin", role) };
    return {
      kind: "view",
      render: () => renderManageShell(renderManageBooksView()),
      mount: (container) => mountManageBooksView(container),
    };
  }
  if (p === "/manage/register_books") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage/register_books") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    if (role !== "admin") return { kind: "view", render: () => renderForbiddenRole("admin", role) };
    return {
      kind: "view",
      render: () => renderManageShell(renderRegisterBooksView()),
      mount: (container) => mountRegisterBooksView(container),
    };
  }
  if (p === "/manage/add_book_items") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage/add_book_items") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    if (role !== "admin") return { kind: "view", render: () => renderForbiddenRole("admin", role) };
    return {
      kind: "view",
      render: () => renderManageShell(renderAddBookItemsView()),
      mount: (container) => mountAddBookItemsView(container),
    };
  }
  if (p === "/manage/view_book_items") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage/view_book_items") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    if (role !== "admin") return { kind: "view", render: () => renderForbiddenRole("admin", role) };
    return {
      kind: "view",
      render: () => renderManageShell(renderViewBookItemsView()),
      mount: (container) => mountViewBookItemsView(container),
    };
  }
  if (p === "/manage/print-barcodes") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage/print-barcodes") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    if (role !== "admin") return { kind: "view", render: () => renderForbiddenRole("admin", role) };
    return {
      kind: "view",
      render: () => renderManageShell(renderManagePrintBarcodesView()),
      mount: (container) => mountManagePrintBarcodesView(container),
    };
  }
  if (p === "/manage/books/select-print") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage/books/select-print") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    if (role !== "admin") return { kind: "view", render: () => renderForbiddenRole("admin", role) };
    return {
      kind: "view",
      render: () => renderManageShell(renderManageSelectPrintBarcodesView()),
      mount: (container) => mountManageSelectPrintBarcodesView(container),
    };
  }
  if (p === "/app") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/app") };
    if (groupType !== "member") return { kind: "view", render: () => renderForbidden("member", groupType) };
    return { kind: "view", render: () => renderDashboardPlaceholder("member") };
  }

  if (p === "/about") {
    return {
      kind: "view",
      render: () =>
        renderStaticPage({
          title: "เกี่ยวกับเรา",
          bodyHtml: "<p>หน้านี้ยังอยู่ระหว่างจัดทำ</p>",
        }),
    };
  }

  if (p === "/privacy") {
    return {
      kind: "view",
      render: () =>
        renderStaticPage({
          title: "นโยบายความเป็นส่วนตัว",
          bodyHtml: "<p>หน้านี้ยังอยู่ระหว่างจัดทำ</p>",
        }),
    };
  }

  return { kind: "view", render: () => renderNotFound(p) };
}
