<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Loan Self-Service | ระบบยืม-คืนหนังสือด้วยตนเอง</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        @import url('https://unpkg.com/@fontsource/nunito-sans@5.0.10/index.css');
        
        * {
            font-family: 'Nunito Sans', sans-serif;
        }
        
        .step-circle {
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .progress-line {
            transition: all 0.5s ease-in-out;
        }
        
        .sheet-overlay {
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.3s ease;
        }
        
        .sheet-overlay.active {
            opacity: 1;
            pointer-events: all;
        }
        
        .sheet-content {
            transform: translateY(100%);
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .sheet-overlay.active .sheet-content {
            transform: translateY(0);
        }
        
        @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.5; }
            100% { transform: scale(2); opacity: 0; }
        }
        
        .pulse-ring {
            animation: pulse-ring 1.5s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
        }
        
        @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
        }
        
        .loading-shimmer {
            background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
            background-size: 200% 100%;
            animation: shimmer 1.5s infinite;
        }
        
        @keyframes flash {
            0%, 100% { background-color: transparent; }
            50% { background-color: rgba(16, 185, 129, 0.3); }
        }
        
        .flash-active {
            animation: flash 0.3s ease-out;
        }
        
        @keyframes scan-beam {
            0% { top: 10%; }
            50% { top: 85%; }
            100% { top: 10%; }
        }
        
        .scan-beam {
            animation: scan-beam 2s linear infinite;
        }
        
        .spinner {
            border: 3px solid #e5e7eb;
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .cart-item-enter {
            animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
        }
        
        .btn-hover {
            transition: all 0.2s ease;
        }
        
        .btn-hover:active {
            transform: scale(0.96);
        }
        
        #map-container {
            height: 300px;
            z-index: 10;
        }
        
        .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            display: inline-block;
        }
        
        .status-dot.success { background-color: #10b981; }
        .status-dot.warning { background-color: #f59e0b; }
        .status-dot.error { background-color: #ef4444; }
        .status-dot.pending { background-color: #9ca3af; }
        
        .mode-card {
            transition: all 0.3s ease;
            cursor: pointer;
        }
        
        .mode-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        
        .mode-card.selected {
            border-color: #3b82f6;
            background-color: #eff6ff;
        }
        
        .leaflet-control-attribution {
            font-size: 9px;
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen pb-20">
    <!-- Header -->
    <header class="bg-white shadow-sm sticky top-0 z-40">
        <div class="max-w-lg mx-auto px-4 py-3">
            <div class="flex items-center justify-between mb-3">
                <h1 class="text-lg font-bold text-gray-800">📚 Loan Self-Service</h1>
                <button id="btn-back-home" class="btn-hover p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="กลับหน้าหลัก">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                </button>
            </div>
            
            <!-- Step Indicator -->
            <div class="flex items-center justify-between" id="step-indicator">
                <div class="flex flex-col items-center flex-1">
                    <div class="step-circle w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-blue-500 text-white" id="step-circle-1">
                        <span>1</span>
                    </div>
                    <span class="text-xs mt-1 text-blue-600 font-medium" id="step-label-1">ตรวจพิกัด</span>
                </div>
                <div class="flex-1 h-1 bg-gray-200 rounded progress-line mx-1" id="progress-line-1">
                    <div class="h-full bg-gray-200 rounded progress-line" id="progress-fill-1" style="width: 0%;"></div>
                </div>
                <div class="flex flex-col items-center flex-1">
                    <div class="step-circle w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-gray-200 text-gray-500" id="step-circle-2">
                        <span>2</span>
                    </div>
                    <span class="text-xs mt-1 text-gray-400" id="step-label-2">เลือกโหมด</span>
                </div>
                <div class="flex-1 h-1 bg-gray-200 rounded progress-line mx-1" id="progress-line-2">
                    <div class="h-full bg-gray-200 rounded progress-line" id="progress-fill-2" style="width: 0%;"></div>
                </div>
                <div class="flex flex-col items-center flex-1">
                    <div class="step-circle w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-gray-200 text-gray-500" id="step-circle-3">
                        <span>3</span>
                    </div>
                    <span class="text-xs mt-1 text-gray-400" id="step-label-3">สแกน</span>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-lg mx-auto px-4 py-4 space-y-4" id="main-content">
        <!-- Status Panel -->
        <div id="status-panel" class="bg-white rounded-xl shadow-sm p-4">
            <div class="flex items-center gap-3">
                <div id="status-icon-container">
                    <div class="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>
                </div>
                <div class="flex-1">
                    <p class="text-sm font-semibold text-gray-700" id="status-text">กำลังตรวจสอบพิกัด...</p>
                    <p class="text-xs text-gray-500 mt-0.5" id="status-subtext">กรุณาอนุญาตการเข้าถึงตำแหน่ง</p>
                </div>
                <div id="status-badge" class="status-dot pending"></div>
            </div>
            
            <!-- GPS Info -->
            <div id="gps-info" class="mt-3 pt-3 border-t border-gray-100 hidden">
                <div class="grid grid-cols-2 gap-2 text-xs">
                    <div class="bg-gray-50 rounded-lg p-2">
                        <span class="text-gray-500">ละติจูด</span>
                        <p class="font-mono font-semibold text-gray-700" id="gps-lat">--</p>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-2">
                        <span class="text-gray-500">ลองจิจูด</span>
                        <p class="font-mono font-semibold text-gray-700" id="gps-lng">--</p>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-2">
                        <span class="text-gray-500">ความแม่นยำ</span>
                        <p class="font-mono font-semibold text-gray-700" id="gps-accuracy">--</p>
                    </div>
                    <div class="bg-gray-50 rounded-lg p-2">
                        <span class="text-gray-500">ระยะห่าง</span>
                        <p class="font-mono font-semibold text-gray-700" id="gps-distance">--</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Business Hours Section -->
        <div id="business-hours" class="bg-white rounded-xl shadow-sm p-4">
            <div class="flex items-center gap-2 mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <h3 class="text-sm font-bold text-gray-700">เวลาทำการวันนี้</h3>
            </div>
            <div id="business-hours-content">
                <!-- Populated by JS -->
            </div>
        </div>

        <!-- Policy Card -->
        <div id="policy-card" class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow-sm p-4 border border-blue-100">
            <div class="flex items-center gap-2 mb-2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <h3 class="text-sm font-bold text-blue-800">สิทธิ์การยืมของคุณ</h3>
            </div>
            <div class="grid grid-cols-3 gap-3 mt-2">
                <div class="text-center">
                    <p class="text-2xl font-bold text-blue-600" id="policy-quota">5</p>
                    <p class="text-xs text-blue-600">โควตาเหลือ</p>
                </div>
                <div class="text-center">
                    <p class="text-2xl font-bold text-blue-600" id="policy-days">14</p>
                    <p class="text-xs text-blue-600">วันยืมสูงสุด</p>
                </div>
                <div class="text-center">
                    <p class="text-2xl font-bold text-blue-600" id="policy-active">2</p>
                    <p class="text-xs text-blue-600">กำลังยืม</p>
                </div>
            </div>
        </div>

        <!-- Verify Step -->
        <div id="verify-step" class="bg-white rounded-xl shadow-sm p-6 text-center">
            <div class="spinner mx-auto mb-4"></div>
            <p class="text-sm text-gray-600">กำลังรอพิกัด GPS ที่แม่นยำ...</p>
            <p class="text-xs text-gray-400 mt-1">ความแม่นยำต้อง ≤ 30 เมตร</p>
            <button id="btn-retry-gps" class="btn-hover mt-4 px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 hidden">
                ลองใหม่
            </button>
        </div>

        <!-- Choose Step -->
        <div id="choose-step" class="hidden">
            <h2 class="text-lg font-bold text-gray-800 mb-3">เลือกโหมด</h2>
            <div class="grid grid-cols-2 gap-3">
                <div id="mode-borrow" class="mode-card bg-white rounded-xl shadow-sm p-5 border-2 border-transparent text-center" onclick="selectMode('borrow')">
                    <div class="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                            <line x1="9" y1="7" x2="16" y2="7"></line>
                            <line x1="9" y1="11" x2="14" y2="11"></line>
                        </svg>
                    </div>
                    <h3 class="text-sm font-bold text-gray-800">ยืมหนังสือ</h3>
                    <p class="text-xs text-gray-500 mt-1">สแกนบาร์โค้ดเพื่อยืม</p>
                </div>
                <div id="mode-return" class="mode-card bg-white rounded-xl shadow-sm p-5 border-2 border-transparent text-center" onclick="selectMode('return')">
                    <div class="w-14 h-14 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-3">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                            <polyline points="9 10 12 7 15 10"></polyline>
                            <line x1="12" y1="7" x2="12" y2="13"></line>
                        </svg>
                    </div>
                    <h3 class="text-sm font-bold text-gray-800">คืนหนังสือ</h3>
                    <p class="text-xs text-gray-500 mt-1">สแกนบาร์โค้ดเพื่อคืน</p>
                </div>
            </div>
        </div>

        <!-- Scan Step -->
        <div id="scan-step" class="hidden space-y-4">
            <!-- Scan Actions -->
            <div class="flex gap-2">
                <button id="btn-open-scanner" class="btn-hover flex-1 py-3 bg-blue-500 text-white rounded-xl font-semibold text-sm hover:bg-blue-600 flex items-center justify-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="7" y1="8" x2="7" y2="8.01"></line>
                        <line x1="17" y1="8" x2="17" y2="8.01"></line>
                        <line x1="7" y1="16" x2="7" y2="16.01"></line>
                        <line x1="17" y1="16" x2="17" y2="16.01"></line>
                        <line x1="12" y1="12" x2="12" y2="12.01"></line>
                    </svg>
                    สแกนบาร์โค้ด
                </button>
                <button id="btn-map" class="btn-hover py-3 px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 flex items-center justify-center">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                        <line x1="8" y1="2" x2="8" y2="18"></line>
                        <line x1="16" y1="6" x2="16" y2="22"></line>
                    </svg>
                </button>
            </div>

            <!-- Manual Barcode Input -->
            <div class="bg-white rounded-xl shadow-sm p-4">
                <label class="text-xs font-semibold text-gray-600 mb-2 block">กรอกรหัสบาร์โค้ดด้วยตัวเอง</label>
                <div class="flex gap-2">
                    <input type="text" id="barcode-input" class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="เช่น 9786165749123" autocomplete="off">
                    <button id="btn-add-manual" class="btn-hover px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900">เพิ่ม</button>
                </div>
            </div>

            <!-- Cart List -->
            <div class="bg-white rounded-xl shadow-sm p-4">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        ตะกร้ารายการ
                        <span id="cart-count" class="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">0</span>
                    </h3>
                    <button id="btn-clear-cart" class="text-xs text-red-500 hover:text-red-600 btn-hover px-2 py-1 rounded">ลบทั้งหมด</button>
                </div>
                <div id="cart-list" class="space-y-2 max-h-64 overflow-y-auto">
                    <div id="cart-empty" class="text-center py-8">
                        <svg class="mx-auto mb-2" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        <p class="text-xs text-gray-400">ยังไม่มีรายการในตะกร้า</p>
                        <p class="text-xs text-gray-300 mt-0.5">สแกนหรือกรอกรหัสบาร์โค้ดเพื่อเริ่มต้น</p>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <!-- Bottom Action Bar -->
    <div id="bottom-bar" class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-30 hidden">
        <div class="max-w-lg mx-auto flex gap-2">
            <button id="btn-back-step" class="btn-hover flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200">ย้อนกลับ</button>
            <button id="btn-confirm" class="btn-hover flex-1 py-3 bg-green-500 text-white rounded-xl font-semibold text-sm hover:bg-green-600 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed" disabled>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                ยืนยันรายการ (<span id="confirm-count">0</span>)
            </button>
        </div>
    </div>

    <!-- Map Sheet -->
    <div id="map-sheet" class="sheet-overlay fixed inset-0 bg-black bg-opacity-50 z-50">
        <div class="sheet-content absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-hidden">
            <div class="p-4 border-b border-gray-100">
                <div class="flex items-center justify-between">
                    <h3 class="font-bold text-gray-800 flex items-center gap-2">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon>
                            <line x1="8" y1="2" x2="8" y2="18"></line>
                            <line x1="16" y1="6" x2="16" y2="22"></line>
                        </svg>
                        แผนที่จุดบริการ
                    </h3>
                    <button id="btn-close-map" class="p-2 hover:bg-gray-100 rounded-lg">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <p class="text-xs text-gray-500 mt-1">ตำแหน่งของคุณอยู่ห่างจากจุดบริการ <span id="map-distance-text">--</span></p>
            </div>
            <div id="map-container"></div>
            <div class="p-4">
                <a id="btn-navigate" href="#" target="_blank" class="btn-hover w-full py-3 bg-green-500 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-green-600">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                    </svg>
                    นำทางด้วย Google Maps
                </a>
            </div>
        </div>
    </div>

    <!-- Scanner Sheet -->
    <div id="scanner-sheet" class="sheet-overlay fixed inset-0 bg-black bg-opacity-90 z-50">
        <div class="sheet-content absolute bottom-0 left-0 right-0 bg-gray-900 rounded-t-3xl max-h-[85vh] overflow-hidden">
            <div class="p-4 border-b border-gray-700 flex items-center justify-between">
                <h3 class="font-bold text-white flex items-center gap-2">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="7" y1="8" x2="7" y2="8.01"></line>
                        <line x1="17" y1="8" x2="17" y2="8.01"></line>
                        <line x1="7" y1="16" x2="7" y2="16.01"></line>
                        <line x1="17" y1="16" x2="17" y2="16.01"></line>
                    </svg>
                    สแกนบาร์โค้ด
                </h3>
                <button id="btn-close-scanner" class="p-2 hover:bg-gray-700 rounded-lg">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            
            <!-- Camera View -->
            <div id="camera-view" class="relative w-full aspect-square max-w-md mx-auto mt-4">
                <video id="scanner-video" class="w-full h-full object-cover rounded-2xl" playsinline autoplay muted></video>
                
                <!-- Scan Frame -->
                <div class="absolute inset-8 border-2 border-blue-400 border-opacity-50 rounded-lg pointer-events-none">
                    <div class="scan-beam absolute left-2 right-2 h-0.5 bg-green-400 shadow-[0_0_10px_rgba(74,222,128,0.8)]"></div>
                    <!-- Corners -->
                    <div class="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-4 border-l-4 border-blue-500 rounded-tl-lg"></div>
                    <div class="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-4 border-r-4 border-blue-500 rounded-tr-lg"></div>
                    <div class="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-4 border-l-4 border-blue-500 rounded-bl-lg"></div>
                    <div class="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-4 border-r-4 border-blue-500 rounded-br-lg"></div>
                </div>
                
                <!-- Flash Overlay -->
                <div id="scan-flash" class="absolute inset-0 rounded-2xl pointer-events-none"></div>
            </div>
            
            <div class="p-4 text-center">
                <p class="text-sm text-gray-300" id="scanner-status">กำลังเปิดกล้อง...</p>
                <p class="text-xs text-gray-500 mt-1">วางบาร์โค้ดให้อยู่ภายในกรอบ</p>
                <div class="mt-3">
                    <button id="btn-switch-camera" class="btn-hover px-4 py-2 bg-gray-700 text-white rounded-lg text-sm hover:bg-gray-600">
                        สลับกล้อง
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Result Sheet -->
    <div id="result-sheet" class="sheet-overlay fixed inset-0 bg-black bg-opacity-50 z-50">
        <div class="sheet-content absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[80vh] overflow-y-auto">
            <div class="p-6 text-center">
                <div class="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                </div>
                <h3 class="text-lg font-bold text-gray-800 mb-1">เสร็จสิ้น!</h3>
                <p class="text-sm text-gray-500" id="result-summary">ดำเนินการทั้งหมด 0 รายการ</p>
            </div>
            <div id="result-list" class="px-6 pb-6 space-y-2"></div>
            <div class="p-4 border-t border-gray-100">
                <button id="btn-close-result" class="btn-hover w-full py-3 bg-blue-500 text-white rounded-xl font-semibold text-sm hover:bg-blue-600">ตกลง</button>
            </div>
        </div>
    </div>

    <!-- Submitting Overlay -->
    <div id="submitting-overlay" class="fixed inset-0 bg-black bg-opacity-60 z-50 hidden flex items-center justify-center">
        <div class="bg-white rounded-2xl p-8 max-w-xs w-full mx-4 text-center">
            <div class="spinner mx-auto mb-4"></div>
            <p class="font-semibold text-gray-800" id="submitting-text">กำลังประมวลผล...</p>
            <p class="text-xs text-gray-500 mt-1" id="submitting-progress">0 / 0 รายการ</p>
            <div class="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div id="submit-progress-bar" class="bg-blue-500 h-2 rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>
        </div>
    </div>

    <script>
        // ============================================================
        // STATE MANAGEMENT
        // ============================================================
        const APP_STATE = {
            currentStep: 'verifying',
            selectedMode: null,
            cart: [],
            gps: {
                lat: null,
                lng: null,
                accuracy: null,
                inZone: false,
                distance: null,
                error: null
            },
            watchId: null,
            geoSamples: [],
            mapInstance: null,
            userMarker: null,
            serviceMarker: null,
            scannerStream: null,
            facingMode: 'environment',
            isScanning: false,
            bootstrapLoading: false,
            submitting: false
        };

        const SERVICE_LOCATION = { lat: 13.7500, lng: 100.4915 };
        const ACCURACY_THRESHOLD = 30;

        // ============================================================
        // BUSINESS HOURS
        // ============================================================
        const BUSINESS_HOURS = [
            { day: 'จันทร์', open: '08:00', close: '18:00', today: false },
            { day: 'อังคาร', open: '08:00', close: '18:00', today: false },
            { day: 'พุธ', open: '08:00', close: '20:00', today: false },
            { day: 'พฤหัสบดี', open: '08:00', close: '18:00', today: false },
            { day: 'ศุกร์', open: '08:00', close: '18:00', today: false },
            { day: 'เสาร์', open: '09:00', close: '16:00', today: false },
            { day: 'อาทิตย์', open: 'ปิด', close: '', today: false }
        ];

        function renderBusinessHours() {
            const today = new Date().getDay();
            const dayIndex = today === 0 ? 6 : today - 1;
            
            const bhContent = document.getElementById('business-hours-content');
            const hours = BUSINESS_HOURS.map((bh, idx) => {
                const isToday = idx === dayIndex;
                bh.today = isToday;
                return bh;
            });

            const todayBH = hours[dayIndex];
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            const isOpen = todayBH.open !== 'ปิด' && 
                          currentMinutes >= parseTimeMinutes(todayBH.open) && 
                          currentMinutes < parseTimeMinutes(todayBH.close);

            let html = `
                <div class="bg-${isOpen ? 'green' : 'red'}-50 border border-${isOpen ? 'green' : 'red'}-200 rounded-lg p-3 mb-3">
                    <div class="flex items-center gap-2">
                        <div class="w-2 h-2 rounded-full bg-${isOpen ? 'green' : 'red'}-500"></div>
                        <span class="text-sm font-semibold text-${isOpen ? 'green' : 'red'}-700">
                            ${isOpen ? 'เปิดให้บริการ' : 'ปิดให้บริการ'}
                        </span>
                    </div>
                </div>
            `;

            html += '<div class="space-y-1">';
            hours.forEach(bh => {
                const isClosed = bh.open === 'ปิด';
                html += `
                    <div class="flex items-center justify-between text-xs py-1.5 px-2 rounded ${bh.today ? 'bg-blue-50 font-semibold text-blue-700' : 'text-gray-600'}">
                        <span class="flex-1">${bh.day}</span>
                        <span class="font-mono">${isClosed ? 'ปิด' : `${bh.open} - ${bh.close}`}</span>
                        ${bh.today ? '<span class="ml-1">●</span>' : ''}
                    </div>
                `;
            });
            html += '</div>';

            bhContent.innerHTML = html;
        }

        function parseTimeMinutes(timeStr) {
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        }

        // ============================================================
        // CART MANAGEMENT
        // ============================================================
        function loadCart() {
            try {
                const stored = localStorage.getItem('loan_self_cart');
                if (stored) {
                    APP_STATE.cart = JSON.parse(stored);
                }
            } catch (e) {
                APP_STATE.cart = [];
            }
        }

        function saveCart() {
            try {
                localStorage.setItem('loan_self_cart', JSON.stringify(APP_STATE.cart));
            } catch (e) {
                console.warn('Failed to save cart to localStorage');
            }
        }

        function addToCart(barcode) {
            if (!barcode || barcode.trim() === '') return false;
            
            const trimmedBarcode = barcode.trim();
            
            if (APP_STATE.cart.find(item => item.barcode === trimmedBarcode)) {
                showToast('มีรหัสบาร์โค้ดนี้อยู่ในตะกร้าแล้ว', 'warning');
                return false;
            }

            if (APP_STATE.selectedMode === 'borrow') {
                const quotaRemaining = 5 - APP_STATE.cart.length;
                if (APP_STATE.cart.length >= 5) {
                    showToast('โควตาการยืมเต็มแล้ว', 'error');
                    return false;
                }
            }

            const item = {
                id: Date.now().toString(),
                barcode: trimmedBarcode,
                status: 'pending',
                result: null,
                timestamp: new Date().toISOString()
            };

            APP_STATE.cart.push(item);
            saveCart();
            renderCart();
            return true;
        }

        function removeFromCart(itemId) {
            APP_STATE.cart = APP_STATE.cart.filter(item => item.id !== itemId);
            saveCart();
            renderCart();
        }

        function clearCart() {
            APP_STATE.cart = [];
            saveCart();
            renderCart();
        }

        function renderCart() {
            const cartList = document.getElementById('cart-list');
            const cartCount = document.getElementById('cart-count');
            const cartEmpty = document.getElementById('cart-empty');
            const confirmBtn = document.getElementById('btn-confirm');
            const confirmCount = document.getElementById('confirm-count');

            cartCount.textContent = APP_STATE.cart.length;
            confirmCount.textContent = APP_STATE.cart.length;
            confirmBtn.disabled = APP_STATE.cart.length === 0;

            if (APP_STATE.cart.length === 0) {
                cartList.innerHTML = `
                    <div id="cart-empty" class="text-center py-8">
                        <svg class="mx-auto mb-2" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5">
                            <circle cx="9" cy="21" r="1"></circle>
                            <circle cx="20" cy="21" r="1"></circle>
                            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                        </svg>
                        <p class="text-xs text-gray-400">ยังไม่มีรายการในตะกร้า</p>
                        <p class="text-xs text-gray-300 mt-0.5">สแกนหรือกรอกรหัสบาร์โค้ดเพื่อเริ่มต้น</p>
                    </div>
                `;
                return;
            }

            let html = '';
            APP_STATE.cart.forEach((item, index) => {
                const statusIcon = item.status === 'success' ? 
                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>' :
                    item.status === 'error' ?
                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' :
                    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>';

                html += `
                    <div class="cart-item-enter flex items-center gap-3 bg-gray-50 rounded-lg p-3 ${item.status !== 'pending' ? 'opacity-60' : ''}">
                        <div class="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                            ${statusIcon}
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-mono font-semibold text-gray-700 truncate">${item.barcode}</p>
                            <p class="text-xs text-gray-400">${item.result || 'รอประมวลผล'}</p>
                        </div>
                        <button onclick="removeFromCart('${item.id}')" class="p-1 hover:bg-red-100 rounded text-red-400 hover:text-red-600 btn-hover flex-shrink-0">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                        </button>
                    </div>
                `;
            });

            cartList.innerHTML = html;
        }

        // ============================================================
        // GEOLOCATION
        // ============================================================
        function calculateDistance(lat1, lng1, lat2, lng2) {
            const R = 6371e3;
            const φ1 = lat1 * Math.PI / 180;
            const φ2 = lat2 * Math.PI / 180;
            const Δφ = (lat2 - lat1) * Math.PI / 180;
            const Δλ = (lng2 - lng1) * Math.PI / 180;

            const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                      Math.cos(φ1) * Math.cos(φ2) *
                      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

            return R * c;
        }

        function getGeoMedian(samples) {
            if (samples.length === 0) return null;
            
            const latMedian = samples.map(s => s.lat).sort((a, b) => a - b)[Math.floor(samples.length / 2)];
            const lngMedian = samples.map(s => s.lng).sort((a, b) => a - b)[Math.floor(samples.length / 2)];
            const accAvg = samples.reduce((sum, s) => sum + s.accuracy, 0) / samples.length;
            
            return { lat: latMedian, lng: lngMedian, accuracy: accAvg };
        }

        function startGeoWatching() {
            if (!navigator.geolocation) {
                updateGeoStatus('gps_error', 'ไม่รองรับ GPS', 'เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง');
                return;
            }

            APP_STATE.geoSamples = [];
            
            APP_STATE.watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude, accuracy } = position.coords;
                    
                    APP_STATE.geoSamples.push({
                        lat: latitude,
                        lng: longitude,
                        accuracy: accuracy
                    });

                    if (APP_STATE.geoSamples.length > 10) {
                        APP_STATE.geoSamples.shift();
                    }

                    const filtered = getGeoMedian(APP_STATE.geoSamples.filter(s => s.accuracy <= 100));

                    if (filtered) {
                        APP_STATE.gps.lat = filtered.lat;
                        APP_STATE.gps.lng = filtered.lng;
                        APP_STATE.gps.accuracy = filtered.accuracy;
                        APP_STATE.gps.distance = calculateDistance(filtered.lat, filtered.lng, SERVICE_LOCATION.lat, SERVICE_LOCATION.lng);
                        APP_STATE.gps.inZone = filtered.accuracy <= ACCURACY_THRESHOLD && APP_STATE.gps.distance <= 200;

                        updateGeoUI();

                        if (APP_STATE.gps.inZone && APP_STATE.currentStep === 'verifying') {
                            proceedToStep('choose');
                        }
                    }
                },
                (error) => {
                    let message = 'เกิดข้อผิดพลาดกับ GPS';
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            message = 'กรุณาอนุญาตการเข้าถึงตำแหน่ง';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            message = 'ไม่สามารถระบุตำแหน่งได้';
                            break;
                        case error.TIMEOUT:
                            message = 'หมดเวลาในการระบุตำแหน่ง';
                            break;
                    }
                    updateGeoStatus('gps_error', message, 'ตรวจสอบการตั้งค่าและลองอีกครั้ง');
                    document.getElementById('btn-retry-gps').classList.remove('hidden');
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        }

        function updateGeoStatus(status, text, subtext) {
            const statusText = document.getElementById('status-text');
            const statusSubtext = document.getElementById('status-subtext');
            const statusBadge = document.getElementById('status-badge');
            const statusIconContainer = document.getElementById('status-icon-container');

            statusText.textContent = text;
            statusSubtext.textContent = subtext;

            const icons = {
                in_zone: `<div class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                </div>`,
                out_of_zone: `<div class="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>`,
                gps_error: `<div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                </div>`,
                checking: `<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>`
            };

            const badges = {
                in_zone: 'success',
                out_of_zone: 'warning',
                gps_error: 'error',
                checking: 'pending'
            };

            statusIconContainer.innerHTML = icons[status] || icons.checking;
            statusBadge.className = `status-dot ${badges[status] || 'pending'}`;
        }

        function updateGeoUI() {
            const gpsInfo = document.getElementById('gps-info');
            gpsInfo.classList.remove('hidden');

            document.getElementById('gps-lat').textContent = APP_STATE.gps.lat ? APP_STATE.gps.lat.toFixed(6) : '--';
            document.getElementById('gps-lng').textContent = APP_STATE.gps.lng ? APP_STATE.gps.lng.toFixed(6) : '--';
            document.getElementById('gps-accuracy').textContent = APP_STATE.gps.accuracy ? `${APP_STATE.gps.accuracy.toFixed(1)} ม.` : '--';
            document.getElementById('gps-distance').textContent = APP_STATE.gps.distance !== null ? `${APP_STATE.gps.distance.toFixed(0)} ม.` : '--';

            if (APP_STATE.gps.inZone) {
                updateGeoStatus('in_zone', 'อยู่ในพื้นที่ให้บริการ', `ห่างจากจุดบริการ ${APP_STATE.gps.distance.toFixed(0)} เมตร`);
            } else if (APP_STATE.gps.distance !== null) {
                updateGeoStatus('out_of_zone', 'อยู่นอกพื้นที่ให้บริการ', `ห่างจากจุดบริการ ${APP_STATE.gps.distance.toFixed(0)} เมตร`);
            }
        }

        // ============================================================
        // STEP MANAGEMENT
        // ============================================================
        function proceedToStep(step) {
            APP_STATE.currentStep = step;
            updateStepUI();
        }

        function updateStepUI() {
            const steps = ['verifying', 'choose', 'scan'];
            const currentIndex = steps.indexOf(APP_STATE.currentStep);

            // Update circles and labels
            steps.forEach((s, idx) => {
                const circle = document.getElementById(`step-circle-${idx + 1}`);
                const label = document.getElementById(`step-label-${idx + 1}`);

                if (idx < currentIndex) {
                    circle.className = 'step-circle w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-green-500 text-white';
                    circle.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                    label.className = 'text-xs mt-1 text-green-600 font-medium';
                } else if (idx === currentIndex) {
                    circle.className = 'step-circle w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-blue-500 text-white';
                    circle.innerHTML = `<span>${idx + 1}</span>`;
                    label.className = 'text-xs mt-1 text-blue-600 font-medium';
                } else {
                    circle.className = 'step-circle w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold bg-gray-200 text-gray-500';
                    circle.innerHTML = `<span>${idx + 1}</span>`;
                    label.className = 'text-xs mt-1 text-gray-400';
                }
            });

            // Update progress lines
            const fill1 = document.getElementById('progress-fill-1');
            const fill2 = document.getElementById('progress-fill-2');
            
            fill1.style.width = currentIndex >= 1 ? '100%' : '0%';
            fill1.style.backgroundColor = currentIndex >= 1 ? '#10b981' : '#e5e7eb';
            
            fill2.style.width = currentIndex >= 2 ? '100%' : '0%';
            fill2.style.backgroundColor = currentIndex >= 2 ? '#10b981' : '#e5e7eb';

            // Show/hide step panels
            document.getElementById('verify-step').classList.toggle('hidden', APP_STATE.currentStep !== 'verifying');
            document.getElementById('choose-step').classList.toggle('hidden', APP_STATE.currentStep !== 'choose');
            document.getElementById('scan-step').classList.toggle('hidden', APP_STATE.currentStep !== 'scan');
            
            // Bottom bar
            const bottomBar = document.getElementById('bottom-bar');
            bottomBar.classList.toggle('hidden', APP_STATE.currentStep !== 'scan');

            // Back button visibility
            const backBtn = document.getElementById('btn-back-step');
            backBtn.classList.toggle('hidden', APP_STATE.currentStep === 'verify');
        }

        // ============================================================
        // MODE SELECTION
        // ============================================================
        function selectMode(mode) {
            APP_STATE.selectedMode = mode;
            
            document.getElementById('mode-borrow').classList.toggle('selected', mode === 'borrow');
            document.getElementById('mode-return').classList.toggle('selected', mode === 'return');

            clearCart();
            
            setTimeout(() => {
                proceedToStep('scan');
            }, 300);
        }

        // ============================================================
        // MAP INTEGRATION
        // ============================================================
        function initMap() {
            if (APP_STATE.mapInstance) return;

            APP_STATE.mapInstance = L.map('map-container', {
                zoomControl: false
            }).setView([SERVICE_LOCATION.lat, SERVICE_LOCATION.lng], 16);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap'
            }).addTo(APP_STATE.mapInstance);

            L.control.zoom({ position: 'topright' }).addTo(APP_STATE.mapInstance);

            // Service location marker
            APP_STATE.serviceMarker = L.marker([SERVICE_LOCATION.lat, SERVICE_LOCATION.lng]).addTo(APP_STATE.mapInstance);
            APP_STATE.serviceMarker.bindPopup('<b>จุดบริการ</b><br>ห้องสมุดกลาง');

            // User marker (will update)
            const userIcon = L.divIcon({
                className: 'custom-user-marker',
                html: `<div class="relative">
                    <div class="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg"></div>
                    <div class="absolute inset-0 w-4 h-4 bg-blue-500 rounded-full pulse-ring"></div>
                </div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });

            APP_STATE.userMarker = L.marker([SERVICE_LOCATION.lat, SERVICE_LOCATION.lng], { icon: userIcon }).addTo(APP_STATE.mapInstance);
            APP_STATE.userMarker.bindPopup('ตำแหน่งของคุณ');

            // Update map when GPS changes
            const originalUpdateGeoUI = updateGeoUI;
            setInterval(() => {
                if (APP_STATE.mapInstance && APP_STATE.gps.lat) {
                    APP_STATE.userMarker.setLatLng([APP_STATE.gps.lat, APP_STATE.gps.lng]);
                    
                    const bounds = L.latLngBounds([
                        [APP_STATE.gps.lat, APP_STATE.gps.lng],
                        [SERVICE_LOCATION.lat, SERVICE_LOCATION.lng]
                    ]);
                    APP_STATE.mapInstance.fitBounds(bounds, { padding: [50, 50] });
                }
            }, 2000);
        }

        function openMap() {
            document.getElementById('map-sheet').classList.add('active');
            initMap();
            setTimeout(() => {
                APP_STATE.mapInstance.invalidateSize();
                if (APP_STATE.gps.lat) {
                    APP_STATE.userMarker.setLatLng([APP_STATE.gps.lat, APP_STATE.gps.lng]);
                }
            }, 400);

            if (APP_STATE.gps.distance !== null) {
                document.getElementById('map-distance-text').textContent = `${APP_STATE.gps.distance.toFixed(0)} เมตร`;
            }

            // Navigate button
            const navigateBtn = document.getElementById('btn-navigate');
            navigateBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${SERVICE_LOCATION.lat},${SERVICE_LOCATION.lng}`;
        }

        function closeMap() {
            document.getElementById('map-sheet').classList.remove('active');
        }

        // ============================================================
        // SCANNER INTEGRATION
        // ============================================================
        async function startScanner() {
            document.getElementById('scanner-sheet').classList.add('active');
            document.getElementById('scanner-status').textContent = 'กำลังเปิดกล้อง...';
            APP_STATE.isScanning = true;

            try {
                if (APP_STATE.scannerStream) {
                    APP_STATE.scannerStream.getTracks().forEach(track => track.stop());
                }

                APP_STATE.scannerStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: APP_STATE.facingMode }
                });

                const video = document.getElementById('scanner-video');
                video.srcObject = APP_STATE.scannerStream;
                
                document.getElementById('scanner-status').textContent = 'สแกนบาร์โค้ดได้เลย';
                scanLoop();
            } catch (err) {
                document.getElementById('scanner-status').textContent = 'ไม่สามารถเปิดกล้องได้';
                APP_STATE.isScanning = false;
            }
        }

        async function scanLoop() {
            if (!APP_STATE.isScanning) return;

            if ('BarcodeDetector' in window) {
                try {
                    const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code'] });
                    const video = document.getElementById('scanner-video');
                    
                    if (video.readyState === video.HAVE_ENOUGH_DATA) {
                        const barcodes = await detector.detect(video);
                        
                        if (barcodes.length > 0) {
                            const value = barcodes[0].rawValue;
                            handleScanSuccess(value);
                        }
                    }
                } catch (e) {
                    // BarcodeDetector not supported or error
                }
            }

            requestAnimationFrame(scanLoop);
        }

        function handleScanSuccess(value) {
            if (!APP_STATE.isScanning) return;
            
            const flash = document.getElementById('scan-flash');
            flash.classList.add('flash-active');
            setTimeout(() => flash.classList.remove('flash-active'), 300);

            if (navigator.vibrate) {
                navigator.vibrate(100);
            }

            const added = addToCart(value);
            document.getElementById('scanner-status').textContent = added ? `✓ เพิ่ม ${value} แล้ว` : '❌ เพิ่มไม่สำเร็จ';
        }

        function stopScanner() {
            APP_STATE.isScanning = false;
            if (APP_STATE.scannerStream) {
                APP_STATE.scannerStream.getTracks().forEach(track => track.stop());
                APP_STATE.scannerStream = null;
            }
            document.getElementById('scanner-sheet').classList.remove('active');
        }

        // ============================================================
        // BATCH SUBMISSION
        // ============================================================
        async function submitBatch() {
            if (APP_STATE.cart.length === 0) return;
            
            APP_STATE.submitting = true;
            const overlay = document.getElementById('submitting-overlay');
            const text = document.getElementById('submitting-text');
            const progress = document.getElementById('submitting-progress');
            const progressBar = document.getElementById('submit-progress-bar');
            
            overlay.classList.remove('hidden');
            overlay.style.display = 'flex';
            
            const total = APP_STATE.cart.length;
            text.textContent = APP_STATE.selectedMode === 'borrow' ? 'กำลังดำเนินการยืม...' : 'กำลังดำเนินการคืน...';
            
            for (let i = 0; i < APP_STATE.cart.length; i++) {
                const item = APP_STATE.cart[i];
                progress.textContent = `${i + 1} / ${total} รายการ`;
                progressBar.style.width = `${((i + 1) / total) * 100}%`;
                
                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 500));
                
                const success = Math.random() > 0.15;
                item.status = success ? 'success' : 'error';
                item.result = success ? 
                    (APP_STATE.selectedMode === 'borrow' ? 'ยืมสำเร็จ' : 'คืนสำเร็จ') : 
                    'ไม่พบข้อมูล';
                
                saveCart();
                renderCart();
            }
            
            // Show results
            setTimeout(() => {
                overlay.classList.add('hidden');
                overlay.style.display = 'none';
                APP_STATE.submitting = false;
                showResults();
            }, 500);
        }

        function showResults() {
            const sheet = document.getElementById('result-sheet');
            const summary = document.getElementById('result-summary');
            const list = document.getElementById('result-list');
            
            const successCount = APP_STATE.cart.filter(item => item.status === 'success').length;
            const errorCount = APP_STATE.cart.filter(item => item.status === 'error').length;
            
            summary.textContent = `ดำเนินการทั้งหมด ${APP_STATE.cart.length} รายการ (สำเร็จ ${successCount} | ไม่สำเร็จ ${errorCount})`;
            
            let html = '';
            APP_STATE.cart.forEach(item => {
                html += `
                    <div class="flex items-center gap-3 p-3 rounded-lg ${item.status === 'success' ? 'bg-green-50' : 'bg-red-50'}">
                        <div class="w-8 h-8 rounded-full ${item.status === 'success' ? 'bg-green-200' : 'bg-red-200'} flex items-center justify-center flex-shrink-0">
                            ${item.status === 'success' ?
                                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' :
                                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>'
                            }
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-mono font-semibold text-gray-700 truncate">${item.barcode}</p>
                            <p class="text-xs ${item.status === 'success' ? 'text-green-600' : 'text-red-600'}">${item.result}</p>
                        </div>
                    </div>
                `;
            });
            
            list.innerHTML = html;
            sheet.classList.add('active');
        }

        // ============================================================
        // TOAST NOTIFICATION
        // ============================================================
        function showToast(message, type = 'info') {
            const existing = document.querySelector('.toast-notification');
            if (existing) existing.remove();

            const toast = document.createElement('div');
            toast.className = `toast-notification fixed top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl shadow-lg text-sm font-medium z-[60] transition-all duration-300`;
            
            const colors = {
                info: 'bg-blue-500 text-white',
                success: 'bg-green-500 text-white',
                warning: 'bg-yellow-500 text-white',
                error: 'bg-red-500 text-white'
            };
            
            toast.className += ` ${colors[type] || colors.info}`;
            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                toast.style.transform = 'translate(-50%, -10px)';
                setTimeout(() => toast.remove(), 300);
            }, 2000);
        }

        // ============================================================
        // DEMO MODE - SIMULATE GPS
        // ============================================================
        function simulateGPS() {
            // Simulate GPS data for demo purposes
            setTimeout(() => {
                APP_STATE.geoSamples.push({
                    lat: 13.7498 + (Math.random() * 0.0004),
                    lng: 100.4913 + (Math.random() * 0.0004),
                    accuracy: 15 + Math.random() * 10
                });

                const filtered = getGeoMedian(APP_STATE.geoSamples);
                
                if (filtered) {
                    APP_STATE.gps.lat = filtered.lat;
                    APP_STATE.gps.lng = filtered.lng;
                    APP_STATE.gps.accuracy = filtered.accuracy;
                    APP_STATE.gps.distance = calculateDistance(filtered.lat, filtered.lng, SERVICE_LOCATION.lat, SERVICE_LOCATION.lng);
                    APP_STATE.gps.inZone = filtered.accuracy <= ACCURACY_THRESHOLD && APP_STATE.gps.distance <= 200;

                    updateGeoUI();

                    if (APP_STATE.gps.inZone && APP_STATE.currentStep === 'verifying') {
                        proceedToStep('choose');
                    }
                }
            }, 1500);

            // Second sample for better accuracy
            setTimeout(() => {
                APP_STATE.geoSamples.push({
                    lat: 13.7501 + (Math.random() * 0.0002),
                    lng: 100.4917 + (Math.random() * 0.0002),
                    accuracy: 10 + Math.random() * 8
                });

                const filtered = getGeoMedian(APP_STATE.geoSamples);
                
                if (filtered) {
                    APP_STATE.gps.lat = filtered.lat;
                    APP_STATE.gps.lng = filtered.lng;
                    APP_STATE.gps.accuracy = filtered.accuracy;
                    APP_STATE.gps.distance = calculateDistance(filtered.lat, filtered.lng, SERVICE_LOCATION.lat, SERVICE_LOCATION.lng);
                    APP_STATE.gps.inZone = filtered.accuracy <= ACCURACY_THRESHOLD && APP_STATE.gps.distance <= 200;

                    updateGeoUI();

                    if (APP_STATE.gps.inZone && APP_STATE.currentStep === 'verifying') {
                        proceedToStep('choose');
                    }
                }
            }, 2500);
        }

        // ============================================================
        // EVENT LISTENERS
        // ============================================================
        document.addEventListener('DOMContentLoaded', () => {
            loadCart();
            renderBusinessHours();
            renderCart();
            
            // Start GPS simulation for demo
            simulateGPS();
            startGeoWatching();

            // Manual barcode input
            const barcodeInput = document.getElementById('barcode-input');
            barcodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const value = barcodeInput.value.trim();
                    if (value) {
                        addToCart(value);
                        barcodeInput.value = '';
                        showToast('เพิ่มรายการแล้ว', 'success');
                    }
                }
            });

            document.getElementById('btn-add-manual').addEventListener('click', () => {
                const value = barcodeInput.value.trim();
                if (value) {
                    addToCart(value);
                    barcodeInput.value = '';
                    showToast('เพิ่มรายการแล้ว', 'success');
                }
            });

            document.getElementById('btn-clear-cart').addEventListener('click', () => {
                if (confirm('ต้องการลบรายการทั้งหมดในตะกร้า?')) {
                    clearCart();
                }
            });

            document.getElementById('btn-open-scanner').addEventListener('click', startScanner);
            document.getElementById('btn-close-scanner').addEventListener('click', stopScanner);
            
            document.getElementById('btn-switch-camera').addEventListener('click', () => {
                APP_STATE.facingMode = APP_STATE.facingMode === 'environment' ? 'user' : 'environment';
                stopScanner();
                startScanner();
            });

            document.getElementById('btn-map').addEventListener('click', openMap);
            document.getElementById('btn-close-map').addEventListener('click', closeMap);
            
            document.getElementById('btn-retry-gps').addEventListener('click', () => {
                APP_STATE.geoSamples = [];
                simulateGPS();
                document.getElementById('btn-retry-gps').classList.add('hidden');
            });

            document.getElementById('btn-confirm').addEventListener('click', submitBatch);
            
            document.getElementById('btn-close-result').addEventListener('click', () => {
                document.getElementById('result-sheet').classList.remove('active');
                clearCart();
                proceedToStep('choose');
            });

            document.getElementById('btn-back-step').addEventListener('click', () => {
                if (APP_STATE.currentStep === 'scan') {
                    proceedToStep('choose');
                    APP_STATE.selectedMode = null;
                    document.getElementById('mode-borrow').classList.remove('selected');
                    document.getElementById('mode-return').classList.remove('selected');
                } else if (APP_STATE.currentStep === 'choose') {
                    proceedToStep('verifying');
                }
            });

            document.getElementById('btn-back-home').addEventListener('click', () => {
                showToast('กลับหน้าหลัก', 'info');
            });

            // Close sheets on overlay click
            document.getElementById('map-sheet').addEventListener('click', (e) => {
                if (e.target === document.getElementById('map-sheet')) closeMap();
            });
            document.getElementById('scanner-sheet').addEventListener('click', (e) => {
                if (e.target === document.getElementById('scanner-sheet')) stopScanner();
            });
            document.getElementById('result-sheet').addEventListener('click', (e) => {
                if (e.target === document.getElementById('result-sheet')) {
                    document.getElementById('result-sheet').classList.remove('active');
                }
            });
        });
    </script>
</body>
</html>
