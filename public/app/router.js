import { resolveRoute } from "./routes/routes.js";
import { setLandingVisible, setOutletHtml } from "./layouts/shell.js";
import { renderIconsSafe } from "./icons.js";
import { renderManageShell, syncManageSidebarUi } from "./layouts/manage_shell.js";
import { renderMemberShell, syncMemberSidebarUi } from "./layouts/member_shell.js";

let _currentLayout = null;
let _renderSeq = 0;

export function navigateTo(pathOrUrl) {
  const next = new URL(pathOrUrl, window.location.origin);
  const href = `${next.pathname}${next.search}${next.hash}`;
  window.history.pushState({}, "", href);
  void renderRoute(next.pathname);
  window.scrollTo({ top: 0, behavior: "instant" });
}

function loadingMarkup(pathname) {
  return `
    <div class="rounded-2xl border border-sky-100 bg-white/95 p-5 text-sm font-semibold text-slate-600 shadow-sm">
      กำลังโหลด ${pathname || "หน้า"}...
    </div>
  `;
}

async function applyRouteRender(route, html) {
  if (route.layout === "manage") {
    if (_currentLayout !== "manage") {
      setOutletHtml(renderManageShell(html));
      _currentLayout = "manage";
      syncManageSidebarUi();
    } else {
      const contentEl = document.getElementById("manage-content");
      if (contentEl) {
        contentEl.innerHTML = html;
      } else {
        setOutletHtml(renderManageShell(html));
      }
      syncManageSidebarUi();
    }
    const mountContainer = document.getElementById("manage-content") || document.getElementById("outlet");
    if (typeof route.mount === "function") await route.mount(mountContainer);
    return;
  }

  if (route.layout === "member") {
    if (_currentLayout !== "member") {
      setOutletHtml(renderMemberShell(html));
      _currentLayout = "member";
      syncMemberSidebarUi();
    } else {
      const contentEl = document.getElementById("member-content");
      if (contentEl) {
        contentEl.innerHTML = html;
      } else {
        setOutletHtml(renderMemberShell(html));
      }
      syncMemberSidebarUi();
    }
    const mountContainer = document.getElementById("member-content") || document.getElementById("outlet");
    if (typeof route.mount === "function") await route.mount(mountContainer);
    return;
  }

  setOutletHtml(html);
  _currentLayout = "none";
  if (typeof route.mount === "function") await route.mount(document.getElementById("outlet"));
}

export async function renderRoute(pathname) {
  const seq = ++_renderSeq;

  try {
    const route = resolveRoute(pathname || "/");

    if (route.kind === "landing") {
      setLandingVisible(true);
      setOutletHtml("");
      _currentLayout = "landing";
      renderIconsSafe();
      return;
    }

    setLandingVisible(false);
    setOutletHtml(
      route.layout === "manage"
        ? renderManageShell(loadingMarkup(pathname))
        : route.layout === "member"
          ? renderMemberShell(loadingMarkup(pathname))
          : loadingMarkup(pathname),
    );

    const html = typeof route.render === "function" ? await route.render() : "";
    if (seq !== _renderSeq) return;
    await applyRouteRender(route, html);
    if (seq !== _renderSeq) return;
    renderIconsSafe();
  } catch (err) {
    if (seq !== _renderSeq) return;
    setLandingVisible(false);
    setOutletHtml(`
      <div class="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-semibold text-rose-700">
        โหลดหน้าล้มเหลว: ${String(err?.message || err || "unknown error")}
      </div>
    `);
    _currentLayout = "none";
    renderIconsSafe();
    console.error(err);
  }
}
