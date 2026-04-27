/**
 * Setup.gs - เครื่องมือสำหรับ Admin และการตั้งค่าเริ่มต้น (Initialization)
 * ⚠️ รันเพียงครั้งเดียวเมื่อเริ่มโปรเจกต์ หรือต้องการ Reset หัวตาราง
 */

function setupDatabase() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Setup ชีต USERS (ใช้ Schema จาก Module_Users.gs)
  let sheetUsers = ss.getSheetByName(USER_SCHEMA.SHEET_NAME);
  if (!sheetUsers) {
    sheetUsers = ss.insertSheet(USER_SCHEMA.SHEET_NAME);
    Logger.log("สร้างชีต " + USER_SCHEMA.SHEET_NAME + " เรียบร้อยแล้ว");
  }

  // เซตหัวตาราง (แถวที่ 1) ตามคอลัมน์ใน USER_SCHEMA
  sheetUsers.getRange(1, 1, 1, USER_SCHEMA.COLUMNS.length).setValues([USER_SCHEMA.COLUMNS]);
  
  // --- ตกแต่งความสวยงามขั้นสูง ---
  
  // 1. ตั้งค่าความสูงของแถวหัวตาราง (ให้ดูโปร่ง ไม่จม)
  sheetUsers.setRowHeight(1, 35);
  
  // 2. ปรับแต่ง Range หัวตาราง
  const headerRange = sheetUsers.getRange(1, 1, 1, USER_SCHEMA.COLUMNS.length);
  headerRange
    .setBackground("#f3f3f3")          // สีพื้นหลังเทาอ่อน
    .setFontColor("#333333")           // สีตัวอักษรเทาเข้ม
    .setFontWeight("bold")             // ตัวหนา
    .setHorizontalAlignment("center")  // จัดกึ่งกลางแนวนอน
    .setVerticalAlignment("middle")    // จัดกึ่งกลางแนวตั้ง (แก้ปัญหาข้อความจม)
    .setFontFamily("Sarabun")          // ฟอนต์มาตรฐานที่อ่านง่าย
    .setBorder(true, true, true, true, true, true, "#cccccc", SpreadsheetApp.BorderStyle.SOLID);
    
  // 3. ตรึงแถวบนสุด
  sheetUsers.setFrozenRows(1);
  
  // 4. ปรับความกว้างคอลัมน์อัตโนมัติ (เพื่อให้หัวข้อไม่เบียดกัน)
  sheetUsers.autoResizeColumns(1, USER_SCHEMA.COLUMNS.length);
  
  // 5. (แถม) ตั้งค่าพื้นฐานสำหรับแถวข้อมูลในอนาคต (ให้กึ่งกลางแนวตั้งทุกแถว)
  const maxRows = sheetUsers.getMaxRows();
  if (maxRows > 1) {
    sheetUsers.getRange(2, 1, maxRows - 1, USER_SCHEMA.COLUMNS.length)
      .setVerticalAlignment("middle")
      .setFontFamily("Sarabun");
  }

  Logger.log("Setup หัวตาราง " + USER_SCHEMA.SHEET_NAME + " พร้อมการตกแต่งสำเร็จ!");

  // Setup ชีต ANNOUNCEMENTS
  setupAnnouncementsTable(ss);

  // Setup ระบบหนังสือ (Catalog & Items)
  setupBooksTable(ss);

  // Setup ระบบตั้งค่าพิกัดพื้นที่อนุญาต
  setupSettingsLocationsTable(ss);

  // Setup ระบบยืม-คืน / ค่าปรับ / นโยบาย
  setupLoanFinePolicyTables(ss);

  // Setup ระบบการจอง
  setupReservationsTable(ss);

  // Setup ระบบแจ้งเตือน
  setupNotificationsTable(ss);

  // Setup ตารางตั้งค่า key/value พื้นฐาน (ใช้ร่วมกับ fine + runtime อื่นๆ)
  setupSettingsKvTable(ss);

  // Setup ระบบบันทึกการเข้าใช้ห้องสมุด + เวลาทำการ
  setupLibraryVisitTables(ss);

  // Authorize/verify Drive access for profile photo uploads.
  setupProfilePhotoDriveAccess();

  return "Setup Complete with Styling";
}

