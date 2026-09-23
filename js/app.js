/* ============================================================
   Datos de fotos en memoria por formulario (base64)
   ============================================================ */
const fotoData = {};

/* ============================================================
   Firma táctil (canvas) — datos en memoria por id de canvas
   ============================================================ */
const signatureData = {};

function setupSignaturePad(canvas) {
    const ctx = canvas.getContext("2d");
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111";
    let drawing = false;
    let lastX = 0, lastY = 0;

    function getPos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
    }

    function start(e) {
        drawing = true;
        const p = getPos(e);
        lastX = p.x;
        lastY = p.y;
        e.preventDefault();
    }

    function move(e) {
        if (!drawing) return;
        const p = getPos(e);
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
        lastX = p.x;
        lastY = p.y;
        e.preventDefault();
    }

    function end() {
        if (!drawing) return;
        drawing = false;
        signatureData[canvas.id] = canvas.toDataURL("image/png");
    }

    canvas.addEventListener("pointerdown", start);
    canvas.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    canvas.addEventListener("pointerleave", () => { if (drawing) end(); });
}

function clearSignature(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    delete signatureData[canvasId];
}

function loadSignatureIntoCanvas(canvasId, dataUrl) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !dataUrl) return;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = dataUrl;
    signatureData[canvasId] = dataUrl;
}

function initSignaturePads() {
    document.querySelectorAll("canvas.signature-pad[data-sig-form]").forEach(canvas => {
        setupSignaturePad(canvas);
    });
    document.querySelectorAll(".btn-clear-sig[data-clear-target]").forEach(btn => {
        btn.addEventListener("click", () => clearSignature(btn.dataset.clearTarget));
    });
}

/* ============================================================
   Definiciones de checklists / tablas dinámicas por formulario
   ============================================================ */
const ACTA_CHECKLIST = [
    "Transporte grúa",
    "Arreglo bases de hormigón",
    "Cambio de pernos de anclaje chasis",
    "Pintar con epóxico bases hormigón",
    "Montaje y anclaje de chasis",
    "Montaje de cardán y bridas",
    "Nivelación y alineación de equipos",
    "Montaje del protector cardán",
    "Montaje del tanque de combustible",
    "Montaje de mangueras de combustible",
    "Montaje de filtro RACOR o similar",
    "Montaje del sistema de escape",
    "Montaje pedestal tablero de control",
    "Limpieza estación de bombeo",
    "Entrega de bolso con herramientas",
    "Entrega del manual del operador",
    "Entrega técnica",
    "Prueba funcionamiento c/carga y parámetros registrados"
];

const ACTA_PARAMS = [
    { label: "RPM", ref: "900 / 2,070" },
    { label: "Horómetro", ref: "H/T" },
    { label: "Presión aceite motor", ref: "15 Psi / 75 Psi" },
    { label: "Temp. aceite motor", ref: "Máx 108°C" },
    { label: "Temp. refrigerante (manómetro)", ref: "Máx 98°C" },
    { label: "Temp. refrigerante retorno del radiador", ref: "Δt ±40°C" },
    { label: "Temp. refrigerante ingreso al radiador", ref: "Δt ±40°C" },
    { label: "Temp. gases turbo", ref: "Máx 500°C" },
    { label: "Temp. rodamientos embrague", ref: "≤82°C" }
];

const PREVIO_CHECKLIST = [
    "Tanque de combustible limpio",
    "Mangueras de combustible ajustadas y sin fugas",
    "Filtro RACOR limpio, mangueras ajustadas y sin fugas",
    "Sistema de escape de gases libre y sin restricciones",
    "Sistema de admisión de aire libre y sin restricciones",
    "Flujo de aire del ventilador al radiador libre y sin restricciones",
    "Anclaje del motor sin pernos flojos",
    "Acoples, poleas y bandas alineados",
    "Cardán con holgura necesaria (10mm x ml)",
    "Cubierta de la estación de bombeo instalada y en buen estado"
];

const OT_COST_ROWS = ["Mano de Obra", "Repuestos", "Materiales / Insumos", "Movilización"];

/* ============================================================
   Render de checklist (Sí / No / N-A + observaciones)
   ============================================================ */
