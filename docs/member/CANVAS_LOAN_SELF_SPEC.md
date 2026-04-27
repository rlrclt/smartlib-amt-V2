# Canvas Specification: Self-Service Loan/Return View (`loan_self.view.js`)

เอกสารนี้ใช้สำหรับเป็นคู่มือ (Prompt/Spec) ให้กับ AI (เช่น v0, Cursor, Canvas) เพื่อสร้างหรือปรับปรุงหน้าจอการยืม-คืนด้วยตนเองสำหรับสมาชิก โดยอ้างอิงจากสถาปัตยกรรม **smartlib-amt-V2**

---

## 1. เป้าหมายการออกแบบ (UI/UX Goals)
- **Native-Like Experience**: ใช้ `100dvh`, Bottom Sheets, และ Backdrop Blurs เพื่อให้รู้สึกเหมือนแอป iOS/Android
- **Visual Feedback**: การตอบสนองที่ชัดเจนเมื่ออยู่ใน/นอกพื้นที่ (Geofencing) และเมื่อสแกนสำเร็จ
- **Efficiency**: ลดจำนวนการกดให้น้อยที่สุด (Minimal Clicks) ด้วยระบบสแกนต่อเนื่อง (Scan to Cart)

---

## 2. โครงสร้างสถานะ (State Management)
```javascript
const STATE = {
  mode: 'borrow',        // 'borrow' (ยืม) | 'return' (คืน)
  geofence: { 
    allowed: false,      // ผ่านเงื่อนไขพิกัดหรือไม่
    distance: 0,         // ระยะห่างจากจุดที่ใกล้ที่สุด
    accuracy: 0,         // ความแม่นยำ GPS (ต้อง < 20m)
    status: 'checking'   // 'checking' | 'ready' | 'error'
  },
  cart: [],              // รายการหนังสือ { barcode, title, coverUrl }
  isScannerOpen: false,  // สถานะเปิด/ปิด Popup กล้อง
  isSubmitting: false    // ป้องกันการกดยืนยันซ้ำ
};
```

---

## 3. ส่วนประกอบหน้าจอหลัก (Component Architecture)

### 3.1 Geofencing Banner (Sticky Top)
- **Design**: แถบสีพื้นหลังเปลี่ยนตามสถานะ (`emerald-50` เมื่อผ่าน, `rose-50` เมื่อไม่ผ่าน)
- **Logic**: แสดงไอคอนพิกัดและระยะห่างแบบ Real-time พร้อมปุ่ม "ดูแผนที่" เพื่อเปิด Map Popup

### 3.2 Mode Switcher (Tab System)
- **Design**: ปุ่มกด 2 ฝั่ง (ยืม/คืน) ที่มีพื้นหลังเคลื่อนที่ได้ (Slide Animation)
- **Colors**: สี Emerald สำหรับการยืม (ความหวัง/งอกเงย), สี Sky สำหรับการคืน (ความเรียบร้อย/สงบ)

### 3.3 Cart & List Area (Scrollable Center)
- **Design**: การ์ดหนังสือแบบแนวนอน (Horizontal Card)
- **Details**: รูปหน้าปก (Ratio 3:4), ชื่อเรื่อง (Truncate), บาร์โค้ด, และปุ่มลบ (Trash icon)
- **Empty State**: แสดงภาพประกอบจางๆ และข้อความ "ตะกร้ายังว่าง" เมื่อยังไม่ได้สแกน

### 3.4 Action Footer (Sticky Bottom)
- **Structure**: 2 คอลัมน์ (ปุ่มสแกนขนาด 1 ส่วน / ปุ่มยืนยันขนาด 2 ส่วน)
- **Safe Area**: เว้นระยะขอบล่าง (pb-safe) สำหรับมือถือรุ่นใหม่

---

## 4. โครงสร้างโมดูลกล้อง (Popup Scanner Component)
- **Overlay**: `fixed inset-0` สีดำโปร่งแสงพร้อม Blur
- **Viewfinder**: กรอบสี่เหลี่ยมตรงกลางพร้อมเส้น Laser สีแดงแอนิเมชัน
- **Live Feedback**: 
    - **Haptic**: สั่นสั้นๆ เมื่อสแกนติด
    - **Cart Badge**: วงกลมตัวเลขที่มุมกล้อง แสดงจำนวนเล่มที่สแกนแล้ว
    - **Flash Animation**: แฟลชสีขาวแวบหนึ่งเมื่อสแกนสำเร็จ

