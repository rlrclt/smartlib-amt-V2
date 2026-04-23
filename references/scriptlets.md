# GAS HTML Template Scriptlets — Full Guide

## Syntax

| Scriptlet | Purpose | Output |
|-----------|---------|--------|
| `<?= expr ?>` | Print escaped value | Included in HTML |
| `<?!= expr ?>` | Print **unescaped** value (use with care) | Raw HTML |
| `<? code ?>` | Execute code (no output) | Nothing |

## Basic Usage

```javascript
// Code.gs
function openDialog() {
  const tpl = HtmlService.createTemplateFromFile('Dialog');
  tpl.title = 'My Dialog';
  tpl.items = ['Apple', 'Banana', 'Cherry'];
  tpl.isAdmin = Session.getActiveUser().getEmail().endsWith('@mycompany.com');
  const html = tpl.evaluate().setWidth(400).setHeight(300);
  SpreadsheetApp.getUi().showModalDialog(html, tpl.title);
}
```

```html
<!-- Dialog.html -->
<h1><?= title ?></h1>

<? if (isAdmin) { ?>
  <button onclick="deleteAll()">Delete All</button>
<? } ?>

<ul>
  <? for (const item of items) { ?>
    <li><?= item ?></li>
  <? } ?>
</ul>
```

## Key Gotchas

### 1. Variables must be set on the template object
```javascript
// ❌ Won't be available in template
const myVar = 'hello';
tpl.evaluate();

// ✅ Must be a property of tpl
tpl.myVar = 'hello';
tpl.evaluate();
```

### 2. `<?= ?>` auto-escapes HTML — use `<?!= ?>` only for trusted HTML
```html
<!-- ❌ If cellValue is "<b>hi</b>", this renders escaped text, not bold -->
<?= cellValue ?>  <!-- outputs: &lt;b&gt;hi&lt;/b&gt; -->

<!-- ✅ If you want to render HTML (only from trusted server data) -->
<?!= trustedHtmlString ?>
```

### 3. Template scriptlets run on the server, not the browser
- No `document`, `window`, `fetch` in scriptlets
- They execute once during `tpl.evaluate()` — before the browser sees the HTML
- Use them for rendering initial data, not for interactivity

### 4. Objects and arrays work fine
```javascript
tpl.config = { name: 'Alice', role: 'admin' };
tpl.rows = [['Alice', 'admin'], ['Bob', 'user']];
```

```html
<!-- Access object properties -->
<p>User: <?= config.name ?></p>

<!-- Loop arrays -->
<? for (const [name, role] of rows) { ?>
  <tr><td><?= name ?></td><td><?= role ?></td></tr>
<? } ?>
```

### 5. Template vs createHtmlOutputFromFile
```javascript
// Use createTemplateFromFile when you need scriptlets
const tpl = HtmlService.createTemplateFromFile('Page');
tpl.data = myData;
const html = tpl.evaluate();

// Use createHtmlOutputFromFile only for static HTML (no scriptlets)
const html = HtmlService.createHtmlOutputFromFile('Static');
```

### 6. include() requires a specific Code.gs helper
```javascript
// Code.gs — must define this
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
```

```html
<!-- Works in template files -->
<?!= include('_styles') ?>   <!-- unescaped = renders as HTML -->
<?!= include('_scripts') ?>
```

## Template Size Limits

- Total HTML output after evaluation: **~1MB**
- If baking large datasets, keep to < 10,000 cells total
- For larger data, use `google.script.run` to load after page renders