import { resolveRoute } from "./routes/routes.js";
import { setLandingVisible, setOutletHtml } from "./layouts/shell.js";
import { renderIconsSafe } from "./icons.js";

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
    renderIconsSafe();
    return;
  }

  setLandingVisible(false);
  setOutletHtml(route.render());
  if (typeof route.mount === "function") {
    route.mount(document.getElementById("outlet"));
  }
  renderIconsSafe();
}
