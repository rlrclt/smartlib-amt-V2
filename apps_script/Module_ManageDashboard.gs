/**
 * Module_ManageDashboard.gs
 * Admin/Librarian command-center statistics for /manage dashboard.
 */

function manageDashboardStats_(payload) {
  assertManageStaff_(payload && payload.auth);

  const cache = CacheService.getScriptCache();
  const cacheKey = "manage_dashboard_stats_v1";
  const cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const now = new Date();
  const rows = readDashboardRows_();
  const output = {
    summary: getDashboardSummary_(rows, now),
    pendingTasks: getPendingTasks_(rows, now),
    recentActivities: getRecentActivities_(rows),
    generatedAt: now.toISOString()
  };

  cache.put(cacheKey, JSON.stringify(output), 300);
  return output;
}

function readDashboardRows_() {
  const visitRows = typeof readLibraryVisitRows_ === "function"
    ? readLibraryVisitRows_().map(function (row) { return formatVisitSession_(row); })
    : [];
  return {
    users: readUserRows_().map(function (entry) { return entry.user || {}; }),
    loans: readLoansRows_().map(formatLoan_),
    fines: readFineRows_().map(formatFine_),
    reservations: readReservationRows_(),
    bookItems: readBookItemRows_(),
    catalogs: readBookCatalogRows_("active").concat(readBookCatalogRows_("archived")),
    visits: visitRows
  };
}

function getDashboardSummary_(rows, now) {
  const loans = rows.loans || [];
  const fines = rows.fines || [];
  const users = rows.users || [];
  const reservations = rows.reservations || [];
  const bookItems = rows.bookItems || [];
  const visits = rows.visits || [];

  const activeLoans = loans.filter(function (loan) {
    const st = String(loan.status || "").toLowerCase();
    return st === "borrowing" || st === "overdue";
  }).length;

  const overdueBooks = loans.filter(function (loan) {
    return String(loan.status || "").toLowerCase() === "overdue";
  }).length;

  const availableItems = bookItems.filter(function (item) {
    return String(item.status || "").toLowerCase() === "available";
  }).length;

  const unpaidRows = fines.filter(function (fine) {
    return String(fine.status || "").toLowerCase() === "unpaid";
  });
  const pendingFinesAmount = unpaidRows.reduce(function (sum, fine) {
    return sum + dashboardToNumber_(fine.amount, 0);
  }, 0);

  const waitingReservations = reservations.filter(function (row) {
    return String(row.status || "").toLowerCase() === "waiting";
  }).length;
  const readyReservations = reservations.filter(function (row) {
    const st = String(row.status || "").toLowerCase();
    if (st !== "ready") return false;
    const holdMs = dashboardIsoMs_(row.holdUntil);
    return !Number.isFinite(holdMs) || holdMs >= now.getTime();
  }).length;

  const memberRows = users.filter(function (user) {
    return String(user.groupType || "").toLowerCase() === "member";
  });
  const pendingVerification = memberRows.filter(function (user) {
    const status = String(user.status || "").toLowerCase();
    const verified = String(user.isVerified || "").toLowerCase() === "true";
    return status === "pending" || !verified;
  }).length;
  const weekStartMs = now.getTime() - (7 * 24 * 60 * 60 * 1000);
  const newMembersThisWeek = memberRows.filter(function (user) {
    return dashboardIsoMs_(user.createdAt) >= weekStartMs;
  }).length;

  const loanFlow = dashboardBuildWeekFlow_(loans, "loanDate", function () { return true; }, now);
  const overdueFlow = dashboardBuildWeekFlow_(loans, "dueDate", function (loan) {
    return String(loan.status || "").toLowerCase() === "overdue";
  }, now);
  const itemFlow = dashboardBuildWeekFlow_(bookItems, "createdAt", function () { return true; }, now);
  const fineFlow = dashboardBuildWeekFlow_(unpaidRows, "createdAt", function () { return true; }, now);
  const activeVisitors = visits.filter(function (row) {
    return String(row.status || "").toLowerCase() === "active";
  }).length;
  const visitFlow = dashboardBuildWeekFlow_(visits, "checkInAt", function () { return true; }, now);

  return {
    cards: {
      activeLoans: {
        value: activeLoans,
        trend: dashboardBuildTrend_(loanFlow.current, loanFlow.previous),
      },
      overdueBooks: {
        value: overdueBooks,
        trend: dashboardBuildTrend_(overdueFlow.current, overdueFlow.previous),
      },
      availableItems: {
        value: availableItems,
        trend: dashboardBuildTrend_(itemFlow.current, itemFlow.previous),
      },
      pendingFines: {
        value: pendingFinesAmount,
        trend: dashboardBuildTrend_(fineFlow.current, fineFlow.previous),
      },
      activeVisitors: {
        value: activeVisitors,
        trend: dashboardBuildTrend_(visitFlow.current, visitFlow.previous),
      }
    },
    books: {
      total: bookItems.length,
      available: availableItems,
      borrowed: bookItems.filter(function (item) {
        return String(item.status || "").toLowerCase() === "borrowed";
      }).length,
      damagedOrLost: bookItems.filter(function (item) {
        const st = String(item.status || "").toLowerCase();
        return st === "damaged" || st === "lost";
      }).length
    },
    loans: {
      active: activeLoans,
      overdue: overdueBooks,
      borrowedToday: dashboardCountSameDay_(loans, "loanDate", now),
      returnedToday: dashboardCountSameDay_(loans, "returnDate", now),
    },
    members: {
      total: memberRows.length,
      newThisWeek: newMembersThisWeek,
      pendingVerification: pendingVerification
    },
    fines: {
      pendingAmount: pendingFinesAmount,
      pendingCount: unpaidRows.length
    },
    reservations: {
      waitingQueue: waitingReservations,
      readyToPickUp: readyReservations
    },
    visits: {
      activeVisitors: activeVisitors,
      checkedInToday: dashboardCountSameDay_(visits, "checkInAt", now)
    }
  };
}

