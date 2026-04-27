/**
 * Module_Loans.gs
 * Reservation workflows for member pre-booking and queue management.
 */

const RESERVATION_SCHEMA = {
  SHEET_NAME: (typeof SHEETS !== "undefined" && SHEETS.RESERVATIONS) || "reservations",
  COLUMNS: [
    "resId",
    "bookId",
    "uid",
    "resDate",
    "plannedDate",
    "plannedDuration",
    "status",
    "holdUntil",
    "readyAt",
    "completedAt",
    "cancelledAt",
    "expiredAt",
    "reservedBarcode",
    "updatedAt",
    "notifiedAt"
  ]
};

const RESERVATION_ACTIVE_STATUSES = { waiting: true, ready: true };
const RESERVATION_HISTORY_STATUSES = { completed: true, cancelled: true, expired: true };

function reservationsList_(payload) {
  const viewer = assertLoanViewer_(payload && payload.auth);
  const now = new Date();
  const filter = String(payload && payload.filter || "active").toLowerCase();
  const withHistory = filter === "history";
  const includeAll = filter === "all";

  const policies = ensureDefaultPolicies_();
  const role = String(viewer.role || "student").toLowerCase();
  const policy = reservationPolicyForRole_(policies, role);
  const rows = readReservationRows_().map(function (row) {
    return normalizeReservationRow_(row);
  });

  const scoped = rows.filter(function (row) {
    if (viewer.scopeUid && String(row.uid || "") !== String(viewer.scopeUid || "")) return false;
    const st = String(row.status || "").toLowerCase();
    if (includeAll) return true;
    if (withHistory) return RESERVATION_HISTORY_STATUSES[st] === true;
    return RESERVATION_ACTIVE_STATUSES[st] === true;
  });

  const queueByBook = buildReservationQueueMap_(rows);
  const metaByBook = buildBookMetaMapFromRows_(scoped);

  scoped.sort(function (a, b) {
    const aPriority = String(a.status || "").toLowerCase() === "ready" ? 0 : 1;
    const bPriority = String(b.status || "").toLowerCase() === "ready" ? 0 : 1;
    if (aPriority !== bPriority && !withHistory) return aPriority - bPriority;
    return isoMs_(b.updatedAt || b.resDate) - isoMs_(a.updatedAt || a.resDate);
  });

  const items = scoped.map(function (row) {
    const queue = queueByBook[String(row.bookId || "")] || [];
    const queuePos = String(row.status || "").toLowerCase() === "waiting"
      ? Math.max(1, queue.findIndex(function (q) { return String(q.resId || "") === String(row.resId || ""); }) + 1)
      : 0;
    const etaDate = queuePos > 0 ? estimateEtaDate_(row.bookId, queuePos, policy.loanDays, now) : "";
    return formatReservationOutput_(row, metaByBook[String(row.bookId || "")], queuePos, etaDate, now);
  });

  const scopeUid = String(viewer.scopeUid || "");
  const activeCount = rows.filter(function (r) {
    if (scopeUid && String(r.uid || "") !== scopeUid) return false;
    return RESERVATION_ACTIVE_STATUSES[String(r.status || "").toLowerCase()] === true;
  }).length;

  return {
    items: items,
    summary: {
      activeCount: activeCount,
      filter: filter,
      total: items.length
    },
    policy: policy,
    serverTime: now.toISOString()
  };
}

