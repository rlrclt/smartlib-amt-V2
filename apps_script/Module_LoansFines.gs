/**
 * Module_LoansFines.gs
 * Loan + Return + Fines + Policy management (MVP: staff-assisted)
 */

const LOAN_V2_SCHEMA = {
  SHEET_NAME: (typeof SHEETS !== "undefined" && SHEETS.LOANS) || "loans",
  COLUMNS: [
    "loanId",
    "barcode",
    "uid",
    "loanDate",
    "dueDate",
    "returnDate",
    "status",
    "locationId",
    "notes",
    "updatedBy",
    "updatedAt",
    "renewCount",
    "loanType",
    "fineAmount"
  ]
};

const FINE_V2_SCHEMA = {
  SHEET_NAME: (typeof SHEETS !== "undefined" && SHEETS.FINES) || "fines",
  COLUMNS: [
    "fineId",
    "loanId",
    "uid",
    "amount",
    "type",
    "status",
    "paidAt",
    "receivedBy",
    "notes",
    "createdAt",
    "updatedAt",
    "barcode",
    "bookTitle"
  ]
};

const POLICY_V2_SCHEMA = {
  SHEET_NAME: (typeof SHEETS !== "undefined" && SHEETS.SETTINGS_POLICIES) || "settings_policies",
  COLUMNS: ["role", "loanQuota", "loanDays", "canRenew", "renewLimit", "resQuota", "holdDays", "updatedAt"]
};

const DEFAULT_LOAN_POLICIES = {
  student: { loanQuota: 3, loanDays: 7, canRenew: true, renewLimit: 1, resQuota: 3, holdDays: 2 },
  teacher: { loanQuota: 10, loanDays: 15, canRenew: true, renewLimit: 2, resQuota: 5, holdDays: 3 },
  staff: { loanQuota: 5, loanDays: 15, canRenew: true, renewLimit: 1, resQuota: 4, holdDays: 3 },
  external: { loanQuota: 2, loanDays: 3, canRenew: false, renewLimit: 0, resQuota: 1, holdDays: 2 },
  admin: { loanQuota: 20, loanDays: 30, canRenew: true, renewLimit: 5, resQuota: 8, holdDays: 5 },
  librarian: { loanQuota: 20, loanDays: 30, canRenew: true, renewLimit: 5, resQuota: 8, holdDays: 5 }
};

const LOAN_STATUSES = ["borrowing", "returned", "overdue", "lost"];
const FINE_TYPES = ["overdue", "damaged", "lost"];
const FINE_STATUSES = ["unpaid", "paid", "waived"];
const SELF_SERVICE_MAX_GPS_ACCURACY_METERS = 80;

function policiesList_(payload) {
  assertManageAdmin_(payload && payload.auth);
  const rows = ensureDefaultPolicies_().map(formatPolicy_).sort(function (a, b) {
    return String(a.role || "").localeCompare(String(b.role || ""));
  });
  return { items: rows, total: rows.length };
}

function policiesUpsert_(payload) {
  assertManageAdmin_(payload && payload.auth);
  const items = payload && payload.items;
  if (!Array.isArray(items) || !items.length) throw new Error("กรุณาระบุรายการนโยบาย");

  const existing = ensureDefaultPolicies_();
  const map = {};
  existing.forEach(function (row) {
    map[String(row.role || "").toLowerCase()] = row;
  });

  items.forEach(function (item) {
    const normalized = normalizePolicyInput_(item);
    map[normalized.role] = normalized;
  });

  const merged = Object.keys(map).sort().map(function (role) {
    return map[role];
  });

  writeAllPolicyRows_(merged);
  return { items: merged.map(formatPolicy_), total: merged.length };
}

function policiesResetDefaults_(payload) {
  assertManageAdmin_(payload && payload.auth);
  const now = new Date().toISOString();
  const rows = Object.keys(DEFAULT_LOAN_POLICIES).sort().map(function (role) {
    const cfg = DEFAULT_LOAN_POLICIES[role];
    return {
      role: role,
      loanQuota: cfg.loanQuota,
      loanDays: cfg.loanDays,
      canRenew: cfg.canRenew,
      renewLimit: cfg.renewLimit,
      resQuota: cfg.resQuota,
      holdDays: cfg.holdDays,
      updatedAt: now
    };
  });
  writeAllPolicyRows_(rows);
  return { items: rows.map(formatPolicy_), total: rows.length };
}

function loansList_(payload) {
  const viewer = assertLoanViewer_(payload && payload.auth);

  const statusFilter = String(payload && payload.status || "all").toLowerCase();
  const q = String(payload && payload.q || "").trim().toLowerCase();
  const page = Math.max(1, normalizeLoanInt_(payload && payload.page, 1));
  const limit = Math.max(1, normalizeLoanInt_(payload && payload.limit, 50, 200));

  var rows = readLoansRows_().map(formatLoan_);

  if (viewer.scopeUid) {
    rows = rows.filter(function (row) {
      return String(row.uid || "") === viewer.scopeUid;
    });
  }

  if (statusFilter !== "all") {
    rows = rows.filter(function (row) {
      return String(row.status || "").toLowerCase() === statusFilter;
    });
  }

  if (q) {
    rows = rows.filter(function (row) {
      return [row.loanId, row.uid, row.barcode, row.locationId, row.updatedBy]
        .join(" ")
        .toLowerCase()
        .indexOf(q) >= 0;
    });
  }

  rows.sort(function (a, b) {
    return safeLoanDateMs_(b.loanDate) - safeLoanDateMs_(a.loanDate);
  });

  const total = rows.length;
  const start = (page - 1) * limit;
  const items = rows.slice(start, start + limit);

  return {
    items: items,
    page: page,
    limit: limit,
    total: total,
    hasMore: start + limit < total
  };
}

function loansCreate_(payload) {
  const actor = assertManageStaff_(payload && payload.auth);
  const uid = String(payload && payload.uid || "").trim();
  const barcode = String(payload && payload.barcode || "").trim();
  const locationId = String(payload && payload.locationId || "").trim();
  const notes = String(payload && payload.notes || "").trim();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return createLoanTransaction_({
      actor: actor,
      uid: uid,
      barcode: barcode,
      locationId: locationId,
      notes: notes,
      loanType: "staff"
    });
  } finally {
    lock.releaseLock();
  }
}

function loansSelfCreate_(payload) {
  const actor = assertSelfServiceActor_(payload && payload.auth);
  const barcode = String(payload && payload.barcode || "").trim();
  const notes = String(payload && payload.notes || "").trim();
  const requestedDurationDays = normalizeLoanInt_(payload && payload.duration, NaN, 365);
  if (!barcode) throw new Error("กรุณาระบุ barcode");
  assertActiveVisitForSelfService_(actor.uid);

  const allowed = assertSelfServiceLocationAllowed_(payload, "borrow");
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    return createLoanTransaction_({
      actor: actor,
      uid: actor.uid,
      barcode: barcode,
      locationId: allowed.locationId,
      notes: notes,
      loanType: "self",
      requestedDurationDays: requestedDurationDays
    });
  } finally {
    lock.releaseLock();
  }
}

