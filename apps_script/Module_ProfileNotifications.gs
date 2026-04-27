/**
 * Module_ProfileNotifications.gs
 * Profile self-service + notification center (polling friendly)
 */

const NOTIFICATION_SCHEMA = {
  SHEET_NAME: (typeof SHEETS !== "undefined" && SHEETS.NOTIFICATIONS) || "notifications",
  COLUMNS: [
    "notiId",
    "uid",
    "title",
    "message",
    "type",
    "isRead",
    "link",
    "createdAt",
    "senderUid",
    "updatedAt",
    "expiresAt"
  ]
};

const NOTIFICATION_TYPES = ["system", "loan", "fine", "reservation"];
const NOTIFICATION_KEEP_DAYS = 90;
const NOTIFICATION_INBOX_LIMIT = 30;

function profileGet_(payload) {
  const actor = assertProfileActor_(payload && payload.auth);
  const user = actor.user;
  return {
    profile: profilePublic_(user),
    stats: {
      activeLoans: countActiveLoansByUid_(actor.uid),
      unpaidFineTotal: sumUnpaidFineByUid_(actor.uid)
    }
  };
}

function profileUpdateContact_(payload) {
  const actor = assertProfileActor_(payload && payload.auth);
  const current = actor.user;
  const merged = {};
  USER_SCHEMA.COLUMNS.forEach(function (col) {
    merged[col] = current[col];
  });

  const phone = String(payload && payload.phone !== undefined ? payload.phone : current.phone || "").replace(/\D/g, "");
  if (phone && !/^\d{10}$/.test(phone)) {
    throw new Error("เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก");
  }

  merged.phone = phone;
  merged.address = String(payload && payload.address !== undefined ? payload.address : current.address || "").trim();
  merged.lineId = String(payload && payload.lineId !== undefined ? payload.lineId : current.lineId || "").trim();
  if (payload && payload.photoURL !== undefined) {
    merged.photoURL = String(payload.photoURL || "").trim();
  }
  merged.updatedAt = new Date().toISOString();
  merged.notes = buildAdminNote_(current.notes, "แก้ไขข้อมูลส่วนตัวโดย " + actor.uid);

  writeUserObjectRow_(getUsersSheet_(), actor.rowNumber, merged);
  return { profile: profilePublic_(merged) };
}

function profileChangePassword_(payload) {
  const actor = assertProfileActor_(payload && payload.auth);
  const current = actor.user;
  const oldPassword = String(payload && payload.oldPassword || "");
  const newPassword = String(payload && payload.newPassword || "");
  const confirmPassword = String(payload && payload.confirmPassword || "");

  if (!oldPassword || !newPassword || !confirmPassword) {
    throw new Error("กรุณากรอกรหัสผ่านให้ครบ");
  }
  if (newPassword.length < 8) {
    throw new Error("รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร");
  }
  if (newPassword !== confirmPassword) {
    throw new Error("รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน");
  }
  if (hashPassword(oldPassword) !== String(current.password || "")) {
    throw new Error("รหัสผ่านเดิมไม่ถูกต้อง");
  }

  const updated = {};
  USER_SCHEMA.COLUMNS.forEach(function (col) {
    updated[col] = current[col];
  });
  updated.password = hashPassword(newPassword);
  updated.updatedAt = new Date().toISOString();
  updated.notes = buildAdminNote_(current.notes, "เปลี่ยนรหัสผ่านโดย " + actor.uid);
  writeUserObjectRow_(getUsersSheet_(), actor.rowNumber, updated);
  return { ok: true };
}