function reservationsBookContext_(payload) {
  const viewer = assertLoanViewer_(payload && payload.auth);
  const barcode = String(payload && payload.barcode || "").trim();
  let bookId = String(payload && payload.bookId || "").trim();
  if (!bookId && barcode) {
    const foundItem = findBookItemByBarcode_(barcode);
    bookId = String(foundItem && foundItem.rowData && foundItem.rowData.bookId || "").trim();
  }
  if (!bookId) throw new Error("กรุณาระบุ bookId หรือ barcode");

  const bookFound = findCatalogRowByBookId_(bookId);
  if (!bookFound || !bookFound.rowData) throw new Error("ไม่พบหนังสือที่ต้องการจอง");
  if (String(bookFound.rowData.status || "").toLowerCase() === "archived") {
    throw new Error("หนังสือรายการนี้ไม่พร้อมให้จอง");
  }
  if (barcode) {
    const selectedItem = findBookItemByBarcode_(barcode);
    if (!selectedItem || !selectedItem.rowData) throw new Error("ไม่พบ barcode ที่เลือก");
    if (String(selectedItem.rowData.bookId || "") !== bookId) {
      throw new Error("barcode ที่เลือกไม่ตรงกับหนังสือที่ต้องการจอง");
    }
    if (String(selectedItem.rowData.status || "").toLowerCase() === "reserved") {
      throw new Error("เล่มนี้มีผู้จองไว้แล้ว กรุณาเลือกเล่มอื่น");
    }
  }

  const role = String(viewer.role || "student").toLowerCase();
  const policy = reservationPolicyForRole_(ensureDefaultPolicies_(), role);
  const now = new Date();
  const allReservations = readReservationRows_().map(normalizeReservationRow_);
  const queue = buildReservationQueueMap_(allReservations)[bookId] || [];
  const waitingCount = queue.length;
  const availableRows = getAvailableBookItemsForBook_(bookId);
  const selectedItem = barcode ? findBookItemByBarcode_(barcode) : null;
  const etaDate = estimateEtaDate_(bookId, Math.max(1, waitingCount + 1), policy.loanDays, now);

  return {
    book: {
      bookId: String(bookFound.rowData.bookId || ""),
      title: String(bookFound.rowData.title || ""),
      author: String(bookFound.rowData.author || ""),
      coverUrl: String(bookFound.rowData.coverUrl || ""),
      status: String(bookFound.rowData.status || "active")
    },
    queue: {
      waitingCount: waitingCount,
      availableNow: availableRows.length > 0,
      etaDate: etaDate
    },
    selectedItem: selectedItem && selectedItem.rowData
      ? {
        barcode: String(selectedItem.rowData.barcode || ""),
        status: String(selectedItem.rowData.status || ""),
        location: String(selectedItem.rowData.location || ""),
      }
      : null,
    policy: policy,
    serverTime: now.toISOString()
  };
}