function loansSelfBootstrap_(payload) {
  const actor = assertSelfServiceActor_(payload && payload.auth);
  const policies = ensureDefaultPolicies_();
  const policy = findPolicyForRole_(policies, actor.role);
  const activeLoans = readLoansRows_()
    .filter(function (row) {
      if (String(row.uid || "") !== String(actor.uid || "")) return false;
      const st = String(row.status || "").toLowerCase();
      return st === "borrowing" || st === "overdue";
    })
    .map(formatLoan_)
    .sort(function (a, b) {
      return safeLoanDateMs_(a.dueDate) - safeLoanDateMs_(b.dueDate);
    });

  return {
    uid: String(actor.uid || ""),
    role: String(actor.role || ""),
    policy: policy,
    quota: {
      quota: policy.loanQuota,
      borrowingNow: activeLoans.length,
      remaining: Math.max(0, policy.loanQuota - activeLoans.length)
    },
    visit: getSelfServiceVisitBootstrap_(actor.uid),
    activeLoans: activeLoans,
    serverTime: new Date().toISOString()
  };
}

function loansSelfValidate_(payload) {
  const actor = assertSelfServiceActor_(payload && payload.auth);
  const barcode = String(payload && payload.barcode || "").trim();
  const mode = String(payload && payload.mode || "borrow").toLowerCase() === "return" ? "return" : "borrow";
  if (!barcode) throw new Error("กรุณาระบุ barcode");

  const item = findBookItemByBarcode_(barcode);
  if (!item || !item.rowData) throw new Error("ไม่พบ barcode ในคลังหนังสือ");

  const catalog = findCatalogByBookId_(String(item.rowData.bookId || ""));
  if (!catalog || !catalog.rowData) throw new Error("ไม่พบข้อมูลหนังสือแม่");
  if (String(catalog.rowData.status || "").toLowerCase() === "archived") {
    throw new Error("รายการหนังสือนี้ไม่พร้อมให้บริการ");
  }

  const itemStatus = String(item.rowData.status || "").toLowerCase();
  const loanRef = mode === "return"
    ? resolveSelfReturnLoanRef_({ barcode: barcode }, actor.uid)
    : null;

  if (mode === "borrow") {
    const isReservedForSelf = itemStatus === "reserved"
      && String(item.rowData.activeLoanId || "").indexOf("RES:") === 0
      && typeof reservationCanBorrowReadyByBarcode_ === "function"
      && reservationCanBorrowReadyByBarcode_(actor.uid, barcode) === true;
    if (itemStatus !== "available" && !isReservedForSelf) {
      throw new Error("หนังสือเล่มนี้ยังไม่พร้อมให้ยืม");
    }

    const policies = ensureDefaultPolicies_();
    const policy = findPolicyForRole_(policies, actor.role);
    const activeLoanCount = readLoansRows_().reduce(function (count, row) {
      if (String(row.uid || "") !== String(actor.uid || "")) return count;
      const st = String(row.status || "").toLowerCase();
      return st === "borrowing" || st === "overdue" ? count + 1 : count;
    }, 0);
    if (activeLoanCount >= policy.loanQuota) {
      throw new Error("เกินโควตาการยืมของบัญชีนี้");
    }
  } else {
    if (itemStatus !== "borrowed") {
      throw new Error("เล่มนี้ไม่ได้อยู่ในสถานะกำลังยืม");
    }
  }

  return {
    ok: true,
    mode: mode,
    barcode: barcode,
    item: {
      barcode: String(item.rowData.barcode || ""),
      bookId: String(item.rowData.bookId || ""),
      status: itemStatus,
      activeLoanId: String(item.rowData.activeLoanId || "")
    },
    book: {
      bookId: String(catalog.rowData.bookId || ""),
      title: String(catalog.rowData.title || ""),
      author: String(catalog.rowData.author || ""),
      coverUrl: String(catalog.rowData.coverUrl || "")
    },
    loan: loanRef ? { loanId: String(loanRef.loanId || "") } : null
  };
}

function loansReturn_(payload) {
  const actor = assertManageStaff_(payload && payload.auth);
  const loanId = String(payload && payload.loanId || "").trim();
  const condition = normalizeReturnCondition_(payload && payload.condition ? payload.condition : "good");
  const notes = String(payload && payload.notes || "").trim();
  const damagedFineAmount = toMoney_(payload && payload.damagedFineAmount, 0);
  const lostFineAmount = toMoney_(payload && payload.lostFineAmount, 0);

  return processLoanReturn_({
    actor: actor,
    loanId: loanId,
    condition: condition,
    notes: notes,
    damagedFineAmount: damagedFineAmount,
    lostFineAmount: lostFineAmount,
    isSelfService: false,
    enforceUnpaidFineBlock: false
  });
}

function loansSelfReturn_(payload) {
  const actor = assertSelfServiceActor_(payload && payload.auth);
  const condition = normalizeReturnCondition_(payload && payload.condition ? payload.condition : "good");
  const notes = String(payload && payload.notes || "").trim();
  const loanRef = resolveSelfReturnLoanRef_(payload, actor.uid);
  assertActiveVisitForSelfService_(actor.uid);
  const allowed = assertSelfServiceLocationAllowed_(payload, "return");

  const result = processLoanReturn_({
    actor: actor,
    loanId: loanRef.loanId,
    condition: condition,
    notes: notes,
    damagedFineAmount: 0,
    lostFineAmount: 0,
    isSelfService: true,
    enforceUnpaidFineBlock: true,
    selfLocationId: allowed.locationId
  });

  return result;
}

