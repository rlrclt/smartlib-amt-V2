# THEME ANALYSIS: ANT Library Web Theme

เอกสารนี้เป็น Source of Truth สำหรับธีมของโปรเจกต์ โดยวิเคราะห์จากโค้ดจริงใน `public/index.html` และแปลงเป็นกติกาเชิงระบบเพื่อให้ทีมออกแบบ/พัฒนาใช้ร่วมกันโดยไม่ต้องตีความซ้ำ

## 1) Theme Intent และ Brand Direction

### เป้าหมายทางภาพลักษณ์
- ให้ภาพรวมเป็น Modern Academic: สะอาด น่าเชื่อถือ อ่อนโยน แต่ยังมีพลังของผลิตภัณฑ์ดิจิทัล
- ทำให้ผู้ใช้รู้สึกว่าระบบ "ใช้ง่าย รวดเร็ว สุภาพ" ไม่ aggressive
- รักษาอารมณ์ "ห้องสมุดยุคใหม่" ด้วยการบาลานซ์ระหว่างความเป็นองค์กรและความเป็นมิตร

### บุคลิกธีม (Theme Personality)
- Primary mood: Calm, trustworthy, airy
- Interaction mood: Responsive, light, encouraging
- Visual style: Soft blue gradients + glassy highlights + rounded geometry

### สิ่งที่ต้องคงไว้
- Accent หลักต้องอยู่ในโทนฟ้า/น้ำเงินอ่อนถึงกลาง
- รูปทรงโค้งมน (rounded-xl ถึง rounded-[3rem]) เป็นภาษาภาพหลัก
- มี motion เฉพาะจุดเพื่อเพิ่มชีวิตชีวา แต่ไม่รบกวนการอ่าน

### สิ่งที่ห้ามหลุด
- ห้ามเพิ่ม accent สีใหม่ที่แย่งความสนใจจากโทนฟ้าหลัก
- ห้ามใช้เงาเข้มจัด/contrast จัดจนดูเป็นสาย gaming
- ห้ามเปลี่ยน typography ไปใช้ฟอนต์ที่มีบุคลิกขัดกับระบบ (เช่น display font หวือหวา)

## 2) Design Token Audit (Derived from Current Code)

### Base Surface
- Page background: `#F7FBFF`
- Surface card: `#FFFFFF`
- Neutral text: `slate-800`, `slate-600`, `slate-500`, `slate-400`

### Primary Accent (Blue System)
- Primary gradient endpoints: `sky-500` -> `blue-500`
- Primary text/link accent: `sky-700`, `sky-800`, `sky-900`
- Primary soft background: `sky-50`, `sky-100`
- Primary border: `sky-100`, hover `sky-300`
- Primary highlight/ring-like glow: rgba around `59,130,246` and `147,197,253`

### Atmospheric Effects
- Grid overlay uses very low-alpha blue (`rgba(59,130,246,0.03)`)
- Blur blobs in hero/ticker/stats sections use `sky-200/300` and `blue-200/300` with low opacity
- Stats section uses deep blue-to-slate background (`from-blue-950 to-slate-900`)

### Token Recommendation (for future extraction)
- `--brand-50: #F0F9FF`
- `--brand-100: #E0F2FE`
- `--brand-300: #7DD3FC`
- `--brand-500: #0EA5E9`
- `--brand-600: #0284C7`
- `--brand-700: #0369A1`
- `--brand-900: #0C4A6E`
- `--surface: #FFFFFF`
- `--surface-soft: #F7FBFF`
- `--text-strong: #1E293B`
- `--text-default: #334155`
- `--text-muted: #64748B`

## 3) Typography System

### Font Family
- Primary typeface: `Bai Jamjuree`
- Current import: Google Fonts in `<style>` at top of `index.html`

### Typographic Roles
- Brand and Hero headlines: heavy (`font-extrabold` to `font-black`)
- Navigation/action labels: `font-bold`
- Body and helper text: `font-medium` or default
- Numeric impact values (stats): `font-black`