---

## 5. ตัวอย่างโค้ด UI (Tailwind CSS)

```html
<!-- Example: Main Wrapper -->
<div class="flex flex-col h-[100dvh] bg-slate-50 font-['Bai_Jamjuree']">
  
  <!-- 📍 Geofence Banner -->
  <div class="bg-emerald-50 border-b border-emerald-100 p-4 animate-in fade-in slide-in-from-top duration-500">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <div class="bg-emerald-500 p-1.5 rounded-full shadow-lg shadow-emerald-200">
          <i data-lucide="map-pin" class="w-4 h-4 text-white"></i>
        </div>
        <div>
          <p class="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Location Verified</p>
          <p class="text-xs font-black text-emerald-800">จุดบริการ: ห้องสมุดอาคาร A</p>
        </div>
      </div>
      <button class="bg-white/50 px-3 py-1.5 rounded-xl text-[10px] font-black text-emerald-700 border border-emerald-200">ดูแผนที่</button>
    </div>
  </div>

  <!-- 📦 Cart Content -->
  <div class="flex-1 overflow-y-auto px-4 pt-6 pb-20">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-black text-slate-800">รายการในตะกร้า <span class="text-slate-400 font-medium">(2)</span></h2>
      <button class="text-xs font-black text-rose-500">ล้างทั้งหมด</button>
    </div>
    
    <!-- Cart Item Card -->
    <div class="group relative bg-white p-3 rounded-2xl border border-slate-100 shadow-sm mb-3 active:scale-95 transition-all">
      <div class="flex gap-4">
        <div class="w-14 h-20 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 shadow-inner">
          <img src="https://via.placeholder.com/150x200" class="w-full h-full object-cover" />
        </div>
        <div class="flex-1 min-w-0 py-1">
          <p class="text-xs font-black text-slate-800 leading-tight mb-1 truncate">ชื่อหนังสือที่ยาวมากๆ จนต้องตัดบรรทัดใหม่</p>
          <p class="text-[10px] font-semibold text-slate-400 mb-2">BK-10293-02</p>
          <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-50 text-[9px] font-black text-emerald-600 uppercase">กำหนดคืน: 12 มิ.ย. 68</span>
        </div>
      </div>
    </div>
  </div>

  <!-- 🚀 Bottom Actions -->
  <div class="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-xl border-t border-slate-100 pb-safe">
    <div class="flex gap-3 max-w-xl mx-auto">
      <button class="flex flex-col items-center justify-center w-20 h-14 bg-slate-100 rounded-2xl text-slate-600 active:bg-slate-200 transition-colors">
        <i data-lucide="scan" class="w-5 h-5 mb-0.5"></i>
        <span class="text-[9px] font-black">สแกนเพิ่ม</span>
      </button>
      <button class="flex-1 bg-slate-900 rounded-2xl font-black text-white text-sm shadow-xl shadow-slate-200 active:scale-[0.98] transition-all">
        ยืนยันการยืมทั้งหมด (2 เล่ม)
      </button>
    </div>
  </div>
</div>
```

---

## 6. ข้อควรระวังด้านเทคนิค (Technical Guardrails)
- **GPS Noise**: ต้องมีการตรวจสอบ `accuracy` ทุกครั้งก่อนกดยืนยัน (ห้ามใช้ค่าจากหน้าจอตอนเริ่มต้นอย่างเดียว)
- **Script Lock**: การยืนยันแบบ Batch ต้องรอ Response จาก Backend ครบทุกเล่มก่อนแสดงหน้า Success
- **Images**: รูปหน้าปกหนังสือในตะกร้าควรมีการทำ Lazy Loading หรือแสดง Placeholder หากโหลดช้า
- **Haptic**: ใช้ `window.navigator.vibrate([50])` เมื่อสแกนติด เพื่อความรู้สึกพรีเมียม


canvas

