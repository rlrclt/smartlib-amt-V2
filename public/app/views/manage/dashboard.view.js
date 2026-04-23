/**
 * Dashboard View (Management System)
 * แสดงผลเฉพาะเนื้อหาภายในช่อง Content ของ Manage Shell
 */
export function renderDashboardView() {
  return `
    <div class="p-6 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
      
      <!-- Stats Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        ${renderStatCard("สถิติวันนี้", "124", "+12% จากเมื่อวาน", "bg-sky-500", "trending-up")}
        ${renderStatCard("หนังสือทั้งหมด", "1,452", "อัปเดต 2 นาทีที่แล้ว", "bg-indigo-500", "book-open")}
        ${renderStatCard("สมาชิกใหม่", "8", "วันนี้", "bg-emerald-500", "user-plus")}
        ${renderStatCard("ค้างส่งคืน", "14", "ต้องการการติดตาม", "bg-rose-500", "alert-circle")}
      </div>

      <!-- Main Welcome Area -->
      <div class="bg-white p-8 lg:p-12 rounded-[2.5rem] border border-sky-100 shadow-sm min-h-[400px] flex items-center justify-center relative overflow-hidden group">
         <!-- Decorative background element -->
         <div class="absolute -right-20 -top-20 w-64 h-64 bg-sky-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-700"></div>
         
         <div class="text-center relative z-10">
            <div class="w-20 h-20 bg-gradient-to-tr from-sky-400 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-sky-100 rotate-3 group-hover:rotate-0 transition-transform duration-500">
              <i data-lucide="layout-dashboard" class="w-10 h-10 text-white"></i>
            </div>
            <h2 class="text-2xl lg:text-3xl font-black text-slate-800 tracking-tight">ยินดีต้อนรับสู่ระบบจัดการ</h2>
            <p class="text-slate-500 mt-3 max-w-sm mx-auto font-medium leading-relaxed">
              เลือกเมนูทางด้านซ้าย (หรือด้านล่างในมือถือ) เพื่อเริ่มจัดการข้อมูลห้องสมุดของคุณอย่างมีประสิทธิภาพ
            </p>
            <div class="mt-8 flex justify-center gap-3">
              <button class="px-6 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200">คู่มือการใช้งาน</button>
              <button class="px-6 py-3 border-2 border-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all active:scale-95">ดูภาพรวม</button>
            </div>
         </div>
      </div>
    </div>
  `;
}

/**
 * Helper function สำหรับวาด Card สถิติ
 */
function renderStatCard(label, value, subtext, colorClass, icon) {
  return `
    <div class="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div class="flex justify-between items-start mb-4">
        <div class="w-10 h-10 ${colorClass} bg-opacity-10 rounded-xl flex items-center justify-center text-${colorClass.split('-')[1]}-600">
          <i data-lucide="${icon}" class="w-5 h-5"></i>
        </div>
      </div>
      <h3 class="text-slate-400 font-bold uppercase text-[10px] tracking-widest mb-1">${label}</h3>
      <p class="text-3xl font-black text-slate-800">${value}</p>
      <p class="text-[10px] font-bold mt-1 uppercase tracking-wider ${subtext.includes('+') ? 'text-emerald-500' : 'text-slate-400'}">${subtext}</p>
    </div>
  `;
}

/**
 * ฟังก์ชันสำหรับผูก Event (ถ้ามี)
 */
export function mountDashboardView(container) {
  console.log("Dashboard view mounted");
}
