# แผนการออกแบบ: ระบบเชื่อมต่อ Google Drive สำหรับเก็บรูปภาพ (Google Drive Integration Design)

เอกสารนี้อธิบายสถานะการเชื่อม Google Drive ของระบบ SmartLib-AMT โดยแยกชัดเจนระหว่างสิ่งที่ใช้งานจริงแล้ว (`Current state`) และสิ่งที่วางแผนไว้ (`Future scope`)

## 1. Current State (ใช้งานจริง)

### 1.1 ขอบเขตที่รองรับแล้ว
- รองรับการอัปโหลดรูป `โปรไฟล์สมาชิก` เท่านั้น
- ฝั่ง Backend ใช้ action: `profile_upload_photo`
- ฝั่ง Frontend เรียกผ่าน `apiProfileUploadPhoto(...)`

### 1.2 Drive Folder Configuration
ระบบอ่านโฟลเดอร์รูปโปรไฟล์ตามลำดับนี้:
1. `Script Properties` key: `PROFILE_PHOTO_FOLDER_ID`
2. fallback: `CONFIG.DRIVE.PROFILE_PHOTO_FOLDER`

โฟลเดอร์ที่ตั้งค่าไว้ในระบบตอนนี้:
- `user-profiles`: `1fkyLfDgzOKquLYQJv_K3Qd_XmqnUNifK`
- `book-covers`: `10Q8t2WQ6CtCgMG-jIU3RJF1Uxa8Sge-z`

หมายเหตุ: แม้จะตั้งค่า `book-covers` แล้ว แต่ flow อัปโหลดปกหนังสือยังไม่เปิดใช้งานใน production (ยังเป็น Future scope)

### 1.3 Workflow (Current)
1. Frontend ให้ผู้ใช้เลือกรูป และบีบอัด/ย่อภาพฝั่ง client
2. Frontend แปลงเป็น `data URL` แล้วแยกเป็น `mimeType` + `base64Data`
3. Frontend เรียก GAS แบบ `JSONP` (query string) ไม่ใช่ HTTP POST
4. Backend ตรวจสิทธิ์ผู้ใช้จาก `auth`, บังคับให้ `auth.uid` และ `auth.user.uid` ตรงกัน และสถานะบัญชีต้อง `active`
5. Backend ตรวจ mime type / ขนาดไฟล์ แล้วอัปโหลดลง Google Drive
6. Backend อัปเดต `users.photoURL`; ถ้า write ลง Sheet ไม่สำเร็จ ระบบจะ rollback โดยลบไฟล์ที่เพิ่งอัปโหลดทิ้ง
7. หลังบันทึกสำเร็จ จึง cleanup ไฟล์รูปเก่าของ uid เดียวกัน และคืน `photoURL`

### 1.4 API Contract (Current)
**Action:** `profile_upload_photo`

**Payload (ใน field `payload` ของ JSONP):**
```json
{
  "auth": { "uid": "U001", "user": { "uid": "U001" } },
  "mimeType": "image/jpeg",
  "base64Data": "<base64-without-data-url-prefix>",
  "fileName": "avatar.jpg"
}
```

**Response (success):**
```json
{
  "ok": true,
  "data": {
    "ok": true,
    "photoURL": "https://drive.google.com/uc?id=<FILE_ID>",
    "fileId": "<FILE_ID>"
  }
}
```

### 1.5 Backend Reference (Current)
ไฟล์หลัก: `apps_script/Module_ProfileNotifications.gs`

