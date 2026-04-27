/**
 * Module_Books.gs
 * Books Catalog + Book Items (Google Sheets)
 * - Catalog split: active/archived sheets
 * - Pagination + cache versioning
 * - Global search supports barcode lookup
 */

const BOOK_CATALOG_SCHEMA = {
  SHEET_NAME: (typeof SHEETS !== "undefined" && SHEETS.BOOKS_CATALOG) || "books_catalog",
  ARCHIVE_SHEET: (typeof SHEETS !== "undefined" && SHEETS.BOOKS_CATALOG_ARCHIVE) || "books_catalog_archive",
  COLUMNS: [
    "bookId", "isbn", "title", "author", "publisher",
    "category", "callNumber", "edition", "language",
    "coverUrl", "description", "tags", "price", "status", "createdAt"
  ]
};

const BOOK_ITEM_SCHEMA = {
  SHEET_NAME: (typeof SHEETS !== "undefined" && SHEETS.BOOK_ITEMS) || "book_items",
  COLUMNS: [
    "barcode", "bookId", "status", "location", "purchasePrice",
    "condition", "activeLoanId", "notes", "createdAt", "updatedAt"
  ]
};

const BOOK_ITEM_STATUSES = ["available", "borrowed", "lost", "damaged", "reserved"];
const BOOK_ITEM_CONDITIONS = ["good", "fair", "poor"];
const BOOK_CACHE_VERSION_KEY = "books:cache:version";

function booksCatalogList_(params) {
  const status = normalizeCatalogStatus_(params && params.status);
  const q = String(params && params.q ? params.q : "").trim().toLowerCase();
  const page = normalizePositiveInt_(params && params.page, 1);
  const limit = normalizePositiveInt_(params && params.limit, 50, 100);

  const cache = CacheService.getScriptCache();
  const cacheKey = [
    "books_catalog_list",
    getBooksCacheVersion_(),
    status,
    q,
    String(page),
    String(limit),
  ].join("|");

  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const activeRows = readBookCatalogRows_("active");
  const archivedRows = readBookCatalogRows_("archived");
  const allItems = readBookItemRows_();
  const inventoryMap = buildInventoryMap_(allItems);
  const barcodeMap = buildBarcodeMap_(allItems);

  let rows;
  if (status === "active") rows = activeRows;
  else if (status === "archived") rows = archivedRows;
  else rows = activeRows.concat(archivedRows);

  if (q) {
    let matchedBookIdFromBarcode = "";
    Object.keys(barcodeMap).some(function (barcode) {
      if (barcode.toLowerCase() === q) {
        matchedBookIdFromBarcode = barcodeMap[barcode];
        return true;
      }
      return false;
    });

    rows = rows.filter(function (row) {
      const fields = [
        row.bookId,
        row.isbn,
        row.title,
        row.author,
        row.publisher,
        row.category,
        row.callNumber,
        row.tags,
      ].map(function (v) {
        return String(v || "").toLowerCase();
      });

      if (matchedBookIdFromBarcode && String(row.bookId || "") === matchedBookIdFromBarcode) return true;
      return fields.some(function (value) {
        return value.indexOf(q) >= 0;
      });
    });
  }

  rows = rows.slice().sort(function (a, b) {
    return safeDateMs_(b.createdAt) - safeDateMs_(a.createdAt);
  });

  const total = rows.length;
  const start = (page - 1) * limit;
  const pageRows = rows.slice(start, start + limit);

  const output = {
    items: pageRows.map(function (row) {
      const bookId = String(row.bookId || "");
      return {
        bookId: bookId,
        isbn: String(row.isbn || ""),
        title: String(row.title || ""),
        author: String(row.author || ""),
        publisher: String(row.publisher || ""),
        category: String(row.category || ""),
        callNumber: String(row.callNumber || ""),
        edition: String(row.edition || ""),
        language: String(row.language || ""),
        coverUrl: String(row.coverUrl || ""),
        description: String(row.description || ""),
        tags: String(row.tags || ""),
        price: toNumber_(row.price, 0),
        status: normalizeCatalogStatus_(row.status),
        createdAt: String(row.createdAt || ""),
        inventory: inventoryMap[bookId] || { total: 0, available: 0 },
      };
    }),
    page: page,
    limit: limit,
    total: total,
    hasMore: start + limit < total,
  };

  cache.put(cacheKey, JSON.stringify(output), 600);
  return output;
}