function reservationsCreate_(payload) {
  const viewer = assertLoanViewer_(payload && payload.auth);
  const actorUid = String(viewer.scopeUid || viewer.uid || "").trim();
  const barcode = String(payload && payload.barcode || "").trim();
  let bookId = String(payload && payload.bookId || "").trim();
  if (!bookId && barcode) {
    const foundItem = findBookItemByBarcode_(barcode);
    bookId = String(foundItem && foundItem.rowData && foundItem.rowData.bookId || "").trim();
  }
  const plannedDate = normalizePlannedDate_(payload && payload.plannedDate);
  if (!bookId) throw new Error("กรุณาระบุ bookId หรือ barcode");
  if (!plannedDate) throw new Error("กรุณาระบุ plannedDate");

  const policies = ensureDefaultPolicies_();
  const policy = reservationPolicyForRole_(policies, String(viewer.role || "").toLowerCase());
  const plannedDuration = normalizeLoanInt_(payload && payload.plannedDuration, policy.loanDays, policy.loanDays);
  if (plannedDuration < 1 || plannedDuration > policy.loanDays) {
    throw new Error("จำนวนวันยืมต้องไม่เกิน " + String(policy.loanDays) + " วัน");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const now = new Date();
    const nowIso = now.toISOString();
    ensureReservationSheetSchema_();
    reservationSweepExpiredAndPromote_(nowIso);

    const userEntry = findUserRowByUid_(actorUid);
    if (!userEntry || !userEntry.user) throw new Error("ไม่พบข้อมูลสมาชิก");
    if (String(userEntry.user.status || "").toLowerCase() !== "active") throw new Error("บัญชีสมาชิกไม่อยู่ในสถานะ active");

    const bookFound = findCatalogRowByBookId_(bookId);
    if (!bookFound || !bookFound.rowData) throw new Error("ไม่พบหนังสือที่ต้องการจอง");
    if (String(bookFound.rowData.status || "").toLowerCase() === "archived") throw new Error("หนังสือรายการนี้ไม่พร้อมให้จอง");
    if (barcode) {
      const selectedItem = findBookItemByBarcode_(barcode);
      if (!selectedItem || !selectedItem.rowData) throw new Error("ไม่พบ barcode ที่เลือก");
      if (String(selectedItem.rowData.bookId || "") !== bookId) {
        throw new Error("barcode ที่เลือกไม่ตรงกับหนังสือที่ต้องการจอง");
      }
      if (String(selectedItem.rowData.status || "").toLowerCase() === "reserved") {
        throw new Error("เล่มนี้มีผู้จองไว้แล้ว กรุณาเลือกเล่มอื่น");
      }
    }

    var allReservations = readReservationRows_().map(normalizeReservationRow_);
    const ownActiveCount = allReservations.filter(function (row) {
      if (String(row.uid || "") !== actorUid) return false;
      return RESERVATION_ACTIVE_STATUSES[String(row.status || "").toLowerCase()] === true;
    }).length;
    if (ownActiveCount >= policy.resQuota) {
      throw new Error("เกินโควตาการจองค้าง (" + String(policy.resQuota) + " รายการ)");
    }

    const dup = allReservations.find(function (row) {
      if (String(row.uid || "") !== actorUid) return false;
      if (String(row.bookId || "") !== bookId) return false;
      return RESERVATION_ACTIVE_STATUSES[String(row.status || "").toLowerCase()] === true;
    });
    if (dup) throw new Error("คุณมีรายการจองหนังสือเรื่องนี้อยู่แล้ว");

    const hasBorrowing = readLoansRows_().some(function (row) {
      if (String(row.uid || "") !== actorUid) return false;
      if (String(row.status || "").toLowerCase() !== "borrowing") return false;
      const loanBookId = resolveBookIdByBarcode_(String(row.barcode || ""));
      return String(loanBookId || "") === bookId;
    });
    if (hasBorrowing) throw new Error("คุณกำลังยืมหนังสือเรื่องนี้อยู่แล้ว");

    promoteQueueForBook_(bookId, nowIso);
    allReservations = readReservationRows_().map(normalizeReservationRow_);

    const resId = nextReservationId_();
    let availableRows = getAvailableBookItemsForBook_(bookId);
    const queue = buildReservationQueueMap_(allReservations)[bookId] || [];

    if (barcode) {
      const selectedCurrentItem = findBookItemByBarcode_(barcode);
      const selectedStatus = String(selectedCurrentItem && selectedCurrentItem.rowData && selectedCurrentItem.rowData.status || "").toLowerCase();
      if (selectedStatus && selectedStatus !== "available") {
        availableRows = [];
      }
      const selected = availableRows.find(function (x) {
        return String(x.barcode || "") === barcode;
      });
      if (selected) {
        availableRows = [selected].concat(availableRows.filter(function (x) {
          return String(x.barcode || "") !== barcode;
        }));
      }
    }

    const row = {
      resId: resId,
      bookId: bookId,
      uid: actorUid,
      resDate: nowIso,
      plannedDate: plannedDate,
      plannedDuration: plannedDuration,
      status: "waiting",
      holdUntil: "",
      readyAt: "",
      completedAt: "",
      cancelledAt: "",
      expiredAt: "",
      reservedBarcode: barcode || "",
      updatedAt: nowIso,
      notifiedAt: ""
    };

    const shouldReadyImmediately = availableRows.length > 0 && queue.length === 0;
    if (shouldReadyImmediately) {
      const holdUntil = addDays_(new Date(), policy.holdDays).toISOString();
      const item = availableRows[0];
      row.status = "ready";
      row.readyAt = nowIso;
      row.holdUntil = holdUntil;
      row.notifiedAt = nowIso;
      row.reservedBarcode = String(item.barcode || "");
      reserveBookItemForReservation_(item.barcode, resId, nowIso);
      createNotification_({
        uid: actorUid,
        title: "หนังสือที่จองพร้อมรับแล้ว",
        message: 'รายการ "' + String(bookFound.rowData.title || "") + '" พร้อมรับภายใน ' + String(policy.holdDays) + " วัน",
        type: "reservation",
        senderUid: "SYSTEM",
        link: "/app/reservations"
      });
    }

    appendObjectRow_(getReservationsSheet_(), RESERVATION_SCHEMA.COLUMNS, row);
    const normalized = normalizeReservationRow_(row);
    const queuePos = normalized.status === "waiting" ? (queue.length + 1) : 0;
    const etaDate = queuePos > 0 ? estimateEtaDate_(bookId, queuePos, policy.loanDays, now) : "";
    const meta = buildBookMetaMapFromRows_([normalized])[bookId];
    return {
      ok: true,
      reservation: formatReservationOutput_(normalized, meta, queuePos, etaDate, now),
      policy: policy
    };
  } finally {
    lock.releaseLock();
  }
}

