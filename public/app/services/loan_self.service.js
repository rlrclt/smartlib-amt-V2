import {
  apiBooksCatalogGet,
  apiLoansSelfBootstrap,
  apiLoansSelfCreate,
  apiLoansSelfReturn,
  apiLoansSelfValidate,
  apiSettingsLocationsCheck,
} from "../data/api.js";

function unwrap(response, fallbackMessage) {
  if (response?.ok) return response;
  throw new Error(response?.error || fallbackMessage);
}

export async function fetchBookCatalogByBarcode(params) {
  const res = await apiBooksCatalogGet(params);
  return unwrap(res, "โหลดข้อมูลหนังสือไม่สำเร็จ");
}

export async function fetchLoanSelfBootstrap() {
  const res = await apiLoansSelfBootstrap();
  return unwrap(res, "โหลดข้อมูลเริ่มต้นไม่สำเร็จ");
}

export async function createLoanSelfBorrow(payload) {
  const res = await apiLoansSelfCreate(payload);
  return unwrap(res, "ทำรายการยืมไม่สำเร็จ");
}

export async function createLoanSelfReturn(payload) {
  const res = await apiLoansSelfReturn(payload);
  return unwrap(res, "ทำรายการคืนไม่สำเร็จ");
}

export async function validateLoanSelfBarcode(payload) {
  const res = await apiLoansSelfValidate(payload);
  return unwrap(res, "ตรวจสอบบาร์โค้ดไม่สำเร็จ");
}

export async function checkServiceLocationAccess(payload) {
  const res = await apiSettingsLocationsCheck(payload);
  return unwrap(res, "ตรวจสอบตำแหน่งไม่สำเร็จ");
}
