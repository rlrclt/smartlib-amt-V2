import {
  apiAnnouncementList,
  apiBooksCatalogList,
  apiFinesList,
  apiLoansList,
  apiLoansSelfBootstrap,
  apiReservationsList,
  apiProfileGet,
  apiStatePing,
  apiSyncAuditLog,
  apiSettingsLibraryHoursList,
} from "./api.js";
import { store } from "../state/store.js";

const POLL_MS_CRITICAL = 15_000;
const POLL_MS_SECONDARY = 45_000;
const POLL_MS_HEAVY = 60_000;
const THROTTLE_MS = 5_000;
const CATALOG_PAGE_SIZE = 120;
const MAX_CATALOG_PAGES = 10;
const JITTER_MS_MAX = 1_200;
const BACKOFF_BASE_MS = 5_000;
const BACKOFF_MAX_MS = 60_000;
const RECENT_REASON_WINDOW_MS = 1_500;

export const MEMBER_SYNC_KEYS = {
  dashboard: "member_sync:dashboard",
  books: "member_sync:books",
  loans: "member_sync:loans",
  fines: "member_sync:fines",
  reservations: "member_sync:reservations",
  profile: "member_sync:profile",
  loanSelf: "member_sync:loan_self",
};

const _timers = new Map();
const _inFlight = new Map();
const _backoffState = new Map();
const _recentReasonAt = new Map();
const _routeSync = {
  pathname: "",
  activeKeys: [],
};
let _running = false;
const LOG_PREFIX = "[MemberSync]";
const AUDIT_PREFIX = "[MemberSyncAudit]";

function normalizeText_(value) {
  return String(value || "").trim();
}

function categoryLabel_(raw) {
  const normalized = normalizeText_(raw);
  return normalized || "ทั่วไป";
}

function defaultBusinessHours_() {
  return "จันทร์ - ศุกร์ | 08:30 - 16:30 น.";
}

function formatBusinessHours_(items = []) {
  if (!Array.isArray(items) || !items.length) return defaultBusinessHours_();
  const openRows = items.filter((x) => String(x?.status || "").toLowerCase() !== "closed");
  if (!openRows.length) return defaultBusinessHours_();
  const first = openRows[0] || {};
  return `${String(first.dayLabel || first.day || "จันทร์ - ศุกร์")} | ${String(first.open || "08:30")} - ${String(first.close || "16:30")} น.`;
}

function subscribeKey_(key, listener) {
  return store.subscribe(key, listener);
}

function getKeyData(key) {
  return store.get(key);
}

function markLastFetch_(key) {
  store.set(`_last_fetch:${key}`, Date.now());
}

function logInfo_(message, meta = null) {
  if (meta) {
    console.log(`${LOG_PREFIX} ${message}`, meta);
    return;
  }
  console.log(`${LOG_PREFIX} ${message}`);
}

function logWarn_(message, meta = null) {
  if (meta) {
    console.warn(`${LOG_PREFIX} ${message}`, meta);
    return;
  }
  console.warn(`${LOG_PREFIX} ${message}`);
}

function sendSyncAudit_(payload = {}) {
  const sent = apiStatePing(payload);
  if (sent) return;
  apiSyncAuditLog(payload).catch((err) => {
    console.warn(`${AUDIT_PREFIX} failed`, { error: err?.message || "audit failed" });
  });
}

function shouldFetch_(key, force = false) {
  if (force) return true;
  const lastFetch = Number(store.get(`_last_fetch:${key}`) || 0);
  return Date.now() - lastFetch > THROTTLE_MS;
}

function jitterMs_() {
  return Math.floor(Math.random() * JITTER_MS_MAX);
}

