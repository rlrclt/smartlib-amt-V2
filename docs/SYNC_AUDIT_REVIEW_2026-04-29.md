# Sync Audit Review (for Claude Code)

อัปเดต: 2026-04-29
โปรเจกต์: `smartlib-amt-V2`

## เป้าหมายเอกสาร
สรุปผลจาก `sync_audit` + จุดที่ควรปรับใน `member_sync` ก่อนลง production เพิ่มเติม

---

## สถานะปัจจุบัน (Current Behavior)
ระบบ `member_sync` ทำ polling ทุก 15 วินาที โดยยิงทุก resource พร้อมกัน:

- `member_sync:dashboard`
- `member_sync:books`
- `member_sync:loans`
- `member_sync:fines`
- `member_sync:reservations`
- `member_sync:profile`
- `member_sync:loan_self`

ผลคือแม้อยู่หน้าเดียว (เช่น `/app/books`) ก็ยิง key อื่นทั้งหมดด้วย

---

## Evidence จากข้อมูลจริง (sync_audit)
ตัวอย่างที่พบ:

- ช่วงแรกมี fail หลาย key พร้อมกัน:
  - `member_sync:books` → `JSONP request failed`
  - `member_sync:loans` → `JSONP request failed`
  - `member_sync:reservations` → `JSONP request failed`
  - `member_sync:dashboard` → `JSONP request failed`
- หลังจากนั้น success ต่อเนื่อง แต่ latency ค่อนข้างสูงหลายจุด (3s–5s เป็นปกติ)
- `member_sync:loan_self` มีบางรอบสูงมาก (เช่น ~8.7s และ ~11s)
- พบ pattern ยิงซ้ำในช่วงเวลาใกล้กันสำหรับ key เดิม (polling + force revalidate)

สรุปเชิงเทคนิค: ตอนนี้ระบบใช้งานได้ แต่เกิด **over-fetch + burst load** และเพิ่มโอกาส timeout/fail ในช่วง peak

---

## จุดที่ควรปรับ (Proposed Improvements)

### 1) Route-aware polling
ยิงเฉพาะ resource ที่จำเป็นกับ route ปัจจุบัน

ตัวอย่าง mapping:

- `/app` → `dashboard`, `loans`, `fines`
- `/app/books` → `books` (+ `reservations` ถ้ามี CTA จอง)
- `/app/loans` → `loans`, `fines`
- `/app/fines` → `fines`
- `/app/reservations` → `reservations`
- `/app/profile` → `profile`
- `/app/loan-self` → `loan_self` (+ `books` แบบ on-demand)

### 2) Polling tier
- Critical (หน้าใช้งานตรง): 10–15s
- Secondary (ข้อมูลประกอบ): 45–60s
- Heavy (`loan_self`): 30–60s หรือ on-demand

### 3) Jitter เพื่อลด burst
ไม่ให้ทุก key ยิงพร้อมกันใน millisecond เดียวกัน (เช่น random 0–1200ms)

### 4) Failure backoff
ถ้า key ไหน fail ต่อเนื่อง ให้พักนานขึ้นก่อน retry (exponential backoff)

### 5) In-flight guard ต่อ key + reason
มีแล้วบางส่วน แต่ควรติด tag สาเหตุ (`poll`, `manual`, `mutation`) เพื่อกัน revalidate ซ้อน

---

## โค้ดตัวอย่าง (Current Implementation Snapshot)

> ไฟล์: `public/app/data/member_sync.js`

```js
const POLL_MS = 15_000;

_timers.set(MEMBER_SYNC_KEYS.dashboard, window.setInterval(() => {
  void revalidateKey_(MEMBER_SYNC_KEYS.dashboard, fetchDashboardBundle_, { force: true });
}, POLL_MS));

_timers.set(MEMBER_SYNC_KEYS.books, window.setInterval(() => {
  void revalidateKey_(MEMBER_SYNC_KEYS.books, fetchBooksBundle_, { force: true });
}, POLL_MS));

_timers.set(MEMBER_SYNC_KEYS.loans, window.setInterval(() => {
  void revalidateKey_(MEMBER_SYNC_KEYS.loans, fetchLoansBundle_, { force: true });
}, POLL_MS));

_timers.set(MEMBER_SYNC_KEYS.fines, window.setInterval(() => {
  void revalidateKey_(MEMBER_SYNC_KEYS.fines, fetchFinesBundle_, { force: true });
}, POLL_MS));

_timers.set(MEMBER_SYNC_KEYS.reservations, window.setInterval(() => {
  void revalidateKey_(MEMBER_SYNC_KEYS.reservations, fetchReservationsBundle_, { force: true });
}, POLL_MS));

_timers.set(MEMBER_SYNC_KEYS.profile, window.setInterval(() => {
  void revalidateKey_(MEMBER_SYNC_KEYS.profile, fetchProfileBundle_, { force: true });
}, POLL_MS));

_timers.set(MEMBER_SYNC_KEYS.loanSelf, window.setInterval(() => {
  void revalidateKey_(MEMBER_SYNC_KEYS.loanSelf, fetchLoanSelfBundle_, { force: true });
}, POLL_MS));
```

