---
name: webapp-native-design
description: >
  ออกแบบและสร้าง Native Web Application ที่มีคุณภาพระดับ Production ด้วย UX/UI ที่ดูและรู้สึกเหมือน Native App บนทุกแพลตฟอร์ม
  ใช้ Skill นี้เมื่อผู้ใช้ต้องการ: ออกแบบ Web App ที่ดูเหมือน Mobile/Desktop Native App, สร้าง PWA (Progressive Web App),
  ออกแบบ UI Component ที่มี Native Feel, วางโครงสร้าง Navigation แบบ App-like, ทำ Gesture & Touch Interaction,
  สร้าง Offline-first App, ออกแบบ Bottom Navigation / Side Drawer / Tab Bar สไตล์ Native,
  หรือเมื่อพูดถึงคำเหล่านี้: "native app feel", "PWA", "app-like", "mobile web", "installable app", "web application", "webapp design"
---

# Native Web Application Design Skill

Skill นี้ช่วยออกแบบและพัฒนา Web Application ที่มี UX/UI ระดับ Native App — เร็ว, ลื่น, ใช้งานง่ายบนทุกอุปกรณ์

---

## 1. Design Philosophy: "Native First, Web Second"

ก่อนเขียนโค้ดหรือออกแบบใดๆ ให้ตั้งคำถาม 4 ข้อนี้:

| คำถาม | ทำไมถึงสำคัญ |
|---|---|
| **Platform** — iOS, Android, Desktop, หรือ Cross-platform? | กำหนด Pattern และ Gesture ที่ผู้ใช้คาดหวัง |
| **Context of Use** — ใช้นิ้วหรือ Mouse? มือเดียวหรือสองมือ? | กำหนดขนาด Touch Target และ Layout |
| **Core Task** — ผู้ใช้มาทำอะไร? | กำหนดลำดับ Priority ของ UI Element |
| **Performance Budget** — เครือข่ายและอุปกรณ์ที่ใช้? | กำหนดข้อจำกัดด้านน้ำหนักของ App |

---

## 2. Native Design Patterns ที่ต้องรู้จัก

### 2.1 Navigation Patterns

```
iOS Style          Android Style       Desktop Style
────────────       ─────────────       ─────────────
┌──────────┐       ┌──────────┐        ┌────┬───────┐
│ Nav Bar  │       │ Top Bar  │        │    │       │
├──────────┤       ├──────────┤        │Side│Content│
│          │       │          │        │bar │       │
│ Content  │       │ Content  │        │    │       │
│          │       │          │        └────┴───────┘
├──────────┤       ├──────────┤
│ Tab Bar  │       │Bottom Nav│
└──────────┘       └──────────┘
```

**เลือก Pattern ตาม Platform:**
- **iOS-like**: Tab Bar ล่าง + Navigation Stack, Swipe-back gesture
- **Android-like**: Bottom Navigation + FAB, Back button aware
- **Desktop-like**: Sidebar Navigation + Breadcrumb, Keyboard shortcut support

### 2.2 Gesture Interactions

| Gesture | ใช้สำหรับ | CSS/JS Implementation |
|---|---|---|
| Swipe Left/Right | Back/Forward, Delete item | `touch-action: pan-y`, Pointer Events |
| Pull-to-Refresh | โหลดข้อมูลใหม่ | Overscroll Detection |
| Pinch-to-Zoom | Map, Image | `touch-action: none`, Pointer Events |
| Long Press | Context Menu | `pointerdown` + Timer |
| Swipe Up (Sheet) | Bottom Sheet | Spring Animation |

### 2.3 Component Patterns แบบ Native

**Bottom Sheet**
```css
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0; right: 0;
  border-radius: 16px 16px 0 0;
  transition: transform 0.35s cubic-bezier(0.32, 0.72, 0, 1);
  /* cubic-bezier นี้เลียนแบบ spring ของ iOS */
}
```

**FAB (Floating Action Button)**
```css
.fab {
  position: fixed;
  bottom: calc(env(safe-area-inset-bottom) + 80px);
  right: 16px;
  width: 56px; height: 56px;
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.25);
}
```

---

## 3. Visual Design System สำหรับ Native Web App

### 3.1 Spacing Scale (8-point Grid)

```
4px  — micro spacing (icon padding)
8px  — tight spacing (tag gap)
12px — small spacing (list item padding)
16px — base spacing (card padding, margin)
24px — medium spacing (section gap)
32px — large spacing (screen padding desktop)
48px — xl spacing (hero section)
```

### 3.2 Typography ระบบ Native (Project Standard)