function booksCatalogGet_(params) {
  const bookIdRaw = String(params && params.bookId ? params.bookId : "").trim();
  const isbnRaw = String(params && params.isbn ? params.isbn : "").trim();
  const barcodeRaw = String(params && params.barcode ? params.barcode : "").trim();

  let targetBookId = bookIdRaw;
  const allItems = readBookItemRows_();

  if (!targetBookId && barcodeRaw) {
    const item = allItems.find(function (row) {
      return String(row.barcode || "") === barcodeRaw;
    });
    if (item) targetBookId = String(item.bookId || "");
  }

  const activeRows = readBookCatalogRows_("active");
  const archivedRows = readBookCatalogRows_("archived");
  const allCatalogs = activeRows.concat(archivedRows);

  const book = allCatalogs.find(function (row) {
    if (targetBookId && String(row.bookId || "") === targetBookId) return true;
    if (isbnRaw && String(row.isbn || "") === isbnRaw) return true;
    return false;
  });

  if (!book) return null;

  const relatedItems = allItems.filter(function (row) {
    return String(row.bookId || "") === String(book.bookId || "");
  });

  const inventory = buildInventoryMap_(relatedItems)[book.bookId] || { total: 0, available: 0 };

  return {
    book: {
      bookId: String(book.bookId || ""),
      isbn: String(book.isbn || ""),
      title: String(book.title || ""),
      author: String(book.author || ""),
      publisher: String(book.publisher || ""),
      category: String(book.category || ""),
      callNumber: String(book.callNumber || ""),
      edition: String(book.edition || ""),
      language: String(book.language || ""),
      coverUrl: String(book.coverUrl || ""),
      description: String(book.description || ""),
      tags: String(book.tags || ""),
      price: toNumber_(book.price, 0),
      status: normalizeCatalogStatus_(book.status),
      createdAt: String(book.createdAt || ""),
    },
    inventory: inventory,
  };
}

function booksCatalogCreate_(payload) {
  const input = payload || {};
  const title = String(input.title || "").trim();
  if (!title) throw new Error("กรุณาระบุชื่อหนังสือ");

  const isbn = String(input.isbn || "").trim();
  const activeRows = readBookCatalogRows_("active");
  const archivedRows = readBookCatalogRows_("archived");
  const allCatalogs = activeRows.concat(archivedRows);

  if (isbn && allCatalogs.some(function (row) {
    return String(row.isbn || "") === isbn;
  })) {
    throw new Error("ISBN นี้มีอยู่ในระบบแล้ว");
  }

  const now = new Date().toISOString();
  const bookId = nextBookId_(allCatalogs);

  const catalogObj = {
    bookId: bookId,
    isbn: isbn,
    title: title,
    author: String(input.author || "").trim(),
    publisher: String(input.publisher || "").trim(),
    category: String(input.category || "").trim(),
    callNumber: String(input.callNumber || "").trim(),
    edition: String(input.edition || "").trim(),
    language: String(input.language || "").trim(),
    coverUrl: String(input.coverUrl || "").trim(),
    description: String(input.description || "").trim(),
    tags: String(input.tags || "").trim(),
    price: toNumber_(input.price, 0),
    status: "active",
    createdAt: now,
  };

  appendObjectRow_(getBooksCatalogSheet_("active"), BOOK_CATALOG_SCHEMA.COLUMNS, catalogObj);

  const initialCopies = normalizePositiveInt_(input.initialCopies || input.initialCount, 1, 200);
  const createdCopies = createBookItems_(bookId, 0, initialCopies, {
    location: String(input.location || "").trim(),
    purchasePrice: toNumber_(input.purchasePrice || input.price, 0),
    condition: normalizeItemCondition_(input.condition),
    notes: String(input.notes || "").trim(),
  }, now);

  bumpBooksCacheVersion_();
  return {
    ok: true,
    bookId: bookId,
    createdCopies: createdCopies,
  };
}