function profileUploadPhoto_(payload) {
  const actor = assertProfileActor_(payload && payload.auth);
  const authUid = String(payload && payload.auth && payload.auth.uid || "").trim();
  if (authUid && authUid !== actor.uid) throw new Error("401: INVALID_TOKEN");
  const mimeType = String(payload && payload.mimeType || "").trim().toLowerCase();
  const data = String(payload && payload.base64Data || "").trim();
  const fileName = String(payload && payload.fileName || "").trim();
  const allowed = {
    "image/jpeg": true,
    "image/png": true,
    "image/webp": true
  };

  if (!allowed[mimeType]) throw new Error("รองรับเฉพาะไฟล์ JPEG, PNG, WEBP");
  if (!data) throw new Error("ไม่พบข้อมูลไฟล์รูปภาพ");

  const bytes = Utilities.base64Decode(data);
  if (bytes.length > 2 * 1024 * 1024) throw new Error("ขนาดไฟล์ต้องไม่เกิน 2MB");

  const folderId = getProfilePhotoFolderId_();
  if (!folderId) throw new Error("ยังไม่ได้ตั้งค่าโฟลเดอร์รูปโปรไฟล์");
  const safeUid = sanitizeDriveQueryToken_(actor.uid);
  if (!safeUid) throw new Error("401: INVALID_TOKEN");

  const ext = mimeType === "image/png" ? "png" : (mimeType === "image/webp" ? "webp" : "jpg");
  const safeName = safeUid + "_" + Date.now() + (fileName ? "_" + fileName.replace(/[^\w.\-]/g, "") : "") + "." + ext;
  const blob = Utilities.newBlob(bytes, mimeType, safeName);
  const uploaded = driveUploadFile_(folderId, blob, actor.uid);
  const file = uploaded.file;
  const folder = uploaded.folder;
  const url = uploaded.url;

  const merged = {};
  USER_SCHEMA.COLUMNS.forEach(function (col) {
    merged[col] = actor.user[col];
  });
  merged.photoURL = url;
  merged.updatedAt = new Date().toISOString();
  merged.notes = buildAdminNote_(actor.user.notes, "อัปเดตรูปโปรไฟล์โดย " + actor.uid);
  try {
    writeUserObjectRow_(getUsersSheet_(), actor.rowNumber, merged);
  } catch (err) {
    try {
      file.setTrashed(true);
    } catch (cleanupErr) {
      // ignore cleanup failure; keep original write error flow
    }
    throw new Error("บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่");
  }

  // Cleanup old files for the same uid after sheet write succeeds.
  // Wrapped in try-catch: cleanup is non-critical; Drive search failure must not
  // cause the response to return an error after the sheet has already been updated.
  try {
    const query = "title contains '" + safeUid + "_'";
    const oldFiles = folder.searchFiles(query);
    while (oldFiles.hasNext()) {
      const oldFile = oldFiles.next();
      if (String(oldFile.getId()) !== String(file.getId())) {
        oldFile.setTrashed(true);
      }
    }
  } catch (cleanupErr) {
    Logger.log("cleanup old profile photos failed (non-critical): " + cleanupErr.message);
  }

  return { ok: true, photoURL: url, fileId: file.getId() };
}

function profileDeletePhoto_(payload) {
  const actor = assertProfileActor_(payload && payload.auth);
  const current = actor.user;
  const currentUrl = String(current.photoURL || "").trim();
  const defaultAvatar = "/assets/img/default-avatar.svg";

  // ถ้าไม่มีรูปอยู่แล้ว หรือเป็น default อยู่แล้ว
  if (!currentUrl || currentUrl === defaultAvatar) {
    return { ok: true, photoURL: defaultAvatar };
  }

  // ลบรูปเก่าจาก Drive (ถ้ามี)
  var folderId = "";
  try { folderId = getProfilePhotoFolderId_(); } catch (e) { /* ignore */ }
  if (folderId) {
    var safeUid = sanitizeDriveQueryToken_(actor.uid);
    if (safeUid) {
      try {
        var folder = DriveApp.getFolderById(folderId);
        var query = "title contains '" + safeUid + "_'";
        var files = folder.searchFiles(query);
        while (files.hasNext()) {
          files.next().setTrashed(true);
        }
      } catch (driveErr) {
        Logger.log("profileDeletePhoto_ drive cleanup failed: " + driveErr.message);
      }
    }
  }

  // อัปเดต Sheet ให้ photoURL เป็น default
  var merged = {};
  USER_SCHEMA.COLUMNS.forEach(function (col) {
    merged[col] = current[col];
  });
  merged.photoURL = defaultAvatar;
  merged.updatedAt = new Date().toISOString();
  merged.notes = buildAdminNote_(current.notes, "ลบรูปโปรไฟล์โดย " + actor.uid);
  writeUserObjectRow_(getUsersSheet_(), actor.rowNumber, merged);

  return { ok: true, photoURL: defaultAvatar, profile: profilePublic_(merged) };
}