function loansRenew_(payload) {
  const viewer = assertLoanViewer_(payload && payload.auth);
  const loanId = String(payload && payload.loanId || "").trim();
  const expectedUpdatedAt = String(payload && payload.updatedAt || "").trim();
  if (!loanId) throw new Error("กรุณาระบุ loanId");

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const found = findLoanById_(loanId);
    if (!found || !found.rowNumber || !found.rowData) throw new Error("ไม่พบรายการยืม");
    const loan = found.rowData;

    if (viewer.scopeUid && String(loan.uid || "") !== String(viewer.scopeUid || "")) {
      throw new Error("403: สามารถต่ออายุได้เฉพาะรายการของตนเอง");
    }

    if (expectedUpdatedAt && String(loan.updatedAt || "") !== expectedUpdatedAt) {
      throw new Error("409: CONFLICT รายการนี้ถูกแก้ไขโดยผู้อื่นแล้ว กรุณาโหลดใหม่");
    }

    const status = String(loan.status || "").toLowerCase();
    if (status !== "borrowing") {
      throw new Error("ต่ออายุได้เฉพาะรายการที่กำลังยืมอยู่และยังไม่เกินกำหนด");
    }

    const dueMs = safeLoanDateMs_(loan.dueDate);
    if (!Number.isFinite(dueMs) || dueMs <= 0) throw new Error("ไม่พบวันกำหนดคืนที่ถูกต้อง");
    if (dueMs < Date.now()) {
      throw new Error("ไม่สามารถต่ออายุได้ เนื่องจากรายการนี้เลยกำหนดคืนแล้ว");
    }

    const borrowerEntry = findUserRowByUid_(String(loan.uid || ""));
    if (!borrowerEntry || !borrowerEntry.user) throw new Error("ไม่พบข้อมูลผู้ยืม");
    const borrower = borrowerEntry.user;
    const policies = ensureDefaultPolicies_();
    const policy = findPolicyForRole_(policies, String(borrower.role || "").toLowerCase());

    if (!policy.canRenew || policy.renewLimit <= 0) {
      throw new Error("บัญชีนี้ไม่มีสิทธิ์ต่ออายุการยืม");
    }

    const renewCount = Math.max(0, normalizeLoanInt_(loan.renewCount, 0, 100));
    if (renewCount >= policy.renewLimit) {
      throw new Error("ใช้สิทธิ์ต่ออายุครบตามจำนวนที่กำหนดแล้ว");
    }

    const bookId = resolveBookIdByBarcode_(String(loan.barcode || ""));
    if (bookId && hasActiveReservationByOthers_(bookId, String(loan.uid || ""))) {
      throw new Error("ไม่สามารถต่ออายุได้ เนื่องจากมีสมาชิกคนอื่นจองรายการนี้ไว้");
    }

    const now = new Date();
    const baseMs = Math.max(dueMs, now.getTime());
    const nextDue = addDays_(new Date(baseMs), policy.loanDays);
    const nowIso = now.toISOString();

    loan.dueDate = nextDue.toISOString();
    loan.renewCount = renewCount + 1;
    loan.updatedAt = nowIso;
    loan.updatedBy = String(viewer.email || viewer.uid || "");
    writeObjectRow_(getLoansSheet_(), found.rowNumber, LOAN_V2_SCHEMA.COLUMNS, loan);

    createNotification_({
      uid: String(loan.uid || ""),
      title: "ต่ออายุการยืมสำเร็จ",
      message: 'รายการ "' + String(loan.barcode || "") + '" ถูกต่ออายุถึง ' + String(loan.dueDate || ""),
      type: "loan",
      senderUid: "SYSTEM",
      link: "/app/loans"
    });

    return {
      ok: true,
      loan: formatLoan_(loan),
      renew: {
        canRenew: policy.canRenew,
        renewLimit: policy.renewLimit,
        renewCount: loan.renewCount,
        remaining: Math.max(0, policy.renewLimit - loan.renewCount),
        addedDays: policy.loanDays
      }
    };
  } finally {
    lock.releaseLock();
  }
}