function booksCatalogUpdate_(payload) {
  const input = payload || {};
  const bookId = String(input.bookId || "").trim();
  if (!bookId) throw new Error("กรุณาระบุ bookId");

  const found = findCatalogRowByBookId_(bookId);
  if (!found || !found.rowNumber || !found.rowData) {
    throw new Error("ไม่พบหนังสือที่ต้องการแก้ไข");
  }

  const title = String(input.title || "").trim();
  if (!title) throw new Error("กรุณาระบุชื่อหนังสือ");

  const isbn = String(input.isbn || "").trim();
  const allCatalogs = readBookCatalogRows_("active").concat(readBookCatalogRows_("archived"));
  if (isbn && allCatalogs.some(function (row) {
    return String(row.bookId || "") !== bookId && String(row.isbn || "") === isbn;
  })) {
    throw new Error("ISBN นี้มีอยู่ในระบบแล้ว");
  }

  const current = found.rowData;
  const updated = {
    bookId: bookId,
    isbn: isbn,
    title: title,
    author: String(input.author || "").trim(),
    publisher: String(input.publisher || "").trim(),
    category: String(input.category || "").trim(),
    callNumber: String(input.callNumber || "").trim(),
    edition: String(input.edition || "").trim(),
    language: String(input.language || "").trim(),
    coverUrl: String(input.coverUrl || "").trim(),
    description: String(input.description || "").trim(),
    tags: String(input.tags || "").trim(),
    price: toNumber_(input.price, 0),
    status: normalizeCatalogStatus_(current.status),
    createdAt: String(current.createdAt || ""),
  };

  writeObjectRow_(found.sheet, found.rowNumber, BOOK_CATALOG_SCHEMA.COLUMNS, updated);
  bumpBooksCacheVersion_();
  return { ok: true, bookId: bookId };
}

function booksCatalogArchive_(payload) {
  const bookId = String(payload && payload.bookId ? payload.bookId : "").trim();
  if (!bookId) throw new Error("กรุณาระบุ bookId");

  const hasBorrowed = readBookItemRows_().some(function (row) {
    return String(row.bookId || "") === bookId && String(row.status || "").toLowerCase() === "borrowed";
  });
  if (hasBorrowed) {
    throw new Error("ไม่สามารถ Archive ได้ เพราะยังมีเล่มที่ถูกยืมอยู่");
  }

  const activeSheet = getBooksCatalogSheet_("active");
  const found = findRowByField_(activeSheet, BOOK_CATALOG_SCHEMA.COLUMNS, "bookId", bookId);
  if (!found.rowNumber) throw new Error("ไม่พบหนังสือที่ต้องการ archive");

  const rowObj = found.rowData;
  rowObj.status = "archived";

  appendObjectRow_(getBooksCatalogSheet_("archived"), BOOK_CATALOG_SCHEMA.COLUMNS, rowObj);
  activeSheet.deleteRow(found.rowNumber);

  bumpBooksCacheVersion_();
  return { ok: true, bookId: bookId, status: "archived" };
}

function booksCatalogUnarchive_(payload) {
  const bookId = String(payload && payload.bookId ? payload.bookId : "").trim();
  if (!bookId) throw new Error("กรุณาระบุ bookId");

  const archivedSheet = getBooksCatalogSheet_("archived");
  const found = findRowByField_(archivedSheet, BOOK_CATALOG_SCHEMA.COLUMNS, "bookId", bookId);
  if (!found.rowNumber) throw new Error("ไม่พบหนังสือที่ต้องการกู้คืน");

  const rowObj = found.rowData;
  rowObj.status = "active";

  appendObjectRow_(getBooksCatalogSheet_("active"), BOOK_CATALOG_SCHEMA.COLUMNS, rowObj);
  archivedSheet.deleteRow(found.rowNumber);

  bumpBooksCacheVersion_();
  return { ok: true, bookId: bookId, status: "active" };
}

