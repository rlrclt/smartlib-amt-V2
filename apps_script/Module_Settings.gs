/**
 * Module_Settings.gs
 * Manage geofencing location settings for borrow/check-in/return flows.
 */

const SETTINGS_LOCATION_SCHEMA = {
  SHEET_NAME: (typeof SHEETS !== "undefined" && SHEETS.SETTINGS_LOCATIONS) || "settings_locations",
  COLUMNS: [
    "id",
    "location_name",
    "latitude",
    "longitude",
    "range_borrow",
    "range_checkin",
    "range_return",
    "is_active",
    "note",
    "updated_at",
    "updated_by",
    "deleted_at"
  ]
};

const LIBRARY_VISIT_SCHEMA = {
  SHEET_NAME: (typeof SHEETS !== "undefined" && SHEETS.LIBRARY_VISITS) || "library_visits",
  COLUMNS: ["visitId", "uid", "checkInAt", "checkOutAt", "activities", "status", "notes", "locationId"]
};

const LIBRARY_HOURS_SCHEMA = {
  SHEET_NAME: (typeof SHEETS !== "undefined" && SHEETS.SETTINGS_LIBRARY_HOURS) || "settings_library_hours",
  COLUMNS: ["dayOfWeek", "openTime", "closeTime", "isOpen"]
};

const LIBRARY_EXCEPTION_SCHEMA = {
  SHEET_NAME: (typeof SHEETS !== "undefined" && SHEETS.SETTINGS_LIBRARY_EXCEPTIONS) || "settings_library_exceptions",
  COLUMNS: ["date", "newOpenTime", "newCloseTime", "reason"]
};

function settingsLocationsList_(payload) {
  assertSettingsAdmin_(payload && payload.auth);
  const includeDeleted = String(payload && payload.includeDeleted || "").toLowerCase() === "true";
  const rows = readSettingsLocationRows_()
    .filter(function (row) {
      return includeDeleted || !String(row.deleted_at || "").trim();
    })
    .sort(function (a, b) {
      return safeDateMs_(b.updated_at) - safeDateMs_(a.updated_at);
    });

  return {
    items: rows.map(formatSettingsLocation_),
    total: rows.length
  };
}

function settingsLocationsCreate_(payload) {
  const actor = assertSettingsAdmin_(payload && payload.auth);
  const now = new Date().toISOString();
  const row = normalizeSettingsLocationInput_(payload, {
    id: nextSettingsLocationId_(),
    updated_at: now,
    updated_by: actor.uid,
    deleted_at: ""
  });

  appendObjectRow_(getSettingsLocationsSheet_(), SETTINGS_LOCATION_SCHEMA.COLUMNS, row);
  return formatSettingsLocation_(row);
}

function settingsLocationsUpdate_(payload) {
  const actor = assertSettingsAdmin_(payload && payload.auth);
  const id = String(payload && payload.id || "").trim();
  if (!id) throw new Error("กรุณาระบุ id");

  const sheet = getSettingsLocationsSheet_();
  const found = findRowByField_(sheet, SETTINGS_LOCATION_SCHEMA.COLUMNS, "id", id);
  if (!found.rowNumber || !found.rowData) throw new Error("ไม่พบพิกัดที่ต้องการแก้ไข");
  if (String(found.rowData.deleted_at || "").trim()) throw new Error("รายการนี้ถูกลบแล้ว");

  assertSettingsVersion_(found.rowData.updated_at, payload && payload.updated_at);

  const now = new Date().toISOString();
  const row = normalizeSettingsLocationInput_(payload, {
    id: id,
    updated_at: now,
    updated_by: actor.uid,
    deleted_at: ""
  });

  writeObjectRow_(sheet, found.rowNumber, SETTINGS_LOCATION_SCHEMA.COLUMNS, row);
  return formatSettingsLocation_(row);
}

function settingsLocationsDelete_(payload) {
  const actor = assertSettingsAdmin_(payload && payload.auth);
  const id = String(payload && payload.id || "").trim();
  if (!id) throw new Error("กรุณาระบุ id");

  const sheet = getSettingsLocationsSheet_();
  const found = findRowByField_(sheet, SETTINGS_LOCATION_SCHEMA.COLUMNS, "id", id);
  if (!found.rowNumber || !found.rowData) throw new Error("ไม่พบพิกัดที่ต้องการลบ");
  if (String(found.rowData.deleted_at || "").trim()) return formatSettingsLocation_(found.rowData);

  assertSettingsVersion_(found.rowData.updated_at, payload && payload.updated_at);

  const row = found.rowData;
  row.deleted_at = new Date().toISOString();
  row.updated_at = row.deleted_at;
  row.updated_by = actor.uid;
  writeObjectRow_(sheet, found.rowNumber, SETTINGS_LOCATION_SCHEMA.COLUMNS, row);
  return formatSettingsLocation_(row);
}

