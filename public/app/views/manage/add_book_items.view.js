import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";
import {
  apiBooksCatalogList,
  apiBookItemsAddCopies,
} from "../../data/api.js";

let catalogItems = [];

function buildBookOptions(items) {
  return items.map((item) => {
    const id = String(item.bookId || "");
    const title = String(item.title || "-");
    return `<option value="${escapeHtml(id)}">${escapeHtml(id)} - ${escapeHtml(title)}</option>`;
  }).join("");
}

async function loadBookOptions(selectEl, statusEl) {
  if (!selectEl) return;
  if (statusEl) statusEl.textContent = "กำลังโหลดรายการหนังสือ...";

  try {
    const response = await apiBooksCatalogList({ status: "active", page: 1, limit: 100 });
    if (!response?.ok) throw new Error(response?.error || "โหลดรายการหนังสือไม่สำเร็จ");

    catalogItems = Array.isArray(response?.data?.items) ? response.data.items : [];

    if (!catalogItems.length) {
      selectEl.innerHTML = `<option value="">ยังไม่มีข้อมูลหนังสือ</option>`;
      if (statusEl) statusEl.textContent = "ยังไม่มีหนังสือที่ active";
      return;
    }

    selectEl.innerHTML = `<option value="">-- เลือกหนังสือ --</option>${buildBookOptions(catalogItems)}`;
    if (statusEl) statusEl.textContent = `พบ ${catalogItems.length.toLocaleString("th-TH")} รายการ`;
  } catch (error) {
    const message = String(error?.message || error);
    if (statusEl) statusEl.textContent = message;
    showToast(message);
  }
}

function toPayload(form) {
  const data = new FormData(form);
  return {
    bookId: String(data.get("bookId") || "").trim(),
    count: Number(data.get("count") || 1),
    defaults: {
      location: String(data.get("location") || "").trim(),
      purchasePrice: Number(data.get("purchasePrice") || 0),
      condition: String(data.get("condition") || "good").trim(),
      notes: String(data.get("notes") || "").trim(),
    },
  };
}

function setSubmitting(button, loading) {
  if (!button) return;
  button.disabled = loading;
  button.textContent = loading ? "กำลังเพิ่ม..." : "เพิ่มรหัสเล่ม";
}

export function renderAddBookItemsView() {
  return `
    <section class="p-4 lg:p-6">
      <div class="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-black tracking-tight text-slate-800">เพิ่มจำนวนเล่มหนังสือ</h2>
          <p class="text-sm font-medium text-slate-500">เพิ่มรหัสลูกต่อจากลำดับเดิมแบบอัตโนมัติ</p>
        </div>
        <a data-link href="/manage/books" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">กลับหน้ารายการหนังสือ</a>
      </div>

      <form id="addBookItemsForm" class="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm lg:p-5">
        <div class="grid gap-4 md:grid-cols-2">
          <label class="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">
            เลือกหนังสือ *
            <select id="addItemsBookId" name="bookId" required class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"></select>
            <span id="addItemsBookStatus" class="text-xs font-bold text-slate-400">กำลังโหลดรายการ...</span>
          </label>

          <label class="grid gap-1 text-sm font-semibold text-slate-700">
            จำนวนเล่มที่ต้องการเพิ่ม *
            <input name="count" type="number" min="1" max="500" value="1" required class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
          </label>

          <label class="grid gap-1 text-sm font-semibold text-slate-700">
            ตำแหน่งจัดเก็บ
            <input name="location" placeholder="ชั้น A1-02" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
          </label>

          <label class="grid gap-1 text-sm font-semibold text-slate-700">
            ราคาที่ซื้อ
            <input name="purchasePrice" type="number" min="0" step="0.01" value="0" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
          </label>

          <label class="grid gap-1 text-sm font-semibold text-slate-700">
            สภาพเล่ม
            <select name="condition" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
              <option value="good">good</option>
              <option value="fair">fair</option>
              <option value="poor">poor</option>
            </select>
          </label>

          <label class="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">
            หมายเหตุ
            <input name="notes" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
          </label>
        </div>

        <div class="mt-5 flex flex-wrap items-center gap-2">
          <button id="addBookItemsSubmit" type="submit" class="rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800">เพิ่มรหัสเล่ม</button>
          <button id="addBookItemsReload" type="button" class="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 hover:bg-slate-50">รีเฟรชรายการหนังสือ</button>
        </div>
      </form>

      <div id="addBookItemsResult" class="mt-4"></div>
    </section>
  `;
}

export function mountAddBookItemsView(root) {
  if (!root) return;

  const form = root.querySelector("#addBookItemsForm");
  const selectEl = root.querySelector("#addItemsBookId");
  const statusEl = root.querySelector("#addItemsBookStatus");
  const submit = root.querySelector("#addBookItemsSubmit");
  const reload = root.querySelector("#addBookItemsReload");
  const result = root.querySelector("#addBookItemsResult");

  reload?.addEventListener("click", () => loadBookOptions(selectEl, statusEl));

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form) return;

    const payload = toPayload(form);
    if (!payload.bookId) {
      showToast("กรุณาเลือกหนังสือก่อน");
      return;
    }

    setSubmitting(submit, true);

    try {
      const response = await apiBookItemsAddCopies(payload);
      if (!response?.ok) throw new Error(response?.error || "เพิ่มรหัสเล่มไม่สำเร็จ");

      const data = response.data || {};
      if (result) {
        result.innerHTML = `
          <div class="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
            เพิ่มรหัสเล่มสำเร็จ: หนังสือ <span class="font-black">${escapeHtml(data.bookId || "-")}</span> จำนวน <span class="font-black">${Number(data.added || 0).toLocaleString("th-TH")}</span> รายการ
            <div class="mt-2">
              <a data-link href="/manage/view_book_items?bookId=${encodeURIComponent(data.bookId || "")}" class="font-black underline">ไปดูรายการรหัสเล่ม</a>
            </div>
          </div>
        `;
      }

      showToast("เพิ่มรหัสเล่มสำเร็จ");
      form.reset();
      selectEl.value = payload.bookId;
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

  loadBookOptions(selectEl, statusEl);
}
