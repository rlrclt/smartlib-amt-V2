import { showToast } from "../../components/toast.js";
import { apiSignupRequest } from "../../data/api.js";

const ROLE_LABELS = {
  student: "นักเรียน",
  teacher: "อาจารย์",
  staff: "บุคลากร",
  external: "บุคคลภายนอก",
};

const PERSONNEL_TYPES = {
  teacher: ["ข้าราชการ", "พนักงานราชการ", "ลูกจ้างประจำ", "ครูพิเศษสอน"],
  staff: ["เจ้าหน้าที่", "แม่บ้าน-นักการภารโรง"],
};

const FIELD_CONFIG = {
  student: [
    { label: "รหัสนักเรียน", name: "idCode", placeholder: "เช่น 64001234", type: "text" },
    { label: "แผนกวิชา/สาขา", name: "department", placeholder: "เช่น สาขาวิชาคอมพิวเตอร์ธุรกิจ", type: "text" },
    { label: "ระดับชั้น", name: "level", type: "select", options: ["ปวช.", "ปวส."] },
    { label: "ห้องเรียน", name: "classRoom", placeholder: "เช่น 1/1", type: "text" },
  ],
  teacher: [
    { label: "รหัสบุคลากร", name: "idCode", placeholder: "ระบุรหัสประจำตัว", type: "text" },
    { label: "แผนก/ฝ่าย", name: "department", placeholder: "เช่น สาขาวิชาช่างยนต์", type: "text" },
    { label: "ประเภทบุคลากร", name: "personnelType", type: "select", options: PERSONNEL_TYPES.teacher },
  ],
  staff: [
    { label: "รหัสพนักงาน", name: "idCode", placeholder: "ระบุรหัสพนักงาน", type: "text" },
    { label: "ฝ่าย/งาน", name: "department", placeholder: "เช่น งานห้องสมุด", type: "text" },
    { label: "ประเภทบุคลากร", name: "personnelType", type: "select", options: PERSONNEL_TYPES.staff },
  ],
  external: [
    { label: "เลขบัตร / Passport", name: "idCode", placeholder: "ระบุเลขเอกสาร", type: "text" },
    { label: "ประเภทเอกสาร", name: "idType", type: "select", options: ["nationalId", "passport", "studentCard"] },
    { label: "หน่วยงาน/สังกัด", name: "organization", placeholder: "ระบุหน่วยงาน (ถ้ามี)", type: "text", required: false },
  ],
};