function getRouteKeyConfig_(pathname) {
  const path = String(pathname || "/");
  if (path === "/app/books") {
    return [
      { key: MEMBER_SYNC_KEYS.books, tier: "critical" },
      { key: MEMBER_SYNC_KEYS.reservations, tier: "secondary" },
      { key: MEMBER_SYNC_KEYS.profile, tier: "secondary" },
    ];
  }
  if (path === "/app/loans") {
    return [
      { key: MEMBER_SYNC_KEYS.loans, tier: "critical" },
      { key: MEMBER_SYNC_KEYS.fines, tier: "secondary" },
    ];
  }
  if (path === "/app/fines") {
    return [
      { key: MEMBER_SYNC_KEYS.fines, tier: "critical" },
      { key: MEMBER_SYNC_KEYS.profile, tier: "secondary" },
    ];
  }
  if (path === "/app/reservations") {
    return [
      { key: MEMBER_SYNC_KEYS.reservations, tier: "critical" },
      { key: MEMBER_SYNC_KEYS.books, tier: "secondary" },
    ];
  }
  if (path === "/app/profile" || path === "/profile" || path === "/profile/edit" || path === "/profile/change-password") {
    return [
      { key: MEMBER_SYNC_KEYS.profile, tier: "critical" },
      { key: MEMBER_SYNC_KEYS.fines, tier: "secondary" },
    ];
  }
  if (path === "/app/member-card") {
    return [
      { key: MEMBER_SYNC_KEYS.profile, tier: "critical" },
      { key: MEMBER_SYNC_KEYS.loans, tier: "secondary" },
    ];
  }
  if (path === "/app/loan-self") {
    return [
      { key: MEMBER_SYNC_KEYS.loanSelf, tier: "critical" },
      { key: MEMBER_SYNC_KEYS.books, tier: "secondary" },
      { key: MEMBER_SYNC_KEYS.profile, tier: "secondary" },
    ];
  }
  if (path === "/app/checkin") {
    return [
      { key: MEMBER_SYNC_KEYS.books, tier: "critical" },
      { key: MEMBER_SYNC_KEYS.loanSelf, tier: "heavy" },
      { key: MEMBER_SYNC_KEYS.profile, tier: "secondary" },
    ];
  }
  if (path === "/app") {
    return [
      { key: MEMBER_SYNC_KEYS.dashboard, tier: "critical" },
      { key: MEMBER_SYNC_KEYS.loans, tier: "secondary" },
      { key: MEMBER_SYNC_KEYS.fines, tier: "secondary" },
      { key: MEMBER_SYNC_KEYS.reservations, tier: "secondary" },
    ];
  }
  return [
    { key: MEMBER_SYNC_KEYS.dashboard, tier: "critical" },
    { key: MEMBER_SYNC_KEYS.profile, tier: "secondary" },
  ];
}

function pollMsByTier_(tier) {
  if (tier === "critical") return POLL_MS_CRITICAL;
  if (tier === "heavy") return POLL_MS_HEAVY;
  return POLL_MS_SECONDARY;
}

function getBackoffState_(key) {
  return _backoffState.get(key) || { failCount: 0, nextAllowedAt: 0 };
}

function setBackoffSuccess_(key) {
  _backoffState.set(key, { failCount: 0, nextAllowedAt: 0 });
}

function setBackoffFail_(key) {
  const prev = getBackoffState_(key);
  const failCount = prev.failCount + 1;
  const backoffMs = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * (2 ** (failCount - 1)));
  _backoffState.set(key, {
    failCount,
    nextAllowedAt: Date.now() + backoffMs,
  });
  return { failCount, backoffMs };
}

function shouldSkipByBackoff_(key, reason) {
  if (reason === "mutation" || reason === "manual") return { skip: false, backoffMs: 0, attempt: 0 };
  const state = getBackoffState_(key);
  const remain = state.nextAllowedAt - Date.now();
  if (remain > 0) return { skip: true, backoffMs: remain, attempt: state.failCount + 1 };
  return { skip: false, backoffMs: 0, attempt: state.failCount + 1 };
}

function isRecentReasonDup_(key, reason) {
  const reasonKey = `${key}::${reason}`;
  const lastAt = Number(_recentReasonAt.get(reasonKey) || 0);
  if (Date.now() - lastAt < RECENT_REASON_WINDOW_MS) return true;
  _recentReasonAt.set(reasonKey, Date.now());
  return false;
}

async function fetchDashboardBundle_() {
  const [profileRes, annRes, loansRes, finesRes] = await Promise.all([
    apiProfileGet(),
    apiAnnouncementList({ page: 1, limit: 3 }, { bypassCache: true }),
    apiLoansList({ status: "all", page: 1, limit: 100 }, { bypassCache: true }),
    apiFinesList({ status: "unpaid", page: 1, limit: 100 }),
  ]);
  if (!profileRes?.ok) throw new Error(profileRes?.error || "โหลดโปรไฟล์ไม่สำเร็จ");
  return {
    profileRes,
    annRes,
    loansRes,
    finesRes,
    updatedAt: Date.now(),
  };
}