function getPendingTasks_(rows, now) {
  const reservations = rows.reservations || [];
  const users = rows.users || [];
  const bookItems = rows.bookItems || [];
  const catalogMap = dashboardBuildCatalogMap_(rows.catalogs || []);
  const userMap = dashboardBuildUserMap_(users);

  const reservationReady = reservations
    .filter(function (row) {
      const st = String(row.status || "").toLowerCase();
      if (st !== "ready") return false;
      const holdMs = dashboardIsoMs_(row.holdUntil);
      return !Number.isFinite(holdMs) || holdMs >= now.getTime();
    })
    .sort(function (a, b) {
      return dashboardIsoMs_(a.holdUntil) - dashboardIsoMs_(b.holdUntil);
    })
    .slice(0, 8)
    .map(function (row) {
      const uid = String(row.uid || "");
      const bookId = String(row.bookId || "");
      const member = userMap[uid] || {};
      const book = catalogMap[bookId] || {};
      return {
        resId: String(row.resId || ""),
        uid: uid,
        memberName: String(member.displayName || uid || "-"),
        bookId: bookId,
        bookTitle: String(book.title || bookId || "-"),
        reservedBarcode: String(row.reservedBarcode || ""),
        holdUntil: String(row.holdUntil || ""),
        readyAt: String(row.readyAt || "")
      };
    });

  const newMemberVerification = users
    .filter(function (user) {
      if (String(user.groupType || "").toLowerCase() !== "member") return false;
      const status = String(user.status || "").toLowerCase();
      const verified = String(user.isVerified || "").toLowerCase() === "true";
      return status === "pending" || !verified;
    })
    .sort(function (a, b) {
      return dashboardIsoMs_(b.createdAt) - dashboardIsoMs_(a.createdAt);
    })
    .slice(0, 8)
    .map(function (user) {
      return {
        uid: String(user.uid || ""),
        displayName: String(user.displayName || ""),
        email: String(user.email || ""),
        role: String(user.role || ""),
        createdAt: String(user.createdAt || ""),
        status: String(user.status || ""),
        isVerified: String(user.isVerified || "")
      };
    });

  const damagedBooks = bookItems
    .filter(function (item) {
      return String(item.status || "").toLowerCase() === "damaged";
    })
    .sort(function (a, b) {
      return dashboardIsoMs_(b.updatedAt) - dashboardIsoMs_(a.updatedAt);
    })
    .slice(0, 8)
    .map(function (item) {
      const bookId = String(item.bookId || "");
      const book = catalogMap[bookId] || {};
      return {
        barcode: String(item.barcode || ""),
        bookId: bookId,
        bookTitle: String(book.title || bookId || "-"),
        location: String(item.location || ""),
        condition: String(item.condition || ""),
        updatedAt: String(item.updatedAt || ""),
        notes: String(item.notes || "")
      };
    });

  return {
    reservationReady: reservationReady,
    newMemberVerification: newMemberVerification,
    damagedBooksAlert: damagedBooks
  };
}