export function renderSignupView() {
  return `
    <section class="auth-view view min-h-dvh flex items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div class="auth-blob auth-blob-a"></div>
      <div class="auth-blob auth-blob-b"></div>

      <div class="auth-shell relative w-full max-w-[1000px] overflow-hidden rounded-[2rem] md:rounded-[2.5rem] flex flex-col md:flex-row min-h-[650px]">
        <aside class="w-full md:w-[35%] bg-gradient-to-br from-sky-500 to-blue-600 p-8 lg:p-10 text-white flex flex-col relative overflow-hidden">
          <div class="auth-dot-grid"></div>

          <div class="relative z-10">
            <a href="/" data-link class="inline-flex items-center gap-2 mb-10">
              <span class="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <img src="/favicon.svg" alt="ANT Library" class="w-5 h-5" />
              </span>
              <span class="text-lg font-black tracking-tight uppercase">ANT Library</span>
            </a>

            <h1 class="text-2xl font-bold mb-8 leading-tight">สร้างบัญชีใหม่<br>เพื่อรับรหัสผ่าน</h1>

            <div class="space-y-8 relative">
              <div class="absolute left-[15px] top-0 bottom-0 w-[2px] bg-sky-400/30 hidden md:block"></div>
              ${renderStepIndicator(1, "ข้อมูลพื้นฐาน", "อีเมลและเบอร์โทร", true)}
              ${renderStepIndicator(2, "ยืนยันตัวตน", "ข้อมูลตามบทบาท")}
              ${renderStepIndicator(3, "เสร็จสมบูรณ์", "ตรวจสอบข้อมูล")}
            </div>
          </div>

          <div class="mt-auto relative z-10 pt-10">
            <div class="p-4 bg-white/10 rounded-2xl border border-white/10">
              <p class="text-xs text-sky-50 leading-relaxed font-medium">
                <i data-lucide="info" class="w-3 h-3 inline-block mr-1 mb-0.5"></i>
                ระบบจะส่งลิงก์ยืนยันก่อน แล้วจึงส่งรหัสผ่านให้ทางอีเมล
              </p>
            </div>
          </div>
        </aside>

        <div class="w-full md:w-[65%] p-6 sm:p-10 lg:p-12 bg-white/50 flex flex-col">
          <form id="signupForm" class="flex-grow flex flex-col" novalidate>
            <div class="step-content active" data-step-content="1">
              <div class="mb-8">
                <h2 class="text-2xl font-black text-slate-800 mb-1">ข้อมูลติดต่อ</h2>
                <p class="text-sm text-slate-500 font-medium">กรุณาใช้อีเมลที่ใช้งานจริงเพื่อรับลิงก์ยืนยัน</p>
              </div>

              <div class="space-y-5">
                <label class="grid gap-2">
                  <span class="text-sm font-bold text-slate-700 ml-1">ชื่อ-นามสกุล</span>
                  <input name="displayName" type="text" autocomplete="name" required placeholder="ชื่อ นามสกุล" class="auth-input w-full bg-white/80 border border-slate-200 rounded-xl py-3.5 px-4 outline-none text-slate-800 font-medium">
                </label>

                <label class="grid gap-2">
                  <span class="text-sm font-bold text-slate-700 ml-1">อีเมล</span>
                  <span class="relative group">
                    <span class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      <i data-lucide="mail" class="w-5 h-5"></i>
                    </span>
                    <input name="email" type="email" autocomplete="email" required placeholder="example@email.com" class="auth-input w-full bg-white/80 border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 outline-none text-slate-800 font-medium">
                  </span>
                </label>

                <label class="grid gap-2">
                  <span class="text-sm font-bold text-slate-700 ml-1">เบอร์โทรศัพท์</span>
                  <span class="relative group">
                    <span class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-500 transition-colors">
                      <i data-lucide="phone" class="w-5 h-5"></i>
                    </span>
                    <input name="phone" type="tel" autocomplete="tel" inputmode="numeric" required placeholder="08xxxxxxxx" class="auth-input w-full bg-white/80 border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 outline-none text-slate-800 font-medium">
                  </span>
                </label>
              </div>
            </div>

            <div class="step-content" data-step-content="2">
              <div class="mb-6">
                <h2 class="text-2xl font-black text-slate-800 mb-1">สถานะผู้ใช้งาน</h2>
                <p class="text-sm text-slate-500 font-medium">เลือกบทบาทของคุณเพื่อกรอกข้อมูลยืนยัน</p>
              </div>

              <div class="flex flex-wrap gap-2 mb-8">
                ${Object.entries(ROLE_LABELS)
                  .map(([value, label], index) => renderRoleChip(value, label, index === 0))
                  .join("")}
              </div>

              <div id="dynamicFields" class="space-y-4 dynamic-fields-container max-h-[300px] overflow-y-auto pr-2"></div>
            </div>

            <div class="step-content" data-step-content="3">
              <div class="mb-8">
                <h2 class="text-2xl font-black text-slate-800 mb-1">ยืนยันข้อมูลอีกครั้ง</h2>
                <p class="text-sm text-slate-500 font-medium">ระบบจะส่งลิงก์ยืนยันไปที่อีเมลของคุณทันที</p>
              </div>

              <div class="space-y-6">
                <div id="signupReview" class="grid gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-5 text-sm text-slate-700"></div>

                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <label class="flex items-start gap-3 cursor-pointer">
                    <input name="acceptTerms" type="checkbox" required class="mt-1 peer appearance-none min-w-[18px] h-[18px] border-2 border-slate-300 rounded checked:bg-blue-600 checked:border-blue-600 transition-all">
                    <span class="text-xs font-medium text-slate-500 leading-relaxed">ฉันตรวจสอบข้อมูลทั้งหมดแล้ว และยอมรับเงื่อนไขการสมัครสมาชิกผ่านระบบจัดเก็บข้อมูลของ ANT Library</span>
                  </label>
                </div>

              </div>
            </div>

            <div id="signupMessage" class="hidden mt-6 rounded-xl border px-4 py-3 text-sm font-medium"></div>

            <div class="mt-auto pt-10 flex items-center justify-between gap-4">
              <button type="button" id="prevBtn" class="hidden px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2">
                <i data-lucide="arrow-left" class="w-4 h-4"></i>
                <span>ย้อนกลับ</span>
              </button>
              <div class="flex-grow"></div>
              <button type="button" id="nextBtn" class="w-full sm:w-auto px-10 py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-100 hover:shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                <span>ถัดไป</span>
                <i data-lucide="chevron-right" class="w-5 h-5"></i>
              </button>
              <button type="submit" id="submitBtn" class="hidden w-full sm:w-auto px-10 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black rounded-xl shadow-lg shadow-emerald-100 hover:shadow-emerald-200 hover:scale-[1.02] active:scale-[0.98] transition-all items-center justify-center gap-2">
                <span>ส่งคำขอสมัครสมาชิก</span>
                <i data-lucide="send" class="w-5 h-5"></i>
              </button>
            </div>

            <p class="mt-6 text-center text-xs font-medium text-slate-400">
              มีบัญชีแล้ว? <a href="/signin" data-link class="text-blue-600 font-bold hover:underline">กลับไปหน้าเข้าสู่ระบบ</a>
            </p>
          </form>
        </div>
      </div>
    </section>
  `;
}

