# แผนการออกแบบ: หน้าจอสำหรับสมาชิก (Member Views Plan)

เอกสารนี้ระบุรายละเอียดโครงสร้างหน้าจอและฟีเจอร์ต่างๆ สำหรับกลุ่มผู้ใช้งานทั่วไป (Member) ในระบบ SmartLib-AMT

## 1. วัตถุประสงค์
เพื่อให้สมาชิกสามารถเข้าถึงบริการห้องสมุดได้ด้วยตนเองผ่านมือถือ (Self-service) ตรวจสอบสถานะการยืม-คืน และรับข่าวสารประชาสัมพันธ์ได้อย่างสะดวกรวดเร็ว

## 2. โครงสร้างเส้นทางและหน้าจอ (Routes & Views)

| เส้นทาง (Route) | ชื่อหน้าจอ | ฟีเจอร์หลัก (Key Features) |
| :--- | :--- | :--- |
| **`/app`** | **หน้าหลัก (Dashboard)** | - สรุปรายการหนังสือที่ยืมค้างอยู่<br>- ประกาศล่าสุด (Latest Announcements)<br>- ทางลัดไปยังหน้ายืม-คืนและบัตรสมาชิก |
| **`/app/books`** | **ค้นหาหนังสือ (Catalog)** | - ค้นหาหนังสือจากชื่อ, ผู้แต่ง, หมวดหมู่<br>- ดูรายละเอียดหนังสือ (ปก, เรื่องย่อ)<br>- ตรวจสอบสถานะว่ามีเล่มว่างหรือไม่ |
| **`/app/loans`** | **การยืมของฉัน (My Loans)** | - รายชื่อหนังสือที่กำลังยืมอยู่ พร้อมเลขนับถอยหลังสู่วันกำหนดคืน<br>- ประวัติการยืม-คืนย้อนหลัง<br>- แสดงยอดค่าปรับค้างชำระ (ถ้ามี) |
| **`/app/loan-self`** | **ยืม-คืนด้วยตนเอง** | - **Geofencing Check**: ตรวจสอบว่าอยู่ในพื้นที่ที่อนุญาตหรือไม่<br>- **Barcode Scanner**: สแกนบาร์โค้ดเล่มหนังสือด้วยกล้องมือถือ<br>- ทำรายการยืมหรือคืนได้ทันที (Self-service) |
| **`/app/reservations`**| **การจองของฉัน** | - รายการหนังสือที่จองไว้และลำดับคิว<br>- แจ้งเตือนเมื่อหนังสือที่จองไว้พร้อมให้มารับ |
| **`/app/profile`** | **โปรไฟล์และบัตรสมาชิก** | - **Digital Library Card**: แสดง QR/Barcode สำหรับให้เจ้าหน้าที่สแกน<br>- แก้ไขข้อมูลส่วนตัวเบื้องต้น (เช่น เบอร์โทร, รูปโปรไฟล์) |

## 3. ฟีเจอร์พิเศษและ Logic ฝั่งสมาชิก

### 3.1 ระบบตรวจสอบพิกัด (Geofencing Integration)
ในหน้า `/app/loan-self` ระบบจะทำการร้องขอพิกัด GPS เพื่อตรวจสอบระยะห่างจากพิกัดที่ตั้งไว้ใน `settings_locations`:
- หากอยู่ในรัศมี: แสดงปุ่มสแกนและอนุญาตให้ทำรายการ
- หากนอกรัศมี: แสดงข้อความแจ้งเตือนและแผนที่นำทางไปยังจุดที่ทำรายการได้

### 3.2 บัตรสมาชิกดิจิทัล (Digital Card)
- ใช้ `uid` ของผู้ใช้ในการสร้าง Barcode (CODE128) หรือ QR Code ในหน้าโปรไฟล์
- ช่วยให้สมาชิกไม่ต้องพกบัตรแข็ง และเจ้าหน้าที่สามารถสแกนจากหน้าจอมือถือได้ทันที

