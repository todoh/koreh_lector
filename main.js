// --- main.js ---
// Punto de entrada. Conecta eventos e inicializa módulos.

import { selectProjectRoot, findProjectHandles, readFile } from './fsa.js';
// --- ¡IMPORTACIONES MODIFICADAS! ---
import { 
    loadAndCacheAssetImages, 
    populateAssetGrid, 
    populateSvgGrid, 
    populate3dGrid 
} from './assets.js';
import { buildIaGeneratorUI } from './ia_generator_ui.js';
import { showStatus } from './utils.js';

// Módulos de estado y DOM
import * as AppState from './app_state.js';
import * as DOM from './dom_elements.js';

// Módulos controladores
import { initTabs } from './tab_controller.js';
import { initAddNewButtons, refreshAllGalleries } from './gallery_controller.js';
import { 
    populateBiomeWeightsEditor, 
    populateCraftingEditor, 
    initSaveJsonButtons,
    refreshCraftingGallery // Importar para refrescar todas las galerías de crafteo
} from './editor_controllers.js';
// --- ¡IMPORTACIONES MODIFICADAS! ---
import { 
    initAssetUploader, 
    onAssetClick, 
    initAssetSubTabs 
} from './asset_controller.js';
import { onIaAssetSaved } from './ia_controller.js';
import { initModalButtons } from './modal_controller.js';
import { initInventoryModal } from './inventory_modal.js';
// --- --- --- --- --- --- --- --- --- --- ---
// --- ¡NUEVA IMPORTACIÓN! ---
import { initSelectorModals } from './selector_modal.js';
// --- --- --- --- --- --- --- --- --- --- ---


document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Inicializar controladores de UI estáticos
    // (Estos solo adjuntan listeners a botones que ya existen)
    initTabs();
    initModalButtons();
    initAddNewButtons();
    initSaveJsonButtons();
    initAssetUploader();
    initAssetSubTabs(); // <-- ¡AÑADIDO!
    
    // --- --- --- --- --- --- --- --- --- --- ---
    // --- ¡NUEVA INICIALIZACIÓN! ---
    initSelectorModals();
    // --- --- --- --- --- --- --- --- --- --- ---

    // 2. Adjuntar el listener principal para cargar el proyecto
    DOM.$selectRootBtn.addEventListener('click', loadProject);

    // --- ¡NUEVO! Listener para refrescar galerías de archivos ---
    window.addEventListener('ia-gallery-file-saved', (e) => {
        console.log("Evento 'ia-gallery-file-saved' recibido, refrescando galerías de archivos...");
        // Refrescar la galería correspondiente
        if (e.detail?.type === 'svg') {
            populateSvgGrid();
        } else if (e.detail?.type === '3d') {
            populate3dGrid();
        }
    });
    // --- FIN NUEVO ---
});

/**
 * Función principal para cargar y escanear el proyecto.
 */
async function loadProject() {
    try {
        // --- 1. Seleccionar Carpeta y Encontrar Handles ---
        const rootHandle = await selectProjectRoot();
        showStatus(DOM.$folderStatus, `Escaneando carpeta: ${rootHandle.name}...`, 'success'); // 'success' para visual
        
        const handles = await findProjectHandles(rootHandle);
        AppState.setHandles(handles);
        showStatus(DOM.$folderStatus, `Carpeta cargada: ${handles.rootDirHandle.name}`, 'success');
        
        // --- 2. Cargar y Parsear Archivos JSON ---
        showStatus(DOM.$folderStatus, `Cargando archivos JSON...`, 'success');
        AppState.setLoadedData('terrain', JSON.parse(await readFile(handles.terrainFileHandle)));
        AppState.setLoadedData('entity', JSON.parse(await readFile(handles.entityFileHandle)));
        AppState.setLoadedData('biome', JSON.parse(await readFile(handles.biomeFileHandle))); 
        AppState.setLoadedData('items', JSON.parse(await readFile(handles.itemsFileHandle)));
        AppState.setLoadedData('crafting', JSON.parse(await readFile(handles.craftingFileHandle)));
        // (initial_inventory se carga dentro de su propio módulo)

        // --- 3. Cargar Assets (Imágenes) ---
        showStatus(DOM.$folderStatus, `Cargando assets de /assets...`, 'success');
        await loadAndCacheAssetImages(handles.assetsDirHandle);

        // --- 4. Poblar Galerías y Editores (JSON) ---
        showStatus(DOM.$folderStatus, `Construyendo galerías...`, 'success');
        refreshAllGalleries();
        
        // Poblar editores especiales
        populateBiomeWeightsEditor();
        populateCraftingEditor(); // Esto también llama a refreshCraftingGallery internamente

        // --- 5. Poblar Galerías (Archivos) ---
        // Poblar cuadrícula de assets (PNG)
        populateAssetGrid(DOM.$assetGridContainer, onAssetClick);
        // ¡NUEVO! Poblar galerías de SVG y 3D
        await populateSvgGrid();
        await populate3dGrid();

        // --- 6. Inicializar Módulos de UI ---
        // Construir UI de IA (pasando el callback)
        buildIaGeneratorUI(DOM.$iaGeneratorContainer, handles, onIaAssetSaved);
        // Inicializar el modal de Inventario
        initInventoryModal(handles, AppState.getLoadedData().items);

        // --- 7. Mostrar UI Principal ---
        DOM.$mainEditorContainer.classList.remove('hidden');
        DOM.$selectRootBtn.textContent = 'Carpeta Cargada';
        DOM.$selectRootBtn.classList.replace('bg-blue-600', 'bg-gray-600');
        showStatus(DOM.$folderStatus, `Proyecto "${handles.rootDirHandle.name}" cargado con éxito.`, 'success');

    } catch (err) {
        console.error(err);
        if (err.name !== 'AbortError') {
            alert(`Error al cargar la carpeta: ${err.message}`);
            showStatus(DOM.$folderStatus, `Error: ${err.message}`, 'error');
        }
    }
}