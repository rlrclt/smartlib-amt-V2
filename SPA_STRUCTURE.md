# SPA Structure (Firebase Hosting + GAS Backend)

This project uses a "hybrid" approach:
- Frontend SPA: hosted on Firebase Hosting (`public/`)
- Backend API: Google Apps Script Web App (JSONP)
- Storage: Google Sheet (DB table)

The goal is "no full page reload": navigating between pages only swaps layouts/content inside the same HTML shell.

## 1) High-Level Architecture

Request flow:
1. Browser loads `public/index.html` once (the shell)
2. `public/app.js` boots the router and renders the current view into `#outlet`
3. Views call GAS via JSONP (no CORS preflight):
   - `<script src="GAS_URL?action=...&callback=...">`
4. GAS reads/writes Google Sheet and returns `callback(<json>);`

## 2) Files And Responsibilities

Frontend (static, deploy-as-is):
- `public/index.html`
  - Shell HTML, shared navbar, landing content (`#landing-root`), outlet container (`#outlet`)
  - Loads `public/app.css` and `public/app.js`
- `public/app.js`
  - Client-side router (`pushState` + `popstate`)
  - View rendering (no full reload)
  - Data loading orchestration for each view
- `public/gas_jsonp.js`
  - JSONP transport utility (`gasJsonp(baseUrl, params)`)
- `public/app.css`
  - Minimal SPA UX styles (view fade, toast)

Backend (Apps Script, deployed as Web App):
- `apps_script/Code.gs`
  - JSONP endpoints: `ping/get/set/delete/list`
  - Google Sheet schema management and CRUD
- `apps_script/appsscript.json`
  - Apps Script runtime settings

Metadata / configuration:
- `firebase.json`
  - Firebase Hosting serves from `public/` and rewrites to `/index.html` for SPA routes
- `.firebaserc`
  - Firebase project id
- `.clasp.json`
  - Links to Apps Script project, with `rootDir=apps_script`

## 3) SPA Shell And Routing

Shell pattern:
- `public/index.html` is the only HTML document.
- Navigation is "soft": we intercept internal links and update history, then re-render.

Router pattern in `public/app.js`:
- Listen to `click` events on `a[data-link]` and call `history.pushState({}, "", pathname)`
- Listen to `popstate` to handle back/forward
- Render by swapping content inside `#outlet` (and optionally toggling `#landing-root`)

Route table (current minimal example):
- `/` and `/home`: landing stays in `#landing-root` (fast)
- `/db`: renders a "GAS Sheet DB" test view in `#outlet`
- others: render a 404 view

Important Hosting detail:
- `firebase.json` rewrites all paths to `/index.html` so deep links like `/db` work on refresh.

## 4) Data Loading (No Jank)

Key idea: "Render layout first, data later".

Recommended per-view sequence:
1. Render the view immediately (skeleton / placeholders)
2. Start async requests (JSONP)
3. Update only the data sections when responses arrive
4. Show a small progress state (button disabled, "loading...", toast on error)

When using GAS calls (including `google.script.run` or JSONP), latency is variable.
Design UI so users always see a response instantly (layout + placeholder).

Race-condition guard (recommended when adding more routes):
- Keep a `routeVersion` counter:
  - Increment on every navigation
  - Each async request captures the current version
  - Ignore responses whose version is no longer current

This prevents "old route response overwrites new route".

## 5) Backend API Contract (JSONP)

Base URL:
- GAS Web App URL (example currently hardcoded in `public/app.js`)

Endpoints (GET):
- `?action=ping`
  - Response: `{ ok: true, data: { ts } }`
- `?action=list`
  - Response: `{ ok: true, data: { keys: [...] } }`
- `?action=get&key=...`
  - Response: `{ ok: true, data: { key, value } }` (value can be `null` if missing)
- `?action=set&key=...&value=...`
  - Response: `{ ok: true, data: { key, value } }`
- `?action=delete&key=...`
  - Response: `{ ok: true, data: { key, deleted } }`

JSONP callback:
- Add `&callback=cbName`
- Server returns: `cbName(<json>);`

Limitations of JSONP:
- GET-only: no real POST body
- URL length limits: keep `value` small (for bigger payloads use a server-side proxy)

## 6) Google Sheet As DB (Schema)

Sheet:
- Spreadsheet id is configured in `apps_script/Code.gs`
- Table sheet name: `db` (auto-created)

Schema:
- Row 1 header: `key | value | updatedAt`
- Rows 2..N: key-value records

Performance notes (from Apps Script best practices):
- Avoid per-cell calls in loops; use range reads/writes where possible
- If the data grows, replace the linear scan (`findRowByKey_`) with an index strategy:
  - Cache key->row mapping, or keep a separate index sheet

## 7) Caching Strategy (Optional)

Use caching when repeated reads are common:
- Apps Script `CacheService` for short-lived caching
- Client-side in-memory cache for "same route, same query" within a session

Always invalidate cache on `set/delete`.

## 8) Deployment Checklist

Apps Script:
- `clasp push`
- Deploy as Web App:
  - Execute as: Me
  - Who has access: Anyone (or restricted + custom auth later)

Firebase Hosting:
- `firebase deploy --only hosting`

## 9) Security Notes (MVP vs Production)

MVP mode:
- Web App can be public for rapid iteration

Production mode (recommended upgrade path):
- Add authentication on every write operation:
  - Frontend sends Firebase Auth token
  - Backend verifies it (often easiest via server-side proxy: Firebase Functions/Cloud Run)
- Avoid sending secrets in query strings

