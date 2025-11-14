// =================================================================
// ARCHIVO: generador_dom.js (NUEVO)
// CONTIENE:
// 1. Un objeto `dom` que almacenará las referencias a los elementos.
// 2. Una función `cacheDomElements` para rellenar ese objeto.
// =================================================================

export const dom = {};

/**
 * Busca y almacena todas las referencias a elementos del DOM
 * dentro del contenedor de la pestaña.
 * @param {HTMLElement} tabContainer - El elemento #tab-content-ia3d
 */
export function cacheDomElements(tabContainer) {
    dom.container = tabContainer;
    
    // Controles principales
    dom.modelSelect = tabContainer.querySelector('#modelSelect');
    dom.promptInput = tabContainer.querySelector('#promptInput');
    dom.generateButton = tabContainer.querySelector('#generateButton');
    dom.generateRealisticButton = tabContainer.querySelector('#generateRealisticButton');
    dom.copySvgButton = tabContainer.querySelector('#copySvgButton');
    dom.downloadSvgButton = tabContainer.querySelector('#donwloadSvgButton');
    
    // Vista previa y estado
    dom.previewArea = tabContainer.querySelector('#previewArea');
    dom.statusMessage = tabContainer.querySelector('#statusMessage');
    dom.loader = tabContainer.querySelector('#loader');
    
    // Acciones y código
    dom.actionsSection = tabContainer.querySelector('#actionsSection');
    dom.svgCode = tabContainer.querySelector('#svgCode');
    dom.svgCodeContainer = tabContainer.querySelector('#svgCodeContainer');
    dom.svgCodeWrapper = tabContainer.querySelector('#svgCodeWrapper');
    
    // Galería
    dom.galleryGrid = tabContainer.querySelector('#galleryGrid');
    dom.downloadGalleryButton = tabContainer.querySelector('#downloadGalleryButton');
    dom.uploadGalleryInput = tabContainer.querySelector('#uploadGalleryInput');
    dom.saveGalleryButton = tabContainer.querySelector('#saveGalleryButton'); // <-- ¡AÑADIDO!
    
    // Controles manuales 2D
    dom.manualControls = tabContainer.querySelector('#manualControls');
    dom.deleteShapeButton = tabContainer.querySelector('#deleteShapeButton');

    // Referencias 3D
    dom.controls3DSection = tabContainer.querySelector('#controls3DSection');
    dom.prompt3D = tabContainer.querySelector('#prompt3D');
    dom.generate3DButton = tabContainer.querySelector('#generate3DButton');
    dom.edit3DButton = tabContainer.querySelector('#edit3DButton');
    dom.copy3DModelButton = tabContainer.querySelector('#copy3DModelButton');
    dom.download3DModelButton = tabContainer.querySelector('#download3DModelButton');
    dom.exportPlaneliteButton = tabContainer.querySelector('#exportPlaneliteButton');

    // Referencias del Modal
    dom.improveModal = tabContainer.querySelector('#improveModal');
    dom.modalItemName = tabContainer.querySelector('#modalItemName');
    dom.modalImprovePrompt = tabContainer.querySelector('#modalImprovePrompt');
    dom.modalImproveSection = tabContainer.querySelector('#modalImproveSection');
    dom.modalImproveCancel = tabContainer.querySelector('#modalImproveCancel');
    dom.modalRenameSave = tabContainer.querySelector('#modalRenameSave');
    dom.modalImproveConfirm = tabContainer.querySelector('#modalImproveConfirm');
    dom.modalDuplicate = tabContainer.querySelector('#modalDuplicate');
    dom.modalDelete = tabContainer.querySelector('#modalDelete');
    dom.modalDeleteConfirm = tabContainer.querySelector('#modalDeleteConfirm');
    dom.modalDeleteConfirmBtn = tabContainer.querySelector('#modalDeleteConfirmBtn');
    dom.modalDeleteCancelBtn = tabContainer.querySelector('#modalDeleteCancelBtn');
}