# Documentation Index (smartlib-amt)

อัปเดตล่าสุด: 2026-04-27 (โดย AI Agent)

ดัชนีเอกสารสำหรับทีมพัฒนา รวบรวมข้อมูลการออกแบบ โครงสร้างข้อมูล และแนวทางการพัฒนาทั้งหมดของโปรเจกต์ SmartLib-AMT V2

## 🏗️ โครงสร้างและแนวทางภาพรวม (Core & Architecture)
- [SPA Structure (TH)](../SPA_STRUCTURE_TH.md): โครงสร้าง SPA ฝั่ง `public/` และแนวทางการแบ่งส่วนหน้าเว็บ
- [Developer Guidelines](DEVELOPER_GUIDELINES.md): ข้อตกลงการพัฒนา มาตรฐานโค้ด และ workflow ของทีม
- [Performance Guide](PERFORMANCE_GUIDE.md): แนวทาง caching และการปรับแต่งประสิทธิภาพ (Optimization)
- [Responsive 2026](RESPONSIVE_2026.md): มาตรฐานการรองรับหน้าจออุปกรณ์ต่างๆ ในปี 2026
- [Theme Analysis](THEME_ANALYSIS.md): บทวิเคราะห์และแนวทางธีม UI/UX ภาพรวม

## 📊 สคีมาข้อมูล (Data Schemas)
- [Users Schema](SCHEMA_USERS.md): โครงสร้างข้อมูลผู้ใช้, บทบาท (Role), และ Group Type
- [Books Schema](SCHEMA_BOOKS.md): โครงสร้างข้อมูลหนังสือ (Catalog & Items) และสถานะต่างๆ
- [Announcements Schema](SCHEMA_ANNOUNCEMENTS.md): โครงสร้างข้อมูลประกาศข่าวสาร

## ⚙️ การออกแบบระบบงานหลัก (System Design & Features)
- [Security System Design](SECURITY_SYSTEM_DESIGN.md): แผนความปลอดภัยและการจัดการสิทธิ์เข้าถึง (RBAC)
- [Auth GAS Standards](AUTH_GAS.md): มาตรฐานการเชื่อมต่อ Frontend ↔ Google Apps Script
- [Session Management](SESSION_MANAGEMENT.md): การจัดการสถานะการเข้าสู่ระบบ (1 Account = 1 Device)
- [Loan System Design](LOAN_SYSTEM_DESIGN.md): ระบบยืม-คืนหนังสือแบบครบวงจร (v2.2)
- [Fines System Design](FINES_SYSTEM_DESIGN.md): ระบบจัดการค่าปรับและการชำระเงิน
- [Reservation System Design](member/RESERVATION_SYSTEM_DESIGN.md): ระบบการจองและนัดหมายยืมหนังสือล่วงหน้า
- [Library Visit System](LIBRARY_VISIT_SYSTEM_DESIGN.md): ระบบบันทึกประวัติการเข้าใช้ห้องสมุด (Check-in/Out)
- [Signup Flow Design](SIGNUP_DESIGN.md): ขั้นตอนการสมัครสมาชิกและการยืนยันตัวตน
- [Profile & Notification Plan](PROFILE_NOTIFICATION_PLAN.md): ระบบโปรไฟล์และการแจ้งเตือน (Near Real-time)

## 🛠️ การจัดการข้อมูลและห้องสมุด (Inventory & Management)
- [Admin Dashboard Design](MANAGE_DASHBOARD_DESIGN.md): ศูนย์ควบคุมและสรุปสถิติสำหรับบรรณารักษ์
- [Users Management Design](USERS_MANAGEMENT_DESIGN.md): แนวทางการจัดการรายชื่อและสิทธิ์ผู้ใช้งาน
- [Books Management Design](BOOKS_MANAGEMENT_DESIGN.md): ขั้นตอนงานจัดการรายการหนังสือและ Catalog
- [Manage Settings Design](MANAGE_SETTINGS_DESIGN.md): การตั้งค่าพิกัด Geofencing และนโยบายห้องสมุด
- [Print Barcode Design](PRINT_BARCODE_DESIGN.md): ระบบเลือกและพิมพ์บาร์โค้ดสำหรับเล่มหนังสือ

## 🎨 รายละเอียดหน้าจอและ UI Spec (Canvas Specs)
เอกสารรายละเอียด UI/UX เจาะลึกรายหน้าจอ (Specifications):

### ฝั่งสมาชิก (Member Side)
- [Member Views Plan](member/MEMBER_VIEWS_PLAN.md): แผนผังหน้าจอทั้งหมดของฝั่งสมาชิก
- [Member Books View](member/MEMBER_BOOKS_VIEW_DESIGN.md): รายละเอียดหน้าค้นหาและดูข้อมูลหนังสือ
- [Loan Self-Service Spec](member/CANVAS_LOAN_SELF_SPEC.md): รายละเอียดหน้าจอยืมหนังสือด้วยตนเอง
- [Reservation Spec](member/CANVAS_RESERVATIONS_SPEC.md): รายละเอียดหน้าจอจัดการรายการจอง
- [Check-in Spec](member/CANVAS_CHECKIN_SPEC.md): รายละเอียดหน้าจอบันทึกการเข้าใช้งาน

### ฝั่งผู้ดูแล (Admin Side)
- [Manage Dashboard Spec](manage/CANVAS_MANAGE_DASHBOARD_SPEC.md): รายละเอียดหน้าจอ Dashboard หลัก
- [Library Settings Spec](manage/CANVAS_LIBRARY_SETTINGS_SPEC.md): รายละเอียดหน้าจอตั้งค่าระบบและนโยบาย
- [Fines Management Spec](manage/CANVAS_MANAGE_FINES_SPEC.md): รายละเอียดหน้าจอจัดการค่าปรับ

## 📝 รายงานและข้อมูลอื่นๆ (Reports & Others)
- [Bug Report: Reservation Status](BUG_REPORT_RESERVATION_STATUS.md): รายงานและวิธีแก้ไขปัญหาการแสดงผลสถานะจอง
- [Native Web App Design](theme-Design/%20Native%20Web%20Application.md): แนวทางการออกแบบให้เว็บรู้สึกเหมือน Native App

## 🏁 เอกสารเริ่มต้นสำหรับทีม
- [AI_INDEX.md](../AI_INDEX.md): สรุปสถานะล่าสุดของโปรเจกต์ (Routes, Endpoints, TODO)
- [Project Init Summary](PROJECT_INIT_SUMMARY.md): ภาพรวมโปรเจกต์สำหรับเริ่มงาน (Onboarding)
