# Schema: users (Google Sheet) - FINAL VERSION

เอกสารฉบับนี้กำหนดโครงสร้างและกฎการตรวจสอบข้อมูล (Validation) สำหรับสมาชิกในระบบ smartlib-amt โดยเน้นความสอดคล้องกับโครงสร้างบุคลากรของสถานศึกษา

## 1. รายละเอียดคอลัมน์ (Columns Definition)

| Column | Field Name    | Type        | Description                        | Example                  | Required For                          | Notes                                                                 |
|:-------|:--------------|:------------|:-----------------------------------|:-------------------------|:--------------------------------------|:----------------------------------------------------------------------|
| A      | uid           | String      | Unique ID                          | `user_001`               | ทุก role                              | จาก Firebase Auth                                                     |
| B      | email         | String      | อีเมล                              | `john@vtc.ac.th`         | ทุก role ยกเว้น external (แนะนำ)      |                                                                       |
| C      | displayName   | String      | ชื่อที่แสดงในระบบ                  | `นายสมชาย ใจดี`          | ทุก role                              |                                                                       |
| D      | groupType     | Enum        | กลุ่มผู้ใช้งานหลัก                | `member`                 | ทุก role                              | `manage`, `member`                                                    |
| E      | role          | Enum        | บทบาทย่อย                         | `student`                | ทุก role                              | `admin`, `librarian`, `teacher`, `staff`, `student`, `external`       |
| F      | personnelType | String      | ประเภทบุคลากรจริง                  | `ข้าราชการ`              | admin, librarian, teacher, staff      | ดูค่าที่อนุญาตใน Section 2 — student/external เว้นว่าง               |
| G      | idCode        | String      | รหัสนักเรียน / รหัสบุคลากร / เลขบัตร | `64001234`           | teacher, staff, student, external     | external ใช้เลขบัตรตาม idType                                         |
| H      | idType        | Enum        | ประเภทบัตรของ external             | `nationalId`             | external เท่านั้น                     | `nationalId`, `passport`, `studentCard` — role อื่นเว้นว่าง          |
| I      | department    | String      | สาขาวิชา หรือ ฝ่าย                | `สาขาวิชาช่างยนต์`       | admin, librarian, teacher, staff, student | ค่าจากโครงสร้างองค์กร — external เว้นว่าง                            |
| J      | level         | Enum        | ระดับการศึกษา                     | `ปวช.`                   | student เท่านั้น                      | `ปวช.`, `ปวส.` — role อื่นเว้นว่าง                                   |
| K      | classRoom     | String      | ห้องเรียน                          | `1/1`                    | student เท่านั้น                      | format `{ปี}/{ห้อง}` — role อื่นเว้นว่าง                             |
| L      | organization  | String      | สังกัด/หน่วยงานที่มาจาก           | `วิทยาลัยเทคนิคอุบลฯ`   | external แนะนำ                        | role อื่นเว้นว่าง                                                     |
| M      | status        | Enum        | สถานะบัญชี                        | `active`                 | ทุก role                              | `active`, `inactive`, `suspended`                                     |
| N      | phone         | String      | เบอร์โทรศัพท์                     | `0812345678`             | ทุก role                              |                                                                       |
| O      | lineId        | String      | Line ID                            | `somchai.line`           | optional                              |                                                                       |
| P      | address       | String      | ที่อยู่                            | `123 ถ.ชยางกูร อ.เมือง` | optional                              |                                                                       |
| Q      | photoURL      | String      | ลิงก์รูปภาพ                       | `https://.../img.jpg`    | optional                              |                                                                       |
| R      | createdAt     | ISO8601     | วันที่สร้าง                       | `2024-05-20T08:30:00Z`   | ทุก role                              | Auto-generated                                                        |
| S      | updatedAt     | ISO8601     | วันที่อัปเดตล่าสุด                | `2024-05-21T10:00:00Z`   | ทุก role                              | Auto-generated                                                        |
| T      | notes         | String      | หมายเหตุ (Internal)               | `สมัครใหม่`              | optional                              | ไม่แสดงต่อผู้ใช้                                                      |
| U      | password      | String      | รหัสผ่าน (Hashed)                 | `a665a45920422f9d417e...` | ทุก role                              | เข้ารหัส SHA-256 ก่อนบันทึก                                           |
| V      | verifyToken   | String      | Token ยืนยันอีเมล                 | `tk_8291...`             | ทุก role                              | ใช้สำหรับ Verification Link                                           |
| W      | isVerified    | Boolean     | สถานะการยืนยันอีเมล               | `true`                   | ทุก role                              | `true`, `false`                                                       |
| X      | expiryDate    | Date        | วันหมดอายุสิทธิ์ (ถ้าว่างคือไม่หมดอายุ) | `2024-12-31` | optional | สำหรับบัญชีชั่วคราว |
---

## 2. Validation Rules

### 2.1 groupType ↔ role
| groupType  | role ที่อนุญาต                              |
|:-----------|:--------------------------------------------|
| `manage`   | `admin`, `librarian`                        |
| `member`   | `student`, `teacher`, `staff`, `external`   |

