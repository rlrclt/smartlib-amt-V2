import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";
import {
  apiBooksCatalogList,
  apiBooksCatalogUpdate,
  apiBooksCatalogArchive,
  apiBooksCatalogUnarchive,
} from "../../data/api.js";

const STATE = {
  q: "",
  status: "active",
  page: 1,
  limit: 30,
  hasMore: false,
  loading: false,
  items: [],
  initialized: false,
  editLoading: false,
};

function toDateLabel(value) {
  const date = new Date(String(value || ""));
  if (!Number.isFinite(date.getTime())) return "-";
  return date.toLocaleDateString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toMoney(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "-";
  return n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderSkeleton(count = 6) {
  return Array.from({ length: count }).map(() => `
    <article class="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
      <div class="h-3 w-20 animate-pulse rounded bg-slate-100"></div>
      <div class="mt-3 h-5 w-2/3 animate-pulse rounded bg-slate-100"></div>
      <div class="mt-2 h-4 w-1/2 animate-pulse rounded bg-slate-100"></div>
      <div class="mt-4 h-10 animate-pulse rounded-xl bg-slate-100"></div>
    </article>
  `).join("");
}

function renderCard(item) {
  const inventory = item.inventory || { total: 0, available: 0 };
  const isArchived = String(item.status || "").toLowerCase() === "archived";
  const statusLabel = isArchived ? "ยกเลิกใช้งาน" : "ใช้งาน";
  const statusCls = isArchived
    ? "bg-slate-100 text-slate-600 border-slate-200"
    : "bg-emerald-50 text-emerald-700 border-emerald-100";

  return `
    <article class="group rounded-2xl border border-sky-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div class="mb-3 flex items-start justify-between gap-3">
        <span class="rounded-full border px-2 py-1 text-[11px] font-black ${statusCls}">${statusLabel}</span>
        <span class="text-[11px] font-bold text-slate-400">${escapeHtml(item.bookId || "-")}</span>
      </div>

      <h3 class="line-clamp-2 text-base font-black text-slate-800">${escapeHtml(item.title || "-")}</h3>
      <p class="mt-1 line-clamp-1 text-sm font-medium text-slate-500">${escapeHtml(item.author || "ไม่ระบุผู้แต่ง")}</p>

      <div class="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div class="rounded-xl bg-sky-50 px-3 py-2">
          <p class="font-bold text-slate-500">พร้อมยืม</p>
          <p class="text-sm font-black text-sky-700">${Number(inventory.available || 0).toLocaleString("th-TH")}</p>
        </div>
        <div class="rounded-xl bg-slate-50 px-3 py-2">
          <p class="font-bold text-slate-500">จำนวนทั้งหมด</p>
          <p class="text-sm font-black text-slate-700">${Number(inventory.total || 0).toLocaleString("th-TH")}</p>
        </div>
      </div>

      <div class="mt-3 space-y-1 text-xs font-medium text-slate-500">
        <p>ISBN: <span class="font-semibold text-slate-700">${escapeHtml(item.isbn || "-")}</span></p>
        <p>หมวดหมู่: <span class="font-semibold text-slate-700">${escapeHtml(item.category || "-")}</span></p>
        <p>ราคา: <span class="font-semibold text-slate-700">${toMoney(item.price)} บาท</span></p>
        <p>เพิ่มเมื่อ: <span class="font-semibold text-slate-700">${toDateLabel(item.createdAt)}</span></p>
      </div>

      <div class="mt-4 grid grid-cols-2 gap-2">
        <a href="/manage/view_book_items?bookId=${encodeURIComponent(item.bookId || "")}" data-link class="rounded-xl bg-sky-50 px-3 py-2 text-center text-xs font-black text-sky-700 transition-colors hover:bg-sky-100">ดูรหัสเล่ม</a>
        <button data-action="open-edit-book" data-book-id="${escapeHtml(item.bookId || "")}" class="rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white transition-colors hover:bg-slate-800">
          แก้ไข
        </button>
        <button data-action="toggle-archive" data-book-id="${escapeHtml(item.bookId || "")}" class="col-span-2 rounded-xl px-3 py-2 text-xs font-black text-white transition-colors ${isArchived ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"}">
          ${isArchived ? "กู้คืน" : "ย้ายไปถัง"}
        </button>
      </div>
    </article>
  `;
}

function renderList(items) {
  if (!items.length) {
    return `
      <div class="rounded-2xl border border-dashed border-sky-200 bg-sky-50/40 p-8 text-center text-sm font-semibold text-slate-500">
        ยังไม่พบข้อมูลหนังสือตามเงื่อนไข
      </div>
    `;
  }

  return `
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      ${items.map(renderCard).join("")}
    </div>
  `;
}

async function fetchCatalog({ append = false, silent = false } = {}) {
  if (STATE.loading) return;
  STATE.loading = true;

  const listEl = document.getElementById("booksCatalogList");
  const loadMoreBtn = document.getElementById("booksLoadMoreBtn");
  const statusEl = document.getElementById("booksListStatus");

  if (listEl && !append && !silent) {
    listEl.innerHTML = renderSkeleton();
  }
  if (loadMoreBtn) loadMoreBtn.disabled = true;

  try {
    const response = await apiBooksCatalogList({
      q: STATE.q,
      status: STATE.status,
      page: STATE.page,
      limit: STATE.limit,
    });

    if (!response?.ok) throw new Error(response?.error || "โหลดรายการหนังสือไม่สำเร็จ");

    const payload = response.data || {};
    const incoming = Array.isArray(payload.items) ? payload.items : [];

    STATE.items = append ? STATE.items.concat(incoming) : incoming;
    STATE.hasMore = Boolean(payload.hasMore);

    if (listEl) listEl.innerHTML = renderList(STATE.items);
    if (statusEl) {
      statusEl.textContent = `แสดง ${STATE.items.length.toLocaleString("th-TH")} รายการ`;
    }
    if (loadMoreBtn) {
      loadMoreBtn.hidden = !STATE.hasMore;
      loadMoreBtn.disabled = false;
    }
  } catch (error) {
    if (listEl) {
      listEl.innerHTML = `
        <div class="rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          ${escapeHtml(String(error?.message || error))}
        </div>
      `;
    }
    showToast(String(error?.message || error));
  } finally {
    STATE.loading = false;
  }
}

function bindStatusTabs(root) {
  root.querySelectorAll("[data-books-filter]").forEach((el) => {
    const active = String(el.getAttribute("data-books-filter")) === STATE.status;
    el.classList.toggle("bg-sky-600", active);
    el.classList.toggle("text-white", active);
    el.classList.toggle("text-slate-500", !active);
    el.classList.toggle("hover:bg-slate-100", !active);
  });

  root.querySelectorAll("[data-books-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const status = String(btn.getAttribute("data-books-filter") || "active");
      if (status === STATE.status) return;
      STATE.status = status;
      STATE.page = 1;
      root.querySelectorAll("[data-books-filter]").forEach((el) => {
        const active = String(el.getAttribute("data-books-filter")) === status;
        el.classList.toggle("bg-sky-600", active);
        el.classList.toggle("text-white", active);
        el.classList.toggle("text-slate-500", !active);
        el.classList.toggle("hover:bg-slate-100", !active);
      });
      fetchCatalog({ append: false });
    });
  });
}