function settingsLocationsCheck_(payload) {
  const latitude = normalizeLatitude_(payload && payload.latitude);
  const longitude = normalizeLongitude_(payload && payload.longitude);
  const purpose = normalizeLocationPurpose_(payload && payload.purpose);
  const accuracy = toNumber_(payload && payload.accuracy, 0);

  const rows = readSettingsLocationRows_().filter(function (row) {
    return !String(row.deleted_at || "").trim() && normalizeSettingsBoolean_(row.is_active);
  });

  const matches = rows.map(function (row) {
    const distance = haversineMeters_(latitude, longitude, toNumber_(row.latitude, 0), toNumber_(row.longitude, 0));
    const allowedRange = toNumber_(row[purpose.rangeField], 0);
    return {
      id: String(row.id || ""),
      location_name: String(row.location_name || ""),
      latitude: toNumber_(row.latitude, 0),
      longitude: toNumber_(row.longitude, 0),
      distance_meters: Math.round(distance),
      range_meters: allowedRange,
      allowed: distance <= allowedRange
    };
  }).sort(function (a, b) {
    return a.distance_meters - b.distance_meters;
  });

  return {
    allowed: matches.some(function (item) { return item.allowed; }),
    purpose: purpose.key,
    accuracy: accuracy,
    accuracy_warning: accuracy > 30,
    matches: matches
  };
}

function assertSettingsAdmin_(auth) {
  const uid = String(auth && auth.user && auth.user.uid || auth && auth.uid || "").trim();
  if (!uid) throw new Error("401: INVALID_TOKEN");

  const found = readUserRows_().find(function (entry) {
    return String(entry.user.uid || "") === uid;
  });

  if (!found || !found.user) throw new Error("401: INVALID_TOKEN");
  const user = found.user;
  const groupType = String(user.groupType || "").toLowerCase();
  const role = String(user.role || "").toLowerCase();
  const status = String(user.status || "").toLowerCase();

  if (status !== "active") throw new Error("401: INVALID_TOKEN");
  if (groupType !== "manage" || role !== "admin") throw new Error("403: ADMIN_REQUIRED");

  return { uid: String(user.uid || ""), displayName: String(user.displayName || "") };
}

function assertSettingsVersion_(currentUpdatedAt, expectedUpdatedAt) {
  const current = String(currentUpdatedAt || "").trim();
  const expected = String(expectedUpdatedAt || "").trim();
  if (!expected) throw new Error("ไม่พบข้อมูล updated_at สำหรับตรวจสอบการแก้ไขพร้อมกัน");
  if (current !== expected) throw new Error("409: CONFLICT ข้อมูลนี้ถูกแก้ไขโดยผู้อื่นแล้ว กรุณาโหลดใหม่");
}

function normalizeSettingsLocationInput_(payload, defaults) {
  const name = String(payload && payload.location_name || "").trim();
  if (!name) throw new Error("กรุณาระบุชื่อจุดพิกัด");

  return {
    id: defaults.id,
    location_name: name,
    latitude: normalizeLatitude_(payload && payload.latitude),
    longitude: normalizeLongitude_(payload && payload.longitude),
    range_borrow: normalizeLocationRange_(payload && payload.range_borrow, "รัศมียืม"),
    range_checkin: normalizeLocationRange_(payload && payload.range_checkin, "รัศมีสแกนเข้า"),
    range_return: normalizeLocationRange_(payload && payload.range_return, "รัศมีคืน"),
    is_active: normalizeSettingsBoolean_(payload && payload.is_active),
    note: String(payload && payload.note || "").trim(),
    updated_at: defaults.updated_at,
    updated_by: defaults.updated_by,
    deleted_at: defaults.deleted_at
  };
}

function normalizeLatitude_(value) {
  const n = toNumber_(value, NaN);
  if (!Number.isFinite(n) || n < -90 || n > 90) throw new Error("Latitude ต้องอยู่ระหว่าง -90 ถึง 90");
  return n;
}

function normalizeLongitude_(value) {
  const n = toNumber_(value, NaN);
  if (!Number.isFinite(n) || n < -180 || n > 180) throw new Error("Longitude ต้องอยู่ระหว่าง -180 ถึง 180");
  return n;
}

