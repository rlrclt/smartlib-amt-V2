import { renderNotFound } from "../views/not_found.js";
import { renderStaticPage } from "../views/static_page.js";
import { renderManageShell } from "../layouts/manage_shell.js";
import { renderMemberShell } from "../layouts/member_shell.js";

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

function hasAnyRole(role, expected) {
  return expected.indexOf(String(role || "").toLowerCase()) >= 0;
}

function canAccessMemberArea(groupType, role) {
  if (groupType === "member") return true;
  if (groupType === "manage" && hasAnyRole(role, ["admin", "librarian"])) return true;
  return false;
}

function isLocalDevHost() {
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function createLazyRoute(loader, { layout = null, renderName = "render", mountName = "mount" } = {}) {
  let modulePromise = null;
  const loadModule = () => {
    if (!modulePromise) modulePromise = loader();
    return modulePromise;
  };

  return {
    kind: "view",
    layout,
    async render() {
      const mod = await loadModule();
      const renderFn = mod[renderName];
      return typeof renderFn === "function" ? await renderFn() : "";
    },
    async mount(container) {
      const mod = await loadModule();
      const mountFn = mod[mountName];
      if (typeof mountFn === "function") return await mountFn(container);
      return undefined;
    },
  };
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
  if (p === "/db") return createLazyRoute(() => import("../views/db.js"), {
    renderName: "renderDbView",
    mountName: "mountDbView",
  });
  if (p === "/signin" || p === "/login") {
    if (auth) return buildAuthRedirectRoute(groupType);
    return createLazyRoute(() => import("../views/auth/signin.view.js"), {
      renderName: "renderSigninView",
      mountName: "mountSigninView",
    });
  }
  if (p === "/signup") {
    if (auth) return buildAuthRedirectRoute(groupType);
    return createLazyRoute(() => import("../views/auth/signup.view.js"), {
      renderName: "renderSignupView",
      mountName: "mountSignupView",
    });
  }
  if (p === "/announcements") return createLazyRoute(() => import("../views/announcements.view.js"), {
    renderName: "renderAnnouncementsView",
    mountName: "mountAnnouncementsView",
  });
  if (p === "/test-signin") {
    if (!isLocalDevHost()) return { kind: "view", render: () => renderNotFound(p) };
    return createLazyRoute(() => import("../views/auth/signin_test.view.js"), {
      renderName: "renderSigninTestView",
      mountName: "mountSigninTestView",
    });
  }
  if (p === "/test-signup") {
    if (!isLocalDevHost()) return { kind: "view", render: () => renderNotFound(p) };
    return createLazyRoute(() => import("../views/auth/signup_test.view.js"), {
      renderName: "renderSignupTestView",
      mountName: "mountSignupTestView",
    });
  }
  if (p === "/manage") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    return {
      kind: "view",
      layout: "manage",
      ...createLazyRoute(() => import("../views/manage/dashboard.view.js"), {
        layout: "manage",
        renderName: "renderDashboardView",
        mountName: "mountDashboardView",
      }),
    };
  }
  if (p === "/manage/announcements") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage/announcements") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    if (role !== "admin") return { kind: "view", render: () => renderForbiddenRole("admin", role) };
    return {
      kind: "view",
      layout: "manage",
      ...createLazyRoute(() => import("../views/manage/announcements.view.js"), {
        layout: "manage",
        renderName: "renderManageAnnouncementsView",
        mountName: "mountManageAnnouncementsView",
      }),
    };
  }
  if (p === "/manage/books") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage/books") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    if (role !== "admin") return { kind: "view", render: () => renderForbiddenRole("admin", role) };
    return {
      kind: "view",
      layout: "manage",
      ...createLazyRoute(() => import("../views/manage/books.view.js"), {
        layout: "manage",
        renderName: "renderManageBooksView",
        mountName: "mountManageBooksView",
      }),
    };
  }
  if (p === "/manage/users") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage/users") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    if (role !== "admin") return { kind: "view", render: () => renderForbiddenRole("admin", role) };
    return {
      kind: "view",
      layout: "manage",
      ...createLazyRoute(() => import("../views/manage/users.view.js"), {
        layout: "manage",
        renderName: "renderManageUsersView",
        mountName: "mountManageUsersView",
      }),
    };
  }
  if (p === "/manage/users/edit") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage/users/edit") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    if (role !== "admin") return { kind: "view", render: () => renderForbiddenRole("admin", role) };
    return {
      kind: "view",
      layout: "manage",
      ...createLazyRoute(() => import("../views/manage/users_edit.view.js"), {
        layout: "manage",
        renderName: "renderManageUsersEditView",
        mountName: "mountManageUsersEditView",
      }),
    };
  }
  if (p === "/manage/users/import") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage/users/import") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    if (role !== "admin") return { kind: "view", render: () => renderForbiddenRole("admin", role) };
    return {
      kind: "view",
      layout: "manage",
      ...createLazyRoute(() => import("../views/manage/users_import.view.js"), {
        layout: "manage",
        renderName: "renderManageUsersImportView",
        mountName: "mountManageUsersImportView",
      }),
    };
  }
  if (p === "/manage/register_books") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage/register_books") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    if (role !== "admin") return { kind: "view", render: () => renderForbiddenRole("admin", role) };
    return {
      kind: "view",
      layout: "manage",
      ...createLazyRoute(() => import("../views/manage/register_books.view.js"), {
        layout: "manage",
        renderName: "renderRegisterBooksView",
        mountName: "mountRegisterBooksView",
      }),
    };
  }
  if (p === "/manage/add_book_items") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage/add_book_items") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    if (role !== "admin") return { kind: "view", render: () => renderForbiddenRole("admin", role) };
    return {
      kind: "view",
      layout: "manage",
      ...createLazyRoute(() => import("../views/manage/add_book_items.view.js"), {
        layout: "manage",
        renderName: "renderAddBookItemsView",
        mountName: "mountAddBookItemsView",
      }),
    };
  }
  if (p === "/manage/view_book_items") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage/view_book_items") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    if (role !== "admin") return { kind: "view", render: () => renderForbiddenRole("admin", role) };
    return {
      kind: "view",
      layout: "manage",
      ...createLazyRoute(() => import("../views/manage/view_book_items.view.js"), {
        layout: "manage",
        renderName: "renderViewBookItemsView",
        mountName: "mountViewBookItemsView",
      }),
    };
  }
  if (p === "/manage/print-barcodes") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage/print-barcodes") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    if (role !== "admin") return { kind: "view", render: () => renderForbiddenRole("admin", role) };
    return {
      kind: "view",
      layout: "manage",
      ...createLazyRoute(() => import("../views/manage/print_barcodes.view.js"), {
        layout: "manage",
        renderName: "renderManagePrintBarcodesView",
        mountName: "mountManagePrintBarcodesView",
      }),
    };
  }
  if (p === "/manage/books/select-print") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage/books/select-print") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    if (role !== "admin") return { kind: "view", render: () => renderForbiddenRole("admin", role) };
    return {
      kind: "view",
      layout: "manage",
      ...createLazyRoute(() => import("../views/manage/select_print_barcodes.view.js"), {
        layout: "manage",
        renderName: "renderManageSelectPrintBarcodesView",
        mountName: "mountManageSelectPrintBarcodesView",
      }),
    };
  }
  if (p === "/manage/settings") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage/settings") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    if (role !== "admin") return { kind: "view", render: () => renderForbiddenRole("admin", role) };
    return {
      kind: "view",
      layout: "manage",
      ...createLazyRoute(() => import("../views/manage/settings.view.js"), {
        layout: "manage",
        renderName: "renderManageSettingsView",
        mountName: "mountManageSettingsView",
      }),
    };
  }
  if (p === "/manage/settings/policies") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage/settings/policies") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    if (role !== "admin") return { kind: "view", render: () => renderForbiddenRole("admin", role) };
    return {
      kind: "view",
      layout: "manage",
      ...createLazyRoute(() => import("../views/manage/settings_policies.view.js"), {
        layout: "manage",
        renderName: "renderManageSettingsPoliciesView",
        mountName: "mountManageSettingsPoliciesView",
      }),
    };
  }
  if (p === "/manage/settings/library") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage/settings/library") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    if (role !== "admin") return { kind: "view", render: () => renderForbiddenRole("admin", role) };
    return {
      kind: "view",
      layout: "manage",
      ...createLazyRoute(() => import("../views/manage/library_settings.view.js"), {
        layout: "manage",
        renderName: "renderManageLibrarySettingsView",
        mountName: "mountManageLibrarySettingsView",
      }),
    };
  }
  if (p === "/manage/checkin-qr") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage/checkin-qr") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    if (role !== "admin") return { kind: "view", render: () => renderForbiddenRole("admin", role) };
    return {
      kind: "view",
      layout: "manage",
      ...createLazyRoute(() => import("../views/manage/checkin_qr.view.js"), {
        layout: "manage",
        renderName: "renderManageCheckinQrView",
        mountName: "mountManageCheckinQrView",
      }),
    };
  }
  if (p === "/manage/loans") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage/loans") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    if (!hasAnyRole(role, ["admin", "librarian"])) {
      return { kind: "view", render: () => renderForbiddenRole("admin/librarian", role) };
    }
    return {
      kind: "view",
      layout: "manage",
      ...createLazyRoute(() => import("../views/manage/loans.view.js"), {
        layout: "manage",
        renderName: "renderManageLoansView",
        mountName: "mountManageLoansView",
      }),
    };
  }
  if (p === "/manage/fines") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/manage/fines") };
    if (groupType !== "manage") return { kind: "view", render: () => renderForbidden("manage", groupType) };
    if (!hasAnyRole(role, ["admin", "librarian"])) {
      return { kind: "view", render: () => renderForbiddenRole("admin/librarian", role) };
    }
    return {
      kind: "view",
      layout: "manage",
      ...createLazyRoute(() => import("../views/manage/fines.view.js"), {
        layout: "manage",
        renderName: "renderManageFinesView",
        mountName: "mountManageFinesView",
      }),
    };
  }
  if (p === "/profile") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/profile") };
    return createLazyRoute(() => import("../views/profile/profile.view.js"), {
      renderName: "renderProfileView",
      mountName: "mountProfileView",
    });
  }
  if (p === "/profile/edit") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/profile/edit") };
    return createLazyRoute(() => import("../views/profile/profile_edit.view.js"), {
      renderName: "renderProfileEditView",
      mountName: "mountProfileEditView",
    });
  }
  if (p === "/profile/change-password") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/profile/change-password") };
    return createLazyRoute(() => import("../views/profile/profile_change_password.view.js"), {
      renderName: "renderProfileChangePasswordView",
      mountName: "mountProfileChangePasswordView",
    });
  }
  if (p === "/app") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/app") };
    if (!canAccessMemberArea(groupType, role)) {
      if (groupType === "manage") return { kind: "view", render: () => renderForbiddenRole("admin/librarian", role) };
      return { kind: "view", render: () => renderForbidden("member/manage", groupType) };
    }
    return createLazyRoute(() => import("../views/member/dashboard.view.js"), {
      layout: "member",
      renderName: "renderMemberDashboardView",
      mountName: "mountMemberDashboardView",
    });
  }
  if (p === "/app/books") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/app/books") };
    if (!canAccessMemberArea(groupType, role)) {
      if (groupType === "manage") return { kind: "view", render: () => renderForbiddenRole("admin/librarian", role) };
      return { kind: "view", render: () => renderForbidden("member/manage", groupType) };
    }
    return createLazyRoute(() => import("../views/member/books.view.js"), {
      layout: "member",
      renderName: "renderMemberBooksView",
      mountName: "mountMemberBooksView",
    });
  }
  if (p === "/app/loans") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/app/loans") };
    if (!canAccessMemberArea(groupType, role)) {
      if (groupType === "manage") return { kind: "view", render: () => renderForbiddenRole("admin/librarian", role) };
      return { kind: "view", render: () => renderForbidden("member/manage", groupType) };
    }
    return createLazyRoute(() => import("../views/member/loans.view.js"), {
      layout: "member",
      renderName: "renderMemberLoansView",
      mountName: "mountMemberLoansView",
    });
  }
  if (p === "/app/fines") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/app/fines") };
    if (!canAccessMemberArea(groupType, role)) {
      if (groupType === "manage") return { kind: "view", render: () => renderForbiddenRole("admin/librarian", role) };
      return { kind: "view", render: () => renderForbidden("member/manage", groupType) };
    }
    return createLazyRoute(() => import("../views/member/fines.view.js"), {
      layout: "member",
      renderName: "renderMemberFinesView",
      mountName: "mountMemberFinesView",
    });
  }
  if (p === "/app/loan-self") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/app/loan-self") };
    if (!canAccessMemberArea(groupType, role)) {
      if (groupType === "manage") return { kind: "view", render: () => renderForbiddenRole("admin/librarian", role) };
      return { kind: "view", render: () => renderForbidden("member/manage", groupType) };
    }
    return createLazyRoute(() => import("../views/member/loan_self.view.js"), {
      layout: "member",
      renderName: "renderMemberLoanSelfView",
      mountName: "mountMemberLoanSelfView",
    });
  }
  if (p === "/app/checkin") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/app/checkin") };
    if (!canAccessMemberArea(groupType, role)) {
      if (groupType === "manage") return { kind: "view", render: () => renderForbiddenRole("admin/librarian", role) };
      return { kind: "view", render: () => renderForbidden("member/manage", groupType) };
    }
    return createLazyRoute(() => import("../views/member/checkin.view.js"), {
      renderName: "renderMemberCheckinView",
      mountName: "mountMemberCheckinView",
    });
  }
  if (p === "/app/reservations") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/app/reservations") };
    if (!canAccessMemberArea(groupType, role)) {
      if (groupType === "manage") return { kind: "view", render: () => renderForbiddenRole("admin/librarian", role) };
      return { kind: "view", render: () => renderForbidden("member/manage", groupType) };
    }
    return createLazyRoute(() => import("../views/member/reservations.view.js"), {
      layout: "member",
      renderName: "renderMemberReservationsView",
      mountName: "mountMemberReservationsView",
    });
  }
  if (p === "/app/profile") {
    if (!auth) return { kind: "view", render: () => renderNeedLogin("/app/profile") };
    if (!canAccessMemberArea(groupType, role)) {
      if (groupType === "manage") return { kind: "view", render: () => renderForbiddenRole("admin/librarian", role) };
      return { kind: "view", render: () => renderForbidden("member/manage", groupType) };
    }
    return createLazyRoute(() => import("../views/profile/profile.view.js"), {
      layout: "member",
      renderName: "renderProfileView",
      mountName: "mountProfileView",
    });
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
