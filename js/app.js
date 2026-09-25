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
    "Transporte Grúa",
    "Arreglo Bases de Hormigón",
    "Cambio de Pernos de Anclaje Chasis",
    "Pintar con Epóxico Bases Hormigón",
    "Montaje y Anclaje de Chasis",
    "Montaje de Cardán y Bridas",
    "Nivelación y Alineación de Equipos",
    "Montaje del Protector Cardán",
    "Montaje del Tanque de Combustible",
    "Montaje de Mangueras de Combustible",
    "Montaje de Filtro RACOR o Similar",
    "Montaje del Sistema de Escape",
    "Montaje Pedestal Tablero de Control",
    "Limpieza Estación de Bombeo",
    "Entrega de Bolso con Herramientas",
    "Entrega del Manual del Operador",
    "Entrega Técnica",
    "Prueba Funcionamiento c/Carga y Parámetros Registrados"
];

const ACTA_PARAMS = [
    { label: "Horómetro", ref: "H/T" },
    { label: "RPM", ref: "900 / 2,070" },
    { label: "Presión aceite motor", ref: "15 Psi / 75 Psi" },
    { label: "Temp. aceite motor", ref: "Máx 108°C" },
    { label: "Temp. refrigerante (manómetro)", ref: "Máx 98°C" },
    { label: "Temp. refrigerante retorno del radiador", ref: "Δt ±40°C" },
    { label: "Temp. refrigerante ingreso al radiador", ref: "Δt ±40°C" },
    { label: "Temp. gases turbo", ref: "Máx 500°C" },
    { label: "Temp. rodamientos embrague", ref: "≤82°C" }
];

const PREVIO_CHECKLIST = [
    "Tanque de Combustible Limpio",
    "Mangueras de Combustible Ajustadas y sin Fugas",
    "Filtro RACOR Limpio, Mangueras Ajustadas y sin Fugas",
    "Sistema de Escape de Gases Libre y sin Restricciones",
    "Sistema de Admisión de Aire Libre y sin Restricciones",
    "Flujo de Aire del Ventilador al Radiador Libre y sin Restricciones",
    "Anclaje del Motor sin Pernos Flojos",
    "Acoples, Poleas y Bandas Alineados",
    "Cardán con Holgura Necesaria (10mm x ml)",
    "Cubierta de la Estación de Bombeo Instalada y en Buen Estado"
];

const OT_CATEGORIES = ["Mano de Obra", "Repuestos", "Materiales / Insumos", "Movilización"];

/* Estado de las líneas de costo de la Orden de Trabajo: un arreglo de
   arreglos de ids de fila, uno por categoría. Permite varias líneas por
   categoría (ej. varios tipos de repuestos). */
let otRowCounter = 0;
let otRows = [];

function initOtRows() {
    otRowCounter = 0;
    otRows = OT_CATEGORIES.map(() => {
        otRowCounter++;
        return [otRowCounter];
    });
}

function createOtRow(c, rowId) {
    const div = document.createElement("div");
    div.className = "cost-row";
    div.id = `ot-row-${c}-${rowId}`;
    div.innerHTML = `
        <input type="text" id="ot-cost-${c}-${rowId}-desc" placeholder="Descripción">
        <input type="number" step="0.01" id="ot-cost-${c}-${rowId}-punit" placeholder="P. Unit.">
        <input type="number" step="0.01" id="ot-cost-${c}-${rowId}-ptotal" placeholder="P. Total" class="cost-total-input">
        <button type="button" class="btn-remove-row" title="Quitar línea">&times;</button>
    `;
    div.querySelector(".cost-total-input").addEventListener("input", updateOtTotal);
    div.querySelector(".btn-remove-row").addEventListener("click", () => {
        div.remove();
        otRows[c] = otRows[c].filter(id => id !== rowId);
        updateOtTotal();
    });
    return div;
}

function renderOtCostTable() {
    const container = document.getElementById("ot-cost-inputs");
    if (!container) return;
    container.innerHTML = "";

    OT_CATEGORIES.forEach((catLabel, c) => {
        const catDiv = document.createElement("div");
        catDiv.className = "cost-category";
        catDiv.innerHTML = `<div class="cost-category-title">${catLabel}</div><div class="cost-rows" id="ot-cat-${c}-rows"></div>`;
        container.appendChild(catDiv);

        const rowsContainer = catDiv.querySelector(".cost-rows");
        otRows[c].forEach(rowId => rowsContainer.appendChild(createOtRow(c, rowId)));

        const addBtn = document.createElement("button");
        addBtn.type = "button";
        addBtn.className = "btn-add-row";
        addBtn.textContent = `+ Añadir línea de ${catLabel}`;
        addBtn.addEventListener("click", () => {
            otRowCounter++;
            const newId = otRowCounter;
            otRows[c].push(newId);
            rowsContainer.appendChild(createOtRow(c, newId));
        });
        catDiv.appendChild(addBtn);
    });

    const totalDiv = document.createElement("div");
    totalDiv.className = "total-row-display";
    totalDiv.innerHTML = `TOTAL: <span id="ot-total-display">$0.00</span>`;
    container.appendChild(totalDiv);

    updateOtTotal();
}

function updateOtTotal() {
    let total = 0;
    OT_CATEGORIES.forEach((_, c) => {
        (otRows[c] || []).forEach(rowId => {
            const el = document.getElementById(`ot-cost-${c}-${rowId}-ptotal`);
            const val = el && parseFloat(el.value);
            if (!isNaN(val)) total += val;
        });
    });
    const display = document.getElementById("ot-total-display");
    if (display) display.textContent = "$" + total.toFixed(2);
}

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

    if (formId === "ot") {
        data.__otRows = otRows;
        data.__otRowCounter = otRowCounter;
    }

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

    /* reconstruir las líneas dinámicas de costos de la OT antes de rellenar valores */
    if (formId === "ot" && data.__otRows) {
        otRows = data.__otRows;
        otRowCounter = data.__otRowCounter || otRowCounter;
        renderOtCostTable();
    }

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
    if (formId === "ot") updateOtTotal();

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

    if (formId === "ot") {
        initOtRows();
        renderOtCostTable();
    }
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
    initOtRows();
    renderOtCostTable();

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
