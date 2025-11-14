// --- asset_controller.js ---
// Maneja la carga y edición de assets (imágenes).

import * as DOM from './dom_elements.js';
import { getHandles, setActiveEditor, setCurrentEditKey, setOriginalImage } from './app_state.js';
import { loadAndCacheAssetImages, populateAssetGrid, getCachedAssetUrl } from './assets.js';
import { loadImageFromFile } from './imageeditor.js';
import { openModal } from './modal.js';
import { refreshAllGalleries } from './gallery_controller.js';

/**
 * Callback para cuando se hace clic en un asset de la cuadrícula.
 * @param {string} filename 
 */
export async function onAssetClick(filename) {
    const handles = getHandles();
    if (!handles.assetsDirHandle) return;
    
    try {
        // El "filename" aquí ya debería estar en minúsculas gracias al 
        // estándar que estamos aplicando ahora.
        const originalImage = await loadImageFromFile(handles.assetsDirHandle, filename);
        setOriginalImage(originalImage);
        setCurrentEditKey(filename); // Para el editor de assets, la 'key' es el filename
        setActiveEditor('assets');
        
        const assetData = {
            filename: filename,
            width: originalImage.naturalWidth,
            height: originalImage.naturalHeight,
            url: getCachedAssetUrl(filename)
        };
        
        openModal(filename, assetData, DOM.$modalTitle, DOM.$modalFormContent, DOM.$editorModal, 'assets');

    } catch (err) {
        console.error(err);
        alert(`Error al cargar ${filename}: ${err.message}`);
    }
}

/**
 * Inicializa el listener del botón para subir nuevos assets.
 */
export function initAssetUploader() {
    DOM.$uploadNewAssetBtn.addEventListener('click', async () => {
        const handles = getHandles();
        if (!handles.assetsDirHandle) {
            alert("Primero debes cargar la carpeta raíz del proyecto.");
            return;
        }
        try {
            const fileHandles = await window.showOpenFilePicker({
                multiple: true,
                types: [{ description: 'Imágenes PNG', accept: { 'image/png': ['.png'] } }]
            });
            if (fileHandles.length === 0) return;

            const uploadPromises = fileHandles.map(async (fileHandle) => {
                try {
                    const file = await fileHandle.getFile();
                    
                    // --- ¡MODIFICACIÓN CLAVE! ---
                    // Forzar el nombre del archivo a minúsculas
                    const newFilename = file.name.toLowerCase();
                    // --- FIN DE MODIFICACIÓN ---

                    const destFileHandle = await handles.assetsDirHandle.getFileHandle(newFilename, { create: true });
                    const writable = await destFileHandle.createWritable();
                    await writable.write(file);
                    await writable.close();
                    
                    if (file.name !== newFilename) {
                        console.log(`Archivo "${file.name}" guardado como "${newFilename}"`);
                    }
                    return newFilename;

                } catch (err) {
                    console.error(`Error al copiar ${fileHandle.name}:`, err); return null;
                }
            });

            const uploadedFiles = (await Promise.all(uploadPromises)).filter(name => name !== null);

            if (uploadedFiles.length > 0) {
                alert(`Se copiaron ${uploadedFiles.length} imágenes a /assets (forzadas a minúsculas).`);
                // Recargar assets y refrescar UI
                await loadAndCacheAssetImages(handles.assetsDirHandle);
                populateAssetGrid(DOM.$assetGridContainer, onAssetClick);
                refreshAllGalleries();
            } else {
                alert("No se pudo copiar ninguna imagen.");
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error("Error al seleccionar archivos:", err);
                alert(`Error al subir imágenes: ${err.message}`);
            }
        }
    });
}

// --- ¡NUEVO! Manejador para sub-pestañas de Galería ---
// (Sin cambios en esta parte)

const $assetTabs = {
    png: DOM.$assetTabBtnPng,
    svg: DOM.$assetTabBtnSvg,
    '3d': DOM.$assetTabBtn3d,
};

const $assetTabContents = {
    png: DOM.$assetTabContentPng,
    svg: DOM.$assetTabContentSvg,
    '3d': DOM.$assetTabContent3d,
};

/**
 * Cambia la sub-pestaña de galería activa (PNG, SVG, 3D).
 * @param {'png' | 'svg' | '3d'} tabName 
 */
function switchAssetTab(tabName) {
    for (const key in $assetTabContents) {
        if ($assetTabContents[key]) {
            $assetTabContents[key].classList.add('hidden');
        }
        if ($assetTabs[key]) {
            $assetTabs[key].setAttribute('aria-selected', 'false');
        }
    }

    if ($assetTabContents[tabName]) {
        $assetTabContents[tabName].classList.remove('hidden');
        $assetTabs[tabName].setAttribute('aria-selected', 'true');
    }
}

/**
 * Inicializa los listeners para las sub-pestañas de la galería.
 */
export function initAssetSubTabs() {
    for (const key in $assetTabs) {
        if ($assetTabs[key]) {
            $assetTabs[key].addEventListener('click', () => switchAssetTab(key));
        }
    }
}