function createLoanTransaction_(opts) {
  const actor = opts.actor || {};
  const barcode = String(opts.barcode || "").trim();
  const uid = String(opts.uid || "").trim();
  const locationId = String(opts.locationId || "").trim();
  const notes = String(opts.notes || "").trim();
  const loanType = String(opts.loanType || "staff").toLowerCase() === "self" ? "self" : "staff";

  if (!barcode) throw new Error("กรุณาระบุ barcode");
  if (!uid) throw new Error("กรุณาระบุ uid");

  const userEntry = findUserRowByUid_(uid);
  if (!userEntry || !userEntry.user) throw new Error("ไม่พบผู้ยืม");
  const borrower = userEntry.user;
  if (String(borrower.status || "").toLowerCase() !== "active") {
    throw new Error("ผู้ยืมยังไม่อยู่ในสถานะ active");
  }
  if (String(borrower.isVerified || "").toLowerCase() !== "true") {
    throw new Error("ผู้ยืมยังไม่ยืนยันอีเมล");
  }

  const item = findBookItemByBarcode_(barcode);
  if (!item || !item.rowData) throw new Error("ไม่พบ barcode ในคลังหนังสือ");
  const itemStatus = String(item.rowData.status || "").toLowerCase();
  if (itemStatus !== "available") {
    if (itemStatus === "reserved" && String(item.rowData.activeLoanId || "").indexOf("RES:") === 0) {
      const consumed = reservationConsumeReadyByBarcode_(uid, barcode, new Date().toISOString());
      if (!consumed) throw new Error("หนังสือเล่มนี้ถูกจองไว้และยังไม่พร้อมให้ยืม");
    } else {
      throw new Error("หนังสือเล่มนี้ยังไม่พร้อมให้ยืม");
    }
  }

  const catalog = findCatalogByBookId_(String(item.rowData.bookId || ""));
  if (!catalog || !catalog.rowData) throw new Error("ไม่พบข้อมูลหนังสือแม่");
  if (String(catalog.rowData.status || "").toLowerCase() === "archived") {
    throw new Error("ไม่สามารถยืมได้ เพราะหนังสือนี้ถูก archive แล้ว");
  }

  const policies = ensureDefaultPolicies_();
  const role = String(borrower.role || "").toLowerCase();
  const policy = findPolicyForRole_(policies, role);
  const requestedDurationDays = normalizeLoanInt_(opts.requestedDurationDays, NaN, 365);
  const requestedDays = Number.isFinite(requestedDurationDays) ? requestedDurationDays : policy.loanDays;
  if (requestedDays < 1 || requestedDays > policy.loanDays) {
    throw new Error("จำนวนวันยืมต้องอยู่ระหว่าง 1 - " + String(policy.loanDays) + " วัน");
  }

  const activeLoanCount = readLoansRows_().reduce(function (count, row) {
    if (String(row.uid || "") !== uid) return count;
    const st = String(row.status || "").toLowerCase();
    return st === "borrowing" || st === "overdue" ? count + 1 : count;
  }, 0);

  if (activeLoanCount >= policy.loanQuota) {
    throw new Error("เกินโควตาการยืมของผู้ใช้รายนี้");
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const due = addDays_(now, requestedDays);
  const updatedBy = String(actor.email || actor.uid || "");

  const loanObj = {
    loanId: nextLoanId_(),
    barcode: barcode,
    uid: uid,
    loanDate: nowIso,
    dueDate: due.toISOString(),
    returnDate: "",
    status: "borrowing",
    locationId: locationId,
    notes: notes,
    updatedBy: updatedBy,
    updatedAt: nowIso,
    renewCount: 0,
    loanType: loanType,
    fineAmount: 0
  };

  appendObjectRow_(getLoansSheet_(), LOAN_V2_SCHEMA.COLUMNS, loanObj);

  const bookRow = item.rowData;
  bookRow.status = "borrowed";
  bookRow.activeLoanId = loanObj.loanId;
  bookRow.updatedAt = nowIso;
  writeObjectRow_(getBookItemsSheet_(), item.rowNumber, BOOK_ITEM_SCHEMA.COLUMNS, bookRow);

  bumpBooksCacheVersion_();

  return {
    ok: true,
    loan: formatLoan_(loanObj),
    policy: {
      loanDays: policy.loanDays,
      selectedDurationDays: requestedDays
    },
    quota: {
      role: role,
      quota: policy.loanQuota,
      borrowingNow: activeLoanCount + 1,
      remaining: Math.max(0, policy.loanQuota - (activeLoanCount + 1)),
      maxLoanDays: policy.loanDays,
      selectedDurationDays: requestedDays
    }
  };
}

function processLoanReturn_(opts) {
  const actor = opts.actor || {};
  const loanId = String(opts.loanId || "").trim();
  const condition = normalizeReturnCondition_(opts.condition || "good");
  const notes = String(opts.notes || "").trim();
  const damagedFineAmount = toMoney_(opts.damagedFineAmount, 0);
  const lostFineAmount = toMoney_(opts.lostFineAmount, 0);
  const enforceUnpaidFineBlock = opts.enforceUnpaidFineBlock === true;
  const selfLocationId = String(opts.selfLocationId || "").trim();
  const isSelfService = opts.isSelfService === true;

  if (!loanId) throw new Error("กรุณาระบุ loanId");

  const loanFound = findLoanById_(loanId);
  if (!loanFound || !loanFound.rowData) throw new Error("ไม่พบรายการยืม");

  const loan = loanFound.rowData;
  const currentStatus = String(loan.status || "").toLowerCase();
  if (currentStatus !== "borrowing" && currentStatus !== "overdue") {
    throw new Error("รายการนี้ไม่อยู่ในสถานะที่คืนได้");
  }

  if (isSelfService && String(loan.uid || "") !== String(actor.uid || "")) {
    throw new Error("403: สามารถคืนได้เฉพาะรายการของตนเอง");
  }

  if (enforceUnpaidFineBlock) {
    const unpaidFine = findUnpaidFineByLoanId_(loanId);
    if (unpaidFine) {
      throw new Error("มีค่าปรับค้างชำระ " + String(unpaidFine.amount || 0) + " บาท กรุณาติดต่อเจ้าหน้าที่");
    }
  }

  const bookFound = findBookItemByBarcode_(String(loan.barcode || ""));
  if (!bookFound || !bookFound.rowData) throw new Error("ไม่พบข้อมูลหนังสือที่ผูกกับ loan");

  const now = new Date();
  const nowIso = now.toISOString();
  const shouldMarkLost = condition === "lost";

  const overdueFine = calculateOverdueFineAmount_(loan, now);
  const createdFineIds = [];

  if (overdueFine > 0) {
    const fineRes = upsertFineForLoan_(loan, {
      amount: overdueFine,
      type: "overdue",
      notes: "ค่าปรับคืนเกินกำหนด",
      actorUid: String(actor.uid || ""),
      nowIso: nowIso
    });
    if (fineRes && fineRes.fineId) createdFineIds.push(fineRes.fineId);
  }

  if (condition === "poor" && damagedFineAmount > 0) {
    const damagedRes = upsertFineForLoan_(loan, {
      amount: damagedFineAmount,
      type: "damaged",
      notes: "ค่าปรับกรณีหนังสือชำรุด",
      actorUid: String(actor.uid || ""),
      nowIso: nowIso
    });
    if (damagedRes && damagedRes.fineId) createdFineIds.push(damagedRes.fineId);
  }

  if (shouldMarkLost && lostFineAmount > 0) {
    const lostRes = upsertFineForLoan_(loan, {
      amount: lostFineAmount,
      type: "lost",
      notes: "ค่าปรับกรณีหนังสือสูญหาย",
      actorUid: String(actor.uid || ""),
      nowIso: nowIso
    });
    if (lostRes && lostRes.fineId) createdFineIds.push(lostRes.fineId);
  }

  loan.returnDate = nowIso;
  loan.status = shouldMarkLost ? "lost" : "returned";
  loan.notes = notes || String(loan.notes || "");
  loan.updatedBy = String(actor.email || actor.uid || "");
  loan.updatedAt = nowIso;
  loan.fineAmount = Math.max(toMoney_(loan.fineAmount, 0), overdueFine);
  if (selfLocationId) loan.locationId = selfLocationId;
  writeObjectRow_(getLoansSheet_(), loanFound.rowNumber, LOAN_V2_SCHEMA.COLUMNS, loan);

  const item = bookFound.rowData;
  item.activeLoanId = "";
  item.updatedAt = nowIso;

  if (shouldMarkLost) {
    item.status = "lost";
    item.condition = "poor";
  } else if (condition === "poor") {
    item.status = "damaged";
    item.condition = "poor";
  } else {
    item.status = "available";
    item.condition = condition;
  }

  writeObjectRow_(getBookItemsSheet_(), bookFound.rowNumber, BOOK_ITEM_SCHEMA.COLUMNS, item);
  bumpBooksCacheVersion_();
  if (String(item.status || "").toLowerCase() === "available" && typeof promoteQueueForBook_ === "function") {
    promoteQueueForBook_(String(item.bookId || ""), nowIso);
  }

  return {
    ok: true,
    loan: formatLoan_(loan),
    fineIds: createdFineIds
  };
}

function resolveSelfReturnLoanRef_(payload, uid) {
  const loanId = String(payload && payload.loanId || "").trim();
  if (loanId) return { loanId: loanId };

  const barcode = String(payload && payload.barcode || "").trim();
  if (!barcode) throw new Error("กรุณาระบุ barcode หรือ loanId");

  const target = readLoansRows_().find(function (row) {
    if (String(row.uid || "") !== String(uid || "")) return false;
    if (String(row.barcode || "") !== barcode) return false;
    const st = String(row.status || "").toLowerCase();
    return st === "borrowing" || st === "overdue";
  });

  if (!target) throw new Error("ไม่พบรายการยืมที่กำลังใช้งานสำหรับ barcode นี้");
  return { loanId: String(target.loanId || "") };
}

function assertSelfServiceLocationAllowed_(payload, purpose) {
  const latitude = toNumber_(payload && payload.latitude, NaN);
  const longitude = toNumber_(payload && payload.longitude, NaN);
  const accuracy = toNumber_(payload && payload.accuracy, NaN);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error("กรุณาอนุญาตพิกัดก่อนทำรายการ");
  }
  if (!Number.isFinite(accuracy) || accuracy <= 0) {
    throw new Error("ไม่พบข้อมูลความแม่นยำ GPS");
  }
  if (accuracy > SELF_SERVICE_MAX_GPS_ACCURACY_METERS) {
    throw new Error("สัญญาณ GPS ยังไม่แม่นยำพอ (accuracy " + String(Math.round(accuracy)) + "m) กรุณารอสักครู่แล้วลองใหม่");
  }

  const check = settingsLocationsCheck_({
    latitude: latitude,
    longitude: longitude,
    accuracy: accuracy,
    purpose: purpose
  });

  if (!check || check.allowed !== true) {
    throw new Error("ไม่อยู่ในพื้นที่ที่อนุญาตสำหรับการทำรายการ");
  }

  const strictAllowedMatch = Array.isArray(check.matches)
    ? check.matches.find(function (item) {
      if (!item || item.allowed !== true) return false;
      const distance = toNumber_(item.distance_meters, NaN);
      const range = toNumber_(item.range_meters, NaN);
      if (!Number.isFinite(distance) || !Number.isFinite(range) || range <= 0) return false;
      return distance + accuracy <= range;
    })
    : null;
  if (!strictAllowedMatch) {
    throw new Error("พิกัดยังคลาดเคลื่อนเกินรัศมีที่อนุญาต กรุณาเข้าใกล้จุดบริการหรือรอสัญญาณนิ่งขึ้น");
  }

  return {
    locationId: String(strictAllowedMatch && strictAllowedMatch.id || ""),
    accuracyWarning: check.accuracy_warning === true
  };
}

function findUnpaidFineByLoanId_(loanId) {
  const target = String(loanId || "").trim();
  if (!target) return null;
  const rows = readFineRows_();
  for (var i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (String(row.loanId || "") !== target) continue;
    if (String(row.status || "").toLowerCase() !== "unpaid") continue;
    return formatFine_(row);
  }
  return null;
}