### Readability Notes
- ภาษาไทยอ่านง่ายในขนาด body ปัจจุบัน
- หัวข้อหลักใช้ tracking แน่นและน้ำหนักสูง เหมาะกับ landing style
- ควรรักษา line-height ปัจจุบันในส่วน paragraph ยาวเพื่อไม่ให้แน่นเกินไป

## 4) Layout Blueprint (Section by Section)

### Global Shell
- `landing-root` เป็น layout หลักของหน้า landing
- nav แบบ fixed top + content flow ลงเป็น section ตามลำดับ
- outlet ของ SPA อยู่นอก landing สำหรับ route อื่น

### Navbar
- โครงแนวนอน: logo + nav links + CTA
- Mobile ใช้ collapsible panel ที่คุมด้วยปุ่ม hamburger
- สีเน้น actionable item ผ่าน blue accent ไม่ใช้สีตัดรุนแรง

### Hero
- มี 2 คอลัมน์: เนื้อหาการขาย + mockup ภาพการใช้งาน
- ใช้ soft decorative backgrounds (grid + blur circles)
- ปุ่มหลักใช้ gradient และปุ่มรองใช้ outlined style

### Ticker Section
- พื้นหลัง gradient บาง + glow อ่อน
- canvas ticker แสดง social proof และเพิ่ม motion เบา
- mask-edges ช่วยให้การเลื่อนข้อความดูนุ่ม

### Features Section
- Card 3 ใบ โครงเหมือนกันเพื่อ consistency
- ต่างกันที่ icon/emphasis แต่คงระบบ border/shadow เดียวกัน

### Stats Section
- ใช้ dark band เพื่อสร้าง contrast และหยุดสายตา
- ตัวเลขขนาดใหญ่เป็นจุดดึง attention
- สีตัวเลขอยู่ในกลุ่ม sky-200 เพื่อ contrast บนพื้นเข้ม

### CTA + Footer
- CTA ซ้ำ action หลักอย่างชัดเจนก่อนจบหน้า
- Footer คง visual language เดียวกับ navbar (logo container + accent links)

## 5) Component Style Contract

### Primary CTA Button
- Visual: gradient `sky-500 -> blue-500`
- Text: white, bold
- Shape: rounded-full
- Elevation: soft blue shadow
- Motion: shimmer/pulse on hover/focus

### Secondary Button
- Visual: white fill + sky border
- Text: sky-800/900
- Hover: sky-50 background + stronger border

### Link Behavior
- Default: neutral gray text
- Hover/focus: shift to sky-800
- ต้องมี transition สีเพื่อรู้สึก smooth

### Cards
- White background + soft border (`sky-50/100`) + low blur shadow
- Border radius สูง (2xl ขึ้นไป)
- Icon container มี tint อ่อนของ accent

### Logo Container
- ขาว + border ฟ้าอ่อน + subtle shadow
- ใช้ไฟล์โลโก้จริง (`/favicon.svg`) แทน icon placeholder

## 6) Motion และ Interaction Language

### Motion Principles
- ใช้ motion เพื่อบอกสถานะและสร้างชีวิตชีวา ไม่ใช่เพื่อโชว์ effect
- เคลื่อนไหวช้าและโค้ง (`ease-in-out`) เพื่อคงความสุภาพ

### Keyframes in Use
- Floating family: `float`, `float-delayed`, `cuteFloat`
- Ambient family: `driftSlow`, `driftReverse`, `shimmerPulse`, `petalFloat`, `cuteTwinkle`
- CTA feedback: `soft-pulse`

### Interaction Behaviors
- Hover scale เล็กน้อยกับ interactive highlights
- Shimmer บนปุ่มหลักเพื่อย้ำ action
- Transition time ประมาณ 300ms สำหรับองค์ประกอบทั่วไป

### Performance Notes
- หลาย blur + animation ซ้อนกันอาจเพิ่มภาระ GPU บนอุปกรณ์ต่ำ
- Canvas ticker มี loop ต่อเนื่อง ควรระวังงาน render เสริมในหน้าเดียวกัน

