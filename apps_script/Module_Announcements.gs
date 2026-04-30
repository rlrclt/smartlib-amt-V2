/**
 * Module_Announcements.gs - Schema + Logic สำหรับระบบประกาศ
 */

const ANNOUNCEMENT_SCHEMA = {
  SHEET_NAME: "announcements",
  COLUMNS: [
    "id", "title", "summary", "body", "category",
    "author", "status", "pin", "photoURL", "publishDate",
    "expiryDate", "createdAt", "updatedAt", "viewCount"
  ]
};

const ANNOUNCEMENT_CATEGORIES = ["Event", "Notice", "Update"];
const ANNOUNCEMENT_STATUSES = ["draft", "published", "archived"];

function listAnnouncements_(params) {
  const includeArchived = toBoolean_(params && params.includeArchived);
  const includeAll = toBoolean_(params && params.all);
  const now = new Date();

  let rows = readAnnouncementRows_();
  if (!includeAll) {
    rows = rows.filter(function (entry) {
      const row = entry.item;
      if (String(row.status || "").toLowerCase() !== "published") return false;

      const publish = safeDate_(row.publishDate);
      const expiry = safeDate_(row.expiryDate);
      if (publish && publish > now) return false;
      if (expiry && expiry < now) return false;
      return true;
    });
  } else if (!includeArchived) {
    rows = rows.filter(function (entry) {
      return String(entry.item.status || "").toLowerCase() !== "archived";
    });
  }

  rows.sort(function (a, b) {
    const aItem = a.item;
    const bItem = b.item;

    const aPin = toBoolean_(aItem.pin) ? 1 : 0;
    const bPin = toBoolean_(bItem.pin) ? 1 : 0;
    if (aPin !== bPin) return bPin - aPin;

    const aPublish = safeDate_(aItem.publishDate);
    const bPublish = safeDate_(bItem.publishDate);
    const aTime = aPublish ? aPublish.getTime() : 0;
    const bTime = bPublish ? bPublish.getTime() : 0;
    if (aTime !== bTime) return bTime - aTime;

    const aUpdated = safeDate_(aItem.updatedAt);
    const bUpdated = safeDate_(bItem.updatedAt);
    return (bUpdated ? bUpdated.getTime() : 0) - (aUpdated ? aUpdated.getTime() : 0);
  });

  return rows.map(function (entry) {
    return normalizeOutput_(entry.item);
  });
}

function createAnnouncement_(payload) {
  assertManageAdmin_(payload && payload.auth);
  const nowIso = new Date().toISOString();
  const normalized = normalizeAnnouncementPayload_(payload, {
    id: buildAnnouncementId_(),
    createdAt: nowIso,
    updatedAt: nowIso
  });
  validateAnnouncementPayload_(normalized);
  ensureAnnouncementUnique_(normalized.id);

  const sheet = getAnnouncementsSheet_();
  const row = ANNOUNCEMENT_SCHEMA.COLUMNS.map(function (col) {
    return normalized[col] === undefined ? "" : normalized[col];
  });
  sheet.appendRow(row);

  if (String(normalized.status || "").toLowerCase() === "published") {
    createNotificationForAllUsers_({
      title: "มีประกาศใหม่",
      message: String(normalized.title || "มีประกาศใหม่ในระบบ"),
      type: "system",
      senderUid: String(normalized.author || "SYSTEM"),
      link: "/announcements?id=" + encodeURIComponent(String(normalized.id || ""))
    });
  }

  return normalizeOutput_(normalized);
}

function updateAnnouncement_(payload) {
  assertManageAdmin_(payload && payload.auth);
  const id = String(payload && payload.id ? payload.id : "").trim();
  if (!id) throw new Error("ต้องระบุ id ของประกาศ");

  const found = findAnnouncementById_(id);
  if (!found) throw new Error("ไม่พบประกาศที่ต้องการอัปเดต");

  const nowIso = new Date().toISOString();
  const merged = {};
  ANNOUNCEMENT_SCHEMA.COLUMNS.forEach(function (col) {
    merged[col] = found.item[col];
  });

  const incoming = normalizeAnnouncementPayload_(payload, { updatedAt: nowIso });
  Object.keys(incoming).forEach(function (key) {
    if (incoming[key] !== undefined && incoming[key] !== null) {
      merged[key] = incoming[key];
    }
  });
  merged.id = id;
  if (!merged.createdAt) merged.createdAt = nowIso;
  merged.updatedAt = nowIso;

  validateAnnouncementPayload_(merged);
  writeAnnouncementRow_(found.rowNumber, merged);
  return normalizeOutput_(merged);
}

