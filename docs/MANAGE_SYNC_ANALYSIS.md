# รายงานการวิเคราะห์ระบบ Sync ข้อมูลและแผนการปรับปรุง (ฉบับอัปเดตจากโค้ดจริง)

รายงานฉบับนี้สรุปผลการตรวจสอบโครงสร้างโค้ดปัจจุบันเปรียบเทียบกับเป้าหมายระบบ **Global Background Sync** และ **Smart Layout Persistence** เพื่อลบ Latency และอาการกระพริบของหน้าจอ

---

## 1. ผลการตรวจสอบไฟล์จริง (Current Status Analysis)

จากการตรวจสอบไฟล์ในโปรเจกต์ พบประเด็นที่ต้องแก้ไขดังนี้:

*   **`public/app/state/store.js`**: ปัจจุบันเป็นเพียง `Map` เก็บค่าธรรมเนียม ยังไม่มีระบบ SWR (Stale-While-Revalidate) หรือการระบุเวลาหมดอายุ (TTL) ของข้อมูล
*   **`public/app/router.js` & `routes.js`**: พบว่ามีการสั่ง `renderManageShell()` หรือ `renderMemberShell()` ทุกครั้งที่เปลี่ยนหน้า ทำให้ DOM ของ Sidebar/Topbar ถูกทำลายและสร้างใหม่เสมอ (เกิดอาการกระพริบ)
*   **`public/app/data/sync_engine.js`**: **ยังไม่มีไฟล์นี้** (ต้องสร้างใหม่)
*   **Data Fetching**: แต่ละ View ยังใช้วิธีเรียก API ตรงๆ เมื่อ Mount (`apiProfileGet`, `apiAnnouncementList`) ทำให้ต้องรอ Network ทุกครั้ง

---

## 2. แผนการแก้ไขเชิงเทคนิค (Revised Technical Solutions)

### 🔴 โซลูชันที่ 1: Smart Layout Persistence (Router Refactoring)
ปรับปรุง `router.js` ให้ตรวจสอบว่า "Layout ปัจจุบัน" กับ "Layout ใหม่" เป็นกลุ่มเดียวกันหรือไม่:
- หากอยู่กลุ่มเดียวกัน (เช่น `/manage/dashboard` -> `/manage/books`) จะไม่ทำการล้างเนื้อหาทั้งหมด แต่จะเปลี่ยนเฉพาะเนื้อหาใน `#outlet`
- **ไฟล์ที่เกี่ยวข้อง**: `router.js`, `routes.js`, `layouts/manage_shell.js`

### 🔴 โซลูชันที่ 2: Global SWR Store (`store.js`)
อัปเกรด Store ให้รองรับสถานะ `stale` และ `revalidating`:
- เมื่อ View ขอข้อมูล Store จะคืนข้อมูลเก่าที่มีอยู่ให้ทันที (0ms)
- พร้อมกับส่งสัญญาณให้ Sync Engine ไปโหลดข้อมูลใหม่มาทับใน Background
- **ไฟล์ที่เกี่ยวข้อง**: `state/store.js`

### 🔴 โซลูชันที่ 3: Adaptive Global Sync Engine (`sync_engine.js`)
สร้าง Engine กลางเพื่อจัดการ Priority ของข้อมูล:
1. **Priority 1**: ข้อมูลสำหรับหน้าปัจจุบัน (โหลดทันที)
2. **Priority 2**: ข้อมูลพื้นฐานตามบทบาท (Pre-fetching) เช่น สถิติแดชบอร์ด, รายชื่อหนังสือ, ยอดค้างชำระ
3. **ไฟล์ที่เกี่ยวข้อง**: `data/sync_engine.js`, `app.js`

---

## 3. ลำดับการดำเนินการ (Detailed Action Plan)

| ลำดับ | การดำเนินการ | รายละเอียดเทคนิค |
| :--- | :--- | :--- |
| **1** | **Upgrade Store** | ปรับ `store.js` ให้เก็บ Cache พร้อม Timestamp และสถานะการซิงค์ |
| **2** | **Create Sync Engine** | สร้าง `sync_engine.js` เพื่อดึง Logic การเรียก API ออกจาก View มาไว้ที่กลาง |
| **3** | **Router Refactor** | ปรับ `router.js` ให้รองรับ `activeShell` เพื่อป้องกันการ Re-render Shell ซ้ำ |
| **4** | **View Adaptation** | ปรับ View สำคัญ (Dashboard, Books, Loans) ให้ดึงข้อมูลผ่าน Store แทน API ตรงๆ |
| **5** | **Debug Logs** | เพิ่มระบบ Console Log สีสันชัดเจนเพื่อตรวจสอบสถานะการ Sync ในเครื่อง Dev |

---

## 4. ตัวอย่างโครงสร้าง Sync Engine (Draft Logic)

```javascript
// public/app/data/sync_engine.js
export const SyncEngine = {
  async prioritySync(viewId) {
    console.log(`%c[Sync] Priority: ${viewId}`, "color: #0284c7; font-weight: bold");
    // โหลดข้อมูลเฉพาะหน้าที่ต้องใช้เดี๋ยวนี้
  },
  
  startBackgroundWarming(role) {
    // แอบโหลดข้อมูลอื่นๆ ตาม Role ในเบื้องหลัง
  }
};
```

---
*อัปเดตผลการวิเคราะห์และแผนงานโดย Gemini CLI - 2026-04-27*
