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
  const res = await apiVisitsCheckout(payload);
  return unwrap(res, "ปิด session ไม่สำเร็จ");
}