```css
/* Project Font: Bai Jamjuree */
:root {
  --font-primary: 'Bai Jamjuree', sans-serif;
  
  --text-large-title: 800 34px/41px var(--font-primary);
  --text-title-1:     700 28px/34px var(--font-primary);
  --text-title-2:     700 22px/28px var(--font-primary);
  --text-title-3:     600 20px/25px var(--font-primary);
  --text-headline:    600 17px/22px var(--font-primary);
  --text-body:        400 16px/24px var(--font-primary);
  --text-callout:     400 16px/21px var(--font-primary);
  --text-subheadline: 400 15px/20px var(--font-primary);
  --text-footnote:    400 13px/18px var(--font-primary);
  --text-caption:     400 12px/16px var(--font-primary);
}
```

### 3.3 Color Token System (Modern Academic Theme)

```css
:root {
  /* Blue System Tokens from THEME_ANALYSIS.md */
  --brand-50:  #F0F9FF;
  --brand-100: #E0F2FE;
  --brand-300: #7DD3FC;
  --brand-500: #0EA5E9;
  --brand-600: #0284C7;
  --brand-700: #0369A1;
  --brand-900: #0C4A6E;

  /* Semantic Mapping */
  --color-primary:        var(--brand-600);
  --color-primary-soft:   var(--brand-50);
  --color-destructive:    #F43F5E; /* Rose 500 */
  --color-success:        #10B981; /* Emerald 500 */
  --color-warning:        #F59E0B; /* Amber 500 */

  /* Surface */
  --surface-background:   #F7FBFF; /* Page background */
  --surface-card:         #FFFFFF;
  --surface-secondary:    var(--brand-50);
  
  /* Text */
  --text-strong:          #1E293B; /* Slate 800 */
  --text-default:         #334155; /* Slate 700 */
  --text-muted:           #64748B; /* Slate 500 */
}

/* Dark Mode (High Contrast Academic) */
@media (prefers-color-scheme: dark) {
  :root {
    --surface-background:  #020617; /* Slate 950 */
    --surface-card:        #0F172A; /* Slate 900 */
    --text-strong:         #F8FAFC;
    --text-default:        #E2E8F0;
    --text-muted:          #94A3B8;
  }
}
```

---

## 4. Performance — Native Feel ต้องเร็ว

### 4.1 60fps Animation Rules

```css
/* ✅ ใช้ properties เหล่านี้เท่านั้นสำหรับ animation */
transform: translateX() translateY() scale() rotate();
opacity: 0 → 1;
filter: blur();

/* ❌ หลีกเลี่ยง — ทำให้ reflow/repaint */
width, height, top, left, margin, padding
```

### 4.2 Scroll Performance

```css
/* บังคับ GPU Compositing */
.scroll-container {
  -webkit-overflow-scrolling: touch; /* iOS momentum scroll */
  overflow-y: scroll;
  overscroll-behavior: contain;      /* ป้องกัน scroll chain */
  scroll-snap-type: y mandatory;     /* Snap scrolling */
}

/* Virtual List สำหรับ List ยาวๆ */
/* ใช้ content-visibility เพื่อ skip render นอก viewport */
.list-item {
  content-visibility: auto;
  contain-intrinsic-size: 0 80px;
}
```

### 4.3 PWA Setup (ถ้าต้องการ Install ได้)

```json
// manifest.json
{
  "name": "App Name",
  "short_name": "App",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#007AFF",
  "background_color": "#ffffff",
  "start_url": "/",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

---

## 5. Responsive Layout Strategy

### 5.1 Breakpoint System (Project Standard)

```css
/* Mobile First Breakpoints from RESPONSIVE_2026.md */
/* sm: 640px+  — Large Phone */
/* md: 768px+  — Tablet */
/* lg: 1024px+ — Small Laptop / Desktop Nav */
/* xl: 1280px+ — Desktop */
/* 2xl: 1536px+ — Wide Desktop */

:root {
  --app-max-width: 100%;
}

/* Modern Viewport Units */
.full-screen-section {
  min-height: 100dvh; /* Dynamic Viewport Height */
  min-height: 100vh;  /* Fallback */
}
```

### 5.2 Adaptive Layout Pattern

```
Phone                Tablet                Desktop
──────────────       ────────────────       ──────────────────────
[Single Column]      [Master + Detail]      [Sidebar + Main + Panel]
┌──────────┐         ┌─────┬──────────┐     ┌────┬──────────┬─────┐
│  List    │         │List │  Detail  │     │Nav │  Content │Info │
│  View    │         │     │          │     │    │          │     │
└──────────┘         └─────┴──────────┘     └────┴──────────┴─────┘
```

---

## 6. Safe Area & Device-specific Handling

```css
/* รองรับ notch, dynamic island, home indicator */
:root {
  --safe-top:    env(safe-area-inset-top);
  --safe-bottom: env(safe-area-inset-bottom);
  --safe-left:   env(safe-area-inset-left);
  --safe-right:  env(safe-area-inset-right);
}

.header {
  padding-top: calc(16px + var(--safe-top));
}

.bottom-nav {
  padding-bottom: calc(8px + var(--safe-bottom));
}

