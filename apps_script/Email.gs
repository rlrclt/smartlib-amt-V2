/**
 * Email.gs - จัดการการส่งอีเมลทั้งหมดของระบบ
 */

/**
 * ฟังก์ชันพื้นฐานสำหรับส่งอีเมล
 * @param {string} to อีเมลผู้รับ
 * @param {string} subject หัวข้ออีเมล
 * @param {string} body เนื้อหาอีเมล (HTML)
 */
function sendEmail(to, subject, body) {
  try {
    MailApp.sendEmail({
      to: to,
      subject: subject,
      htmlBody: body,
      name: "smartlib-amt System" // ชื่อผู้ส่งที่แสดงใน Inbox
    });
    Logger.log("ส่งเมลไปที่ " + to + " สำเร็จ");
    return true;
  } catch (e) {
    Logger.log("เกิดข้อผิดพลาดในการส่งเมล: " + e.message);
    return false;
  }
}

/**
 * ส่งอีเมลยืนยันตัวตน (Verification Email)
 * @param {string} to อีเมลผู้สมัคร
 * @param {string} displayName ชื่อผู้สมัคร
 * @param {string} verifyLink ลิงก์สำหรับคลิกยืนยัน
 */
function sendVerificationEmail(to, displayName, verifyLink) {
  const subject = "ยืนยันการสมัครสมาชิก - smartlib-amt";
  const safeName = escapeEmailHtml_(displayName);
  const safeLink = escapeEmailHtml_(verifyLink);
  const body = `
    <div style="font-family: 'Sarabun', sans-serif; line-height: 1.6; color: #333;">
      <h2>สวัสดีคุณ ${safeName}</h2>
      <p>ขอบคุณที่สนใจสมัครสมาชิกระบบห้องสมุด smartlib-amt</p>
      <p>กรุณาคลิกปุ่มด้านล่างนี้เพื่อยืนยันตัวตนและเปิดใช้งานบัญชีของคุณ:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${safeLink}" 
           style="background-color: #2563eb; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold;">
           ยืนยันตัวตนที่นี่
        </a>
      </div>
      <p style="color: #666; font-size: 12px;">หากคุณไม่ได้ทำการสมัครสมาชิก กรุณาเพิกเฉยต่ออีเมลฉบับนี้</p>
    </div>
  `;
  return sendEmail(to, subject, body);
}

function sendInitialPasswordEmail(to, displayName, password) {
  const subject = "รหัสผ่านเริ่มต้น - smartlib-amt";
  const safeName = escapeEmailHtml_(displayName);
  const safePassword = escapeEmailHtml_(password);
  const body = `
    <div style="font-family: 'Sarabun', sans-serif; line-height: 1.6; color: #333;">
      <h2>สวัสดีคุณ ${safeName}</h2>
      <p>บัญชีของคุณยืนยันอีเมลเรียบร้อยแล้ว</p>
      <p>รหัสผ่านเริ่มต้นของคุณคือ:</p>
      <div style="font-size: 24px; font-weight: bold; letter-spacing: 2px; background: #eff6ff; color: #1d4ed8; padding: 16px; border-radius: 10px; text-align: center;">
        ${safePassword}
      </div>
      <p>กรุณาเข้าสู่ระบบและเปลี่ยนรหัสผ่านเมื่อระบบตั้งค่าบัญชีพร้อมใช้งาน</p>
    </div>
  `;
  return sendEmail(to, subject, body);
}

function escapeEmailHtml_(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
