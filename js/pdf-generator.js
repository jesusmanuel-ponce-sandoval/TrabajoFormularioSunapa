/* ============================================================
   Construye el HTML de salida para checklists / tablas dinámicas
   dentro de la plantilla de PDF
   ============================================================ */
function buildChecklistOutput(prefix, items, outContainerId) {
    const container = document.getElementById(outContainerId);
    if (!container) return;
    let html = '<ul style="list-style:none;padding-left:0;margin:0;">';
    items.forEach((label, idx) => {
        const i = idx + 1;
        const checked = document.querySelector(`input[name="${prefix}-chk-${i}"]:checked`);
        const val = checked ? (checked.value === "si" ? "Sí" : checked.value === "no" ? "No" : "N/A") : "-";
        const obsEl = document.getElementById(`${prefix}-chk-${i}-obs`);
        const obs = obsEl && obsEl.value ? ` — ${obsEl.value}` : "";
        html += `<li style="padding:3px 0;border-bottom:1px solid #eee;"><strong>${i}. ${label}:</strong> ${val}${obs}</li>`;
    });
    html += "</ul>";
    container.innerHTML = html;
}

function buildParamsOutput(prefix, params, outContainerId) {
    const container = document.getElementById(outContainerId);
    if (!container) return;
    let html = '<table class="data-table" style="width:100%;border-collapse:collapse;font-size:10px;"><tr><th style="border:1px solid #999;padding:4px;">Parámetro</th><th style="border:1px solid #999;padding:4px;">Mín.</th><th style="border:1px solid #999;padding:4px;">Máx.</th><th style="border:1px solid #999;padding:4px;">Referencia</th></tr>';
    params.forEach((p, idx) => {
        const i = idx + 1;
        const minEl = document.getElementById(`${prefix}-param-${i}-min`);
        const maxEl = document.getElementById(`${prefix}-param-${i}-max`);
        html += `<tr><td style="border:1px solid #999;padding:4px;">${p.label}</td><td style="border:1px solid #999;padding:4px;">${minEl && minEl.value ? minEl.value : "-"}</td><td style="border:1px solid #999;padding:4px;">${maxEl && maxEl.value ? maxEl.value : "-"}</td><td style="border:1px solid #999;padding:4px;">${p.ref}</td></tr>`;
    });
    html += "</table>";
    container.innerHTML = html;
}

function buildCostOutput(prefix, rows, outContainerId) {
    const container = document.getElementById(outContainerId);
    if (!container) return;
    let html = '<table class="data-table" style="width:100%;border-collapse:collapse;font-size:10px;"><tr><th style="border:1px solid #999;padding:4px;">Rubro</th><th style="border:1px solid #999;padding:4px;">Detalle</th><th style="border:1px solid #999;padding:4px;">P. Unit.</th><th style="border:1px solid #999;padding:4px;">P. Total</th></tr>';
    let total = 0;
    rows.forEach((label, idx) => {
        const i = idx + 1;
        const descEl = document.getElementById(`${prefix}-cost-${i}-desc`);
        const punitEl = document.getElementById(`${prefix}-cost-${i}-punit`);
        const ptotalEl = document.getElementById(`${prefix}-cost-${i}-ptotal`);
        const ptotalVal = ptotalEl && parseFloat(ptotalEl.value) ? parseFloat(ptotalEl.value) : 0;
        total += ptotalVal;
        html += `<tr><td style="border:1px solid #999;padding:4px;">${label}</td><td style="border:1px solid #999;padding:4px;">${descEl && descEl.value ? descEl.value : "-"}</td><td style="border:1px solid #999;padding:4px;">${punitEl && punitEl.value ? "$" + punitEl.value : "-"}</td><td style="border:1px solid #999;padding:4px;">${ptotalEl && ptotalEl.value ? "$" + ptotalEl.value : "-"}</td></tr>`;
    });
    html += `<tr><td colspan="3" style="border:1px solid #999;padding:4px;text-align:right;"><strong>TOTAL:</strong></td><td style="border:1px solid #999;padding:4px;"><strong>$${total.toFixed(2)}</strong></td></tr>`;
    html += "</table>";
    container.innerHTML = html;
}

/* ============================================================
   Rellena los campos simples de texto/fecha/select (out-<id>)
   y los grupos de radio simples (out-<name>) que tengan un
   elemento de salida correspondiente en la plantilla de PDF
   ============================================================ */
