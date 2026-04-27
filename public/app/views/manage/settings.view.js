import { showToast } from "../../components/toast.js";
import { renderIconsSafe } from "../../icons.js";
import { escapeHtml } from "../../utils/html.js";
import {
  apiSettingsLocationsCreate,
  apiSettingsLocationsDelete,
  apiSettingsLocationsList,
  apiSettingsLocationsUpdate,
} from "../../data/api.js";

const STATE = {
  items: [],
  selectedId: "",
  loading: false,
  saving: false,
  mapEditMode: false,
  mapPickForCreate: false,
  editorOpen: false,
  leafletPromise: null,
  map: null,
  marker: null,
  rangeCircles: [],
};

const DEFAULT_CENTER = {
  latitude: 15.244,
  longitude: 104.847,
};
const EXISTING_LOCATION_NEARBY_METERS = 20;

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function toDateTimeLabel(value) {
  const date = new Date(String(value || ""));
  if (!Number.isFinite(date.getTime())) return "-";
  return date.toLocaleString("th-TH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestLocation(lat, lon) {
  let nearest = null;
  STATE.items.forEach((item) => {
    if (item?.deleted_at) return;
    const distance = haversineMeters(
      lat,
      lon,
      toNumber(item.latitude, NaN),
      toNumber(item.longitude, NaN)
    );
    if (!Number.isFinite(distance)) return;
    if (!nearest || distance < nearest.distance) {
      nearest = { item, distance };
    }
  });
  return nearest;
}

function readForm(form) {
  return {
    id: String(form.elements.id.value || "").trim(),
    location_name: String(form.elements.location_name.value || "").trim(),
    latitude: toNumber(form.elements.latitude.value, NaN),
    longitude: toNumber(form.elements.longitude.value, NaN),
    range_borrow: Math.round(toNumber(form.elements.range_borrow.value, NaN)),
    range_checkin: Math.round(toNumber(form.elements.range_checkin.value, NaN)),
    range_return: Math.round(toNumber(form.elements.range_return.value, NaN)),
    is_active: Boolean(form.elements.is_active.checked),
    note: String(form.elements.note.value || "").trim(),
    updated_at: String(form.elements.updated_at.value || "").trim(),
  };
}

function validatePayload(payload) {
  if (!payload.location_name) return "กรุณาระบุชื่อจุดพิกัด";
  if (!Number.isFinite(payload.latitude) || payload.latitude < -90 || payload.latitude > 90) {
    return "Latitude ต้องอยู่ระหว่าง -90 ถึง 90";
  }
  if (!Number.isFinite(payload.longitude) || payload.longitude < -180 || payload.longitude > 180) {
    return "Longitude ต้องอยู่ระหว่าง -180 ถึง 180";
  }

  const ranges = [
    ["รัศมียืม", payload.range_borrow],
    ["รัศมีสแกนเข้า", payload.range_checkin],
    ["รัศมีคืน", payload.range_return],
  ];
  const invalid = ranges.find(([, value]) => !Number.isFinite(value) || value < 5 || value > 5000);
  return invalid ? `${invalid[0]} ต้องอยู่ระหว่าง 5 - 5000 เมตร` : "";
}

function emptyFormValues() {
  return {
    id: "",
    location_name: "",
    latitude: DEFAULT_CENTER.latitude,
    longitude: DEFAULT_CENTER.longitude,
    range_borrow: 100,
    range_checkin: 80,
    range_return: 100,
    is_active: true,
    note: "",
    updated_at: "",
  };
}

function setFormValues(root, item) {
  const form = root.querySelector("#settingsLocationForm");
  if (!form) return;
  const data = item || emptyFormValues();
  form.elements.id.value = String(data.id || "");
  form.elements.location_name.value = String(data.location_name || "");
  form.elements.latitude.value = String(data.latitude ?? DEFAULT_CENTER.latitude);
  form.elements.longitude.value = String(data.longitude ?? DEFAULT_CENTER.longitude);
  form.elements.range_borrow.value = String(data.range_borrow ?? 100);
  form.elements.range_checkin.value = String(data.range_checkin ?? 80);
  form.elements.range_return.value = String(data.range_return ?? 100);
  form.elements.is_active.checked = Boolean(data.is_active ?? true);
  form.elements.note.value = String(data.note || "");
  form.elements.updated_at.value = String(data.updated_at || "");
  syncFormMeta(root, data);
  renderMiniMap(root);
}

function syncFormMeta(root, item) {
  const title = root.querySelector("#settingsFormTitle");
  const meta = root.querySelector("#settingsFormMeta");
  const deleteBtn = root.querySelector("#settingsDeleteBtn");
  if (title) title.textContent = item?.id ? "แก้ไขพื้นที่อนุญาต" : "เพิ่มพื้นที่อนุญาต";
  if (meta) {
    meta.textContent = item?.id
      ? `อัปเดตล่าสุด ${toDateTimeLabel(item.updated_at)}`
      : "สร้างจุดพิกัดใหม่";
  }
  if (deleteBtn) deleteBtn.disabled = !item?.id || STATE.saving;
}

function openSettingsEditor(root, item) {
  STATE.editorOpen = true;
  STATE.mapPickForCreate = false;
  setMapPickButtonState(root);
  setFormValues(root, item || null);
  const panel = root.querySelector("#settingsEditorPanel");
  const drawer = root.querySelector("#settingsEditorDrawer");
  if (!panel || !drawer) return;
  panel.classList.remove("invisible", "opacity-0", "pointer-events-none");
  drawer.classList.remove("translate-x-full");
  window.setTimeout(() => {
    root.querySelector("[name='location_name']")?.focus();
    STATE.map?.invalidateSize();
  }, 80);
}

function closeSettingsEditor(root) {
  STATE.editorOpen = false;
  const panel = root.querySelector("#settingsEditorPanel");
  const drawer = root.querySelector("#settingsEditorDrawer");
  if (!panel || !drawer) return;
  panel.classList.add("invisible", "opacity-0", "pointer-events-none");
  drawer.classList.add("translate-x-full");
}

function setMapPickButtonState(root) {
  const btn = root.querySelector("#settingsPickPointBtn");
  if (!btn) return;
  btn.classList.toggle("bg-sky-600", STATE.mapPickForCreate);
  btn.classList.toggle("text-white", STATE.mapPickForCreate);
  btn.classList.toggle("border-sky-600", STATE.mapPickForCreate);
  btn.classList.toggle("bg-white", !STATE.mapPickForCreate);
  btn.classList.toggle("text-slate-600", !STATE.mapPickForCreate);
}

function startPickFromMapMode(root) {
  STATE.mapEditMode = false;
  STATE.mapPickForCreate = true;
  setMapPickButtonState(root);
  updateLeafletMap(root);
}

function getGeolocationErrorMessage(error) {
  if (!error || typeof error.code !== "number") {
    return "ไม่สามารถอ่านตำแหน่งปัจจุบันได้";
  }
  if (error.code === 1) return "คุณยังไม่อนุญาตสิทธิ์ตำแหน่งในเบราว์เซอร์";
  if (error.code === 2) return "ผู้ให้บริการตำแหน่งของเบราว์เซอร์ไม่พร้อมใช้งาน";
  if (error.code === 3) return "หมดเวลาในการอ่านตำแหน่ง กรุณาลองใหม่อีกครั้ง";
  return "ไม่สามารถอ่านตำแหน่งปัจจุบันได้";
}

function renderStatusPill(item) {
  if (item.deleted_at) return `<span class="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-500">ลบแล้ว</span>`;
  if (item.is_active) return `<span class="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700">เปิดใช้งาน</span>`;
  return `<span class="rounded-full bg-amber-50 px-2 py-1 text-[11px] font-black text-amber-700">ปิดอยู่</span>`;
}

function renderLocationList(root) {
  const list = root.querySelector("#settingsLocationList");
  const total = root.querySelector("#settingsLocationTotal");
  if (total) total.textContent = String(STATE.items.length);
  if (!list) return;

  if (STATE.loading) {
    list.innerHTML = Array.from({ length: 4 }).map(() => `
      <div class="rounded-2xl border border-slate-100 bg-white p-4">
        <div class="h-4 w-32 animate-pulse rounded bg-slate-100"></div>
        <div class="mt-3 h-3 w-48 animate-pulse rounded bg-slate-100"></div>
      </div>
    `).join("");
    return;
  }

  if (!STATE.items.length) {
    list.innerHTML = `
      <div class="rounded-2xl border border-dashed border-sky-200 bg-sky-50/50 p-6 text-center text-sm font-bold text-slate-500">
        ยังไม่มีพื้นที่อนุญาต
      </div>
    `;
    return;
  }

  list.innerHTML = STATE.items.map((item) => {
    const active = String(item.id) === String(STATE.selectedId);
    return `
      <button
        type="button"
        data-location-id="${escapeHtml(item.id)}"
        class="w-full rounded-2xl border p-4 text-left transition-all ${active ? "border-sky-300 bg-sky-50 shadow-sm" : "border-slate-100 bg-white hover:border-sky-100 hover:bg-slate-50"}"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="truncate text-sm font-black text-slate-800">${escapeHtml(item.location_name)}</p>
            <p class="mt-1 text-xs font-semibold text-slate-500">${escapeHtml(item.id)} · ${toNumber(item.latitude).toFixed(6)}, ${toNumber(item.longitude).toFixed(6)}</p>
          </div>
          ${renderStatusPill(item)}
        </div>
        <div class="mt-3 grid grid-cols-3 gap-2 text-center text-[11px] font-black">
          <span class="rounded-xl bg-slate-50 px-2 py-2 text-slate-600">ยืม ${Number(item.range_borrow || 0).toLocaleString("th-TH")}m</span>
          <span class="rounded-xl bg-slate-50 px-2 py-2 text-slate-600">เข้า ${Number(item.range_checkin || 0).toLocaleString("th-TH")}m</span>
          <span class="rounded-xl bg-slate-50 px-2 py-2 text-slate-600">คืน ${Number(item.range_return || 0).toLocaleString("th-TH")}m</span>
        </div>
        <div class="mt-3 flex justify-end">
          <span data-action="edit-location" data-location-id="${escapeHtml(item.id)}" class="inline-flex items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-black text-white">
            <i data-lucide="pencil" class="h-3.5 w-3.5"></i>
            แก้ไข
          </span>
        </div>
      </button>
    `;
  }).join("");
  renderIconsSafe();
}

function getCurrentFormCoordinates(root) {
  const form = root.querySelector("#settingsLocationForm");
  if (!form) return DEFAULT_CENTER;
  return {
    latitude: toNumber(form.elements.latitude.value, DEFAULT_CENTER.latitude),
    longitude: toNumber(form.elements.longitude.value, DEFAULT_CENTER.longitude),
  };
}

function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (STATE.leafletPromise) return STATE.leafletPromise;

  STATE.leafletPromise = new Promise((resolve, reject) => {
    if (!document.getElementById("leafletCss")) {
      const link = document.createElement("link");
      link.id = "leafletCss";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById("leafletScript");
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(window.L), { once: true });
      existingScript.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "leafletScript";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("โหลดแผนที่ไม่สำเร็จ"));
    document.head.appendChild(script);
  });

  return STATE.leafletPromise;
}

