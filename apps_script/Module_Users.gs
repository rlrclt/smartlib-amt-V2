/**
 * Module_Users.gs - User Management
 * Schema and auth/signup logic for the users sheet.
 */

const USER_SCHEMA = {
  SHEET_NAME: "users",
  COLUMNS: [
    "uid",
    "email",
    "displayName",
    "groupType",
    "role",
    "personnelType",
    "idCode",
    "idType",
    "department",
    "level",
    "classRoom",
    "organization",
    "status",
    "phone",
    "lineId",
    "address",
    "photoURL",
    "createdAt",
    "updatedAt",
    "notes",
    "password",
    "verifyToken",
    "isVerified"
  ]
};

const GROUP_ROLE_MAP = {
  manage: ["admin", "librarian"],
  member: ["student", "teacher", "staff", "external"]
};

const ROLE_PERSONNEL_TYPE_MAP = {
  admin: ["ผู้บริหาร"],
  librarian: ["เจ้าหน้าที่"],
  teacher: ["ข้าราชการ", "พนักงานราชการ", "ลูกจ้างประจำ", "ครูพิเศษสอน"],
  staff: ["เจ้าหน้าที่", "แม่บ้าน-นักการภารโรง"],
  student: [],
  external: []
};

const ID_TYPES = ["nationalId", "passport", "studentCard"];

const REQUIRED_FIELDS_BY_ROLE = {
  admin: ["uid", "email", "displayName", "groupType", "role", "personnelType", "department", "status", "phone"],
  librarian: ["uid", "email", "displayName", "groupType", "role", "personnelType", "department", "status", "phone"],
  teacher: ["uid", "email", "displayName", "groupType", "role", "personnelType", "idCode", "department", "status", "phone"],
  staff: ["uid", "email", "displayName", "groupType", "role", "personnelType", "idCode", "department", "status", "phone"],
  student: ["uid", "email", "displayName", "groupType", "role", "idCode", "department", "level", "classRoom", "status", "phone"],
  external: ["uid", "email", "displayName", "groupType", "role", "idCode", "idType", "status", "phone"]
};

function signupRequest_(payload) {
  const now = new Date().toISOString();
  const user = normalizeSignupPayload_(payload, now);
  validateUser_(user);
  ensureUniqueUser_(user);
  const requestedPassword = String(payload && payload.password ? payload.password : "").trim();
  const initialPassword = requestedPassword || generateRandomPassword();
  user.status = "active";
  user.isVerified = true;
  user.password = hashPassword(initialPassword);
  user.verifyToken = "";
  user.updatedAt = now;

  const sheet = getUsersSheet_();
  const row = USER_SCHEMA.COLUMNS.map(function (column) {
    return user[column] === undefined ? "" : user[column];
  });

  sheet.appendRow(row);

  return {
    message: "สมัครสมาชิกสำเร็จ สามารถเข้าสู่ระบบได้ทันที",
    uid: user.uid,
    email: user.email,
    status: user.status,
    tempPassword: requestedPassword ? "" : initialPassword
  };
}

function signinUser_(payload) {
  const email = String(payload && payload.email ? payload.email : "").trim().toLowerCase();
  const password = String(payload && payload.password ? payload.password : "");
  if (!email || !password) throw new Error("กรุณากรอกอีเมลและรหัสผ่าน");

  const found = findUserByEmail_(email);
  if (!found) throw new Error("ไม่พบบัญชีผู้ใช้นี้");

  const user = found.user;
  if (String(user.isVerified).toLowerCase() !== "true") {
    throw new Error("บัญชียังไม่ได้ยืนยันอีเมล");
  }
  if (String(user.status || "").toLowerCase() !== "active") {
    throw new Error("บัญชีนี้ยังไม่พร้อมใช้งาน");
  }
  if (hashPassword(password) !== String(user.password || "")) {
    throw new Error("รหัสผ่านไม่ถูกต้อง");
  }

  return {
    user: publicUser_(user),
    token: generateToken(),
    signedInAt: new Date().toISOString()
  };
}

