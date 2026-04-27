/**
 * Global State Store for SmartLib SPA
 * รองรับ Stale-While-Revalidate (SWR), TTL และระบบ Publish/Subscribe
 */

const _cache = new Map();
const _subscribers = new Map();

export const store = {
  get(key) {
    const item = _cache.get(key);
    if (!item) return null;
    return item.value;
  },

  /**
   * ตรวจสอบว่า cache มีอยู่และยังไม่หมดอายุใช่หรือไม่
   */
  isValid(key) {
    const item = _cache.get(key);
    if (!item) return false;
    if (item.expiresAt === null) return true;
    return Date.now() < item.expiresAt;
  },

  set(key, value) {
    _cache.set(key, { value, expiresAt: null });
    this.notify(key, value);
    return value;
  },

  setWithTTL(key, value, ttlMs) {
    const expiresAt = Date.now() + ttlMs;
    _cache.set(key, { value, expiresAt });
    this.notify(key, value);
    return value;
  },

  has(key) {
    return _cache.has(key);
  },

  delete(key) {
    const res = _cache.delete(key);
    this.notify(key, null);
    return res;
  },

  clear() {
    _cache.clear();
    // Not notifying all keys for clear, as it's usually used on logout
  },

  /**
   * ระบบ Subscribe เพื่อให้ View รีเฟรชตัวเองเมื่อข้อมูลเปลี่ยน
   */
  subscribe(key, callback) {
    if (!_subscribers.has(key)) {
      _subscribers.set(key, new Set());
    }
    _subscribers.get(key).add(callback);
    return () => this.unsubscribe(key, callback);
  },

  unsubscribe(key, callback) {
    if (_subscribers.has(key)) {
      _subscribers.get(key).delete(callback);
    }
  },

  notify(key, value) {
    if (_subscribers.has(key)) {
      for (const cb of _subscribers.get(key)) {
        try {
          cb(value);
        } catch (e) {
          console.error(`Error in store subscriber for ${key}:`, e);
        }
      }
    }
  },

  /**
   * Helper สำหรับจัดการ state ของ View ที่มีการทำ Pagination
   */
  getViewState(viewId) {
    return this.get(`view_state:${viewId}`);
  },

  setViewState(viewId, state) {
    return this.set(`view_state:${viewId}`, state);
  }
};
