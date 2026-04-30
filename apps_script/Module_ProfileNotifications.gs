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
const EMAIL_CHANGE_SESSION_PREFIX = "EMAIL_CHANGE_SESSION_";
const EMAIL_CHANGE_COOLDOWN_PREFIX = "PIN_COOLDOWN_";
const EMAIL_CHANGE_HOURLY_PREFIX = "OTP_HOURLY_";
const EMAIL_CHANGE_TTL_SECONDS = 600;
const EMAIL_CHANGE_COOLDOWN_SECONDS = 60;
const EMAIL_CHANGE_MAX_PER_HOUR = 3;
const EMAIL_CHANGE_MAX_ATTEMPTS = 3;

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
  const role = String(current.role || "").trim().toLowerCase();
  const merged = {};
  USER_SCHEMA.COLUMNS.forEach(function (col) {
    merged[col] = current[col];
  });

  const displayName = String(payload && payload.displayName !== undefined ? payload.displayName : current.displayName || "").trim();
  if (!displayName) {
    throw new Error("ชื่อที่แสดงห้ามว่าง");
  }

  const phone = String(payload && payload.phone !== undefined ? payload.phone : current.phone || "").replace(/\D/g, "");
  if (phone && !/^\d{10}$/.test(phone)) {
    throw new Error("เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก");
  }

  const personnelType = String(payload && payload.personnelType !== undefined ? payload.personnelType : current.personnelType || "").trim();
  const department = String(payload && payload.department !== undefined ? payload.department : current.department || "").trim();
  const level = String(payload && payload.level !== undefined ? payload.level : current.level || "").trim();
  const classRoom = String(payload && payload.classRoom !== undefined ? payload.classRoom : current.classRoom || "").trim();
  const organization = String(payload && payload.organization !== undefined ? payload.organization : current.organization || "").trim();
  const idType = String(payload && payload.idType !== undefined ? payload.idType : current.idType || "").trim();

  if (ROLE_PERSONNEL_TYPE_MAP[role] && ROLE_PERSONNEL_TYPE_MAP[role].length > 0) {
    if (!personnelType || ROLE_PERSONNEL_TYPE_MAP[role].indexOf(personnelType) < 0) {
      throw new Error("ประเภทบุคลากรไม่ถูกต้องสำหรับบทบาทนี้");
    }
  }
  if (role === "student") {
    if (!["ปวช.", "ปวส."].includes(level)) {
      throw new Error("ระดับการศึกษาต้องเป็น ปวช. หรือ ปวส.");
    }
    if (!/^\d+\/\d+$/.test(classRoom)) {
      throw new Error("รูปแบบห้องเรียนต้องเป็น เช่น 1/1");
    }
  }
  if (role === "external") {
    if (idType && ID_TYPES.indexOf(idType) < 0) {
      throw new Error("idType ไม่ถูกต้อง");
    }
  }

  merged.displayName = displayName;
  merged.phone = phone;
  merged.address = String(payload && payload.address !== undefined ? payload.address : current.address || "").trim();
  merged.lineId = String(payload && payload.lineId !== undefined ? payload.lineId : current.lineId || "").trim();
  merged.personnelType = personnelType;
  merged.department = department;
  merged.level = level;
  merged.classRoom = classRoom;
  merged.organization = organization;
  merged.idType = idType;
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