function verifyEmail_(token) {
  const verifyToken = String(token || "").trim();
  if (!verifyToken) throw new Error("ไม่พบ token ยืนยันอีเมล");

  const sheet = getUsersSheet_();
  const rows = readUserRows_();
  const found = rows.find(function (entry) {
    return String(entry.user.verifyToken || "") === verifyToken;
  });

  if (!found) throw new Error("token ยืนยันอีเมลไม่ถูกต้องหรือหมดอายุ");

  const user = found.user;
  if (String(user.isVerified).toLowerCase() === "true" && String(user.status) === "active") {
    return { ok: true, message: "บัญชีนี้ยืนยันอีเมลแล้ว สามารถเข้าสู่ระบบได้" };
  }

  const password = generateRandomPassword();
  const updates = {
    status: "active",
    isVerified: true,
    password: hashPassword(password),
    updatedAt: new Date().toISOString()
  };

  updateUserRow_(sheet, found.rowNumber, updates);
  sendInitialPasswordEmail(user.email, user.displayName, password);

  return {
    ok: true,
    message: "ยืนยันอีเมลสำเร็จ ระบบส่งรหัสผ่านเริ่มต้นไปที่อีเมลของคุณแล้ว"
  };
}

function normalizeSignupPayload_(payload, now) {
  const rawGroupType = String(payload && payload.groupType ? payload.groupType : "member").trim().toLowerCase();
  const role = String(payload && payload.role ? payload.role : "student").trim();
  const groupType = GROUP_ROLE_MAP[rawGroupType] ? rawGroupType : "member";
  const defaultPersonnelType = {
    admin: "ผู้บริหาร",
    librarian: "เจ้าหน้าที่",
    teacher: "ข้าราชการ",
    staff: "เจ้าหน้าที่"
  };

  return {
    uid: "user_" + Utilities.getUuid(),
    email: String(payload && payload.email ? payload.email : "").trim().toLowerCase(),
    displayName: String(payload && payload.displayName ? payload.displayName : "").trim(),
    groupType: groupType,
    role: role,
    personnelType: ROLE_PERSONNEL_TYPE_MAP[role] && ROLE_PERSONNEL_TYPE_MAP[role].length > 0
      ? String(payload.personnelType || defaultPersonnelType[role] || "").trim()
      : "",
    idCode: String(payload && payload.idCode ? payload.idCode : "").trim(),
    idType: role === "external" ? String(payload.idType || "").trim() : "",
    department: role === "external" ? "" : String(payload && payload.department ? payload.department : "").trim(),
    level: role === "student" ? String(payload.level || "").trim() : "",
    classRoom: role === "student" ? String(payload.classRoom || "").trim() : "",
    organization: role === "external" ? String(payload.organization || "").trim() : "",
    status: "pending",
    phone: String(payload && payload.phone ? payload.phone : "").replace(/\D/g, ""),
    lineId: "",
    address: "",
    photoURL: String(payload && payload.photoURL ? payload.photoURL : "/assets/img/default-avatar.svg"),
    createdAt: now,
    updatedAt: now,
    notes: "สมัครผ่านหน้า Signup",
    password: String(payload && payload.password ? payload.password : ""),
    verifyToken: generateToken(),
    isVerified: false
  };
}

function validateUser_(payload) {
  const groupType = payload.groupType;
  const role = payload.role;
  const personnelType = payload.personnelType;
  const idType = payload.idType;
  const level = payload.level;
  const classRoom = payload.classRoom;

  if (!GROUP_ROLE_MAP[groupType] || GROUP_ROLE_MAP[groupType].indexOf(role) < 0) {
    throw new Error("groupType และ role ไม่สัมพันธ์กัน");
  }

  if (ROLE_PERSONNEL_TYPE_MAP[role].length > 0 &&
      ROLE_PERSONNEL_TYPE_MAP[role].indexOf(personnelType) < 0) {
    throw new Error('personnelType "' + personnelType + '" ไม่ถูกต้องสำหรับบทบาท "' + role + '"');
  }

  if (role === "external" && ID_TYPES.indexOf(idType) < 0) {
    throw new Error("idType ไม่ถูกต้องสำหรับบุคคลภายนอก");
  }

  if (role === "student") {
    if (["ปวช.", "ปวส."].indexOf(level) < 0) {
      throw new Error("ระดับการศึกษา (level) ต้องเป็น ปวช. หรือ ปวส.");
    }
    if (!/^\d+\/\d+$/.test(classRoom)) {
      throw new Error("รูปแบบห้องเรียน (classRoom) ไม่ถูกต้อง");
    }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) {
    throw new Error("รูปแบบอีเมลไม่ถูกต้อง");
  }
  if (!/^\d{10}$/.test(payload.phone)) {
    throw new Error("เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก");
  }
  if (!String(payload.password || "").trim()) {
    throw new Error("กรุณาตั้งรหัสผ่าน");
  }
  if (String(payload.password || "").length < 8) {
    throw new Error("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
  }

  REQUIRED_FIELDS_BY_ROLE[role].forEach(function (field) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === "") {
      throw new Error('ข้อมูล "' + field + '" ห้ามว่างสำหรับบทบาท "' + role + '"');
    }
  });

  return true;
}

