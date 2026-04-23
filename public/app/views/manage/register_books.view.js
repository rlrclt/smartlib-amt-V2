import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";
import { apiBooksCatalogCreate } from "../../data/api.js";

function toPayload(form) {
  const data = new FormData(form);
  return {
    isbn: String(data.get("isbn") || "").trim(),
    title: String(data.get("title") || "").trim(),
    author: String(data.get("author") || "").trim(),
    publisher: String(data.get("publisher") || "").trim(),
    category: String(data.get("category") || "").trim(),
    callNumber: String(data.get("callNumber") || "").trim(),
    edition: String(data.get("edition") || "").trim(),
    language: String(data.get("language") || "").trim(),
    coverUrl: String(data.get("coverUrl") || "").trim(),
    description: String(data.get("description") || "").trim(),
    tags: String(data.get("tags") || "").trim(),
    price: Number(data.get("price") || 0),
    initialCopies: Number(data.get("initialCopies") || 1),
    location: String(data.get("location") || "").trim(),
    purchasePrice: Number(data.get("purchasePrice") || 0),
    condition: String(data.get("condition") || "good").trim(),
    notes: String(data.get("notes") || "").trim(),
  };
}

function setSubmitting(button, loading) {
  if (!button) return;
  button.disabled = loading;
  button.textContent = loading ? "กำลังบันทึก..." : "บันทึกข้อมูลหนังสือ";
}

export function renderRegisterBooksView() {
  return `
    <section class="p-4 lg:p-6">
      <div class="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-black tracking-tight text-slate-800">ลงทะเบียนหนังสือใหม่</h2>
          <p class="text-sm font-medium text-slate-500">บันทึกรหัสแม่และสร้างรหัสลูกชุดแรกอัตโนมัติ</p>
        </div>
        <a data-link href="/manage/books" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">กลับหน้ารายการหนังสือ</a>
      </div>

      <form id="registerBooksForm" class="grid gap-4">
        <div class="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm lg:p-5">
          <h3 class="mb-4 text-sm font-black uppercase tracking-widest text-slate-400">ข้อมูลบรรณานุกรม</h3>
          <div class="grid gap-3 md:grid-cols-2">
            <label class="grid gap-1 text-sm font-semibold text-slate-700">ISBN
              <input name="isbn" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" placeholder="978-...">
            </label>
            <label class="grid gap-1 text-sm font-semibold text-slate-700">ชื่อหนังสือ *
              <input name="title" required class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" placeholder="ชื่อหนังสือ">
            </label>
            <label class="grid gap-1 text-sm font-semibold text-slate-700">ผู้แต่ง
              <input name="author" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
            </label>
            <label class="grid gap-1 text-sm font-semibold text-slate-700">สำนักพิมพ์
              <input name="publisher" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
            </label>
            <label class="grid gap-1 text-sm font-semibold text-slate-700">หมวดหมู่
              <input name="category" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" placeholder="เทคโนโลยี">
            </label>
            <label class="grid gap-1 text-sm font-semibold text-slate-700">
              <span class="inline-flex items-center gap-2">
                <span>เลขเรียกหนังสือ</span>
                <span class="group relative inline-flex">
                  <span tabindex="0" class="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-sky-200 bg-sky-50 text-[11px] font-black text-sky-700">i</span>
                  <span class="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-lg border border-sky-100 bg-white px-3 py-2 text-xs font-medium leading-relaxed text-slate-600 shadow-lg opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                    เลขเรียกหนังสือ คือรหัสตำแหน่งจัดวางบนชั้น (เช่น <code>005.133 ส234ก</code>) เพื่อช่วยให้ค้นหาหนังสือในห้องสมุดได้ถูกชั้นและรวดเร็ว
                  </span>
                </span>
              </span>
              <input name="callNumber" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" placeholder="005.133 ...">
            </label>
            <label class="grid gap-1 text-sm font-semibold text-slate-700">พิมพ์ครั้งที่
              <input name="edition" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
            </label>
            <label class="grid gap-1 text-sm font-semibold text-slate-700">ภาษา
              <input name="language" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" placeholder="ไทย">
            </label>
            <label class="grid gap-1 text-sm font-semibold text-slate-700">ราคาหน้าปก
              <input name="price" type="number" step="0.01" min="0" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" value="0">
            </label>
            <label class="grid gap-1 text-sm font-semibold text-slate-700">ปกหนังสือ (URL)
              <input name="coverUrl" type="url" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
            </label>
            <label class="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">Tags
              <input name="tags" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" placeholder="เช่น JS, Web, Coding">
            </label>
            <label class="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">คำอธิบาย
              <textarea name="description" rows="3" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"></textarea>
            </label>
          </div>
        </div>

        <div class="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm lg:p-5">
          <h3 class="mb-4 text-sm font-black uppercase tracking-widest text-slate-400">สร้างรหัสเล่มชุดแรก</h3>
          <div class="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <label class="grid gap-1 text-sm font-semibold text-slate-700">จำนวนเล่มเริ่มต้น *
              <input name="initialCopies" required type="number" min="1" max="200" value="1" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
            </label>
            <label class="grid gap-1 text-sm font-semibold text-slate-700">ตำแหน่งจัดเก็บ
              <input name="location" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" placeholder="ชั้น A1-02">
            </label>
            <label class="grid gap-1 text-sm font-semibold text-slate-700">สภาพเล่ม
              <select name="condition" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
                <option value="good">good</option>
                <option value="fair">fair</option>
                <option value="poor">poor</option>
              </select>
            </label>
            <label class="grid gap-1 text-sm font-semibold text-slate-700">ราคาที่ซื้อ
              <input name="purchasePrice" type="number" step="0.01" min="0" value="0" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
            </label>
            <label class="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">หมายเหตุ
              <input name="notes" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
            </label>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button id="registerBooksSubmit" type="submit" class="rounded-xl bg-sky-600 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-sky-700">บันทึกข้อมูลหนังสือ</button>
          <button id="registerBooksReset" type="button" class="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">ล้างฟอร์ม</button>
        </div>
      </form>

      <div id="registerBooksResult" class="mt-4"></div>
    </section>
  `;
}