<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>ยืม-คืนหนังสือด้วยตัวเอง | ANT Library</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <link href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@300;400;500;600;700&family=Noto+Sans+Thai:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        :root {
            --in-zone-bg: #f0fdf4;
            --in-zone-text: #166534;
            --out-zone-bg: #fff1f2;
            --out-zone-text: #9f1239;
            --primary: #0f172a;
            --accent: #a855f7;
        }

        body {
            font-family: 'Bai Jamjuree', 'Noto Sans Thai', sans-serif;
            background-color: #FAF5FF;
            overscroll-behavior-y: contain;
        }

        .step-panel {
            animation: slideInRight 0.35s cubic-bezier(0.32, 0.72, 0, 1) both;
        }

        @keyframes slideInRight {
            from { transform: translateX(30px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        @keyframes slideInLeft {
            from { transform: translateX(-30px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        .animate-slide-left { animation: slideInLeft 0.35s cubic-bezier(0.32, 0.72, 0, 1) both; }

        .safe-pb { padding-bottom: env(safe-area-inset-bottom); }
        
        /* สไตล์พิเศษตาม DNA: ANT Library */
        .glass-card {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(168, 85, 247, 0.1);
        }

        .shimmer {
            background: linear-gradient(90deg, #f1f5f9 25%, #f8fafc 50%, #f1f5f9 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
        }

        @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }

        /* Hide scrollbar but keep functionality */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    </style>
</head>
<body class="h-[100dvh] flex flex-col overflow-hidden text-slate-800">

    <!-- 🔢 Step Progress Bar -->
    <header class="h-14 bg-white border-b border-slate-100 flex items-center px-4 shrink-0 z-50">
        <div class="flex items-center justify-between w-full max-w-md mx-auto">
            <!-- Step 1 -->
            <div class="flex flex-col items-center gap-1">
                <div id="step-1-circle" class="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500 bg-sky-600 text-white">1</div>
                <span id="step-1-label" class="text-[10px] font-black text-sky-700">ตรวจพิกัด</span>
            </div>
            
            <div id="line-1" class="flex-1 h-[2px] mx-2 bg-slate-100 relative overflow-hidden">
                <div id="line-1-fill" class="absolute inset-0 bg-emerald-400 translate-x-[-100%] transition-transform duration-700"></div>
            </div>

            <!-- Step 2 -->
            <div class="flex flex-col items-center gap-1">
                <div id="step-2-circle" class="w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400 transition-all duration-500 bg-white">2</div>
                <span id="step-2-label" class="text-[10px] font-bold text-slate-400">เลือกโหมด</span>
            </div>

            <div id="line-2" class="flex-1 h-[2px] mx-2 bg-slate-100 relative overflow-hidden">
                <div id="line-2-fill" class="absolute inset-0 bg-emerald-400 translate-x-[-100%] transition-transform duration-700"></div>
            </div>

            <!-- Step 3 -->
            <div class="flex flex-col items-center gap-1">
                <div id="step-3-circle" class="w-6 h-6 rounded-full border-2 border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-400 transition-all duration-500 bg-white">3</div>
                <span id="step-3-label" class="text-[10px] font-bold text-slate-400">สแกน</span>
            </div>
        </div>
    </header>

    <!-- 📱 Active Step Panel -->
    <main id="app-content" class="flex-1 overflow-y-auto no-scrollbar relative p-4 flex flex-col">
        <!-- Step 1: ตรวจพิกัด (Initial Content) -->
        <div id="step-panel-container" class="flex-1 flex flex-col justify-center items-center step-panel">
            <div class="w-10 h-10 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin mb-4"></div>
            <h2 class="text-lg font-black text-slate-800">กำลังตรวจสอบตำแหน่ง...</h2>
            <p class="text-sm text-slate-500 mt-1">โปรดอนุญาตการเข้าถึง GPS</p>
        </div>
    </main>

    <!-- 📥 Bottom Action Bar -->
    <footer id="bottom-bar" class="h-20 shrink-0 bg-white border-t border-slate-100 px-6 flex items-center gap-4 safe-pb hidden">
        <!-- Content will be injected dynamically -->
    </footer>

    <script>
        const STATE = {
            step: 1,
            mode: null, // 'borrow' | 'return'
            geofence: {
                status: 'checking', 
                distance: 0,
            },
            cart: [],
            isSubmitting: false,
            retryCountdown: 5
        };

        // --- View Engine ---
        function render() {
            const container = document.getElementById('app-content');
            const bottomBar = document.getElementById('bottom-bar');
            
            updateProgress();

            if (STATE.step === 1) {
                renderStep1(container, bottomBar);
            } else if (STATE.step === 2) {
                renderStep2(container, bottomBar);
            } else if (STATE.step === 3) {
                renderStep3(container, bottomBar);
            }
            
            lucide.createIcons();
        }

        function updateProgress() {
            const s1 = document.getElementById('step-1-circle');
            const s1L = document.getElementById('step-1-label');
            const s2 = document.getElementById('step-2-circle');
            const s2L = document.getElementById('step-2-label');
            const s3 = document.getElementById('step-3-circle');
            const s3L = document.getElementById('step-3-label');
            
            const l1 = document.getElementById('line-1-fill');
            const l2 = document.getElementById('line-2-fill');

            // Reset
            [s1, s2, s3].forEach(el => el.className = "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-500 border-2");
            [s1L, s2L, s3L].forEach(el => el.className = "text-[10px] font-bold text-slate-400");

            if (STATE.step >= 1) {
                s1.classList.add('bg-emerald-500', 'border-emerald-500', 'text-white');
                s1L.classList.add('text-emerald-600', 'font-black');
            }
            if (STATE.step >= 2) {
                l1.style.transform = 'translateX(0)';
                s2.classList.add(STATE.step === 2 ? 'bg-sky-600' : 'bg-emerald-500', 'border-current', 'text-white');
                s2L.classList.add(STATE.step === 2 ? 'text-sky-700' : 'text-emerald-600', 'font-black');
            } else {
                l1.style.transform = 'translateX(-100%)';
                s2.classList.add('border-slate-200', 'text-slate-400', 'bg-white');
            }
            if (STATE.step >= 3) {
                l2.style.transform = 'translateX(0)';
                s3.classList.add('bg-sky-600', 'border-sky-600', 'text-white');
                s3L.classList.add('text-sky-700', 'font-black');
            } else {
                l2.style.transform = 'translateX(-100%)';
                s3.classList.add('border-slate-200', 'text-slate-400', 'bg-white');
            }
        }

        // --- Step 1: GPS Logic ---
        function renderStep1(container, bottomBar) {
            bottomBar.classList.add('hidden');
            
            let content = '';
            if (STATE.geofence.status === 'checking') {
                content = `
                    <div class="flex-1 flex flex-col justify-center items-center step-panel text-center">
                        <div class="w-12 h-12 border-4 border-purple-100 border-t-purple-500 rounded-full animate-spin mb-6"></div>
                        <h2 class="text-xl font-black text-slate-800">กำลังยืนยันพิกัด...</h2>
                        <p class="text-slate-500 mt-2 px-8">ระบบกำลังตรวจสอบว่าคุณอยู่ที่ห้องสมุดหรือไม่ เพื่อความปลอดภัยในการทำรายการ</p>
                    </div>`;
            } else if (STATE.geofence.status === 'in') {
                content = `
                    <div class="w-full step-panel h-full flex flex-col">
                        <div class="bg-emerald-50 border-b border-emerald-100 p-4 mb-6 flex items-center gap-3">
                            <div class="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white shrink-0">
                                <i data-lucide="check-circle-2"></i>
                            </div>
                            <div>
                                <h3 class="font-black text-emerald-800">คุณอยู่ในพื้นที่บริการ</h3>
                                <p class="text-xs text-emerald-600 font-bold">ห้องสมุดอาคาร A • ระยะห่าง 8 ม.</p>
                            </div>
                        </div>
                        
                        <div class="flex-1 px-4 flex flex-col items-center justify-center text-center">
                            <div class="relative w-full aspect-square max-w-[240px] bg-sky-50 rounded-3xl border-2 border-sky-100 mb-8 flex items-center justify-center overflow-hidden">
                                <div class="absolute inset-0 bg-grid opacity-20"></div>
                                <!-- User Dot -->
                                <div class="absolute w-4 h-4 bg-sky-500 rounded-full border-4 border-white shadow-lg animate-pulse" style="top: 55%; left: 45%;"></div>
                                <!-- Target Dot -->
                                <div class="absolute w-6 h-6 bg-emerald-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center text-white" style="top: 45%; left: 55%;">
                                    <i data-lucide="library" class="w-2.5 h-2.5"></i>
                                </div>
                                <p class="absolute bottom-4 text-[10px] font-bold text-sky-400 uppercase tracking-widest">Digital Geofence Active</p>
                            </div>
                            <h2 class="text-xl font-black text-slate-800">เตรียมพร้อมทำรายการ</h2>
                            <p class="text-slate-500 mt-2">กรุณารอสักครู่ ระบบกำลังนำคุณไปต่อ...</p>
                        </div>
                    </div>`;
                
                // Auto Advance
                setTimeout(() => {
                    STATE.step = 2;
                    render();
                }, 1500);
            } else if (STATE.geofence.status === 'out') {
                content = `
                    <div class="w-full step-panel h-full flex flex-col">
                        <div class="bg-rose-50 border-b border-rose-100 p-4 mb-6 flex items-center gap-3">
                            <div class="w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center text-white shrink-0">
                                <i data-lucide="alert-circle"></i>
                            </div>
                            <div>
                                <h3 class="font-black text-rose-800">อยู่นอกพื้นที่บริการ</h3>
                                <p class="text-xs text-rose-600 font-bold">ระยะห่าง 45 ม. (อนุญาต 10 ม.)</p>
                            </div>
                        </div>
                        <div class="flex-1 px-8 flex flex-col items-center justify-center text-center">
                             <div class="relative w-full aspect-video bg-rose-50 rounded-3xl border-2 border-dashed border-rose-200 mb-8 flex items-center justify-center">
                                <div class="w-3 h-3 bg-sky-400 rounded-full absolute left-1/4"></div>
                                <div class="w-8 h-[2px] bg-rose-200 absolute left-1/2 -translate-x-1/2"></div>
                                <div class="w-3 h-3 bg-rose-400 rounded-full absolute right-1/4"></div>
                             </div>
                             <h2 class="text-xl font-black text-slate-800">กรุณาเข้าใกล้จุดบริการ</h2>
                             <p class="text-slate-500 mt-2 text-sm">การยืม-คืนด้วยตัวเองต้องทำภายในพื้นที่ที่กำหนดเท่านั้น</p>
                             
                             <div class="w-full space-y-3 mt-8">
                                <button class="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2">
                                    <i data-lucide="map-pin"></i> นำทางไปจุดที่ใกล้ที่สุด
                                </button>
                                <button onclick="simulateGPS('in')" class="w-full py-3 text-slate-500 font-bold text-sm">ลองใหม่อีกครั้ง (${STATE.retryCountdown}ว.)</button>
                             </div>
                        </div>
                    </div>`;
            }

            container.innerHTML = content;
        }

        // --- Step 2: Mode Selection ---
        function renderStep2(container, bottomBar) {
            bottomBar.classList.add('hidden');
            container.innerHTML = `
                <div class="flex-1 flex flex-col justify-center gap-8 step-panel">
                    <div class="text-center">
                        <h2 class="text-2xl font-black text-slate-800">คุณต้องการทำรายการอะไร?</h2>
                        <p class="text-slate-500 mt-1">เลือกโหมดการทำงานด้านล่างนี้</p>
                    </div>

                    <div class="grid gap-4 w-full max-w-sm mx-auto">
                        <button onclick="setMode('borrow')" class="group relative overflow-hidden bg-emerald-50 border-2 border-emerald-100 p-6 rounded-[2rem] flex flex-col items-center gap-3 transition-all active:scale-95 text-center">
                            <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm mb-2 group-hover:scale-110 transition-transform">
                                <i data-lucide="book-open" class="w-8 h-8"></i>
                            </div>
                            <h3 class="text-xl font-black text-emerald-900">ยืมหนังสือ</h3>
                            <p class="text-sm text-emerald-600 font-medium">สแกนบาร์โค้ดเพื่อยืมเล่มใหม่</p>
                        </button>

                        <button onclick="setMode('return')" class="group relative overflow-hidden bg-sky-50 border-2 border-sky-100 p-6 rounded-[2rem] flex flex-col items-center gap-3 transition-all active:scale-95 text-center">
                            <div class="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-sky-600 shadow-sm mb-2 group-hover:scale-110 transition-transform">
                                <i data-lucide="corner-down-left" class="w-8 h-8"></i>
                            </div>
                            <h3 class="text-xl font-black text-sky-900">คืนหนังสือ</h3>
                            <p class="text-sm text-sky-600 font-medium">สแกนบาร์โค้ดเพื่อคืนรายการเดิม</p>
                        </button>
                    </div>
                </div>
            `;
        }

        // --- Step 3: Scanning ---
        function renderStep3(container, bottomBar) {
            bottomBar.classList.remove('hidden');
            
            if (STATE.mode === 'borrow') {
                renderBorrowScreen(container, bottomBar);
            } else {
                renderReturnScreen(container, bottomBar);
            }
        }

        function renderBorrowScreen(container, bottomBar) {
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 7);
            const dateStr = dueDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' });

            container.innerHTML = `
                <div class="step-panel flex flex-col gap-6">
                    <div class="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                            <p class="text-[10px] font-bold text-purple-400 uppercase tracking-widest">กำหนดคืนอัตโนมัติ</p>
                            <p class="font-black text-purple-900">${dateStr}</p>
                        </div>
                        <div class="bg-purple-100 px-3 py-1 rounded-full text-xs font-bold text-purple-600">7 วัน</div>
                    </div>

                    <div onclick="addMockItem()" class="w-full aspect-[4/3] bg-slate-900 rounded-[2rem] flex flex-col items-center justify-center gap-4 text-white shadow-xl relative overflow-hidden group active:scale-[0.98] transition-transform cursor-pointer">
                        <div class="absolute inset-0 opacity-20">
                            <div class="w-full h-[2px] bg-sky-400 shadow-[0_0_20px_sky] absolute top-1/2 -translate-y-1/2 animate-bounce"></div>
                        </div>
                        <div class="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
                            <i data-lucide="scan" class="w-8 h-8"></i>
                        </div>
                        <div class="text-center">
                            <p class="font-black text-lg">เปิดกล้องสแกน</p>
                            <p class="text-xs text-slate-400">สแกนบาร์โค้ดหลังหนังสือ</p>
                        </div>
                    </div>

                    <div id="cart-list" class="space-y-3 pb-24">
                        ${STATE.cart.length === 0 ? `
                            <div class="text-center py-12 border-2 border-dashed border-slate-200 rounded-[2rem]">
                                <p class="text-slate-400 text-sm font-medium">ยังไม่มีรายการที่สแกน</p>
                            </div>
                        ` : STATE.cart.map((item, idx) => `
                            <div class="glass-card p-3 rounded-2xl flex gap-4 animate-slide-left">
                                <div class="w-14 h-20 bg-slate-100 rounded-lg overflow-hidden shrink-0 shadow-sm shimmer">
                                    <img src="${item.cover}" class="w-full h-full object-cover" onload="this.classList.remove('shimmer')">
                                </div>
                                <div class="flex-1 flex flex-col justify-center">
                                    <p class="text-[10px] font-bold text-purple-500">ID: ${item.id}</p>
                                    <h4 class="font-bold text-slate-800 text-sm line-clamp-1">${item.title}</h4>
                                    <p class="text-[10px] text-slate-500 mt-1">กำหนดคืน: ${dateStr}</p>
                                </div>
                                <button onclick="removeItem(${idx})" class="p-2 self-start text-slate-300 hover:text-rose-500">
                                    <i data-lucide="x" class="w-4 h-4"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;

            bottomBar.innerHTML = `
                <button onclick="addMockItem()" class="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 transition-transform active:scale-90">
                    <i data-lucide="camera" class="w-6 h-6"></i>
                </button>
                <button onclick="submitTransaction()" class="flex-1 h-14 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50" ${STATE.cart.length === 0 ? 'disabled' : ''}>
                    ${STATE.isSubmitting ? '<div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>' : `ยืนยันการยืม (${STATE.cart.length} เล่ม) <i data-lucide="arrow-right" class="w-5 h-5"></i>`}
                </button>
            `;
        }

        function renderReturnScreen(container, bottomBar) {
            container.innerHTML = `
                <div class="step-panel flex flex-col gap-6">
                    <h3 class="font-black text-slate-800">หนังสือที่คุณกำลังยืมอยู่</h3>
                    
                    <div class="space-y-3">
                        <div class="glass-card p-4 rounded-2xl flex items-center gap-4">
                            <div class="w-12 h-16 bg-slate-100 rounded-lg overflow-hidden shrink-0 shadow-sm">
                                <img src="https://images.unsplash.com/photo-1544947950-fa07a98d237f?q=80&w=200&auto=format&fit=crop" class="w-full h-full object-cover">
                            </div>
                            <div class="flex-1">
                                <h4 class="font-bold text-slate-800 text-sm">ปรัชญาปืน (The Gun)</h4>
                                <p class="text-[10px] text-rose-500 font-bold mt-1">ครบกำหนด: พรุ่งนี้</p>
                            </div>
                            <button class="bg-sky-50 text-sky-600 px-4 py-2 rounded-xl text-xs font-black">เลือกคืน</button>
                        </div>
                    </div>

                    <div onclick="addMockItem()" class="mt-4 w-full h-24 bg-sky-50 border-2 border-dashed border-sky-200 rounded-[2rem] flex items-center justify-center gap-3 text-sky-600 transition-transform active:scale-95">
                        <i data-lucide="scan" class="w-6 h-6"></i>
                        <span class="font-black">เปิดกล้องสแกนบาร์โค้ด</span>
                    </div>
                </div>
            `;

            bottomBar.innerHTML = `
                <button onclick="simulateGPS('in')" class="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-600 transition-transform active:scale-90">
                    <i data-lucide="camera" class="w-6 h-6"></i>
                </button>
                <button onclick="submitTransaction()" class="flex-1 h-14 bg-sky-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95">
                    คืนรายการทั้งหมด <i data-lucide="arrow-right" class="w-5 h-5"></i>
                </button>
            `;
        }

        // --- Actions ---
        function simulateGPS(status) {
            STATE.geofence.status = status;
            if (status === 'in' && navigator.vibrate) {
                navigator.vibrate([50, 30, 50]);
            }
            render();
        }

        function setMode(mode) {
            STATE.mode = mode;
            STATE.step = 3;
            render();
        }

        function addMockItem() {
            const mocks = [
                { id: 'BK-7721', title: 'ศิลปะการผัดวันประกันพรุ่ง', cover: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?q=80&w=200' },
                { id: 'BK-1029', title: 'ออกแบบชีวิตด้วย Design Thinking', cover: 'https://images.unsplash.com/photo-1589998059171-988d887df646?q=80&w=200' },
                { id: 'BK-4452', title: 'เมื่อสติมา ปัญญาก็เกิด', cover: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?q=80&w=200' }
            ];
            const random = mocks[Math.floor(Math.random() * mocks.length)];
            
            if (navigator.vibrate) navigator.vibrate(100);
            STATE.cart.push(random);
            render();
        }

        function removeItem(index) {
            STATE.cart.splice(index, 1);
            render();
        }

        function submitTransaction() {
            STATE.isSubmitting = true;
            render();
            
            setTimeout(() => {
                // Mock success
                document.body.innerHTML = `
                    <div class="h-screen w-screen bg-emerald-500 flex flex-col items-center justify-center text-white p-8 text-center animate-pulse">
                        <div class="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-8">
                            <i data-lucide="check" class="w-12 h-12"></i>
                        </div>
                        <h1 class="text-3xl font-black mb-4">ทำรายการสำเร็จ!</h1>
                        <p class="font-medium opacity-90">ระบบได้บันทึกข้อมูลการยืมเรียบร้อยแล้ว <br>คุณสามารถตรวจสอบประวัติได้ในหน้าแอป</p>
                        <button onclick="location.reload()" class="mt-12 bg-white text-emerald-600 px-8 py-4 rounded-full font-black shadow-lg">กลับสู่หน้าหลัก</button>
                    </div>
                `;
                lucide.createIcons();
            }, 1800);
        }

        // Initial Start
        window.onload = () => {
            lucide.createIcons();
            // Start simulation
            setTimeout(() => simulateGPS('in'), 2000);
        };
    </script>
</body>
</html>
