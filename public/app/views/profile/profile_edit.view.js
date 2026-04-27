import { showToast } from "../../components/toast.js";
import { apiProfileGet, apiProfileUpdateContact } from "../../data/api.js";

function patchAuthUser(profile) {
  const stores = [
    { key: "local", storage: window.localStorage },
    { key: "session", storage: window.sessionStorage },
  ];
  stores.forEach(({ storage }) => {
    const raw = storage.getItem("smartlib.auth");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.user) return;
      parsed.user = { ...parsed.user, ...profile };
      storage.setItem("smartlib.auth", JSON.stringify(parsed));
    } catch {
      // ignore broken storage
    }
  });
}

function buildReadableErrorMessage(error, phase) {
  const raw = String(error?.message || error || "").trim();
  if (!raw) return `เกิดข้อผิดพลาดระหว่าง${phase}`;
  if (raw === "JSONP request failed") {
    return `เกิดข้อผิดพลาดระหว่าง${phase}: ไม่สามารถติดต่อ Web App ได้ (อาจเป็น URL ผิด/สิทธิ์ deployment ไม่เปิด/เน็ตขัดข้อง)`;
  }
  if (raw === "JSONP timeout") {
    return `เกิดข้อผิดพลาดระหว่าง${phase}: การเชื่อมต่อหมดเวลา กรุณาลองใหม่`;
  }
  return `เกิดข้อผิดพลาดระหว่าง${phase}: ${raw}`;
}

export function renderProfileEditView() {
  return `
    <section class="view mx-auto w-full max-w-4xl px-4 py-8">
      <div class="mb-4 flex items-center justify-between">
        <h1 class="text-2xl font-black text-slate-800">แก้ไขข้อมูลติดต่อ</h1>
        <a data-link href="/profile" class="text-sm font-bold text-sky-700 hover:text-sky-800">กลับหน้าโปรไฟล์</a>
      </div>
      <form id="profileEditForm" class="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div id="profileEditError" class="hidden rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700"></div>
        <pre id="profileEditDebug" class="hidden overflow-x-auto rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-semibold text-amber-900"></pre>
        <div class="grid gap-3 sm:grid-cols-2">
          <label class="space-y-1 text-xs font-bold text-slate-600">
            <span>เบอร์โทร</span>
            <input name="phone" placeholder="08xxxxxxxx" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label class="space-y-1 text-xs font-bold text-slate-600">
            <span>Line ID</span>
            <input name="lineId" placeholder="line id" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          </label>
          <label class="space-y-1 text-xs font-bold text-slate-600 sm:col-span-2">
            <span>ที่อยู่</span>
            <textarea name="address" rows="3" class="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"></textarea>
          </label>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="submit" class="rounded-xl bg-sky-600 px-4 py-2 text-sm font-black text-white hover:bg-sky-700">บันทึกการเปลี่ยนแปลง</button>
          <a data-link href="/profile/change-password" class="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 hover:bg-slate-100">เปลี่ยนรหัสผ่าน</a>
        </div>
      </form>
    </section>
  `;
}

export async function mountProfileEditView(container) {
  const form = container.querySelector("#profileEditForm");
  if (!form) return;
  const errorBox = form.querySelector("#profileEditError");
  const debugBox = form.querySelector("#profileEditDebug");
  const phoneInput = form.elements.phone;
  const lineIdInput = form.elements.lineId;
  const addressInput = form.elements.address;
  const submitBtn = form.querySelector('button[type="submit"]');

  function showFormError(message) {
    if (!errorBox) return;
    errorBox.textContent = String(message || "เกิดข้อผิดพลาด");
    errorBox.classList.remove("hidden");
  }

  function showDebug(message) {
    if (!debugBox) return;
    debugBox.textContent = String(message || "");
    debugBox.classList.remove("hidden");
  }

  function clearFormError() {
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.classList.add("hidden");
    if (debugBox) {
      debugBox.textContent = "";
      debugBox.classList.add("hidden");
    }
  }

  let profile = null;

  try {
    const res = await apiProfileGet();
    if (!res?.ok) throw new Error(res?.error || "โหลดข้อมูลโปรไฟล์ไม่สำเร็จ");
    profile = res.data?.profile || {};
    phoneInput.value = String(profile.phone || "");
    lineIdInput.value = String(profile.lineId || "");
    addressInput.value = String(profile.address || "");
  } catch (err) {
    showToast(err?.message || "โหลดข้อมูลโปรไฟล์ไม่สำเร็จ");
    showFormError(buildReadableErrorMessage(err, "โหลดข้อมูล"));
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFormError();
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add("opacity-60", "cursor-not-allowed");
    }
    try {
      const payload = {
        phone: String(phoneInput.value || "").trim(),
        lineId: String(lineIdInput.value || "").trim(),
        address: String(addressInput.value || "").trim(),
        photoURL: profile?.photoURL || "",
      };
      let res;
      try {
        res = await apiProfileUpdateContact(payload);
      } catch (saveErr) {
        throw new Error(buildReadableErrorMessage(saveErr, "บันทึกข้อมูล"));
      }
      if (!res?.ok) throw new Error(buildReadableErrorMessage(res?.error || "บันทึกข้อมูลไม่สำเร็จ", "บันทึกข้อมูล"));

      const nextProfile = res.data?.profile || {};
      patchAuthUser(nextProfile);
      profile = nextProfile;
      showToast("บันทึกข้อมูลสำเร็จ");
    } catch (err) {
      const all = String(err?.message || "บันทึกข้อมูลไม่สำเร็จ");
      const [message, ...debugLines] = all.split("\n");
      showToast(message);
      showFormError(message);
      if (debugLines.length) showDebug(debugLines.join("\n"));
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove("opacity-60", "cursor-not-allowed");
      }
    }
  });
}