function renderChecklist(containerId, prefix, items) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let html = "";
    items.forEach((label, idx) => {
        const i = idx + 1;
        html += `
        <div class="checklist-item">
            <span class="checklist-label">${i}. ${label}</span>
            <div class="checklist-options">
                <label><input type="radio" name="${prefix}-chk-${i}" value="si"> Sí</label>
                <label><input type="radio" name="${prefix}-chk-${i}" value="no"> No</label>
                <label><input type="radio" name="${prefix}-chk-${i}" value="na"> N/A</label>
            </div>
            <input type="text" id="${prefix}-chk-${i}-obs" placeholder="Observaciones (opcional)">
        </div>`;
    });
    container.innerHTML = html;
}

/* ============================================================
   Render de tabla de parámetros (Mín / Máx / Referencia)
   ============================================================ */
function renderParams(containerId, prefix, params) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let html = `<table class="data-table"><tr><th>Parámetro</th><th>Mín.</th><th>Máx.</th><th class="ref-col">Referencia</th></tr>`;
    params.forEach((p, idx) => {
        const i = idx + 1;
        html += `<tr>
            <td>${p.label}</td>
            <td><input type="text" id="${prefix}-param-${i}-min"></td>
            <td><input type="text" id="${prefix}-param-${i}-max"></td>
            <td class="ref-col">${p.ref}</td>
        </tr>`;
    });
    html += `</table>`;
    container.innerHTML = html;
}

/* ============================================================
   Render de tabla de costos (Descripción / Detalle / P.Unit / P.Total)
   ============================================================ */
function renderCostTable(containerId, prefix, rows) {
    const container = document.getElementById(containerId);
    if (!container) return;
    let html = `<table class="data-table"><tr><th>Rubro</th><th>Detalle</th><th>P. Unit.</th><th>P. Total</th></tr>`;
    rows.forEach((label, idx) => {
        const i = idx + 1;
        html += `<tr>
            <td>${label}</td>
            <td><input type="text" id="${prefix}-cost-${i}-desc"></td>
            <td><input type="number" step="0.01" id="${prefix}-cost-${i}-punit"></td>
            <td><input type="number" step="0.01" id="${prefix}-cost-${i}-ptotal" class="cost-total-input" data-prefix="${prefix}"></td>
        </tr>`;
    });
    html += `<tr class="total-row"><td colspan="3" style="text-align:right;">TOTAL:</td><td id="${prefix}-total-display">$0.00</td></tr></table>`;
    container.innerHTML = html;

    container.querySelectorAll(".cost-total-input").forEach(input => {
        input.addEventListener("input", () => updateCostTotal(prefix, rows.length));
    });
}

function updateCostTotal(prefix, rowCount) {
    let total = 0;
    for (let i = 1; i <= rowCount; i++) {
        const el = document.getElementById(`${prefix}-cost-${i}-ptotal`);
        const val = el && parseFloat(el.value);
        if (!isNaN(val)) total += val;
    }
    const display = document.getElementById(`${prefix}-total-display`);
    if (display) display.textContent = "$" + total.toFixed(2);
}

/* ============================================================
   Navegación entre vistas
   ============================================================ */
function showView(id) {
    document.querySelectorAll(".view").forEach(v => (v.style.display = "none"));
    const target = document.getElementById(id === "home" ? "home-view" : "view-" + id);
    if (target) target.style.display = "block";
    window.scrollTo(0, 0);
}

/* ============================================================
   Guardar / cargar / limpiar borrador (genérico por formulario)
   ============================================================ */
function guardarBorrador(formId) {
    const container = document.getElementById("view-" + formId);
    if (!container) return;
    const data = {};

    container.querySelectorAll("input, textarea, select").forEach(el => {
        if (!el.id && !el.name) return;
        if (el.type === "radio") {
            if (el.checked) data["radio:" + el.name] = el.value;
        } else if (el.type === "file") {
            /* se maneja aparte con fotoData */
        } else if (el.id) {
            data[el.id] = el.value;
        }
    });

    data.__fotos = fotoData[formId] || [];

    const firmas = {};
    container.querySelectorAll("canvas.signature-pad").forEach(canvas => {
        if (signatureData[canvas.id]) firmas[canvas.id] = signatureData[canvas.id];
    });
    data.__firmas = firmas;

    localStorage.setItem("borrador_" + formId, JSON.stringify(data));
    alert("Borrador guardado exitosamente. Puedes cerrar la app y continuar luego.");
}