function getRangeValues(root) {
  const form = root.querySelector("#settingsLocationForm");
  if (!form) {
    return { borrow: 100, checkin: 80, returnRange: 100 };
  }
  return {
    borrow: Math.max(5, toNumber(form.elements.range_borrow.value, 100)),
    checkin: Math.max(5, toNumber(form.elements.range_checkin.value, 80)),
    returnRange: Math.max(5, toNumber(form.elements.range_return.value, 100)),
  };
}

async function initLeafletMap(root) {
  const mapEl = root.querySelector("#settingsMiniMap");
  if (!mapEl || STATE.map) return;

  try {
    const L = await loadLeaflet();
    if (!mapEl.isConnected || STATE.map) return;

    const coords = getCurrentFormCoordinates(root);
    STATE.map = L.map(mapEl, {
      center: [coords.latitude, coords.longitude],
      zoom: 18,
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(STATE.map);

    STATE.marker = L.marker([coords.latitude, coords.longitude], {
      draggable: STATE.mapEditMode,
    }).addTo(STATE.map);

    STATE.marker.on("dragend", () => {
      const latLng = STATE.marker.getLatLng();
      setFormCoordinates(root, latLng.lat, latLng.lng);
    });

    STATE.map.on("click", (event) => {
      if (STATE.mapPickForCreate) {
        const nearest = findNearestLocation(event.latlng.lat, event.latlng.lng);
        if (nearest && nearest.distance <= EXISTING_LOCATION_NEARBY_METERS) {
          STATE.selectedId = nearest.item.id;
          openSettingsEditor(root, nearest.item);
          setFormCoordinates(root, nearest.item.latitude, nearest.item.longitude);
          STATE.mapPickForCreate = false;
          setMapPickButtonState(root);
          renderLocationList(root);
          showToast(`ตำแหน่งนี้ใกล้ "${nearest.item.location_name}" (${Math.round(nearest.distance)}m) จึงเปิดโหมดแก้ไขแทน`);
          return;
        }

        STATE.selectedId = "";
        openSettingsEditor(root, null);
        setFormCoordinates(root, event.latlng.lat, event.latlng.lng);
        STATE.mapPickForCreate = false;
        setMapPickButtonState(root);
        showToast("เลือกจุดจากแผนที่แล้ว");
        return;
      }
      if (!STATE.mapEditMode) return;
      setFormCoordinates(root, event.latlng.lat, event.latlng.lng);
    });

    STATE.rangeCircles = [
      L.circle([coords.latitude, coords.longitude], { color: "#0284c7", fillColor: "#38bdf8", fillOpacity: 0.12, weight: 2 }).addTo(STATE.map),
      L.circle([coords.latitude, coords.longitude], { color: "#16a34a", fillColor: "#86efac", fillOpacity: 0.10, weight: 2 }).addTo(STATE.map),
      L.circle([coords.latitude, coords.longitude], { color: "#f59e0b", fillColor: "#fde68a", fillOpacity: 0.10, weight: 2 }).addTo(STATE.map),
    ];

    updateLeafletMap(root, { recenter: true });
    window.setTimeout(() => STATE.map?.invalidateSize(), 80);
  } catch (error) {
    mapEl.innerHTML = `
      <div class="flex h-full items-center justify-center p-6 text-center text-sm font-bold text-rose-600">
        ${escapeHtml(String(error?.message || error))}
      </div>
    `;
  }
}

function setFormCoordinates(root, latitude, longitude) {
  const form = root.querySelector("#settingsLocationForm");
  if (!form) return;
  form.elements.latitude.value = Number(latitude).toFixed(6);
  form.elements.longitude.value = Number(longitude).toFixed(6);
  updateLeafletMap(root, { recenter: true });
}

function updateLeafletMap(root, { recenter = false } = {}) {
  const label = root.querySelector("#settingsMapCoordLabel");
  const modeBtn = root.querySelector("#settingsMapModeBtn");
  const coords = getCurrentFormCoordinates(root);

  if (label) label.textContent = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
  if (modeBtn) {
    modeBtn.classList.toggle("bg-sky-600", STATE.mapEditMode);
    modeBtn.classList.toggle("text-white", STATE.mapEditMode);
    modeBtn.classList.toggle("bg-white", !STATE.mapEditMode);
    modeBtn.classList.toggle("text-slate-600", !STATE.mapEditMode);
  }

  if (!STATE.map || !STATE.marker) {
    initLeafletMap(root);
    return;
  }

  const latLng = [coords.latitude, coords.longitude];
  const ranges = getRangeValues(root);
  STATE.marker.setLatLng(latLng);
  if (STATE.marker.dragging) {
    if (STATE.mapEditMode) STATE.marker.dragging.enable();
    else STATE.marker.dragging.disable();
  }

  const circleRanges = [ranges.borrow, ranges.checkin, ranges.returnRange];
  STATE.rangeCircles.forEach((circle, index) => {
    circle.setLatLng(latLng);
    circle.setRadius(circleRanges[index] || 5);
  });

  if (recenter) STATE.map.setView(latLng, Math.max(STATE.map.getZoom(), 17), { animate: true });
  STATE.map.invalidateSize();
}

function renderMiniMap(root) {
  const map = root.querySelector("#settingsMiniMap");
  if (!map) return;
  updateLeafletMap(root, { recenter: true });
}

function setLoading(root, loading) {
  STATE.loading = loading;
  const reload = root.querySelector("#settingsReloadBtn");
  if (reload) reload.disabled = loading;
  renderLocationList(root);
}

function setSaving(root, saving) {
  STATE.saving = saving;
  root.querySelectorAll("[data-settings-submit-control]").forEach((el) => {
    el.disabled = saving;
  });
  const saveLabel = root.querySelector("#settingsSaveLabel");
  if (saveLabel) saveLabel.textContent = saving ? "กำลังบันทึก..." : "บันทึกพื้นที่";
  syncFormMeta(root, readForm(root.querySelector("#settingsLocationForm")));
}

async function loadLocations(root) {
  setLoading(root, true);
  try {
    const res = await apiSettingsLocationsList();
    if (!res?.ok) throw new Error(res?.error || "โหลดข้อมูลพิกัดไม่สำเร็จ");
    STATE.items = Array.isArray(res.data?.items) ? res.data.items : [];
    if (!STATE.selectedId && STATE.items[0]) STATE.selectedId = STATE.items[0].id;
    const selected = STATE.items.find((item) => String(item.id) === String(STATE.selectedId));
    setFormValues(root, selected || null);
  } catch (error) {
    showToast(String(error?.message || error));
  } finally {
    setLoading(root, false);
  }
}

async function saveLocation(root) {
  const form = root.querySelector("#settingsLocationForm");
  if (!form || STATE.saving) return;
  const payload = readForm(form);
  const error = validatePayload(payload);
  if (error) {
    showToast(error);
    return;
  }
  if (!window.confirm("ยืนยันการบันทึกพื้นที่อนุญาตนี้?")) return;

  setSaving(root, true);
  try {
    const res = payload.id
      ? await apiSettingsLocationsUpdate(payload.id, payload)
      : await apiSettingsLocationsCreate(payload);
    if (!res?.ok) throw new Error(res?.error || "บันทึกข้อมูลไม่สำเร็จ");
    STATE.selectedId = res.data?.id || payload.id;
    showToast("บันทึกพื้นที่อนุญาตแล้ว");
    await loadLocations(root);
    closeSettingsEditor(root);
  } catch (error) {
    showToast(String(error?.message || error));
  } finally {
    setSaving(root, false);
  }
}

async function deleteLocation(root) {
  const form = root.querySelector("#settingsLocationForm");
  if (!form || STATE.saving) return;
  const id = String(form.elements.id.value || "");
  const updatedAt = String(form.elements.updated_at.value || "");
  if (!id) return;
  if (!window.confirm("ยืนยันการลบพื้นที่อนุญาตนี้?")) return;

  setSaving(root, true);
  try {
    const res = await apiSettingsLocationsDelete(id, updatedAt);
    if (!res?.ok) throw new Error(res?.error || "ลบข้อมูลไม่สำเร็จ");
    STATE.selectedId = "";
    showToast("ลบพื้นที่อนุญาตแล้ว");
    await loadLocations(root);
  } catch (error) {
    showToast(String(error?.message || error));
  } finally {
    setSaving(root, false);
  }
}

function bindEvents(root) {
  root.querySelector("#settingsLocationList")?.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-location-id]");
    if (!btn) return;
    const id = btn.getAttribute("data-location-id");
    const item = STATE.items.find((entry) => String(entry.id) === String(id));
    STATE.selectedId = id;
    setFormValues(root, item || null);
    renderLocationList(root);
    if (event.target.closest("[data-action='edit-location']")) {
      openSettingsEditor(root, item || null);
    }
  });

  root.querySelector("#settingsNewBtn")?.addEventListener("click", () => {
    STATE.selectedId = "";
    STATE.mapPickForCreate = false;
    setMapPickButtonState(root);
    renderLocationList(root);
    openSettingsEditor(root, null);
  });

  root.querySelector("#settingsReloadBtn")?.addEventListener("click", () => loadLocations(root));

  root.querySelector("#settingsLocationForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveLocation(root);
  });

  root.querySelector("#settingsDeleteBtn")?.addEventListener("click", () => deleteLocation(root));

  root.querySelectorAll("[data-settings-editor-close]").forEach((btn) => {
    btn.addEventListener("click", () => closeSettingsEditor(root));
  });

  root.querySelectorAll("[data-map-sync-field]").forEach((input) => {
    input.addEventListener("input", () => updateLeafletMap(root, { recenter: true }));
  });

  root.querySelector("#settingsUseCurrentLocationBtn")?.addEventListener("click", () => {
    if (!navigator.geolocation) {
      showToast("เบราว์เซอร์นี้ไม่รองรับการอ่าน GPS");
      startPickFromMapMode(root);
      return;
    }
    navigator.geolocation.getCurrentPosition((position) => {
      const form = root.querySelector("#settingsLocationForm");
      if (!form) return;
      form.elements.latitude.value = position.coords.latitude.toFixed(6);
      form.elements.longitude.value = position.coords.longitude.toFixed(6);
      updateLeafletMap(root, { recenter: true });
      if (position.coords.accuracy > 30) {
        showToast("GPS ยังคลาดเคลื่อนเกิน 30 เมตร กรุณารอนิ่งๆ แล้วลองอีกครั้ง");
      }
    }, (error) => {
      showToast(`${getGeolocationErrorMessage(error)}: เปลี่ยนเป็นโหมดเลือกจุดบนแผนที่แทน`);
      startPickFromMapMode(root);
    }, {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    });
  });

  root.querySelector("#settingsMapModeBtn")?.addEventListener("click", () => {
    STATE.mapPickForCreate = false;
    setMapPickButtonState(root);
    STATE.mapEditMode = !STATE.mapEditMode;
    updateLeafletMap(root);
  });

  root.querySelector("#settingsPickPointBtn")?.addEventListener("click", () => {
    STATE.mapEditMode = false;
    STATE.mapPickForCreate = !STATE.mapPickForCreate;
    setMapPickButtonState(root);
    updateLeafletMap(root);
    if (STATE.mapPickForCreate) {
      showToast("โหมดเลือกจุดเปิดอยู่: คลิกตำแหน่งบนแผนที่เพื่อเพิ่มพื้นที่");
    }
  });
}