export function mountSignupView(root) {
  if (!root) return;

  let currentStep = 1;
  const totalSteps = 3;
  const form = root.querySelector("#signupForm");
  const dynamicFields = root.querySelector("#dynamicFields");
  const nextBtn = root.querySelector("#nextBtn");
  const prevBtn = root.querySelector("#prevBtn");
  const submitBtn = root.querySelector("#submitBtn");
  const message = root.querySelector("#signupMessage");
  const review = root.querySelector("#signupReview");

  const renderRoleFields = (role) => {
    if (!dynamicFields) return;
    dynamicFields.innerHTML = FIELD_CONFIG[role].map(renderDynamicField).join("");
  };

  const updateReview = () => {
    if (!review || !form) return;
    const data = collectSignupPayload(form);
    const items = [
      ["ชื่อ", data.displayName],
      ["อีเมล", data.email],
      ["เบอร์โทร", data.phone],
      ["บทบาท", ROLE_LABELS[data.role] || data.role],
      ["รหัสยืนยัน", data.idCode],
      ["แผนก/หน่วยงาน", data.department || data.organization || "-"],
    ];

    review.innerHTML = items
      .map(([label, value]) => `<div class="flex justify-between gap-4"><span class="font-bold text-slate-500">${label}</span><span class="text-right font-semibold">${escapeHtml(value || "-")}</span></div>`)
      .join("");
  };

  const updateSteps = () => {
    root.querySelectorAll("[data-step-content]").forEach((el) => {
      el.classList.toggle("active", Number(el.dataset.stepContent) === currentStep);
    });

    root.querySelectorAll("[data-step-indicator]").forEach((el) => {
      const step = Number(el.dataset.stepIndicator);
      const dot = el.querySelector("[data-step-dot]");
      el.classList.toggle("opacity-50", step > currentStep);

      if (dot) {
        dot.className =
          step < currentStep
            ? "w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-lg transition-all"
            : step === currentStep
              ? "w-8 h-8 rounded-full bg-white text-blue-600 ring-4 ring-sky-400/30 flex items-center justify-center font-bold text-sm shadow-lg transition-all"
              : "w-8 h-8 rounded-full bg-sky-400/50 text-white flex items-center justify-center font-bold text-sm transition-all";
        dot.innerHTML = step < currentStep ? '<i data-lucide="check" class="w-4 h-4"></i>' : String(step);
      }
    });

    prevBtn?.classList.toggle("hidden", currentStep === 1);
    nextBtn?.classList.toggle("hidden", currentStep === totalSteps);
    submitBtn?.classList.toggle("hidden", currentStep !== totalSteps);
    if (currentStep === totalSteps) updateReview();
    window.lucide?.createIcons?.();
  };

  root.querySelectorAll('input[name="role"]').forEach((input) => {
    input.addEventListener("change", () => renderRoleFields(input.value));
  });

  nextBtn?.addEventListener("click", () => {
    const validation = validateCurrentStep(form, currentStep);
    if (!validation.ok) {
      setMessage(message, validation.error, "error");
      showToast(validation.error);
      return;
    }
    setMessage(message, "", "hidden");
    currentStep = Math.min(totalSteps, currentStep + 1);
    updateSteps();
  });

  prevBtn?.addEventListener("click", () => {
    currentStep = Math.max(1, currentStep - 1);
    updateSteps();
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const validation = validateSignupForm(form);
    if (!validation.ok) {
      setMessage(message, validation.error, "error");
      showToast(validation.error);
      return;
    }

    const payload = collectSignupPayload(form);
    setButtonLoading(submitBtn, true);
    setMessage(message, "กำลังส่งข้อมูลไปยังระบบ...", "info");

    try {
      const res = await apiSignupRequest(payload);
      if (!res?.ok) throw new Error(res?.error || "สมัครสมาชิกไม่สำเร็จ");
      setMessage(message, "รับคำขอสมัครแล้ว กรุณาตรวจสอบอีเมลเพื่อยืนยันตัวตน", "success");
      showToast("ส่งคำขอสมัครสมาชิกสำเร็จ");
      form.reset();
      currentStep = 1;
      renderRoleFields("student");
      updateSteps();
    } catch (error) {
      setMessage(message, error?.message || "สมัครสมาชิกไม่สำเร็จ", "error");
      showToast(error?.message || "สมัครสมาชิกไม่สำเร็จ");
    } finally {
      setButtonLoading(submitBtn, false);
    }
  });

  renderRoleFields("student");
  updateSteps();
}