async function toggleArchive(bookId) {
  if (!bookId) return;

  const target = STATE.items.find((item) => String(item.bookId) === String(bookId));
  const isArchived = String(target?.status || "") === "archived";

  try {
    const response = isArchived
      ? await apiBooksCatalogUnarchive(bookId)
      : await apiBooksCatalogArchive(bookId);

    if (!response?.ok) throw new Error(response?.error || "บันทึกสถานะไม่สำเร็จ");

    showToast(isArchived ? "กู้คืนหนังสือแล้ว" : "ย้ายหนังสือไปถังแล้ว");
    STATE.page = 1;
    await fetchCatalog({ append: false });
  } catch (error) {
    showToast(String(error?.message || error));
  }
}

function openEditModal(root, item) {
  if (!root || !item) return;
  const modal = root.querySelector("#booksEditModal");
  const form = root.querySelector("#booksEditForm");
  if (!modal || !form) return;

  form.elements.bookId.value = String(item.bookId || "");
  form.elements.title.value = String(item.title || "");
  form.elements.isbn.value = String(item.isbn || "");
  form.elements.author.value = String(item.author || "");
  form.elements.publisher.value = String(item.publisher || "");
  form.elements.category.value = String(item.category || "");
  form.elements.callNumber.value = String(item.callNumber || "");
  form.elements.edition.value = String(item.edition || "");
  form.elements.language.value = String(item.language || "");
  form.elements.price.value = Number(item.price || 0);
  form.elements.coverUrl.value = String(item.coverUrl || "");
  form.elements.tags.value = String(item.tags || "");
  form.elements.description.value = String(item.description || "");

  modal.classList.remove("invisible", "opacity-0", "pointer-events-none");
}

function closeEditModal(root) {
  const modal = root.querySelector("#booksEditModal");
  if (!modal) return;
  modal.classList.add("invisible", "opacity-0", "pointer-events-none");
}

