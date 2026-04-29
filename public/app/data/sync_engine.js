import { store } from "../state/store.js";
import {
  apiManageDashboardStats,
  apiBooksCatalogList,
  apiLoansList
} from "./api.js";

const _inFlight = new Map();

/**
 * SyncEngine: จัดการการดึงข้อมูลด้วยเทคนิค Stale-While-Revalidate (SWR)
 * เพื่อลดอาการจอขาว (loading) และให้ UI โต้ตอบได้ทันที
 */
export const SyncEngine = {
  /**
   * แกนหลักของระบบ SWR
   * @param {string} key - Cache Key
   * @param {function} fetcher - ฟังก์ชันยิง API ต้อง return { ok, data }
   * @param {number} ttlMs - ระยะเวลาที่ถือว่า cache ไม่ stale
   */
  async swr(key, fetcher, ttlMs = 5 * 60 * 1000) {
    const cached = store.get(key);
    const lastFetch = store.get(`_last_fetch:${key}`) || 0;
    const now = Date.now();
    
    // Throttle background fetch: ไม่ยิงซ้ำถ้าเพิ่งยิงไปภายใน 5 วินาที
    const shouldFetch = (now - lastFetch) > 5000;

    if (shouldFetch) {
      if (!_inFlight.has(key)) {
        // Background revalidation
        const task = Promise.resolve()
          .then(fetcher)
          .then((res) => {
            if (res?.ok) {
              store.setWithTTL(key, res.data, ttlMs);
              console.log(`%c[Sync] Revalidated: ${key}`, "color: #0ea5e9; font-weight: bold; background: #e0f2fe; padding: 2px 6px; border-radius: 4px;");
            }
            return res;
          })
          .catch((err) => {
            console.warn(`[Sync] Background fetch failed for ${key}:`, err);
            throw err;
          })
          .finally(() => {
            _inFlight.delete(key);
          });

        _inFlight.set(key, task);
        store.set(`_last_fetch:${key}`, now);
      }
    }

    // มีข้อมูลเก่า ให้คืนค่าทันที 0ms
    if (cached !== null) {
      return { ok: true, data: cached, source: "cache" };
    }

    // ถ้าไม่มีข้อมูลเลย (Cold start) ต้องรอ Network
    try {
      if (_inFlight.has(key)) {
        const res = await _inFlight.get(key);
        return res;
      }
      console.log(`%c[Sync] Cold Fetch: ${key}`, "color: #f59e0b; font-weight: bold; background: #fef3c7; padding: 2px 6px; border-radius: 4px;");
      const res = await fetcher();
      if (res?.ok) {
        store.setWithTTL(key, res.data, ttlMs);
        store.set(`_last_fetch:${key}`, Date.now());
      }
      return res;
    } catch (err) {
      return { ok: false, error: err.message };
    }
  },

  // --- Wrapper สำหรับ API ต่างๆ ที่ต้องใช้บ่อย ---

  getManageDashboardStats() {
    return this.swr(
      "manage_dashboard_stats", 
      () => apiManageDashboardStats({}, { bypassCache: true }),
      5 * 60 * 1000
    );
  },

  getManageBooks(forceRefresh = false) {
    if (forceRefresh) store.set(`_last_fetch:manage_books_all`, 0);
    return this.swr(
      "manage_books_all",
      () => apiBooksCatalogList({ limit: 500 }, { bypassCache: true }), // ดึงมาเพื่อ cache เบื้องต้น
      10 * 60 * 1000
    );
  },

  getManageLoans(forceRefresh = false) {
    if (forceRefresh) store.set(`_last_fetch:manage_loans_active`, 0);
    return this.swr(
      "manage_loans_active",
      () => apiLoansList({ status: "borrowing", limit: 200 }, { bypassCache: true }),
      5 * 60 * 1000
    );
  }
};