function bookItemsAddCopies_(payload) {
  const bookId = String(payload && payload.bookId ? payload.bookId : "").trim();
  if (!bookId) throw new Error("กรุณาระบุ bookId");

  const count = normalizePositiveInt_(payload && payload.count, 1, 500);
  const activeRows = readBookCatalogRows_("active");
  const archivedRows = readBookCatalogRows_("archived");
  const exists = activeRows.concat(archivedRows).some(function (row) {
    return String(row.bookId || "") === bookId;
  });
  if (!exists) throw new Error("ไม่พบหนังสือแม่ในระบบ");

  const currentRows = readBookItemRows_().filter(function (row) {
    return String(row.bookId || "") === bookId;
  });

  const lastSeq = currentRows.reduce(function (max, row) {
    return Math.max(max, extractBarcodeSeq_(String(row.barcode || "")));
  }, 0);

  const defaults = payload && payload.defaults ? payload.defaults : payload || {};
  const now = new Date().toISOString();

  const added = createBookItems_(bookId, lastSeq, count, {
    location: String(defaults.location || "").trim(),
    purchasePrice: toNumber_(defaults.purchasePrice, 0),
    condition: normalizeItemCondition_(defaults.condition),
    notes: String(defaults.notes || "").trim(),
  }, now);

  bumpBooksCacheVersion_();
  return { ok: true, bookId: bookId, added: added };
}

function bookItemsList_(params) {
  const bookId = String(params && params.bookId ? params.bookId : "").trim();
  if (!bookId) throw new Error("กรุณาระบุ bookId");

  const status = normalizeItemStatusFilter_(params && params.status);
  const page = normalizePositiveInt_(params && params.page, 1);
  const limit = normalizePositiveInt_(params && params.limit, 50, 100);

  const cache = CacheService.getScriptCache();
  const cacheKey = [
    "book_items_list",
    getBooksCacheVersion_(),
    bookId,
    status,
    String(page),
    String(limit),
  ].join("|");

  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  let rows = readBookItemRows_().filter(function (row) {
    return String(row.bookId || "") === bookId;
  });

  if (status !== "all") {
    rows = rows.filter(function (row) {
      return String(row.status || "").toLowerCase() === status;
    });
  }

  rows = rows.slice().sort(function (a, b) {
    return extractBarcodeSeq_(String(a.barcode || "")) - extractBarcodeSeq_(String(b.barcode || ""));
  });

  const total = rows.length;
  const start = (page - 1) * limit;
  const pageRows = rows.slice(start, start + limit);

  const output = {
    items: pageRows.map(function (row) {
      return {
        barcode: String(row.barcode || ""),
        bookId: String(row.bookId || ""),
        status: String(row.status || "available"),
        location: String(row.location || ""),
        purchasePrice: toNumber_(row.purchasePrice, 0),
        condition: String(row.condition || "good"),
        activeLoanId: String(row.activeLoanId || ""),
        notes: String(row.notes || ""),
        createdAt: String(row.createdAt || ""),
        updatedAt: String(row.updatedAt || ""),
      };
    }),
    page: page,
    limit: limit,
    total: total,
    hasMore: start + limit < total,
  };

  cache.put(cacheKey, JSON.stringify(output), 600);
  return output;
}

