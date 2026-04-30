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

function loadingMarkup(pathname, layout = "default") {
  const safePath = String(pathname || "/");
  if (layout === "member") {
    return `
      <section class="member-page-container">
        <div class="rounded-3xl border border-sky-100/80 bg-white/90 p-5 shadow-sm backdrop-blur">
          <div class="flex items-center gap-3">
            <span class="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
              <span class="h-4 w-4 rounded-full border-2 border-sky-300 border-t-sky-700 animate-spin"></span>
            </span>
            <div class="min-w-0">
              <p class="text-sm font-black text-slate-800">กำลังโหลดหน้า</p>
              <p class="truncate text-xs font-semibold text-slate-500">${safePath}</p>
            </div>
          </div>
          <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <div class="h-28 rounded-2xl bg-slate-100 animate-pulse"></div>
            <div class="h-28 rounded-2xl bg-slate-100 animate-pulse"></div>
            <div class="h-28 rounded-2xl bg-slate-100 animate-pulse"></div>
          </div>
        </div>
      </section>
    `;
  }
  if (layout === "manage") {
    return `
      <section class="space-y-4">
        <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div class="flex items-center gap-3">
            <span class="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <span class="h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin"></span>
            </span>
            <div class="min-w-0">
              <p class="text-sm font-black text-slate-800">กำลังโหลดหน้า</p>
              <p class="truncate text-xs font-semibold text-slate-500">${safePath}</p>
            </div>
          </div>
        </div>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div class="h-24 rounded-2xl bg-slate-100 animate-pulse"></div>
          <div class="h-24 rounded-2xl bg-slate-100 animate-pulse"></div>
          <div class="h-24 rounded-2xl bg-slate-100 animate-pulse"></div>
          <div class="h-24 rounded-2xl bg-slate-100 animate-pulse"></div>
        </div>
      </section>
    `;
  }
  return `
    <div class="rounded-3xl border border-sky-100/80 bg-white/90 p-5 shadow-sm backdrop-blur">
      <div class="flex items-center gap-3">
        <span class="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          <span class="h-4 w-4 rounded-full border-2 border-sky-300 border-t-sky-700 animate-spin"></span>
        </span>
        <div class="min-w-0">
          <p class="text-sm font-black text-slate-800">กำลังโหลดหน้า</p>
          <p class="truncate text-xs font-semibold text-slate-500">${safePath}</p>
        </div>
      </div>
      <div class="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div class="h-full w-2/5 rounded-full bg-gradient-to-r from-sky-300 via-sky-500 to-sky-300 animate-pulse"></div>
      </div>
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
  let loadingTimer = 0;

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
    loadingTimer = window.setTimeout(() => {
      if (seq !== _renderSeq) return;
      if (route.layout === "manage" && _currentLayout === "manage") {
        const contentEl = document.getElementById("manage-content");
        if (contentEl) contentEl.innerHTML = loadingMarkup(pathname, "manage");
        else setOutletHtml(renderManageShell(loadingMarkup(pathname, "manage")));
      } else if (route.layout === "member" && _currentLayout === "member") {
        const contentEl = document.getElementById("member-content");
        if (contentEl) contentEl.innerHTML = loadingMarkup(pathname, "member");
        else setOutletHtml(renderMemberShell(loadingMarkup(pathname, "member")));
      } else {
        setOutletHtml(
          route.layout === "manage"
            ? renderManageShell(loadingMarkup(pathname, "manage"))
            : route.layout === "member"
              ? renderMemberShell(loadingMarkup(pathname, "member"))
              : loadingMarkup(pathname),
        );
      }
    }, 180);

    const html = typeof route.render === "function" ? await route.render() : "";
    if (loadingTimer) {
      window.clearTimeout(loadingTimer);
      loadingTimer = 0;
    }
    if (seq !== _renderSeq) return;
    await applyRouteRender(route, html);
    if (seq !== _renderSeq) return;
    renderIconsSafe();
  } catch (err) {
    if (loadingTimer) {
      window.clearTimeout(loadingTimer);
      loadingTimer = 0;
    }
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
