// --- ia_controller.js ---
// Define el callback para cuando la UI de IA guarda un asset.

import { getHandles, setLoadedData } from './app_state.js';
import { readFile } from './fsa.js';
import { loadAndCacheAssetImages, populateAssetGrid } from './assets.js';
import { refreshAllGalleries } from './gallery_controller.js';
import { onAssetClick } from './asset_controller.js';
import * as DOM from './dom_elements.js';

/**
 * Callback que se llama desde ia_generator_ui.js cuando un asset se guarda.
 * @param {'terrain' | 'entity' | 'item'} type - El tipo de asset guardado.
 */
export async function onIaAssetSaved(type) {
    console.log(`Callback: Asset IA de tipo '${type}' guardado.`);
    const handles = getHandles();
    try {
        // Recargar el JSON relevante desde el disco al estado
        if (type === 'terrain') {
            setLoadedData('terrain', JSON.parse(await readFile(handles.terrainFileHandle)));
        } else if (type === 'entity') {
            setLoadedData('entity', JSON.parse(await readFile(handles.entityFileHandle)));
        } else if (type === 'item') {
            setLoadedData('items', JSON.parse(await readFile(handles.itemsFileHandle)));
        }
        
        // Recargar imágenes y refrescar todas las galerías y la cuadrícula de assets
        await loadAndCacheAssetImages(handles.assetsDirHandle);
        refreshAllGalleries();
        populateAssetGrid(DOM.$assetGridContainer, onAssetClick);

    } catch (err) {
        console.error("Error refrescando datos después de guardado IA:", err);
    }
}