async function fetchBooksBundle_() {
  const hoursPromise = apiSettingsLibraryHoursList({}, { bypassCache: true }).catch(() => null);
  const all = [];
  for (let page = 1; page <= MAX_CATALOG_PAGES; page += 1) {
    const res = await apiBooksCatalogList({
      status: "active",
      page,
      limit: CATALOG_PAGE_SIZE,
    }, { bypassCache: true });
    if (!res?.ok) throw new Error(res?.error || "โหลดคลังหนังสือไม่สำเร็จ");
    const items = Array.isArray(res.data?.items) ? res.data.items : [];
    all.push(...items);
    if (!res.data?.hasMore || items.length === 0) break;
  }

  const catMap = new Map();
  all.forEach((item) => {
    const raw = categoryLabel_(item?.category);
    const key = normalizeText_(raw).toLowerCase();
    if (!key || catMap.has(key)) return;
    catMap.set(key, raw);
  });
  const categories = Array.from(catMap.values()).sort((a, b) =>
    String(a).localeCompare(String(b), "th"),
  );

  const hoursRes = await hoursPromise;
  const businessHours = hoursRes?.ok
    ? formatBusinessHours_(Array.isArray(hoursRes.data?.items) ? hoursRes.data.items : [])
    : defaultBusinessHours_();

  return {
    catalog: all,
    categories,
    businessHours,
    updatedAt: Date.now(),
  };
}

async function fetchLoansBundle_() {
  const [loansRes, finesRes, bootstrapRes] = await Promise.all([
    apiLoansList({ status: "all", page: 1, limit: 120 }, { bypassCache: true }),
    apiFinesList({ status: "unpaid", page: 1, limit: 100 }, { bypassCache: true }),
    apiLoansSelfBootstrap(),
  ]);
  if (!loansRes?.ok) throw new Error(loansRes?.error || "โหลดรายการยืมไม่สำเร็จ");
  if (!finesRes?.ok) throw new Error(finesRes?.error || "โหลดค่าปรับไม่สำเร็จ");
  return {
    loanItems: Array.isArray(loansRes.data?.items) ? loansRes.data.items : [],
    unpaidFines: Array.isArray(finesRes.data?.items) ? finesRes.data.items : [],
    policy: bootstrapRes?.ok ? (bootstrapRes.data?.policy || null) : null,
    updatedAt: Date.now(),
  };
}

async function fetchFinesBundle_() {
  const res = await apiFinesList({
    status: "all",
    page: 1,
    limit: 200,
  }, { bypassCache: true });
  if (!res?.ok) throw new Error(res?.error || "โหลดรายการค่าปรับไม่สำเร็จ");
  return {
    items: Array.isArray(res.data?.items) ? res.data.items : [],
    updatedAt: Date.now(),
  };
}

async function fetchReservationsBundle_() {
  const [reservationsRes, hoursRes] = await Promise.all([
    apiReservationsList({ filter: "all" }, { bypassCache: true }),
    apiSettingsLibraryHoursList({}, { bypassCache: true }).catch(() => null),
  ]);
  if (!reservationsRes?.ok) throw new Error(reservationsRes?.error || "โหลดรายการจองไม่สำเร็จ");
  const data = reservationsRes.data || {};
  return {
    reservations: Array.isArray(data.items) ? data.items : [],
    policy: data.policy || null,
    businessHours: hoursRes?.ok
      ? formatBusinessHours_(Array.isArray(hoursRes.data?.items) ? hoursRes.data.items : [])
      : defaultBusinessHours_(),
    updatedAt: Date.now(),
  };
}

async function fetchProfileBundle_() {
  const [profileRes, fineRes] = await Promise.all([
    apiProfileGet({ bypassCache: true }),
    apiFinesList({ status: "all", page: 1, limit: 100 }, { bypassCache: true }),
  ]);
  if (!profileRes?.ok) throw new Error(profileRes?.error || "โหลดข้อมูลโปรไฟล์ไม่สำเร็จ");
  return {
    profile: profileRes.data?.profile || {},
    stats: profileRes.data?.stats || {},
    fineItems: fineRes?.ok && Array.isArray(fineRes.data?.items) ? fineRes.data.items : [],
    updatedAt: Date.now(),
  };
}

async function fetchLoanSelfBundle_() {
  const res = await apiLoansSelfBootstrap({ bypassCache: true });
  if (!res?.ok) throw new Error(res?.error || "โหลดข้อมูลยืม-คืนด้วยตนเองไม่สำเร็จ");
  return {
    policy: res.data?.policy || null,
    quota: res.data?.quota || null,
    visit: res.data?.visit || { required: true, active: false, session: null },
    activeLoans: Array.isArray(res.data?.activeLoans) ? res.data.activeLoans : [],
    updatedAt: Date.now(),
  };
}

