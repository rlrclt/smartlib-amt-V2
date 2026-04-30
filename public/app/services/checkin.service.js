import {
  apiVisitsCheckinStart,
  apiVisitsCheckout,
  apiVisitsGetCurrent,
  apiVisitsUpdateActivities,
} from "../data/api.js";

function unwrap(response, fallbackMessage) {
  if (response?.ok) return response.data || {};
  throw new Error(response?.error || fallbackMessage);
}

export async function fetchCheckinState() {
  const res = await apiVisitsGetCurrent();
  return unwrap(res, "โหลดสถานะเช็คอินไม่สำเร็จ");
}

export async function startCheckin(payload) {
  const res = await apiVisitsCheckinStart(payload);
  return unwrap(res, "เช็คอินไม่สำเร็จ");
}

export async function updateCheckinActivities(payload) {
  const res = await apiVisitsUpdateActivities(payload);
  return unwrap(res, "อัปเดตกิจกรรมไม่สำเร็จ");
}

export async function checkoutSession(payload) {
  let body = payload && typeof payload === "object" ? { ...payload } : {};
  if (!String(body.visitId || "").trim()) {
    const current = await fetchCheckinState();
    const currentVisitId = String(current?.session?.visitId || "").trim();
    if (!currentVisitId) throw new Error("ไม่พบ session เช็คอินที่กำลังใช้งาน");
    body.visitId = currentVisitId;
  }
  const res = await apiVisitsCheckout(body);
  return unwrap(res, "ปิด session ไม่สำเร็จ");
}
