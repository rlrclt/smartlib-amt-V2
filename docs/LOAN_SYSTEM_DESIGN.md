# แผนการออกแบบ: ระบบยืม-คืนหนังสือ (Loan & Return System) - v2.1 (Production Ready)

เอกสารนี้ระบุรายละเอียดการพัฒนาโมดูลการยืม-คืนหนังสือ โดยใช้หลักการ Batch Operations เพื่อประสิทธิภาพสูงสุดบน Google Apps Script

## 1. วัตถุประสงค์
จัดการกระบวนการยืมและคืนหนังสือ โดยเน้นความเร็ว ความแม่นยำ และรองรับข้อมูลจำนวนมาก (1,000 - 10,000 แถว)

## 2. โครงสร้างข้อมูล (Database Schema)
ตารางหลัก: **`loans`** ใน Google Sheets

| Column | Field Name | Type | Description |
| :--- | :--- | :--- | :--- |
| **A** | `loanId` | String | **Primary Key**: รหัสการยืม (เช่น `LN-20240525-0001`) |
| **B** | `barcode` | String | **Foreign Key**: รหัสบาร์โค้ดหนังสือ (จาก `book_items`) |
| **C** | `uid` | String | **Foreign Key**: รหัสผู้ยืม (จาก `users`) |
| **D** | `loanDate` | ISO8601 | วันที่และเวลาที่ทำรายการยืม |
| **E** | `dueDate` | Date | วันที่กำหนดคืน (คำนวณตามบทบาทผู้ใช้) |
| **F** | `returnDate` | ISO8601 | วันที่และเวลาที่คืนจริง (ว่างไว้หากยังไม่คืน) |
| **G** | `status` | Enum | สถานะ: `borrowing`, `returned`, `overdue`, `lost` |
| **H** | `locationId` | String | **Foreign Key**: รหัสพิกัดที่ทำรายการ (จาก `settings_locations`) |
| **I** | `notes` | String | หมายเหตุเพิ่มเติม (เช่น สภาพหนังสือตอนคืน) |
| **J** | `updatedBy` | String | รหัสผู้ใช้ที่ทำรายการบันทึก (Admin/Librarian หรือ Self) |
| **K** | `updatedAt` | ISO8601 | วันที่อัปเดตข้อมูลล่าสุด |
| **L** | `renewCount` | Number | จำนวนครั้งที่ต่ออายุการยืม (Default: 0) |
| **M** | `loanType` | Enum | ประเภทการยืม: `self` (ทำเอง), `staff` (เจ้าหน้าที่ทำให้) |
| **N** | `fineAmount` | Number | จำนวนค่าปรับสะสม (ถ้ามี) |

## 3. ความสัมพันธ์ของข้อมูล (Data Relationships)
1. **`loans.barcode` ↔ `book_items.barcode`**: เพื่อระบุว่าหนังสือเล่มไหนถูกยืม และอัปเดตสถานะหนังสือ
2. **`loans.uid` ↔ `users.uid`**: เพื่อระบุตัวตนผู้ยืมและตรวจสอบโควตาตาม `role`
3. **`loans.locationId` ↔ `settings_locations.id`**: เพื่อตรวจสอบว่าการยืม-คืนเกิดขึ้นในพิกัดที่ได้รับอนุญาต
4. **`book_items.activeLoanId` ↔ `loans.loanId`**: สำหรับการเชื่อมโยงข้อมูลหนังสือที่กำลังถูกยืมอยู่
5. **`loans.loanId` ↔ `fines.loanId`**: สำหรับการเชื่อมโยงข้อมูลค่าปรับที่เกิดขึ้นจากการยืมรายการนี้ (ถ้ามี)

## 4. กฎและเงื่อนไขการทำงาน (Business Logic)

### 4.1 ช่องทางการทำรายการ (Transaction Channels)
ระบบรองรับการทำรายการ 2 รูปแบบหลักที่มีเงื่อนไขต่างกัน:

#### **A. ฝั่งเจ้าหน้าที่ (Staff-assisted)**
- **บทบาท**: `admin` หรือ `librarian` เท่านั้น
- **Geofencing**: **ไม่บังคับใช้** (เจ้าหน้าที่สามารถทำรายการได้จากทุกที่ที่เป็นจุดบริการ)
- **สิทธิ์พิเศษ**: สามารถกดยืนยันการยืม/คืนได้ทันที และสามารถระบุหมายเหตุพิเศษ (Notes) ได้อย่างอิสระ
- **บันทึกข้อมูล**: `loanType: 'staff'`, `updatedBy: [Email ของเจ้าหน้าที่]`