function requestEmailChange_(payload) {
  const actor = assertProfileActor_(payload && payload.auth);
  const currentEmail = normalizeEmail_(actor.user.email);
  const newEmail = normalizeEmail_(payload && payload.newEmail);
  if (!newEmail || !validateEmailFormat_(newEmail)) {
    throw new Error("รูปแบบอีเมลไม่ถูกต้อง");
  }
  if (newEmail === currentEmail) {
    throw new Error("อีเมลใหม่นี้เหมือนกับอีเมลปัจจุบัน");
  }

  const cache = CacheService.getUserCache();
  const sessionKey = EMAIL_CHANGE_SESSION_PREFIX + actor.uid;
  const cooldownKey = EMAIL_CHANGE_COOLDOWN_PREFIX + actor.uid;
  const hourlyKey = EMAIL_CHANGE_HOURLY_PREFIX + actor.uid;

  if (cache.get(cooldownKey)) {
    logEmailAudit_(actor.uid, "EMAIL_CHANGE_FAILED", "cooldown_active");
    throw new Error("กรุณารอ 60 วินาทีก่อนขอรหัสใหม่");
  }

  const hourlyCount = Number(cache.get(hourlyKey) || 0);
  if (hourlyCount >= EMAIL_CHANGE_MAX_PER_HOUR) {
    logEmailAudit_(actor.uid, "EMAIL_CHANGE_RATE_LIMITED", "max_3_per_hour");
    throw new Error("คุณขอรหัสเกินจำนวนที่กำหนด โปรดลองใหม่ในชั่วโมงถัดไป");
  }

  if (checkEmailExistsInUsersSheet_(newEmail, actor.uid)) {
    throw new Error("อีเมลนี้ถูกใช้งานในระบบแล้ว");
  }

  const createdAt = Date.now();
  const pin = generateEmailPin_();
  const session = {
    uid: actor.uid,
    newEmail: newEmail,
    pinHash: hashOtp_(actor.uid, pin, createdAt),
    attempts: 0,
    createdAt: createdAt
  };

  cache.put(sessionKey, JSON.stringify(session), EMAIL_CHANGE_TTL_SECONDS);
  cache.put(cooldownKey, "1", EMAIL_CHANGE_COOLDOWN_SECONDS);
  cache.put(hourlyKey, String(hourlyCount + 1), 3600);

  const sent = sendPinForEmailChange_(newEmail, pin);
  if (!sent) {
    cache.remove(sessionKey);
    throw new Error("ไม่สามารถส่งอีเมลยืนยันได้ กรุณาลองใหม่");
  }

  logEmailAudit_(actor.uid, "EMAIL_CHANGE_REQUESTED", "otp_sent");
  return {
    ok: true,
    message: "ส่งรหัสยืนยันไปยังอีเมลใหม่แล้ว",
    cooldownSec: EMAIL_CHANGE_COOLDOWN_SECONDS,
    ttlSec: EMAIL_CHANGE_TTL_SECONDS
  };
}

function verifyEmailChange_(payload) {
  const actor = assertProfileActor_(payload && payload.auth);
  const pin = String(payload && payload.pin || "").trim();
  if (!/^\d{6}$/.test(pin)) {
    throw new Error("รหัสยืนยันไม่ถูกต้อง");
  }

  const cache = CacheService.getUserCache();
  const sessionKey = EMAIL_CHANGE_SESSION_PREFIX + actor.uid;
  const raw = cache.get(sessionKey);
  if (!raw) {
    throw new Error("รหัสยืนยันหมดอายุหรือยังไม่ได้ทำรายการ");
  }

  let session = null;
  try {
    session = JSON.parse(raw);
  } catch (err) {
    cache.remove(sessionKey);
    throw new Error("รหัสยืนยันหมดอายุหรือยังไม่ได้ทำรายการ");
  }

  if (!session || String(session.uid || "") !== actor.uid) {
    cache.remove(sessionKey);
    throw new Error("ข้อมูลยืนยันไม่ถูกต้อง");
  }

  const attempts = Number(session.attempts || 0);
  if (attempts >= EMAIL_CHANGE_MAX_ATTEMPTS) {
    cache.remove(sessionKey);
    logEmailAudit_(actor.uid, "EMAIL_CHANGE_FAILED", "attempts_exceeded");
    throw new Error("กรอกผิดเกินกำหนด กรุณาขอรหัสใหม่");
  }

  const expectedHash = hashOtp_(actor.uid, pin, Number(session.createdAt || 0));
  if (expectedHash !== String(session.pinHash || "")) {
    session.attempts = attempts + 1;
    cache.put(sessionKey, JSON.stringify(session), EMAIL_CHANGE_TTL_SECONDS);
    const attemptsLeft = Math.max(0, EMAIL_CHANGE_MAX_ATTEMPTS - session.attempts);
    logEmailAudit_(actor.uid, "EMAIL_CHANGE_FAILED", "invalid_pin_" + String(session.attempts) + "_left_" + String(attemptsLeft));
    throw new Error("รหัสยืนยันไม่ถูกต้อง (เหลืออีก " + String(attemptsLeft) + " ครั้ง)");
  }

  const nextEmail = normalizeEmail_(session.newEmail);
  if (!nextEmail || !validateEmailFormat_(nextEmail)) {
    cache.remove(sessionKey);
    throw new Error("ข้อมูลอีเมลไม่ถูกต้อง");
  }
  if (checkEmailExistsInUsersSheet_(nextEmail, actor.uid)) {
    cache.remove(sessionKey);
    throw new Error("อีเมลนี้เพิ่งถูกใช้งานไป กรุณาใช้อีเมลอื่น");
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) {
    throw new Error("ระบบไม่ว่าง โปรดลองอีกครั้ง");
  }

  try {
    updateUserEmailInDatabase_(actor.uid, nextEmail);
  } finally {
    lock.releaseLock();
  }

  cache.remove(sessionKey);
  cache.remove(EMAIL_CHANGE_COOLDOWN_PREFIX + actor.uid);
  logEmailAudit_(actor.uid, "EMAIL_CHANGE_VERIFIED", "email_updated");
  return {
    ok: true,
    message: "อัปเดตอีเมลสำเร็จ",
    email: nextEmail,
    reauthRequired: false
  };
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

function normalizeEmail_(value) {
  return String(value || "").trim().toLowerCase();
}

function validateEmailFormat_(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

function generateEmailPin_() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp_(uid, pin, createdAt) {
  const secret = PropertiesService.getScriptProperties().getProperty("OTP_SECRET");
  if (!secret) {
    throw new Error("System Error: OTP secret is not configured");
  }
  const payload = String(uid || "") + ":" + String(pin || "") + ":" + String(createdAt || "") + ":" + String(secret);
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, payload));
}

