# 🚀 Token Ultimate Strategy: RTK + Optimizer Combo

คู่มือการทำงานที่มีประสิทธิภาพสูงสุด (Maximum Efficiency) และประหยัด Token สูงสุด (Minimum Burn) โดยการผสานพลังระหว่าง **RTK (Automation)** และ **Token-Optimizer (Surgical Strategy)**

---

## 💡 ปรัชญาการทำงาน (The Combo Philosophy)

> **"เลือกเฉพาะส่วน (Select) → บีบอัดข้อมูล (Compress) → สื่อสารอย่างแม่นยำ (Signal)"**

1.  **Select (Optimizer Strategy):** ใช้สมองเลือกอ่าน/รัน เฉพาะส่วนที่เกี่ยวข้องจริงๆ (ห้ามอ่านทั้งไฟล์/ห้ามรันทั้ง Suite)
2.  **Compress (RTK Power):** ใช้ RTK ครอบคำสั่งเพื่อบีบอัด Output ให้เหลือแต่เนื้อหาที่ AI ต้องการ
3.  **Signal (High Density):** ผลลัพธ์ที่ได้จะเป็น High-signal Content ที่ใช้ Token น้อยแต่ให้ข้อมูลครบถ้วน

---

## 🛠 ตารางเลือกใช้เครื่องมือ (The Decision Matrix)

| สถานการณ์ (Scenario) | กลยุทธ์ที่ควรใช้ (Strategy) | คำสั่งแนะนำ (Recommended Command) | ผลลัพธ์ที่ได้ |
| :--- | :--- | :--- | :--- |
| **สำรวจโปรเจกต์ใหม่** | RTK Tree | `rtk tree --depth 2` | เห็นภาพรวมโดยไม่โหลดไฟล์ขยะ |
| **ค้นหาโค้ด/ฟังก์ชัน** | Optimizer + RTK | `rtk grep -n "function_name" src/` | เจอตำแหน่งพร้อมบรรทัดที่ชัดเจน |
| **อ่านโค้ดในไฟล์ใหญ่** | Optimizer (Surgical) | `sed -n '100,150p' file.js` | อ่านเฉพาะจุด ประหยัด Token 90% |
| **อ่านไฟล์ขนาดเล็ก** | RTK Read | `rtk read config.json` | อ่านไฟล์สะอาด ไม่มี Metadata รก |
| **ตรวจสอบการเปลี่ยน git** | RTK Git | `rtk git diff --stat` หรือ `rtk git status` | สรุปยอดการเปลี่ยนแปลงแบบกะทัดรัด |
| **รัน Test เพื่อเช็ค Bug** | Optimizer + RTK | `rtk npm test -- path/to/specific_test.js` | รันเฉพาะไฟล์ที่พัง ไม่รันทั้งโปรเจกต์ |
| **เช็ค Syntax ก่อนแก้** | Optimizer (Check) | `node --check file.js` หรือ `python -m py_compile` | มั่นใจก่อนแก้ ไม่เสีย Turn แก้ Error |

---

## 📋 Best Practices (Combo Workflow)

### 1. การสำรวจ (Exploration Phase)
❌ **ห้าม:** `ls -R` หรือ `cat` ไฟล์เพื่อดูว่ามีอะไร
✅ **ทำ:** ใช้ `rtk tree` เพื่อดูโครงสร้าง และ `rtk grep` เพื่อหาจุดเชื่อมโยง

### 2. การอ่าน (Reading Phase)
❌ **ห้าม:** `read_file` ทั้งไฟล์ถ้าไฟล์นั้นเกิน 100 บรรทัด
✅ **ทำ:** 
1. `rtk grep -n` เพื่อหาบรรทัดที่ต้องการ
2. ใช้ `sed -n 'start,endp'` เพื่ออ่านเฉพาะขอบเขตนั้น (Context รอบข้าง +- 10 บรรทัด)

### 3. การแก้ไข (Execution Phase)
❌ **ห้าม:** แก้ไขเสร็จแล้ว `cat` ไฟล์ใหม่ทั้งหมดเพื่อเช็ค
✅ **ทำ:**
1. ใช้ `rtk git diff` เพื่อดูแค่ส่วนที่เปลี่ยน
2. ใช้คำสั่งเช็ค Syntax เฉพาะจุด (เช่น `rtk node --check`)

### 4. การรายงาน (Reporting Phase)
❌ **ห้าม:** ก๊อปปี้ Error ยาวๆ มาวางในแชท
✅ **ทำ:** ใช้ `rtk` ครอบคำสั่งที่พัง เพื่อให้มันสรุป Error ที่สำคัญที่สุดมาให้

---

## 📈 สถิติที่คาดหวัง (Efficiency Gains)
- **Context Window:** เหลือพื้นที่ว่างมากขึ้น 40-60%
- **Token Cost:** ลดลงอย่างน้อย 30% ต่อหนึ่ง Task
- **Accuracy:** ความแม่นยำสูงขึ้นเพราะ AI ไม่หลงทางในข้อมูลขยะ (Noise)

---
*จัดทำโดย Gemini CLI - ผสานพลัง RTK และ Token-Optimizer เพื่อ smartlib-amt-V2*