function getRecentActivities_(rows) {
  const loans = rows.loans || [];
  const users = rows.users || [];
  const bookItems = rows.bookItems || [];
  const catalogMap = dashboardBuildCatalogMap_(rows.catalogs || []);
  const userMap = dashboardBuildUserMap_(users);
  const barcodeBookIdMap = dashboardBuildBarcodeBookMap_(bookItems);

  return loans
    .slice()
    .sort(function (a, b) {
      const aTs = Math.max(dashboardIsoMs_(a.updatedAt), dashboardIsoMs_(a.returnDate), dashboardIsoMs_(a.loanDate));
      const bTs = Math.max(dashboardIsoMs_(b.updatedAt), dashboardIsoMs_(b.returnDate), dashboardIsoMs_(b.loanDate));
      return bTs - aTs;
    })
    .slice(0, 10)
    .map(function (loan) {
      const status = String(loan.status || "").toLowerCase();
      const uid = String(loan.uid || "");
      const barcode = String(loan.barcode || "");
      const bookId = barcodeBookIdMap[barcode] || "";
      const book = catalogMap[bookId] || {};
      return {
        loanId: String(loan.loanId || ""),
        uid: uid,
        memberName: String((userMap[uid] && userMap[uid].displayName) || uid || "-"),
        barcode: barcode,
        bookId: bookId,
        bookTitle: String(book.title || bookId || "-"),
        status: status,
        actionLabel: dashboardLoanActionLabel_(status),
        loanDate: String(loan.loanDate || ""),
        dueDate: String(loan.dueDate || ""),
        returnDate: String(loan.returnDate || ""),
        updatedAt: String(loan.updatedAt || ""),
      };
    });
}

function dashboardBuildCatalogMap_(rows) {
  const map = {};
  (rows || []).forEach(function (row) {
    const bookId = String(row.bookId || "").trim();
    if (!bookId) return;
    map[bookId] = {
      bookId: bookId,
      title: String(row.title || ""),
      author: String(row.author || ""),
      coverUrl: String(row.coverUrl || "")
    };
  });
  return map;
}

function dashboardBuildUserMap_(users) {
  const map = {};
  (users || []).forEach(function (user) {
    const uid = String(user.uid || "").trim();
    if (!uid) return;
    map[uid] = {
      uid: uid,
      displayName: String(user.displayName || ""),
      email: String(user.email || "")
    };
  });
  return map;
}

function dashboardBuildBarcodeBookMap_(bookItems) {
  const map = {};
  (bookItems || []).forEach(function (item) {
    const barcode = String(item.barcode || "").trim();
    if (!barcode) return;
    map[barcode] = String(item.bookId || "");
  });
  return map;
}

function dashboardBuildWeekFlow_(rows, dateField, predicate, now) {
  const endMs = now.getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const currentStart = endMs - weekMs;
  const prevStart = currentStart - weekMs;
  var current = 0;
  var previous = 0;

  (rows || []).forEach(function (row) {
    if (typeof predicate === "function" && !predicate(row)) return;
    const ts = dashboardIsoMs_(row[dateField]);
    if (!Number.isFinite(ts) || ts <= 0) return;
    if (ts >= currentStart && ts <= endMs) current += 1;
    else if (ts >= prevStart && ts < currentStart) previous += 1;
  });

  return { current: current, previous: previous };
}

function dashboardBuildTrend_(current, previous) {
  const cur = Math.max(0, dashboardToNumber_(current, 0));
  const prev = Math.max(0, dashboardToNumber_(previous, 0));
  if (prev <= 0) {
    return {
      direction: cur > 0 ? "up" : "flat",
      percent: cur > 0 ? 100 : 0,
      current: cur,
      previous: prev,
      label: cur > 0 ? "+100% vs สัปดาห์ก่อน" : "0% vs สัปดาห์ก่อน"
    };
  }

  const delta = cur - prev;
  const percent = Math.round((Math.abs(delta) / prev) * 100);
  const direction = delta > 0 ? "up" : (delta < 0 ? "down" : "flat");
  const sign = delta > 0 ? "+" : (delta < 0 ? "-" : "");

  return {
    direction: direction,
    percent: percent,
    current: cur,
    previous: prev,
    label: sign + String(percent) + "% vs สัปดาห์ก่อน"
  };
}

function dashboardCountSameDay_(rows, key, now) {
  const target = dashboardYmd_(now);
  return (rows || []).reduce(function (sum, row) {
    const value = row ? row[key] : "";
    return dashboardYmd_(new Date(String(value || ""))) === target ? sum + 1 : sum;
  }, 0);
}

function dashboardLoanActionLabel_(status) {
  const st = String(status || "").toLowerCase();
  if (st === "returned") return "คืนแล้ว";
  if (st === "overdue") return "เกินกำหนด";
  if (st === "lost") return "แจ้งสูญหาย";
  return "ยืมหนังสือ";
}

function dashboardYmd_(dateObj) {
  const d = dateObj instanceof Date ? dateObj : new Date();
  if (!Number.isFinite(d.getTime())) return "";
  return Utilities.formatDate(d, Session.getScriptTimeZone(), "yyyy-MM-dd");
}

function dashboardIsoMs_(iso) {
  const d = new Date(String(iso || ""));
  return Number.isFinite(d.getTime()) ? d.getTime() : -1;
}

function dashboardToNumber_(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