function getSelfServiceVisitBootstrap_(uid) {
  const defaults = {
    required: true,
    active: false,
    session: null
  };
  try {
    const runtime = (typeof getLibraryRuntimeSettings_ === "function")
      ? getLibraryRuntimeSettings_()
      : { enforceVisitRequired: true };
    const session = (typeof getActiveVisitSessionForUid_ === "function")
      ? getActiveVisitSessionForUid_(uid)
      : null;
    return {
      required: runtime.enforceVisitRequired !== false,
      active: Boolean(session),
      session: session
    };
  } catch (_err) {
    return defaults;
  }
}

function assertActiveVisitForSelfService_(uid) {
  const visit = getSelfServiceVisitBootstrap_(uid);
  if (visit.required !== true) return;
  if (visit.active === true && visit.session) return;
  throw new Error("กรุณาเช็คอินเข้าใช้ห้องสมุดก่อนทำรายการที่หน้า /app/checkin");
}

function loansRunOverdueCheck_(payload) {
  const actor = assertManageStaff_(payload && payload.auth);
  const now = new Date();
  const nowIso = now.toISOString();

  const rateConfig = getFineConfig_();
  const rows = readLoansRowsWithRowNumber_();

  let changedCount = 0;
  let fineCount = 0;

  rows.forEach(function (entry) {
    const loan = entry.rowData;
    const status = String(loan.status || "").toLowerCase();
    if (status !== "borrowing" && status !== "overdue") return;

    const due = new Date(String(loan.dueDate || ""));
    if (!Number.isFinite(due.getTime())) return;

    const daysLate = diffDaysFloor_(due, now) - rateConfig.bufferDays;
    if (daysLate <= 0) return;

    loan.status = "overdue";
    loan.fineAmount = Math.max(0, daysLate * rateConfig.rateOverdue);
    loan.updatedAt = nowIso;
    loan.updatedBy = actor.uid;
    writeObjectRow_(getLoansSheet_(), entry.rowNumber, LOAN_V2_SCHEMA.COLUMNS, loan);
    changedCount += 1;

    const fineRes = upsertFineForLoan_(loan, {
      amount: loan.fineAmount,
      type: "overdue",
      notes: "ระบบอัปเดตสถานะ overdue",
      actorUid: actor.uid,
      nowIso: nowIso
    });

    if (fineRes && fineRes.created) {
      fineCount += 1;
      createNotification_({
        uid: String(loan.uid || ""),
        title: "หนังสือเกินกำหนดคืน",
        message: 'รายการยืม "' + String(loan.barcode || "") + '" เกินกำหนดคืนแล้ว',
        type: "loan",
        senderUid: "SYSTEM",
        link: "/app"
      });
    }
  });

  return {
    ok: true,
    changedCount: changedCount,
    newFineCount: fineCount,
    rateOverdue: rateConfig.rateOverdue,
    bufferDays: rateConfig.bufferDays
  };
}

function finesList_(payload) {
  const viewer = assertLoanViewer_(payload && payload.auth);

  const statusFilter = String(payload && payload.status || "all").toLowerCase();
  const typeFilter = String(payload && payload.type || "all").toLowerCase();
  const q = String(payload && payload.q || "").trim().toLowerCase();
  const page = Math.max(1, normalizeLoanInt_(payload && payload.page, 1));
  const limit = Math.max(1, normalizeLoanInt_(payload && payload.limit, 50, 200));

  var rows = readFineRows_().map(formatFine_);

  if (viewer.scopeUid) {
    rows = rows.filter(function (row) {
      return String(row.uid || "") === viewer.scopeUid;
    });
  }

  if (statusFilter !== "all") {
    rows = rows.filter(function (row) {
      return String(row.status || "").toLowerCase() === statusFilter;
    });
  }

  if (typeFilter !== "all") {
    rows = rows.filter(function (row) {
      return String(row.type || "").toLowerCase() === typeFilter;
    });
  }

  if (q) {
    rows = rows.filter(function (row) {
      return [row.fineId, row.loanId, row.uid, row.barcode, row.bookTitle, row.notes]
        .join(" ")
        .toLowerCase()
        .indexOf(q) >= 0;
    });
  }

  rows.sort(function (a, b) {
    return safeLoanDateMs_(b.createdAt) - safeLoanDateMs_(a.createdAt);
  });

  const total = rows.length;
  const start = (page - 1) * limit;
  const items = rows.slice(start, start + limit);

  const unpaidTotal = rows.reduce(function (sum, row) {
    return String(row.status || "") === "unpaid" ? sum + toMoney_(row.amount, 0) : sum;
  }, 0);

  return {
    items: items,
    page: page,
    limit: limit,
    total: total,
    unpaidTotal: unpaidTotal,
    hasMore: start + limit < total
  };
}

function finesCreateManual_(payload) {
  const actor = assertManageStaff_(payload && payload.auth);

  const loanId = String(payload && payload.loanId || "").trim();
  const uidInput = String(payload && payload.uid || "").trim();
  const type = normalizeFineType_(payload && payload.type);
  const amount = toMoney_(payload && payload.amount, NaN);
  const notes = String(payload && payload.notes || "").trim();

  if (!loanId) throw new Error("กรุณาระบุ loanId");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("จำนวนค่าปรับต้องมากกว่า 0");

  const loanFound = findLoanById_(loanId);
  if (!loanFound || !loanFound.rowData) throw new Error("ไม่พบ loanId ที่ระบุ");

  const loan = loanFound.rowData;
  const uid = uidInput || String(loan.uid || "");
  if (!uid) throw new Error("ไม่พบ uid สำหรับค่าปรับรายการนี้");

  const fine = createFineRecord_({
    loanId: loanId,
    uid: uid,
    amount: amount,
    type: type,
    status: "unpaid",
    paidAt: "",
    receivedBy: "",
    notes: notes,
    barcode: String(loan.barcode || ""),
    bookTitle: resolveBookTitleByBarcode_(String(loan.barcode || "")),
    actorUid: actor.uid
  });

  loan.fineAmount = Math.max(toMoney_(loan.fineAmount, 0), amount);
  loan.updatedAt = fine.updatedAt;
  loan.updatedBy = actor.uid;
  writeObjectRow_(getLoansSheet_(), loanFound.rowNumber, LOAN_V2_SCHEMA.COLUMNS, loan);

  return { ok: true, fine: formatFine_(fine) };
}

function finesPay_(payload) {
  const actor = assertManageStaff_(payload && payload.auth);
  const fineId = String(payload && payload.fineId || "").trim();
  const note = String(payload && payload.notes || "").trim();
  if (!fineId) throw new Error("กรุณาระบุ fineId");

  const found = findFineById_(fineId);
  if (!found || !found.rowData) throw new Error("ไม่พบค่าปรับรายการนี้");

  const fine = found.rowData;
  if (String(fine.status || "") !== "unpaid") {
    throw new Error("รายการนี้ไม่ได้อยู่ในสถานะ unpaid");
  }

  const nowIso = new Date().toISOString();
  fine.status = "paid";
  fine.paidAt = nowIso;
  fine.receivedBy = actor.uid;
  fine.updatedAt = nowIso;
  if (note) fine.notes = note;

  writeObjectRow_(getFinesSheet_(), found.rowNumber, FINE_V2_SCHEMA.COLUMNS, fine);
  return { ok: true, fine: formatFine_(fine) };
}