function reservationsReschedule_(payload) {
  const viewer = assertLoanViewer_(payload && payload.auth);
  const actorUid = String(viewer.scopeUid || viewer.uid || "").trim();
  const resId = String(payload && payload.resId || "").trim();
  const plannedDate = normalizePlannedDate_(payload && payload.plannedDate);
  if (!resId) throw new Error("กรุณาระบุ resId");
  if (!plannedDate) throw new Error("กรุณาระบุ plannedDate");

  const policy = reservationPolicyForRole_(ensureDefaultPolicies_(), String(viewer.role || "").toLowerCase());
  const plannedDuration = normalizeLoanInt_(payload && payload.plannedDuration, policy.loanDays, policy.loanDays);
  if (plannedDuration < 1 || plannedDuration > policy.loanDays) {
    throw new Error("จำนวนวันยืมต้องไม่เกิน " + String(policy.loanDays) + " วัน");
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    ensureReservationSheetSchema_();
    reservationSweepExpiredAndPromote_(new Date().toISOString());

    const found = findReservationById_(resId);
    if (!found || !found.rowData || !found.rowNumber) throw new Error("ไม่พบรายการจอง");
    const row = normalizeReservationRow_(found.rowData);
    if (String(row.uid || "") !== actorUid) throw new Error("ไม่มีสิทธิ์แก้ไขรายการจองนี้");
    const status = String(row.status || "").toLowerCase();
    if (RESERVATION_ACTIVE_STATUSES[status] !== true) throw new Error("รายการนี้ไม่สามารถแก้ไขนัดหมายได้แล้ว");

    row.plannedDate = plannedDate;
    row.plannedDuration = plannedDuration;
    row.updatedAt = new Date().toISOString();
    writeObjectRow_(getReservationsSheet_(), found.rowNumber, RESERVATION_SCHEMA.COLUMNS, row);

    const queue = buildReservationQueueMap_(readReservationRows_().map(normalizeReservationRow_))[String(row.bookId || "")] || [];
    const queuePos = status === "waiting"
      ? Math.max(1, queue.findIndex(function (q) { return String(q.resId || "") === String(row.resId || ""); }) + 1)
      : 0;
    const etaDate = queuePos > 0 ? estimateEtaDate_(row.bookId, queuePos, policy.loanDays, new Date()) : "";
    const meta = buildBookMetaMapFromRows_([row])[String(row.bookId || "")];
    return { ok: true, reservation: formatReservationOutput_(row, meta, queuePos, etaDate, new Date()) };
  } finally {
    lock.releaseLock();
  }
}

function reservationsCancel_(payload) {
  const viewer = assertLoanViewer_(payload && payload.auth);
  const actorUid = String(viewer.scopeUid || viewer.uid || "").trim();
  const resId = String(payload && payload.resId || "").trim();
  if (!resId) throw new Error("กรุณาระบุ resId");

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    ensureReservationSheetSchema_();
    reservationSweepExpiredAndPromote_(new Date().toISOString());

    const found = findReservationById_(resId);
    if (!found || !found.rowData || !found.rowNumber) throw new Error("ไม่พบรายการจอง");
    const row = normalizeReservationRow_(found.rowData);
    if (String(row.uid || "") !== actorUid) throw new Error("ไม่มีสิทธิ์ยกเลิกรายการนี้");

    const status = String(row.status || "").toLowerCase();
    if (status !== "waiting" && status !== "ready") throw new Error("รายการนี้ไม่สามารถยกเลิกได้");

    const nowIso = new Date().toISOString();
    row.status = "cancelled";
    row.cancelledAt = nowIso;
    row.updatedAt = nowIso;
    if (status === "ready") {
      releaseReservedItemByReservation_(row, nowIso);
      promoteQueueForBook_(String(row.bookId || ""), nowIso);
    }
    writeObjectRow_(getReservationsSheet_(), found.rowNumber, RESERVATION_SCHEMA.COLUMNS, row);

    return { ok: true, reservation: formatReservationOutput_(row, null, 0, "", new Date()) };
  } finally {
    lock.releaseLock();
  }
}

