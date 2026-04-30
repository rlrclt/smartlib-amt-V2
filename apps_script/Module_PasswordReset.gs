const PWD_RESET_OTP_PREFIX = "PWD_RESET_OTP_";
const PWD_RESET_TOKEN_PREFIX = "PWD_RESET_TOKEN_";
const PWD_RESET_COOLDOWN_PREFIX = "PWD_RESET_CD_";
const PWD_RESET_HOURLY_PREFIX = "PWD_RESET_HR_";
const PWD_RESET_OTP_TTL_SEC = 600;
const PWD_RESET_TOKEN_TTL_SEC = 300;
const PWD_RESET_COOLDOWN_SEC = 60;
const PWD_RESET_MAX_HOURLY = 3;
const PWD_RESET_MAX_ATTEMPTS = 3;

function requestPasswordReset_(payload) {
  const startedAt = Date.now();
  const email = normalizeResetEmail_(payload && payload.email);
  if (!validateResetEmail_(email)) {
    throw new Error("รูปแบบอีเมลไม่ถูกต้อง");
  }

  const cache = CacheService.getScriptCache();
  const keyHash = hashEmailKey_(email);
  const cooldownKey = PWD_RESET_COOLDOWN_PREFIX + keyHash;
  const hourlyKey = PWD_RESET_HOURLY_PREFIX + keyHash;

  if (cache.get(cooldownKey)) {
    logPasswordResetAudit_(null, "PASSWORD_RESET_RATE_LIMITED", "cooldown_active");
    throw new Error("กรุณารอ 60 วินาทีก่อนขอรหัสใหม่");
  }

  const hourlyCount = Number(cache.get(hourlyKey) || 0);
  if (hourlyCount >= PWD_RESET_MAX_HOURLY) {
    logPasswordResetAudit_(null, "PASSWORD_RESET_RATE_LIMITED", "max_3_per_hour");
    throw new Error("คุณขอรหัสเกินจำนวนที่กำหนด โปรดลองใหม่ในชั่วโมงถัดไป");
  }

  const found = findUserByEmail_(email);
  if (found && found.user && String(found.user.status || "").toLowerCase() === "active") {
    const uid = String(found.user.uid || "");
    const otp = generateResetOtp_();
    const createdAt = Date.now();
    const otpSession = {
      uid: uid,
      email: email,
      otpHash: hashPasswordResetOtp_(uid, email, otp, createdAt),
      attempts: 0,
      createdAt: createdAt
    };
    cache.put(PWD_RESET_OTP_PREFIX + keyHash, JSON.stringify(otpSession), PWD_RESET_OTP_TTL_SEC);
    sendPasswordResetOtpEmail(email, otp);
    logPasswordResetAudit_(uid, "PASSWORD_RESET_REQUESTED", "otp_sent");
  }

  cache.put(cooldownKey, "1", PWD_RESET_COOLDOWN_SEC);
  cache.put(hourlyKey, String(hourlyCount + 1), 3600);
  sleepToMinDuration_(startedAt, 1200);
  return {
    ok: true,
    message: "หากอีเมลนี้อยู่ในระบบ จะมีการส่งรหัสกู้คืนให้",
    cooldownSec: PWD_RESET_COOLDOWN_SEC,
    ttlSec: PWD_RESET_OTP_TTL_SEC
  };
}