#### **B. ฝั่งสมาชิก (Self-service)**
- **บทบาท**: สมาชิกกลุ่ม `member` ทุกคน
- **Geofencing**: **บังคับใช้ 100%** ระบบจะตรวจสอบ GPS ปัจจุบันเทียบกับรัศมีใน `settings_locations` ก่อนแสดงปุ่มทำรายการ
- **ข้อจำกัด**: ต้องผ่านการตรวจสอบสถานะบัญชี (Active) และโควตาการยืมที่เหลืออยู่ตามระบบอัตโนมัติเท่านั้น
- **บันทึกข้อมูล**: `loanType: 'self'`, `updatedBy: [Email ของสมาชิก]`

### 4.2 การตรวจสอบก่อนการยืม (Pre-loan Validation)
- **สถานะผู้ยืม**: ต้องมี `status === 'active'` และ `isVerified === true`
- **สถานะหนังสือ (Item)**: ต้องมี `status === 'available'` หรือ `status === 'reserved'` (กรณี `reserved` ผู้ยืมต้องเป็นเจ้าของคิวจองที่ได้รับอนุญาต)
- **สถานะหนังสือ (Catalog)**: รหัสแม่ต้องไม่เป็น `archived` (อ้างอิง `books_catalog.status`)
- **โควตาการยืม**: ตรวจสอบจำนวนเล่มที่ค้างส่ง (ไม่เกินโควตาที่กำหนดตามบทบาท)
- **พิกัดพื้นที่**: ต้องทำรายการภายในระยะ `range_borrow` ของจุดพิกัดใดจุดหนึ่งที่ `is_active` (เฉพาะ Self-service)

### 4.3 การกำหนดวันคืน (Due Date Calculation)
- คำนวณอัตโนมัติตาม `role` ของผู้ยืม (อ้างอิงตารางนโยบายในหัวข้อที่ 6)

### 4.4 กระบวนการคืน (Return Process)
- **การคืน**: อัปเดต `returnDate`, เปลี่ยนสถานะใน `loans` เป็น `returned`
- **หนังสือ (Item)**: 
  - หากไม่มีการจองคิว: เปลี่ยนสถานะใน `book_items` กลับเป็น `available`
  - หากมีคิวจอง (`waiting`): เปลี่ยนสถานะเป็น `reserved` และล็อคให้สมาชิกในคิวแรก (อ้างอิง `RESERVATION_SYSTEM_DESIGN.md`)
  - ล้างค่า `activeLoanId`
  - อัปเดตสภาพหนังสือ `condition` (good, fair, poor) หากมีการเปลี่ยนแปลง
- **พิกัดพื้นที่**: ต้องทำรายการภายในระยะ `range_return` (เฉพาะ Self-service)
- **กรณีสูญหาย (Lost)**: หากบันทึกสถานะเป็น `lost` ในรายการยืม ระบบจะอัปเดต `book_items.status` เป็น `lost` ทันที

## 5. กฎเหล็กทางเทคนิค (Technical Best Practices)
เพื่อให้ระบบทำงานได้ลื่นไหลบน GAS เราจะใช้กฎดังนี้:
- **Batch Read/Write**: อ่านข้อมูลเข้า Memory ครั้งเดียวด้วย `getValues()` และเขียนกลับครั้งเดียวด้วย `setValues()`
- **Memory Processing**: การวนลูปตรวจสอบเงื่อนไข (Validation) และการนับโควตา จะทำใน JavaScript Array ทั้งหมด
- **Centralized Config**: ค่า Quota และจำนวนวันยืมจะถูกเก็บไว้ใน `CONFIG` object ในไฟล์ `Config.gs`
- **Atomic-ish Updates**: พยายามเขียนข้อมูลลงชีต `loans`, `book_items` และ `reservations` ให้ต่อเนื่องกันที่สุดเพื่อป้องกันข้อมูลไม่ตรงกัน

## 6. นโยบายการยืม (Library Policy Config)
ข้อมูลส่วนนี้จะถูกจัดเก็บในตารางฐานข้อมูล **`settings_policies`** เพื่อให้ Admin สามารถปรับเปลี่ยนนโยบายได้จากหน้าจอ **`/manage/settings`** โดยไม่ต้องแก้ไขโค้ด

