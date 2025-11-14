// =================================================================
// ARCHIVO: generador_main.js (REFACTORIZADO)
// CONTIENE:
// 1. Punto de entrada `initSvgMaker`.
// 2. Importación de módulos.
// 3. Asignación de TODOS los manejadores de eventos (listeners).
// =================================================================

 
// =================================================================
// ARCHIVO: generador_main.js (REFACTORIZADO Y CORREGIDO)
// CONTIENE:
// 1. Punto de entrada `initSvgMaker`.
// 2. Importación de módulos.
// 3. Asignación de TODOS los manejadores de eventos (listeners).
// =================================================================

import * as ApiSistema from './apisistema.js';
import * as state from './generador_state.js';
import { dom, cacheDomElements } from './generador_doms.js';
import * as ui from './generador_ui.js';
import * as handlers from './generador_handlers.js';

/**
 * Función principal que se ejecuta al cargar el DOM.
 * @param {HTMLElement} tabContainer - El elemento #tab-content-ia3d
 * @param {object} handles - Los manejadores de archivos de main.js
 */
// --- ¡CORRECCIÓN 1! La función ahora es async ---
export async function initSvgMaker(tabContainer, handles) {
    // 1. Inicializar Estado y DOM
    state.setAllHandles(handles);
    cacheDomElements(tabContainer);

    // --- ¡CORRECCIÓN 2! Eliminada la llamada redundante a ui.renderGallery() que estaba aquí ---
    // (Línea 26 anterior eliminada)

    // 3. Asignar eventos (listeners)
    
    // Botones principales
    dom.generateButton.addEventListener('click', handlers.handleGenerate);
    dom.generateRealisticButton.addEventListener('click', handlers.handleGenerateRealistic);
    dom.copySvgButton.addEventListener('click', handlers.handleCopySvg);
    dom.downloadSvgButton.addEventListener('click', handlers.handleDownloadSvg);
    dom.downloadGalleryButton.addEventListener('click', handlers.handleDownloadGallery);
    dom.uploadGalleryInput.addEventListener('change', handlers.handleGalleryUpload);
    dom.saveGalleryButton.addEventListener('click', handlers.handleSaveGalleryToProject);
    dom.deleteShapeButton.addEventListener('click', handlers.handleDeleteShape);
    
    // Eventos 3D
    dom.generate3DButton.addEventListener('click', handlers.handleGenerate3D);
    dom.edit3DButton.addEventListener('click', handlers.handleEdit3D);
    dom.copy3DModelButton.addEventListener('click', handlers.handleCopy3DModel);
    dom.download3DModelButton.addEventListener('click', handlers.handleDownload3DModel);
    dom.exportPlaneliteButton.addEventListener('click', handlers.handleExportPlanelite);

    // Botones del Modal
    dom.modalImproveCancel.addEventListener('click', () => {
        dom.improveModal.classList.add('hidden');
        ui.hideDeleteConfirmation();
    });
    dom.modalRenameSave.addEventListener('click', handlers.handleRenameSave);
    dom.modalImproveConfirm.addEventListener('click', handlers.handleImprove);
    dom.modalDuplicate.addEventListener('click', handlers.handleDuplicate);
    
    // Flujo de borrado (dentro del modal)
    dom.modalDelete.addEventListener('click', ui.showDeleteConfirmation);
    dom.modalDeleteCancelBtn.addEventListener('click', ui.hideDeleteConfirmation);
    dom.modalDeleteConfirmBtn.addEventListener('click', handlers.handleDelete);

    // Event listener para los controles manuales (Pan/Zoom 2D)
    dom.manualControls.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON' && e.target.dataset.action) {
            handlers.handleManualControls(e.target.dataset.action);
        }
    });

    // --- --- --- --- --- --- --- --- --- ---
    // --- ¡NUEVO! Listener para el Editor 3D ---
    // --- --- --- --- --- --- --- --- --- ---
    // Escucha el evento global que se dispara desde editor3d_controls.js
    window.addEventListener('save3dModelToIaGallery', handlers.handleSave3DModelFromEditor);
    // --- --- --- --- --- --- --- --- --- ---
    // --- FIN NUEVO ---
    // --- --- --- --- --- --- --- --- --- ---

    // NOTA: Los listeners de la galería se adjuntan dinámicamente
    // dentro de `generador_ui.js` durante la función `renderGallery`.
    // (Corrección: se pasan como argumentos a createGalleryCard)
    
    // --- ¡CORRECCIÓN 3! Se añade 'await' a la única llamada de renderizado ---
    await ui.renderGallery(handlers.getGalleryHandlers());
}