function verifyPasswordResetOtp_(payload) {
  const email = normalizeResetEmail_(payload && payload.email);
  const otp = String(payload && payload.otp || "").trim();
  if (!validateResetEmail_(email)) throw new Error("รูปแบบอีเมลไม่ถูกต้อง");
  if (!/^\d{6}$/.test(otp)) throw new Error("รหัส OTP ไม่ถูกต้อง");

  const cache = CacheService.getScriptCache();
  const keyHash = hashEmailKey_(email);
  const key = PWD_RESET_OTP_PREFIX + keyHash;
  const raw = cache.get(key);
  if (!raw) throw new Error("รหัส OTP หมดอายุหรือยังไม่ได้ทำรายการ");

  let session = null;
  try {
    session = JSON.parse(raw);
  } catch (e) {
    cache.remove(key);
    throw new Error("รหัส OTP หมดอายุหรือยังไม่ได้ทำรายการ");
  }

  const attempts = Number(session.attempts || 0);
  if (attempts >= PWD_RESET_MAX_ATTEMPTS) {
    cache.remove(key);
    logPasswordResetAudit_(session.uid, "PASSWORD_RESET_OTP_FAILED", "attempts_exceeded");
    throw new Error("กรอกผิดเกินกำหนด กรุณาขอรหัสใหม่");
  }

  const expected = hashPasswordResetOtp_(session.uid, session.email, otp, session.createdAt);
  if (!constantTimeEquals_(expected, String(session.otpHash || ""))) {
    session.attempts = attempts + 1;
    cache.put(key, JSON.stringify(session), PWD_RESET_OTP_TTL_SEC);
    logPasswordResetAudit_(session.uid, "PASSWORD_RESET_OTP_FAILED", "invalid_otp_" + String(session.attempts));
    throw new Error("รหัส OTP ไม่ถูกต้อง");
  }

  cache.remove(key);
  const plainToken = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
  const tokenHash = hashPasswordResetToken_(session.uid, session.email, plainToken);
  const tokenSession = {
    uid: session.uid,
    email: session.email,
    tokenHash: tokenHash,
    attempts: 0,
    expiresAt: Date.now() + PWD_RESET_TOKEN_TTL_SEC * 1000
  };
  cache.put(PWD_RESET_TOKEN_PREFIX + session.uid, JSON.stringify(tokenSession), PWD_RESET_TOKEN_TTL_SEC);
  logPasswordResetAudit_(session.uid, "PASSWORD_RESET_OTP_VERIFIED", "ok");

  return {
    ok: true,
    uid: session.uid,
    resetToken: plainToken,
    tokenTtlSec: PWD_RESET_TOKEN_TTL_SEC
  };
}

function confirmPasswordReset_(payload) {
  const uid = String(payload && payload.uid || "").trim();
  const token = String(payload && payload.resetToken || "").trim();
  const newPassword = String(payload && payload.newPassword || "");
  const confirmPassword = String(payload && payload.confirmPassword || "");
  if (!uid || !token) throw new Error("ข้อมูลยืนยันไม่ครบถ้วน");

  validateResetPasswordPolicy_(newPassword, confirmPassword);
  const found = findUserByUid_(uid);
  if (!found || !found.user) throw new Error("ไม่พบบัญชีผู้ใช้");

  const user = found.user;
  if (hashPassword(newPassword) === String(user.password || "")) {
    throw new Error("รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านเดิม");
  }

  const cache = CacheService.getScriptCache();
  const cacheKey = PWD_RESET_TOKEN_PREFIX + uid;
  const raw = cache.get(cacheKey);
  if (!raw) throw new Error("โทเคนหมดอายุ กรุณายืนยัน OTP ใหม่");

  let session = null;
  try {
    session = JSON.parse(raw);
  } catch (e) {
    cache.remove(cacheKey);
    throw new Error("โทเคนหมดอายุ กรุณายืนยัน OTP ใหม่");
  }

  const attempts = Number(session.attempts || 0);
  if (attempts >= PWD_RESET_MAX_ATTEMPTS) {
    cache.remove(cacheKey);
    throw new Error("โทเคนไม่ถูกต้อง กรุณายืนยัน OTP ใหม่");
  }
  if (String(session.uid || "") !== uid || normalizeResetEmail_(session.email) !== normalizeResetEmail_(user.email)) {
    cache.remove(cacheKey);
    throw new Error("โทเคนไม่ถูกต้อง");
  }

  const expectedHash = hashPasswordResetToken_(uid, session.email, token);
  if (!constantTimeEquals_(expectedHash, String(session.tokenHash || ""))) {
    session.attempts = attempts + 1;
    cache.put(cacheKey, JSON.stringify(session), PWD_RESET_TOKEN_TTL_SEC);
    throw new Error("โทเคนไม่ถูกต้อง");
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) throw new Error("ระบบไม่ว่าง โปรดลองอีกครั้ง");
  try {
    const merged = {};
    USER_SCHEMA.COLUMNS.forEach(function (col) { merged[col] = user[col]; });
    merged.password = hashPassword(newPassword);
    merged.updatedAt = new Date().toISOString();
    merged.verifyToken = generateToken();
    merged.notes = buildAdminNote_(user.notes, "รีเซ็ตรหัสผ่านโดย OTP");
    writeUserObjectRow_(getUsersSheet_(), found.rowNumber, merged);
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  cache.remove(cacheKey);
  logPasswordResetAudit_(uid, "PASSWORD_RESET_COMPLETED", "ok");
  return { ok: true, message: "รีเซ็ตรหัสผ่านสำเร็จ" };
}

function normalizeResetEmail_(value) {
  return String(value || "").trim().toLowerCase();
}

function validateResetEmail_(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

function validateResetPasswordPolicy_(newPassword, confirmPassword) {
  if (!newPassword || !confirmPassword) throw new Error("กรุณากรอกรหัสผ่านให้ครบ");
  if (newPassword !== confirmPassword) throw new Error("รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน");
  const value = String(newPassword);
  if (value.length < 8) throw new Error("รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร");
  if (!/[A-Z]/.test(value)) throw new Error("รหัสผ่านใหม่ต้องมีอักษรพิมพ์ใหญ่อย่างน้อย 1 ตัว");
  if (!/[a-z]/.test(value)) throw new Error("รหัสผ่านใหม่ต้องมีอักษรพิมพ์เล็กอย่างน้อย 1 ตัว");
  if (!/[0-9]/.test(value)) throw new Error("รหัสผ่านใหม่ต้องมีตัวเลขอย่างน้อย 1 ตัว");
  if (!/[^A-Za-z0-9]/.test(value)) throw new Error("รหัสผ่านใหม่ต้องมีอักขระพิเศษอย่างน้อย 1 ตัว");
  const weakSet = { "12345678": true, "password": true, "qwerty123": true, "11111111": true };
  if (weakSet[value.toLowerCase()]) throw new Error("รหัสผ่านนี้เดาง่ายเกินไป");
}

function hashEmailKey_(email) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(email || ""));
  return Utilities.base64EncodeWebSafe(digest);
}

