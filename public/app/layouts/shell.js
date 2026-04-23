const landingRoot = document.getElementById("landing-root");
const outlet = document.getElementById("outlet");

export function setLandingVisible(visible) {
  if (landingRoot) landingRoot.hidden = !visible;
  if (outlet) outlet.hidden = visible;
}

export function setOutletHtml(html) {
  if (!outlet) return;
  outlet.innerHTML = html || "";
}