function reservationsRunDaily_(payload) {
  assertManageStaff_(payload && payload.auth);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const nowIso = new Date().toISOString();
    const report = reservationSweepExpiredAndPromote_(nowIso);
    return { ok: true, report: report };
  } finally {
    lock.releaseLock();
  }
}

function reservationSweepExpiredAndPromote_(nowIso) {
  ensureReservationSheetSchema_();
  const now = new Date(String(nowIso || new Date().toISOString()));
  const rows = readRowsAsObjectsWithRowNumber_(getReservationsSheet_(), RESERVATION_SCHEMA.COLUMNS);
  const expiredBookIds = {};
  var expiredCount = 0;

  rows.forEach(function (entry) {
    if (!entry || !entry.rowData || !entry.rowNumber) return;
    const row = normalizeReservationRow_(entry.rowData);
    if (String(row.status || "").toLowerCase() !== "ready") return;
    const holdMs = isoMs_(row.holdUntil);
    if (!Number.isFinite(holdMs) || holdMs > now.getTime()) return;
    row.status = "expired";
    row.expiredAt = now.toISOString();
    row.updatedAt = now.toISOString();
    writeObjectRow_(getReservationsSheet_(), entry.rowNumber, RESERVATION_SCHEMA.COLUMNS, row);
    releaseReservedItemByReservation_(row, now.toISOString());
    expiredBookIds[String(row.bookId || "")] = true;
    expiredCount += 1;
  });

  const promoted = Object.keys(expiredBookIds).reduce(function (sum, bookId) {
    return sum + promoteQueueForBook_(bookId, now.toISOString());
  }, 0);

  return { expired: expiredCount, promoted: promoted };
}

function promoteQueueForBook_(bookId, nowIso) {
  const targetBookId = String(bookId || "").trim();
  if (!targetBookId) return 0;

  const availableRows = getAvailableBookItemsForBook_(targetBookId);
  if (!availableRows.length) return 0;

  const rows = readRowsAsObjectsWithRowNumber_(getReservationsSheet_(), RESERVATION_SCHEMA.COLUMNS);
  const waiting = rows
    .map(function (entry) {
      return {
        rowNumber: entry.rowNumber,
        rowData: normalizeReservationRow_(entry.rowData)
      };
    })
    .filter(function (entry) {
      if (String(entry.rowData.bookId || "") !== targetBookId) return false;
      return String(entry.rowData.status || "").toLowerCase() === "waiting";
    })
    .sort(function (a, b) {
      return isoMs_(a.rowData.resDate) - isoMs_(b.rowData.resDate);
    });

  if (!waiting.length) return 0;
  const takeCount = Math.min(availableRows.length, waiting.length);
  const policyByUid = {};
  var promoted = 0;

  for (var i = 0; i < takeCount; i += 1) {
    const item = availableRows[i];
    const target = waiting[i];
    if (!item || !target || !target.rowData) continue;

    const uid = String(target.rowData.uid || "");
    if (!policyByUid[uid]) {
      const userEntry = findUserRowByUid_(uid);
      const role = String(userEntry && userEntry.user && userEntry.user.role || "student").toLowerCase();
      policyByUid[uid] = reservationPolicyForRole_(ensureDefaultPolicies_(), role);
    }
    const policy = policyByUid[uid];
    const holdUntil = addDays_(new Date(String(nowIso || new Date().toISOString())), policy.holdDays).toISOString();

    target.rowData.status = "ready";
    target.rowData.readyAt = String(nowIso || new Date().toISOString());
    target.rowData.holdUntil = holdUntil;
    target.rowData.reservedBarcode = String(item.barcode || "");
    target.rowData.notifiedAt = String(nowIso || new Date().toISOString());
    target.rowData.updatedAt = String(nowIso || new Date().toISOString());
    writeObjectRow_(getReservationsSheet_(), target.rowNumber, RESERVATION_SCHEMA.COLUMNS, target.rowData);
    reserveBookItemForReservation_(item.barcode, target.rowData.resId, String(nowIso || new Date().toISOString()));
    promoted += 1;

    const bookFound = findCatalogRowByBookId_(targetBookId);
    createNotification_({
      uid: uid,
      title: "หนังสือที่จองพร้อมรับแล้ว",
      message: 'รายการ "' + String(bookFound && bookFound.rowData && bookFound.rowData.title || targetBookId) + '" พร้อมรับภายใน ' + String(policy.holdDays) + " วัน",
      type: "reservation",
      senderUid: "SYSTEM",
      link: "/app/reservations"
    });
  }

  return promoted;
}