async function revalidateKey_(key, fetcher, { force = false, reason = "manual" } = {}) {
  const backoff = shouldSkipByBackoff_(key, reason);
  if (backoff.skip) {
    logInfo_("skip revalidate (backoff)", { key, reason, backoffMs: backoff.backoffMs });
    sendSyncAudit_({
      event: "revalidate_backoff_skip",
      route: window.location.pathname || "",
      resourceKey: key,
      source: "network",
      ok: false,
      latencyMs: 0,
      meta: {
        reason,
        attempt: backoff.attempt,
        backoffMs: backoff.backoffMs,
        activeKeysOnRoute: _routeSync.activeKeys.length,
        force,
      },
    });
    return { ok: false, error: "backoff active", source: "backoff" };
  }
  if (isRecentReasonDup_(key, reason) && !force) {
    logInfo_("skip revalidate (recent reason duplicate)", { key, reason });
    return { ok: true, data: store.get(key), source: "recent-dedupe" };
  }
  if (!shouldFetch_(key, force)) {
    logInfo_("skip revalidate (throttled)", { key, force });
    sendSyncAudit_({
      event: "revalidate_skip_throttled",
      route: window.location.pathname || "",
      resourceKey: key,
      source: "cache",
      ok: true,
      latencyMs: 0,
      meta: {
        reason,
        attempt: 1,
        backoffMs: 0,
        activeKeysOnRoute: _routeSync.activeKeys.length,
        force,
      },
    });
    return { ok: true, data: store.get(key), source: "throttled" };
  }
  if (_inFlight.has(key)) {
    logInfo_("join in-flight request", { key });
    sendSyncAudit_({
      event: "revalidate_join_inflight",
      route: window.location.pathname || "",
      resourceKey: key,
      source: "network",
      ok: true,
      latencyMs: 0,
      meta: {
        reason,
        attempt: 1,
        backoffMs: 0,
        activeKeysOnRoute: _routeSync.activeKeys.length,
        force,
      },
    });
    return _inFlight.get(key);
  }
  logInfo_("revalidate start", { key, force, reason });
  const startedAt = Date.now();
  const attempt = getBackoffState_(key).failCount + 1;
  const task = Promise.resolve()
    .then(fetcher)
    .then((data) => {
      store.set(key, data);
      markLastFetch_(key);
      setBackoffSuccess_(key);
      logInfo_("revalidate success", { key });
      sendSyncAudit_({
        event: "revalidate_success",
        route: window.location.pathname || "",
        resourceKey: key,
        source: "network",
        ok: true,
        latencyMs: Date.now() - startedAt,
        meta: {
          reason,
          attempt,
          backoffMs: 0,
          activeKeysOnRoute: _routeSync.activeKeys.length,
          force,
        },
      });
      return { ok: true, data, source: "network" };
    })
    .catch((err) => {
      logWarn_("revalidate failed", { key, error: err?.message || "sync failed" });
      const failState = setBackoffFail_(key);
      sendSyncAudit_({
        event: "revalidate_failed",
        route: window.location.pathname || "",
        resourceKey: key,
        source: "network",
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: err?.message || "sync failed",
        meta: {
          reason,
          attempt: failState.failCount,
          backoffMs: failState.backoffMs,
          activeKeysOnRoute: _routeSync.activeKeys.length,
          force,
        },
      });
      return { ok: false, error: err?.message || "sync failed" };
    })
    .finally(() => {
      _inFlight.delete(key);
    });
  _inFlight.set(key, task);
  return task;
}

export async function hydrateMemberSync({ force = false } = {}) {
  logInfo_("hydrate start", { force });
  const [dashboard, books, loans, fines, reservations, profile, loanSelf] = await Promise.all([
    revalidateKey_(MEMBER_SYNC_KEYS.dashboard, fetchDashboardBundle_, { force, reason: "hydrate" }),
    revalidateKey_(MEMBER_SYNC_KEYS.books, fetchBooksBundle_, { force, reason: "hydrate" }),
    revalidateKey_(MEMBER_SYNC_KEYS.loans, fetchLoansBundle_, { force, reason: "hydrate" }),
    revalidateKey_(MEMBER_SYNC_KEYS.fines, fetchFinesBundle_, { force, reason: "hydrate" }),
    revalidateKey_(MEMBER_SYNC_KEYS.reservations, fetchReservationsBundle_, { force, reason: "hydrate" }),
    revalidateKey_(MEMBER_SYNC_KEYS.profile, fetchProfileBundle_, { force, reason: "hydrate" }),
    revalidateKey_(MEMBER_SYNC_KEYS.loanSelf, fetchLoanSelfBundle_, { force, reason: "hydrate" }),
  ]);
  logInfo_("hydrate done", {
    dashboard: dashboard.ok ? "ok" : "fail",
    books: books.ok ? "ok" : "fail",
    loans: loans.ok ? "ok" : "fail",
    fines: fines.ok ? "ok" : "fail",
    reservations: reservations.ok ? "ok" : "fail",
    profile: profile.ok ? "ok" : "fail",
    loanSelf: loanSelf.ok ? "ok" : "fail",
  });
  return {
    ok: dashboard.ok && books.ok && loans.ok && fines.ok && reservations.ok && profile.ok && loanSelf.ok,
    dashboard,
    books,
    loans,
    fines,
    reservations,
    profile,
    loanSelf,
  };
}