### โครงสร้างตาราง `settings_policies`
| Column | Field Name | Description |
| :--- | :--- | :--- |
| **A** | `role` | บทบาทผู้ใช้ (Primary Key) เช่น `student`, `teacher` |
| **B** | `loanQuota` | จำนวนเล่มสูงสุดที่ยืมได้ |
| **C** | `loanDays` | จำนวนวันที่อนุญาตให้ยืม |
| **D** | `canRenew` | สิทธิ์การต่ออายุ (TRUE/FALSE) |
| **E** | `renewLimit` | จำนวนครั้งสูงสุดที่ต่ออายุได้ |
| **F** | `resQuota` | จำนวนการจองสูงสุดต่อคน |
| **G** | `holdDays` | จำนวนวันที่เก็บหนังสือที่จองไว้ให้ |
| **H** | `updatedAt` | วันที่แก้ไขล่าสุด |

### ตารางนโยบายเริ่มต้น (Default Values)
| Role | Quota (เล่ม) | Loan Duration (วัน) |
| :--- | :---: | :---: |
| `student` | 3 | 7 |
| `teacher` | 10 | 15 |
| `staff` | 5 | 15 |
| `external` | 2 | 3 |
| `admin` | 20 | 30 |
| `librarian` | 20 | 30 |

## 7. ระบบอัตโนมัติ (Automation)
- **Daily Overdue Trigger**: ตั้งเวลาให้ระบบตรวจสอบสถานะ `borrowing` ที่เลยกำหนดทุกวันเวลา 01:00 น. และเปลี่ยนเป็น `overdue` อัตโนมัติ

## 8. ตัวอย่างการเขียนโค้ด (Technical Implementation Examples)

### 8.1 การจัดการ Config (Config.gs)
```javascript
const CONFIG = {
  LOAN_DAYS: {
    student: 7, teacher: 15, staff: 15, external: 3, admin: 30, librarian: 30,
  },
  QUOTA: {
    student: 3, teacher: 10, staff: 5, external: 2, admin: 20, librarian: 20,
  },
  SHEET: {
    LOANS: 'loans',
    USERS: 'users',
    BOOKS: 'book_items',
    CATALOG: 'books_catalog',
    LOCATIONS: 'settings_locations',
    POLICIES: 'settings_policies',
    FINES: 'fines',          // ✅ เพิ่ม
    SETTINGS: 'settings',    // ✅ เพิ่ม (สำหรับดึง fine_rate_overdue)
  },
  // ✅ เพิ่ม Default fallback ป้องกัน Settings sheet ว่าง
  FINE_RATE_DEFAULT: 5,
  FINE_BUFFER_DAYS_DEFAULT: 0,
};
```

### 8.2 การยืมหนังสือแบบ Batch Validation
```javascript
function loanBook_(barcode, uid, locationId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // ✅ อ่านเฉพาะ rangeที่มีข้อมูลจริง (ปลอดภัยกว่า getDataRange)
  const sheet = ss.getSheetByName(CONFIG.SHEET.LOANS);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: false, error: 'ไม่พบข้อมูล' };
  const loansData = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();

  // ✅ ใช้ .slice(1) เพื่อข้ามหัวตารางก่อน filter
  const activeLoans = loansData.slice(1).filter(r => r[2] === uid && r[6] === 'borrowing');
  // ... Logic ตรวจสอบอื่นๆ ...
}
```

### 8.3 การคืนหนังสือแบบ Atomic Update
```javascript
function returnBook_(loanId, notes, operatorRole) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const loansSheet = ss.getSheetByName(CONFIG.SHEET.LOANS);
  const booksSheet = ss.getSheetByName(CONFIG.SHEET.BOOKS);
  const finesSheet = ss.getSheetByName(CONFIG.SHEET.FINES);

  // ✅ ตรวจสอบค่าปรับค้างชำระก่อนคืน
  const unpaidFine = getUnpaidFine_(finesSheet, loanId);
  if (unpaidFine && operatorRole === 'member') {
    // Self-service: บล็อกไม่ให้คืนถ้ายังค้างค่าปรับ
    return { ok: false, error: `มีค่าปรับค้างชำระ ${unpaidFine.amount} บาท กรุณาชำระที่เคาน์เตอร์ก่อน` };
  }

  try {
    // อัปเดตสถานะในชีต Loans และ Book Items ให้ต่อเนื่องกันที่สุด
    loansSheet.getRange(rowIdx, colIdx).setValue('returned');
    booksSheet.getRange(bookRowIdx, statusColIdx).setValue('available');

    // ✅ ถ้าเป็น staff คืนได้แม้ค้างค่าปรับ แต่ต้องอัปเดตสถานะหนังสือให้พร้อมและบันทึกค่าปรับ
    if (unpaidFine && operatorRole !== 'member') {
      updateFineAmount_(finesSheet, loanId, unpaidFine.amount);
    }

    return { ok: true };
  } catch (e) {
    console.error('returnBook_ failed:', e.message);
    return { ok: false, error: e.message };
  }
}
```