function ensureUniqueUser_(user) {
  const rows = readUserRows_();
  const email = String(user.email || "").toLowerCase();
  const idCode = String(user.idCode || "");

  rows.forEach(function (entry) {
    const existing = entry.user;
    if (String(existing.email || "").toLowerCase() === email) {
      throw new Error("อีเมลนี้ถูกใช้งานแล้ว");
    }
    if (idCode && String(existing.groupType || "") === user.groupType && String(existing.idCode || "") === idCode) {
      throw new Error("รหัสหรือเลขเอกสารนี้ถูกใช้งานแล้ว");
    }
    if (String(existing.uid || "") === user.uid) {
      throw new Error("uid ซ้ำในระบบ");
    }
  });
}

function findUserByEmail_(email) {
  const rows = readUserRows_();
  return rows.find(function (entry) {
    return String(entry.user.email || "").toLowerCase() === email;
  }) || null;
}

function getUsersSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(USER_SCHEMA.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(USER_SCHEMA.SHEET_NAME);
  ensureUsersHeader_(sheet);
  return sheet;
}

function ensureUsersHeader_(sheet) {
  const headerRange = sheet.getRange(1, 1, 1, USER_SCHEMA.COLUMNS.length);
  const current = headerRange.getValues()[0];
  const shouldUpdate = USER_SCHEMA.COLUMNS.some(function (column, index) {
    return current[index] !== column;
  });

  if (shouldUpdate) {
    headerRange.setValues([USER_SCHEMA.COLUMNS]);
    sheet.setFrozenRows(1);
  }

  ensureUsersTextColumns_(sheet);
}

function readUserRows_() {
  const sheet = getUsersSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(1, 1, lastRow, USER_SCHEMA.COLUMNS.length).getValues();
  const headers = values[0];
  const headerMap = {};
  headers.forEach(function (header, index) {
    headerMap[header] = index;
  });

  return values.slice(1).map(function (row, index) {
    const user = {};
    USER_SCHEMA.COLUMNS.forEach(function (column) {
      const raw = row[headerMap[column]];
      user[column] = normalizeUserCellValue_(column, raw);
    });
    return {
      rowNumber: index + 2,
      user: user
    };
  });
}

function updateUserRow_(sheet, rowNumber, updates) {
  USER_SCHEMA.COLUMNS.forEach(function (column, index) {
    if (Object.prototype.hasOwnProperty.call(updates, column)) {
      sheet.getRange(rowNumber, index + 1).setValue(updates[column]);
    }
  });
}

function publicUser_(user) {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    groupType: user.groupType,
    role: user.role,
    personnelType: user.personnelType,
    idCode: user.idCode,
    idType: user.idType,
    department: user.department,
    level: user.level,
    classRoom: user.classRoom,
    organization: user.organization,
    status: user.status,
    phone: user.phone,
    photoURL: user.photoURL,
    isVerified: user.isVerified
  };
}

function buildVerifyLink_(token) {
  const rawUrl = String(ScriptApp.getService().getUrl() || "");
  const canonical = toCanonicalWebAppUrl_(rawUrl);
  return canonical + "?action=verify_email&token=" + encodeURIComponent(token);
}