function fetcherByKey_(key) {
  if (key === MEMBER_SYNC_KEYS.dashboard) return fetchDashboardBundle_;
  if (key === MEMBER_SYNC_KEYS.books) return fetchBooksBundle_;
  if (key === MEMBER_SYNC_KEYS.loans) return fetchLoansBundle_;
  if (key === MEMBER_SYNC_KEYS.fines) return fetchFinesBundle_;
  if (key === MEMBER_SYNC_KEYS.reservations) return fetchReservationsBundle_;
  if (key === MEMBER_SYNC_KEYS.profile) return fetchProfileBundle_;
  if (key === MEMBER_SYNC_KEYS.loanSelf) return fetchLoanSelfBundle_;
  return null;
}

function resetRoutePolling_() {
  for (const timer of _timers.values()) clearInterval(timer);
  _timers.clear();
}

function applyRoutePolling_(pathname) {
  const routeEntries = getRouteKeyConfig_(pathname);
  _routeSync.pathname = pathname;
  _routeSync.activeKeys = routeEntries.map((entry) => entry.key);
  resetRoutePolling_();

  routeEntries.forEach((entry) => {
    const fetcher = fetcherByKey_(entry.key);
    if (!fetcher) return;
    const pollMs = pollMsByTier_(entry.tier);
    window.setTimeout(() => {
      if (!_running) return;
      void revalidateKey_(entry.key, fetcher, { force: true, reason: "poll" });
    }, jitterMs_());
    _timers.set(entry.key, window.setInterval(() => {
      const delay = jitterMs_();
      window.setTimeout(() => {
        if (!_running) return;
        void revalidateKey_(entry.key, fetcher, { force: true, reason: "poll" });
      }, delay);
    }, pollMs));
  });

  logInfo_("route-aware polling applied", {
    pathname,
    activeKeys: _routeSync.activeKeys,
  });
}

export function startMemberSync() {
  if (_running) {
    logInfo_("start ignored (already running)");
    return;
  }
  _running = true;
  logInfo_("start polling", { mode: "route-aware" });

  void hydrateMemberSync({ force: false });
  applyRoutePolling_(window.location.pathname || "/app");
  window.addEventListener("popstate", handleRouteChangeForSync_);
}

export function stopMemberSync() {
  if (!_running) {
    logInfo_("stop ignored (not running)");
    return;
  }
  _running = false;
  resetRoutePolling_();
  window.removeEventListener("popstate", handleRouteChangeForSync_);
  _routeSync.pathname = "";
  _routeSync.activeKeys = [];
  logInfo_("stop polling");
}

function handleRouteChangeForSync_() {
  const nextPath = window.location.pathname || "/app";
  if (!_running) return;
  if (nextPath === _routeSync.pathname) return;
  applyRoutePolling_(nextPath);
}

export function subscribeMemberResource(key, listener) {
  return subscribeKey_(key, listener);
}

export function getMemberResource(key) {
  return getKeyData(key);
}

export function revalidateMemberResource(key, { force = true, reason = "manual" } = {}) {
  if (key === MEMBER_SYNC_KEYS.dashboard) {
    return revalidateKey_(key, fetchDashboardBundle_, { force, reason });
  }
  if (key === MEMBER_SYNC_KEYS.books) {
    return revalidateKey_(key, fetchBooksBundle_, { force, reason });
  }
  if (key === MEMBER_SYNC_KEYS.loans) {
    return revalidateKey_(key, fetchLoansBundle_, { force, reason });
  }
  if (key === MEMBER_SYNC_KEYS.fines) {
    return revalidateKey_(key, fetchFinesBundle_, { force, reason });
  }
  if (key === MEMBER_SYNC_KEYS.reservations) {
    return revalidateKey_(key, fetchReservationsBundle_, { force, reason });
  }
  if (key === MEMBER_SYNC_KEYS.profile) {
    return revalidateKey_(key, fetchProfileBundle_, { force, reason });
  }
  if (key === MEMBER_SYNC_KEYS.loanSelf) {
    return revalidateKey_(key, fetchLoanSelfBundle_, { force, reason });
  }
  return Promise.resolve({ ok: false, error: "unknown resource key" });
}