function notificationsList_(payload) {
  const actor = assertProfileActor_(payload && payload.auth);
  const unreadOnly = String(payload && payload.unreadOnly || "").toLowerCase() === "true";
  const limit = normalizeUsersInt_(payload && payload.limit, NOTIFICATION_INBOX_LIMIT, 100);
  var rows = readNotificationRowsByUid_(actor.uid)
    .map(function (entry) {
      return formatNotification_(entry.rowData);
    });

  if (unreadOnly) {
    rows = rows.filter(function (row) { return !row.isRead; });
  }

  rows.sort(function (a, b) {
    return safeUserDateMs_(b.createdAt) - safeUserDateMs_(a.createdAt);
  });

  return {
    items: rows.slice(0, limit),
    total: rows.length
  };
}

function notificationsUnreadCount_(payload) {
  const actor = assertProfileActor_(payload && payload.auth);
  const count = readNotificationRowsByUid_(actor.uid).reduce(function (sum, entry) {
    return toBooleanStrict_(entry.rowData.isRead) ? sum : sum + 1;
  }, 0);
  return { count: count };
}

function notificationsMarkRead_(payload) {
  const actor = assertProfileActor_(payload && payload.auth);
  const notiId = String(payload && payload.notiId || "").trim();
  if (!notiId) throw new Error("กรุณาระบุ notiId");

  const found = findNotificationById_(notiId);
  if (!found || !found.rowData) throw new Error("ไม่พบการแจ้งเตือน");
  if (String(found.rowData.uid || "") !== actor.uid) throw new Error("403: FORBIDDEN");

  const row = found.rowData;
  row.isRead = true;
  row.updatedAt = new Date().toISOString();
  writeObjectRow_(getNotificationsSheet_(), found.rowNumber, NOTIFICATION_SCHEMA.COLUMNS, row);
  return { ok: true };
}

function notificationsMarkAllRead_(payload) {
  const actor = assertProfileActor_(payload && payload.auth);
  const nowIso = new Date().toISOString();
  var changed = 0;
  readNotificationRowsByUid_(actor.uid).forEach(function (entry) {
    if (toBooleanStrict_(entry.rowData.isRead)) return;
    const row = entry.rowData;
    row.isRead = true;
    row.updatedAt = nowIso;
    writeObjectRow_(getNotificationsSheet_(), entry.rowNumber, NOTIFICATION_SCHEMA.COLUMNS, row);
    changed += 1;
  });
  return { ok: true, changed: changed };
}

function notificationsCleanup_(payload) {
  if (payload && payload.auth) {
    assertUsersAdmin_(payload.auth);
  }
  const now = new Date();
  const rows = readNotificationRowsWithRowNumber_();
  const targets = rows.filter(function (entry) {
    const row = entry.rowData;
    const isRead = toBooleanStrict_(row.isRead);
    const expires = new Date(String(row.expiresAt || ""));
    if (!isRead) return false;
    return Number.isFinite(expires.getTime()) && expires < now;
  });

  deleteSheetRowsDesc_(getNotificationsSheet_(), targets.map(function (t) { return t.rowNumber; }));
  return { ok: true, deleted: targets.length };
}

function createNotification_(payload) {
  const uid = String(payload && payload.uid || "").trim();
  const title = String(payload && payload.title || "").trim();
  const message = String(payload && payload.message || "").trim();
  const type = normalizeNotificationType_(payload && payload.type);
  const link = String(payload && payload.link || "").trim();
  const senderUid = String(payload && payload.senderUid || "SYSTEM").trim();
  const createdAt = String(payload && payload.createdAt || new Date().toISOString());
  if (!uid || !title || !message) return null;

  const created = new Date(createdAt);
  if (!Number.isFinite(created.getTime())) return null;
  const expiresAt = addDays_(created, NOTIFICATION_KEEP_DAYS).toISOString();

  const row = {
    notiId: "noti_" + Utilities.getUuid(),
    uid: uid,
    title: title,
    message: message,
    type: type,
    isRead: false,
    link: link,
    createdAt: createdAt,
    senderUid: senderUid,
    updatedAt: createdAt,
    expiresAt: expiresAt
  };
  appendObjectRow_(getNotificationsSheet_(), NOTIFICATION_SCHEMA.COLUMNS, row);
  enforceNotificationInboxLimit_(uid);
  return row;
}