function renderStepIndicator(step, eyebrow, label, active = false) {
  const opacity = active ? "" : " opacity-50";
  const dotClass = active
    ? "bg-white text-blue-600 shadow-lg"
    : "bg-sky-400/50 text-white";

  return `
    <div class="flex items-center gap-4 relative z-10 step-indicator${opacity}" data-step-indicator="${step}">
      <div data-step-dot class="w-8 h-8 rounded-full ${dotClass} flex items-center justify-center font-bold text-sm transition-all">${step}</div>
      <div>
        <p class="text-xs font-bold text-sky-100 uppercase tracking-wider">${eyebrow}</p>
        <p class="text-sm font-bold">${label}</p>
      </div>
    </div>
  `;
}

function renderRoleChip(value, label, checked) {
  return `
    <label class="cursor-pointer">
      <input type="radio" name="role" value="${value}" class="peer hidden" ${checked ? "checked" : ""}>
      <span class="px-5 py-2 border-2 border-slate-100 rounded-full text-sm font-bold text-slate-500 peer-checked:bg-blue-600 peer-checked:text-white peer-checked:border-blue-600 transition-all inline-block">${label}</span>
    </label>
  `;
}

function renderDynamicField(field) {
  const required = field.required === false ? "" : "required";
  if (field.type === "select") {
    return `
      <label class="grid gap-1.5">
        <span class="text-xs font-bold text-slate-600 ml-1">${field.label}</span>
        <select name="${field.name}" ${required} class="auth-input w-full bg-white/70 border border-slate-200 rounded-lg py-3 px-4 outline-none text-slate-800 text-sm font-medium">
          <option value="">เลือก${field.label}</option>
          ${field.options.map((option) => `<option value="${option}">${option}</option>`).join("")}
        </select>
      </label>
    `;
  }

  return `
    <label class="grid gap-1.5">
      <span class="text-xs font-bold text-slate-600 ml-1">${field.label}</span>
      <input type="${field.type || "text"}" name="${field.name}" ${required} placeholder="${field.placeholder || ""}" class="auth-input w-full bg-white/70 border border-slate-200 rounded-lg py-3 px-4 outline-none text-slate-800 text-sm font-medium">
    </label>
  `;
}