function toCanonicalWebAppUrl_(url) {
  const cleaned = String(url || "")
    .replace(/\/u\/\d+\//, "/")
    .replace(/([?&])authuser=\d+(&|$)/, "$1")
    .replace(/[?&]$/, "");

  return cleaned;
}

function usersManageList_(payload) {
  assertUsersAdmin_(payload && payload.auth);
  const q = String(payload && payload.q || "").trim().toLowerCase();
  const status = String(payload && payload.status || "all").trim().toLowerCase();
  const role = String(payload && payload.role || "all").trim().toLowerCase();
  const page = Math.max(1, normalizeUsersInt_(payload && payload.page, 1, 10000));
  const limit = Math.max(1, normalizeUsersInt_(payload && payload.limit, 50, 300));

  var rows = readUserRows_().map(function (entry) {
    return entry.user;
  });

  rows = rows.filter(function (user) {
    const userStatus = String(user.status || "").toLowerCase();
    const userRole = String(user.role || "").toLowerCase();
    if (status !== "all" && userStatus !== status) return false;
    if (role !== "all" && userRole !== role) return false;
    if (!q) return true;
    const hay = [
      user.uid,
      user.displayName,
      user.email,
      user.role,
      user.department,
      user.idCode,
      user.phone
    ].join(" ").toLowerCase();
    return hay.indexOf(q) >= 0;
  });

  rows.sort(function (a, b) {
    return safeUserDateMs_(b.updatedAt || b.createdAt) - safeUserDateMs_(a.updatedAt || a.createdAt);
  });

  const total = rows.length;
  const start = (page - 1) * limit;
  const items = rows.slice(start, start + limit).map(publicUserManage_);

  return {
    items: items,
    page: page,
    limit: limit,
    total: total,
    hasMore: start + limit < total
  };
}

function usersManageGet_(payload) {
  assertUsersAdmin_(payload && payload.auth);
  const uid = String(payload && payload.uid || "").trim();
  if (!uid) throw new Error("กรุณาระบุ uid");

  const found = findUserByUid_(uid);
  if (!found) throw new Error("ไม่พบผู้ใช้");
  return publicUserManage_(found.user);
}

function usersManageUpdate_(payload) {
  const actor = assertUsersAdmin_(payload && payload.auth);
  const uid = String(payload && payload.uid || "").trim();
  if (!uid) throw new Error("กรุณาระบุ uid");

  const found = findUserByUid_(uid);
  if (!found) throw new Error("ไม่พบผู้ใช้");

  const current = found.user;
  const merged = mergeUserForAdminUpdate_(current, payload);
  const previousStatus = String(current.status || "").toLowerCase();
  validateUser_(merged);
  ensureUniqueUserForUpdate_(merged);
  merged.updatedAt = new Date().toISOString();
  merged.notes = buildAdminNote_(current.notes, "แก้ไขโดยแอดมิน " + actor.uid);

  writeUserObjectRow_(getUsersSheet_(), found.rowNumber, merged);
  const nextStatus = String(merged.status || "").toLowerCase();
  if (nextStatus !== previousStatus && (nextStatus === "suspended" || nextStatus === "inactive" || nextStatus === "active")) {
    createNotification_({
      uid: String(merged.uid || ""),
      title: "สถานะบัญชีถูกเปลี่ยน",
      message: 'บัญชีของคุณถูกอัปเดตเป็นสถานะ "' + nextStatus + '"',
      type: "system",
      senderUid: actor.uid,
      link: "/profile"
    });
  }
  return publicUserManage_(merged);
}

function usersManageCreate_(payload) {
  const actor = assertUsersAdmin_(payload && payload.auth);
  const now = new Date().toISOString();
  const created = normalizeAdminCreateUser_(payload, now, actor.uid);
  validateUser_(created);
  ensureUniqueUser_(created);
  appendUserObjectRow_(getUsersSheet_(), created);

  return {
    user: publicUserManage_(created),
    generatedPassword: created.__generatedPassword || "",
    generatedIdCode: created.__generatedIdCode || ""
  };
}

function usersManageArchive_(payload) {
  const actor = assertUsersAdmin_(payload && payload.auth);
  const uid = String(payload && payload.uid || "").trim();
  if (!uid) throw new Error("กรุณาระบุ uid");

  const found = findUserByUid_(uid);
  if (!found) throw new Error("ไม่พบผู้ใช้");

  const user = found.user;
  user.status = "inactive";
  user.updatedAt = new Date().toISOString();
  user.notes = buildAdminNote_(user.notes, "archive โดย " + actor.uid);

  writeUserObjectRow_(getUsersSheet_(), found.rowNumber, user);
  createNotification_({
    uid: String(user.uid || ""),
    title: "บัญชีถูกระงับการใช้งาน",
    message: "บัญชีของคุณถูกตั้งเป็น inactive กรุณาติดต่อผู้ดูแลระบบหากต้องการเปิดใช้งานอีกครั้ง",
    type: "system",
    senderUid: actor.uid,
    link: "/signin"
  });
  return publicUserManage_(user);
}

function usersImportPreview_(payload) {
  assertUsersAdmin_(payload && payload.auth);
  const rows = Array.isArray(payload && payload.rows) ? payload.rows : [];
  if (!rows.length) return { preview: [], summary: { total: 0, ready: 0, conflicts: 0, errors: 0 } };

  const existing = readUserRows_().map(function (entry) { return entry.user; });
  const byEmail = {};
  const byIdCode = {};
  existing.forEach(function (user) {
    byEmail[String(user.email || "").toLowerCase()] = user;
    const idCode = String(user.idCode || "").trim();
    const groupType = String(user.groupType || "").trim();
    if (idCode) byIdCode[groupType + "::" + idCode] = user;
  });

  const preview = rows.map(function (row, idx) {
    const candidate = normalizeImportRow_(row, idx);
    const errors = [];
    var conflict = null;
    var existingUid = "";

    if (candidate.__skip) {
      errors.push("ข้อมูลแถวนี้ว่างหรือไม่ครบ");
    } else {
      try {
        validateUser_(candidate.user);
      } catch (err) {
        errors.push(String(err && err.message ? err.message : err));
      }

      const emailKey = String(candidate.user.email || "").toLowerCase();
      const idKey = String(candidate.user.groupType || "") + "::" + String(candidate.user.idCode || "");
      const existingByEmail = emailKey ? byEmail[emailKey] : null;
      const existingById = candidate.user.idCode ? byIdCode[idKey] : null;
      const hit = existingByEmail || existingById || null;
      if (hit) {
        conflict = "duplicate";
        existingUid = String(hit.uid || "");
      }
    }

    return {
      index: idx,
      user: candidate.user ? publicUserManage_(candidate.user) : null,
      mode: errors.length ? "error" : (conflict ? "conflict" : "ready"),
      conflict: conflict,
      existingUid: existingUid,
      errors: errors
    };
  });

  const summary = {
    total: preview.length,
    ready: preview.filter(function (r) { return r.mode === "ready"; }).length,
    conflicts: preview.filter(function (r) { return r.mode === "conflict"; }).length,
    errors: preview.filter(function (r) { return r.mode === "error"; }).length
  };

  return { preview: preview, summary: summary };
}

function usersImportApply_(payload) {
  const actor = assertUsersAdmin_(payload && payload.auth);
  const rows = Array.isArray(payload && payload.rows) ? payload.rows : [];
  const mode = String(payload && payload.mode || "skip").toLowerCase() === "overwrite" ? "overwrite" : "skip";
  if (!rows.length) return { inserted: 0, updated: 0, skipped: 0, errors: [] };

  const preview = usersImportPreview_({
    auth: payload.auth,
    rows: rows
  });

  const sheet = getUsersSheet_();
  const now = new Date().toISOString();
  var inserted = 0;
  var updated = 0;
  var skipped = 0;
  const errors = [];

  preview.preview.forEach(function (item) {
    if (item.mode === "error" || !item.user) {
      skipped += 1;
      errors.push({ index: item.index, errors: item.errors });
      return;
    }

    if (item.mode === "conflict" && mode === "skip") {
      skipped += 1;
      return;
    }

    try {
      const found = item.existingUid ? findUserByUid_(item.existingUid) : findUserByEmail_(String(item.user.email || "").toLowerCase());
      if (found && found.user) {
        const merged = mergeUserForImportOverwrite_(found.user, item.user, now, actor.uid);
        validateUser_(merged);
        ensureUniqueUserForUpdate_(merged);
        writeUserObjectRow_(sheet, found.rowNumber, merged);
        updated += 1;
        return;
      }

      const newUser = normalizeImportCreateUser_(item.user, now, actor.uid);
      validateUser_(newUser);
      ensureUniqueUser_(newUser);
      appendUserObjectRow_(sheet, newUser);
      inserted += 1;
    } catch (err) {
      skipped += 1;
      errors.push({ index: item.index, errors: [String(err && err.message ? err.message : err)] });
    }
  });

  return {
    inserted: inserted,
    updated: updated,
    skipped: skipped,
    errors: errors
  };
}

function assertUsersAdmin_(auth) {
  const uid = String(auth && auth.user && auth.user.uid || auth && auth.uid || "").trim();
  if (!uid) throw new Error("401: INVALID_TOKEN");
  const found = findUserByUid_(uid);
  if (!found || !found.user) throw new Error("401: INVALID_TOKEN");
  const user = found.user;
  if (String(user.status || "").toLowerCase() !== "active") throw new Error("401: INVALID_TOKEN");
  if (String(user.groupType || "").toLowerCase() !== "manage" || String(user.role || "").toLowerCase() !== "admin") {
    throw new Error("403: ADMIN_REQUIRED");
  }
  return { uid: String(user.uid || ""), role: "admin" };
}

function findUserByUid_(uid) {
  const target = String(uid || "").trim();
  if (!target) return null;
  const rows = readUserRows_();
  return rows.find(function (entry) {
    return String(entry.user.uid || "") === target;
  }) || null;
}

function writeUserObjectRow_(sheet, rowNumber, user) {
  const row = USER_SCHEMA.COLUMNS.map(function (col) {
    return user[col] === undefined ? "" : user[col];
  });
  sheet.getRange(rowNumber, 1, 1, USER_SCHEMA.COLUMNS.length).setValues([row]);
}

function appendUserObjectRow_(sheet, user) {
  const row = USER_SCHEMA.COLUMNS.map(function (col) {
    return user[col] === undefined ? "" : user[col];
  });
  sheet.appendRow(row);
}

function ensureUsersTextColumns_(sheet) {
  const textColumns = ["phone", "idCode", "classRoom"];
  textColumns.forEach(function (columnName) {
    const col = USER_SCHEMA.COLUMNS.indexOf(columnName) + 1;
    if (col <= 0) return;
    try {
      sheet.getRange(2, col, Math.max(1, sheet.getMaxRows() - 1), 1).setNumberFormat("@");
    } catch (_) {
      // ignore format errors to avoid blocking schema init
    }
  });
}

function normalizePhoneFromSheet_(raw) {
  var digits = String(raw === undefined || raw === null ? "" : raw).replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 9) digits = "0" + digits;
  return digits;
}