### 3.3 ระบบแจ้งเตือน (In-app Notifications)
- แสดงจุดแจ้งเตือน (Red Dot) บนเมนูเมื่อ:
    - มีหนังสือเกินกำหนดส่ง (Overdue)
    - มีค่าปรับใหม่เกิดขึ้น
    - หนังสือที่จองไว้พร้อมรับแล้ว

## 4. รูปแบบ UI/UX (Design Principles)
อ้างอิงตามมาตรฐาน **RESPONSIVE_2026.md** และ **THEME_ANALYSIS.md**:

### 4.1 แนวคิดการออกแบบ (Visual Concept)
- **Modern Academic Theme**: เน้นความสะอาด น่าเชื่อถือ และใช้งานง่าย (Calm, Trustworthy, Airy)
- **Visual Style**: ใช้ไล่เฉดสีฟ้าอ่อน (Soft Blue Gradients), พื้นผิวแบบโปร่งแสง (Glassy highlights) และรูปทรงโค้งมน (Rounded geometry)
- **Typography**: ใช้ฟอนต์ `Bai Jamjuree` เป็นหลัก โดยเน้น Hierarchy ที่ชัดเจน

### 4.2 การตอบสนองตามหน้าจอ (Responsive Strategy)
- **Mobile-first Baseline**: พัฒนาโดยเน้นการใช้งานบนมือถือเป็นอันดับแรก (XS Phone - Large Phone)
- **Fluid Layout**: ใช้ CSS Grid และ Flexbox แทนการกำหนดความกว้างตายตัว
- **Modern Units**: ใช้ Viewport units ใหม่ เช่น `100dvh` สำหรับส่วนที่ต้องการให้สูงเต็มหน้าจอมือถือ
- **Dense Content**: ในหน้าจอเล็กจะแสดงผลแบบ Card List หรือ Stack View แทนตาราง (Table) เพื่อให้อ่านง่าย

### 4.3 ประสบการณ์การใช้งาน (Interaction & Motion)
- **Feedback**: แสดงสถานะการทำงานที่ชัดเจน (เช่น Skeleton screens ขณะโหลดข้อมูล)
- **Subtle Motion**: ใช้การเคลื่อนไหวเบาๆ (ease-in-out) เพื่อบอกสถานะ ไม่รบกวนการอ่าน
- **Fast Access**: ปุ่ม Action หลัก (ยืม/คืน) ต้องเข้าถึงได้ง่ายและมีขนาดใหญ่พอสำหรับการสัมผัส

## 6. โครงสร้าง Layout และ Components (Layout & Components)
ออกแบบโดยอิงสถาปัตยกรรมแบบ Shell ที่ช่วยให้การเปลี่ยนหน้าเป็นไปอย่างราบรื่น (SPA) และคงเอกลักษณ์ของแบรนด์

### 6.1 Member Shell (`member_shell.js`)
ทำหน้าที่เป็นโครงสร้างหลักของหน้าจอฝั่งสมาชิก:
- **Header**: แสดงชื่อหน้าปัจจุบัน, ระบบแจ้งเตือน (Bell), และข้อมูลผู้ใช้ย่อ
- **Main Content**: พื้นที่ส่วน `#outlet` สำหรับ Render แต่ละหน้าจอ
- **Navigation Integration**: เชื่อมต่อกับระบบนำทางทั้งแบบ Desktop และ Mobile
- **Theme Support**: บังคับใช้ CSS Variables สำหรับธีมกลุ่ม Member (Airy & Friendly)

### 6.2 ระบบนำทาง (Navigation)
- **Desktop Sidebar**: แถบเมนูด้านซ้าย (คล้ายฝั่ง Manage แต่ใช้โทนสีสว่างและนุ่มนวลกว่า)
    - แสดงโลโก้ห้องสมุด
    - รายการเมนูหลัก (Dashboard, Books, Loans, Reservations)
    - ปุ่มสลับไปหน้า Manage (เฉพาะ Admin/Librarian)