function finesWaive_(payload) {
  const actor = assertManageAdmin_(payload && payload.auth);
  const fineId = String(payload && payload.fineId || "").trim();
  const note = String(payload && payload.notes || "").trim();
  if (!fineId) throw new Error("กรุณาระบุ fineId");
  if (!note) throw new Error("กรุณาระบุเหตุผลการยกเว้นค่าปรับ");

  const found = findFineById_(fineId);
  if (!found || !found.rowData) throw new Error("ไม่พบค่าปรับรายการนี้");

  const fine = found.rowData;
  if (String(fine.status || "") !== "unpaid") {
    throw new Error("รายการนี้ไม่ได้อยู่ในสถานะ unpaid");
  }

  const nowIso = new Date().toISOString();
  fine.status = "waived";
  fine.receivedBy = actor.uid;
  fine.updatedAt = nowIso;
  fine.notes = note;

  writeObjectRow_(getFinesSheet_(), found.rowNumber, FINE_V2_SCHEMA.COLUMNS, fine);
  return { ok: true, fine: formatFine_(fine) };
}

function assertManageStaff_(auth) {
  const uid = String(auth && auth.user && auth.user.uid || auth && auth.uid || "").trim();
  if (!uid) throw new Error("401: INVALID_TOKEN");

  const found = findUserRowByUid_(uid);
  if (!found || !found.user) throw new Error("401: INVALID_TOKEN");

  const user = found.user;
  const groupType = String(user.groupType || "").toLowerCase();
  const role = String(user.role || "").toLowerCase();
  const status = String(user.status || "").toLowerCase();

  if (status !== "active") throw new Error("401: INVALID_TOKEN");
  if (groupType !== "manage") throw new Error("403: MANAGE_REQUIRED");
  if (role !== "admin" && role !== "librarian") throw new Error("403: STAFF_REQUIRED");

  return {
    uid: String(user.uid || ""),
    email: String(user.email || "").toLowerCase(),
    role: role,
    groupType: groupType
  };
}

function assertLoanViewer_(auth) {
  const uid = String(auth && auth.user && auth.user.uid || auth && auth.uid || "").trim();
  if (!uid) throw new Error("401: INVALID_TOKEN");

  const found = findUserRowByUid_(uid);
  if (!found || !found.user) throw new Error("401: INVALID_TOKEN");

  const user = found.user;
  const groupType = String(user.groupType || "").toLowerCase();
  const role = String(user.role || "").toLowerCase();
  const status = String(user.status || "").toLowerCase();

  if (status !== "active") throw new Error("401: INVALID_TOKEN");

  if (groupType === "member") {
    return {
      uid: String(user.uid || ""),
      email: String(user.email || "").toLowerCase(),
      role: role,
      groupType: groupType,
      scopeUid: String(user.uid || "")
    };
  }

  if (groupType === "manage" && (role === "admin" || role === "librarian")) {
    return {
      uid: String(user.uid || ""),
      email: String(user.email || "").toLowerCase(),
      role: role,
      groupType: groupType,
      scopeUid: ""
    };
  }

  throw new Error("403: MEMBER_OR_STAFF_REQUIRED");
}

function assertSelfServiceActor_(auth) {
  const viewer = assertLoanViewer_(auth);
  if (viewer.groupType === "member") return viewer;

  // รองรับ admin/librarian ที่เข้าโหมด member เพื่อทดสอบ flow
  if (viewer.groupType === "manage" && (viewer.role === "admin" || viewer.role === "librarian")) {
    return viewer;
  }

  throw new Error("403: SELF_SERVICE_REQUIRED");
}

function assertManageAdmin_(auth) {
  const actor = assertManageStaff_(auth);
  if (actor.role !== "admin") throw new Error("403: ADMIN_REQUIRED");
  return actor;
}

function getLoansSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(LOAN_V2_SCHEMA.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(LOAN_V2_SCHEMA.SHEET_NAME);
  ensureHeader_(sheet, LOAN_V2_SCHEMA.COLUMNS);
  return sheet;
}

function getFinesSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(FINE_V2_SCHEMA.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(FINE_V2_SCHEMA.SHEET_NAME);
  ensureHeader_(sheet, FINE_V2_SCHEMA.COLUMNS);
  return sheet;
}

function getPolicySheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(POLICY_V2_SCHEMA.SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(POLICY_V2_SCHEMA.SHEET_NAME);
  ensureHeader_(sheet, POLICY_V2_SCHEMA.COLUMNS);
  return sheet;
}

function readLoansRows_() {
  return readRowsAsObjects_(getLoansSheet_(), LOAN_V2_SCHEMA.COLUMNS);
}

function readLoansRowsWithRowNumber_() {
  return readRowsAsObjectsWithRowNumber_(getLoansSheet_(), LOAN_V2_SCHEMA.COLUMNS);
}

function readFineRows_() {
  return readRowsAsObjects_(getFinesSheet_(), FINE_V2_SCHEMA.COLUMNS);
}

function readPolicyRows_() {
  return readRowsAsObjects_(getPolicySheet_(), POLICY_V2_SCHEMA.COLUMNS);
}

function readRowsAsObjectsWithRowNumber_(sheet, columns) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(1, 1, lastRow, columns.length).getValues();
  const header = values[0];
  const indexMap = {};
  header.forEach(function (name, idx) {
    indexMap[name] = idx;
  });

  return values.slice(1).map(function (row, i) {
    const out = {};
    columns.forEach(function (col) {
      out[col] = row[indexMap[col]];
    });
    return {
      rowNumber: i + 2,
      rowData: out
    };
  });
}

function ensureDefaultPolicies_() {
  const rows = readPolicyRows_();
  if (rows.length > 0) return rows;

  const now = new Date().toISOString();
  const defaults = Object.keys(DEFAULT_LOAN_POLICIES).map(function (role) {
    const cfg = DEFAULT_LOAN_POLICIES[role];
    return {
      role: role,
      loanQuota: cfg.loanQuota,
      loanDays: cfg.loanDays,
      canRenew: cfg.canRenew,
      renewLimit: cfg.renewLimit,
      updatedAt: now
    };
  });

  appendObjectRows_(getPolicySheet_(), POLICY_V2_SCHEMA.COLUMNS, defaults);
  return defaults;
}

function writeAllPolicyRows_(rows) {
  const sheet = getPolicySheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, POLICY_V2_SCHEMA.COLUMNS.length).clearContent();
  }

  if (!rows.length) return;

  const sorted = rows.slice().sort(function (a, b) {
    return String(a.role || "").localeCompare(String(b.role || ""));
  });

  const values = sorted.map(function (row) {
    return POLICY_V2_SCHEMA.COLUMNS.map(function (col) {
      return row[col] === undefined ? "" : row[col];
    });
  });

  sheet.getRange(2, 1, values.length, POLICY_V2_SCHEMA.COLUMNS.length).setValues(values);
}