function normalizeClassRoomFromSheet_(raw) {
  if (raw instanceof Date && Number.isFinite(raw.getTime())) {
    return String(raw.getMonth() + 1) + "/" + String(raw.getDate());
  }
  var text = String(raw === undefined || raw === null ? "" : raw).trim();
  if (!text) return "";
  var matched = text.match(/\d+\s*\/\s*\d+/);
  if (matched && matched[0]) return matched[0].replace(/\s+/g, "");
  var parsed = new Date(text);
  if (Number.isFinite(parsed.getTime())) {
    return String(parsed.getMonth() + 1) + "/" + String(parsed.getDate());
  }
  return text;
}

function normalizeUserCellValue_(column, raw) {
  if (column === "phone") return normalizePhoneFromSheet_(raw);
  if (column === "classRoom") return normalizeClassRoomFromSheet_(raw);
  if (column === "idCode") return String(raw === undefined || raw === null ? "" : raw).trim();
  return raw;
}

function mergeUserForAdminUpdate_(current, payload) {
  const role = String(payload && payload.role !== undefined ? payload.role : current.role || "").trim();
  const groupType = String(payload && payload.groupType !== undefined ? payload.groupType : current.groupType || "").trim().toLowerCase();

  return {
    uid: String(current.uid || ""),
    email: String(payload && payload.email !== undefined ? payload.email : current.email || "").trim().toLowerCase(),
    displayName: String(payload && payload.displayName !== undefined ? payload.displayName : current.displayName || "").trim(),
    groupType: groupType,
    role: role,
    personnelType: String(payload && payload.personnelType !== undefined ? payload.personnelType : current.personnelType || "").trim(),
    idCode: String(payload && payload.idCode !== undefined ? payload.idCode : current.idCode || "").trim(),
    idType: String(payload && payload.idType !== undefined ? payload.idType : current.idType || "").trim(),
    department: String(payload && payload.department !== undefined ? payload.department : current.department || "").trim(),
    level: String(payload && payload.level !== undefined ? payload.level : current.level || "").trim(),
    classRoom: String(payload && payload.classRoom !== undefined ? payload.classRoom : current.classRoom || "").trim(),
    organization: String(payload && payload.organization !== undefined ? payload.organization : current.organization || "").trim(),
    status: String(payload && payload.status !== undefined ? payload.status : current.status || "active").trim().toLowerCase(),
    phone: String(payload && payload.phone !== undefined ? payload.phone : current.phone || "").replace(/\D/g, ""),
    lineId: String(payload && payload.lineId !== undefined ? payload.lineId : current.lineId || "").trim(),
    address: String(payload && payload.address !== undefined ? payload.address : current.address || "").trim(),
    photoURL: String(payload && payload.photoURL !== undefined ? payload.photoURL : current.photoURL || "").trim(),
    createdAt: String(current.createdAt || ""),
    updatedAt: String(current.updatedAt || ""),
    notes: String(current.notes || ""),
    password: String(current.password || ""),
    verifyToken: String(current.verifyToken || ""),
    isVerified: String(payload && payload.isVerified !== undefined ? payload.isVerified : current.isVerified)
  };
}