### 8.4 ระบบตรวจสอบ Overdue อัตโนมัติ (Daily Trigger)
```javascript
function updateOverdueStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET.LOANS);
  const finesSheet = ss.getSheetByName(CONFIG.SHEET.FINES); // ✅ เพิ่ม
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const data = sheet.getRange(1, 1, lastRow, sheet.getLastColumn()).getValues();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const FINE_PER_DAY = getSettings_('fine_rate_overdue') || CONFIG.FINE_RATE_DEFAULT;

  const newFineRows = []; // ✅ เตรียม batch write ไป fines sheet
  let changed = false;

  const updated = data.map((row, index) => {
    if (index === 0) return row; // ข้ามหัวตาราง
    const status = row[6];
    const dueDate = new Date(row[4]);
    
    if (status === 'borrowing' && dueDate < today) {
      row[6] = 'overdue';
      changed = true;
    }
    
    // ✅ คำนวณค่าปรับสะสม (Column N) และสร้าง Fine Record
    if (row[6] === 'overdue') {
      const daysLate = Math.floor((today - dueDate) / 86400000);
      const fineAmount = daysLate * FINE_PER_DAY;
      row[13] = fineAmount;
      changed = true;

      // ✅ สร้าง fines record เฉพาะถ้ายังไม่มี (ตรวจสอบจาก finesSheet ก่อน)
      const loanId = row[0];
      const alreadyExists = checkFineExists_(finesSheet, loanId); 
      if (!alreadyExists) {
        newFineRows.push([
          generateFineId_(),   // A: fineId
          loanId,              // B: loanId
          row[2],              // C: uid
          fineAmount,          // D: amount
          'overdue',           // E: type
          'unpaid',            // F: status
          '',                  // G: paidAt
          'SYSTEM',            // H: receivedBy
          `เกินกำหนด ${daysLate} วัน`, // I: notes
          new Date().toISOString(),    // J: createdAt
          new Date().toISOString(),    // K: updatedAt
          row[1],              // L: barcode (Denormalized)
          row[14] || 'หนังสือ'  // M: bookTitle (ถ้ามีเก็บใน loans)
        ]);
      }
    }
    return row;
  });
  
  if (changed) {
    sheet.getRange(1, 1, updated.length, data[0].length).setValues(updated);
  }

  // ✅ Batch write ไป fines sheet ครั้งเดียว
  if (newFineRows.length > 0) {
    finesSheet.getRange(
      finesSheet.getLastRow() + 1, 1,
      newFineRows.length, newFineRows[0].length
    ).setValues(newFineRows);
  }
}
```

## 9. หน้าระบบและเส้นทาง (System Views & Routes)

### ฝั่งเจ้าหน้าที่ (Manage Side)
- **`/manage/loans`**: หน้าจอหลักสำหรับทำรายการยืมและคืน (Librarian Dashboard) มีช่องค้นหาผู้ยืมและสแกนหนังสือ
- **`/manage/loans/history`**: รายงานประวัติการยืม-คืนทั้งหมด พร้อมตัวกรองสถานะ (คืนแล้ว/ค้างส่ง/หาย)
- **`/manage/fines`**: หน้าจัดการค่าปรับและการรับชำระเงิน

### ฝั่งสมาชิก (Member Side)
- **`/app/loans`**: หน้าตรวจสอบรายการหนังสือที่กำลังยืมอยู่ วันกำหนดคืน และประวัติส่วนตัว
- **`/app/loan-self`**: หน้าจอสำหรับทำรายการยืม-คืนด้วยตนเอง (Self-service) มีระบบเปิดกล้องสแกนบาร์โค้ดและตรวจสอบพิกัด Geofencing

## 10. ขั้นตอนการดำเนินงาน
1. **Backend**: เตรียมชีตและ Action API พร้อมระบบ Soft Delete และ Auth
2. **Frontend API**: เพิ่มฟังก์ชันใน `api.js`
3. **Frontend UI**: สร้างหน้าจัดการและหน้าสมาชิกตาม Route ที่กำหนดข้างต้น