function collectSignupPayload(form) {
  const formData = new FormData(form);
  const role = String(formData.get("role") || "student");
  const data = Object.fromEntries(formData.entries());

  return {
    displayName: String(data.displayName || "").trim(),
    email: String(data.email || "").trim().toLowerCase(),
    phone: String(data.phone || "").replace(/\D/g, ""),
    role,
    groupType: "member",
    idCode: String(data.idCode || "").trim(),
    idType: role === "external" ? String(data.idType || "").trim() : "",
    department: role === "external" ? "" : String(data.department || "").trim(),
    personnelType: ["teacher", "staff"].includes(role) ? String(data.personnelType || "").trim() : "",
    level: role === "student" ? String(data.level || "").trim() : "",
    classRoom: role === "student" ? String(data.classRoom || "").trim() : "",
    organization: role === "external" ? String(data.organization || "").trim() : "",
    status: "pending",
    isVerified: false,
    photoURL: "/assets/img/default-avatar.svg",
  };
}

function validateCurrentStep(form, step) {
  if (!form) return { ok: false, error: "ไม่พบแบบฟอร์ม" };
  const data = collectSignupPayload(form);

  if (step === 1) {
    if (!data.displayName) return { ok: false, error: "กรุณากรอกชื่อ-นามสกุล" };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return { ok: false, error: "รูปแบบอีเมลไม่ถูกต้อง" };
    if (!/^\d{10}$/.test(data.phone)) return { ok: false, error: "เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก" };
  }

  if (step === 2) {
    const validation = validateRoleFields(data);
    if (!validation.ok) return validation;
  }

  return { ok: true };
}

function validateSignupForm(form) {
  const stepOne = validateCurrentStep(form, 1);
  if (!stepOne.ok) return stepOne;

  const stepTwo = validateCurrentStep(form, 2);
  if (!stepTwo.ok) return stepTwo;

  if (!form.elements.acceptTerms?.checked) {
    return { ok: false, error: "กรุณายอมรับเงื่อนไขก่อนสมัครสมาชิก" };
  }

  return { ok: true };
}

function validateRoleFields(data) {
  if (!data.idCode) return { ok: false, error: "กรุณากรอกรหัสหรือเลขเอกสารยืนยันตัวตน" };

  if (data.role === "student") {
    if (!data.department) return { ok: false, error: "กรุณากรอกแผนกวิชา/สาขา" };
    if (!["ปวช.", "ปวส."].includes(data.level)) return { ok: false, error: "ระดับชั้นต้องเป็น ปวช. หรือ ปวส." };
    if (!/^\d+\/\d+$/.test(data.classRoom)) return { ok: false, error: "ห้องเรียนต้องเป็นรูปแบบ เช่น 1/1" };
  }

  if (["teacher", "staff"].includes(data.role)) {
    if (!data.department) return { ok: false, error: "กรุณากรอกแผนก/ฝ่าย" };
    if (!data.personnelType) return { ok: false, error: "กรุณาเลือกประเภทบุคลากร" };
  }

  if (data.role === "external" && !["nationalId", "passport", "studentCard"].includes(data.idType)) {
    return { ok: false, error: "กรุณาเลือกประเภทเอกสารของบุคคลภายนอก" };
  }

  return { ok: true };
}

function setButtonLoading(button, loading) {
  if (!button) return;
  button.disabled = loading;
  button.innerHTML = loading
    ? '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i><span>กำลังส่งข้อมูล...</span>'
    : '<span>ส่งคำขอสมัครสมาชิก</span><i data-lucide="send" class="w-5 h-5"></i>';
  window.lucide?.createIcons?.();
}

function setMessage(el, text, type) {
  if (!el) return;
  if (type === "hidden" || !text) {
    el.className = "hidden rounded-xl border px-4 py-3 text-sm font-medium";
    el.textContent = "";
    return;
  }

  const classes = {
    info: "border-sky-100 bg-sky-50 text-sky-800",
    success: "border-emerald-100 bg-emerald-50 text-emerald-800",
    error: "border-rose-100 bg-rose-50 text-rose-800",
  };
  el.className = `rounded-xl border px-4 py-3 text-sm font-medium ${classes[type] || classes.info}`;
  el.textContent = text;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