function archiveAnnouncement_(payload) {
  assertManageAdmin_(payload && payload.auth);
  const id = String(payload && payload.id ? payload.id : "").trim();
  if (!id) throw new Error("ต้องระบุ id ของประกาศ");

  const found = findAnnouncementById_(id);
  if (!found) throw new Error("ไม่พบประกาศที่ต้องการ archive");

  const merged = {};
  ANNOUNCEMENT_SCHEMA.COLUMNS.forEach(function (col) {
    merged[col] = found.item[col];
  });
  merged.status = "archived";
  merged.updatedAt = new Date().toISOString();

  writeAnnouncementRow_(found.rowNumber, merged);
  return normalizeOutput_(merged);
}

function incrementAnnouncementView_(payload) {
  const id = String(payload && payload.id ? payload.id : "").trim();
  if (!id) throw new Error("ต้องระบุ id ของประกาศ");

  const found = findAnnouncementById_(id);
  if (!found) throw new Error("ไม่พบประกาศ");

  const merged = {};
  ANNOUNCEMENT_SCHEMA.COLUMNS.forEach(function (col) {
    merged[col] = found.item[col];
  });

  const currentViews = Number(merged.viewCount || 0);
  merged.viewCount = Number.isFinite(currentViews) ? currentViews + 1 : 1;
  merged.updatedAt = new Date().toISOString();

  writeAnnouncementRow_(found.rowNumber, merged);
  return {
    id: merged.id,
    viewCount: merged.viewCount
  };
}

function getAnnouncementsSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(ANNOUNCEMENT_SCHEMA.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(ANNOUNCEMENT_SCHEMA.SHEET_NAME);
  ensureAnnouncementsHeader_(sheet);
  return sheet;
}

function ensureAnnouncementsHeader_(sheet) {
  const range = sheet.getRange(1, 1, 1, ANNOUNCEMENT_SCHEMA.COLUMNS.length);
  const current = range.getValues()[0];
  const needUpdate = ANNOUNCEMENT_SCHEMA.COLUMNS.some(function (col, index) {
    return current[index] !== col;
  });
  if (needUpdate) {
    range.setValues([ANNOUNCEMENT_SCHEMA.COLUMNS]);
    sheet.setFrozenRows(1);
  }
}

function readAnnouncementRows_() {
  const sheet = getAnnouncementsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(1, 1, lastRow, ANNOUNCEMENT_SCHEMA.COLUMNS.length).getValues();
  const headers = values[0];
  const map = {};
  headers.forEach(function (header, index) {
    map[header] = index;
  });

  return values.slice(1).map(function (row, idx) {
    const item = {};
    ANNOUNCEMENT_SCHEMA.COLUMNS.forEach(function (col) {
      item[col] = row[map[col]];
    });
    return { rowNumber: idx + 2, item: item };
  });
}

function findAnnouncementById_(id) {
  const target = String(id || "").trim();
  const rows = readAnnouncementRows_();
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].item.id || "") === target) return rows[i];
  }
  return null;
}

function writeAnnouncementRow_(rowNumber, item) {
  const sheet = getAnnouncementsSheet_();
  const row = ANNOUNCEMENT_SCHEMA.COLUMNS.map(function (col) {
    return item[col] === undefined ? "" : item[col];
  });
  sheet.getRange(rowNumber, 1, 1, ANNOUNCEMENT_SCHEMA.COLUMNS.length).setValues([row]);
}

