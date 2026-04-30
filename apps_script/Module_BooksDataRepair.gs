/**
 * Module_BooksDataRepair.gs
 * Data audit/repair for books_catalog + book_items integrity.
 */

function booksDataRepair_(payload) {
  const actor = assertManageStaff_(payload && payload.auth);
  if (String(actor && actor.role || "").toLowerCase() !== "admin") {
    throw new Error("403: ADMIN_REQUIRED");
  }

  const mode = String(payload && payload.mode || "audit").trim().toLowerCase();
  const repair = mode === "repair";
  const nowIso = new Date().toISOString();

  const activeCatalogRows = readBookCatalogRows_("active");
  const archivedCatalogRows = readBookCatalogRows_("archived");
  const allCatalogRows = activeCatalogRows.concat(archivedCatalogRows);
  const catalogBookIdSet = buildBookIdSet_(allCatalogRows);

  const activeCatalogSheet = getBooksCatalogSheet_("active");
  const archivedCatalogSheet = getBooksCatalogSheet_("archived");
  const bookItemsSheet = getBookItemsSheet_();

  const audit = {
    mode: repair ? "repair" : "audit",
    generatedAt: nowIso,
    summary: {
      scannedBookItems: 0,
      scannedCatalogs: allCatalogRows.length,
      mismatchedBookItems: 0,
      fixedBookItems: 0,
      missingCategoryRows: 0,
      fixedCategoryRows: 0,
      unresolvedRows: 0,
    },
    bookIdFixes: [],
    categoryFixes: [],
    unresolvedItems: [],
  };

  // --- Pass 1: book_items bookId mismatch ---
  const itemRows = readBookItemRows_();
  const bookIdCol = BOOK_ITEM_SCHEMA.COLUMNS.indexOf("bookId") + 1;
  audit.summary.scannedBookItems = itemRows.length;

  itemRows.forEach(function (row, index) {
    const rowNumber = index + 2;
    const barcode = String(row.barcode || "").trim();
    const currentBookId = String(row.bookId || "").trim();
    const expectedBookId = inferBookIdFromBarcode_(barcode);

    if (!expectedBookId) {
      if (currentBookId && !catalogBookIdSet[currentBookId]) {
        audit.summary.unresolvedRows += 1;
        audit.unresolvedItems.push({
          type: "book_item",
          rowNumber: rowNumber,
          barcode: barcode,
          currentBookId: currentBookId,
          reason: "barcode_unparsable_and_bookId_not_in_catalog",
        });
      }
      return;
    }

    if (!catalogBookIdSet[expectedBookId]) {
      audit.summary.unresolvedRows += 1;
      audit.unresolvedItems.push({
        type: "book_item",
        rowNumber: rowNumber,
        barcode: barcode,
        currentBookId: currentBookId,
        expectedBookId: expectedBookId,
        reason: "expected_bookId_not_found_in_catalog",
      });
      return;
    }

    if (currentBookId === expectedBookId) return;

    audit.summary.mismatchedBookItems += 1;
    const fixInfo = {
      rowNumber: rowNumber,
      barcode: barcode,
      fromBookId: currentBookId,
      toBookId: expectedBookId,
      source: "barcode_prefix",
    };
    audit.bookIdFixes.push(fixInfo);

    if (repair) {
      bookItemsSheet.getRange(rowNumber, bookIdCol).setValue(expectedBookId);
      audit.summary.fixedBookItems += 1;
    }
  });

  // --- Pass 2: category เติมค่า default "ทั่วไป" ---
  const categoryCol = BOOK_CATALOG_SCHEMA.COLUMNS.indexOf("category") + 1;

  repairCatalogCategories_(activeCatalogRows, activeCatalogSheet, "active", categoryCol, repair, audit);
  repairCatalogCategories_(archivedCatalogRows, archivedCatalogSheet, "archived", categoryCol, repair, audit);

  if (repair && (audit.summary.fixedBookItems > 0 || audit.summary.fixedCategoryRows > 0)) {
    bumpBooksCacheVersion_();
  }

  return audit;
}

function repairCatalogCategories_(rows, sheet, sheetMode, categoryCol, repair, audit) {
  (rows || []).forEach(function (row, index) {
    const rowNumber = index + 2;
    const category = String(row.category || "").trim();
    if (category) return;

    audit.summary.missingCategoryRows += 1;
    const fix = {
      sheet: sheetMode,
      rowNumber: rowNumber,
      bookId: String(row.bookId || ""),
      fromCategory: category,
      toCategory: "ทั่วไป",
    };
    audit.categoryFixes.push(fix);

    if (repair) {
      sheet.getRange(rowNumber, categoryCol).setValue("ทั่วไป");
      audit.summary.fixedCategoryRows += 1;
    }
  });
}

function buildBookIdSet_(catalogRows) {
  const map = {};
  (catalogRows || []).forEach(function (row) {
    const bookId = String(row.bookId || "").trim();
    if (!bookId) return;
    map[bookId] = true;
  });
  return map;
}

function inferBookIdFromBarcode_(barcode) {
  const raw = String(barcode || "").trim();
  const match = raw.match(/^(BK-\d+)-\d+$/i);
  if (!match) return "";
  return String(match[1] || "").toUpperCase();
}

/**
 * Run helper for Apps Script editor:
 * - First audit and log summary
 * - Then repair and log summary
 */
function runBooksRepairOnce_() {
  const systemAuth = { user: { uid: "SYSTEM" } };
  const auditOnly = booksDataRepair_({ auth: systemAuth, mode: "audit" });
  Logger.log("[BooksRepair][AUDIT] %s", JSON.stringify(auditOnly.summary));
  Logger.log("[BooksRepair][AUDIT][UNRESOLVED] %s", JSON.stringify(auditOnly.unresolvedItems));

  const repaired = booksDataRepair_({ auth: systemAuth, mode: "repair" });
  Logger.log("[BooksRepair][REPAIR] %s", JSON.stringify(repaired.summary));
  Logger.log("[BooksRepair][REPAIR][UNRESOLVED] %s", JSON.stringify(repaired.unresolvedItems));
  return repaired;
}