function createNotificationForAllUsers_(payload) {
  const title = String(payload && payload.title || "").trim();
  const message = String(payload && payload.message || "").trim();
  if (!title || !message) return { created: 0 };
  const senderUid = String(payload && payload.senderUid || "SYSTEM").trim();
  const type = normalizeNotificationType_(payload && payload.type);
  const link = String(payload && payload.link || "").trim();

  const users = readUserRows_().map(function (entry) { return entry.user; }).filter(function (u) {
    return String(u.status || "").toLowerCase() === "active";
  });
  var created = 0;
  users.forEach(function (u) {
    const out = createNotification_({
      uid: String(u.uid || ""),
      title: title,
      message: message,
      type: type,
      link: link,
      senderUid: senderUid
    });
    if (out) created += 1;
  });
  return { created: created };
}

function profilePublic_(user) {
  return {
    uid: String(user.uid || ""),
    email: String(user.email || ""),
    displayName: String(user.displayName || ""),
    groupType: String(user.groupType || ""),
    role: String(user.role || ""),
    personnelType: String(user.personnelType || ""),
    idCode: String(user.idCode || ""),
    department: String(user.department || ""),
    level: String(user.level || ""),
    classRoom: String(user.classRoom || ""),
    organization: String(user.organization || ""),
    status: String(user.status || ""),
    phone: String(user.phone || ""),
    lineId: String(user.lineId || ""),
    address: String(user.address || ""),
    photoURL: String(user.photoURL || ""),
    isVerified: String(user.isVerified || ""),
    createdAt: String(user.createdAt || ""),
    updatedAt: String(user.updatedAt || "")
  };
}

function assertProfileActor_(auth) {
  const uidFromUser = String(auth && auth.user && auth.user.uid || "").trim();
  const uidFromRoot = String(auth && auth.uid || "").trim();
  if (uidFromUser && uidFromRoot && uidFromUser !== uidFromRoot) {
    throw new Error("401: INVALID_TOKEN");
  }
  const uid = uidFromUser || uidFromRoot;
  if (!uid) throw new Error("401: INVALID_TOKEN");
  const found = findUserByUid_(uid);
  if (!found || !found.user) throw new Error("401: INVALID_TOKEN");
  const user = found.user;
  if (String(user.status || "").toLowerCase() !== "active") {
    throw new Error("401: INVALID_TOKEN");
  }
  return {
    uid: String(user.uid || ""),
    user: user,
    rowNumber: found.rowNumber
  };
}

function getNotificationsSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(NOTIFICATION_SCHEMA.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(NOTIFICATION_SCHEMA.SHEET_NAME);
  ensureHeader_(sheet, NOTIFICATION_SCHEMA.COLUMNS);
  return sheet;
}

function readNotificationRowsWithRowNumber_() {
  return readRowsAsObjectsWithRowNumber_(getNotificationsSheet_(), NOTIFICATION_SCHEMA.COLUMNS);
}

function readNotificationRowsByUid_(uid) {
  const target = String(uid || "").trim();
  return readNotificationRowsWithRowNumber_().filter(function (entry) {
    return String(entry.rowData.uid || "") === target;
  });
}

function findNotificationById_(notiId) {
  return findRowByField_(getNotificationsSheet_(), NOTIFICATION_SCHEMA.COLUMNS, "notiId", notiId);
}

function formatNotification_(row) {
  return {
    notiId: String(row.notiId || ""),
    uid: String(row.uid || ""),
    title: String(row.title || ""),
    message: String(row.message || ""),
    type: normalizeNotificationType_(row.type),
    isRead: toBooleanStrict_(row.isRead),
    link: String(row.link || ""),
    createdAt: String(row.createdAt || ""),
    senderUid: String(row.senderUid || ""),
    updatedAt: String(row.updatedAt || ""),
    expiresAt: String(row.expiresAt || "")
  };
}