function bookItemUpdateStatus_(payload) {
  const barcode = String(payload && payload.barcode ? payload.barcode : "").trim();
  if (!barcode) throw new Error("กรุณาระบุ barcode");

  const newStatus = normalizeItemStatus_(payload && payload.status);
  if (!newStatus) throw new Error("status ไม่ถูกต้อง");

  const sheet = getBookItemsSheet_();
  const found = findRowByField_(sheet, BOOK_ITEM_SCHEMA.COLUMNS, "barcode", barcode);
  if (!found.rowNumber) throw new Error("ไม่พบ barcode ที่ต้องการแก้ไข");

  const row = found.rowData;
  row.status = newStatus;
  row.condition = normalizeItemCondition_(payload && payload.condition ? payload.condition : row.condition);
  row.location = String(payload && payload.location !== undefined ? payload.location : row.location || "").trim();
  row.notes = String(payload && payload.notes !== undefined ? payload.notes : row.notes || "").trim();
  row.activeLoanId = newStatus === "borrowed"
    ? String(payload && payload.activeLoanId ? payload.activeLoanId : row.activeLoanId || "").trim()
    : "";
  row.updatedAt = new Date().toISOString();

  writeObjectRow_(sheet, found.rowNumber, BOOK_ITEM_SCHEMA.COLUMNS, row);

  bumpBooksCacheVersion_();
  return {
    ok: true,
    barcode: barcode,
    status: row.status,
    updatedAt: row.updatedAt,
  };
}

function getBooksCatalogSheet_(mode) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const targetMode = mode === "archived" ? "archived" : "active";
  const name = targetMode === "archived"
    ? BOOK_CATALOG_SCHEMA.ARCHIVE_SHEET
    : BOOK_CATALOG_SCHEMA.SHEET_NAME;

  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  ensureHeader_(sheet, BOOK_CATALOG_SCHEMA.COLUMNS);
  return sheet;
}

function getBookItemsSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(BOOK_ITEM_SCHEMA.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(BOOK_ITEM_SCHEMA.SHEET_NAME);
  ensureHeader_(sheet, BOOK_ITEM_SCHEMA.COLUMNS);
  return sheet;
}

function ensureHeader_(sheet, columns) {
  const range = sheet.getRange(1, 1, 1, columns.length);
  const current = range.getValues()[0];
  const needsWrite = columns.some(function (col, idx) {
    return current[idx] !== col;
  });
  if (!needsWrite) return;

  range.setValues([columns]);
  sheet.setFrozenRows(1);
}

function readBookCatalogRows_(mode) {
  return readRowsAsObjects_(getBooksCatalogSheet_(mode), BOOK_CATALOG_SCHEMA.COLUMNS);
}

function readBookItemRows_() {
  return readRowsAsObjects_(getBookItemsSheet_(), BOOK_ITEM_SCHEMA.COLUMNS);
}

function readRowsAsObjects_(sheet, columns) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(1, 1, lastRow, columns.length).getValues();
  const header = values[0];
  const indexMap = {};
  header.forEach(function (name, idx) {
    indexMap[name] = idx;
  });

  return values.slice(1).map(function (row) {
    const out = {};
    columns.forEach(function (col) {
      out[col] = row[indexMap[col]];
    });
    return out;
  });
}

function appendObjectRow_(sheet, columns, obj) {
  const row = columns.map(function (col) {
    return obj[col] === undefined ? "" : obj[col];
  });
  sheet.appendRow(row);
}

function appendObjectRows_(sheet, columns, objects) {
  if (!objects || !objects.length) return;

  const rows = objects.map(function (obj) {
    return columns.map(function (col) {
      return obj[col] === undefined ? "" : obj[col];
    });
  });

  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, columns.length).setValues(rows);
}

function writeObjectRow_(sheet, rowNumber, columns, obj) {
  const row = columns.map(function (col) {
    return obj[col] === undefined ? "" : obj[col];
  });
  sheet.getRange(rowNumber, 1, 1, columns.length).setValues([row]);
}

function findRowByField_(sheet, columns, field, expected) {
  const rows = readRowsAsObjects_(sheet, columns);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][field] || "") === String(expected || "")) {
      return { rowNumber: i + 2, rowData: rows[i] };
    }
  }
  return { rowNumber: 0, rowData: null };
}

