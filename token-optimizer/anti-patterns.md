# Anti-Patterns: สิ่งที่ห้ามทำ

## ❌ Anti-Pattern 1: cat ไฟล์ใหญ่ทั้งหมด

```bash
# ❌ ห้ามทำ
cat src/large_module.py          # อาจโหลด 50K tokens
cat logs/application.log         # log ไฟล์มักใหญ่มาก

# ✅ ทำแทน
wc -l src/large_module.py        # ดูขนาดก่อน
grep -n "TargetFunction" src/large_module.py  # หาตำแหน่ง
sed -n '245,280p' src/large_module.py          # อ่านแค่ส่วนนั้น
tail -100 logs/application.log   # ดูแค่ล่าสุด
```

## ❌ Anti-Pattern 2: อ่านทุกไฟล์ใน directory

```bash
# ❌ ห้ามทำ
cat src/*.py                     # อ่านทุกไฟล์
for f in src/*.py; do cat $f; done

# ✅ ทำแทน
ls src/*.py                      # ดูว่ามีไฟล์อะไร
grep -rn "target_function" src/  # หาในทุกไฟล์โดยไม่ต้องอ่าน
grep -rl "ClassName" src/        # ดูว่าไฟล์ไหนมี class นี้
```

## ❌ Anti-Pattern 3: อ่าน node_modules / venv / .git

```bash
# ❌ ห้ามทำ (เด็ดขาด)
find . -type f -name "*.js"      # จะรวม node_modules
cat package-lock.json            # ไฟล์นี้ใหญ่มาก ไม่มีประโยชน์
ls -la .git/objects/             # ไม่มีประโยชน์

# ✅ ทำแทน
find . -type f -name "*.js" \
  --exclude-dir=node_modules \
  --exclude-dir=.git
```

## ❌ Anti-Pattern 4: Run full test suite เพื่อเช็ค 1 ไฟล์

```bash
# ❌ เปลืองเวลาและ context
python -m pytest                 # run ทั้งหมด
npm test                         # run ทั้งหมด

# ✅ ทำแทน
python -m pytest tests/test_specific.py -x -q
python -m pytest -k "test_function_name" -x
npm test -- --testPathPattern="specific"
```

## ❌ Anti-Pattern 5: แก้ไขโดยไม่ตรวจ syntax

```bash
# ❌ ห้ามทำ
# แก้ไขไฟล์แล้ว commit เลยโดยไม่ตรวจ

# ✅ ทำแทน (pipeline)
sed -i 's/old/new/g' file.py && python -m py_compile file.py
# ถ้า syntax error จะรู้ก่อน commit
```

## ❌ Anti-Pattern 6: อ่านไฟล์ซ้ำที่อ่านไปแล้ว

```bash
# ❌ ห้ามทำ
# อ่าน file.py ครั้งที่ 1
# แก้ไขอะไรบางอย่าง
# อ่าน file.py ครั้งที่ 2 เพื่อ "confirm"

# ✅ ทำแทน
git diff file.py                 # ดูแค่ส่วนที่เปลี่ยน
grep -n "ที่แก้" file.py        # หาแค่จุดที่สนใจ
```

## ❌ Anti-Pattern 7: ถามหรือ generate ข้อมูลที่รู้อยู่แล้ว

```
# ❌ ห้ามทำ
"อ่านไฟล์ README.md ก่อนแล้วบอกฉันว่า project นี้คืออะไร"
(ถ้า README อยู่ใน context แล้ว ไม่ต้องอ่านซ้ำ)

# ✅ ทำแทน
ใช้ข้อมูลที่มีใน context window อยู่แล้ว
```

## ❌ Anti-Pattern 8: Verbose output โดยไม่จำเป็น

```bash
# ❌ เปลือง output tokens
python -m pytest -v              # verbose เกินไป
git log                          # log ยาวมาก
pip list                         # list ทุก package

# ✅ ทำแทน
python -m pytest -q              # quiet mode
git log --oneline -10            # แค่ 10 บรรทัด
pip show specific-package        # ดูแค่ที่ต้องการ
```

---

## สรุป: Decision Tree

```
ต้องการข้อมูลจากไฟล์?
├── รู้ตำแหน่งแล้ว?
│   ├── ใช่ → sed -n 'X,Yp' อ่านแค่ส่วนนั้น
│   └── ไม่รู้ → grep -n ค้นหาก่อน แล้ว sed
├── ไม่รู้ว่าไฟล์ไหน?
│   └── grep -rn ค้นทั้ง project
└── ต้องการโครงสร้างทั้งหมด?
    └── grep -n "^def\|^class" ดู skeleton เท่านั้น
```