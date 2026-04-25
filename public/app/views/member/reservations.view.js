export function renderMemberReservationsView() {
  return `
    <section class="view space-y-4">
      <article class="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
        <h2 class="text-base font-black text-slate-800">การจองของฉัน</h2>
        <p class="mt-1 text-xs font-semibold text-slate-500">รองรับแสดงคิวจองและการแจ้งเตือนเมื่อหนังสือพร้อมรับ</p>
      </article>

      <article class="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
        <p class="text-sm font-black text-slate-700">MVP: หน้านี้เปิดแล้ว แต่ระบบจองแบบเต็มกำลังเชื่อม backend</p>
        <p class="mt-2 text-xs font-semibold text-slate-500">เฟสถัดไปจะเพิ่ม create/cancel reservation และลำดับคิวแบบเรียลไทม์</p>
      </article>
    </section>
  `;
}

export function mountMemberReservationsView() {
  // reserved for next phase
}