### 2.2 role ↔ personnelType
| role        | personnelType ที่อนุญาต                                                              |
|:------------|:-------------------------------------------------------------------------------------|
| `admin`     | `ผู้บริหาร`                                                                          |
| `librarian` | `เจ้าหน้าที่`                                                                        |
| `teacher`   | `ข้าราชการ`, `พนักงานราชการ`, `ลูกจ้างประจำ`, `ครูพิเศษสอน`                        |
| `staff`     | `เจ้าหน้าที่`, `แม่บ้าน-นักการภารโรง`                                              |
| `student`   | — (เว้นว่าง)                                                                         |
| `external`  | — (เว้นว่าง)                                                                         |

### 2.3 Required Fields ต่อ role (✅ = จำเป็น, ⚠️ = แนะนำ)
| Field         | admin | librarian | teacher | staff | student | external |
|:--------------|:-----:|:---------:|:-------:|:-----:|:-------:|:--------:|
| uid           | ✅    | ✅        | ✅      | ✅    | ✅      | ✅       |
| email         | ✅    | ✅        | ✅      | ✅    | ✅      | —        |
| displayName   | ✅    | ✅        | ✅      | ✅    | ✅      | ✅       |
| groupType     | ✅    | ✅        | ✅      | ✅    | ✅      | ✅       |
| role          | ✅    | ✅        | ✅      | ✅    | ✅      | ✅       |
| personnelType | ✅    | ✅        | ✅      | ✅    | —       | —        |
| idCode        | —     | —         | ✅      | ✅    | ✅      | ✅       |
| idType        | —     | —         | —       | —     | —       | ✅       |
| department    | ✅    | ✅        | ✅      | ✅    | ✅      | —        |
| level         | —     | —         | —       | —     | ✅      | —        |
| classRoom     | —     | —         | —       | —     | ✅      | —        |
| organization  | —     | —         | —       | —     | —       | ⚠️       |
| status        | ✅    | ✅        | ✅      | ✅    | ✅      | ✅       |
| phone         | ✅    | ✅        | ✅      | ✅    | ✅      | ✅       |

---

## 3. Apps Script Validation Reference

```javascript
const GROUP_ROLE_MAP = {
  manage: ["admin", "librarian"],
  member: ["student", "teacher", "staff", "external"]
};

const ROLE_PERSONNEL_TYPE_MAP = {
  admin:     ["ผู้บริหาร"],
  librarian: ["เจ้าหน้าที่"],
  teacher:   ["ข้าราชการ", "พนักงานราชการ", "ลูกจ้างประจำ", "ครูพิเศษสอน"],
  staff:     ["เจ้าหน้าที่", "แม่บ้าน-นักการภารโรง"],
  student:   [],
  external:  []
};

const ID_TYPES = ["nationalId", "passport", "studentCard"];

const REQUIRED_FIELDS_BY_ROLE = {
  admin:     ["uid","email","displayName","groupType","role","personnelType","department","status","phone"],
  librarian: ["uid","email","displayName","groupType","role","personnelType","department","status","phone"],
  teacher:   ["uid","email","displayName","groupType","role","personnelType","idCode","department","status","phone"],
  staff:     ["uid","email","displayName","groupType","role","personnelType","idCode","department","status","phone"],
  student:   ["uid","email","displayName","groupType","role","idCode","department","level","classRoom","status","phone"],
  external:  ["uid","displayName","groupType","role","idCode","idType","status","phone"]
};

function validateUser(payload) {
  const { groupType, role, personnelType, idType, level, classRoom } = payload;

  // 1. ตรวจสอบความสัมพันธ์ groupType <-> role
  if (!GROUP_ROLE_MAP[groupType]?.includes(role))
    throw new Error("groupType และ role ไม่สัมพันธ์กัน");

  // 2. ตรวจสอบ personnelType ตาม role
  if (ROLE_PERSONNEL_TYPE_MAP[role].length > 0 &&
      !ROLE_PERSONNEL_TYPE_MAP[role].includes(personnelType))
    throw new Error(`personnelType "${personnelType}" ไม่ถูกต้องสำหรับบทบาท "${role}"`);

  // 3. ตรวจสอบ idType สำหรับ external
  if (role === "external" && !ID_TYPES.includes(idType))
    throw new Error("idType ไม่ถูกต้องสำหรับบุคคลภายนอก (ต้องเป็น nationalId, passport, หรือ studentCard)");

  // 4. ตรวจสอบฟอร์แมตข้อมูล student
  if (role === "student") {
    if (!["ปวช.", "ปวส."].includes(level))
      throw new Error("ระดับการศึกษา (level) ต้องเป็น ปวช. หรือ ปวส.");
    if (!/^\d+\/\d+$/.test(classRoom))
      throw new Error("รูปแบบห้องเรียน (classRoom) ไม่ถูกต้อง (ตัวอย่างที่ถูก: 1/1)");
  }

  // 5. ตรวจสอบฟิลด์ที่จำเป็น (Required Fields)
  const required = REQUIRED_FIELDS_BY_ROLE[role];
  for (const field of required) {
    if (!payload[field]) throw new Error(`ข้อมูล "${field}" ห้ามว่างสำหรับบทบาท "${role}"`);
  }

  return true;
}
```
