# รายงานการแก้ไขบั๊ก (ฉบับปรับปรุง): สิทธิ์ DriveApp และการเปรียบเทียบกับ Official Sample

**วันที่รายงาน:** 2026-04-27
**สถานะ:** พบสาเหตุเพิ่มเติมที่อาจขัดขวางการทำงาน (Potential GCP API Issue)

## 1. การเปรียบเทียบกับ Official Sample (Google Apps Script)
จากการตรวจสอบโค้ดตัวอย่างอย่างเป็นทางการของ Google ([Upload Files Sample](https://developers.google.com/apps-script/samples/automations/upload-files)) พบว่าแนวทางการเขียนโค้ดของเรามีความคล้ายคลึงกันมาก แต่มีจุดที่ควรสังเกตดังนี้:

### โค้ดตัวอย่างจาก Official:
```javascript
// ใน Code.gs (Official)
function uploadFile(data, fileName) {
  var folder = DriveApp.getFolderById(FOLDER_ID);
  var decoded = Utilities.base64Decode(data);
  var blob = Utilities.newBlob(decoded, 'image/jpeg', fileName);
  return folder.createFile(blob).getUrl();
}

// ใน Setup.gs (Official)
function setup() {
  // สร้างโฟลเดอร์และเก็บ ID ไว้ใน ScriptProperties
  const folder = DriveApp.createFolder('Uploads');
  PropertiesService.getScriptProperties().setProperty('FOLDER_ID', folder.getId());
  // *** สำคัญ: การเรียกใช้ DriveApp ใน Setup จะบังคับให้แสดงหน้าจอขอสิทธิ์ทันที ***
}
```

### สิ่งที่ระบบของเรา (smartlib-amt) ทำต่างออกไป:
1. **JSONP Constraints**: เราใช้ JSONP ซึ่งส่งข้อมูลผ่าน URL (GET) ทำให้เราต้องคุมขนาดของ Base64 ให้ไม่เกินขีดจำกัดของ Browser (~2000-8000 ตัวอักษร) ต่างจากตัวอย่างที่มักใช้ `google.script.run` (POST)
2. **Explicit Scopes**: เรากำหนด Scopes ไว้ใน `appsscript.json` ซึ่งถูกต้องแล้ว แต่หากมีการ "ผูกโปรเจกต์กับ Google Cloud (GCP)" สิทธิ์ในไฟล์นี้อย่างเดียวจะไม่พอ

---

## 2. แผนการแก้ไขขั้นเด็ดขาด (Revised Fix Plan)

หากคุณทำตามขั้นตอนการกดยืนยันสิทธิ์ใน Editor แล้วยังไม่ได้ผล ให้ตรวจสอบ 2 ประเด็นนี้:

### ประเด็น A: Google Cloud Project (GCP) API Enabled?
หาก Apps Script ของคุณผูกอยู่กับ Standard Google Cloud Project (สังเกตได้จากเลข Project Number ในหน้า Project Settings) **คุณต้องไปเปิดใช้งาน Google Drive API ใน Cloud Console ด้วย**
1. เข้าไปที่ [Google Cloud Console](https://console.cloud.google.com/)
2. เลือกโปรเจกต์ที่ผูกกับ Apps Script นี้
3. ไปที่ **APIs & Services** > **Library**
4. ค้นหา **"Google Drive API"** แล้วกด **Enable**

### ประเด็น B: การเรียกใช้ Method เพื่อกระตุ้นสิทธิ์ (Forced Authorization)
บางครั้ง Google Apps Script ไม่ตรวจพบสิทธิ์ที่จำเป็นหากไม่ได้มีการเรียกใช้ในระดับ Top-level หรือฟังก์ชันหลัก ให้ลองเพิ่มฟังก์ชัน "ทดสอบการเขียน" ในไฟล์ `Setup.gs` ดังนี้:

```javascript
// เพิ่มฟังก์ชันนี้ใน Setup.gs แล้วลองรันใน Editor
function forceDriveAuth() {
  try {
    const folderId = getProfilePhotoFolderId_();
    if (!folderId) throw new Error("ไม่พบ PROFILE_PHOTO_FOLDER_ID");
    
    const folder = DriveApp.getFolderById(folderId);
    // ทดลองสร้างไฟล์ชั่วคราวแล้วลบทิ้งเพื่อเช็คสิทธิ์ Write Access
    const tempFile = folder.createFile("test.txt", "Verify Access at " + new Date());
    Logger.log("สร้างไฟล์สำเร็จ: " + tempFile.getName());
    tempFile.setTrashed(true);
    Logger.log("ยืนยันสิทธิ์ Write Access เรียบร้อยแล้ว");
    return true;
  } catch (err) {
    Logger.log("เกิดข้อผิดพลาด: " + err.message);
    throw err;
  }
}
```

---

## 3. ขั้นตอนการแก้ไขที่ต้องทำใหม่ (Strict Checklist)

1. **Push Code**: รัน `clasp push` เพื่อให้โค้ด `forceDriveAuth` ขึ้นไปบนระบบ
2. **Run in Editor**: เปิด Apps Script Editor เลือกฟังก์ชัน `forceDriveAuth` แล้วกด **Run**
   - **หากมีหน้าต่างขอสิทธิ์**: ให้กดยืนยันจนจบ
   - **หาก Error**: "Google Drive API has not been used...": ให้คลิกลิงก์ที่ปรากฏใน Error เพื่อไปเปิดใช้งาน API ใน Google Cloud Console
3. **Redeploy**: กด **Deploy** > **Manage deployments** > **Edit** > เลือก **New Version** > **Deploy**
   - **ตรวจสอบ URL**: ตรวจดูว่า URL ที่ได้หลัง Deploy ตรงกับค่า `GAS_URL` ใน `public/app/config.js` หรือไม่ (ถ้าไม่ตรงให้แก้ที่ `config.js` แล้ว Refresh หน้าเว็บ)

---

## 4. วิเคราะห์ Error ล่าสุดของคุณ
Error `DriveApp.Folder.createFile` ที่ยังปรากฏอยู่ทั้งที่มี Scope ในไฟล์คอนฟิก ยืนยันว่า **"ตัว Web App ที่รันอยู่ ไม่ได้รับสิทธิ์นั้น"** ซึ่งมักเกิดจาก:
- การ Deploy แบบ **"ใช้เวอร์ชันเดิม (Active)"** โดยไม่มีการสร้าง New Version หลังกดยืนยันสิทธิ์
- หรือตัวสคริปต์ไปผูกกับ GCP Project ที่ปิด Google Drive API ไว้