function reservationConsumeReadyByBarcode_(uid, barcode, nowIso) {
  const code = String(barcode || "").trim();
  const memberUid = String(uid || "").trim();
  if (!code || !memberUid) return false;
  const item = findBookItemByBarcode_(code);
  if (!item || !item.rowData) return false;
  const marker = String(item.rowData.activeLoanId || "");
  if (marker.indexOf("RES:") !== 0) return false;
  const resId = marker.slice(4);
  if (!resId) return false;

  const found = findReservationById_(resId);
  if (!found || !found.rowData || !found.rowNumber) return false;
  const row = normalizeReservationRow_(found.rowData);
  if (String(row.uid || "") !== memberUid) throw new Error("หนังสือเล่มนี้ถูกล็อกไว้ให้สมาชิกคนอื่น");
  if (String(row.status || "").toLowerCase() !== "ready") throw new Error("รายการจองนี้ไม่อยู่ในสถานะพร้อมรับ");
  const holdMs = isoMs_(row.holdUntil);
  if (Number.isFinite(holdMs) && holdMs < Date.now()) throw new Error("รายการจองนี้หมดเวลารับแล้ว");

  row.status = "completed";
  row.completedAt = String(nowIso || new Date().toISOString());
  row.updatedAt = String(nowIso || new Date().toISOString());
  writeObjectRow_(getReservationsSheet_(), found.rowNumber, RESERVATION_SCHEMA.COLUMNS, row);
  return true;
}

function reservationCanBorrowReadyByBarcode_(uid, barcode) {
  const code = String(barcode || "").trim();
  const memberUid = String(uid || "").trim();
  if (!code || !memberUid) return false;
  const item = findBookItemByBarcode_(code);
  if (!item || !item.rowData) return false;
  const marker = String(item.rowData.activeLoanId || "");
  if (marker.indexOf("RES:") !== 0) return false;
  const resId = marker.slice(4);
  if (!resId) return false;

  const found = findReservationById_(resId);
  if (!found || !found.rowData || !found.rowNumber) return false;
  const row = normalizeReservationRow_(found.rowData);
  if (String(row.uid || "") !== memberUid) return false;
  if (String(row.status || "").toLowerCase() !== "ready") return false;
  const holdMs = isoMs_(row.holdUntil);
  if (Number.isFinite(holdMs) && holdMs < Date.now()) return false;
  return true;
}

function ensureReservationSheetSchema_() {
  ensureHeader_(getReservationsSheet_(), RESERVATION_SCHEMA.COLUMNS);
}

function nextReservationId_() {
  const rows = readReservationRows_().map(normalizeReservationRow_);
  const prefix = "RS-" + formatYmd_(new Date()) + "-";
  var maxSeq = 0;
  rows.forEach(function (row) {
    const id = String(row.resId || "");
    if (id.indexOf(prefix) !== 0) return;
    const seq = Number(id.slice(prefix.length));
    if (Number.isFinite(seq)) maxSeq = Math.max(maxSeq, seq);
  });
  return prefix + String(maxSeq + 1).padStart(4, "0");
}

function findReservationById_(resId) {
  return findRowByField_(getReservationsSheet_(), RESERVATION_SCHEMA.COLUMNS, "resId", String(resId || ""));
}

function reservationPolicyForRole_(policies, role) {
  const roleKey = String(role || "student").toLowerCase();
  const rows = Array.isArray(policies) ? policies : [];
  const fromSheet = rows.find(function (row) {
    return String(row.role || "").toLowerCase() === roleKey;
  }) || null;
  const fallbackLoanQuota = fromSheet ? normalizeLoanInt_(fromSheet.loanQuota, 3, 50) : 3;
  const fallbackLoanDays = fromSheet ? normalizeLoanInt_(fromSheet.loanDays, 7, 60) : 7;
  const resQuota = normalizeLoanInt_(fromSheet && fromSheet.resQuota, Math.max(1, Math.min(5, fallbackLoanQuota)), 20);
  const holdDays = normalizeLoanInt_(fromSheet && fromSheet.holdDays, 2, 14);
  return {
    role: roleKey,
    loanDays: fallbackLoanDays,
    resQuota: Math.max(1, resQuota),
    holdDays: Math.max(1, holdDays)
  };
}