function setupProfilePhotoDriveAccess() {
  const folderId = getProfilePhotoFolderId_();
  if (!folderId) {
    Logger.log("ข้ามการตรวจ Drive: ยังไม่ได้ตั้งค่าโฟลเดอร์รูปโปรไฟล์");
    return { ok: false, skipped: true, reason: "missing PROFILE_PHOTO_FOLDER_ID" };
  }

  const folder = DriveApp.getFolderById(folderId);
  Logger.log("ตรวจสิทธิ์ Drive สำหรับรูปโปรไฟล์สำเร็จ: " + folder.getName());
  return {
    ok: true,
    folderId: folderId,
    folderName: folder.getName()
  };
}

/**
 * ฟังก์ชันเฉพาะสำหรับ Setup ตารางการจองหนังสือ
 */
function setupReservationsTable(ss) {
  if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  let sheet = ss.getSheetByName(RESERVATION_SCHEMA.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(RESERVATION_SCHEMA.SHEET_NAME);
    Logger.log("สร้างชีต " + RESERVATION_SCHEMA.SHEET_NAME + " เรียบร้อยแล้ว");
  }

  sheet.getRange(1, 1, 1, RESERVATION_SCHEMA.COLUMNS.length).setValues([RESERVATION_SCHEMA.COLUMNS]);
  sheet.setRowHeight(1, 35);
  sheet.getRange(1, 1, 1, RESERVATION_SCHEMA.COLUMNS.length)
    .setBackground("#fef9c3")
    .setFontColor("#854d0e")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setFontFamily("Sarabun")
    .setBorder(true, true, true, true, true, true, "#fde047", SpreadsheetApp.BorderStyle.SOLID);

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, RESERVATION_SCHEMA.COLUMNS.length);
}

  /**
  * ฟังก์ชันเฉพาะสำหรับ Setup ตารางหนังสือ (Catalog และ Items)
  */
  function setupBooksTable(ss) {
  if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // 1. Setup ชีต CATALOG (รหัสแม่)
  let sheetCatalog = ss.getSheetByName(BOOK_CATALOG_SCHEMA.SHEET_NAME);
  if (!sheetCatalog) sheetCatalog = ss.insertSheet(BOOK_CATALOG_SCHEMA.SHEET_NAME);

  sheetCatalog.getRange(1, 1, 1, BOOK_CATALOG_SCHEMA.COLUMNS.length).setValues([BOOK_CATALOG_SCHEMA.COLUMNS]);
  sheetCatalog.setRowHeight(1, 35);
  sheetCatalog.getRange(1, 1, 1, BOOK_CATALOG_SCHEMA.COLUMNS.length)
    .setBackground("#e0f2fe") // สีฟ้าอ่อน
    .setFontColor("#0369a1") // สีน้ำเงินเข้ม
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setFontFamily("Sarabun")
    .setBorder(true, true, true, true, true, true, "#7dd3fc", SpreadsheetApp.BorderStyle.SOLID);
  sheetCatalog.setFrozenRows(1);
  sheetCatalog.autoResizeColumns(1, BOOK_CATALOG_SCHEMA.COLUMNS.length);

  // 1.1 Setup ชีต CATALOG ARCHIVE (สำหรับเก็บเล่มที่เลิกใช้)
  let sheetCatalogArchive = ss.getSheetByName(SHEETS.BOOKS_CATALOG_ARCHIVE);
  if (!sheetCatalogArchive) sheetCatalogArchive = ss.insertSheet(SHEETS.BOOKS_CATALOG_ARCHIVE);
  sheetCatalogArchive.getRange(1, 1, 1, BOOK_CATALOG_SCHEMA.COLUMNS.length).setValues([BOOK_CATALOG_SCHEMA.COLUMNS]);
  sheetCatalogArchive.setRowHeight(1, 35);
  sheetCatalogArchive.getRange(1, 1, 1, BOOK_CATALOG_SCHEMA.COLUMNS.length).setBackground("#f3f4f6").setFontWeight("bold");

  // 2. Setup ชีต ITEMS (รหัสลูก)
  let sheetItems = ss.getSheetByName(BOOK_ITEM_SCHEMA.SHEET_NAME);
  if (!sheetItems) sheetItems = ss.insertSheet(BOOK_ITEM_SCHEMA.SHEET_NAME);

  sheetItems.getRange(1, 1, 1, BOOK_ITEM_SCHEMA.COLUMNS.length).setValues([BOOK_ITEM_SCHEMA.COLUMNS]);
  sheetItems.setRowHeight(1, 35);
  sheetItems.getRange(1, 1, 1, BOOK_ITEM_SCHEMA.COLUMNS.length)
    .setBackground("#f0fdf4") // สีเขียวอ่อน
    .setFontColor("#15803d") // สีเขียวเข้ม
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setFontFamily("Sarabun")
    .setBorder(true, true, true, true, true, true, "#86efac", SpreadsheetApp.BorderStyle.SOLID);
  sheetItems.setFrozenRows(1);
  sheetItems.autoResizeColumns(1, BOOK_ITEM_SCHEMA.COLUMNS.length);

  Logger.log("Setup ระบบหนังสือสำเร็จ (Catalog & Items)");
  }
