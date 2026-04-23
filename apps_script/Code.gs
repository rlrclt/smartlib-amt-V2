/**
 * Code.gs - ส่วนของ API และการทำงานหลักของ Web App
 * (ทำหน้าที่เป็น Router รับส่งข้อมูลผ่าน JSONP)
 */

function doGet(e) {
  const p = (e && e.parameter) || {};
  const callback = p.callback ? String(p.callback) : "";
  const action = String(p.action || "ping").toLowerCase();

  if (action === "verify_email") {
    try {
      return verifyEmailResponse_(verifyEmail_(p.token));
    } catch (err) {
      return verifyEmailResponse_({
        ok: false,
        message: String(err && err.message ? err.message : err)
      });
    }
  }

  try {
    if (action === "ping") {
      return jsonp_({ ok: true, data: { ts: new Date().toISOString() } }, callback);
    }

    if (action === "signup_request") {
      return jsonp_({ ok: true, data: signupRequest_(parsePayload_(p)) }, callback);
    }

    if (action === "signin") {
      return jsonp_({ ok: true, data: signinUser_({
        email: p.email,
        password: p.password
      }) }, callback);
    }

    if (action === "announcement_list") {
      return jsonp_({ ok: true, data: listAnnouncements_(p) }, callback);
    }

    if (action === "announcement_create") {
      return jsonp_({ ok: true, data: createAnnouncement_(parsePayload_(p)) }, callback);
    }

    if (action === "announcement_update") {
      return jsonp_({ ok: true, data: updateAnnouncement_(parsePayload_(p)) }, callback);
    }

    if (action === "announcement_archive") {
      return jsonp_({ ok: true, data: archiveAnnouncement_(parsePayload_(p)) }, callback);
    }

    if (action === "announcement_view") {
      return jsonp_({ ok: true, data: incrementAnnouncementView_(parsePayload_(p)) }, callback);
    }

    if (action === "books_catalog_list") {
      return jsonp_({ ok: true, data: booksCatalogList_(p) }, callback);
    }

    if (action === "books_catalog_get") {
      return jsonp_({ ok: true, data: booksCatalogGet_(p) }, callback);
    }

    if (action === "books_catalog_create") {
      return jsonp_({ ok: true, data: booksCatalogCreate_(parsePayload_(p)) }, callback);
    }

    if (action === "books_catalog_update") {
      return jsonp_({ ok: true, data: booksCatalogUpdate_(parsePayload_(p)) }, callback);
    }

    if (action === "books_catalog_archive") {
      return jsonp_({ ok: true, data: booksCatalogArchive_(parsePayload_(p)) }, callback);
    }

    if (action === "books_catalog_unarchive") {
      return jsonp_({ ok: true, data: booksCatalogUnarchive_(parsePayload_(p)) }, callback);
    }

    if (action === "book_items_add_copies") {
      return jsonp_({ ok: true, data: bookItemsAddCopies_(parsePayload_(p)) }, callback);
    }

    if (action === "book_items_list") {
      return jsonp_({ ok: true, data: bookItemsList_(p) }, callback);
    }

    if (action === "book_item_update_status") {
      return jsonp_({ ok: true, data: bookItemUpdateStatus_(parsePayload_(p)) }, callback);
    }

    return jsonp_({ ok: false, error: "unknown action: " + action }, callback);
  } catch (err) {
    return jsonp_({ ok: false, error: String(err && err.message ? err.message : err) }, callback);
  }
}

function parsePayload_(p) {
  if (!p.payload) return p;
  try {
    return JSON.parse(String(p.payload));
  } catch (err) {
    throw new Error("payload JSON ไม่ถูกต้อง");
  }
}

/**
 * ฟังก์ชันสำหรับแปลงเป็น JSONP
 */
function jsonp_(payload, callback) {
  const json = JSON.stringify(payload);
  if (callback) {
    return ContentService.createTextOutput(callback + "(" + json + ");").setMimeType(
      ContentService.MimeType.JAVASCRIPT
    );
  }
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function verifyEmailResponse_(result) {
  const title = result && result.ok ? "ยืนยันอีเมลสำเร็จ" : "ยืนยันอีเมลไม่สำเร็จ";
  const message = result && result.message ? result.message : "ไม่สามารถยืนยันอีเมลได้";
  const html = `
    <!doctype html>
    <html lang="th">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${title}</title>
        <style>
          body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Arial, sans-serif; background: #f7fbff; color: #0f172a; }
          main { width: min(560px, calc(100vw - 32px)); padding: 32px; border: 1px solid #dbeafe; border-radius: 20px; background: white; box-shadow: 0 24px 60px rgba(59, 130, 246, .12); }
          h1 { margin: 0 0 12px; font-size: 28px; }
          p { margin: 0 0 24px; color: #475569; line-height: 1.6; }
          a { display: inline-block; padding: 12px 18px; border-radius: 12px; background: #2563eb; color: white; text-decoration: none; font-weight: 700; }
        </style>
      </head>
      <body>
        <main>
          <h1>${escapeHtml_(title)}</h1>
          <p>${escapeHtml_(message)}</p>
          <a href="https://smartlib-amt-v2.web.app/signin">ไปหน้าเข้าสู่ระบบ</a>
        </main>
      </body>
    </html>
  `;
  return HtmlService.createHtmlOutput(html).setTitle(title);
}

function escapeHtml_(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
