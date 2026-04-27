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

    if (action === "users_manage_list") {
      return jsonp_({ ok: true, data: usersManageList_(parsePayload_(p)) }, callback);
    }

    if (action === "users_manage_get") {
      return jsonp_({ ok: true, data: usersManageGet_(parsePayload_(p)) }, callback);
    }

    if (action === "users_manage_update") {
      return jsonp_({ ok: true, data: usersManageUpdate_(parsePayload_(p)) }, callback);
    }

    if (action === "users_manage_create") {
      return jsonp_({ ok: true, data: usersManageCreate_(parsePayload_(p)) }, callback);
    }

    if (action === "users_manage_archive") {
      return jsonp_({ ok: true, data: usersManageArchive_(parsePayload_(p)) }, callback);
    }

    if (action === "users_import_preview") {
      return jsonp_({ ok: true, data: usersImportPreview_(parsePayload_(p)) }, callback);
    }

    if (action === "users_import_apply") {
      return jsonp_({ ok: true, data: usersImportApply_(parsePayload_(p)) }, callback);
    }

    if (action === "profile_get") {
      return jsonp_({ ok: true, data: profileGet_(parsePayload_(p)) }, callback);
    }

    if (action === "profile_update_contact") {
      return jsonp_({ ok: true, data: profileUpdateContact_(parsePayload_(p)) }, callback);
    }

    if (action === "profile_change_password") {
      return jsonp_({ ok: true, data: profileChangePassword_(parsePayload_(p)) }, callback);
    }

    if (action === "profile_upload_photo") {
      return jsonp_({ ok: true, data: profileUploadPhoto_(parsePayload_(p)) }, callback);
    }

    if (action === "notifications_list") {
      return jsonp_({ ok: true, data: notificationsList_(parsePayload_(p)) }, callback);
    }

    if (action === "notifications_unread_count") {
      return jsonp_({ ok: true, data: notificationsUnreadCount_(parsePayload_(p)) }, callback);
    }

    if (action === "notifications_mark_read") {
      return jsonp_({ ok: true, data: notificationsMarkRead_(parsePayload_(p)) }, callback);
    }

    if (action === "notifications_mark_all_read") {
      return jsonp_({ ok: true, data: notificationsMarkAllRead_(parsePayload_(p)) }, callback);
    }

    if (action === "notifications_cleanup") {
      return jsonp_({ ok: true, data: notificationsCleanup_(parsePayload_(p)) }, callback);
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

    if (action === "settings_locations_list") {
      return jsonp_({ ok: true, data: settingsLocationsList_(parsePayload_(p)) }, callback);
    }

    if (action === "settings_locations_create") {
      return jsonp_({ ok: true, data: settingsLocationsCreate_(parsePayload_(p)) }, callback);
    }

    if (action === "settings_locations_update") {
      return jsonp_({ ok: true, data: settingsLocationsUpdate_(parsePayload_(p)) }, callback);
    }

    if (action === "settings_locations_delete") {
      return jsonp_({ ok: true, data: settingsLocationsDelete_(parsePayload_(p)) }, callback);
    }

    if (action === "settings_locations_check") {
      return jsonp_({ ok: true, data: settingsLocationsCheck_(parsePayload_(p)) }, callback);
    }

    if (action === "settings_library_hours_list") {
      return jsonp_({ ok: true, data: settingsLibraryHoursList_(parsePayload_(p)) }, callback);
    }

    if (action === "settings_library_hours_upsert") {
      return jsonp_({ ok: true, data: settingsLibraryHoursUpsert_(parsePayload_(p)) }, callback);
    }

    if (action === "settings_library_exceptions_list") {
      return jsonp_({ ok: true, data: settingsLibraryExceptionsList_(parsePayload_(p)) }, callback);
    }

    if (action === "settings_library_exceptions_upsert") {
      return jsonp_({ ok: true, data: settingsLibraryExceptionsUpsert_(parsePayload_(p)) }, callback);
    }

    if (action === "settings_library_exceptions_delete") {
      return jsonp_({ ok: true, data: settingsLibraryExceptionsDelete_(parsePayload_(p)) }, callback);
    }

    if (action === "settings_library_runtime_get") {
      return jsonp_({ ok: true, data: settingsLibraryRuntimeGet_(parsePayload_(p)) }, callback);
    }

    if (action === "settings_library_runtime_upsert") {
      return jsonp_({ ok: true, data: settingsLibraryRuntimeUpsert_(parsePayload_(p)) }, callback);
    }

    if (action === "visits_get_current") {
      return jsonp_({ ok: true, data: visitsGetCurrent_(parsePayload_(p)) }, callback);
    }

    if (action === "visits_checkin_start") {
      return jsonp_({ ok: true, data: visitsCheckinStart_(parsePayload_(p)) }, callback);
    }

    if (action === "visits_update_activities") {
      return jsonp_({ ok: true, data: visitsUpdateActivities_(parsePayload_(p)) }, callback);
    }

    if (action === "visits_checkout") {
      return jsonp_({ ok: true, data: visitsCheckout_(parsePayload_(p)) }, callback);
    }

    if (action === "visits_active_count") {
      return jsonp_({ ok: true, data: visitsActiveCount_(parsePayload_(p)) }, callback);
    }

    if (action === "visits_auto_close_run") {
      return jsonp_({ ok: true, data: visitsAutoCloseRun_(parsePayload_(p)) }, callback);
    }

    if (action === "policies_list") {
      return jsonp_({ ok: true, data: policiesList_(parsePayload_(p)) }, callback);
    }

    if (action === "policies_upsert") {
      return jsonp_({ ok: true, data: policiesUpsert_(parsePayload_(p)) }, callback);
    }

    if (action === "policies_reset_defaults") {
      return jsonp_({ ok: true, data: policiesResetDefaults_(parsePayload_(p)) }, callback);
    }

    if (action === "loans_list") {
      return jsonp_({ ok: true, data: loansList_(parsePayload_(p)) }, callback);
    }

    if (action === "loans_create") {
      return jsonp_({ ok: true, data: loansCreate_(parsePayload_(p)) }, callback);
    }

    if (action === "loans_self_create") {
      return jsonp_({ ok: true, data: loansSelfCreate_(parsePayload_(p)) }, callback);
    }

    if (action === "loans_self_bootstrap") {
      return jsonp_({ ok: true, data: loansSelfBootstrap_(parsePayload_(p)) }, callback);
    }

    if (action === "loans_self_validate") {
      return jsonp_({ ok: true, data: loansSelfValidate_(parsePayload_(p)) }, callback);
    }

    if (action === "loans_return") {
      return jsonp_({ ok: true, data: loansReturn_(parsePayload_(p)) }, callback);
    }

    if (action === "loans_self_return") {
      return jsonp_({ ok: true, data: loansSelfReturn_(parsePayload_(p)) }, callback);
    }

    if (action === "loans_renew") {
      return jsonp_({ ok: true, data: loansRenew_(parsePayload_(p)) }, callback);
    }

    if (action === "loans_run_overdue_check") {
      return jsonp_({ ok: true, data: loansRunOverdueCheck_(parsePayload_(p)) }, callback);
    }

    if (action === "reservations_list") {
      return jsonp_({ ok: true, data: reservationsList_(parsePayload_(p)) }, callback);
    }

    if (action === "reservations_book_context") {
      return jsonp_({ ok: true, data: reservationsBookContext_(parsePayload_(p)) }, callback);
    }

    if (action === "reservations_create") {
      return jsonp_({ ok: true, data: reservationsCreate_(parsePayload_(p)) }, callback);
    }

    if (action === "reservations_reschedule") {
      return jsonp_({ ok: true, data: reservationsReschedule_(parsePayload_(p)) }, callback);
    }

    if (action === "reservations_cancel") {
      return jsonp_({ ok: true, data: reservationsCancel_(parsePayload_(p)) }, callback);
    }

    if (action === "reservations_run_daily") {
      return jsonp_({ ok: true, data: reservationsRunDaily_(parsePayload_(p)) }, callback);
    }

    if (action === "fines_list") {
      return jsonp_({ ok: true, data: finesList_(parsePayload_(p)) }, callback);
    }

    if (action === "fines_create_manual") {
      return jsonp_({ ok: true, data: finesCreateManual_(parsePayload_(p)) }, callback);
    }

    if (action === "fines_pay") {
      return jsonp_({ ok: true, data: finesPay_(parsePayload_(p)) }, callback);
    }

    if (action === "fines_waive") {
      return jsonp_({ ok: true, data: finesWaive_(parsePayload_(p)) }, callback);
    }

    if (action === "manage_dashboard_stats") {
      return jsonp_({ ok: true, data: manageDashboardStats_(parsePayload_(p)) }, callback);
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
