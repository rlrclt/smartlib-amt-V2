---
name: token-optimizer
description: |
  ลด context และ token ในการทำงานกับ AI CLI และ coding agents ทุกตัว ใช้เมื่อ:
  - ผู้ใช้ต้องการลดค่าใช้จ่าย token หรือ context window ที่ใช้
  - ผู้ใช้ถามว่า "จะลด token ยังไง", "ประหยัด context", "อย่าอ่านไฟล์ทั้งหมด"
  - ก่อนแก้ไขไฟล์ขนาดใหญ่ (>200 บรรทัด)
  - เมื่อต้องตรวจสอบ syntax หรือ error โดยไม่ต้องอ่านทั้งไฟล์
  - ทำงานกับ Claude Code, Codex CLI, Gemini CLI, Cursor, Aider หรือ AI agent อื่นๆ
  ใช้ skill นี้ทุกครั้งที่มีความเสี่ยงจะใช้ token เกินความจำเป็น
---

# Token & Context Optimizer Skill

คู่มือลดการใช้ token และ context window อย่างมีประสิทธิภาพ  
ใช้ได้กับ: **Claude Code · Codex CLI · Gemini CLI · Aider · Cursor · ทุก AI CLI**

---

## หลักการสำคัญ (ต้องจำ)

```
อ่านน้อยที่สุด → เข้าใจมากที่สุด → แก้ตรงจุด → ไม่อ่านซ้ำ
```

> **กฎทอง**: ห้ามอ่านไฟล์ทั้งหมดถ้าต้องการแค่บางส่วน  
> **กฎเงิน**: ตรวจสอบก่อนแก้ ไม่ใช่แก้แล้วค่อยตรวจ

---

## 1. คำสั่งตรวจสอบ (READ LESS, KNOW MORE)

### 1.1 ดูโครงสร้างก่อนเสมอ
```bash
# ดู directory tree (ไม่โหลด content)
find . -type f -name "*.py" | head -30
ls -la src/

# ดูขนาดไฟล์ก่อนตัดสินใจอ่าน
wc -l src/*.py
du -sh src/
```

### 1.2 ดูเฉพาะส่วนที่ต้องการ
```bash
# ดูแค่ N บรรทัดแรก
head -50 file.py

# ดูแค่ N บรรทัดสุดท้าย
tail -30 file.py

# ดูบรรทัดที่ X ถึง Y เท่านั้น
sed -n '100,150p' file.py

# ค้นหาบรรทัดที่มีคำนั้น + บรรทัดรอบข้าง
grep -n "function_name" file.py -A 5 -B 2
```

### 1.3 ตรวจสอบ Syntax ก่อนอ่านทั้งไฟล์
```bash
# Python
python -m py_compile file.py && echo "OK" || echo "ERROR"
python -m flake8 file.py --select=E,W --max-line-length=100

# JavaScript / TypeScript
node --check file.js
npx tsc --noEmit

# Go
go vet ./...

# Rust
cargo check 2>&1 | head -30

# Shell script
bash -n script.sh

# JSON
python -m json.tool file.json > /dev/null

# YAML
python -c "import yaml; yaml.safe_load(open('file.yaml'))"
```

### 1.4 ดูเฉพาะ function/class signatures (ไม่ดู body)
```bash
# Python: ดูแค่ def และ class
grep -n "^def \|^class \|^    def " file.py

# JavaScript: ดูแค่ function declarations
grep -n "function \|const.*=.*=>" file.js

# ดู imports เท่านั้น
grep -n "^import\|^from\|^require" file.py | head -20
```

---

## 2. คำสั่งแก้ไข (EDIT PRECISELY)

### 2.1 แก้ไขแบบ Surgical (ไม่ต้องอ่านทั้งไฟล์)
```bash
# แทนที่ข้อความเฉพาะจุด (ปลอดภัย)
sed -i 's/old_text/new_text/g' file.py

# แทนที่เฉพาะบรรทัดที่ X
sed -i '42s/old/new/' file.py

# เพิ่มบรรทัดหลัง pattern
sed -i '/def main/a\    logger.info("start")' file.py

# ลบบรรทัดที่มี pattern
sed -i '/TODO: remove this/d' file.py
```

### 2.2 Patch แบบ Diff (ดีที่สุดสำหรับ AI agents)
```bash
# สร้าง patch จาก diff แล้ว apply
diff -u old_file.py new_file.py > fix.patch
patch file.py < fix.patch

# Apply patch ด้วย git
git apply fix.patch
```

### 2.3 ดูเฉพาะ diff ของการเปลี่ยนแปลง
```bash
git diff file.py           # ดูการเปลี่ยนแปลงปัจจุบัน
git diff HEAD~1 file.py    # เทียบกับ commit ล่าสุด
git diff --stat            # สรุปว่าไฟล์ไหนเปลี่ยน
```

---

## 3. คำสั่งตามประเภทงาน

### งาน: แก้ Bug
```bash
# 1. หาว่า error อยู่ที่ไหน (ไม่อ่านทั้งโปรเจกต์)
grep -rn "error_message\|ErrorClass" src/ --include="*.py"

# 2. ดูเฉพาะบรรทัดรอบ error
sed -n '$(grep -n "bug_pattern" file.py | cut -d: -f1)p' file.py

# 3. ตรวจ syntax หลังแก้
python -m py_compile file.py
```