function findCatalogRowByBookId_(bookId) {
  const activeSheet = getBooksCatalogSheet_("active");
  const inActive = findRowByField_(activeSheet, BOOK_CATALOG_SCHEMA.COLUMNS, "bookId", bookId);
  if (inActive.rowNumber) return { sheet: activeSheet, rowNumber: inActive.rowNumber, rowData: inActive.rowData };

  const archivedSheet = getBooksCatalogSheet_("archived");
  const inArchived = findRowByField_(archivedSheet, BOOK_CATALOG_SCHEMA.COLUMNS, "bookId", bookId);
  if (inArchived.rowNumber) return { sheet: archivedSheet, rowNumber: inArchived.rowNumber, rowData: inArchived.rowData };

  return { sheet: null, rowNumber: 0, rowData: null };
}

function nextBookId_(catalogRows) {
  const maxNum = catalogRows.reduce(function (max, row) {
    const id = String(row.bookId || "");
    const m = id.match(/^BK-(\d+)$/);
    if (!m) return max;
    const n = Number(m[1]);
    return Number.isFinite(n) ? Math.max(max, n) : max;
  }, 0);

  return "BK-" + String(maxNum + 1).padStart(3, "0");
}

function createBookItems_(bookId, lastSeq, count, defaults, nowIso) {
  const sheet = getBookItemsSheet_();
  const objects = [];

  for (var i = 1; i <= count; i++) {
    const seq = lastSeq + i;
    objects.push({
      barcode: bookId + "-" + String(seq).padStart(2, "0"),
      bookId: bookId,
      status: "available",
      location: String(defaults.location || ""),
      purchasePrice: toNumber_(defaults.purchasePrice, 0),
      condition: normalizeItemCondition_(defaults.condition),
      activeLoanId: "",
      notes: String(defaults.notes || ""),
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  appendObjectRows_(sheet, BOOK_ITEM_SCHEMA.COLUMNS, objects);
  return objects.length;
}

function buildInventoryMap_(items) {
  return items.reduce(function (acc, item) {
    const key = String(item.bookId || "");
    if (!key) return acc;

    if (!acc[key]) acc[key] = { total: 0, available: 0 };
    acc[key].total += 1;
    if (String(item.status || "").toLowerCase() === "available") {
      acc[key].available += 1;
    }
    return acc;
  }, {});
}

function buildBarcodeMap_(items) {
  return items.reduce(function (acc, item) {
    const barcode = String(item.barcode || "");
    if (!barcode) return acc;
    acc[barcode] = String(item.bookId || "");
    return acc;
  }, {});
}

function extractBarcodeSeq_(barcode) {
  const m = String(barcode || "").match(/-(\d+)$/);
  if (!m) return 0;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : 0;
}

function normalizeCatalogStatus_(value) {
  const s = String(value || "active").trim().toLowerCase();
  if (s === "active" || s === "archived" || s === "all") return s;
  return "active";
}

function normalizeItemStatusFilter_(value) {
  const s = String(value || "all").trim().toLowerCase();
  if (s === "all" || BOOK_ITEM_STATUSES.indexOf(s) >= 0) return s;
  return "all";
}

function normalizeItemStatus_(value) {
  const s = String(value || "").trim().toLowerCase();
  return BOOK_ITEM_STATUSES.indexOf(s) >= 0 ? s : "";
}

function normalizeItemCondition_(value) {
  const s = String(value || "good").trim().toLowerCase();
  return BOOK_ITEM_CONDITIONS.indexOf(s) >= 0 ? s : "good";
}

function normalizePositiveInt_(value, fallback, maxValue) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  const i = Math.floor(n);
  if (maxValue && i > maxValue) return maxValue;
  return i;
}

function toNumber_(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function safeDateMs_(value) {
  const d = new Date(String(value || ""));
  return Number.isFinite(d.getTime()) ? d.getTime() : 0;
}

function getBooksCacheVersion_() {
  return PropertiesService.getScriptProperties().getProperty(BOOK_CACHE_VERSION_KEY) || "1";
}

function bumpBooksCacheVersion_() {
  PropertiesService.getScriptProperties().setProperty(BOOK_CACHE_VERSION_KEY, String(Date.now()));
}
