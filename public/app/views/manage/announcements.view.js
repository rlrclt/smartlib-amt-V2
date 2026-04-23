import { showToast } from "../../components/toast.js";
import * as apiClient from "../../data/api.js";
import { GAS_URL } from "../../config.js";
import { gasJsonp } from "../../data/gas_jsonp.js";
import { escapeHtml } from "../../utils/html.js";

const MANAGE_ANNOUNCEMENTS_VIEW_STATE = {
items: [],
activeFilter: "all",
loaded: false,
};

// --- Logic Helpers (คงเดิมแต่ปรับปรุงการ Mapping) ---
function readAuthSession() {
const local = window.localStorage.getItem("smartlib.auth");
const session = window.sessionStorage.getItem("smartlib.auth");
const raw = local || session;
if (!raw) return null;
try { return JSON.parse(raw); } catch { return null; }
}

function toDateInputValue(value) {
const text = String(value || "").trim();
if (!text) return "";
const d = new Date(text);
if (!Number.isFinite(d.getTime())) return "";
return d.toISOString().slice(0, 10);
}

function toDateTimeLabel(value) {
const text = String(value || "").trim();
if (!text) return "-";
const d = new Date(text);
if (!Number.isFinite(d.getTime())) return text;
return d.toLocaleString("th-TH", {
year: "numeric",
month: "2-digit",
day: "2-digit",
hour: "2-digit",
minute: "2-digit",
});
}

function mapCategoryLabel(category) {
const key = String(category || "").toLowerCase();
if (key === "event") return "Event";
if (key === "update") return "Update";
return "Notice";
}

function mapCategoryLabelTh(category) {
const key = String(category || "").toLowerCase();
if (key === "event") return "Event (กิจกรรม)";
if (key === "update") return "Update (อัปเดต)";
return "Notice (ประกาศทั่วไป)";
}

function mapStatusConfig(status) {
const key = String(status || "").toLowerCase();
if (key === "published") return { label: "เผยแพร่แล้ว", dot: "bg-emerald-500", text: "text-emerald-600" };
if (key === "archived") return { label: "เก็บถาวร", dot: "bg-slate-400", text: "text-slate-500" };
return { label: "ฉบับร่าง", dot: "bg-amber-500", text: "text-amber-600" };
}

// --- API Calls (คงเดิม) ---
function callAnnouncementList(params = {}) {
if (typeof apiClient.apiAnnouncementList === "function") return apiClient.apiAnnouncementList(params);
return gasJsonp(GAS_URL, { action: "announcement_list", ...params });
}
function callAnnouncementCreate(payload) {
if (typeof apiClient.apiAnnouncementCreate === "function") return apiClient.apiAnnouncementCreate(payload);
return gasJsonp(GAS_URL, { action: "announcement_create", payload: JSON.stringify(payload) });
}
function callAnnouncementUpdate(id, payload) {
if (typeof apiClient.apiAnnouncementUpdate === "function") return apiClient.apiAnnouncementUpdate(id, payload);
return gasJsonp(GAS_URL, { action: "announcement_update", payload: JSON.stringify({ id, ...payload }) });
}
function callAnnouncementArchive(id) {
if (typeof apiClient.apiAnnouncementArchive === "function") return apiClient.apiAnnouncementArchive(id);
return gasJsonp(GAS_URL, { action: "announcement_archive", payload: JSON.stringify({ id }) });
}

function renderListSkeleton(count = 5) {
return Array.from({ length: count }).map(() => `
  <div class="px-4 py-4 sm:px-6">
    <div class="mb-2 h-3 w-24 rounded ann-skeleton"></div>
    <div class="mb-2 h-4 w-2/3 rounded ann-skeleton"></div>
    <div class="h-3 w-1/2 rounded ann-skeleton"></div>
  </div>
`).join("");
}