### งาน: เพิ่ม Feature
```bash
# 1. ดูโครงสร้างก่อน
grep -n "^class \|^def " file.py

# 2. ดูเฉพาะส่วนที่ต้องแก้
sed -n 'START,ENDp' file.py

# 3. แก้แบบ targeted
# 4. ตรวจ tests
python -m pytest tests/test_feature.py -x -q
```

### งาน: Review Code
```bash
# อ่านแบบ skeleton ก่อน
grep -n "def \|class \|return \|raise " file.py

# ดู complexity
python -m mccabe --min 5 file.py

# ดู imports ที่ไม่ได้ใช้
python -m pylint file.py --disable=all --enable=W0611
```

### งาน: Refactor
```bash
# ดูว่าใช้ที่ไหนบ้าง ก่อนเปลี่ยน
grep -rn "old_function_name" src/
grep -rn "OldClassName" src/ --include="*.py"

# ตรวจสอบหลัง refactor
python -m pytest -x -q
git diff --stat
```

---

## 4. กฎ: ✅ ทำได้ / ❌ ห้ามทำ / ⚠️ ต้องถาม Human ก่อน

### ✅ ทำได้เลย (Safe — ไม่เสี่ยง)
| คำสั่ง | ใช้เมื่อ |
|--------|---------|
| `grep -n` | ค้นหา pattern ใน code |
| `head / tail / sed -n` | ดูเฉพาะส่วนของไฟล์ |
| `wc -l` | ดูขนาดไฟล์ก่อนอ่าน |
| `python -m py_compile` | ตรวจ syntax เฉยๆ |
| `git diff` | ดูการเปลี่ยนแปลง |
| `find` / `ls` | ดูโครงสร้าง directory |

### ❌ ห้ามทำ (Wasteful / Dangerous)
| สิ่งที่ห้ามทำ | เหตุผล |
|--------------|--------|
| `cat` ไฟล์ขนาดใหญ่ทั้งหมด | เปลือง token มาก |
| อ่าน `node_modules/`, `.git/`, `venv/` | ไม่มีประโยชน์ |
| Run test ทั้ง suite เพื่อเช็คไฟล์เดียว | ช้าและสิ้นเปลือง |
| `find . -type f` โดยไม่ filter | อาจได้ไฟล์หมื่นบรรทัด |
| อ่านไฟล์ซ้ำที่อ่านไปแล้ว | เปลือง context |
| แก้ไขโดยไม่ตรวจ syntax ก่อน | เสี่ยงสร้าง bug ใหม่ |

### ⚠️ ต้องถาม Human ก่อน (High Risk)
| การกระทำ | เหตุผลที่ต้องถาม |
|----------|-----------------|
| ลบหรือ overwrite ไฟล์ | ไม่สามารถ undo ได้ง่าย |
| เปลี่ยน schema / database | กระทบข้อมูล production |
| แก้ config production | อาจทำ service ล่ม |
| เพิ่ม dependency ใหม่ | กระทบ compatibility |
| เปลี่ยน API contract | กระทบ client อื่น |
| Refactor ชื่อ function/class | กระทบทั้ง codebase |
| แก้ไขไฟล์ที่ไม่ได้ถูกขอ | side effect ที่ไม่ตั้งใจ |

---

## 5. Pattern สำหรับ AI Agent ต่างๆ

### Claude Code
```bash
# ใช้ view_range แทน cat
# ใน SKILL จะถูก map เป็น sed -n 'X,Yp'
# หลีกเลี่ยง: read_file ไฟล์ใหญ่โดยไม่ระบุ range
```

### Codex CLI (OpenAI)
```bash
# ส่ง context เฉพาะส่วนที่เกี่ยวข้อง
# ใช้ --files flag เฉพาะไฟล์ที่จำเป็น
# หลีกเลี่ยง: ส่ง directory ทั้งหมด
```

### Gemini CLI
```bash
# ใช้ @ prefix เฉพาะไฟล์ที่ต้องการ
# @file.py:100-150 (ถ้า supported)
# หลีกเลี่ยง: @entire_folder/
```

### Aider
```bash
# เพิ่มไฟล์เฉพาะที่ต้องแก้
aider src/specific_file.py

# ไม่ใช้
aider src/  # โหลดทุกไฟล์ใน folder
```

### Cursor / Copilot Chat
```bash
# ใช้ #file: เฉพาะไฟล์ที่เกี่ยวข้อง
# ใช้ selection แทนการ @ ทั้งไฟล์
```

---

## 6. Workflow ที่ถูกต้อง (Step by Step)

```
1. SCOPE    → grep/find เพื่อเข้าใจโครงสร้าง (ไม่อ่าน content)
2. LOCATE   → grep -n เพื่อหาบรรทัดที่เกี่ยวข้อง  
3. READ     → sed -n 'X,Yp' อ่านแค่ส่วนนั้น
4. CHECK    → ตรวจ syntax/lint ก่อนแก้
5. EDIT     → sed -i หรือ patch แบบ targeted
6. VERIFY   → ตรวจ syntax + run tests เฉพาะที่เกี่ยวข้อง
7. DIFF     → git diff เพื่อยืนยันการเปลี่ยนแปลง
```

> หากต้องอ่านไฟล์มากกว่า 3 ไฟล์เต็มๆ → หยุดและถาม human ก่อนว่าต้องการจริงๆ ไหม

---

## 7. ดูรายละเอียดเพิ่มเติม

| หัวข้อ | ไฟล์ |
|--------|------|
| คำสั่งขั้นสูงสำหรับแต่ละภาษา | `references/language-commands.md` |
| Token estimation guide | `references/token-estimation.md` |
| Anti-patterns รายละเอียด | `references/anti-patterns.md` |