/**
 * ฟังก์ชันเฉพาะสำหรับ Setup ตารางประกาศ
 */
function setupAnnouncementsTable(ss) {
  // ถ้าไม่มีการส่ง ss มา (เช่น รันฟังก์ชันนี้โดยตรง) ให้เปิดเอง
  if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  let sheet = ss.getSheetByName(ANNOUNCEMENT_SCHEMA.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(ANNOUNCEMENT_SCHEMA.SHEET_NAME);
    Logger.log("สร้างชีต " + ANNOUNCEMENT_SCHEMA.SHEET_NAME + " เรียบร้อยแล้ว");
  }

  // เซตหัวตาราง
  sheet.getRange(1, 1, 1, ANNOUNCEMENT_SCHEMA.COLUMNS.length).setValues([ANNOUNCEMENT_SCHEMA.COLUMNS]);

  // ตกแต่ง
  sheet.setRowHeight(1, 35);
  const headerRange = sheet.getRange(1, 1, 1, ANNOUNCEMENT_SCHEMA.COLUMNS.length);
  headerRange
    .setBackground("#fff7ed")          // สีส้มอ่อน (Theme Quest Board)
    .setFontColor("#7c2d12")           // สีน้ำตาลเข้ม
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setFontFamily("Sarabun")
    .setBorder(true, true, true, true, true, true, "#fdba74", SpreadsheetApp.BorderStyle.SOLID);

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, ANNOUNCEMENT_SCHEMA.COLUMNS.length);

  const maxRows = sheet.getMaxRows();
  if (maxRows > 1) {
    sheet.getRange(2, 1, maxRows - 1, ANNOUNCEMENT_SCHEMA.COLUMNS.length)
      .setVerticalAlignment("middle")
      .setFontFamily("Sarabun");
  }
  Logger.log("Setup หัวตาราง " + ANNOUNCEMENT_SCHEMA.SHEET_NAME + " สำเร็จ!");
}

/**
 * ฟังก์ชันเฉพาะสำหรับ Setup ตารางตั้งค่าพิกัดพื้นที่อนุญาต
 */
function setupSettingsLocationsTable(ss) {
  if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  let sheet = ss.getSheetByName(SETTINGS_LOCATION_SCHEMA.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SETTINGS_LOCATION_SCHEMA.SHEET_NAME);
    Logger.log("สร้างชีต " + SETTINGS_LOCATION_SCHEMA.SHEET_NAME + " เรียบร้อยแล้ว");
  }

  sheet.getRange(1, 1, 1, SETTINGS_LOCATION_SCHEMA.COLUMNS.length).setValues([SETTINGS_LOCATION_SCHEMA.COLUMNS]);
  sheet.setRowHeight(1, 35);
  sheet.getRange(1, 1, 1, SETTINGS_LOCATION_SCHEMA.COLUMNS.length)
    .setBackground("#e0f2fe")
    .setFontColor("#0369a1")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setFontFamily("Sarabun")
    .setBorder(true, true, true, true, true, true, "#7dd3fc", SpreadsheetApp.BorderStyle.SOLID);

  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, SETTINGS_LOCATION_SCHEMA.COLUMNS.length);
  Logger.log("Setup หัวตาราง " + SETTINGS_LOCATION_SCHEMA.SHEET_NAME + " สำเร็จ!");
}

