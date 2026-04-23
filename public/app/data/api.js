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
  invalidateByPrefix(["books_catalog_list::", "books_catalog_get::", "book_items_list::"]);
  return gasJsonp(GAS_URL, {
    action: "books_catalog_create",
    payload: JSON.stringify(payload),
  });
}

export function apiBooksCatalogUpdate(bookId, payload) {
  invalidateByPrefix(["books_catalog_list::", "books_catalog_get::", "book_items_list::"]);
  return gasJsonp(GAS_URL, {
    action: "books_catalog_update",
    payload: JSON.stringify({ bookId, ...payload }),
  });
}

export function apiBooksCatalogArchive(bookId) {
  invalidateByPrefix(["books_catalog_list::", "books_catalog_get::", "book_items_list::"]);
  return gasJsonp(GAS_URL, {
    action: "books_catalog_archive",
    payload: JSON.stringify({ bookId }),
  });
}

export function apiBooksCatalogUnarchive(bookId) {
  invalidateByPrefix(["books_catalog_list::", "books_catalog_get::", "book_items_list::"]);
  return gasJsonp(GAS_URL, {
    action: "books_catalog_unarchive",
    payload: JSON.stringify({ bookId }),
  });
}

export function apiBookItemsAddCopies(payload) {
  invalidateByPrefix(["books_catalog_list::", "books_catalog_get::", "book_items_list::"]);
  return gasJsonp(GAS_URL, {
    action: "book_items_add_copies",
    payload: JSON.stringify(payload),
  });
}

export function apiBookItemsList(params = {}) {
  return cachedGasJsonp("book_items_list", params, 45_000);
}

export function apiBookItemUpdateStatus(payload) {
  invalidateByPrefix(["books_catalog_list::", "books_catalog_get::", "book_items_list::"]);
  return gasJsonp(GAS_URL, {
    action: "book_item_update_status",
    payload: JSON.stringify(payload),
  });
}