function setEditLoading(root, loading) {
  STATE.editLoading = loading;
  const submit = root.querySelector("#booksEditSubmitBtn");
  if (!submit) return;
  submit.disabled = loading;
  submit.textContent = loading ? "กำลังบันทึก..." : "บันทึกการแก้ไข";
}

export function renderManageBooksView() {
  return `
    <section class="p-4 lg:p-6">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-black tracking-tight text-slate-800">จัดการหนังสือ</h2>
          <p class="text-sm font-medium text-slate-500">ค้นหา, archive และดูจำนวนเล่มตามรหัสแม่</p>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <a data-link href="/manage/register_books" class="rounded-xl bg-sky-600 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-sky-700">ลงทะเบียนหนังสือใหม่</a>
          <a data-link href="/manage/add_book_items" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-slate-800">เพิ่มจำนวนเล่ม</a>
          <a data-link href="/manage/books/select-print" class="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-700 hover:bg-emerald-100">เลือกพิมพ์บาร์โค้ด</a>
          <a data-link href="/manage/view_book_items" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">คลังรหัสเล่ม</a>
        </div>
      </div>

      <div class="mb-4 rounded-2xl border border-sky-100 bg-white p-3 shadow-sm sm:p-4">
        <div class="grid gap-3 md:grid-cols-[1fr_auto]">
          <label class="relative block">
            <span class="mb-1 block text-xs font-black uppercase tracking-widest text-slate-400">ค้นหา (ชื่อ, ISBN, Barcode)</span>
            <input id="booksSearchInput" type="text" placeholder="เช่น BK-001-02 หรือ 978..." class="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-sky-400 focus:ring-4 focus:ring-sky-100">
          </label>
          <button id="booksSearchBtn" class="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white hover:bg-slate-800">ค้นหา</button>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-2" id="booksStatusTabs">
          <button data-books-filter="active" class="rounded-full bg-sky-600 px-4 py-2 text-sm font-black text-white">ใช้งาน</button>
          <button data-books-filter="archived" class="rounded-full px-4 py-2 text-sm font-black text-slate-500 hover:bg-slate-100">ยกเลิกใช้งาน</button>
          <button data-books-filter="all" class="rounded-full px-4 py-2 text-sm font-black text-slate-500 hover:bg-slate-100">ทั้งหมด</button>
          <span id="booksListStatus" class="ml-auto text-xs font-black uppercase tracking-wider text-slate-400">Loading...</span>
        </div>
      </div>

      <div id="booksCatalogList"></div>

      <div class="mt-5 flex justify-center">
        <button id="booksLoadMoreBtn" hidden class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">โหลดเพิ่ม</button>
      </div>

      <div id="booksEditModal" class="invisible pointer-events-none fixed inset-0 z-[120] bg-slate-900/40 p-4 opacity-0 transition-opacity">
        <div class="mx-auto mt-10 max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-sky-100 bg-white p-4 shadow-2xl lg:p-5">
          <div class="mb-4 flex items-center justify-between gap-2">
            <h3 class="text-lg font-black text-slate-800">แก้ไขข้อมูลหนังสือ</h3>
            <button id="booksEditCloseBtn" type="button" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-50">ปิด</button>
          </div>

          <form id="booksEditForm" class="grid gap-3">
            <input type="hidden" name="bookId" />
            <div class="grid gap-3 md:grid-cols-2">
              <label class="grid gap-1 text-sm font-semibold text-slate-700">ชื่อหนังสือ *
                <input name="title" required class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
              </label>
              <label class="grid gap-1 text-sm font-semibold text-slate-700">ISBN
                <input name="isbn" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
              </label>
              <label class="grid gap-1 text-sm font-semibold text-slate-700">ผู้แต่ง
                <input name="author" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
              </label>
              <label class="grid gap-1 text-sm font-semibold text-slate-700">สำนักพิมพ์
                <input name="publisher" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
              </label>
              <label class="grid gap-1 text-sm font-semibold text-slate-700">หมวดหมู่
                <input name="category" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
              </label>
              <label class="grid gap-1 text-sm font-semibold text-slate-700">เลขเรียกหนังสือ
                <input name="callNumber" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
              </label>
              <label class="grid gap-1 text-sm font-semibold text-slate-700">พิมพ์ครั้งที่
                <input name="edition" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
              </label>
              <label class="grid gap-1 text-sm font-semibold text-slate-700">ภาษา
                <input name="language" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
              </label>
              <label class="grid gap-1 text-sm font-semibold text-slate-700">ราคา
                <input name="price" type="number" min="0" step="0.01" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
              </label>
              <label class="grid gap-1 text-sm font-semibold text-slate-700">ปก (URL)
                <input name="coverUrl" type="url" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
              </label>
              <label class="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">Tags
                <input name="tags" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100" />
              </label>
              <label class="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">คำอธิบาย
                <textarea name="description" rows="3" class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100"></textarea>
              </label>
            </div>

            <div class="mt-1 flex items-center justify-end gap-2">
              <button id="booksEditCancelBtn" type="button" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-50">ยกเลิก</button>
              <button id="booksEditSubmitBtn" type="submit" class="rounded-xl bg-sky-600 px-4 py-2 text-sm font-black text-white hover:bg-sky-700">บันทึกการแก้ไข</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  `;
}