function checkEmailExistsInUsersSheet_(email, excludeUid) {
  const target = normalizeEmail_(email);
  if (!target) return false;
  const uid = String(excludeUid || "").trim();
  const found = findUserByEmail_(target);
  if (!found || !found.user) return false;
  return String(found.user.uid || "") !== uid;
}

function updateUserEmailInDatabase_(uid, newEmail) {
  const targetUid = String(uid || "").trim();
  if (!targetUid) throw new Error("ไม่พบข้อมูลผู้ใช้");

  const sheet = getUsersSheet_();
  const rows = readUserRows_();
  const idxMap = {};
  rows.forEach(function (entry) {
    const rowUid = String(entry.user && entry.user.uid || "").trim();
    if (!rowUid) return;
    idxMap[rowUid] = entry.rowNumber;
  });
  const rowNumber = idxMap[targetUid];
  if (!rowNumber) throw new Error("ไม่พบข้อมูลผู้ใช้");

  const emailColumn = USER_SCHEMA.COLUMNS.indexOf("email") + 1;
  const updatedAtColumn = USER_SCHEMA.COLUMNS.indexOf("updatedAt") + 1;
  const notesColumn = USER_SCHEMA.COLUMNS.indexOf("notes") + 1;
  if (emailColumn <= 0) throw new Error("ไม่พบคอลัมน์อีเมลในระบบ");

  const nowIso = new Date().toISOString();
  const current = rows.find(function (entry) { return entry.rowNumber === rowNumber; });
  const currentNotes = String(current && current.user && current.user.notes || "");
  const nextNotes = buildAdminNote_(currentNotes, "เปลี่ยนอีเมลด้วย OTP โดย " + targetUid);

  sheet.getRange(rowNumber, emailColumn).setValue(newEmail);
  if (updatedAtColumn > 0) sheet.getRange(rowNumber, updatedAtColumn).setValue(nowIso);
  if (notesColumn > 0) sheet.getRange(rowNumber, notesColumn).setValue(nextNotes);
  SpreadsheetApp.flush();
}

function sendPinForEmailChange_(toEmail, pin) {
  if (typeof sendPinForEmailChange === "function") {
    return sendPinForEmailChange(toEmail, pin);
  }
  const subject = "รหัสยืนยันเปลี่ยนอีเมล - smartlib-amt";
  const safePin = escapeTextForEmail_(pin);
  const safeEmail = escapeTextForEmail_(toEmail);
  const body = '<div style="font-family:Sarabun,sans-serif;line-height:1.6;color:#334155;">'
    + '<h2 style="margin:0 0 8px;">ยืนยันการเปลี่ยนอีเมล</h2>'
    + '<p style="margin:0 0 12px;">ระบบได้รับคำขอเปลี่ยนอีเมลเป็น ' + safeEmail + '</p>'
    + '<p style="margin:0 0 6px;">รหัสยืนยัน (OTP) ของคุณ:</p>'
    + '<div style="font-size:30px;font-weight:800;letter-spacing:6px;background:#eff6ff;color:#0369a1;padding:14px 16px;border-radius:12px;text-align:center;">' + safePin + '</div>'
    + '<p style="margin:12px 0 0;color:#64748b;font-size:12px;">รหัสมีอายุ 10 นาที และกรอกผิดได้ไม่เกิน 3 ครั้ง</p>'
    + '</div>';
  return sendEmail(toEmail, subject, body);
}

function escapeTextForEmail_(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getEmailAuditSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetName = "audit_email_change";
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) sheet = ss.insertSheet(sheetName);
  ensureHeader_(sheet, ["timestamp", "uid", "action", "details"]);
  return sheet;
}

function logEmailAudit_(uid, action, details) {
  try {
    appendObjectRow_(getEmailAuditSheet_(), ["timestamp", "uid", "action", "details"], {
      timestamp: new Date().toISOString(),
      uid: String(uid || ""),
      action: String(action || ""),
      details: String(details || "")
    });
  } catch (err) {
    Logger.log("email audit failed: " + String(err && err.message || err));
  }
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