function normalizePolicyInput_(item) {
  const now = new Date().toISOString();
  const role = String(item && item.role || "").trim().toLowerCase();
  if (!role) throw new Error("role ห้ามว่าง");

  const quota = Math.max(1, normalizeLoanInt_(item && item.loanQuota, 1, 200));
  const days = Math.max(1, normalizeLoanInt_(item && item.loanDays, 1, 365));
  const canRenew = normalizeLoanBoolean_(item && item.canRenew);
  var renewLimit = Math.max(0, normalizeLoanInt_(item && item.renewLimit, 0, 20));
  const resQuota = Math.max(1, normalizeLoanInt_(item && item.resQuota, Math.min(5, quota), 20));
  const holdDays = Math.max(1, normalizeLoanInt_(item && item.holdDays, 2, 14));
  if (!canRenew) renewLimit = 0;

  return {
    role: role,
    loanQuota: quota,
    loanDays: days,
    canRenew: canRenew,
    renewLimit: renewLimit,
    resQuota: resQuota,
    holdDays: holdDays,
    updatedAt: now
  };
}

function findPolicyForRole_(policies, role) {
  const roleKey = String(role || "student").toLowerCase();
  const fromSheet = policies.find(function (row) {
    return String(row.role || "").toLowerCase() === roleKey;
  });

  if (fromSheet) {
    return {
      role: roleKey,
      loanQuota: Math.max(1, normalizeLoanInt_(fromSheet.loanQuota, 1, 200)),
      loanDays: Math.max(1, normalizeLoanInt_(fromSheet.loanDays, 1, 365)),
      canRenew: normalizeLoanBoolean_(fromSheet.canRenew),
      renewLimit: Math.max(0, normalizeLoanInt_(fromSheet.renewLimit, 0, 20)),
      resQuota: Math.max(1, normalizeLoanInt_(fromSheet.resQuota, 3, 20)),
      holdDays: Math.max(1, normalizeLoanInt_(fromSheet.holdDays, 2, 14))
    };
  }

  const fallback = DEFAULT_LOAN_POLICIES[roleKey] || DEFAULT_LOAN_POLICIES.student;
  return {
    role: roleKey,
    loanQuota: fallback.loanQuota,
    loanDays: fallback.loanDays,
    canRenew: fallback.canRenew,
    renewLimit: fallback.renewLimit,
    resQuota: fallback.resQuota,
    holdDays: fallback.holdDays
  };
}

function findUserRowByUid_(uid) {
  const id = String(uid || "").trim();
  if (!id) return null;
  const rows = readUserRows_();
  return rows.find(function (entry) {
    return String(entry.user.uid || "") === id;
  }) || null;
}

function findBookItemByBarcode_(barcode) {
  return findRowByField_(getBookItemsSheet_(), BOOK_ITEM_SCHEMA.COLUMNS, "barcode", barcode);
}

function findCatalogByBookId_(bookId) {
  return findCatalogRowByBookId_(bookId);
}

function resolveBookIdByBarcode_(barcode) {
  const found = findBookItemByBarcode_(barcode);
  if (!found || !found.rowData) return "";
  return String(found.rowData.bookId || "").trim();
}

function getReservationsSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const name = (typeof RESERVATION_SCHEMA !== "undefined" && RESERVATION_SCHEMA.SHEET_NAME)
    || ((typeof SHEETS !== "undefined" && SHEETS.RESERVATIONS) || "reservations");
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  const cols = (typeof RESERVATION_SCHEMA !== "undefined" && RESERVATION_SCHEMA.COLUMNS)
    || ["resId", "bookId", "uid", "resDate", "status", "notifiedAt"];
  ensureHeader_(sheet, cols);
  return sheet;
}

function readReservationRows_() {
  const cols = (typeof RESERVATION_SCHEMA !== "undefined" && RESERVATION_SCHEMA.COLUMNS)
    || ["resId", "bookId", "uid", "resDate", "status", "notifiedAt"];
  return readRowsAsObjects_(getReservationsSheet_(), cols);
}

function hasActiveReservationByOthers_(bookId, borrowerUid) {
  const targetBookId = String(bookId || "").trim();
  const ownerUid = String(borrowerUid || "").trim();
  if (!targetBookId) return false;

  const inactiveStatuses = {
    cancelled: true,
    canceled: true,
    fulfilled: true,
    completed: true,
    expired: true,
    rejected: true,
    archived: true
  };

  return readReservationRows_().some(function (row) {
    if (String(row.bookId || "") !== targetBookId) return false;
    if (String(row.uid || "") === ownerUid) return false;
    const status = String(row.status || "active").toLowerCase();
    return inactiveStatuses[status] !== true;
  });
}

function findLoanById_(loanId) {
  return findRowByField_(getLoansSheet_(), LOAN_V2_SCHEMA.COLUMNS, "loanId", loanId);
}

function findFineById_(fineId) {
  return findRowByField_(getFinesSheet_(), FINE_V2_SCHEMA.COLUMNS, "fineId", fineId);
}

function nextLoanId_() {
  const rows = readLoansRows_();
  const prefix = "LN-" + formatYmd_(new Date()) + "-";
  var maxSeq = 0;

  rows.forEach(function (row) {
    const id = String(row.loanId || "");
    if (id.indexOf(prefix) !== 0) return;
    const seq = Number(id.slice(prefix.length));
    if (Number.isFinite(seq)) maxSeq = Math.max(maxSeq, seq);
  });

  return prefix + String(maxSeq + 1).padStart(4, "0");
}

function nextFineId_() {
  const rows = readFineRows_();
  const prefix = "FN-" + formatYmd_(new Date()) + "-";
  var maxSeq = 0;

  rows.forEach(function (row) {
    const id = String(row.fineId || "");
    if (id.indexOf(prefix) !== 0) return;
    const seq = Number(id.slice(prefix.length));
    if (Number.isFinite(seq)) maxSeq = Math.max(maxSeq, seq);
  });

  return prefix + String(maxSeq + 1).padStart(4, "0");
}

function upsertFineForLoan_(loan, opts) {
  const loanId = String(loan.loanId || "");
  const type = normalizeFineType_(opts && opts.type);
  const amount = toMoney_(opts && opts.amount, NaN);
  const note = String(opts && opts.notes || "").trim();
  const actorUid = String(opts && opts.actorUid || "").trim();
  const nowIso = String(opts && opts.nowIso || new Date().toISOString());

  if (!Number.isFinite(amount) || amount <= 0) return null;

  const rows = readRowsAsObjectsWithRowNumber_(getFinesSheet_(), FINE_V2_SCHEMA.COLUMNS);
  const found = rows.find(function (entry) {
    return String(entry.rowData.loanId || "") === loanId &&
      String(entry.rowData.type || "") === type &&
      String(entry.rowData.status || "") === "unpaid";
  });

  if (found) {
    const row = found.rowData;
    row.amount = amount;
    row.notes = note || row.notes;
    row.updatedAt = nowIso;
    row.receivedBy = actorUid || row.receivedBy;
    writeObjectRow_(getFinesSheet_(), found.rowNumber, FINE_V2_SCHEMA.COLUMNS, row);
    return { fineId: row.fineId, created: false };
  }

  const fine = createFineRecord_({
    loanId: loanId,
    uid: String(loan.uid || ""),
    amount: amount,
    type: type,
    status: "unpaid",
    paidAt: "",
    receivedBy: actorUid,
    notes: note,
    barcode: String(loan.barcode || ""),
    bookTitle: resolveBookTitleByBarcode_(String(loan.barcode || "")),
    actorUid: actorUid,
    nowIso: nowIso
  });

  return { fineId: fine.fineId, created: true };
}