function normalizeLocationRange_(value, label) {
  const n = Math.round(toNumber_(value, NaN));
  if (!Number.isFinite(n) || n < 5 || n > 5000) {
    throw new Error(label + " ต้องอยู่ระหว่าง 5 - 5000 เมตร");
  }
  return n;
}

function normalizeSettingsBoolean_(value) {
  if (value === true) return true;
  const text = String(value || "").toLowerCase();
  return text === "true" || text === "1" || text === "yes" || text === "active";
}

function normalizeLocationPurpose_(value) {
  const key = String(value || "borrow").toLowerCase();
  if (key === "checkin") return { key: "checkin", rangeField: "range_checkin" };
  if (key === "return") return { key: "return", rangeField: "range_return" };
  return { key: "borrow", rangeField: "range_borrow" };
}

function formatSettingsLocation_(row) {
  return {
    id: String(row.id || ""),
    location_name: String(row.location_name || ""),
    latitude: toNumber_(row.latitude, 0),
    longitude: toNumber_(row.longitude, 0),
    range_borrow: toNumber_(row.range_borrow, 0),
    range_checkin: toNumber_(row.range_checkin, 0),
    range_return: toNumber_(row.range_return, 0),
    is_active: normalizeSettingsBoolean_(row.is_active),
    note: String(row.note || ""),
    updated_at: String(row.updated_at || ""),
    updated_by: String(row.updated_by || ""),
    deleted_at: String(row.deleted_at || "")
  };
}

function getSettingsLocationsSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SETTINGS_LOCATION_SCHEMA.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SETTINGS_LOCATION_SCHEMA.SHEET_NAME);
  ensureHeader_(sheet, SETTINGS_LOCATION_SCHEMA.COLUMNS);
  return sheet;
}

function readSettingsLocationRows_() {
  return readRowsAsObjects_(getSettingsLocationsSheet_(), SETTINGS_LOCATION_SCHEMA.COLUMNS);
}