function fillSimpleFields(formId) {
    const view = document.getElementById("view-" + formId);
    if (!view) return;

    view.querySelectorAll("input, textarea, select").forEach(el => {
        if (el.type === "radio") {
            const outEl = document.getElementById("out-" + el.name);
            if (!outEl) return; // manejado por checklist dinámico
            if (el.checked) {
                outEl.textContent = el.value === "si" ? "Sí" : el.value === "no" ? "No" : el.value;
            }
        } else if (el.type === "file") {
            /* nada */
        } else if (el.id) {
            const outEl = document.getElementById("out-" + el.id);
            if (!outEl) return; // manejado por checklist/params/costos dinámicos
            outEl.textContent = el.value || "-";
        }
    });
}

function fillSignatures(formId) {
    const view = document.getElementById("view-" + formId);
    if (!view) return;
    view.querySelectorAll("canvas.signature-pad").forEach(canvas => {
        const outImg = document.getElementById("out-" + canvas.id);
        if (!outImg) return;
        const dataUrl = signatureData[canvas.id];
        if (dataUrl) {
            outImg.src = dataUrl;
            outImg.style.display = "block";
        } else {
            outImg.style.display = "none";
        }
    });
}

function fillPhotos(formId) {
    const container = document.getElementById("out-foto-gallery-" + formId);
    if (!container) return;
    const fotos = fotoData[formId] || [];
    container.innerHTML = fotos.map(src => `<img src="${src}">`).join("");
}

/* ============================================================
   Abre la ventana de impresión con la plantilla del formulario
   ============================================================ */
function abrirVentanaImpresion(formId, fileNamePrefix) {
    const element = document.getElementById("pdf-content-" + formId);
    const container = document.getElementById("pdf-container-" + formId);
    if (!element || !container) {
        alert("No se encontró la plantilla del PDF.");
        return;
    }

    const clienteEl = document.getElementById(formId + "-cliente");
    const fileName = `${fileNamePrefix}_${(clienteEl ? clienteEl.value : "SUNAPA") || "SUNAPA"}`.replace(/[\\/:*?"<>|]+/g, "-");

    const printWindow = window.open("", "_blank", "width=900,height=1200");
    if (!printWindow) {
        alert("El navegador bloqueó la ventana del PDF. Permite las ventanas emergentes e inténtalo de nuevo.");
        return;
    }

    const pdfMarkup = element.cloneNode(true).outerHTML;
    printWindow.document.open();
    printWindow.document.write(`<!doctype html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <title>${fileName}</title>
            <style>
                @page { size: A4 portrait; margin: 12mm; }
                * { box-sizing: border-box; }
                body { margin: 0; color: #111; background: #fff; font-family: Arial, sans-serif; }
                .pdf-content { width: 100%; min-height: 270mm; padding: 5mm; font-size: 11px; }
                p { line-height: 1.35; }
                h4 { margin-bottom: 5px; }
                img { max-width: 100%; }
                a { color: #111; }
                table { width: 100%; border-collapse: collapse; }
                td, th { border: 1px solid #999; padding: 4px; font-size: 10px; }
            </style>
        </head>
        <body>${pdfMarkup}</body>
        </html>`);
    printWindow.document.close();
    printWindow.document.title = fileName;
    printWindow.addEventListener("load", () => {
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }, 250);
    });
}

/* ============================================================
   Generadores de PDF específicos por formulario
   ============================================================ */
window.generarPDF_ficha = function () {
    fillSimpleFields("ficha");
    fillPhotos("ficha");
    abrirVentanaImpresion("ficha", "Informe_AI_ET_PF");
};

window.generarPDF_acta = function () {
    fillSimpleFields("acta");
    buildChecklistOutput("acta", ACTA_CHECKLIST, "out-acta-checklist");
    buildParamsOutput("acta", ACTA_PARAMS, "out-acta-params");
    fillSignatures("acta");
    fillPhotos("acta");
    abrirVentanaImpresion("acta", "Acta_Entrega_Recepcion");
};

window.generarPDF_previo = function () {
    fillSimpleFields("previo");
    buildChecklistOutput("previo", PREVIO_CHECKLIST, "out-previo-checklist");
    fillPhotos("previo");
    abrirVentanaImpresion("previo", "Formato_Previo_ET_PF");
};

window.generarPDF_vt = function () {
    fillSimpleFields("vt");
    fillPhotos("vt");
    abrirVentanaImpresion("vt", "Informe_Visita_Tecnica");
};

window.generarPDF_ot = function () {
    fillSimpleFields("ot");
    buildCostOutput("ot", OT_COST_ROWS, "out-ot-cost-table");
    fillPhotos("ot");
    abrirVentanaImpresion("ot", "Orden_de_Trabajo");
};
