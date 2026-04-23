# Inline Charts for GAS HTML (No CDN Required)

Since GAS blocks external scripts, use these patterns to render charts purely with inline HTML/JS.

---

## 1. SVG Bar Chart (simplest, no JS needed for static data)

```javascript
// Code.gs
function getChartData() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sales');
  const data = sheet.getRange('A2:B10').getValues();
  return data.map(([label, value]) => ({ label, value }));
}
```

```html
<!-- Sidebar.html -->
<div id="chart"></div>
<script>
google.script.run
  .withSuccessHandler(drawBarChart)
  .getChartData();

function drawBarChart(data) {
  const W = 280, H = 160, PAD = { top:10, right:10, bottom:30, left:40 };
  const max = Math.max(...data.map(d => d.value));
  const bw = (W - PAD.left - PAD.right) / data.length - 4;
  const scaleY = v => H - PAD.bottom - ((v / max) * (H - PAD.top - PAD.bottom));

  const bars = data.map((d, i) => {
    const x = PAD.left + i * (bw + 4);
    const y = scaleY(d.value);
    const h = H - PAD.bottom - y;
    return `
      <rect x="${x}" y="${y}" width="${bw}" height="${h}" fill="var(--c-primary)" rx="2"/>
      <text x="${x + bw/2}" y="${H - PAD.bottom + 12}" text-anchor="middle"
            font-size="9" fill="var(--c-muted)">${esc(d.label)}</text>`;
  }).join('');

  const yLabel = `<text x="6" y="${H/2}" text-anchor="middle" transform="rotate(-90,6,${H/2})"
    font-size="9" fill="var(--c-muted)">Value</text>`;

  document.getElementById('chart').innerHTML =
    `<svg width="${W}" height="${H}" style="overflow:visible">${yLabel}${bars}</svg>`;
}
</script>
```

---

## 2. Canvas Line Chart (good for time-series, more control)

```javascript
function drawLineChart(data, canvasId) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const PAD = 30;
  const vals = data.map(d => d.value);
  const min = Math.min(...vals), max = Math.max(...vals);
  const scaleX = i => PAD + (i / (data.length - 1)) * (W - 2 * PAD);
  const scaleY = v => H - PAD - ((v - min) / (max - min || 1)) * (H - 2 * PAD);

  // Grid lines
  ctx.strokeStyle = '#dadce0'; ctx.lineWidth = 0.5;
  for (let i = 0; i <= 4; i++) {
    const y = PAD + (i / 4) * (H - 2 * PAD);
    ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(W - PAD, y); ctx.stroke();
  }

  // Line
  ctx.strokeStyle = '#1a73e8'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
  ctx.beginPath();
  data.forEach((d, i) => {
    const x = scaleX(i), y = scaleY(d.value);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Dots
  ctx.fillStyle = '#1a73e8';
  data.forEach((d, i) => {
    ctx.beginPath();
    ctx.arc(scaleX(i), scaleY(d.value), 3, 0, Math.PI * 2);
    ctx.fill();
  });

  // X labels
  ctx.fillStyle = '#5f6368'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
  data.forEach((d, i) => ctx.fillText(d.label, scaleX(i), H - 8));
}
```

```html
<canvas id="myChart" width="280" height="150"></canvas>
<script>
google.script.run.withSuccessHandler(d => drawLineChart(d, 'myChart')).getChartData();
</script>
```

---

## 3. SVG Donut / Pie Chart

```javascript
function drawDonut(data, svgId) {
  const COLORS = ['#1a73e8','#34a853','#fbbc05','#ea4335','#9c27b0','#00bcd4'];
  const total = data.reduce((s, d) => s + d.value, 0);
  const R = 50, cx = 75, cy = 65, innerR = 28;
  let startAngle = -Math.PI / 2;

  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(startAngle + angle);
    const y2 = cy + R * Math.sin(startAngle + angle);
    const ix1 = cx + innerR * Math.cos(startAngle);
    const iy1 = cy + innerR * Math.sin(startAngle);
    const ix2 = cx + innerR * Math.cos(startAngle + angle);
    const iy2 = cy + innerR * Math.sin(startAngle + angle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M${x1},${y1} A${R},${R} 0 ${large},1 ${x2},${y2}
      L${ix2},${iy2} A${innerR},${innerR} 0 ${large},0 ${ix1},${iy1} Z`;
    startAngle += angle;
    return `<path d="${path}" fill="${COLORS[i % COLORS.length]}"/>`;
  }).join('');

  const legend = data.map((d, i) =>
    `<g transform="translate(0,${i * 16})">
       <rect width="10" height="10" fill="${COLORS[i%COLORS.length]}" rx="2"/>
       <text x="14" y="9" font-size="10" fill="#202124">${esc(d.label)} (${Math.round(d.value/total*100)}%)</text>
     </g>`
  ).join('');

  document.getElementById(svgId).innerHTML =
    `<svg width="260" height="${Math.max(130, data.length*16+10)}">
      <g>${slices}</g>
      <g transform="translate(140,10)">${legend}</g>
    </svg>`;
}
```

---

## Tips

- All charts are fully responsive via `viewBox` on SVG
- Use `canvas.style.width = '100%'` + fixed `canvas.width` for responsive canvas
- For tooltips: add `<title>` elements inside SVG shapes
- Keep chart data < 50 data points for readable SVG — use aggregation for more