> ไฟล์: `public/app/data/member_sync.js`

```js
function sendSyncAudit_(payload = {}) {
  apiSyncAuditLog(payload)
    .catch((err) => {
      console.warn("[MemberSyncAudit] failed", { error: err?.message || "audit failed" });
    });
}
```

---

## ตัวอย่าง schema ของชีตใหม่ (`sync_audit`)

คอลัมน์ปัจจุบัน:

1. `ts`
2. `uid`
3. `route`
4. `resourceKey`
5. `event`
6. `source`
7. `ok`
8. `latencyMs`
9. `error`
10. `metaJson`

รองรับการวิเคราะห์ได้ทันที เช่น:
- fail rate ต่อ route
- p95 latency ต่อ resource
- top error messages

---

## คำถามให้ Claude Code ช่วยรีวิว

1. โครงสร้าง `member_sync` ควร refactor เป็น scheduler แบบ route-aware อย่างไรให้ maintain ง่าย
2. ควรแยก `loan_self` ออกจาก polling global หรือไม่ (และรูปแบบไหนเหมาะสุด)
3. กลยุทธ์ backoff/jitter ที่เหมาะกับ JSONP + GAS
4. ควรเก็บ field เพิ่มใน `sync_audit` อะไรอีกเพื่อทำ RCA ได้ดีขึ้น
5. วิธีป้องกัน revalidate ซ้ำ (poll + mutation + mount) โดยไม่ทำให้ข้อมูล stale เกินไป

---

## ข้อเสนอ rollout

- Phase A: route-aware + jitter
- Phase B: backoff + dedupe reason
- Phase C: tune polling interval ราย resource
- Phase D: dashboard วิเคราะห์จาก `sync_audit`


---

## หลักการที่ใช้ (Design Principles ที่ใช้จริง)

เอกสารนี้อ้างอิงแนวทางที่ใช้งานอยู่ในโค้ดปัจจุบันของโปรเจกต์:

### A) SWR (Stale-While-Revalidate)
- UI อ่านข้อมูล cache ก่อนเพื่อให้หน้าไม่กระตุก
- ยิง network revalidate เบื้องหลังเพื่ออัปเดตข้อมูลล่าสุด
- ใช้กับ resource หลักทั้งหมดใน `member_sync`

### B) Single Source of Truth (Store-Centric)
- เก็บ bundle ต่อ resource ลง `store`
- ทุก view subscribe resource เดียวกันแทนยิง API เองกระจัดกระจาย
- ลดการโหลดซ้ำตอนเปลี่ยน route แบบ SPA

### C) In-flight Dedupe
- ถ้า key เดียวกันกำลัง fetch อยู่ จะ `join in-flight` ไม่ยิงซ้ำ
- ลด burst ที่เกิดจากหลายจุดเรียก revalidate พร้อมกัน

### D) Throttle Window
- มี guard เวลา (`THROTTLE_MS`) กัน revalidate ถี่เกินไป
- แม้มีการเรียกซ้ำหลายครั้งในช่วงสั้น จะไม่ยิง network ทุกครั้ง

### E) Lifecycle-driven Sync
- เริ่ม polling เมื่อ session active
- stop polling เมื่อ logout/session หมดอายุ
- ป้องกันงานพื้นหลังเกินจำเป็น

### F) Observable by Design
- ทุก revalidate success/fail ส่งเข้า `sync_audit`
- ใช้ข้อมูลจริงวิเคราะห์ fail-rate, latency, hot route, hot key

---

## โค้ดตัวอย่างของเรา (แนบเพิ่ม - Core Patterns)

> ไฟล์: `public/app/data/member_sync.js`

```js
if (_inFlight.has(key)) {
  logInfo_("join in-flight request", { key });
  return _inFlight.get(key);
}
```

```js
if (!shouldFetch_(key, force)) {
  logInfo_("skip revalidate (throttled)", { key, force });
  return { ok: true, data: store.get(key), source: "throttled" };
}
```

```js
const cached = getMemberResource(MEMBER_SYNC_KEYS.profile);
if (cached) {
  applyProfileBundle_(container, root, finesState, cached);
  void revalidateMemberResource(MEMBER_SYNC_KEYS.profile, { force: true });
}
```

```js
sendSyncAudit_({
  event: "revalidate_success",
  route: window.location.pathname || "",
  resourceKey: key,
  source: "network",
  ok: true,
  latencyMs: Date.now() - startedAt,
});
```

---

## Trade-off ที่อธิบายให้ Reviewer

1. **เร็วขึ้นฝั่ง UX** เพราะอ่าน cache ก่อน (SWR)
2. **แต่** ถ้า polling global ทั้งหมดพร้อมกัน จะเกิด over-fetch
3. จึงต้องขยับไป **route-aware scheduler + jitter + backoff**
4. โดยยังคงหลัก SWR + single store + observability เหมือนเดิม