function cargarBorrador(formId) {
    const raw = localStorage.getItem("borrador_" + formId);
    if (!raw) return;
    let data;
    try {
        data = JSON.parse(raw);
    } catch (e) {
        return;
    }
    const container = document.getElementById("view-" + formId);
    if (!container) return;

    container.querySelectorAll("input, textarea, select").forEach(el => {
        if (el.type === "radio") {
            const saved = data["radio:" + el.name];
            if (saved !== undefined) el.checked = el.value === saved;
        } else if (el.type === "file") {
            /* ignorar */
        } else if (el.id && data[el.id] !== undefined) {
            el.value = data[el.id];
        }
    });

    /* recalcular total de costos si aplica */
    if (formId === "ot") updateCostTotal("ot", OT_COST_ROWS.length);

    if (data.__fotos && Array.isArray(data.__fotos)) {
        fotoData[formId] = data.__fotos;
        renderPhotoGallery(formId);
    } else if (data.__foto) {
        /* compatibilidad con borradores antiguos (una sola foto) */
        fotoData[formId] = [data.__foto];
        renderPhotoGallery(formId);
    }

    if (data.__firmas) {
        Object.keys(data.__firmas).forEach(canvasId => {
            loadSignatureIntoCanvas(canvasId, data.__firmas[canvasId]);
        });
    }
}

function limpiarFormulario(formId) {
    if (!confirm("¿Estás seguro de querer limpiar todo el formulario?")) return;
    localStorage.removeItem("borrador_" + formId);
    const formEl = document.getElementById("form-" + formId);
    if (formEl) formEl.reset();
    fotoData[formId] = [];
    renderPhotoGallery(formId);

    if (formEl) {
        formEl.querySelectorAll("canvas.signature-pad").forEach(canvas => clearSignature(canvas.id));
    }

    if (formId === "ot") updateCostTotal("ot", OT_COST_ROWS.length);
}

/* ============================================================
   Manejo de fotos — varias por formulario (galería)
   fotoData[formId] es un arreglo de dataURLs (base64)
   ============================================================ */
function renderPhotoGallery(formId) {
    const gallery = document.getElementById("gallery-" + formId);
    const countEl = document.getElementById("photo-count-" + formId);
    const fotos = fotoData[formId] || [];

    if (gallery) {
        gallery.innerHTML = fotos
            .map(
                (src, idx) => `
            <div class="photo-thumb">
                <img src="${src}" alt="Foto ${idx + 1}">
                <button type="button" class="photo-remove" data-form="${formId}" data-index="${idx}" title="Quitar foto">&times;</button>
            </div>`
            )
            .join("");
    }
    if (countEl) {
        countEl.textContent = fotos.length ? `${fotos.length} foto(s) añadida(s)` : "";
    }
}

function removePhoto(formId, index) {
    if (!fotoData[formId]) return;
    fotoData[formId].splice(index, 1);
    renderPhotoGallery(formId);
}

function initPhotoInputs() {
    document.querySelectorAll('input[type="file"][data-form]').forEach(input => {
        input.addEventListener("change", function (e) {
            const formId = this.dataset.form;
            const files = Array.from(e.target.files || []);
            if (!files.length) return;
            if (!fotoData[formId]) fotoData[formId] = [];

            let pending = files.length;
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = function (ev) {
                    fotoData[formId].push(ev.target.result);
                    pending--;
                    if (pending === 0) {
                        renderPhotoGallery(formId);
                    }
                };
                reader.readAsDataURL(file);
            });
            /* permite volver a elegir el mismo archivo más adelante */
            this.value = "";
        });
    });

    /* Delegación para el botón "quitar foto" (los thumbs se regeneran dinámicamente) */
    document.addEventListener("click", e => {
        const btn = e.target.closest(".photo-remove");
        if (!btn) return;
        removePhoto(btn.dataset.form, parseInt(btn.dataset.index, 10));
    });
}

/* ============================================================
   Inicialización
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
    /* Render de secciones dinámicas */
    renderChecklist("acta-checklist-inputs", "acta", ACTA_CHECKLIST);
    renderParams("acta-params-inputs", "acta", ACTA_PARAMS);
    renderChecklist("previo-checklist-inputs", "previo", PREVIO_CHECKLIST);
    renderCostTable("ot-cost-inputs", "ot", OT_COST_ROWS);

    /* Navegación */
    document.querySelectorAll("[data-target]").forEach(btn => {
        btn.addEventListener("click", () => showView(btn.dataset.target));
    });
    document.querySelectorAll(".btn-back").forEach(btn => {
        btn.addEventListener("click", () => showView("home"));
    });

    /* Fotos */
    initPhotoInputs();

    /* Firmas táctiles */
    initSignaturePads();

    /* Cargar borradores guardados de cada formulario */
    ["ficha", "acta", "previo", "vt", "ot"].forEach(id => cargarBorrador(id));

    showView("home");
});