```javascript
function profileUploadPhoto_(payload) {
  const actor = assertProfileActor_(payload && payload.auth);
  const authUid = String(payload && payload.auth && payload.auth.uid || "").trim();
  if (authUid && authUid !== actor.uid) throw new Error("401: INVALID_TOKEN");
  const mimeType = String(payload && payload.mimeType || "").trim().toLowerCase();
  const data = String(payload && payload.base64Data || "").trim();
  const fileName = String(payload && payload.fileName || "").trim();

  const allowed = {
    "image/jpeg": true,
    "image/png": true,
    "image/webp": true
  };
  if (!allowed[mimeType]) throw new Error("รองรับเฉพาะไฟล์ JPEG, PNG, WEBP");
  if (!data) throw new Error("ไม่พบข้อมูลไฟล์รูปภาพ");

  const bytes = Utilities.base64Decode(data);
  if (bytes.length > 2 * 1024 * 1024) throw new Error("ขนาดไฟล์ต้องไม่เกิน 2MB");

  const folderId = getProfilePhotoFolderId_();
  const safeUid = sanitizeDriveQueryToken_(actor.uid);

  const ext = mimeType === "image/png" ? "png" : (mimeType === "image/webp" ? "webp" : "jpg");
  const safeName = safeUid + "_" + Date.now() + (fileName ? "_" + fileName.replace(/[^\w.\-]/g, "") : "") + "." + ext;
  const blob = Utilities.newBlob(bytes, mimeType, safeName);
  const uploaded = driveUploadFile_(folderId, blob, actor.uid);
  const file = uploaded.file;
  const folder = uploaded.folder;
  const url = uploaded.url;

  try {
    // update users.photoURL ...
  } catch (err) {
    file.setTrashed(true); // rollback: ไม่ให้ไฟล์ลอยใน Drive
    throw new Error("บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่");
  }

  const query = "title contains '" + safeUid + "_'";
  const oldFiles = folder.searchFiles(query);
  while (oldFiles.hasNext()) {
    const oldFile = oldFiles.next();
    if (String(oldFile.getId()) !== String(file.getId())) oldFile.setTrashed(true);
  }

  return { ok: true, photoURL: url, fileId: file.getId() };
}
```

## 2. Known Limits / Best Practices

1. **JSONP payload constraint**: การส่งข้อมูลผ่าน query string มีข้อจำกัดความยาว URL สูง ควรย่อภาพฝั่ง client อย่างเข้มงวดก่อนอัปโหลด
2. **Compression target (explicit)**: target รอบแรกคือ crop/resize ที่ `400x400px` และพยายามให้ไฟล์ไม่เกิน `150KB` ก่อน encode base64; หากยังเกินเพดาน JSONP ให้ลดคุณภาพ/ขนาดต่อแบบ aggressive
3. **Frontend guardrails**: หน้าโปรไฟล์มีเพดาน base64 เพิ่มเติมเพื่อหลบปัญหา JSONP URL length
4. **Allowed formats**: รองรับ `image/jpeg`, `image/png`, `image/webp`
5. **File size limit (server-side)**: จำกัดไม่เกิน `2MB` หลัง decode
6. **Drive quota**: ควรตรวจพื้นที่ Drive และมีแผน cleanup ไฟล์เก่า
7. **Security**: Backend ต้องตรวจ auth ทุกครั้ง, บังคับ uid consistency, และ sanitize token ก่อนใช้กับ Drive search query

## 3. Future Scope (Planned, Not Implemented Yet)

### 3.1 Book Cover Upload
เป้าหมายในอนาคต:
- เพิ่ม action สำหรับอัปโหลดรูปปกหนังสือโดยตรง (แทนการกรอก `coverUrl` ด้วยมือ)
- ใช้โฟลเดอร์ Drive สำหรับหนังสือผ่าน key `BOOK_COVER_FOLDER_ID` (หรือ fallback `CONFIG.DRIVE.BOOK_COVER_FOLDER`)
- อัปเดต `books_catalog.coverUrl` จากผลอัปโหลดอัตโนมัติ

### 3.2 Suggested Direction
- พิจารณาเปลี่ยนจาก JSONP upload เป็น endpoint แบบ POST จริง เพื่อลดข้อจำกัด URL length
- แยก utility สำหรับ image upload ให้ reuse ได้ทั้ง profile และ books
- ออกแบบ rollback/cleanup กรณี upload Drive สำเร็จแต่ update sheet ล้มเหลว
- หากต้องการ URL ที่เสถียรกว่า `drive.google.com/uc?id=...` ให้พิจารณา serve รูปผ่าน GAS proxy endpoint (`doGet`) ในอนาคต

## 4. เอกสารที่เกี่ยวข้อง
- `docs/SCHEMA_USERS.md` (คอลัมน์ `photoURL`)
- `docs/SCHEMA_BOOKS.md` (คอลัมน์ `coverUrl`)
- `docs/PROFILE_NOTIFICATION_PLAN.md` (บริบทหน้าโปรไฟล์/notification)
