const SYNC_AUDIT_SCHEMA = {
  SHEET_NAME: (typeof SHEETS !== "undefined" && SHEETS.SYNC_AUDIT) || "sync_audit",
  COLUMNS: [
    "ts",
    "uid",
    "route",
    "resourceKey",
    "event",
    "source",
    "ok",
    "latencyMs",
    "error",
    "metaJson",
  ],
};
const SYNC_AUDIT_ALLOWED_EVENTS = {
  revalidate_success: true,
  revalidate_failed: true,
  revalidate_skip_throttled: true,
  revalidate_join_inflight: true,
  revalidate_backoff_skip: true,
};
const SYNC_AUDIT_ALLOWED_SOURCES = {
  network: true,
  cache: true,
};
const SYNC_AUDIT_ALLOWED_KEYS = {
  "member_sync:dashboard": true,
  "member_sync:books": true,
  "member_sync:loans": true,
  "member_sync:fines": true,
  "member_sync:reservations": true,
  "member_sync:profile": true,
  "member_sync:loan_self": true,
};
const SYNC_AUDIT_RATE_LIMIT_MS = 2500;
const SYNC_AUDIT_META_MAX_LEN = 2000;

function syncAuditLog_(payload) {
  const body = payload || {};
  const auth = body.auth || {};
  const uid = String((auth.user && auth.user.uid) || auth.uid || "").trim();
  if (!uid) throw new Error("unauthorized");

  const event = String(body.event || "").trim();
  const route = sanitizeAuditRoute_(String(body.route || "").trim() || "-");
  const resourceKey = String(body.resourceKey || "").trim();
  const source = String(body.source || "").trim();
  if (!SYNC_AUDIT_ALLOWED_EVENTS[event]) throw new Error("invalid event");
  if (!SYNC_AUDIT_ALLOWED_KEYS[resourceKey]) throw new Error("invalid resource key");
  if (!SYNC_AUDIT_ALLOWED_SOURCES[source]) throw new Error("invalid source");
  checkSyncAuditRateLimit_(uid, resourceKey, event);
  const ok = String(body.ok === false ? "false" : "true");
  const latencyMs = Number(body.latencyMs || 0);
  const error = String(body.error || "").slice(0, 500);
  const metaJson = sanitizeMetaJson_(body.meta || {});

  const sheet = ensureSyncAuditSheet_();
  sheet.appendRow([
    new Date().toISOString(),
    uid,
    route,
    resourceKey,
    event,
    source,
    ok,
    Number.isFinite(latencyMs) ? Math.max(0, Math.round(latencyMs)) : 0,
    error,
    metaJson,
  ]);

  return { logged: true };
}

function sanitizeMetaJson_(meta) {
  let json = "{}";
  try {
    json = JSON.stringify(meta || {});
  } catch (err) {
    json = "{}";
  }
  if (json.length > SYNC_AUDIT_META_MAX_LEN) {
    return json.slice(0, SYNC_AUDIT_META_MAX_LEN);
  }
  return json;
}

function sanitizeAuditRoute_(route) {
  const clean = String(route || "-").replace(/[^a-zA-Z0-9/_-]/g, "");
  if (!clean) return "-";
  return clean.slice(0, 120);
}

function checkSyncAuditRateLimit_(uid, resourceKey, event) {
  const props = PropertiesService.getScriptProperties();
  const key = "sync_audit_rate:" + uid + ":" + resourceKey + ":" + event;
  const now = Date.now();
  const last = Number(props.getProperty(key) || 0);
  if (last && now - last < SYNC_AUDIT_RATE_LIMIT_MS) {
    throw new Error("rate limited");
  }
  props.setProperty(key, String(now));
}

function ensureSyncAuditSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SYNC_AUDIT_SCHEMA.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SYNC_AUDIT_SCHEMA.SHEET_NAME);
  }

  const headerLen = SYNC_AUDIT_SCHEMA.COLUMNS.length;
  const currentHeader = sheet.getLastRow() >= 1
    ? sheet.getRange(1, 1, 1, headerLen).getValues()[0]
    : [];
  const headerOk = currentHeader.length === headerLen && currentHeader.every(function (v, idx) {
    return String(v || "") === String(SYNC_AUDIT_SCHEMA.COLUMNS[idx] || "");
  });

  if (!headerOk) {
    sheet.getRange(1, 1, 1, headerLen).setValues([SYNC_AUDIT_SCHEMA.COLUMNS]);
    sheet.getRange(1, 1, 1, headerLen).setFontWeight("bold").setBackground("#f1f5f9");
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headerLen);
  }
  return sheet;
}
