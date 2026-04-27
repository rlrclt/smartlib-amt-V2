# Integration Status: Library Visit System

เอกสารนี้ใช้ติดตามสถานะการอัปเดตระบบต่างๆ เพื่อให้รองรับ **ระบบบันทึกการเข้าใช้ห้องสมุด (Library Visit)** และเพื่อให้ทุกระบบทำงานสัมพันธ์กัน

## 📋 รายการที่ต้องดำเนินการ (Task List)

- [x] **1. Dashboard Integration** (`docs/MANAGE_DASHBOARD_DESIGN.md`)
    - เพิ่ม Widget แสดงจำนวนผู้ใช้ในห้องสมุดปัจจุบัน (Active Visitors)
    - เพิ่มความเชื่อมโยงกับตาราง `library_visits`

- [x] **2. Loan System Constraint** (`docs/member/LOAN_SELF_SERVICE_DESIGN.md`)
    - เพิ่มเงื่อนไขการตรวจสอบ Check-in Session ก่อนอนุญาตให้เข้าหน้าจอยืมหนังสือ
    - เพิ่ม Flow การ Redirect ไปยังหน้า `/app/checkin`

- [x] **3. Notification Update** (`docs/PROFILE_NOTIFICATION_PLAN.md`)
    - เพิ่ม Notification สำหรับกรณีระบบปิด Session อัตโนมัติ (Auto-close)
    - เพิ่มการแจ้งเตือนเมื่อลืม Check-out

- [x] **4. Settings & Geofencing** (`docs/MANAGE_SETTINGS_DESIGN.md`)
    - เพิ่มการตั้งค่า Location (Lat/Long) และ Radius สำหรับการตรวจสอบพิกัดตอนเช็คอิน
    - เชื่อมโยงกับหน้าจอ `CANVAS_LIBRARY_SETTINGS_SPEC.md`

- [x] **5. Documentation Index Update** (`docs/README.md`)
    - ตรวจสอบความถูกต้องของลิงก์และหมวดหมู่หลังการอัปเดต (อัปเดตดัชนีภาพรวมแล้ว)

## 🔄 สถานะปัจจุบัน
- **สถานะภาพรวม**: ✅ เสร็จสิ้น (Completed)
- **อัปเดตล่าสุด**: 2026-04-27
- **ผู้รับผิดชอบ**: Gemini CLI Agent

---
*หมายเหตุ: งานเอกสารในส่วนการเชื่อมโยงระบบ (Design Phase) เสร็จสมบูรณ์ พร้อมสำหรับการเริ่มพัฒนาโค้ดในลำดับถัดไป*