- **Mobile Bottom Nav**: แถบเมนูด้านล่างสำหรับมือถือ (Sticky Bottom)
    - เน้น Icon ที่สื่อความหมายชัดเจนและปุ่มมีขนาดใหญ่ (Large Touch Target)
    - เรียงลำดับเมนูตามความถี่การใช้งาน: หน้าหลัก > ค้นหา > ยืม-คืน > โปรไฟล์

### 6.3 คอมโพเนนต์ส่วนกลาง (Common Components)
- **Member Header**: 
    - Breadcrumbs ขนาดกะทัดรัด
    - ปุ่มแสดง QR บัตรสมาชิกแบบด่วน (Quick Access Card)
- **Status Cards**: การ์ดสรุปผลที่หน้า Dashboard (จำนวนเล่มที่ยืม, ยอดค่าปรับ, วันคืนถัดไป)
- **Skeleton Screens**: ตัวช่วยแสดงผลระหว่างรอโหลดข้อมูล API เพื่อลดความรู้สึกว่าระบบช้า
- **Notification Toast**: ระบบแจ้งเตือนแบบ Pop-up มุมจอ สำหรับยืนยันการทำรายการสำเร็จหรือแจ้ง Error

### 6.4 การเชื่อมโยงสไตล์ (Styling)
- ใช้ไฟล์ `public/app/styles/member.css` แยกจากฝั่ง Manage เพื่อความคล่องตัวในการปรับแต่ง
- อ้างอิง Design Tokens จาก `THEME_ANALYSIS.md` (Blue System, Rounded geometry)

## 7. ความเชื่อมโยงและการใช้โค้ดร่วมกัน (Code Relationships & Reuse)
เพื่อให้ระบบบำรุงรักษาง่ายและมีประสิทธิภาพ เราจะแบ่งสัดส่วนการใช้โค้ดร่วมกันดังนี้:

### 7.1 ส่วนที่ใช้ร่วมกัน (Shared Components)
- **`data/api.js`**: ฟังก์ชันดึงข้อมูลพื้นฐาน (เช่น `listAnnouncements`, `searchBooks`) จะใช้ร่วมกัน แต่จะมีการกรองข้อมูลตามบทบาทที่ฝั่ง Backend
- **`utils/`**: ฟังก์ชันตัวช่วยทั้งหมด เช่น `html.js` (สำหรับ Escape HTML) และฟังก์ชันจัดการวันที่/ตัวเลข
- **`components/toast.js`**: ระบบแจ้งเตือน Pop-up ที่หน้าจอจะใช้ตัวเดียวกันเพื่อความเป็นเอกภาพ
- **`icons.js`**: การเรียกใช้ Lucide Icons จะแชร์ Library เดียวกันทั้งระบบ

### 7.2 ส่วนที่แยกจากกัน (Separate Logic)
- **Shells & Sidebars**: แยก `member_shell.js` ออกจาก `manage_shell.js` เพื่อแยก Theme (Light vs Dark) และป้องกันการ "รั่วไหล" ของเมนูควบคุมระดับสูง
- **Geofencing Logic**: ฝั่งสมาชิกจะมีการบังคับใช้ฟังก์ชันตรวจสอบพิกัด (GPS) ในหน้ายืม-คืนอย่างเข้มงวด ในขณะที่ฝั่งเจ้าหน้าที่ (Manage) จะข้ามขั้นตอนนี้
- **Views**: แยกไฟล์ `.view.js` ชัดเจน แม้จะเป็นเรื่องเดียวกัน (เช่น ประวัติการยืม) เพราะสมาชิกจะเห็นเฉพาะข้อมูลตนเอง แต่เจ้าหน้าที่จะเห็นข้อมูลของทุกคน

