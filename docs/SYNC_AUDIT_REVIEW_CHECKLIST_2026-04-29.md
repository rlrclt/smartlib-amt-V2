# Sync Audit Review Checklist (for Claude Code)

อัปเดต: 2026-04-29
ไฟล์อ้างอิงหลัก: `docs/SYNC_AUDIT_REVIEW_2026-04-29.md`

## วิธีใช้
ให้ตอบทีละข้อแบบสั้น กระชับ และลงข้อเสนอแก้จริง (พร้อม pseudo-code หรือ code patch plan)

---

## 1) Architecture Fit
- โครงสร้าง `member_sync` ปัจจุบันเหมาะกับ SPA scale ปัจจุบันหรือไม่
- จุดไหนเป็น technical debt สูงสุด 3 อันดับ
- เสนอ target architecture เวอร์ชันถัดไป (minimal change)

**Expected output**
- Diagram สั้น ๆ (text)
- รายการโมดูลที่ต้องแก้ก่อน/หลัง

---

## 2) Polling Strategy
- ควรเปลี่ยนจาก global polling ไป route-aware อย่างไร
- เสนอ resource matrix ต่อ route ที่เหมาะสม
- กำหนด interval ต่อ tier (critical/secondary/heavy)

**Expected output**
- ตาราง route → resources → interval
- เหตุผลรองรับแต่ละกลุ่ม

---

## 3) Dedupe & Concurrency
- ตรวจแนวทางปัจจุบันของ in-flight dedupe ว่าเพียงพอหรือยัง
- ถ้ายังไม่พอ เสนอวิธีติด `reason` (`poll|mount|mutation|manual`) ใน revalidate
- แนะนำกลไกกันยิงซ้ำภายในช่วงเวลาสั้น ๆ

**Expected output**
- State machine แบบย่อ
- Guard conditions ที่ควรมี

---

## 4) Failure Handling
- ประเมินกรณี `JSONP request failed` ที่เกิด burst
- เสนอ backoff strategy (per key) ที่ปลอดภัย
- แนะนำ timeout ที่เหมาะสมต่อ resource

**Expected output**
- สูตร backoff ชัดเจน
- ตาราง timeout/retry ต่อ resource

---

## 5) Observability & Analytics
- ประเมิน schema `sync_audit` ปัจจุบันว่าพอหรือไม่
- ควรเพิ่ม field ไหนเพื่อทำ RCA ได้แม่นขึ้น
- ควรมี derived metrics อะไรบ้างใน dashboard

**Expected output**
- รายการ fields ใหม่ (ถ้ามี)
- SQL/Sheet formula idea สำหรับ metric สำคัญ

---

## 6) Performance Budget
- ตั้ง SLO/SLI ที่ realistic สำหรับ member sync
- ตัวเลขที่แนะนำ เช่น p95 latency, fail rate, stale window

**Expected output**
- SLO table
- alert threshold ที่ควรใช้

---

## 7) Migration Plan
- เสนอแผน rollout แบบไม่เสี่ยง (feature flag / phased release)
- ระบุ smoke test และ regression checklist

**Expected output**
- Phase plan (A/B/C)
- Go/No-go criteria ต่อ phase

---

## 8) Security & Abuse
- ตรวจว่าการเปิด action `sync_audit_log` มีความเสี่ยง spam หรือไม่
- เสนอ rate limit/validation ที่ควรเพิ่มใน GAS

**Expected output**
- Threat list
- Hardening checklist

---

## 9) Code-Level Review Targets
ให้รีวิวเฉพาะไฟล์ต่อไปนี้โดยตรง:

- `public/app/data/member_sync.js`
- `public/app/data/api.js`
- `public/app/views/member/reservations.view.js`
- `public/app/views/member/loan_self.view.js`
- `public/app/views/profile/profile.view.js`
- `apps_script/Module_SyncAudit.gs`
- `apps_script/Code.gs`
- `apps_script/Setup.gs`

**Expected output**
- รายการ “ต้องแก้ทันที” (high impact, low risk)
- รายการ “ควรแก้รอบถัดไป” (medium impact)

---

## 10) Final Recommendation
- สรุปว่า “พร้อมใช้งาน production หรือยัง”
- ถ้ายังไม่พร้อม ระบุ minimum fixes ที่ต้องผ่านก่อน

**Expected output**
- Verdict: Ready / Conditionally Ready / Not Ready
- Blocking issues list