function setupLoanFinePolicyTables(ss) {
  if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  let loansSheet = ss.getSheetByName(LOAN_V2_SCHEMA.SHEET_NAME);
  if (!loansSheet) loansSheet = ss.insertSheet(LOAN_V2_SCHEMA.SHEET_NAME);
  loansSheet.getRange(1, 1, 1, LOAN_V2_SCHEMA.COLUMNS.length).setValues([LOAN_V2_SCHEMA.COLUMNS]);
  loansSheet.setRowHeight(1, 35);
  loansSheet.getRange(1, 1, 1, LOAN_V2_SCHEMA.COLUMNS.length)
    .setBackground("#e0f2fe")
    .setFontColor("#075985")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setFontFamily("Sarabun")
    .setBorder(true, true, true, true, true, true, "#7dd3fc", SpreadsheetApp.BorderStyle.SOLID);
  loansSheet.setFrozenRows(1);
  loansSheet.autoResizeColumns(1, LOAN_V2_SCHEMA.COLUMNS.length);

  let finesSheet = ss.getSheetByName(FINE_V2_SCHEMA.SHEET_NAME);
  if (!finesSheet) finesSheet = ss.insertSheet(FINE_V2_SCHEMA.SHEET_NAME);
  finesSheet.getRange(1, 1, 1, FINE_V2_SCHEMA.COLUMNS.length).setValues([FINE_V2_SCHEMA.COLUMNS]);
  finesSheet.setRowHeight(1, 35);
  finesSheet.getRange(1, 1, 1, FINE_V2_SCHEMA.COLUMNS.length)
    .setBackground("#fff7ed")
    .setFontColor("#9a3412")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setFontFamily("Sarabun")
    .setBorder(true, true, true, true, true, true, "#fdba74", SpreadsheetApp.BorderStyle.SOLID);
  finesSheet.setFrozenRows(1);
  finesSheet.autoResizeColumns(1, FINE_V2_SCHEMA.COLUMNS.length);

  let policySheet = ss.getSheetByName(POLICY_V2_SCHEMA.SHEET_NAME);
  if (!policySheet) policySheet = ss.insertSheet(POLICY_V2_SCHEMA.SHEET_NAME);
  policySheet.getRange(1, 1, 1, POLICY_V2_SCHEMA.COLUMNS.length).setValues([POLICY_V2_SCHEMA.COLUMNS]);
  policySheet.setRowHeight(1, 35);
  policySheet.getRange(1, 1, 1, POLICY_V2_SCHEMA.COLUMNS.length)
    .setBackground("#f0fdf4")
    .setFontColor("#166534")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setFontFamily("Sarabun")
    .setBorder(true, true, true, true, true, true, "#86efac", SpreadsheetApp.BorderStyle.SOLID);
  policySheet.setFrozenRows(1);
  policySheet.autoResizeColumns(1, POLICY_V2_SCHEMA.COLUMNS.length);

  if (policySheet.getLastRow() < 2) {
    const now = new Date().toISOString();
    const rows = Object.keys(DEFAULT_LOAN_POLICIES).map(function (role) {
      const cfg = DEFAULT_LOAN_POLICIES[role];
      return [
        role,
        cfg.loanQuota,
        cfg.loanDays,
        cfg.canRenew,
        cfg.renewLimit,
        cfg.resQuota,
        cfg.holdDays,
        now
      ];
    });
    policySheet.getRange(2, 1, rows.length, POLICY_V2_SCHEMA.COLUMNS.length).setValues(rows);
  }

  Logger.log("Setup ตาราง Loans/Fines/Policies สำเร็จ!");
}

function setupNotificationsTable(ss) {
  if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  let sheet = ss.getSheetByName(NOTIFICATION_SCHEMA.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(NOTIFICATION_SCHEMA.SHEET_NAME);
  sheet.getRange(1, 1, 1, NOTIFICATION_SCHEMA.COLUMNS.length).setValues([NOTIFICATION_SCHEMA.COLUMNS]);
  sheet.setRowHeight(1, 35);
  sheet.getRange(1, 1, 1, NOTIFICATION_SCHEMA.COLUMNS.length)
    .setBackground("#eef2ff")
    .setFontColor("#3730a3")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setFontFamily("Sarabun")
    .setBorder(true, true, true, true, true, true, "#c7d2fe", SpreadsheetApp.BorderStyle.SOLID);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, NOTIFICATION_SCHEMA.COLUMNS.length);
}