function ensureUniqueUserForUpdate_(user) {
  const email = String(user.email || "").toLowerCase();
  const idCode = String(user.idCode || "");
  const groupType = String(user.groupType || "");
  const uid = String(user.uid || "");
  readUserRows_().forEach(function (entry) {
    const existing = entry.user;
    if (String(existing.uid || "") === uid) return;
    if (String(existing.email || "").toLowerCase() === email) {
      throw new Error("อีเมลนี้ถูกใช้งานแล้ว");
    }
    if (idCode && String(existing.groupType || "") === groupType && String(existing.idCode || "") === idCode) {
      throw new Error("รหัสหรือเลขเอกสารนี้ถูกใช้งานแล้ว");
    }
  });
}

function publicUserManage_(user) {
  return {
    uid: String(user.uid || ""),
    email: String(user.email || ""),
    displayName: String(user.displayName || ""),
    groupType: String(user.groupType || ""),
    role: String(user.role || ""),
    personnelType: String(user.personnelType || ""),
    idCode: String(user.idCode || ""),
    idType: String(user.idType || ""),
    department: String(user.department || ""),
    level: String(user.level || ""),
    classRoom: String(user.classRoom || ""),
    organization: String(user.organization || ""),
    status: String(user.status || ""),
    phone: String(user.phone || ""),
    lineId: String(user.lineId || ""),
    address: String(user.address || ""),
    photoURL: String(user.photoURL || ""),
    createdAt: String(user.createdAt || ""),
    updatedAt: String(user.updatedAt || ""),
    notes: String(user.notes || ""),
    isVerified: String(user.isVerified || "")
  };
}