### 7.3 ข้อควรระวัง (Security Guardrails)
- **ห้าม** ดึงคอมโพเนนต์ที่มีความสามารถในการ "แก้ไข/ลบ" (Admin Action) ไปแสดงผลในฝั่งสมาชิกโดยตรง
- **API Reuse**: เมื่อใช้ฟังก์ชัน API ร่วมกัน ต้องมั่นใจว่า Backend (GAS) มีการเช็ค Session ทุกครั้งว่า `uid` ที่ส่งไป มีสิทธิ์เข้าถึงข้อมูลชุดนั้นจริงหรือไม่

## 8. การเชื่อมต่อข้อมูลและการเข้าถึง (Data API & Access Control)
- **ระบบตรวจสอบสิทธิ์**: อนุญาตให้กลุ่มผู้ใช้งานดังต่อไปนี้เข้าถึงหน้าจอฝั่งสมาชิกได้:
    - กลุ่ม **`member`**: ทุกบทบาท (`student`, `teacher`, `staff`, `external`)
    - กลุ่ม **`manage`**: เฉพาะบทบาท `admin` และ `librarian` (เพื่อให้เจ้าหน้าที่สามารถใช้งานในฐานะสมาชิกหรือทดสอบระบบได้)
- **Data Scoping**: สมาชิกทั่วไปจะเห็นเฉพาะข้อมูลของตนเอง (`uid` matching) ส่วน Admin/Librarian สามารถสลับโหมดเพื่อดูข้อมูลของตนเองได้
- **Render Logic**: ตรวจสอบบทบาทจาก Session ก่อนการ Render หน้าจอทุกครั้ง หากไม่มีสิทธิ์ให้ Redirect ไปยังหน้า Login หรือหน้า Dashboard ของตนเอง

## 9. Implementation Checklist (เพิ่มจากแผนเดิม)
เพื่อให้เริ่มพัฒนาได้ทันทีและลดงานย้อน จะใช้ checklist นี้ประกอบระหว่างลงมือ:

1. **กำหนด API Contract ให้ครบทุกหน้า**
- ล็อกโครงสร้าง response/empty/error สำหรับ `/app/loans`, `/app/reservations`, `/app/loan-self`
- ทำ error message ฝั่ง UI ให้อ่านง่ายและไม่เงียบหาย

2. **ตัดสินใจเส้นทางโปรไฟล์ให้ชัด**
- ใช้ `/app/profile` เป็นเส้นทางหลักฝั่ง Member
- คง `/profile` เดิมไว้เพื่อ backward compatibility แล้วทำ alias เชิง UX ผ่าน navigation

3. **ปรับสิทธิ์ Route ตามนโยบาย**
- เปิดให้กลุ่ม `member` ทุก role เข้า `/app/*`
- เปิดให้ `manage` เฉพาะ `admin` และ `librarian` เข้าโหมด Member ได้

4. **วาง Geofencing Failover ล่วงหน้า**
- ระบุพฤติกรรมเมื่อโดนปฏิเสธสิทธิ์พิกัด, timeout, accuracy ต่ำ
- แสดงแนวทางแก้ (retry/เปิด GPS/ไปจุดที่อนุญาต) ชัดเจนในหน้า `/app/loan-self`

5. **แยกสถานะ Reservation ระหว่าง MVP และ Full**
- MVP: หน้า `/app/reservations` + data contract พร้อมข้อความสถานะระบบ
- Full: เพิ่ม create/cancel/queue notify และเชื่อม backend actions ครบ

6. **กำหนด Red Dot Rule สำหรับ Notification**
- แหล่งข้อมูลหลัก: overdue, fine ใหม่, reservation ready
- ระบุ refresh policy (initial load + poll interval + เมื่อเปิด panel)

## 10. ลำดับการพัฒนา (Execution Order)
1. สร้าง `member_shell` + navigation desktop/mobile
2. เปิด routes `/app/*` ให้ครบตามแผน
3. เชื่อม Dashboard/Books/Loans กับ API ที่พร้อมใช้งาน
4. ใส่ Geofencing flow ใน `/app/loan-self` (พร้อม failover UI)
5. ใส่ Reservation MVP และ notification red-dot integration