// --- UI Templates ---
export function renderManageAnnouncementsView() {
return `
<style>
@keyframes annShimmer {
  0% { background-position: -220px 0; }
  100% { background-position: calc(220px + 100%) 0; }
}
.ann-skeleton {
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 37%, #f1f5f9 63%);
  background-size: 220px 100%;
  animation: annShimmer 1.25s infinite linear;
}
@keyframes annPop {
  0% { transform: scale(0.98); opacity: 0.7; }
  100% { transform: scale(1); opacity: 1; }
}
.ann-list-pop { animation: annPop 220ms ease-out; }
</style>
<div class="p-6 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4">
  <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 class="text-2xl font-black tracking-tight text-slate-800">จัดการประกาศ</h2>
      <p class="text-sm font-medium text-slate-500">สร้างและแก้ไขข่าวสารภายในระบบ</p>
    </div>
    <button id="annOpenCreateBtn" class="flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-sky-200 transition-all hover:opacity-95">
      <i data-lucide="plus" class="h-4 w-4"></i>
      <span>สร้างใหม่</span>
    </button>
  </div>

  <!-- Filter Tabs -->
  <div id="annFilters" class="mb-4 flex items-center gap-1 overflow-x-auto no-scrollbar">
      <button data-filter="all" class="whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors bg-sky-600 text-white">ทั้งหมด <span id="annCountAll" class="ml-1">0</span></button>
      <button data-filter="published" class="whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors text-slate-500 hover:bg-slate-100">เผยแพร่แล้ว <span id="annCountPublished" class="ml-1">0</span></button>
      <button data-filter="draft" class="whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors text-slate-500 hover:bg-slate-100">ฉบับร่าง <span id="annCountDraft" class="ml-1">0</span></button>
      <button data-filter="archived" class="whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-colors text-slate-500 hover:bg-slate-100">เก็บถาวร <span id="annCountArchived" class="ml-1">0</span></button>
      <div class="ml-auto flex items-center gap-2 pl-4 border-l border-slate-100">
         <span class="rounded-full border border-sky-100 bg-sky-50 px-2 py-1 text-[11px] font-black text-sky-700 whitespace-nowrap">
           วิวรวม <span id="annCountViews">0</span>
         </span>
         <button id="annReloadBtn" class="p-2 text-slate-400 hover:text-sky-600 transition-colors disabled:opacity-50">
           <i id="annReloadIcon" data-lucide="rotate-cw" class="w-5 h-5"></i>
         </button>
      </div>
  </div>

  <div id="annListStatus" class="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Loading records...</div>

  <!-- The List -->
  <div class="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-sm">
    <div id="annList" class="divide-y divide-slate-100">
      <!-- Rows injected here -->
    </div>
  </div>
</div>

  <!-- Native Side Panel / Modal for Editor -->
  <div id="annEditorPanel" class="fixed inset-0 z-[100] invisible opacity-0 transition-all duration-300 pointer-events-none">
    <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" id="annOverlay"></div>
    <div class="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl flex flex-col translate-x-full transition-transform duration-300 ease-out overflow-hidden" id="annDrawer">
      
      <div class="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h3 id="annEditorTitle" class="text-lg font-black text-slate-800">สร้างประกาศ</h3>
        <button id="annCloseFormBtn" class="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <i data-lucide="x" class="w-6 h-6 text-slate-400"></i>
        </button>
      </div>

      <form id="annForm" class="flex-1 overflow-y-auto p-6 space-y-6">
        <input type="hidden" name="id" />
        
        <div class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-xs font-black text-slate-400 uppercase tracking-wider">หัวข้อประกาศ</label>
            <input name="title" required maxlength="140" class="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-base font-medium focus:ring-2 focus:ring-sky-500 transition-all" placeholder="ใส่ชื่อหัวข้อที่นี่...">
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-black text-slate-400 uppercase tracking-wider">สรุปเนื้อหา</label>
            <textarea name="summary" required rows="2" maxlength="320" class="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-sky-500 transition-all" placeholder="ข้อความสั้นๆ สำหรับแสดงหน้าแรก..."></textarea>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-black text-slate-400 uppercase tracking-wider">เนื้อหาละเอียด (HTML)</label>
            <textarea name="body" required rows="6" class="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-mono focus:ring-2 focus:ring-sky-500 transition-all" placeholder="<p>เริ่มเขียนเนื้อหา...</p>"></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-black text-slate-400 uppercase tracking-wider">หมวดหมู่</label>
              <select name="category" class="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold">
                <option value="Notice">Notice (ประกาศทั่วไป)</option>
                <option value="Event">Event (กิจกรรม)</option>
                <option value="Update">Update (อัปเดต)</option>
              </select>
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-black text-slate-400 uppercase tracking-wider">สถานะ</label>
              <select name="status" class="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold">
                <option value="draft">Draft (ฉบับร่าง)</option>
                <option value="published">Published (เผยแพร่แล้ว)</option>
                <option value="archived">Archived (เก็บถาวร)</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-black text-slate-400 uppercase tracking-wider">วันที่เริ่ม</label>
              <input name="publishDate" type="date" class="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold">
            </div>
            <div class="space-y-1.5">
              <label class="text-xs font-black text-slate-400 uppercase tracking-wider">วันที่สิ้นสุด</label>
              <input name="expiryDate" type="date" class="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold">
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-xs font-black text-slate-400 uppercase tracking-wider">รูปภาพหน้าปก (URL)</label>
            <input name="photoURL" type="url" class="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium" placeholder="https://...">
          </div>

          <label class="flex items-center gap-3 p-4 bg-sky-50 rounded-2xl cursor-pointer select-none">
            <input name="pin" type="checkbox" class="w-5 h-5 rounded border-sky-300 text-sky-600 focus:ring-sky-200 transition-all">
            <span class="text-sm font-bold text-sky-800">ปักหมุดประกาศ (PIN to Top)</span>
          </label>
        </div>
      </form>

      <div class="p-6 bg-sky-50/60 border-t border-sky-100 flex items-center gap-3">
        <button id="annSaveBtn" form="annForm" type="submit" class="flex-1 bg-gradient-to-r from-sky-500 to-blue-600 text-white py-4 rounded-2xl font-black text-base shadow-xl shadow-sky-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:hover:scale-100">
          <span class="inline-flex items-center gap-2">
            <i id="annSaveSpinner" data-lucide="loader-2" class="hidden h-5 w-5 animate-spin"></i>
            <span id="annSaveLabel">บันทึกข้อมูล</span>
          </span>
        </button>
        <button id="annArchiveBtn" type="button" class="p-4 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
          <i data-lucide="trash-2" class="w-6 h-6"></i>
        </button>
      </div>

    </div>
  </div>
</div>


`;
}

