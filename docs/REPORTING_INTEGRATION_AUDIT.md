# 🔎 รายงานการตรวจสอบสถานะระบบและแผนการบูรณาการ (Fact-Finding Report)

วันที่ตรวจสอบ: 2026-04-30
สถานะ: ตรวจสอบสถานะการเชื่อมโยงระบบเดิม (GAS) และแผน MVP Spec

## 1. ผลการตรวจสอบระบบ (Fact-Finding)
- **Module_ManageDashboard.gs**: มีโครงสร้าง `manageDashboardStats_()` ที่ดึงข้อมูลจาก `readDashboardRows_()` อยู่แล้ว ซึ่งดึงข้อมูลจาก `loans`, `fines`, `users`, `reservations`, `bookItems`, `catalogs`, `visits`
- **ข้อสรุป**: โครงสร้างข้อมูลพื้นฐานสำหรับรายงาน R1-R8 มีอยู่แล้วเกือบทั้งหมดใน `readDashboardRows_()` เพียงแต่ต้องเพิ่ม logic การทำ Aggregate (Filter/Count) ตามช่วงเวลาและประเภทบริการที่ต้องการ

## 2. ช่องว่างระบบ (Gap Analysis)
- **Field E-book**: ยังไม่พบการประกาศ field ใน `SCHEMA_BOOKS.md` หรือการรองรับในโมดูลจัดการหนังสือ
- **Service Selection Interceptor**: ปัจจุบันหน้า Login วิ่งตรงเข้าสู่ Dashboard/Member home โดยไม่มี Popup คัดกรองบริการ (Service Selection)
- **Reporting Interface**: ปัจจุบัน Dashboard เน้นสรุปสถิติ (Summary) ยังขาดฟังก์ชันการดึงรายงานแบบระบุช่วงเวลา (Custom Date Range) สำหรับการพิมพ์หรือวิเคราะห์เชิงลึก (ตาม R1-R8)

## 3. แผนการแก้ไขและดำเนินการ (Action Plan)

| เป้าหมาย (Goal) | หน้าที่ต้องปรับปรุง (Target) | สิ่งที่ต้องทำ |
| :--- | :--- | :--- |
| **เพิ่มรองรับ E-book** | `SCHEMA_BOOKS.md` | เพิ่ม field `ebook_url` ในสคีมาข้อมูลหนังสือ |
| **เพิ่มหน้าคั่นเลือกบริการ** | `router.js` / `member_shell.js` | เพิ่ม Route ใหม่สำหรับเลือกบริการหลัง Login และควบคุมสถานะด้วย `sessionStorage` |
| **พัฒนาระบบรายงาน** | `Module_ManageDashboard.gs` | เพิ่มฟังก์ชัน `getReports(reportId, params)` เพื่อรับ Parameter `period`, `from`, `to` |
| **Dashboard UI** | `manage/dashboard.view.js` | เพิ่มเมนู "รายงานห้องสมุด" และหน้าแสดงผลตารางรายงาน R1-R8 |

## 4. รายละเอียดที่ต้องตัดสินใจ (Decision Point)
1. **การคัดกรองบริการ**: จะใช้ `sessionStorage` ในการเก็บสถานะที่เลือกไว้ชั่วคราว เพื่อไม่ให้ Popup ขึ้นมาซ้ำทุกครั้งที่กด Refresh แต่จะขึ้นอีกครั้งเมื่อ Session หมดอายุ
2. **ระบบรายงาน**: จะพัฒนาเป็นหน้าจอแยกสำหรับ "Reporting Hub" โดยมี Tabs รายงาน R1-R8 เพื่อให้หน้า Dashboard หลักไม่รกเกินไป

## 5. สรุปจำนวนหน้าและงานที่ต้องดำเนินการ

จากการวิเคราะห์แผนงาน มีหน้าที่ต้องจัดการดังนี้:

### 5.1 หน้าที่ต้องสร้างใหม่ (Total: 4 หน้า)
1. **หน้าเลือกบริการ (Service Selection)**: Route `/app/service-select` (หน้าคั่นหลัง Login)
2. **Reporting Hub (Main)**: Route `/manage/reports` (หน้าหลักรวมรายงาน)
3. **หน้า Report Details**: Route `/manage/reports/:id` (หน้าแสดงตารางรายงานแบบเจาะจง)
4. **ฟอร์มจัดการ E-book (Admin)**: เพิ่มส่วนแสดงผลในหน้า Admin Books Management


## 6. ตัวอย่างโค้ดและแนวทางการพัฒนารายส่วน

### 6.1 ตัวอย่างการสร้างหน้า View ใหม่ (หน้า Reporting Hub)
ใช้แพทเทิร์น `render` มาตรฐานของโปรเจกต์:
```javascript
export function renderReportingHubView() {
  const container = document.getElementById('manage-content');
  container.innerHTML = `
    <div class="p-6">
      <h1 class="text-2xl font-bold mb-4">รายงานห้องสมุด</h1>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onclick="router.navigate('/manage/reports/R1')" class="p-4 bg-white shadow rounded-lg">รายงานสมาชิกเข้าใช้</button>
        <!-- เพิ่มปุ่มรายงานอื่นๆ ตาม R1-R8 -->
      </div>
    </div>
  `;
}
```

### 6.2 ตัวอย่างฟังก์ชัน Backend (GAS) สำหรับดึงข้อมูลรายงาน
เพิ่มใน `Module_ManageDashboard.gs` เพื่อรองรับรายงานแบบ Dynamic:
```javascript
function getReports(reportId, params) {
  const rows = readDashboardRows_(); // ฟังก์ชันมาตรฐานเดิม
  // Logic กรองข้อมูลตาม reportId และ params (period, from, to)
  const data = filterDataByReport(rows, reportId, params);
  return { ok: true, data: data };
}
```
