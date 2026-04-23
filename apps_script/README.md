# Apps Script Backend (JSONP + Google Sheet)

Web app URL (current):
`https://script.google.com/macros/s/AKfycbyELEgEdWlz0jgWLmAL4qIMGUAJWllD2mRgHLmowTK2lAwpHRFCwaCaM3c1E22iGgOu/exec`

Spreadsheet:
`https://docs.google.com/spreadsheets/d/1uaIdRHGge04aFx_OxZJToDfZIaZQYrbAYvTE7U5302A/edit`

## clasp
- `.clasp.json` อยู่ที่ root ของ repo และชี้ `rootDir=apps_script` แล้ว (กันไม่ให้ push ไฟล์ frontend ขึ้นไป)
- Login: `clasp login`
- Push code: `clasp push`

## Deploy Web App
Deploy > Manage deployments > (Edit/Deploy) เป็น Web app:
- Execute as: Me
- Who has access: Anyone

คัดลอก Web app URL ไปใส่ `VITE_GAS_WEBAPP_URL` ใน `.env` ของ frontend

## API (JSONP)
เรียกแบบ GET:
- `?action=ping`
- `?action=get&key=...`
- `?action=set&key=...&value=...`
- `?action=delete&key=...`
- `?action=list`

เพิ่ม `&callback=cbName` จะตอบกลับเป็น `cbName(<json>);`