export function mountRegisterBooksView(root) {
  if (!root) return;

  const form = root.querySelector("#registerBooksForm");
  const submit = root.querySelector("#registerBooksSubmit");
  const reset = root.querySelector("#registerBooksReset");
  const result = root.querySelector("#registerBooksResult");

  reset?.addEventListener("click", () => {
    form?.reset();
    if (result) result.innerHTML = "";
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form) return;

    const payload = toPayload(form);
    setSubmitting(submit, true);

    try {
      const response = await apiBooksCatalogCreate(payload);
      if (!response?.ok) throw new Error(response?.error || "บันทึกข้อมูลไม่สำเร็จ");

      const data = response.data || {};
      if (result) {
        result.innerHTML = `
          <div class="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            บันทึกสำเร็จ: <span class="font-black">${escapeHtml(data.bookId || "-")}</span> และสร้างรหัสเล่มจำนวน <span class="font-black">${Number(data.createdCopies || 0).toLocaleString("th-TH")}</span> รายการ
            <div class="mt-2">
              <a data-link href="/manage/view_book_items?bookId=${encodeURIComponent(data.bookId || "")}" class="font-black underline">ไปดูรายการรหัสเล่ม</a>
            </div>
          </div>
        `;
      }
      showToast("บันทึกหนังสือสำเร็จ");
      form.reset();
    } catch (error) {
      const message = String(error?.message || error);
      if (result) {
        result.innerHTML = `<div class="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">${escapeHtml(message)}</div>`;
      }
      showToast(message);
    } finally {
      setSubmitting(submit, false);
    }
  });
}