## 7) Accessibility และ Quality Guardrails

### Contrast
- กลุ่มฟ้าอ่อนบนพื้นขาวใช้ได้สำหรับ decorative/secondary เท่านั้น
- ข้อความสำคัญควรอยู่ที่ sky-700 ขึ้นไปหรือ slate-700 ขึ้นไป
- บนพื้นเข้ม (stats section) ให้ใช้ sky-200 + slate-200/70 ตามปัจจุบัน

### Motion Reduction
- หากเพิ่มขั้น production ควรมี fallback สำหรับ `prefers-reduced-motion`
- ปิดหรือเบา animation loop ที่ไม่จำเป็นในโหมด reduced motion

### Focus/Keyboard
- ปุ่มและลิงก์ต้องคง focus style ที่เห็นชัดบนทุกพื้นหลัง
- สี focus ไม่ควรจมหายไปกับ glow/decorative layers

## 8) Theming Rules for Future Pages

### Route Groups
- Public marketing routes (`/`, `/about`, `/privacy`, `/terms`, `/help`) ใช้ visual language เดียวกับ landing
- App routes (`/auth`, `/app/*`, `/manage/*`) ให้ย่อความ decorative ลง แต่คง token สีเดิม

### Member Type Alignment
- กลุ่ม `manage` (admin, librarian): ใช้ blue palette เข้มขึ้นเล็กน้อยสำหรับ data-dense screens
- กลุ่ม `member` (student, teacher, other): ใช้ palette เดิมแบบ airy มากกว่าเพื่ออ่านง่าย
- ห้ามแยก member type ด้วย accent คนละสีหลัก เพราะจะทำให้แบรนด์แตก

### Layout Rules
- Header/nav/footer ควรใช้ component เดียวกันหรือ derivative ที่แชร์ token
- Card/action patterns ควร reuse utility classes เดิมเพื่อ consistency

## 9) Do / Don't

### Do
- ใช้ `sky`/`blue` เป็น accent หลักทุกหน้า
- ใช้ gradient แบบ 2-stop ชัดเจนสำหรับ primary CTA เท่านั้น
- คุม shadow ให้นุ่มและ low-alpha
- รักษา spacing และ rounded scale ให้สม่ำเสมอ

### Don't
- อย่าใส่สี accent ใหม่ที่มี saturation สูง (เช่นแดงสด/เขียวสด) เป็น primary action
- อย่าใช้หลาย gradient หลักในหน้าเดียว
- อย่าเพิ่ม animation พร้อมกันหลายชั้นในคอมโพเนนต์ข้อมูลสำคัญ
- อย่าผสม font family เพิ่มโดยไม่มีเหตุผลด้าน hierarchy

## 10) Refactor Recommendations (Next Step, Not Applied Yet)

- แยก design tokens ออกจาก `index.html` ไปไฟล์กลาง เช่น `public/app/theme/tokens.css`
- แยก motion presets ไป `public/app/theme/motion.css`
- ตั้ง naming convention สำหรับ semantic utility classes (`.brand-primary`, `.surface-card`, `.text-accent`)
- สร้าง Theme QA checklist สำหรับ PR review:
  - ใช้ accent ถูกชุดหรือไม่
  - contrast ผ่านขั้นต่ำหรือไม่
  - interaction state ครบ hover/focus/active หรือไม่
  - motion เกินความจำเป็นหรือไม่

## 11) Acceptance Criteria for This Theme Document

- เอกสารนี้เพียงไฟล์เดียวทำให้ทีมเข้าใจธีมปัจจุบันครบทั้งสี ฟอนต์ layout component motion
- นักพัฒนาสามารถสร้างหน้าใหม่โดยไม่เดา palette/hierarchy เอง
- Designer สามารถใช้เป็น baseline ในการออกแบบ screen ใหม่โดยไม่แตกจากแบรนด์
- Reviewer สามารถใช้หัวข้อ Do/Don't และ Guardrails เป็นเกณฑ์ตรวจงาน