function renderRow(item) {
const cfg = mapStatusConfig(item.status);
const isPinned = String(item.pin).toLowerCase() === "true" || item.pin === true;
const dateStr = toDateInputValue(item.publishDate);
const createdAt = toDateTimeLabel(item.createdAt);
const updatedAt = toDateTimeLabel(item.updatedAt);
const viewCount = Number(item.viewCount || 0);
const author = String(item.author || "-");

return `
<div class="group relative flex items-center gap-4 px-4 py-4 sm:px-6 hover:bg-slate-50 transition-colors cursor-pointer" data-ann-row="${escapeHtml(item.id || "")}">

  <!-- Icon/Thumbnail Section -->
  <div class="relative flex-shrink-0 w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-100">
    ${item.photoURL 
      ? `<img src="${escapeHtml(item.photoURL)}" class="w-full h-full object-cover" onerror="this.innerHTML='<i data-lucide=\'image\' class=\'w-5 h-5 text-slate-400\'></i>'; this.src='';">`
      : `<i data-lucide="megaphone" class="w-5 h-5 text-slate-400"></i>`
    }
    ${isPinned ? `<div class="absolute top-0 right-0 p-0.5 bg-blue-600 rounded-bl-lg"><i data-lucide="pin" class="w-2 h-2 text-white fill-current"></i></div>` : ""}
  </div>

  <!-- Content Section -->
  <div class="min-w-0 flex-1">
    <div class="flex items-center gap-2 mb-0.5">
      <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">${escapeHtml(mapCategoryLabelTh(item.category))}</span>
      <span class="w-1 h-1 rounded-full bg-slate-200"></span>
      <div class="flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full ${cfg.dot}"></span>
        <span class="text-[10px] font-bold ${cfg.text}">${cfg.label}</span>
      </div>
    </div>
    <h4 class="text-sm sm:text-base font-bold text-slate-800 truncate group-hover:text-sky-600 transition-colors">
      ${escapeHtml(item.title || "-")}
    </h4>
    <p class="text-xs font-medium text-slate-500 truncate mt-0.5">
      ${dateStr} • ${escapeHtml(item.summary || "ไม่มีรายละเอียดสรุป")}
    </p>
    <p class="mt-1 text-[11px] font-semibold text-slate-400">
      สร้างเมื่อ: ${escapeHtml(createdAt)} • แก้ไขล่าสุด: ${escapeHtml(updatedAt)}
    </p>
    <p class="mt-1 text-[11px] font-semibold text-slate-500">
      ผู้ประกาศ: ${escapeHtml(author)}
    </p>
    <p class="mt-1 text-[11px] font-black text-sky-700 md:hidden">
      เข้าชม ${escapeHtml(String(viewCount))} ครั้ง
    </p>
  </div>

  <!-- Desktop-only Badge & Arrow -->
  <div class="hidden md:flex items-center gap-4 flex-shrink-0">
    <span class="rounded-full border border-sky-100 bg-sky-50 px-2 py-0.5 text-[10px] font-black text-sky-700">
      เข้าชม ${escapeHtml(String(viewCount))}
    </span>
    <span class="text-[10px] font-mono text-slate-300">#${escapeHtml(item.id || "")}</span>
    <i data-lucide="chevron-right" class="w-5 h-5 text-slate-300 group-hover:text-slate-400 group-hover:translate-x-1 transition-all"></i>
  </div>
</div>


`;
}

