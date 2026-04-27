# แผนการออกแบบ: ระบบบริหารจัดการการเข้าใช้ห้องสมุด (Library Visit Session Management)

เอกสารนี้ระบุรายละเอียดการพัฒนาฟีเจอร์บันทึกประวัติการเข้าใช้งานห้องสมุด โดยใช้ระบบ QR Code เพื่อเปิด-ปิด Session การใช้งาน และระบบจัดการเวลาเปิด-ปิดอัตโนมัติ

## 1. วัตถุประสงค์
- เพื่อเก็บสถิติจำนวนผู้เข้าใช้ห้องสมุดในช่วงเวลาต่างๆ
- เพื่อวิเคราะห์พฤติกรรมการใช้งาน (ทำกิจกรรมอะไรบ้าง)
- เพื่อความปลอดภัยและตรวจสอบความหนาแน่นของผู้ใช้ในห้องสมุด

---

## 2. โครงสร้างข้อมูล (Database Schema)

### 2.1 ตาราง `library_visits` (บันทึกการเข้าใช้)
| Column | Field Name | Type | Description |
| :--- | :--- | :--- | :--- |
| **A** | `visitId` | String | PK: รหัสการเข้าใช้ (เช่น `VS-20260525-0001`) |
| **B** | `uid` | String | FK: รหัสสมาชิก (จาก `users`) |
| **C** | `checkInAt` | ISO8601 | วันที่และเวลาที่สแกนเข้า |
| **D** | `checkOutAt`| ISO8601 | วันที่และเวลาที่สแกนออก (หรือระบบปิดให้) |
| **E** | `activities`| String | กิจกรรมที่ทำ (เก็บเป็น JSON Array เช่น `["borrow","study"]`) |
| **F** | `status` | Enum | `active` (กำลังใช้งาน), `closed` (ออกแล้ว), `auto_closed` (ระบบปิดให้) |
| **G** | `notes` | String | หมายเหตุเพิ่มเติม |
| **H** | `locationId`| String | FK: รหัสจุดบริการ (จาก `settings_locations`) |

### 2.2 ตาราง `settings_library_hours` (เวลาทำการปกติ)
| Column | Field Name | Type | Description |
| :--- | :--- | :--- | :--- |
| **A** | `dayOfWeek` | Number | 0 (อาทิตย์) - 6 (เสาร์) |
| **B** | `openTime` | String | เวลาเปิด (เช่น `08:30`) |
| **C** | `closeTime` | String | เวลาปิด (เช่น `16:30`) |
| **D** | `isOpen` | Boolean | วันนี้เปิดทำการหรือไม่ |

### 2.3 ตาราง `settings_library_exceptions` (กรณีพิเศษ/ขยายเวลา)
| Column | Field Name | Type | Description |
| :--- | :--- | :--- | :--- |
| **A** | `date` | Date | วันที่เกิดกรณีพิเศษ |
| **B** | `newOpenTime`| String | เวลาเปิดใหม่ (ถ้ามี) |
| **C** | `newCloseTime`| String | เวลาปิดใหม่ (กรณีขยายเวลา) |
| **D** | `reason` | String | สาเหตุ (เช่น "วันจัดกิจกรรมสัปดาห์ห้องสมุด") |

---

## 3. ลำดับขั้นตอนการทำงาน (User Journey)

### 3.1 การเข้าใช้งาน (Check-in Flow)
1. **Scan QR**: สมาชิกสแกน QR Code หน้าห้องสมุด (URL: `/app/checkin`)
2. **Auth Check**: หากยังไม่ Login ให้ไปหน้า Sign-in ก่อน
3. **Session Check**:
    - หากมี Session `active` อยู่แล้ว -> พาไปหน้า **"การใช้งานปัจจุบัน"**
    - หากยังไม่มี -> แสดงหน้า **"คุณมาทำอะไรวันนี้?"**
4. **Activity Selection**: สมาชิกเลือกกิจกรรม (เช่น ยืมหนังสือ, ศึกษาค้นคว้า, ใช้คอมพิวเตอร์, นั่งพักผ่อน)
5. **Start Session**: ระบบบันทึก `checkInAt` และสถานะ `active`

### 3.2 ระหว่างการใช้งาน (Ongoing Session)
- สมาชิกสามารถกลับมาที่หน้า `/app/checkin` เพื่อเพิ่มหรือลบกิจกรรมที่ทำได้ตลอดเวลา
- ข้อมูลจะถูก Update ลงในฟิลด์ `activities` เดิม

### 3.3 การออกจากห้องสมุด (Check-out Flow)
1. **Manual Check-out**: สมาชิกกดปุ่ม **"ออกจากห้องสมุด"**
2. **Final Update**: ระบบบันทึก `checkOutAt` และเปลี่ยนสถานะเป็น `closed`

---

## 4. ระบบอัตโนมัติ (Automation - The Janitor System)

### 4.1 ระบบปิด Session อัตโนมัติ (Auto-Close System)
```javascript
/**
 * ดึงเวลาปิดของวันนี้ โดยให้ความสำคัญกับ Exception ก่อน Regular Hours
 */
function getCloseTimeToday_() {
  const today = new Date();
  const dateStr = Utilities.formatDate(today, 'Asia/Bangkok', 'yyyy-MM-dd');
  
  // 1. เช็ค exception ก่อนเสมอ
  const exceptions = getSheetData_('settings_library_exceptions');
  const exc = exceptions.find(r => r[0] === dateStr);
  if (exc) return exc[2]; // ใช้ newCloseTime จากข้อยกเว้น
  
  // 2. ถ้าไม่มี exception ค่อยใช้ regular hours
  const dow = today.getDay();
  const regular = getSheetData_('settings_library_hours');
  return regular.find(r => r[0] === dow)?.[2];
}
```

---

## 5. การตั้งค่าและการเชื่อมโยง (Admin & Integration)

(เนื้อหาเดิม...)

---

## 6. รายละเอียดการเชื่อมโยงทางเทคนิค (Technical Integration & Code)

### 6.1 การดึงสถิติเข้า Dashboard (GAS)
```javascript
/**
 * ✅ แก้ไขแล้ว: ข้าม Header และรองรับกรณีไม่มีข้อมูล
 */
function getActiveVisitorCount_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('library_visits');
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  
  const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
  // คอลัมน์ F (Index 5) คือ status
  return data.filter(row => row[5] === 'active').length;
}
```

### 6.2 ความปลอดภัยและการตรวจสอบ (Server-side Validation)
- **Loan Integration**: ฟังก์ชัน `loanBook_()` ใน `Module_Loans.gs` **ต้องตรวจสอบ active visit ทุกครั้ง** ก่อนบันทึกรายการ (เพื่อป้องกันการ bypass frontend)
- **Dependency**: ฟังก์ชัน `notifyAutoClose_` เรียกใช้ `createNotification_` ซึ่งนิยามไว้ใน `Module_ProfileNotifications.gs`
