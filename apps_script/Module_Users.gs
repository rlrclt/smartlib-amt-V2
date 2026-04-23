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

  const sheet = getUsersSheet_();
  const row = USER_SCHEMA.COLUMNS.map(function (column) {
    return user[column] === undefined ? "" : user[column];
  });

  sheet.appendRow(row);

  const verifyLink = buildVerifyLink_(user.verifyToken);
  sendVerificationEmail(user.email, user.displayName, verifyLink);

  return {
    message: "รับคำขอสมัครแล้ว กรุณาตรวจสอบอีเมลเพื่อยืนยันตัวตน",
    uid: user.uid,
    email: user.email,
    status: user.status
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
    photoURL: String(payload && payload.photoURL ? payload.photoURL : "/assets/img/default-avatar.png"),
    createdAt: now,
    updatedAt: now,
    notes: "สมัครผ่านหน้า Signup",
    password: "",
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
    if (String(existing.groupType || "") === user.groupType && String(existing.idCode || "") === idCode) {
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
      user[column] = row[headerMap[column]];
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
