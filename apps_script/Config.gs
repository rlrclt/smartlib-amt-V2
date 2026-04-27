/**
 * Config.gs - Global Configuration
 * (เจ้าของโปรเจกต์แก้ไข ID ของ Spreadsheet ที่นี่ที่เดียว)
 */

const SPREADSHEET_ID = "1uaIdRHGge04aFx_OxZJToDfZIaZQYrbAYvTE7U5302A";

// ชื่อชีตต่างๆ
const SHEETS = {
  USERS: "users",
  ANNOUNCEMENTS: "announcements",
  BOOKS_CATALOG: "books_catalog",
  BOOKS_CATALOG_ARCHIVE: "books_catalog_archive",
  BOOK_ITEMS: "book_items",
  LOANS: "loans",
  FINES: "fines",
  RESERVATIONS: "reservations",
  NOTIFICATIONS: "notifications",
  SETTINGS_LOCATIONS: "settings_locations",
  SETTINGS_POLICIES: "settings_policies",
  LIBRARY_VISITS: "library_visits",
  SETTINGS_LIBRARY_HOURS: "settings_library_hours",
  SETTINGS_LIBRARY_EXCEPTIONS: "settings_library_exceptions",
  SETTINGS: "settings"
};

/**
 * CONFIG - Centralized Policy & Settings Constants
 */
const CONFIG = {
  LOAN_DAYS: {
    student: 7,
    teacher: 15,
    staff: 15,
    external: 3,
    admin: 30,
    librarian: 30,
  },
  QUOTA: {
    student: 3,
    teacher: 10,
    staff: 5,
    external: 2,
    admin: 20,
    librarian: 20,
  },
  DRIVE: {
    PROFILE_PHOTO_FOLDER: "1fkyLfDgzOKquLYQJv_K3Qd_XmqnUNifK",
    BOOK_COVER_FOLDER: "10Q8t2WQ6CtCgMG-jIU3RJF1Uxa8Sge-z"
  },
  // Default fallbacks (ในกรณีที่ยังไม่ได้ดึงจาก Sheet)
  FINE_RATE_DEFAULT: 5,
  FINE_BUFFER_DAYS_DEFAULT: 0
};