// --- Controller ---
export function mountManageAnnouncementsView(root) {
if (!root) return;
const form = root.querySelector("#annForm");
const editorPanel = root.querySelector("#annEditorPanel");
const drawer = root.querySelector("#annDrawer");
const overlay = root.querySelector("#annOverlay");
const editorTitle = root.querySelector("#annEditorTitle");
const saveBtn = root.querySelector("#annSaveBtn");
const saveLabel = root.querySelector("#annSaveLabel");
const saveSpinner = root.querySelector("#annSaveSpinner");
const closeFormBtn = root.querySelector("#annCloseFormBtn");
const openCreateBtn = root.querySelector("#annOpenCreateBtn");
const archiveBtn = root.querySelector("#annArchiveBtn");
const reloadBtn = root.querySelector("#annReloadBtn");
const reloadIcon = root.querySelector("#annReloadIcon");
const list = root.querySelector("#annList");
const listStatus = root.querySelector("#annListStatus");
const filters = root.querySelector("#annFilters");
const countAll = root.querySelector("#annCountAll");
const countPublished = root.querySelector("#annCountPublished");
const countDraft = root.querySelector("#annCountDraft");
const countArchived = root.querySelector("#annCountArchived");
const countViews = root.querySelector("#annCountViews");

const auth = readAuthSession();
const authorName = String(auth?.user?.displayName || "Admin");
let items = Array.isArray(MANAGE_ANNOUNCEMENTS_VIEW_STATE.items)
  ? [...MANAGE_ANNOUNCEMENTS_VIEW_STATE.items]
  : [];
let editingId = "";
let activeFilter = String(MANAGE_ANNOUNCEMENTS_VIEW_STATE.activeFilter || "all");
let isSaving = false;
let isArchiving = false;
let isReloading = false;

const setFormVisible = (visible) => {
if (!editorPanel || !drawer) return;
if (visible) {
editorPanel.classList.remove("invisible", "opacity-0", "pointer-events-none");
setTimeout(() => drawer.classList.remove("translate-x-full"), 10);
} else {
drawer.classList.add("translate-x-full");
setTimeout(() => {
editorPanel.classList.add("invisible", "opacity-0", "pointer-events-none");
}, 300);
}
};

const resetForm = () => {
form?.reset();
editingId = "";
if (form?.elements.id) form.elements.id.value = "";
if (archiveBtn) archiveBtn.disabled = true;
if (editorTitle) editorTitle.textContent = "สร้างประกาศใหม่";
if (saveLabel) saveLabel.textContent = "บันทึกข้อมูล";
};

const setSaveLoading = (loading, mode = "save") => {
  isSaving = loading;
  if (saveBtn) saveBtn.disabled = loading || isArchiving;
  if (archiveBtn) archiveBtn.disabled = loading || isArchiving || !editingId;
  if (saveSpinner) saveSpinner.classList.toggle("hidden", !loading);
  if (saveLabel) {
    saveLabel.textContent = loading
      ? mode === "edit" ? "กำลังอัปเดต..." : "กำลังบันทึก..."
      : editingId ? "อัปเดตข้อมูล" : "บันทึกข้อมูล";
  }
  window.lucide?.createIcons?.();
};

const setArchiveLoading = (loading) => {
  isArchiving = loading;
  if (archiveBtn) archiveBtn.disabled = loading || isSaving || !editingId;
  if (saveBtn) saveBtn.disabled = loading || isSaving;
  if (archiveBtn) {
    archiveBtn.innerHTML = loading
      ? '<i data-lucide="loader-2" class="w-6 h-6 animate-spin"></i>'
      : '<i data-lucide="trash-2" class="w-6 h-6"></i>';
  }
  window.lucide?.createIcons?.();
};

const setReloadLoading = (loading) => {
  isReloading = loading;
  if (reloadBtn) reloadBtn.disabled = loading;
  if (reloadIcon) reloadIcon.classList.toggle("animate-spin", loading);
};

const paintList = () => {
if (!list || !listStatus) return;
const filtered = items.filter(item => activeFilter === "all" || String(item.status).toLowerCase() === activeFilter);

if (!filtered.length) {
  list.innerHTML = `
    <div class="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
        <i data-lucide="inbox" class="w-8 h-8 text-slate-300"></i>
      </div>
      <p class="text-sm font-bold text-slate-400">ไม่พบประกาศในหมวดหมู่นี้</p>
    </div>`;
  listStatus.textContent = `0 รายการ (กรอง: ${activeFilter})`;
  list.classList.remove("ann-list-pop");
} else {
  list.innerHTML = filtered.map(renderRow).join("");
  listStatus.textContent = `${filtered.length} จาก ${items.length} รายการ`;
  list.classList.remove("ann-list-pop");
  void list.offsetWidth;
  list.classList.add("ann-list-pop");
}

updateFilterUi();
window.lucide?.createIcons?.();


};

const updateFilterUi = () => {
MANAGE_ANNOUNCEMENTS_VIEW_STATE.activeFilter = activeFilter;
filters?.querySelectorAll("[data-filter]").forEach(btn => {
const active = btn.getAttribute("data-filter") === activeFilter;
btn.className = active
? "whitespace-nowrap px-4 py-2 rounded-full text-sm font-black transition-all bg-sky-600 text-white shadow-md shadow-sky-200 scale-105"
: "whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition-all text-slate-500 hover:bg-sky-50";
});
};

const updateKpis = () => {
const all = items.length;
const published = items.filter((item) => String(item.status || "").toLowerCase() === "published").length;
const draft = items.filter((item) => String(item.status || "").toLowerCase() === "draft").length;
const archived = items.filter((item) => String(item.status || "").toLowerCase() === "archived").length;
const totalViews = items.reduce((sum, item) => {
  const value = Number(item.viewCount || 0);
  return sum + (Number.isFinite(value) ? value : 0);
}, 0);

if (countAll) countAll.textContent = String(all);
if (countPublished) countPublished.textContent = String(published);
if (countDraft) countDraft.textContent = String(draft);
if (countArchived) countArchived.textContent = String(archived);
if (countViews) countViews.textContent = String(totalViews);
};

const fillForm = (item) => {
if (!form || !item) return;
editingId = String(item.id || "");
form.elements.id.value = editingId;
form.elements.title.value = String(item.title || "");
form.elements.summary.value = String(item.summary || "");
form.elements.body.value = String(item.body || "");
form.elements.category.value = mapCategoryLabel(item.category);
form.elements.status.value = String(item.status || "draft").toLowerCase();
form.elements.pin.checked = String(item.pin).toLowerCase() === "true" || item.pin === true;
form.elements.photoURL.value = String(item.photoURL || "");
form.elements.publishDate.value = toDateInputValue(item.publishDate);
form.elements.expiryDate.value = toDateInputValue(item.expiryDate);

if (archiveBtn) archiveBtn.disabled = false;
if (editorTitle) editorTitle.textContent = `แก้ไขประกาศ #${editingId}`;
if (saveLabel) saveLabel.textContent = "อัปเดตข้อมูล";
setFormVisible(true);


};

const loadList = async () => {
if (listStatus) {
  listStatus.textContent = items.length ? "กำลังซิงก์ข้อมูล..." : "กำลังโหลดข้อมูล...";
}
if (list && items.length === 0) list.innerHTML = renderListSkeleton(6);
setReloadLoading(true);
try {
const res = await callAnnouncementList({ includeArchived: "1", all: "1" });
if (!res?.ok) throw new Error(res?.error || "โหลดข้อมูลไม่สำเร็จ");
items = Array.isArray(res.data) ? res.data : [];
MANAGE_ANNOUNCEMENTS_VIEW_STATE.items = items;
MANAGE_ANNOUNCEMENTS_VIEW_STATE.loaded = true;
paintList();
updateKpis();
} catch (error) {
showToast(error.message);
if (list) list.innerHTML = "";
} finally {
setReloadLoading(false);
}
};

// Events
openCreateBtn?.addEventListener("click", () => { resetForm(); setFormVisible(true); });
closeFormBtn?.addEventListener("click", () => setFormVisible(false));
overlay?.addEventListener("click", () => setFormVisible(false));
reloadBtn?.addEventListener("click", loadList);

filters?.addEventListener("click", (e) => {
const btn = e.target.closest("[data-filter]");
if (btn) {
activeFilter = btn.getAttribute("data-filter");
paintList();
}
});

form?.addEventListener("submit", async (e) => {
e.preventDefault();
const formData = new FormData(form);
const payload = {
title: formData.get("title"),
summary: formData.get("summary"),
body: formData.get("body"),
category: formData.get("category"),
author: authorName,
status: formData.get("status"),
pin: formData.get("pin") === "on",
photoURL: formData.get("photoURL"),
publishDate: formData.get("publishDate") || new Date().toISOString().slice(0, 10),
expiryDate: formData.get("expiryDate") || "",
};

setSaveLoading(true, editingId ? "edit" : "save");
try {
  const res = editingId ? await callAnnouncementUpdate(editingId, payload) : await callAnnouncementCreate(payload);
  if (!res?.ok) throw new Error(res.error);
  showToast(editingId ? "อัปเดตแล้ว" : "สร้างแล้ว");
  setFormVisible(false);
  await loadList();
  resetForm();
} catch (error) {
  showToast(error.message);
} finally {
  setSaveLoading(false);
}


});

archiveBtn?.addEventListener("click", async () => {
  if (!editingId) {
    showToast("กรุณาเลือกประกาศก่อนลบ");
    return;
  }
  if (!window.confirm("ยืนยันการเก็บประกาศนี้เป็นถาวร (Archive)?")) return;
  setArchiveLoading(true);
  try {
    const res = await callAnnouncementArchive(editingId);
    if (!res?.ok) throw new Error(res.error || "ลบไม่สำเร็จ");
    showToast("ย้ายประกาศไปเก็บถาวรแล้ว");
    setFormVisible(false);
    await loadList();
    resetForm();
  } catch (error) {
    showToast(error.message || "ลบไม่สำเร็จ");
  } finally {
    setArchiveLoading(false);
  }
});

list?.addEventListener("click", (e) => {
const row = e.target.closest("[data-ann-row]");
if (row) {
const id = row.getAttribute("data-ann-row");
const item = items.find(i => String(i.id) === id);
if (item) fillForm(item);
}
});

if (MANAGE_ANNOUNCEMENTS_VIEW_STATE.loaded) {
  paintList();
  updateKpis();
  loadList();
  return;
}

loadList();
}
