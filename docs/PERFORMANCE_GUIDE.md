# Performance Guide: Google Sheets + GAS (smartlib-amt)

เอกสารฉบับนี้รวบรวมเทคนิคการเพิ่มประสิทธิภาพเพื่อให้ระบบทำงานได้รวดเร็ว แม้ปริมาณข้อมูลจะเพิ่มมากขึ้น

## 1. ปัญหาคอขวด (Bottlenecks)
- **Data Fetching:** GAS ไม่มีคำสั่ง `WHERE` เหมือน SQL การใช้ `getDataRange().getValues()` จะดึงข้อมูลทุกแถวมาประมวลผลใน Memory เสมอ
- **Response Size:** การส่งข้อมูลขนาดใหญ่กลับไปยังหน้าบ้านผ่าน JSONP จะใช้เวลานานและอาจเกิด Timeout

## 2. กลยุทธ์ความเร็ว (Optimization Strategy)

### 2.1 การใช้ CacheService
ใช้สำหรับข้อมูลที่มีการอ่านบ่อยแต่แก้ไขไม่บ่อย (เช่น รายการหนังสือ)
- **TTL:** ตั้งค่า Cache ไว้ประมาณ 5-10 นาที (300-600 วินาที)
- **Invalidation:** ต้องทำการล้าง Cache (`cache.remove()`) ทุกครั้งที่มีการ เพิ่ม/แก้ไข/ลบ ข้อมูล

### 2.2 การแยกชีตข้อมูล (Structural Partitioning)
เพื่อลดจำนวนแถวในชีตหลักที่ต้องถูกโหลดทุกครั้ง:
- **Active Sheet:** เก็บเฉพาะข้อมูลที่ใช้งานปัจจุบัน (`status: active`)
- **Archive Sheet:** ย้ายข้อมูลที่ถูกยกเลิกหรือใช้งานเสร็จแล้วมาไว้ที่นี่ (`status: archived`)
- **Benefit:** ทำให้ชีตหลักมีขนาดเล็กอยู่เสมอ การค้นหาและโหลดข้อมูลจะเร็วขึ้นอย่างเห็นได้ชัด

### 2.3 การทำ Pagination
ส่งข้อมูลกลับหน้าบ้านทีละชุด (เช่น ครั้งละ 50 รายการ) แทนการส่งทั้งหมด
- ใช้พารามิเตอร์ `page` และ `limit` ในการกำหนดช่วงข้อมูล

## 3. เกณฑ์การเลือกเทคนิค (Performance Matrix)

| ขนาดข้อมูล | ความเร็วโดยประมาณ | เทคนิคที่แนะนำ |
|:---|:---|:---|
| < 500 แถว | เร็ว (~1-2 วินาที) | ไม่ต้อง Optimize |
| 500 - 2,000 แถว | เริ่มช้าลง | ใช้ **CacheService** |
| > 2,000 แถว | ช้าชัดเจน | **แยก Archive Sheet + Cache + Pagination** |

---

## 4. ตัวอย่าง Code Implementation (Reference)

```javascript
// ตัวอย่างการใช้ Cache
const cache = CacheService.getScriptCache();
const cachedData = cache.get('catalog_list');
if (cachedData) return JSON.parse(cachedData);

// ตัวอย่างการ Pagination
function getPaginatedData(allData, page = 1, limit = 50) {
  const start = (page - 1) * limit;
  return allData.slice(start, start + limit);
}
```