export function mountManageBooksView(root) {
  if (!root) return;

  const searchInput = root.querySelector("#booksSearchInput");
  const searchBtn = root.querySelector("#booksSearchBtn");
  const loadMoreBtn = root.querySelector("#booksLoadMoreBtn");
  const editForm = root.querySelector("#booksEditForm");
  const editCloseBtn = root.querySelector("#booksEditCloseBtn");
  const editCancelBtn = root.querySelector("#booksEditCancelBtn");

  if (searchInput) searchInput.value = STATE.q;
  bindStatusTabs(root);

  const listEl = root.querySelector("#booksCatalogList");
  const statusEl = root.querySelector("#booksListStatus");
  if (STATE.initialized && listEl) {
    listEl.innerHTML = renderList(STATE.items);
    if (statusEl) statusEl.textContent = `แสดง ${STATE.items.length.toLocaleString("th-TH")} รายการ`;
    if (loadMoreBtn) loadMoreBtn.hidden = !STATE.hasMore;
  }

  searchBtn?.addEventListener("click", () => {
    STATE.q = String(searchInput?.value || "").trim();
    STATE.page = 1;
    fetchCatalog({ append: false });
  });

  searchInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    STATE.q = String(searchInput?.value || "").trim();
    STATE.page = 1;
    fetchCatalog({ append: false });
  });

  loadMoreBtn?.addEventListener("click", () => {
    if (!STATE.hasMore || STATE.loading) return;
    STATE.page += 1;
    fetchCatalog({ append: true });
  });

  root.addEventListener("click", (event) => {
    const editBtn = event.target.closest('[data-action="open-edit-book"]');
    if (editBtn) {
      const bookId = String(editBtn.getAttribute("data-book-id") || "");
      const item = STATE.items.find((row) => String(row.bookId) === bookId);
      if (item) openEditModal(root, item);
      return;
    }

    const btn = event.target.closest('[data-action="toggle-archive"]');
    if (!btn) return;
    toggleArchive(btn.getAttribute("data-book-id"));
  });

  editCloseBtn?.addEventListener("click", () => closeEditModal(root));
  editCancelBtn?.addEventListener("click", () => closeEditModal(root));
  root.querySelector("#booksEditModal")?.addEventListener("click", (event) => {
    if (event.target.id === "booksEditModal") closeEditModal(root);
  });

  editForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (STATE.editLoading) return;
    const formData = new FormData(editForm);
    const bookId = String(formData.get("bookId") || "").trim();
    const payload = {
      title: String(formData.get("title") || "").trim(),
      isbn: String(formData.get("isbn") || "").trim(),
      author: String(formData.get("author") || "").trim(),
      publisher: String(formData.get("publisher") || "").trim(),
      category: String(formData.get("category") || "").trim(),
      callNumber: String(formData.get("callNumber") || "").trim(),
      edition: String(formData.get("edition") || "").trim(),
      language: String(formData.get("language") || "").trim(),
      coverUrl: String(formData.get("coverUrl") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      tags: String(formData.get("tags") || "").trim(),
      price: Number(formData.get("price") || 0),
    };

    setEditLoading(root, true);
    try {
      const response = await apiBooksCatalogUpdate(bookId, payload);
      if (!response?.ok) throw new Error(response?.error || "บันทึกข้อมูลไม่สำเร็จ");
      showToast("บันทึกข้อมูลหนังสือแล้ว");
      closeEditModal(root);
      STATE.page = 1;
      await fetchCatalog({ append: false });
    } catch (error) {
      showToast(String(error?.message || error));
    } finally {
      setEditLoading(root, false);
    }
  });

  if (!STATE.initialized) {
    STATE.initialized = true;
    fetchCatalog({ append: false });
  } else {
    // Silent background update to keep data fresh without flashing skeleton
    fetchCatalog({ append: false, silent: true });
  }
}