function nextSettingsLocationId_() {
  const maxNum = readSettingsLocationRows_().reduce(function (max, row) {
    const match = String(row.id || "").match(/^LOC-(\d+)$/);
    if (!match) return max;
    const n = Number(match[1]);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  return "LOC-" + String(maxNum + 1).padStart(3, "0");
}

function haversineMeters_(lat1, lon1, lat2, lon2) {
  const radius = 6371000;
  const toRad = function (deg) { return deg * Math.PI / 180; };
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function safeDateMs_(value) {
  const ms = new Date(String(value || "")).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function visitsGetCurrent_(payload) {
  const actor = assertSelfServiceActor_(payload && payload.auth);
  const session = getActiveVisitSessionForUid_(actor.uid);
  return {
    hasActive: Boolean(session),
    session: session,
    serverTime: new Date().toISOString(),
    runtime: getLibraryRuntimeSettings_(),
    access: checkLibraryAccessNow_()
  };
}

function visitsCheckinStart_(payload) {
  const actor = assertSelfServiceActor_(payload && payload.auth);
  const activities = normalizeVisitActivities_(payload && payload.activities);
  const locationId = String(payload && payload.locationId || "").trim();
  const notes = String(payload && payload.notes || "").trim();

  // Validate Library Hours
  const access = checkLibraryAccessNow_();
  if (!access.isOpenNow) {
    let msg = "ห้องสมุดปิดทำการในขณะนี้";
    if (access.openTime && access.closeTime) {
      msg += " (เวลาทำการ: " + access.openTime + " - " + access.closeTime + ")";
    }
    throw new Error(msg);
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const existing = getActiveVisitSessionForUid_(actor.uid);
    if (existing) return { ok: true, session: existing, alreadyActive: true };

    const nowIso = new Date().toISOString();
    const row = {
      visitId: nextVisitId_(),
      uid: String(actor.uid || ""),
      checkInAt: nowIso,
      checkOutAt: "",
      activities: JSON.stringify(activities),
      status: "active",
      notes: notes,
      locationId: locationId
    };

    appendObjectRow_(getLibraryVisitsSheet_(), LIBRARY_VISIT_SCHEMA.COLUMNS, row);
    return { ok: true, session: formatVisitSession_(row) };
  } finally {
    lock.releaseLock();
  }
}

function visitsUpdateActivities_(payload) {
  const actor = assertSelfServiceActor_(payload && payload.auth);
  const visitId = String(payload && payload.visitId || "").trim();
  const activities = normalizeVisitActivities_(payload && payload.activities);
  const notes = String(payload && payload.notes || "").trim();

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const found = visitId
      ? findRowByField_(getLibraryVisitsSheet_(), LIBRARY_VISIT_SCHEMA.COLUMNS, "visitId", visitId)
      : findActiveVisitRowByUid_(actor.uid);
    if (!found || !found.rowNumber || !found.rowData) throw new Error("ไม่พบ session ที่กำลังใช้งาน");

    const row = found.rowData;
    if (String(row.uid || "") !== String(actor.uid || "")) throw new Error("403: ไม่สามารถแก้ไข session ของผู้อื่น");
    if (String(row.status || "").toLowerCase() !== "active") throw new Error("session นี้ไม่ได้อยู่ในสถานะ active");

    row.activities = JSON.stringify(activities);
    if (notes) row.notes = notes;
    writeObjectRow_(getLibraryVisitsSheet_(), found.rowNumber, LIBRARY_VISIT_SCHEMA.COLUMNS, row);
    return { ok: true, session: formatVisitSession_(row) };
  } finally {
    lock.releaseLock();
  }
}

function visitsCheckout_(payload) {
  const actor = assertSelfServiceActor_(payload && payload.auth);
  const visitId = String(payload && payload.visitId || "").trim();
  const notes = String(payload && payload.notes || "").trim();

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const found = visitId
      ? findRowByField_(getLibraryVisitsSheet_(), LIBRARY_VISIT_SCHEMA.COLUMNS, "visitId", visitId)
      : findActiveVisitRowByUid_(actor.uid);
    if (!found || !found.rowNumber || !found.rowData) throw new Error("ไม่พบ session ที่กำลังใช้งาน");

    const row = found.rowData;
    if (String(row.uid || "") !== String(actor.uid || "")) throw new Error("403: ไม่สามารถปิด session ของผู้อื่น");
    if (String(row.status || "").toLowerCase() !== "active") throw new Error("session นี้ปิดไปแล้ว");

    row.checkOutAt = new Date().toISOString();
    row.status = "closed";
    if (notes) row.notes = notes;
    writeObjectRow_(getLibraryVisitsSheet_(), found.rowNumber, LIBRARY_VISIT_SCHEMA.COLUMNS, row);
    return { ok: true, session: formatVisitSession_(row) };
  } finally {
    lock.releaseLock();
  }
}

function visitsActiveCount_(payload) {
  assertManageStaff_(payload && payload.auth);
  return {
    activeCount: countActiveLibraryVisits_(),
    serverTime: new Date().toISOString()
  };
}

function visitsAutoCloseRun_(payload) {
  assertManageAdmin_(payload && payload.auth);
  const runtime = getLibraryRuntimeSettings_();
  if (runtime.autoCloseEnabled !== true) {
    return { ok: true, closedCount: 0, skipped: true, reason: "auto_close_disabled" };
  }

  const closeInfo = getLibraryCloseTimeToday_(runtime.timezone || "Asia/Bangkok");
  if (!closeInfo || !closeInfo.closeIso) {
    return { ok: true, closedCount: 0, skipped: true, reason: "close_time_not_configured" };
  }

  const closeMs = new Date(closeInfo.closeIso).getTime();
  const thresholdMs = closeMs + Math.max(0, Number(runtime.autoCloseAfterMinutes || 0)) * 60 * 1000;
  if (!Number.isFinite(thresholdMs) || Date.now() < thresholdMs) {
    return { ok: true, closedCount: 0, skipped: true, reason: "not_reached_threshold", thresholdAt: new Date(thresholdMs).toISOString() };
  }

  const rows = readLibraryVisitRowsWithRowNumber_().filter(function (entry) {
    return String(entry.rowData.status || "").toLowerCase() === "active";
  });
  if (!rows.length) return { ok: true, closedCount: 0 };

  const nowIso = new Date().toISOString();
  var closedCount = 0;
  rows.forEach(function (entry) {
    const row = entry.rowData;
    row.status = "auto_closed";
    row.checkOutAt = row.checkOutAt ? String(row.checkOutAt) : nowIso;
    row.notes = String(row.notes || "").trim()
      ? String(row.notes) + " | auto-closed"
      : "auto-closed";
    writeObjectRow_(getLibraryVisitsSheet_(), entry.rowNumber, LIBRARY_VISIT_SCHEMA.COLUMNS, row);
    closedCount += 1;

    if (typeof createNotification_ === "function") {
      createNotification_({
        uid: String(row.uid || ""),
        title: "ระบบปิดการเข้าใช้ห้องสมุดอัตโนมัติ",
        message: "ระบบปิด session เนื่องจากเกินเวลาปิดทำการของวันนี้",
        type: "checkin",
        senderUid: "SYSTEM",
        link: "/app/checkin"
      });
    }
  });

  return {
    ok: true,
    closedCount: closedCount,
    closeInfo: closeInfo
  };
}

function settingsLibraryHoursList_(payload) {
  assertSettingsAdmin_(payload && payload.auth);
  const rows = readLibraryHoursRows_().map(function (row) {
    return formatLibraryHourRow_(row);
  }).sort(function (a, b) {
    return Number(a.dayOfWeek || 0) - Number(b.dayOfWeek || 0);
  });
  return {
    items: rows,
    total: rows.length
  };
}

function settingsLibraryHoursUpsert_(payload) {
  assertSettingsAdmin_(payload && payload.auth);
  const items = Array.isArray(payload && payload.items) ? payload.items : [];
  if (!items.length) throw new Error("กรุณาระบุรายการวันและเวลา");

  const normalized = normalizeLibraryHoursInput_(items);
  const sheet = getLibraryHoursSheet_();
  clearSheetDataKeepHeader_(sheet, LIBRARY_HOURS_SCHEMA.COLUMNS.length);
  const rows = normalized.map(function (row) {
    return LIBRARY_HOURS_SCHEMA.COLUMNS.map(function (col) { return row[col]; });
  });
  sheet.getRange(2, 1, rows.length, LIBRARY_HOURS_SCHEMA.COLUMNS.length).setValues(rows);

  return { items: normalized, total: normalized.length };
}

function settingsLibraryExceptionsList_(payload) {
  assertSettingsAdmin_(payload && payload.auth);
  const rows = readLibraryExceptionRows_().map(function (row) {
    return formatLibraryExceptionRow_(row);
  }).sort(function (a, b) {
    return String(a.date || "").localeCompare(String(b.date || ""));
  });
  return { items: rows, total: rows.length };
}

function settingsLibraryExceptionsUpsert_(payload) {
  assertSettingsAdmin_(payload && payload.auth);
  const input = normalizeLibraryExceptionInput_(payload);
  const sheet = getLibraryExceptionsSheet_();
  const found = findRowByField_(sheet, LIBRARY_EXCEPTION_SCHEMA.COLUMNS, "date", input.date);
  if (found && found.rowNumber) {
    writeObjectRow_(sheet, found.rowNumber, LIBRARY_EXCEPTION_SCHEMA.COLUMNS, input);
  } else {
    appendObjectRow_(sheet, LIBRARY_EXCEPTION_SCHEMA.COLUMNS, input);
  }
  return { ok: true, item: formatLibraryExceptionRow_(input) };
}

function settingsLibraryExceptionsDelete_(payload) {
  assertSettingsAdmin_(payload && payload.auth);
  const date = normalizeIsoDate_(payload && payload.date, "date");
  const sheet = getLibraryExceptionsSheet_();
  const found = findRowByField_(sheet, LIBRARY_EXCEPTION_SCHEMA.COLUMNS, "date", date);
  if (!found || !found.rowNumber) return { ok: true, deleted: false };
  sheet.deleteRow(found.rowNumber);
  return { ok: true, deleted: true, date: date };
}

function settingsLibraryRuntimeGet_(payload) {
  assertSettingsAdmin_(payload && payload.auth);
  return getLibraryRuntimeSettings_();
}

function settingsLibraryRuntimeUpsert_(payload) {
  const actor = assertSettingsAdmin_(payload && payload.auth);
  const next = normalizeLibraryRuntimeInput_(payload || {});
  writeSettingKeyValue_("library_visit_required", next.enforceVisitRequired ? "true" : "false", actor.uid);
  writeSettingKeyValue_("library_auto_close_enabled", next.autoCloseEnabled ? "true" : "false", actor.uid);
  writeSettingKeyValue_("library_auto_close_after_minutes", String(next.autoCloseAfterMinutes), actor.uid);
  writeSettingKeyValue_("library_timezone", String(next.timezone || "Asia/Bangkok"), actor.uid);
  return getLibraryRuntimeSettings_();
}

function countActiveLibraryVisits_() {
  return readLibraryVisitRows_().filter(function (row) {
    return String(row.status || "").toLowerCase() === "active";
  }).length;
}

function getActiveVisitSessionForUid_(uid) {
  const target = String(uid || "").trim();
  if (!target) return null;
  const rows = readLibraryVisitRows_().filter(function (row) {
    return String(row.uid || "") === target && String(row.status || "").toLowerCase() === "active";
  }).sort(function (a, b) {
    return safeDateMs_(b.checkInAt) - safeDateMs_(a.checkInAt);
  });
  return rows.length ? formatVisitSession_(rows[0]) : null;
}

function findActiveVisitRowByUid_(uid) {
  const target = String(uid || "").trim();
  if (!target) return null;
  const rows = readLibraryVisitRowsWithRowNumber_().filter(function (entry) {
    const row = entry.rowData || {};
    return String(row.uid || "") === target && String(row.status || "").toLowerCase() === "active";
  }).sort(function (a, b) {
    return safeDateMs_(b.rowData && b.rowData.checkInAt) - safeDateMs_(a.rowData && a.rowData.checkInAt);
  });
  return rows.length ? rows[0] : null;
}

function checkLibraryAccessNow_(timezone) {
  const tz = String(timezone || getLibraryRuntimeSettings_().timezone || "Asia/Bangkok");
  const now = new Date();
  const dateText = Utilities.formatDate(now, tz, "yyyy-MM-dd");
  const dow = Number(Utilities.formatDate(now, tz, "u")) % 7;
  const currentTimeText = Utilities.formatDate(now, tz, "HH:mm");

  const result = {
    date: dateText,
    currentTime: currentTimeText,
    isOpenNow: false,
    openTime: "",
    closeTime: "",
    source: "none",
    closeIso: ""
  };

  // 1. Check Exceptions
  const exception = readLibraryExceptionRows_().find(function (row) {
    return String(row.date || "") === dateText;
  });

  if (exception) {
    result.source = "exception";
    result.openTime = normalizeTimeText_(exception.newOpenTime, false);
    result.closeTime = normalizeTimeText_(exception.newCloseTime, false);
    
    if (result.openTime && result.closeTime) {
      result.isOpenNow = (currentTimeText >= result.openTime && currentTimeText < result.closeTime);
      result.closeIso = buildIsoByDateTime_(dateText, result.closeTime, tz);
    }
    return result;
  }

  // 2. Check Regular Hours
  const regular = readLibraryHoursRows_().map(formatLibraryHourRow_).find(function (row) {
    return Number(row.dayOfWeek) === dow;
  });

  if (regular && regular.isOpen === true && regular.openTime && regular.closeTime) {
    result.source = "regular";
    result.openTime = regular.openTime;
    result.closeTime = regular.closeTime;
    result.isOpenNow = (currentTimeText >= result.openTime && currentTimeText < result.closeTime);
    result.closeIso = buildIsoByDateTime_(dateText, result.closeTime, tz);
  }

  return result;
}

function getLibraryCloseTimeToday_(timezone) {
  const access = checkLibraryAccessNow_(timezone);
  return {
    date: access.date,
    source: access.source,
    isOpen: access.source !== "none" && (access.openTime !== "" || access.closeTime !== ""), // Technically "defined" as open day
    openTime: access.openTime,
    closeTime: access.closeTime,
    closeIso: access.closeIso
  };
}

function formatVisitSession_(row) {
  return {
    visitId: String(row.visitId || ""),
    uid: String(row.uid || ""),
    checkInAt: String(row.checkInAt || ""),
    checkOutAt: String(row.checkOutAt || ""),
    activities: parseVisitActivities_(row.activities),
    status: String(row.status || ""),
    notes: String(row.notes || ""),
    locationId: String(row.locationId || "")
  };
}

function formatLibraryHourRow_(row) {
  return {
    dayOfWeek: Math.max(0, Math.min(6, normalizeLibraryInt_(row.dayOfWeek, 0))),
    openTime: normalizeTimeText_(row.openTime, false) || "",
    closeTime: normalizeTimeText_(row.closeTime, false) || "",
    isOpen: normalizeSettingsBoolean_(row.isOpen)
  };
}

function formatLibraryExceptionRow_(row) {
  return {
    date: normalizeIsoDate_(row.date, "date"),
    newOpenTime: normalizeTimeText_(row.newOpenTime, false) || "",
    newCloseTime: normalizeTimeText_(row.newCloseTime, false) || "",
    reason: String(row.reason || "")
  };
}

function normalizeVisitActivities_(value) {
  if (!Array.isArray(value)) return [];
  const allow = { borrow: true, study: true, relax: true, computer: true, return: true, other: true };
  const uniq = {};
  value.forEach(function (item) {
    const key = String(item || "").trim().toLowerCase();
    if (!key) return;
    if (allow[key] !== true) return;
    uniq[key] = true;
  });
  return Object.keys(uniq);
}

function parseVisitActivities_(value) {
  if (Array.isArray(value)) return normalizeVisitActivities_(value);
  const text = String(value || "").trim();
  if (!text) return [];
  try {
    return normalizeVisitActivities_(JSON.parse(text));
  } catch (_err) {
    return [];
  }
}

function normalizeLibraryHoursInput_(items) {
  const byDay = {};
  items.forEach(function (item) {
    const day = Math.max(0, Math.min(6, normalizeLibraryInt_(item && item.dayOfWeek, NaN)));
    if (!Number.isFinite(day)) throw new Error("dayOfWeek ต้องอยู่ระหว่าง 0-6");
    byDay[day] = {
      dayOfWeek: day,
      openTime: normalizeTimeText_(item && item.openTime, false) || "",
      closeTime: normalizeTimeText_(item && item.closeTime, false) || "",
      isOpen: normalizeSettingsBoolean_(item && item.isOpen)
    };
  });

  const out = [];
  for (var day = 0; day <= 6; day += 1) {
    const row = byDay[day] || {
      dayOfWeek: day,
      openTime: "08:30",
      closeTime: "16:30",
      isOpen: day > 0 && day < 6
    };
    if (row.isOpen && (!row.openTime || !row.closeTime)) {
      throw new Error("วันเปิดทำการต้องระบุเวลาเปิดและเวลาปิด");
    }
    out.push(row);
  }
  return out;
}

function normalizeLibraryExceptionInput_(payload) {
  const date = normalizeIsoDate_(payload && payload.date, "date");
  const openTime = normalizeTimeText_(payload && payload.newOpenTime, false) || "";
  const closeTime = normalizeTimeText_(payload && payload.newCloseTime, false) || "";
  const reason = String(payload && payload.reason || "").trim();
  if (!openTime && !closeTime) throw new Error("กรุณาระบุเวลาเปิดหรือเวลาปิดอย่างน้อย 1 ค่า");
  return {
    date: date,
    newOpenTime: openTime,
    newCloseTime: closeTime,
    reason: reason
  };
}

function normalizeLibraryRuntimeInput_(payload) {
  const current = getLibraryRuntimeSettings_();
  const after = normalizeLibraryInt_(payload && payload.autoCloseAfterMinutes, current.autoCloseAfterMinutes);
  const timezone = String(payload && payload.timezone || current.timezone || "Asia/Bangkok").trim() || "Asia/Bangkok";
  return {
    enforceVisitRequired: payload && payload.enforceVisitRequired !== undefined
      ? normalizeSettingsBoolean_(payload.enforceVisitRequired)
      : current.enforceVisitRequired,
    autoCloseEnabled: payload && payload.autoCloseEnabled !== undefined
      ? normalizeSettingsBoolean_(payload.autoCloseEnabled)
      : current.autoCloseEnabled,
    autoCloseAfterMinutes: Math.max(0, Math.min(720, after)),
    timezone: timezone
  };
}

function getLibraryRuntimeSettings_() {
  const map = readSettingsMap_();
  return {
    enforceVisitRequired: String(map.library_visit_required || "true").toLowerCase() !== "false",
    autoCloseEnabled: String(map.library_auto_close_enabled || "true").toLowerCase() !== "false",
    autoCloseAfterMinutes: Math.max(0, normalizeLibraryInt_(map.library_auto_close_after_minutes, 15)),
    timezone: String(map.library_timezone || "Asia/Bangkok")
  };
}

function normalizeTimeText_(value, required) {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) {
      if (required) throw new Error("กรุณาระบุเวลา");
      return "";
    }
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "HH:mm");
  }

  const text = String(value || "").trim();
  if (!text) {
    if (required) throw new Error("กรุณาระบุเวลา");
    return "";
  }
  // รองรับทั้ง HH:mm และ HH:mm:ss
  const m = text.match(/^([01]?\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/);
  if (!m) throw new Error("รูปแบบเวลาต้องเป็น HH:mm");
  return String(m[1]).padStart(2, "0") + ":" + m[2];
}

