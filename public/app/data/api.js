import { GAS_URL } from "../config.js";
import { gasJsonp } from "./gas_jsonp.js";

const CLIENT_CACHE = new Map();

function stableSerialize(obj) {
  if (!obj || typeof obj !== "object") return JSON.stringify(obj ?? null);
  const keys = Object.keys(obj).sort();
  const out = {};
  keys.forEach((k) => {
    out[k] = obj[k];
  });
  return JSON.stringify(out);
}

function cacheKey(action, params = {}) {
  return `${action}::${stableSerialize(params)}`;
}

function readCache(action, params, ttlMs) {
  const key = cacheKey(action, params);
  const hit = CLIENT_CACHE.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > ttlMs) return null;
  return hit.value;
}

function writeCache(action, params, value) {
  const key = cacheKey(action, params);
  CLIENT_CACHE.set(key, { ts: Date.now(), value });
}

function invalidateByPrefix(prefixes = []) {
  const list = Array.isArray(prefixes) ? prefixes : [prefixes];
  for (const key of CLIENT_CACHE.keys()) {
    if (list.some((prefix) => key.startsWith(prefix))) {
      CLIENT_CACHE.delete(key);
    }
  }
}

function readAuthSession() {
  const local = window.localStorage.getItem("smartlib.auth");
  const session = window.sessionStorage.getItem("smartlib.auth");
  const raw = local || session;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function withAuth(payload = {}) {
  return {
    ...payload,
    auth: readAuthSession(),
  };
}

function withSlimAuth(payload = {}) {
  const auth = readAuthSession();
  const uid = String(auth?.uid || auth?.user?.uid || "").trim();
  const slimAuth = uid
    ? {
        uid,
        user: { uid },
      }
    : auth;
  return {
    ...payload,
    auth: slimAuth,
  };
}

async function cachedGasJsonp(action, params = {}, ttlMs = 60_000) {
  const cached = readCache(action, params, ttlMs);
  if (cached) return cached;
  const fresh = await gasJsonp(GAS_URL, { action, ...params });
  if (fresh?.ok) writeCache(action, params, fresh);
  return fresh;
}

export function apiPing() {
  return gasJsonp(GAS_URL, { action: "ping" });
}

export function apiList() {
  return gasJsonp(GAS_URL, { action: "list" });
}

export function apiGet(key) {
  return gasJsonp(GAS_URL, { action: "get", key });
}

export function apiSet(key, value) {
  return gasJsonp(GAS_URL, { action: "set", key, value });
}

export function apiDelete(key) {
  return gasJsonp(GAS_URL, { action: "delete", key });
}

export function apiSignin({ email, password }) {
  return gasJsonp(GAS_URL, {
    action: "signin",
    email,
    password,
  });
}

export function apiSignupRequest(payload) {
  return gasJsonp(GAS_URL, {
    action: "signup_request",
    payload: JSON.stringify(payload),
  });
}

export function apiUsersManageList(params = {}) {
  return cachedGasJsonp("users_manage_list", {
    payload: JSON.stringify(withAuth(params)),
  }, 20_000);
}

export function apiUsersManageGet(uid) {
  return cachedGasJsonp("users_manage_get", {
    payload: JSON.stringify(withAuth({ uid })),
  }, 20_000);
}

export function apiUsersManageUpdate(payload) {
  invalidateByPrefix(["users_manage_list::", "users_manage_get::", "manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "users_manage_update",
    payload: JSON.stringify(withAuth(payload)),
  });
}

export function apiUsersManageCreate(payload) {
  invalidateByPrefix(["users_manage_list::", "users_manage_get::", "manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "users_manage_create",
    payload: JSON.stringify(withAuth(payload)),
  });
}

export function apiUsersManageArchive(uid) {
  invalidateByPrefix(["users_manage_list::", "users_manage_get::", "manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "users_manage_archive",
    payload: JSON.stringify(withAuth({ uid })),
  });
}

export function apiUsersImportPreview(rows = []) {
  return gasJsonp(GAS_URL, {
    action: "users_import_preview",
    payload: JSON.stringify(withAuth({ rows })),
  });
}

export function apiUsersImportApply(rows = [], mode = "skip") {
  invalidateByPrefix(["users_manage_list::", "users_manage_get::", "manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "users_import_apply",
    payload: JSON.stringify(withAuth({ rows, mode })),
  });
}

export function apiAnnouncementList(params = {}) {
  return cachedGasJsonp("announcement_list", params, 45_000);
}

export function apiAnnouncementCreate(payload) {
  invalidateByPrefix(["announcement_list::"]);
  return gasJsonp(GAS_URL, {
    action: "announcement_create",
    payload: JSON.stringify(payload),
  });
}

export function apiAnnouncementUpdate(id, payload) {
  invalidateByPrefix(["announcement_list::"]);
  return gasJsonp(GAS_URL, {
    action: "announcement_update",
    payload: JSON.stringify({ id, ...payload }),
  });
}

export function apiAnnouncementArchive(id) {
  invalidateByPrefix(["announcement_list::"]);
  return gasJsonp(GAS_URL, {
    action: "announcement_archive",
    payload: JSON.stringify({ id }),
  });
}

export function apiAnnouncementView(id) {
  invalidateByPrefix(["announcement_list::"]);
  return gasJsonp(GAS_URL, {
    action: "announcement_view",
    payload: JSON.stringify({ id }),
  });
}

export function apiBooksCatalogList(params = {}) {
  return cachedGasJsonp("books_catalog_list", params, 60_000);
}

export function apiBooksCatalogGet(params = {}) {
  return cachedGasJsonp("books_catalog_get", params, 60_000);
}

export function apiBooksCatalogCreate(payload) {
  invalidateByPrefix(["books_catalog_list::", "books_catalog_get::", "book_items_list::", "manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "books_catalog_create",
    payload: JSON.stringify(payload),
  });
}

export function apiBooksCatalogUpdate(bookId, payload) {
  invalidateByPrefix(["books_catalog_list::", "books_catalog_get::", "book_items_list::", "manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "books_catalog_update",
    payload: JSON.stringify({ bookId, ...payload }),
  });
}

export function apiBooksCatalogArchive(bookId) {
  invalidateByPrefix(["books_catalog_list::", "books_catalog_get::", "book_items_list::", "manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "books_catalog_archive",
    payload: JSON.stringify({ bookId }),
  });
}

export function apiBooksCatalogUnarchive(bookId) {
  invalidateByPrefix(["books_catalog_list::", "books_catalog_get::", "book_items_list::", "manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "books_catalog_unarchive",
    payload: JSON.stringify({ bookId }),
  });
}

export function apiBookItemsAddCopies(payload) {
  invalidateByPrefix(["books_catalog_list::", "books_catalog_get::", "book_items_list::", "manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "book_items_add_copies",
    payload: JSON.stringify(payload),
  });
}

export function apiBookItemsList(params = {}) {
  return cachedGasJsonp("book_items_list", params, 45_000);
}

export function apiBookItemUpdateStatus(payload) {
  invalidateByPrefix(["books_catalog_list::", "books_catalog_get::", "book_items_list::", "manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "book_item_update_status",
    payload: JSON.stringify(payload),
  });
}

export function apiSettingsLocationsList(params = {}) {
  return cachedGasJsonp("settings_locations_list", {
    payload: JSON.stringify(withAuth(params)),
  }, 30_000);
}

export function apiSettingsLocationsCreate(payload) {
  invalidateByPrefix(["settings_locations_list::"]);
  return gasJsonp(GAS_URL, {
    action: "settings_locations_create",
    payload: JSON.stringify(withAuth(payload)),
  });
}

export function apiSettingsLocationsUpdate(id, payload) {
  invalidateByPrefix(["settings_locations_list::"]);
  return gasJsonp(GAS_URL, {
    action: "settings_locations_update",
    payload: JSON.stringify(withAuth({ id, ...payload })),
  });
}

export function apiSettingsLocationsDelete(id, updatedAt) {
  invalidateByPrefix(["settings_locations_list::"]);
  return gasJsonp(GAS_URL, {
    action: "settings_locations_delete",
    payload: JSON.stringify(withAuth({ id, updated_at: updatedAt })),
  });
}

export function apiSettingsLocationsCheck(payload) {
  return gasJsonp(GAS_URL, {
    action: "settings_locations_check",
    payload: JSON.stringify(payload),
  });
}

export function apiPoliciesList(params = {}) {
  return cachedGasJsonp("policies_list", {
    payload: JSON.stringify(withAuth(params)),
  }, 30_000);
}

export function apiPoliciesUpsert(items = []) {
  invalidateByPrefix(["policies_list::"]);
  return gasJsonp(GAS_URL, {
    action: "policies_upsert",
    payload: JSON.stringify(withAuth({ items })),
  });
}

export function apiPoliciesResetDefaults() {
  invalidateByPrefix(["policies_list::"]);
  return gasJsonp(GAS_URL, {
    action: "policies_reset_defaults",
    payload: JSON.stringify(withAuth({})),
  });
}

export function apiLoansList(params = {}) {
  return cachedGasJsonp("loans_list", {
    payload: JSON.stringify(withAuth(params)),
  }, 15_000);
}

export function apiLoansCreate(payload) {
  invalidateByPrefix(["loans_list::", "fines_list::", "book_items_list::", "books_catalog_get::", "books_catalog_list::", "manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "loans_create",
    payload: JSON.stringify(withAuth(payload)),
  });
}

export function apiLoansReturn(payload) {
  invalidateByPrefix(["loans_list::", "fines_list::", "book_items_list::", "books_catalog_get::", "books_catalog_list::", "manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "loans_return",
    payload: JSON.stringify(withAuth(payload)),
  });
}

export function apiLoansSelfCreate(payload) {
  invalidateByPrefix(["loans_list::", "fines_list::", "book_items_list::", "books_catalog_get::", "books_catalog_list::", "manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "loans_self_create",
    payload: JSON.stringify(withAuth(payload)),
  });
}

export function apiLoansSelfBootstrap() {
  return gasJsonp(GAS_URL, {
    action: "loans_self_bootstrap",
    payload: JSON.stringify(withAuth({})),
  });
}

export function apiLoansSelfValidate(payload) {
  return gasJsonp(GAS_URL, {
    action: "loans_self_validate",
    payload: JSON.stringify(withAuth(payload)),
  });
}

export function apiLoansSelfReturn(payload) {
  invalidateByPrefix(["loans_list::", "fines_list::", "book_items_list::", "books_catalog_get::", "books_catalog_list::", "manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "loans_self_return",
    payload: JSON.stringify(withAuth(payload)),
  });
}

export function apiLoansRenew(payload) {
  invalidateByPrefix(["loans_list::", "fines_list::", "manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "loans_renew",
    payload: JSON.stringify(withAuth(payload)),
  });
}

export function apiLoansRunOverdueCheck() {
  invalidateByPrefix(["loans_list::", "fines_list::", "manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "loans_run_overdue_check",
    payload: JSON.stringify(withAuth({})),
  });
}

export function apiManageDashboardStats(params = {}) {
  return cachedGasJsonp("manage_dashboard_stats", {
    payload: JSON.stringify(withAuth(params)),
  }, 300_000);
}

export function apiSettingsLibraryHoursList(params = {}) {
  return cachedGasJsonp("settings_library_hours_list", {
    payload: JSON.stringify(withAuth(params)),
  }, 30_000);
}

export function apiSettingsLibraryHoursUpsert(items = []) {
  invalidateByPrefix(["settings_library_hours_list::"]);
  return gasJsonp(GAS_URL, {
    action: "settings_library_hours_upsert",
    payload: JSON.stringify(withAuth({ items })),
  });
}

export function apiSettingsLibraryExceptionsList(params = {}) {
  return cachedGasJsonp("settings_library_exceptions_list", {
    payload: JSON.stringify(withAuth(params)),
  }, 30_000);
}

export function apiSettingsLibraryExceptionsUpsert(payload) {
  invalidateByPrefix(["settings_library_exceptions_list::"]);
  return gasJsonp(GAS_URL, {
    action: "settings_library_exceptions_upsert",
    payload: JSON.stringify(withAuth(payload)),
  });
}

export function apiSettingsLibraryExceptionsDelete(date) {
  invalidateByPrefix(["settings_library_exceptions_list::"]);
  return gasJsonp(GAS_URL, {
    action: "settings_library_exceptions_delete",
    payload: JSON.stringify(withAuth({ date })),
  });
}

export function apiSettingsLibraryRuntimeGet(params = {}) {
  return cachedGasJsonp("settings_library_runtime_get", {
    payload: JSON.stringify(withAuth(params)),
  }, 30_000);
}

export function apiSettingsLibraryRuntimeUpsert(payload) {
  invalidateByPrefix(["settings_library_runtime_get::"]);
  return gasJsonp(GAS_URL, {
    action: "settings_library_runtime_upsert",
    payload: JSON.stringify(withAuth(payload)),
  });
}

export function apiVisitsGetCurrent(params = {}) {
  return gasJsonp(GAS_URL, {
    action: "visits_get_current",
    payload: JSON.stringify(withAuth(params)),
  });
}

export function apiVisitsCheckinStart(payload) {
  invalidateByPrefix(["loans_self_bootstrap::", "manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "visits_checkin_start",
    payload: JSON.stringify(withAuth(payload)),
  });
}

export function apiVisitsUpdateActivities(payload) {
  invalidateByPrefix(["loans_self_bootstrap::", "manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "visits_update_activities",
    payload: JSON.stringify(withAuth(payload)),
  });
}

export function apiVisitsCheckout(payload = {}) {
  invalidateByPrefix(["loans_self_bootstrap::", "manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "visits_checkout",
    payload: JSON.stringify(withAuth(payload)),
  });
}

export function apiVisitsActiveCount(params = {}) {
  return gasJsonp(GAS_URL, {
    action: "visits_active_count",
    payload: JSON.stringify(withAuth(params)),
  });
}

export function apiReservationsList(params = {}) {
  return gasJsonp(GAS_URL, {
    action: "reservations_list",
    payload: JSON.stringify(withAuth(params)),
  });
}

export function apiReservationsBookContext(payload) {
  return gasJsonp(GAS_URL, {
    action: "reservations_book_context",
    payload: JSON.stringify(withAuth(payload)),
  });
}

export function apiReservationsCreate(payload) {
  invalidateByPrefix(["books_catalog_get::", "books_catalog_list::", "book_items_list::", "manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "reservations_create",
    payload: JSON.stringify(withAuth(payload)),
  });
}

export function apiReservationsReschedule(payload) {
  invalidateByPrefix(["manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "reservations_reschedule",
    payload: JSON.stringify(withAuth(payload)),
  });
}

export function apiReservationsCancel(payload) {
  invalidateByPrefix(["books_catalog_get::", "books_catalog_list::", "book_items_list::", "manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "reservations_cancel",
    payload: JSON.stringify(withAuth(payload)),
  });
}

export function apiFinesList(params = {}) {
  return cachedGasJsonp("fines_list", {
    payload: JSON.stringify(withAuth(params)),
  }, 15_000);
}

export function apiFinesCreateManual(payload) {
  invalidateByPrefix(["fines_list::", "loans_list::", "manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "fines_create_manual",
    payload: JSON.stringify(withAuth(payload)),
  });
}

export function apiFinesPay(payload) {
  invalidateByPrefix(["fines_list::", "manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "fines_pay",
    payload: JSON.stringify(withAuth(payload)),
  });
}

export function apiFinesWaive(payload) {
  invalidateByPrefix(["fines_list::", "manage_dashboard_stats::"]);
  return gasJsonp(GAS_URL, {
    action: "fines_waive",
    payload: JSON.stringify(withAuth(payload)),
  });
}

export function apiProfileGet() {
  return cachedGasJsonp("profile_get", {
    payload: JSON.stringify(withAuth({})),
  }, 10_000);
}

export function apiProfileUpdateContact(payload) {
  invalidateByPrefix(["profile_get::"]);
  return gasJsonp(GAS_URL, {
    action: "profile_update_contact",
    payload: JSON.stringify(withAuth(payload)),
  });
}

export function apiProfileChangePassword(payload) {
  return gasJsonp(GAS_URL, {
    action: "profile_change_password",
    payload: JSON.stringify(withAuth(payload)),
  });
}

export function apiProfileUploadPhoto(payload) {
  invalidateByPrefix(["profile_get::"]);
  return gasJsonp(GAS_URL, {
    action: "profile_upload_photo",
    payload: JSON.stringify(withSlimAuth(payload)),
  });
}

export function apiProfileDeletePhoto() {
  invalidateByPrefix(["profile_get::"]);
  return gasJsonp(GAS_URL, {
    action: "profile_delete_photo",
    payload: JSON.stringify(withAuth({})),
  });
}

export function apiNotificationsList(params = {}) {
  return gasJsonp(GAS_URL, {
    action: "notifications_list",
    payload: JSON.stringify(withAuth(params)),
  });
}

export function apiNotificationsUnreadCount() {
  return gasJsonp(GAS_URL, {
    action: "notifications_unread_count",
    payload: JSON.stringify(withAuth({})),
  });
}

export function apiNotificationsMarkRead(notiId) {
  return gasJsonp(GAS_URL, {
    action: "notifications_mark_read",
    payload: JSON.stringify(withAuth({ notiId })),
  });
}

export function apiNotificationsMarkAllRead() {
  return gasJsonp(GAS_URL, {
    action: "notifications_mark_all_read",
    payload: JSON.stringify(withAuth({})),
  });
}