export function renderManageSettingsView() {
  return `
    <section class="p-4 lg:p-6">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-black tracking-tight text-slate-800">ตั้งค่าพื้นที่อนุญาต</h2>
          <p class="text-sm font-medium text-slate-500">จัดการพิกัดสำหรับยืม คืน และสแกนเข้าห้องสมุด</p>
        </div>
        <div class="flex items-center gap-2">
          <a data-link href="/manage/settings/policies" class="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700 transition-colors hover:bg-emerald-100">
            <i data-lucide="sliders-horizontal" class="h-4 w-4"></i>
            นโยบายยืม
          </a>
          <a data-link href="/manage/settings/library" class="inline-flex items-center gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-black text-cyan-700 transition-colors hover:bg-cyan-100">
            <i data-lucide="clock-3" class="h-4 w-4"></i>
            เวลาทำการ
          </a>
          <a data-link href="/manage/checkin-qr" class="inline-flex items-center gap-2 rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-3 py-2 text-sm font-black text-fuchsia-700 transition-colors hover:bg-fuchsia-100">
            <i data-lucide="qr-code" class="h-4 w-4"></i>
            พิมพ์ QR เช็คอิน
          </a>
          <button id="settingsReloadBtn" type="button" class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60">
            <i data-lucide="rotate-cw" class="h-4 w-4"></i>
            โหลดใหม่
          </button>
          <button id="settingsNewBtn" type="button" class="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm font-black text-white shadow-sm shadow-sky-100 transition-colors hover:bg-sky-700">
            <i data-lucide="plus" class="h-4 w-4"></i>
            เพิ่มพิกัด
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(280px,380px)_1fr]">
        <aside class="space-y-3">
          <div class="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm">
            <div class="mb-3 flex items-center justify-between">
              <h3 class="text-sm font-black text-slate-800">รายการพิกัด</h3>
              <span class="rounded-full bg-sky-50 px-2 py-1 text-xs font-black text-sky-700"><span id="settingsLocationTotal">0</span> จุด</span>
            </div>
            <div id="settingsLocationList" class="space-y-3"></div>
          </div>
        </aside>

        <aside class="relative z-0 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm md:p-5">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="text-sm font-black text-slate-800">Mini-map</h3>
              <p id="settingsMapCoordLabel" class="text-xs font-bold text-slate-400">-</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <button id="settingsPickPointBtn" type="button" class="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600 transition-colors">
                เลือกจุดเพิ่ม
              </button>
              <button id="settingsMapModeBtn" type="button" class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black transition-colors">
                Edit Pin
              </button>
              <button id="settingsUseCurrentLocationBtn" type="button" class="inline-flex items-center gap-2 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-xs font-black text-sky-700 transition-colors hover:bg-sky-100">
                <i data-lucide="crosshair" class="h-4 w-4"></i>
                ใช้ตำแหน่งปัจจุบัน
              </button>
            </div>
          </div>
          <div id="settingsMiniMap" class="relative z-0 h-[420px] overflow-hidden rounded-2xl border border-sky-100 bg-sky-50 md:h-[560px] xl:min-h-[calc(100dvh-220px)]"></div>
        </aside>
      </div>

      <div id="settingsEditorPanel" class="fixed inset-0 z-[3000] invisible opacity-0 pointer-events-none transition-all duration-300">
        <button type="button" data-settings-editor-close class="absolute inset-0 h-full w-full bg-slate-950/40 backdrop-blur-sm" aria-label="ปิดหน้าต่างแก้ไข"></button>
        <div id="settingsEditorDrawer" class="absolute bottom-0 right-0 top-auto flex max-h-[92dvh] w-full translate-x-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl transition-transform duration-300 ease-out sm:top-0 sm:h-full sm:max-h-none sm:max-w-xl sm:rounded-none">
          <div class="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <div>
              <h3 id="settingsFormTitle" class="text-lg font-black text-slate-800">เพิ่มพื้นที่อนุญาต</h3>
              <p id="settingsFormMeta" class="text-xs font-bold text-slate-400">สร้างจุดพิกัดใหม่</p>
            </div>
            <button type="button" data-settings-editor-close class="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700">
              <i data-lucide="x" class="h-5 w-5"></i>
            </button>
          </div>

          <form id="settingsLocationForm" class="flex-1 overflow-y-auto p-5">
            <input type="hidden" name="id">
            <input type="hidden" name="updated_at">

            <div class="mb-5">
              <div>
                <label class="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700">
                  <input name="is_active" type="checkbox" class="h-4 w-4 rounded border-emerald-200 text-emerald-600 focus:ring-emerald-200">
                  เปิดใช้งาน
                </label>
              </div>
            </div>

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div class="space-y-1.5 md:col-span-2">
                <label class="text-xs font-black uppercase tracking-widest text-slate-400">ชื่อจุดพิกัด</label>
                <input name="location_name" required maxlength="120" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100" placeholder="เช่น ห้องสมุด อาคารวิทยบริการ">
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-black uppercase tracking-widest text-slate-400">Latitude</label>
                <input data-map-sync-field name="latitude" required type="number" min="-90" max="90" step="0.000001" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100">
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-black uppercase tracking-widest text-slate-400">Longitude</label>
                <input data-map-sync-field name="longitude" required type="number" min="-180" max="180" step="0.000001" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100">
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-black uppercase tracking-widest text-slate-400">รัศมียืม (เมตร)</label>
                <input name="range_borrow" required type="number" min="5" max="5000" step="1" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100">
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-black uppercase tracking-widest text-slate-400">รัศมีสแกนเข้า (เมตร)</label>
                <input name="range_checkin" required type="number" min="5" max="5000" step="1" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100">
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-black uppercase tracking-widest text-slate-400">รัศมีคืน (เมตร)</label>
                <input name="range_return" required type="number" min="5" max="5000" step="1" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100">
              </div>
              <div class="space-y-1.5 md:col-span-2">
                <label class="text-xs font-black uppercase tracking-widest text-slate-400">หมายเหตุ</label>
                <textarea name="note" rows="3" maxlength="500" class="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-800 focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100" placeholder="รายละเอียดเพิ่มเติม"></textarea>
              </div>
            </div>
          </form>

          <div class="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-4">
            <button id="settingsDeleteBtn" data-settings-submit-control type="button" class="inline-flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-black text-rose-600 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40">
              <i data-lucide="trash-2" class="h-4 w-4"></i>
              ลบ
            </button>
            <button data-settings-submit-control form="settingsLocationForm" type="submit" class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-slate-800 disabled:opacity-60">
              <i data-lucide="save" class="h-4 w-4"></i>
              <span id="settingsSaveLabel">บันทึกพื้นที่</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  `;
}

export function mountManageSettingsView(container) {
  const root = container.querySelector("#manage-content") || container;
  STATE.selectedId = "";
  STATE.mapEditMode = false;
  STATE.mapPickForCreate = false;
  STATE.map = null;
  STATE.marker = null;
  STATE.rangeCircles = [];
  setMapPickButtonState(root);
  setFormValues(root, null);
  bindEvents(root);
  loadLocations(root);
}