function normalizeIsoDate_(value, label) {
  const text = String(value || "").trim();
  if (!text) throw new Error("กรุณาระบุ " + String(label || "date"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error("รูปแบบวันที่ต้องเป็น yyyy-MM-dd");
  return text;
}

function normalizeLibraryInt_(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n);
}

function buildIsoByDateTime_(dateText, timeText, timezone) {
  const tz = String(timezone || "Asia/Bangkok");
  const hour = Number(String(timeText || "00:00").split(":")[0] || 0);
  const min = Number(String(timeText || "00:00").split(":")[1] || 0);
  const base = new Date(dateText + "T00:00:00");
  if (!Number.isFinite(base.getTime())) return "";
  const utc = Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), hour, min, 0, 0);
  const asDate = new Date(utc);
  const datePart = Utilities.formatDate(asDate, tz, "yyyy-MM-dd");
  const timePart = Utilities.formatDate(asDate, tz, "HH:mm:ss");
  const offsetPart = Utilities.formatDate(asDate, tz, "Z");
  return datePart + "T" + timePart + offsetPart;
}

function clearSheetDataKeepHeader_(sheet, width) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  sheet.getRange(2, 1, lastRow - 1, width).clearContent();
}

function getLibraryVisitsSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(LIBRARY_VISIT_SCHEMA.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(LIBRARY_VISIT_SCHEMA.SHEET_NAME);
  ensureHeader_(sheet, LIBRARY_VISIT_SCHEMA.COLUMNS);
  return sheet;
}

function getLibraryHoursSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(LIBRARY_HOURS_SCHEMA.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(LIBRARY_HOURS_SCHEMA.SHEET_NAME);
  ensureHeader_(sheet, LIBRARY_HOURS_SCHEMA.COLUMNS);
  return sheet;
}

function getLibraryExceptionsSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(LIBRARY_EXCEPTION_SCHEMA.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(LIBRARY_EXCEPTION_SCHEMA.SHEET_NAME);
  ensureHeader_(sheet, LIBRARY_EXCEPTION_SCHEMA.COLUMNS);
  return sheet;
}

function getSettingsKvSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const name = (typeof SHEETS !== "undefined" && SHEETS.SETTINGS) || "settings";
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  ensureHeader_(sheet, ["key", "value", "updatedAt", "updatedBy"]);
  return sheet;
}

function readLibraryVisitRows_() {
  return readRowsAsObjects_(getLibraryVisitsSheet_(), LIBRARY_VISIT_SCHEMA.COLUMNS);
}

function readLibraryVisitRowsWithRowNumber_() {
  const sheet = getLibraryVisitsSheet_();
  const rows = readRowsAsObjects_(sheet, LIBRARY_VISIT_SCHEMA.COLUMNS);
  return rows.map(function (row, idx) {
    return { rowNumber: idx + 2, rowData: row };
  });
}