function setupSettingsKvTable(ss) {
  if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const columns = ["key", "value", "updatedAt", "updatedBy"];

  let sheet = ss.getSheetByName((typeof SHEETS !== "undefined" && SHEETS.SETTINGS) || "settings");
  if (!sheet) sheet = ss.insertSheet((typeof SHEETS !== "undefined" && SHEETS.SETTINGS) || "settings");
  sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
  sheet.setRowHeight(1, 35);
  sheet.getRange(1, 1, 1, columns.length)
    .setBackground("#f8fafc")
    .setFontColor("#334155")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setFontFamily("Sarabun")
    .setBorder(true, true, true, true, true, true, "#cbd5e1", SpreadsheetApp.BorderStyle.SOLID);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, columns.length);
}

function setupLibraryVisitTables(ss) {
  if (!ss) ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  const visitColumns = ["visitId", "uid", "checkInAt", "checkOutAt", "activities", "status", "notes", "locationId"];
  let visitSheet = ss.getSheetByName((typeof SHEETS !== "undefined" && SHEETS.LIBRARY_VISITS) || "library_visits");
  if (!visitSheet) visitSheet = ss.insertSheet((typeof SHEETS !== "undefined" && SHEETS.LIBRARY_VISITS) || "library_visits");
  visitSheet.getRange(1, 1, 1, visitColumns.length).setValues([visitColumns]);
  visitSheet.setRowHeight(1, 35);
  visitSheet.getRange(1, 1, 1, visitColumns.length)
    .setBackground("#ecfeff")
    .setFontColor("#0f766e")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setFontFamily("Sarabun")
    .setBorder(true, true, true, true, true, true, "#67e8f9", SpreadsheetApp.BorderStyle.SOLID);
  visitSheet.setFrozenRows(1);
  visitSheet.autoResizeColumns(1, visitColumns.length);

  const hoursColumns = ["dayOfWeek", "openTime", "closeTime", "isOpen"];
  let hourSheet = ss.getSheetByName((typeof SHEETS !== "undefined" && SHEETS.SETTINGS_LIBRARY_HOURS) || "settings_library_hours");
  if (!hourSheet) hourSheet = ss.insertSheet((typeof SHEETS !== "undefined" && SHEETS.SETTINGS_LIBRARY_HOURS) || "settings_library_hours");
  hourSheet.getRange(1, 1, 1, hoursColumns.length).setValues([hoursColumns]);
  hourSheet.setRowHeight(1, 35);
  hourSheet.getRange(1, 1, 1, hoursColumns.length)
    .setBackground("#eff6ff")
    .setFontColor("#1d4ed8")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setFontFamily("Sarabun")
    .setBorder(true, true, true, true, true, true, "#93c5fd", SpreadsheetApp.BorderStyle.SOLID);
  hourSheet.setFrozenRows(1);
  hourSheet.autoResizeColumns(1, hoursColumns.length);

  if (hourSheet.getLastRow() < 2) {
    const defaults = [
      [0, "08:30", "16:30", false],
      [1, "08:30", "16:30", true],
      [2, "08:30", "16:30", true],
      [3, "08:30", "16:30", true],
      [4, "08:30", "16:30", true],
      [5, "08:30", "16:30", true],
      [6, "08:30", "16:30", false],
    ];
    hourSheet.getRange(2, 1, defaults.length, hoursColumns.length).setValues(defaults);
  }

  const excColumns = ["date", "newOpenTime", "newCloseTime", "reason"];
  let excSheet = ss.getSheetByName((typeof SHEETS !== "undefined" && SHEETS.SETTINGS_LIBRARY_EXCEPTIONS) || "settings_library_exceptions");
  if (!excSheet) excSheet = ss.insertSheet((typeof SHEETS !== "undefined" && SHEETS.SETTINGS_LIBRARY_EXCEPTIONS) || "settings_library_exceptions");
  excSheet.getRange(1, 1, 1, excColumns.length).setValues([excColumns]);
  excSheet.setRowHeight(1, 35);
  excSheet.getRange(1, 1, 1, excColumns.length)
    .setBackground("#fff7ed")
    .setFontColor("#9a3412")
    .setFontWeight("bold")
    .setHorizontalAlignment("center")
    .setVerticalAlignment("middle")
    .setFontFamily("Sarabun")
    .setBorder(true, true, true, true, true, true, "#fdba74", SpreadsheetApp.BorderStyle.SOLID);
  excSheet.setFrozenRows(1);
  excSheet.autoResizeColumns(1, excColumns.length);
}

