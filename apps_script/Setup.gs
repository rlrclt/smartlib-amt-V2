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

  return "Setup Complete with Styling";
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

