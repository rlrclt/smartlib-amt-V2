import { apiReservationsList } from "../data/api.js";
import { store } from "../state/store.js";

const TTL_MS = 45_000;
const THROTTLE_MS = 5_000;
const _inFlight = new Map();

function readAuthSession_() {
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

function resolveUid_() {
  const auth = readAuthSession_();
  return String(auth?.uid || auth?.user?.uid || "").trim() || "anon";
}

function cacheKey_() {
  return `member_reservations:${resolveUid_()}`;
}

function lastFetchKey_(key) {
  return `_last_fetch:${key}`;
}

async function fetchFresh_(key) {
  if (_inFlight.has(key)) return _inFlight.get(key);
  const task = (async () => {
    const res = await apiReservationsList({ filter: "all" });
    if (res?.ok) {
      store.setWithTTL(key, res.data || {}, TTL_MS);
    }
    return res;
  })().finally(() => {
    _inFlight.delete(key);
  });
  _inFlight.set(key, task);
  store.set(lastFetchKey_(key), Date.now());
  return task;
}

export async function fetchReservationsList({ forceRefresh = false } = {}) {
  const key = cacheKey_();
  const cached = store.get(key);

  if (cached && !forceRefresh) {
    const lastFetch = Number(store.get(lastFetchKey_(key)) || 0);
    const shouldRevalidate = Date.now() - lastFetch > THROTTLE_MS;
    if (shouldRevalidate) void fetchFresh_(key);
    return { ok: true, data: cached, source: "cache" };
  }

  return fetchFresh_(key);
}

export function subscribeReservationsList(listener) {
  const key = cacheKey_();
  return store.subscribe(key, listener);
}