/* HTML meta สำหรับ Full-screen */
/* <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"> */
```

---

## 7. Interaction & Feedback Patterns

### 7.1 Touch Feedback

```css
/* Tap Highlight แบบ Native */
.pressable {
  -webkit-tap-highlight-color: transparent;
  cursor: pointer;
  user-select: none;
}

.pressable:active {
  transform: scale(0.96);
  opacity: 0.7;
  transition: transform 0.1s ease, opacity 0.1s ease;
}
```

### 7.2 Loading States

```
Skeleton Loading (ดีกว่า Spinner สำหรับ Content)
┌────────────────────────────────┐
│ ░░░░░░░░░░░  ░░░░░░░░          │  ← shimmer animation
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░   │
│ ░░░░░░░░░░░░░░░                │
└────────────────────────────────┘
```

```css
@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position:  200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--surface-secondary) 25%,
    var(--surface-tertiary)   50%,
    var(--surface-secondary) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 8px;
}
```

### 7.3 Micro-interactions ที่สำคัญ

| Action | Feedback | Duration |
|---|---|---|
| Button Tap | Scale down 0.96 + opacity | 100ms |
| Toggle Switch | Spring slide | 300ms cubic-bezier(0.32,0.72,0,1) |
| Pull to Refresh | Elastic overscroll + spin | ตาม pull distance |
| Page Transition | Slide + fade | 350ms ease |
| Error Shake | Horizontal shake | 400ms |
| Success | Scale up 1.05 → 1.0 + green | 300ms |

---

## 8. Accessibility (a11y) — Native App มาตรฐาน

```html
<!-- Touch Target ขั้นต่ำ 44×44px (iOS) / 48×48px (Android) -->
<button style="min-width:44px; min-height:44px; padding:12px;">
  <svg aria-hidden="true">...</svg>
  <span class="visually-hidden">ปิด</span>
</button>

<!-- Focus Ring สำหรับ Keyboard Navigation -->
<style>
  :focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: 4px;
  }
</style>

<!-- Reduced Motion -->
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 9. Framework-specific Guidance

### React / Next.js
- ใช้ **Framer Motion** สำหรับ Animation ที่ซับซ้อน (spring physics)
- ใช้ **React Query / SWR** สำหรับ Data Fetching + Cache (offline feel)
- ใช้ **Zustand / Jotai** สำหรับ State ที่ง่าย
- Page Transition ด้วย `AnimatePresence`

### Vue / Nuxt
- ใช้ `<Transition>` + `<TransitionGroup>` built-in
- ใช้ **VueUse** สำหรับ Gesture, IntersectionObserver
- Pinia สำหรับ Store

### Vanilla / HTML
- ใช้ **View Transitions API** (Chrome 111+) สำหรับ Page transition
- Web Animations API แทน CSS animation เมื่อต้องการ control
- IntersectionObserver สำหรับ Lazy load + Scroll effects

---

## 10. Checklist ก่อน Deliver

### UX Checklist
- [ ] Touch Target ≥ 44×44px ทุกจุด
- [ ] มี Loading State / Skeleton
- [ ] มี Empty State ที่ชัดเจน
- [ ] มี Error State + Recovery action
- [ ] Swipe Back / Navigation ทำงานถูกต้อง
- [ ] Dark Mode รองรับ (หรือตั้งใจไม่รองรับพร้อมเหตุผล)
- [ ] Safe Area เว้นไว้ถูกต้อง

### Performance Checklist
- [ ] Animation ใช้เฉพาะ transform + opacity
- [ ] Images lazy loaded + ขนาดเหมาะสม
- [ ] ไม่มี Layout Shift (CLS)
- [ ] First Contentful Paint < 2s บน 4G
- [ ] Scroll 60fps บน mid-range device

### Code Checklist
- [ ] CSS Custom Properties ใช้ token ไม่ใช่ hardcode
- [ ] Responsive ทำงานทุก breakpoint
- [ ] `prefers-reduced-motion` รองรับ
- [ ] Semantic HTML + ARIA label ครบ
- [ ] `viewport-fit=cover` สำหรับ full-screen app

---

## 11. ตัวอย่าง Output ที่ดี

เมื่อผู้ใช้ขอออกแบบ Native Web App ให้ produce:
1. **Layout Structure** — HTML semantic ที่ถูกต้อง
2. **Design Token CSS** — color, spacing, typography เป็น variable
3. **Navigation Component** — Tab bar / Sidebar ตาม platform
4. **Core Screen** — หน้าหลักที่ผู้ใช้ต้องการ พร้อม animation
5. **Interaction Layer** — touch feedback, transition, gesture

**ห้าม** ทำ:
- Layout ที่ไม่ responsive
- Animation ที่ใช้ `width`/`height` (jank)
- Touch target เล็กกว่า 44px
- ไม่มี loading/empty/error state
- Hardcode สีโดยไม่ใช้ token

---

*Skill Version: 1.0 | แนวทางอ้างอิง: Apple HIG, Material Design 3, Web.dev PWA Guidelines*