function hashPasswordResetOtp_(uid, email, otp, createdAt) {
  const secret = getPasswordResetSecret_();
  const payload = String(uid || "") + ":" + String(email || "") + ":" + String(otp || "") + ":" + String(createdAt || "") + ":" + secret;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, payload);
  return Utilities.base64EncodeWebSafe(digest);
}

function hashPasswordResetToken_(uid, email, token) {
  const secret = getPasswordResetSecret_();
  const payload = String(uid || "") + ":" + String(email || "") + ":" + String(token || "") + ":" + secret;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, payload);
  return Utilities.base64EncodeWebSafe(digest);
}

function getPasswordResetSecret_() {
  const props = PropertiesService.getScriptProperties();
  const secret = props.getProperty("PASSWORD_RESET_SECRET") || props.getProperty("OTP_SECRET");
  if (!secret) throw new Error("System Error: OTP secret is not configured");
  return String(secret);
}

function generateResetOtp_() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function constantTimeEquals_(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  const maxLen = Math.max(left.length, right.length);
  let out = left.length === right.length ? 0 : 1;
  for (let i = 0; i < maxLen; i += 1) {
    const lc = i < left.length ? left.charCodeAt(i) : 0;
    const rc = i < right.length ? right.charCodeAt(i) : 0;
    out |= (lc ^ rc);
  }
  return out === 0;
}

function sleepToMinDuration_(startedAtMs, minMs) {
  const elapsed = Date.now() - Number(startedAtMs || 0);
  const wait = Math.max(0, Number(minMs || 0) - elapsed);
  if (wait > 0) Utilities.sleep(wait);
}

function getPasswordResetAuditSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const name = "audit_password_reset";
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  ensureHeader_(sheet, ["timestamp", "uid", "action", "details"]);
  return sheet;
}

function logPasswordResetAudit_(uid, action, details) {
  try {
    appendObjectRow_(getPasswordResetAuditSheet_(), ["timestamp", "uid", "action", "details"], {
      timestamp: new Date().toISOString(),
      uid: String(uid || ""),
      action: String(action || ""),
      details: String(details || "")
    });
  } catch (err) {
    Logger.log("password reset audit failed: " + String(err && err.message || err));
  }
}