function normalizeImportRow_(row, idx) {
  const source = row && typeof row === "object" ? row : {};
  const now = new Date().toISOString();
  const role = String(source.role || "student").trim();
  const groupType = String(source.groupType || (GROUP_ROLE_MAP.manage.indexOf(role) >= 0 ? "manage" : "member")).trim().toLowerCase();
  const email = String(source.email || "").trim().toLowerCase();
  const displayName = String(source.displayName || source.name || "").trim();
  if (!email && !displayName) return { __skip: true, user: null };

  const defaultPersonnelType = {
    admin: "ผู้บริหาร",
    librarian: "เจ้าหน้าที่",
    teacher: "ข้าราชการ",
    staff: "เจ้าหน้าที่"
  };

  const user = {
    uid: String(source.uid || "imp_" + Utilities.getUuid()).trim(),
    email: email,
    displayName: displayName,
    groupType: groupType,
    role: role,
    personnelType: String(source.personnelType || defaultPersonnelType[role] || "").trim(),
    idCode: String(source.idCode || "").trim(),
    idType: String(source.idType || "").trim(),
    department: String(source.department || "").trim(),
    level: String(source.level || "").trim(),
    classRoom: String(source.classRoom || "").trim(),
    organization: String(source.organization || "").trim(),
    status: String(source.status || "active").trim().toLowerCase(),
    phone: String(source.phone || "").replace(/\D/g, ""),
    lineId: String(source.lineId || "").trim(),
    address: String(source.address || "").trim(),
    photoURL: String(source.photoURL || "/assets/img/default-avatar.svg").trim(),
    createdAt: String(source.createdAt || now),
    updatedAt: String(source.updatedAt || now),
    notes: String(source.notes || ("import row " + (idx + 1))).trim(),
    password: String(source.password || ""),
    verifyToken: String(source.verifyToken || ""),
    isVerified: source.isVerified === undefined ? "true" : String(source.isVerified)
  };

  return { __skip: false, user: user };
}

function normalizeImportCreateUser_(baseUser, now, actorUid) {
  const out = {};
  USER_SCHEMA.COLUMNS.forEach(function (col) {
    out[col] = baseUser[col] === undefined ? "" : baseUser[col];
  });
  out.uid = String(baseUser.uid || "imp_" + Utilities.getUuid());
  out.createdAt = now;
  out.updatedAt = now;
  out.notes = buildAdminNote_(baseUser.notes, "import โดย " + actorUid);
  if (!String(out.password || "").trim()) out.password = hashPassword(generateRandomPassword());
  if (!String(out.verifyToken || "").trim()) out.verifyToken = "";
  if (!String(out.isVerified || "").trim()) out.isVerified = "true";
  return out;
}