function validateAnnouncementPayload_(item) {
  const required = ["id", "title", "summary", "body", "category", "author", "status", "publishDate", "createdAt", "updatedAt"];
  required.forEach(function (field) {
    const value = item[field];
    if (value === undefined || value === null || String(value).trim() === "") {
      throw new Error('ข้อมูล "' + field + '" ห้ามว่าง');
    }
  });

  if (ANNOUNCEMENT_CATEGORIES.indexOf(String(item.category)) < 0) {
    throw new Error("category ไม่ถูกต้อง ต้องเป็น Event, Notice หรือ Update");
  }
  if (ANNOUNCEMENT_STATUSES.indexOf(String(item.status).toLowerCase()) < 0) {
    throw new Error("status ไม่ถูกต้อง ต้องเป็น draft, published หรือ archived");
  }

  if (!safeDate_(item.publishDate)) throw new Error("publishDate ไม่ถูกต้อง");
  if (String(item.expiryDate || "").trim() && !safeDate_(item.expiryDate)) {
    throw new Error("expiryDate ไม่ถูกต้อง");
  }
}

function normalizeAnnouncementPayload_(payload, defaults) {
  const src = payload || {};
  const base = defaults || {};
  return {
    id: String(src.id !== undefined ? src.id : base.id || "").trim(),
    title: String(src.title !== undefined ? src.title : base.title || "").trim(),
    summary: String(src.summary !== undefined ? src.summary : base.summary || "").trim(),
    body: String(src.body !== undefined ? src.body : base.body || "").trim(),
    category: normalizeCategory_(src.category !== undefined ? src.category : base.category),
    author: String(src.author !== undefined ? src.author : base.author || "Admin").trim(),
    status: normalizeStatus_(src.status !== undefined ? src.status : base.status || "draft"),
    pin: toBoolean_(src.pin !== undefined ? src.pin : base.pin),
    photoURL: String(src.photoURL !== undefined ? src.photoURL : base.photoURL || "").trim(),
    publishDate: normalizeDateText_(src.publishDate !== undefined ? src.publishDate : base.publishDate),
    expiryDate: normalizeDateText_(src.expiryDate !== undefined ? src.expiryDate : base.expiryDate),
    createdAt: String(src.createdAt !== undefined ? src.createdAt : base.createdAt || "").trim(),
    updatedAt: String(src.updatedAt !== undefined ? src.updatedAt : base.updatedAt || "").trim(),
    viewCount: normalizeViewCount_(src.viewCount !== undefined ? src.viewCount : base.viewCount)
  };
}

function normalizeOutput_(item) {
  return {
    id: String(item.id || ""),
    title: String(item.title || ""),
    summary: String(item.summary || ""),
    body: String(item.body || ""),
    category: normalizeCategory_(item.category),
    author: String(item.author || ""),
    status: normalizeStatus_(item.status),
    pin: toBoolean_(item.pin),
    photoURL: String(item.photoURL || ""),
    publishDate: normalizeDateText_(item.publishDate),
    expiryDate: normalizeDateText_(item.expiryDate),
    createdAt: String(item.createdAt || ""),
    updatedAt: String(item.updatedAt || ""),
    viewCount: normalizeViewCount_(item.viewCount)
  };
}

function normalizeCategory_(value) {
  const text = String(value || "Notice").trim().toLowerCase();
  if (text === "event") return "Event";
  if (text === "update") return "Update";
  return "Notice";
}

function normalizeStatus_(value) {
  const text = String(value || "draft").trim().toLowerCase();
  if (ANNOUNCEMENT_STATUSES.indexOf(text) >= 0) return text;
  return "draft";
}

function normalizeDateText_(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const d = safeDate_(text);
  if (!d) return "";
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function safeDate_(value) {
  const text = String(value || "").trim();
  if (!text) return null;
  const d = new Date(text);
  if (!Number.isFinite(d.getTime())) return null;
  return d;
}

function ensureAnnouncementUnique_(id) {
  if (findAnnouncementById_(id)) {
    throw new Error("id ของประกาศซ้ำในระบบ");
  }
}

function buildAnnouncementId_() {
  const now = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMddHHmmss");
  const rand = Math.floor(Math.random() * 1000).toString();
  return "ann_" + now + rand;
}

function toBoolean_(value) {
  const text = String(value || "").trim().toLowerCase();
  return text === "true" || text === "1" || text === "yes" || text === "on";
}

function normalizeViewCount_(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.floor(num);
}
