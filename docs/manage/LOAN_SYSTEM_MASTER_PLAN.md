# 🛠️ LOAN SYSTEM MASTER PLAN (Managed Integration)

ระบบการจัดการยืม-คืนฝั่งบรรณารักษ์ (`/manage/loans`) ได้รับการออกแบบใหม่เพื่อยกระดับจากระบบ "Staff-assisted" แบบดั้งเดิม ให้เป็น "Reservation-Based Checkout" ที่เน้นความปลอดภัย (Race Condition Defense), ความถูกต้อง (Eligibility Check), และประสิทธิภาพ (Atomic Transaction)

---

## 🔍 Audit & Problem Analysis (Current State)
ระบบปัจจุบันมีโครงสร้างพื้นฐานดังนี้:
*   **การสร้างรายการยืม (`loanCreateForm`)**: เรียกใช้ `apiLoansCreate` โดยส่ง `uid`, `barcode`, `locationId`, `notes` โดยตรง
*   **จุดอ่อนสำคัญ**:
    1. **Lack of Verification**: ไม่มีขั้นตอน Lookup ข้อมูลสมาชิกหรือหนังสือเพื่อยืนยันก่อนกดยืนยันการยืม
    2. **Race Condition Risk**: กระบวนการสร้างรายการยืมแยกขาดจากการจอง (Reservation) หากข้อมูลสถานะเปลี่ยนระหว่างรอการยืนยัน ระบบอาจเกิดความผิดพลาดได้
    3. **Missing Eligibility Check**: ขาดการตรวจสอบสถานะสมาชิก (Blacklist/Fine) และหนังสือ (Status/Expiry) ก่อนการทำรายการ
    4. **Client-side Orchestration**: การให้ Client ตัดสินใจลำดับการยืมเองมีความเสี่ยงสูงเกินไปสำหรับการทำงานแบบ Transactional

---

## 🏗️ ระยะการพัฒนา (Roadmap)

### 1. Backend: Optimized Atomic API (GAS)
- **`apiReservationGet(resId)`**: ดึงข้อมูลรายรายการ (Rich Data) โดยตรงจาก Backend ไม่ใช้การ Filter ฝั่ง Client
  - **Data Required**: `uid`, `barcode`, `memberName`, `memberStatus`, `bookTitle`, `bookStatus`, `fineAmount`, `reservationStatus`, `expiresAt`
- **`apiReservationCheckout(resId)`**: ทำงานในรูปแบบ Atomic Transaction โดยใช้ `LockService` ครอบการทำงานดังนี้:
  1. **Double-check**: ตรวจสอบสถานะการจอง (READY_FOR_PICKUP/APPROVED), Expiry, UID/Barcode match
  2. **Eligibility Check**: ตรวจสอบ Fine Policy ของสมาชิก (ถ้า Fine เกินกำหนดต้องไม่อนุญาตให้ยืม)
  3. **Finalization**: สร้าง Loan Record, ปิดสถานะจอง (`COMPLETED`), อัปเดตสถานะหนังสือ (`BORROWED`)

### 2. Frontend: Guardrails & UI/UX
- **Client Logic**: เลิกใช้การดึง List ทั้งหมดมา Filter เอง แต่เรียก `apiReservationGet(resId)` โดยตรงเพื่อตรวจสอบข้อมูลทันทีที่สแกน
- **Atomic UI**: 
    - Disable ปุ่มทันทีที่กด (Prevent Double Submission) เพื่อป้องกันการกดซ้ำ
    - แสดงสถานะ "กำลังบันทึก..."
    - แสดง Modal สรุปรายการก่อนกดยืนยันการยืมจริง
- **Audit Logging**: บันทึก Log ทุกเหตุการณ์ในระบบ (LOAN_CREATED, RESERVATION_CHECKOUT_COMPLETED, RESERVATION_CHECKOUT_FAILED) พร้อมข้อมูล `staffUid`, `memberUid`, `barcode`, `resId`

---

## 💻 แนวทางการ Implement (Client-Side Interface)

### 1. Controller Logic (Validation Flow)
```javascript
/**
 * Controller: จัดการกระบวนการสแกนรหัสและยืนยันแบบ Atomic
 */
async function handleScanCheckout(resId) {
  // 1. ดึงข้อมูล Preview จาก Backend โดยตรง (ลด Quota GAS)
  const result = await apiReservationGet(resId);
  if (!result.ok) return showToast("❌ ไม่พบข้อมูล: " + result.error, "danger");

  const data = result.data;

  // 2. ตรวจสอบ Eligibility Check (Fine Policy)
  if (data.fineAmount > CONFIG.FINE_LIMIT) {
     return showToast("⚠️ สมาชิกติดค่าปรับเกินกำหนด ไม่สามารถยืมเพิ่มได้", "warning");
  }

  // 3. แสดง Modal เพื่อยืนยัน (Confirmation Dialog)
  showReservationConfirmationModal(data, async (confirmBtn) => {
    // 4. Atomic Transaction Finalize
    confirmBtn.disabled = true;
    confirmBtn.textContent = "กำลังบันทึก...";
    
    const response = await apiReservationCheckout(resId);
    if (response.ok) {
      showToast("✅ ยืนยันการยืมสำเร็จ");
      refreshLoanTable();
    } else {
      showToast("❌ เกิดข้อผิดพลาด: " + response.error, "danger");
      confirmBtn.disabled = false;
      confirmBtn.textContent = "ยืนยันการยืม";
    }
  });
}
```

### 2. Backend Logic (GAS - Double-check with LockService)
```javascript
function apiReservationCheckout(resId) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // ป้องกัน Race Condition
    
    // 1. Double-check สถานะและเงื่อนไข (เพื่อกันการแก้ไขข้อมูลในช่องว่างเวลา)
    const resData = getReservationByCode(resId);
    if (!['READY_FOR_PICKUP', 'APPROVED'].includes(resData.status)) throw new Error("การจองไม่พร้อมรับ");
    if (new Date() > new Date(resData.expiresAt)) throw new Error("รหัสการจองหมดอายุ");
    
    // 2. Finalize Transaction (Create Loan -> Update Reservation COMPLETED -> Update Book BORROWED)
    // การทำงานในส่วนนี้ต้องทำใน Transaction เดียวกันเพื่อป้องกัน Data Inconsistency
    
    logAudit('RESERVATION_CHECKOUT_COMPLETED', { 
        resId, 
        staffUid: Session.getActiveUser().getEmail(),
        memberUid: resData.uid,
        barcode: resData.barcode 
    });
    
    return { ok: true };
  } catch (err) {
    logAudit('RESERVATION_CHECKOUT_FAILED', { resId, error: err.message });
    return { ok: false, error: err.message };
  } finally {
    lock.releaseLock();
  }
}
```

---
*Updated: 2026-04-30 | Love you <3*