function normalizeReservationRow_(row) {
  const r = row || {};
  return {
    resId: String(r.resId || "").trim(),
    bookId: String(r.bookId || "").trim(),
    uid: String(r.uid || "").trim(),
    resDate: String(r.resDate || ""),
    plannedDate: normalizePlannedDate_(r.plannedDate || ""),
    plannedDuration: normalizeLoanInt_(r.plannedDuration, 7, 365),
    status: normalizeReservationStatus_(r.status),
    holdUntil: String(r.holdUntil || ""),
    readyAt: String(r.readyAt || ""),
    completedAt: String(r.completedAt || ""),
    cancelledAt: String(r.cancelledAt || ""),
    expiredAt: String(r.expiredAt || ""),
    reservedBarcode: String(r.reservedBarcode || ""),
    updatedAt: String(r.updatedAt || r.resDate || ""),
    notifiedAt: String(r.notifiedAt || "")
  };
}

function normalizeReservationStatus_(status) {
  const st = String(status || "").toLowerCase();
  if (RESERVATION_ACTIVE_STATUSES[st] || RESERVATION_HISTORY_STATUSES[st]) return st;
  return "waiting";
}

function normalizePlannedDate_(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function buildReservationQueueMap_(rows) {
  const map = {};
  (Array.isArray(rows) ? rows : []).forEach(function (row) {
    const bookId = String(row.bookId || "");
    if (!bookId) return;
    if (String(row.status || "").toLowerCase() !== "waiting") return;
    if (!map[bookId]) map[bookId] = [];
    map[bookId].push(row);
  });
  Object.keys(map).forEach(function (bookId) {
    map[bookId].sort(function (a, b) {
      return isoMs_(a.resDate) - isoMs_(b.resDate);
    });
  });
  return map;
}

function buildBookMetaMapFromRows_(rows) {
  const ids = {};
  (Array.isArray(rows) ? rows : []).forEach(function (row) {
    const bookId = String(row.bookId || "");
    if (bookId) ids[bookId] = true;
  });
  const map = {};
  Object.keys(ids).forEach(function (bookId) {
    const found = findCatalogRowByBookId_(bookId);
    const book = found && found.rowData ? found.rowData : {};
    map[bookId] = {
      title: String(book.title || ""),
      author: String(book.author || ""),
      coverUrl: String(book.coverUrl || ""),
      status: String(book.status || "active")
    };
  });
  return map;
}

function formatReservationOutput_(row, meta, queuePos, etaDate, now) {
  const status = String(row.status || "").toLowerCase();
  const holdMs = isoMs_(row.holdUntil);
  const remainMs = Number.isFinite(holdMs) ? Math.max(0, holdMs - now.getTime()) : 0;
  return {
    resId: String(row.resId || ""),
    bookId: String(row.bookId || ""),
    uid: String(row.uid || ""),
    status: status,
    resDate: String(row.resDate || ""),
    plannedDate: String(row.plannedDate || ""),
    plannedDuration: normalizeLoanInt_(row.plannedDuration, 7, 365),
    holdUntil: String(row.holdUntil || ""),
    readyAt: String(row.readyAt || ""),
    completedAt: String(row.completedAt || ""),
    cancelledAt: String(row.cancelledAt || ""),
    expiredAt: String(row.expiredAt || ""),
    reservedBarcode: String(row.reservedBarcode || ""),
    queuePos: queuePos || 0,
    etaDate: String(etaDate || ""),
    holdRemainingMs: remainMs,
    holdRemainingHours: Math.ceil(remainMs / (60 * 60 * 1000)),
    bookTitle: String(meta && meta.title || ""),
    bookAuthor: String(meta && meta.author || ""),
    coverUrl: String(meta && meta.coverUrl || "")
  };
}

function getAvailableBookItemsForBook_(bookId) {
  const target = String(bookId || "").trim();
  if (!target) return [];
  return readBookItemRows_()
    .filter(function (row) {
      return String(row.bookId || "") === target && String(row.status || "").toLowerCase() === "available";
    })
    .sort(function (a, b) {
      return String(a.barcode || "").localeCompare(String(b.barcode || ""));
    });
}

function reserveBookItemForReservation_(barcode, resId, nowIso) {
  const found = findBookItemByBarcode_(String(barcode || ""));
  if (!found || !found.rowData || !found.rowNumber) return;
  const row = found.rowData;
  if (String(row.status || "").toLowerCase() !== "available") return;
  row.status = "reserved";
  row.activeLoanId = "RES:" + String(resId || "");
  row.updatedAt = String(nowIso || new Date().toISOString());
  writeObjectRow_(getBookItemsSheet_(), found.rowNumber, BOOK_ITEM_SCHEMA.COLUMNS, row);
  bumpBooksCacheVersion_();
}

function releaseReservedItemByReservation_(reservationRow, nowIso) {
  const row = normalizeReservationRow_(reservationRow);
  const marker = "RES:" + String(row.resId || "");
  const nowText = String(nowIso || new Date().toISOString());
  const targetBarcode = String(row.reservedBarcode || "");

  if (targetBarcode) {
    const found = findBookItemByBarcode_(targetBarcode);
    if (found && found.rowData && found.rowNumber) {
      const item = found.rowData;
      if (String(item.activeLoanId || "") === marker && String(item.status || "").toLowerCase() === "reserved") {
        item.status = "available";
        item.activeLoanId = "";
        item.updatedAt = nowText;
        writeObjectRow_(getBookItemsSheet_(), found.rowNumber, BOOK_ITEM_SCHEMA.COLUMNS, item);
        bumpBooksCacheVersion_();
        return;
      }
    }
  }

  const rows = readRowsAsObjectsWithRowNumber_(getBookItemsSheet_(), BOOK_ITEM_SCHEMA.COLUMNS);
  for (var i = 0; i < rows.length; i += 1) {
    const entry = rows[i];
    const item = entry.rowData;
    if (String(item.bookId || "") !== String(row.bookId || "")) continue;
    if (String(item.activeLoanId || "") !== marker) continue;
    if (String(item.status || "").toLowerCase() !== "reserved") continue;
    item.status = "available";
    item.activeLoanId = "";
    item.updatedAt = nowText;
    writeObjectRow_(getBookItemsSheet_(), entry.rowNumber, BOOK_ITEM_SCHEMA.COLUMNS, item);
    bumpBooksCacheVersion_();
    break;
  }
}

function estimateEtaDate_(bookId, queuePos, loanDays, now) {
  const pos = Math.max(1, normalizeLoanInt_(queuePos, 1, 999));
  const days = Math.max(1, normalizeLoanInt_(loanDays, 7, 365));
  const activeLoans = readLoansRows_()
    .filter(function (row) {
      const st = String(row.status || "").toLowerCase();
      if (st !== "borrowing" && st !== "overdue") return false;
      const loanBookId = resolveBookIdByBarcode_(String(row.barcode || ""));
      return String(loanBookId || "") === String(bookId || "");
    })
    .sort(function (a, b) {
      return isoMs_(a.dueDate) - isoMs_(b.dueDate);
    });

  const availableCount = getAvailableBookItemsForBook_(bookId).length;
  const nowDate = new Date(now instanceof Date ? now.getTime() : Date.now());
  if (availableCount >= pos) return nowDate.toISOString().slice(0, 10);

  const needed = pos - availableCount;
  if (activeLoans.length >= needed) {
    const due = new Date(String(activeLoans[needed - 1].dueDate || nowDate.toISOString()));
    if (Number.isFinite(due.getTime())) return due.toISOString().slice(0, 10);
  }

  const base = activeLoans.length
    ? new Date(String(activeLoans[activeLoans.length - 1].dueDate || nowDate.toISOString()))
    : nowDate;
  const extra = Math.max(0, needed - activeLoans.length);
  const eta = addDays_(base, extra * days);
  return eta.toISOString().slice(0, 10);
}

function isoMs_(value) {
  const d = new Date(String(value || ""));
  return Number.isFinite(d.getTime()) ? d.getTime() : 0;
}
