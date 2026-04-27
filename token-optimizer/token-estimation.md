# Token Estimation Guide

## ประมาณ Token จากขนาดไฟล์

| ขนาดไฟล์ | ประมาณ Tokens | ควรทำอะไร |
|----------|--------------|-----------|
| < 50 บรรทัด | ~500 tokens | อ่านได้ทั้งหมด |
| 50-200 บรรทัด | 500-2,000 tokens | อ่านได้ แต่ระวัง |
| 200-500 บรรทัด | 2,000-5,000 tokens | ใช้ grep + sed แทน |
| > 500 บรรทัด | > 5,000 tokens | ห้ามอ่านทั้งไฟล์ |
| > 1,000 บรรทัด | > 10,000 tokens | อ่านเฉพาะ signature เท่านั้น |

## วิธีประมาณ Token ก่อนอ่าน

```bash
# ดูจำนวนบรรทัด
wc -l file.py

# ดูขนาดเป็น bytes (÷4 = ประมาณ tokens)
wc -c file.py

# ดูหลายไฟล์พร้อมกัน
wc -l src/*.py | sort -rn | head -10
```

## Context Window ของ AI แต่ละตัว (2025)

| Model | Context Window | ระวัง |
|-------|---------------|-------|
| Claude Sonnet 4 | 200K tokens | เหลือสำหรับ response ~8K |
| Claude Opus 4 | 200K tokens | ราคาสูงกว่า ประหยัดยิ่งสำคัญ |
| GPT-4o | 128K tokens | ระวัง cost สูง |
| Gemini 2.0 Flash | 1M tokens | context ใหญ่ แต่ cost ก็มี |
| Codex / o1 | 128K tokens | cost สูงมาก |

## สูตรประหยัด Token

```
Token ที่ประหยัดได้ = (บรรทัดทั้งหมด - บรรทัดที่อ่าน) × 10 tokens/บรรทัด

ตัวอย่าง:
- ไฟล์ 1,000 บรรทัด อ่านแค่ 50 บรรทัด
- ประหยัดได้ = (1000 - 50) × 10 = 9,500 tokens
- ≈ ลดค่าใช้จ่ายลง 95%
```

## Batch Reading Pattern (อ่านหลายจุดในคราวเดียว)

```bash
# แทนที่จะรัน grep หลายครั้ง รวมเป็นครั้งเดียว
grep -n "def \|class \|import \|return " file.py | head -50

# ดูหลายไฟล์พร้อมกันด้วย xargs
find src/ -name "*.py" | xargs grep -l "ClassName" 

# แสดงหลาย pattern พร้อมกัน
grep -En "^(def|class|import|from)" file.py
```