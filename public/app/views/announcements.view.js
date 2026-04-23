import * as apiClient from "../data/api.js";
import { GAS_URL } from "../config.js";
import { gasJsonp } from "../data/gas_jsonp.js";
import { escapeHtml } from "../utils/html.js";

const ANNOUNCEMENTS_VIEW_STATE = {
  items: [],
  loaded: false,
};

function callAnnouncementList(params = {}) {
  if (typeof apiClient.apiAnnouncementList === "function") {
    return apiClient.apiAnnouncementList(params);
  }
  return gasJsonp(GAS_URL, { action: "announcement_list", ...params });
}

function callAnnouncementView(id) {
  if (typeof apiClient.apiAnnouncementView === "function") {
    return apiClient.apiAnnouncementView(id);
  }
  return gasJsonp(GAS_URL, {
    action: "announcement_view",
    payload: JSON.stringify({ id }),
  });
}

function mapCategoryTag(category) {
  const key = String(category || "").toLowerCase();
  if (key === "event") return "Event";
  if (key === "update") return "Update";
  return "Notice";
}

function toDisplayDate(value) {
  const text = String(value || "").trim();
  if (!text) return "-";
  const d = new Date(text);
  if (!Number.isFinite(d.getTime())) return text;
  return d.toISOString().slice(0, 10);
}

function renderBoard(items, loading = false) {
  if (loading) {
    return `
      <div class="quest-board-list grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        <article class="quest-news-paper p-6 rounded-xl">
          <h2 class="quest-mitr text-xl font-bold mb-2 text-[#3a2512]">กำลังโหลดประกาศ...</h2>
          <p class="text-sm text-[#4b311a] opacity-80">รอสักครู่ ระบบกำลังดึงข้อมูลล่าสุด</p>
        </article>
      </div>
    `;
  }

  if (!items.length) {
    return `
      <div class="quest-board-list-empty">
        <div class="quest-empty-wind">
          <span class="quest-leaf leaf-a"></span>
          <span class="quest-leaf leaf-b"></span>
          <span class="quest-leaf leaf-c"></span>
          <span class="quest-leaf leaf-d"></span>
          <span class="quest-leaf leaf-e"></span>
        </div>
        <article class="quest-news-paper p-6 rounded-xl quest-empty-note">
          <h2 class="quest-mitr text-xl font-bold mb-2 text-[#3a2512]">ยังไม่มีประกาศที่เผยแพร่</h2>
          <p class="text-sm text-[#4b311a] opacity-80">บอร์ดว่างอยู่ เมื่อมีประกาศใหม่จะปรากฏที่นี่ทันที</p>
        </article>
      </div>
    `;
  }

  const cardsHtml = items.map((item, index) => {
    const rotation = index % 3 === 0 ? "-rotate-2" : index % 3 === 1 ? "rotate-1" : "-rotate-1";
    const tag = mapCategoryTag(item.category);
    const id = escapeHtml(item.id || "");

    return `
      <article class="quest-news-paper p-6 rounded-xl relative ${rotation}" data-announcement-id="${id}">
        <div class="absolute top-2 left-1/2 -translate-x-1/2 w-6 h-6 bg-red-600 rounded-full shadow-inner border-2 border-red-800"></div>
        <span class="inline-block bg-[#5f3a17] text-[#ffe7ba] text-[10px] font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-tighter">${escapeHtml(tag)}</span>
        <h2 class="quest-mitr text-xl font-bold mb-2 leading-tight text-[#3a2512]">${escapeHtml(item.title)}</h2>
        <p class="text-[11px] font-bold uppercase tracking-wider text-[#6b4320]">${escapeHtml(toDisplayDate(item.publishDate || item.date))}</p>
        <p class="text-sm text-[#4b311a] opacity-85 line-clamp-3 mt-2 mb-4">${escapeHtml(item.summary)}</p>
        <button type="button" class="quest-btn-game w-full py-3 text-[#ffe7b3] font-bold rounded-xl text-sm">อ่านรายละเอียด</button>
      </article>
    `;
  }).join("");

  return `<div class="quest-board-list grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">${cardsHtml}</div>`;
}

function sanitizeAnnouncementHtml(html) {
  const raw = String(html || "");
  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, "")
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "");
}