function mergeUserForImportOverwrite_(current, imported, now, actorUid) {
  const merged = {};
  USER_SCHEMA.COLUMNS.forEach(function (col) {
    merged[col] = current[col];
  });

  [
    "email", "displayName", "groupType", "role", "personnelType", "idCode", "idType",
    "department", "level", "classRoom", "organization", "status", "phone",
    "lineId", "address", "photoURL"
  ].forEach(function (field) {
    const value = imported[field];
    if (value !== undefined && String(value).trim() !== "") merged[field] = value;
  });

  merged.updatedAt = now;
  merged.notes = buildAdminNote_(current.notes, "overwrite import โดย " + actorUid);
  return merged;
}

function normalizeAdminCreateUser_(payload, now, actorUid) {
  const defaultPersonnelType = {
    admin: "ผู้บริหาร",
    librarian: "เจ้าหน้าที่",
    teacher: "ข้าราชการ",
    staff: "เจ้าหน้าที่"
  };

  const role = String(payload && payload.role || "student").trim();
  const isManageRole = GROUP_ROLE_MAP.manage.indexOf(role) >= 0;
  const groupType = String(payload && payload.groupType || (isManageRole ? "manage" : "member")).trim().toLowerCase();
  const passwordInput = String(payload && payload.password || "").trim();
  const rawPassword = passwordInput || generateRandomPassword();
  const idCodeInput = String(payload && payload.idCode || "").trim();
  const generatedIdCode = (!idCodeInput && isIdCodeRequiredByRole_(role))
    ? generateAutoIdCode_(role)
    : "";
  const idTypeInput = String(payload && payload.idType || "").trim();
  const phoneInput = String(payload && payload.phone || "").replace(/\D/g, "");
  const departmentInput = String(payload && payload.department || "").trim();
  const levelInput = String(payload && payload.level || "").trim();
  const classRoomInput = String(payload && payload.classRoom || "").trim();

  const user = {
    uid: "user_" + Utilities.getUuid(),
    email: String(payload && payload.email || "").trim().toLowerCase(),
    displayName: String(payload && payload.displayName || "").trim(),
    groupType: groupType,
    role: role,
    personnelType: String(payload && payload.personnelType || defaultPersonnelType[role] || "").trim(),
    idCode: idCodeInput || generatedIdCode,
    idType: role === "external" ? (idTypeInput || "nationalId") : idTypeInput,
    department: departmentInput || (role === "external" ? "" : "-"),
    level: role === "student" ? (levelInput || "ปวช.") : levelInput,
    classRoom: role === "student" ? (classRoomInput || "1/1") : classRoomInput,
    organization: String(payload && payload.organization || "").trim(),
    status: String(payload && payload.status || "active").trim().toLowerCase(),
    phone: phoneInput || "0000000000",
    lineId: String(payload && payload.lineId || "").trim(),
    address: String(payload && payload.address || "").trim(),
    photoURL: String(payload && payload.photoURL || "/assets/img/default-avatar.svg").trim(),
    createdAt: now,
    updatedAt: now,
    notes: buildAdminNote_(String(payload && payload.notes || ""), "create โดย " + actorUid),
    password: hashPassword(rawPassword),
    verifyToken: "",
    isVerified: String(payload && payload.isVerified !== undefined ? payload.isVerified : "true")
  };

  user.__generatedPassword = passwordInput ? "" : rawPassword;
  user.__generatedIdCode = generatedIdCode;
  return user;
}

function isIdCodeRequiredByRole_(role) {
  const key = String(role || "").trim().toLowerCase();
  return key === "teacher" || key === "staff" || key === "student" || key === "external";
}

function generateAutoIdCode_(role) {
  const roleKey = String(role || "").trim().toLowerCase();
  const prefixMap = {
    teacher: "TCH",
    staff: "STF",
    student: "STD",
    external: "EXT"
  };
  const prefix = prefixMap[roleKey] || "USR";
  const rand = Utilities.getUuid().replace(/-/g, "").slice(0, 8).toUpperCase();
  return prefix + rand;
}

function buildAdminNote_(currentNote, appendText) {
  const base = String(currentNote || "").trim();
  const text = String(appendText || "").trim();
  if (!text) return base;
  if (!base) return text;
  return base + " | " + text;
}

function safeUserDateMs_(value) {
  const ms = new Date(String(value || "")).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function normalizeUsersInt_(value, fallback, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  var out = Math.round(n);
  if (out < 0) out = 0;
  if (Number.isFinite(max) && out > max) out = max;
  return out;
}
