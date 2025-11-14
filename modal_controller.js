// --- modal_controller.js ---
// Maneja los listeners de guardado y cancelación del modal.

import * as DOM from './dom_elements.js';
import { getActiveEditor, getCurrentEditKey, getHandles, getLoadedData, getOriginalImage } from './app_state.js';
import { closeModal, handleModalSave } from './modal.js';
import { saveImageFile, deleteImageFile } from './imageeditor.js';
import { loadAndCacheAssetImages, populateAssetGrid } from './assets.js';
import { onAssetClick } from './asset_controller.js';
import { refreshTerrainGallery, refreshEntityGallery, refreshBiomeGallery, refreshItemsGallery } from './gallery_controller.js';
import { refreshCraftingGallery } from './editor_controllers.js';

/**
 * Lógica que se ejecuta al hacer clic en el botón "Guardar" del modal.
 */
async function handleModalSaveClick() {
    const activeEditor = getActiveEditor();
    const currentKey = getCurrentEditKey();
    const handles = getHandles();
    const originalImage = getOriginalImage();
    
    // --- Lógica para Guardar un Asset (Imagen) ---
    if (activeEditor === 'assets') {
        const { newFilename, newWidth, newHeight, oldFilename } = handleModalSave(currentKey, DOM.$modalFormContent, null, 'assets');
        
        if (!originalImage) {
            alert("Error: No se encontró la imagen original para guardar.");
            return;
        }

        const dimensionsChanged = (newWidth !== originalImage.naturalWidth || newHeight !== originalImage.naturalHeight);
        const nameChanged = (newFilename !== oldFilename);

        if (!dimensionsChanged && !nameChanged) {
            closeModal(DOM.$editorModal); // No hay cambios
            return;
        }

        try {
            // Guardar la nueva imagen (redimensionada o renombrada)
            await saveImageFile(handles.assetsDirHandle, originalImage, DOM.$canvas, newWidth, newHeight, newFilename);
            
            if (nameChanged) {
                // Si el nombre cambió, borrar el archivo antiguo
                await deleteImageFile(handles.assetsDirHandle, oldFilename);
            }
            
            alert('Asset actualizado con éxito.');
            
            // Refrescar caché de imágenes y UI
            await loadAndCacheAssetImages(handles.assetsDirHandle);
            populateAssetGrid(DOM.$assetGridContainer, onAssetClick);
            
            // Refrescar todas las galerías JSON (importante si una imagen cambió)
            refreshTerrainGallery();
            refreshEntityGallery();
            refreshBiomeGallery();
            refreshItemsGallery();
            
            closeModal(DOM.$editorModal);

        } catch (err) {
            console.error(err);
            alert(`Error al guardar el asset: ${err.message}`);
        }
        return;
    }
    
    // --- Lógica para Guardar JSON ---
    let dataObject;
    let galleryType = activeEditor;
    let tableKey = null;
    const loadedData = getLoadedData();

    if (activeEditor === 'terrain') dataObject = loadedData.terrain;
    else if (activeEditor === 'entity') dataObject = loadedData.entity;
    else if (activeEditor === 'biome') dataObject = (loadedData.biome.BIOME_DEFINITIONS || loadedData.biome);
    else if (activeEditor === 'items') dataObject = loadedData.items;
    else if (activeEditor.startsWith('crafting-')) {
        tableKey = activeEditor.split('-')[1];
        galleryType = 'crafting';
        dataObject = loadedData.crafting[tableKey];
    } else {
        console.error("Tipo de editor desconocido en modal save:", activeEditor);
        return;
    }
    
    try {
        // handleModalSave (de modal.js) actualiza el objeto 'dataObject' en memoria
        const result = handleModalSave(currentKey, DOM.$modalFormContent, dataObject, galleryType);
        
        if (result) {
            // Refrescar la galería específica que fue editada
            if (galleryType === 'terrain') refreshTerrainGallery();
            else if (galleryType === 'entity') refreshEntityGallery();
            else if (galleryType === 'biome') refreshBiomeGallery();
            else if (galleryType === 'items') refreshItemsGallery();
            else if (galleryType === 'crafting') refreshCraftingGallery(tableKey);
            
            closeModal(DOM.$editorModal);
        }
    } catch (err) {
        alert("Error al guardar los cambios: " + err.message);
    }
}

/**
 * Inicializa los listeners de los botones del modal.
 */
export function initModalButtons() {
    DOM.$modalSaveBtn.addEventListener('click', handleModalSaveClick);
    DOM.$modalCancelBtn.addEventListener('click', () => closeModal(DOM.$editorModal));
    DOM.$modalCancelBtn2.addEventListener('click', () => closeModal(DOM.$editorModal));
}