export function renderAnnouncementsView() {
  return `
    <section class="view quest-page">
      <div class="max-w-6xl mx-auto">
        <div class="mb-4 flex justify-end">
          <a data-link href="/" class="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800 hover:bg-amber-100">
            กลับหน้าแรก
          </a>
        </div>

        <div class="quest-wood-board rounded-[2.2rem] overflow-hidden">
          <div class="quest-screw top-5 left-5"></div>
          <div class="quest-screw top-5 right-5"></div>
          <div class="quest-screw bottom-5 left-5"></div>
          <div class="quest-screw bottom-5 right-5"></div>

          <div class="text-center py-10 border-b-4 border-black/20 bg-black/10">
            <h1 class="quest-mitr text-4xl sm:text-5xl font-black text-[#ffe8b3] drop-shadow-[0_4px_0_#5c390f] tracking-tight italic">Quest Board</h1>
            <p class="text-[#f1d4a0] mt-2 opacity-90 font-bold text-xs sm:text-sm tracking-widest uppercase">ข่าวสารและภารกิจจากห้องสมุด</p>
          </div>

          <div class="p-6 sm:p-8">
            <div id="announcementBoardList">
              ${renderBoard([], true)}
            </div>
          </div>
        </div>
      </div>

      <div id="announcementModalOverlay" class="quest-modal-overlay fixed inset-0 z-[120] flex items-center justify-center p-6">
        <div class="quest-modal-content max-w-2xl w-full p-8 rounded-[1.5rem] relative border-8 border-[#3a2512]/10">
          <button id="announcementModalCloseTop" type="button" class="absolute top-4 right-4 text-[#3a2512] text-3xl leading-none">×</button>
          <div id="announcementModalBody"></div>
          <div class="mt-8 flex justify-center">
            <button id="announcementModalCloseBtn" type="button" class="quest-btn-game px-10 py-3 text-[#ffe7b3] font-black rounded-2xl text-base quest-mitr">รับทราบ</button>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function mountAnnouncementsView(root) {
  if (!root) return;

  const listEl = root.querySelector("#announcementBoardList");
  const overlay = root.querySelector("#announcementModalOverlay");
  const body = root.querySelector("#announcementModalBody");
  const closeTop = root.querySelector("#announcementModalCloseTop");
  const closeBtn = root.querySelector("#announcementModalCloseBtn");

  let items = Array.isArray(ANNOUNCEMENTS_VIEW_STATE.items)
    ? [...ANNOUNCEMENTS_VIEW_STATE.items]
    : [];

  const closeModal = () => {
    if (!overlay) return;
    overlay.classList.remove("active");
  };

  const openModal = (item) => {
    if (!overlay || !body || !item) return;
    const bodyHtml = sanitizeAnnouncementHtml(item.body || "");
    const views = Number(item.viewCount || 0);
    body.innerHTML = `
      <p class="text-xs font-bold uppercase tracking-widest text-[#6b4320]">${escapeHtml(toDisplayDate(item.publishDate || item.date))}</p>
      <h2 class="quest-mitr text-3xl font-black mt-2 text-[#2b1a0d]">${escapeHtml(item.title || "")}</h2>
      <p class="mt-2 text-xs font-bold uppercase tracking-wider text-[#7c4a1b]">เข้าชม ${escapeHtml(String(views))} ครั้ง</p>
      <p class="mt-3 text-sm font-bold text-[#6b4320]">${escapeHtml(item.summary || "")}</p>
      <div class="mt-5 text-base leading-7 text-[#3a2512]">${bodyHtml}</div>
    `;
    overlay.classList.add("active");
    if (item.id) {
      callAnnouncementView(item.id)
        .then((res) => {
          const next = Number(res?.data?.viewCount);
          if (res?.ok && Number.isFinite(next)) item.viewCount = next;
        })
        .catch(() => {});
    }
  };

  const bindListEvents = () => {
    root.querySelectorAll("[data-announcement-id]").forEach((el) => {
      const id = el.getAttribute("data-announcement-id");
      const item = items.find((row) => String(row.id) === String(id));
      if (!item) return;
      const btn = el.querySelector("button");
      btn?.addEventListener("click", () => openModal(item));
      el.addEventListener("dblclick", () => openModal(item));
    });
  };

  const maybeOpenFromQuery = () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (!id) return;
    const item = items.find((row) => String(row.id) === String(id));
    if (item) openModal(item);
  };

  const loadAnnouncements = async ({ silent = false } = {}) => {
    if (!silent && listEl && items.length === 0) {
      listEl.innerHTML = renderBoard([], true);
    }
    try {
      const res = await callAnnouncementList();
      if (!res?.ok) throw new Error(res?.error || "โหลดประกาศไม่สำเร็จ");
      items = Array.isArray(res.data) ? res.data : [];
      ANNOUNCEMENTS_VIEW_STATE.items = items;
      ANNOUNCEMENTS_VIEW_STATE.loaded = true;
    } catch {
      items = [];
      ANNOUNCEMENTS_VIEW_STATE.items = [];
      ANNOUNCEMENTS_VIEW_STATE.loaded = true;
    }

    if (listEl) listEl.innerHTML = renderBoard(items, false);
    bindListEvents();
    maybeOpenFromQuery();
  };

  closeTop?.addEventListener("click", closeModal);
  closeBtn?.addEventListener("click", closeModal);
  overlay?.addEventListener("click", (event) => {
    if (event.target === overlay) closeModal();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  if (ANNOUNCEMENTS_VIEW_STATE.loaded && listEl) {
    listEl.innerHTML = renderBoard(items, false);
    bindListEvents();
    maybeOpenFromQuery();
    loadAnnouncements({ silent: true });
    return;
  }

  loadAnnouncements();
}