function readLibraryHoursRows_() {
  return readRowsAsObjects_(getLibraryHoursSheet_(), LIBRARY_HOURS_SCHEMA.COLUMNS);
}

function readLibraryExceptionRows_() {
  return readRowsAsObjects_(getLibraryExceptionsSheet_(), LIBRARY_EXCEPTION_SCHEMA.COLUMNS);
}

function nextVisitId_() {
  const tz = getLibraryRuntimeSettings_().timezone || "Asia/Bangkok";
  const datePart = Utilities.formatDate(new Date(), tz, "yyyyMMdd");
  const prefix = "VS-" + datePart + "-";
  const maxNum = readLibraryVisitRows_().reduce(function (max, row) {
    const id = String(row.visitId || "");
    if (id.indexOf(prefix) !== 0) return max;
    const n = Number(id.slice(prefix.length));
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);
  return prefix + String(maxNum + 1).padStart(4, "0");
}

function readSettingsMap_() {
  const rows = readRowsAsObjects_(getSettingsKvSheet_(), ["key", "value", "updatedAt", "updatedBy"]);
  const map = {};
  rows.forEach(function (row) {
    const key = String(row.key || "").trim().toLowerCase();
    if (!key) return;
    map[key] = row.value;
  });
  return map;
}

function writeSettingKeyValue_(key, value, updatedBy) {
  const sheet = getSettingsKvSheet_();
  const found = findRowByField_(sheet, ["key", "value", "updatedAt", "updatedBy"], "key", key);
  const row = {
    key: String(key || "").trim().toLowerCase(),
    value: String(value || ""),
    updatedAt: new Date().toISOString(),
    updatedBy: String(updatedBy || "")
  };
  if (found && found.rowNumber) {
    writeObjectRow_(sheet, found.rowNumber, ["key", "value", "updatedAt", "updatedBy"], row);
  } else {
    appendObjectRow_(sheet, ["key", "value", "updatedAt", "updatedBy"], row);
  }
}
