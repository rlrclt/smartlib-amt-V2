# แผนการออกแบบ: ระบบตั้งค่าพิกัดและนโยบายห้องสมุด (Library Settings & Geofencing)

เอกสารนี้ระบุรายละเอียดการพัฒนาส่วนการจัดการการตั้งค่าระบบ โดยเน้นความสัมพันธ์ระหว่างพิกัด (Geofencing), นโยบายการยืม, และเวลาทำการของห้องสมุด

## 1. การจัดการพิกัดและพื้นที่อนุญาต (Geofencing Settings)
ใช้สำหรับกำหนดจุดที่สมาชิกสามารถทำรายการ ยืม, คืน หรือ เช็คอิน ได้

- **ตารางข้อมูล**: `settings_locations`
- **ฟิลด์สำคัญ**: `latitude`, `longitude`, `range_borrow`, `range_return`, `range_checkin`
- **Logic**: ระบบจะตรวจสอบพิกัดจริงของสมาชิกเทียบกับรัศมี (Range) ที่ตั้งไว้ในแต่ละจุดบริการ

## 2. การจัดการเวลาทำการและระบบ Visit (Library Hours & Visits) **[NEW]**
เชื่อมโยงกับหน้าจอ `CANVAS_LIBRARY_SETTINGS_SPEC.md` เพื่อควบคุมการเปิด-ปิดระบบเช็คอินอัตโนมัติ

- **ตารางข้อมูล**: `settings_library_hours` และ `settings_library_exceptions`
- **ฟีเจอร์การตั้งค่า**:
    - กำหนดเวลาเปิด-ปิดรายวัน (จันทร์-อาทิตย์)
    - กำหนดวันหยุดหรือวันขยายเวลาพิเศษ (Exceptions)
    - ตั้งค่า **Janitor Buffer**: ระยะเวลาหลังห้องสมุดปิดที่จะเริ่มทำการ Auto-close Session (เช่น 30 นาที)

## 3. นโยบายการยืมและการจอง (Loan & Reservation Policies)
- **ตารางข้อมูล**: `settings_policies`
- **ฟิลด์สำคัญ**: `loanDays`, `loanQuota`, `resQuota`, `holdDays` (จำนวนวันที่เก็บหนังสือจองไว้ให้)

---

## 5. ความสัมพันธ์กับเอกสารอื่น
- **LIBRARY_VISIT_SYSTEM_DESIGN.md**: สำหรับการนำเวลาทำการไปใช้ในระบบ Auto-close
- **LOAN_SELF_SERVICE_DESIGN.md**: สำหรับการนำพิกัดและรัศมีไปตรวจสอบการยืม-คืน
- **CANVAS_LIBRARY_SETTINGS_SPEC.md**: รายละเอียดหน้าจอ UI สำหรับแอดมินในการจัดการค่าเหล่านี้
