/**
 * Utils.gs - ฟังก์ชันช่วยจัดการงานทั่วไป (Hashing, Token Generation, etc.)
 */

/**
 * ฟังก์ชันทำ Password Hashing (SHA-256)
 * @param {string} password รหัสผ่านตัวเต็ม
 * @return {string} รหัสที่ผ่านการ Hash แล้ว
 */
function hashPassword(password) {
  if (!password) return "";
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  let hash = "";
  for (let i = 0; i < digest.length; i++) {
    let byte = digest[i];
    if (byte < 0) byte += 256;
    let bStr = byte.toString(16);
    if (bStr.length === 1) bStr = "0" + bStr;
    hash += bStr;
  }
  return hash;
}

/**
 * สร้าง Random Token สำหรับยืนยันอีเมล
 */
function generateToken() {
  return "tk_" + Utilities.getUuid().split("-")[0] + Math.random().toString(36).substring(7);
}

/**
 * สุ่มรหัสผ่านเริ่มต้น (6 หลัก)
 */
function generateRandomPassword() {
  return Math.random().toString(36).substring(2, 8);
}