function normalizeNotificationType_(value) {
  const key = String(value || "system").trim().toLowerCase();
  return NOTIFICATION_TYPES.indexOf(key) >= 0 ? key : "system";
}

function toBooleanStrict_(value) {
  const key = String(value || "").trim().toLowerCase();
  return key === "true" || key === "1" || key === "yes";
}

function enforceNotificationInboxLimit_(uid) {
  const rows = readNotificationRowsByUid_(uid).sort(function (a, b) {
    return safeUserDateMs_(a.rowData.createdAt) - safeUserDateMs_(b.rowData.createdAt);
  });
  if (rows.length <= NOTIFICATION_INBOX_LIMIT) return;
  const overflow = rows.slice(0, rows.length - NOTIFICATION_INBOX_LIMIT);
  deleteSheetRowsDesc_(getNotificationsSheet_(), overflow.map(function (item) { return item.rowNumber; }));
}

function deleteSheetRowsDesc_(sheet, rowNumbers) {
  const rows = Array.isArray(rowNumbers) ? rowNumbers.slice() : [];
  rows.sort(function (a, b) { return b - a; });
  rows.forEach(function (rowNum) {
    if (Number.isFinite(rowNum) && rowNum >= 2) {
      sheet.deleteRow(rowNum);
    }
  });
}

function countActiveLoansByUid_(uid) {
  const target = String(uid || "");
  if (!target || typeof LOAN_V2_SCHEMA === "undefined") return 0;
  const rows = readRowsAsObjects_(getLoansSheet_(), LOAN_V2_SCHEMA.COLUMNS);
  return rows.reduce(function (count, row) {
    if (String(row.uid || "") !== target) return count;
    const status = String(row.status || "").toLowerCase();
    return status === "borrowing" || status === "overdue" ? count + 1 : count;
  }, 0);
}

function sumUnpaidFineByUid_(uid) {
  const target = String(uid || "");
  if (!target || typeof FINE_V2_SCHEMA === "undefined") return 0;
  const rows = readRowsAsObjects_(getFinesSheet_(), FINE_V2_SCHEMA.COLUMNS);
  return rows.reduce(function (sum, row) {
    if (String(row.uid || "") !== target) return sum;
    if (String(row.status || "").toLowerCase() !== "unpaid") return sum;
    return sum + toMoney_(row.amount, 0);
  }, 0);
}

function getProfilePhotoFolderId_() {
  const props = PropertiesService.getScriptProperties();
  const fromProps = String(props.getProperty("PROFILE_PHOTO_FOLDER_ID") || "").trim();
  if (fromProps) return fromProps;
  try {
    const fromConfig = String(CONFIG && CONFIG.DRIVE && CONFIG.DRIVE.PROFILE_PHOTO_FOLDER || "").trim();
    return fromConfig;
  } catch (err) {
    return "";
  }
}

function sanitizeDriveQueryToken_(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_\-]/g, "");
}

function driveUploadFile_(folderId, blob, ownerUid) {
  const folder = DriveApp.getFolderById(folderId);
  const file = folder.createFile(blob);

  // setSharing ต้องการสิทธิ์ Drive ระดับสูง — ถ้า GCP ยังไม่เปิด API
  // จะ throw "ไม่ได้รับอนุญาตให้เข้าถึง: DriveApp"
  // ครอบด้วย try-catch เพื่อให้ upload + sheet write ทำงานต่อได้
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (shareErr) {
    Logger.log("setSharing failed (non-critical): " + shareErr.message);
    // ลอง fallback ด้วย setAccess (ง่ายกว่า)
    try {
      file.setAccess(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e2) {
      Logger.log("setAccess fallback also failed: " + e2.message);
    }
  }

  return {
    folder: folder,
    file: file,
    ownerUid: String(ownerUid || ""),
    url: "https://drive.google.com/thumbnail?id=" + file.getId() + "&sz=w400"
  };
}
