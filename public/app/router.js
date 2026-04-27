import { resolveRoute } from "./routes/routes.js";
import { setLandingVisible, setOutletHtml } from "./layouts/shell.js";
import { renderIconsSafe } from "./icons.js";
import { renderManageShell, syncManageSidebarUi } from "./layouts/manage_shell.js";
import { renderMemberShell, syncMemberSidebarUi } from "./layouts/member_shell.js";

let _currentLayout = null;

export function navigateTo(pathOrUrl) {
  const next = new URL(pathOrUrl, window.location.origin);
  const href = `${next.pathname}${next.search}${next.hash}`;
  window.history.pushState({}, "", href);
  renderRoute(next.pathname);
  window.scrollTo({ top: 0, behavior: "instant" });
}

export function renderRoute(pathname) {
  const route = resolveRoute(pathname || "/");
  
  if (route.kind === "landing") {
    setLandingVisible(true);
    setOutletHtml("");
    _currentLayout = "landing";
    renderIconsSafe();
    return;
  }

  setLandingVisible(false);

  if (route.layout === "manage") {
    if (_currentLayout !== "manage") {
      setOutletHtml(renderManageShell(route.render()));
      _currentLayout = "manage";
      syncManageSidebarUi(); // Initial sync
    } else {
      const contentEl = document.getElementById("manage-content");
      if (contentEl) {
        contentEl.innerHTML = route.render();
      } else {
        setOutletHtml(renderManageShell(route.render()));
      }
      syncManageSidebarUi(); // Update sidebar active state
    }
    const mountContainer = document.getElementById("manage-content") || document.getElementById("outlet");
    if (typeof route.mount === "function") route.mount(mountContainer);

  } else if (route.layout === "member") {
    if (_currentLayout !== "member") {
      setOutletHtml(renderMemberShell(route.render()));
      _currentLayout = "member";
      syncMemberSidebarUi();
    } else {
      const contentEl = document.getElementById("member-content");
      if (contentEl) {
        contentEl.innerHTML = route.render();
      } else {
        setOutletHtml(renderMemberShell(route.render()));
      }
      syncMemberSidebarUi();
    }
    const mountContainer = document.getElementById("member-content") || document.getElementById("outlet");
    if (typeof route.mount === "function") route.mount(mountContainer);

  } else {
    // No specific layout, full replace
    setOutletHtml(route.render());
    _currentLayout = "none";
    if (typeof route.mount === "function") route.mount(document.getElementById("outlet"));
  }

  renderIconsSafe();
}