function createFineRecord_(input) {
  const nowIso = String(input && input.nowIso || new Date().toISOString());
  const fineObj = {
    fineId: nextFineId_(),
    loanId: String(input && input.loanId || ""),
    uid: String(input && input.uid || ""),
    amount: toMoney_(input && input.amount, 0),
    type: normalizeFineType_(input && input.type),
    status: normalizeFineStatus_(input && input.status),
    paidAt: String(input && input.paidAt || ""),
    receivedBy: String(input && input.receivedBy || ""),
    notes: String(input && input.notes || "").trim(),
    createdAt: nowIso,
    updatedAt: nowIso,
    barcode: String(input && input.barcode || ""),
    bookTitle: String(input && input.bookTitle || "")
  };

  appendObjectRow_(getFinesSheet_(), FINE_V2_SCHEMA.COLUMNS, fineObj);
  createNotification_({
    uid: String(fineObj.uid || ""),
    title: "มีค่าปรับใหม่",
    message: "คุณมีค่าปรับประเภท " + String(fineObj.type || "") + " จำนวน " + String(fineObj.amount || 0) + " บาท",
    type: "fine",
    senderUid: String(input && input.actorUid || "SYSTEM"),
    link: "/app"
  });
  return fineObj;
}

function resolveBookTitleByBarcode_(barcode) {
  const found = findBookItemByBarcode_(barcode);
  if (!found || !found.rowData) return "";
  const bookId = String(found.rowData.bookId || "");
  const catalog = findCatalogByBookId_(bookId);
  if (!catalog || !catalog.rowData) return "";
  return String(catalog.rowData.title || "");
}

function calculateOverdueFineAmount_(loan, atDate) {
  const rateCfg = getFineConfig_();
  const due = new Date(String(loan.dueDate || ""));
  if (!Number.isFinite(due.getTime())) return 0;
  const toDate = atDate instanceof Date ? atDate : new Date();
  const rawDays = diffDaysFloor_(due, toDate);
  const daysLate = rawDays - rateCfg.bufferDays;
  if (daysLate <= 0) return 0;
  return Math.max(0, daysLate * rateCfg.rateOverdue);
}

function getFineConfig_() {
  const fallback = {
    rateOverdue: 5,
    bufferDays: 0
  };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const settingsSheet = ss.getSheetByName((typeof SHEETS !== "undefined" && SHEETS.SETTINGS) || "settings");
  if (!settingsSheet || settingsSheet.getLastRow() < 2) return fallback;

  const values = settingsSheet.getDataRange().getValues();
  const header = values[0].map(function (v) { return String(v || "").toLowerCase(); });
  const keyIdx = header.indexOf("key") >= 0 ? header.indexOf("key") : 0;
  const valueIdx = header.indexOf("value") >= 0 ? header.indexOf("value") : 1;

  const map = {};
  values.slice(1).forEach(function (row) {
    const key = String(row[keyIdx] || "").trim().toLowerCase();
    if (!key) return;
    map[key] = row[valueIdx];
  });

  const rate = toMoney_(map.fine_rate_overdue, fallback.rateOverdue);
  const buffer = normalizeLoanInt_(map.fine_buffer_days, fallback.bufferDays, 30);

  return {
    rateOverdue: rate,
    bufferDays: buffer
  };
}

function formatLoan_(row) {
  return {
    loanId: String(row.loanId || ""),
    barcode: String(row.barcode || ""),
    uid: String(row.uid || ""),
    loanDate: String(row.loanDate || ""),
    dueDate: String(row.dueDate || ""),
    returnDate: String(row.returnDate || ""),
    status: normalizeLoanStatus_(row.status),
    locationId: String(row.locationId || ""),
    notes: String(row.notes || ""),
    updatedBy: String(row.updatedBy || ""),
    updatedAt: String(row.updatedAt || ""),
    renewCount: Math.max(0, normalizeLoanInt_(row.renewCount, 0, 100)),
    loanType: String(row.loanType || "staff"),
    fineAmount: toMoney_(row.fineAmount, 0)
  };
}

function formatFine_(row) {
  return {
    fineId: String(row.fineId || ""),
    loanId: String(row.loanId || ""),
    uid: String(row.uid || ""),
    amount: toMoney_(row.amount, 0),
    type: normalizeFineType_(row.type),
    status: normalizeFineStatus_(row.status),
    paidAt: String(row.paidAt || ""),
    receivedBy: String(row.receivedBy || ""),
    notes: String(row.notes || ""),
    createdAt: String(row.createdAt || ""),
    updatedAt: String(row.updatedAt || ""),
    barcode: String(row.barcode || ""),
    bookTitle: String(row.bookTitle || "")
  };
}

function formatPolicy_(row) {
  return {
    role: String(row.role || "").toLowerCase(),
    loanQuota: Math.max(1, normalizeLoanInt_(row.loanQuota, 1, 200)),
    loanDays: Math.max(1, normalizeLoanInt_(row.loanDays, 1, 365)),
    canRenew: normalizeLoanBoolean_(row.canRenew),
    renewLimit: Math.max(0, normalizeLoanInt_(row.renewLimit, 0, 20)),
    resQuota: Math.max(1, normalizeLoanInt_(row.resQuota, 3, 20)),
    holdDays: Math.max(1, normalizeLoanInt_(row.holdDays, 2, 14)),
    updatedAt: String(row.updatedAt || "")
  };
}

function normalizeLoanStatus_(status) {
  const key = String(status || "borrowing").toLowerCase();
  return LOAN_STATUSES.indexOf(key) >= 0 ? key : "borrowing";
}

function normalizeReturnCondition_(value) {
  const key = String(value || "good").toLowerCase();
  if (key === "lost") return "lost";
  return normalizeItemCondition_(key);
}

function normalizeLoanBoolean_(value) {
  if (value === true) return true;
  const text = String(value || "").toLowerCase();
  return text === "true" || text === "1" || text === "yes" || text === "active";
}

function normalizeFineType_(type) {
  const key = String(type || "overdue").toLowerCase();
  if (FINE_TYPES.indexOf(key) < 0) throw new Error("ประเภทค่าปรับไม่ถูกต้อง");
  return key;
}

function normalizeFineStatus_(status) {
  const key = String(status || "unpaid").toLowerCase();
  if (FINE_STATUSES.indexOf(key) < 0) throw new Error("สถานะค่าปรับไม่ถูกต้อง");
  return key;
}

function normalizeLoanInt_(value, fallback, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  var rounded = Math.round(n);
  if (rounded < 0) rounded = 0;
  if (Number.isFinite(max) && rounded > max) rounded = max;
  return rounded;
}

function toMoney_(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(n * 100) / 100;
}

function addDays_(date, days) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + Number(days || 0));
  return d;
}

function diffDaysFloor_(fromDate, toDate) {
  const start = new Date(fromDate.getTime());
  const end = new Date(toDate.getTime());
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.floor((end.getTime() - start.getTime()) / 86400000);
}

function formatYmd_(date) {
  const tz = Session.getScriptTimeZone();
  return Utilities.formatDate(date, tz, "yyyyMMdd");
}

function safeLoanDateMs_(value) {
  const d = new Date(String(value || ""));
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : 0;
}
