import { apiBooksCatalogList } from "../../data/api.js";
import { showToast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/html.js";

const STATE = {
  loading: false,
  items: [],
  page: 1,
  hasMore: false,
  q: "",
};

function renderList_(root) {
  const list = root.querySelector("#memberBooksList");
  const summary = root.querySelector("#memberBooksSummary");
  const prev = root.querySelector("#memberBooksPrev");
  const next = root.querySelector("#memberBooksNext");
  if (!list) return;

  if (summary) {
    const pageLabel = `หน้า ${STATE.page}`;
    summary.textContent = STATE.loading ? "กำลังโหลด..." : `${pageLabel} · ${STATE.items.length} รายการ`;
  }
  if (prev) prev.disabled = STATE.page <= 1 || STATE.loading;
  if (next) next.disabled = !STATE.hasMore || STATE.loading;

  if (STATE.loading) {
    list.innerHTML = '<div class="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-500">กำลังโหลดรายการหนังสือ...</div>';
    return;
  }

  if (!STATE.items.length) {
    list.innerHTML = '<div class="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500">ไม่พบหนังสือตามเงื่อนไขค้นหา</div>';
    return;
  }

  list.innerHTML = `
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      ${STATE.items
        .map((item) => {
          const available = Number(item.inventory?.available || 0);
          const total = Number(item.inventory?.total || 0);
          const isAvailable = available > 0;
          return `
            <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p class="text-sm font-black text-slate-800">${escapeHtml(item.title || "-")}</p>
              <p class="mt-1 text-xs font-semibold text-slate-500">${escapeHtml(item.author || "ไม่ระบุผู้แต่ง")}</p>
              <div class="mt-2 flex flex-wrap gap-2 text-[11px] font-bold">
                <span class="rounded-full bg-slate-100 px-2 py-1 text-slate-600">${escapeHtml(item.category || "ทั่วไป")}</span>
                <span class="rounded-full px-2 py-1 ${isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}">
                  ${isAvailable ? `พร้อมยืม ${available}/${total}` : `ไม่ว่าง ${available}/${total}`}
                </span>
              </div>
              ${item.description ? `<p class="mt-3 line-clamp-3 text-xs text-slate-500">${escapeHtml(item.description)}</p>` : ""}
            </article>
          `;
        })
        .join("")}
    </div>
  `;
}

async function load_(root) {
  STATE.loading = true;
  renderList_(root);
  try {
    const res = await apiBooksCatalogList({
      status: "active",
      q: STATE.q,
      page: STATE.page,
      limit: 12,
    });
    if (!res?.ok) throw new Error(res?.error || "โหลดรายการหนังสือไม่สำเร็จ");
    STATE.items = Array.isArray(res.data?.items) ? res.data.items : [];
    STATE.hasMore = Boolean(res.data?.hasMore);
  } catch (err) {
    STATE.items = [];
    STATE.hasMore = false;
    showToast(err?.message || "โหลดรายการหนังสือไม่สำเร็จ");
  } finally {
    STATE.loading = false;
    renderList_(root);
  }
}

export function renderMemberBooksView() {
  return `
    <section id="memberBooksRoot" class="view space-y-4">
      <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form id="memberBooksSearchForm" class="flex flex-col gap-2 sm:flex-row">
          <input id="memberBooksSearchInput" type="search" placeholder="ค้นหาจากชื่อหนังสือ, ผู้แต่ง, หมวดหมู่, ISBN" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <button type="submit" class="rounded-xl bg-sky-600 px-4 py-2 text-sm font-black text-white hover:bg-sky-700">ค้นหา</button>
        </form>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div class="mb-3 flex items-center justify-between gap-2">
          <p id="memberBooksSummary" class="text-xs font-black uppercase tracking-wide text-slate-500">พร้อมใช้งาน</p>
          <div class="flex items-center gap-2">
            <button id="memberBooksPrev" type="button" class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-100">ก่อนหน้า</button>
            <button id="memberBooksNext" type="button" class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600 hover:bg-slate-100">ถัดไป</button>
          </div>
        </div>
        <div id="memberBooksList"></div>
      </div>
    </section>
  `;
}

export function mountMemberBooksView(container) {
  const root = container.querySelector("#memberBooksRoot");
  if (!root) return;

  const form = root.querySelector("#memberBooksSearchForm");
  const input = root.querySelector("#memberBooksSearchInput");
  const prev = root.querySelector("#memberBooksPrev");
  const next = root.querySelector("#memberBooksNext");

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    STATE.q = String(input?.value || "").trim();
    STATE.page = 1;
    load_(root);
  });

  prev?.addEventListener("click", () => {
    if (STATE.page <= 1 || STATE.loading) return;
    STATE.page -= 1;
    load_(root);
  });

  next?.addEventListener("click", () => {
    if (!STATE.hasMore || STATE.loading) return;
    STATE.page += 1;
    load_(root);
  });

  load_(root);
}
