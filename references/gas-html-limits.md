# GAS HTML Sandbox Limits & Allowed APIs (2026)

## What the iframe CAN do

| Feature | Notes |
|---------|-------|
| Vanilla JS (ES2020+) | V8, full modern JS |
| `google.script.run` | Call server-side GAS functions |
| `google.script.host` | Close dialogs, get dimensions |
| CSS animations | Full CSS3 support |
| Canvas API | Works — useful for inline charts |
| SVG | Works inline |
| Local storage | **sessionStorage only** — clears on close |
| Fetch to GAS web app URL | Only same-origin GAS endpoints |
| `FormData`, `URLSearchParams` | Works for building payloads |
| `crypto.subtle` | Available for hashing |

## What the iframe CANNOT do

| Feature | Reason |
|---------|--------|
| `fetch()` to external URLs | CORS blocked by GAS sandbox |
| External `<script src="...">` | CSP: `script-src 'self' 'unsafe-inline'` |
| External CSS `@import` or `<link>` | Same CSP restriction |
| `localStorage` | Blocked (persistent storage not allowed) |
| `window.open()` | Returns null in sandbox |
| `document.cookie` | Blocked |
| WebSockets | Blocked |
| WebWorkers | Blocked |
| `alert()`, `confirm()`, `prompt()` | Blocked in iframe sandbox — use custom UI |
| Access parent window | Cross-origin iframe = no parent access |
| Clipboard API | Partially blocked — use `document.execCommand` fallback |

## CSP Header Applied by GAS

```
Content-Security-Policy:
  script-src 'self' 'unsafe-inline' https://ssl.gstatic.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  img-src * data: blob:;
  frame-src 'self';
```

**Implication**: All JS and CSS must be **inline** or served from the same GAS project.

## Working Around Restrictions

### External libraries → inline them
```html
<!-- Instead of <script src="chart.js">, paste the minified source in a _chartjs.html file -->
<?!= include('_chartjs') ?>
```

Popular libraries OK to inline (keep < 50KB minified for performance):
- Chart.js (180KB min) — consider SVG alternative instead
- Alpine.js (45KB min) — acceptable for simple reactivity
- Marked.js (22KB min) — OK for markdown rendering
- DOMPurify (25KB min) — recommended if rendering any HTML from users

### Fonts → use system fonts or Google Fonts CSS @import (allowed)
```html
<!-- Google Fonts CSS IS allowed via style-src -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Google+Sans&display=swap" rel="stylesheet">
```

### Communicate back to parent sheet
```javascript
// ✅ Only way to interact with Sheets from the sidebar
google.script.run.withSuccessHandler(cb).myServerFunction(data);

// ✅ Close dialog/sidebar
google.script.host.close();

// ✅ Get sidebar height (for dialogs)
google.script.host.setHeight(400);
google.script.host.setWidth(500);
```

## Performance Benchmarks (approximate, 2026)

| Operation | Typical Latency |
|-----------|----------------|
| `google.script.run` round-trip | 200–800ms |
| Sidebar open (template + render) | 500–1500ms |
| `getDataRange().getValues()` 1000 rows | 100–400ms |
| `appendRow()` single row | 200–500ms |
| `setValues()` 1000 rows batch | 300–700ms |

**Rule of thumb**: Budget 1–2 seconds for initial sidebar load. Show skeleton UI immediately.