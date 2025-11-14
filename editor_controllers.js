// --- editor_controllers.js ---
// Maneja los editores "especiales" (Biomas, Crafteo) y los botones de Guardar JSON.

import * as DOM from './dom_elements.js';
import { getHandles, getLoadedData, setActiveEditor, setCurrentEditKey } from './app_state.js';
import { saveJsonFile } from './fsa.js';
import { createListEditor, createListEditorRow, reconstructListEditor } from './editor_list_component.js';
import { buildGallery } from './gallery.js';
import { openModal } from './modal.js';

// --- Biome Weights Editor ---

export function populateBiomeWeightsEditor() {
    const { biome: biomeData } = getLoadedData();
    const weightsObject = biomeData?.BIOME_WEIGHTS;
    const allBiomeDefinitions = biomeData?.BIOME_DEFINITIONS;
    const container = DOM.$biomeWeightsList;

    if (!weightsObject) {
        container.innerHTML = '<p class="text-red-400">Error: BIOME_WEIGHTS no encontrado.</p>';
        return;
    }
    container.innerHTML = ''; 
    const weightsArray = Object.entries(weightsObject).map(([key, weight]) => ({ key: key, weight: weight }));
    const fieldDefs = [
        { id: 'key', label: 'Biome Key', type: 'string' },
        { id: 'weight', label: 'Weight', type: 'number' }
    ];

    // Constructor de UI personalizado para el botón "Añadir"
    const customAddUIBuilder = ($header, $body, fieldDefs) => {
        const $select = document.createElement('select');
        $select.className = 'json-value';
        $select.style.flexGrow = '1';
        $select.innerHTML = '<option value="">Selecciona bioma a añadir...</option>';
        
        const allBiomeKeys = Object.keys(allBiomeDefinitions || {}).sort();
        allBiomeKeys.forEach(key => {
             $select.innerHTML += `<option value="${key}">${key}</option>`;
        });

        const $addBtn = document.createElement('button');
        $addBtn.type = 'button';
        $addBtn.textContent = '+ Añadir';
        $addBtn.className = 'json-btn json-btn-add';
        $addBtn.style.width = 'auto';
        $addBtn.style.padding = '0 0.75rem';

        $addBtn.addEventListener('click', () => {
            const selectedKey = $select.value;
            if (!selectedKey) return;
            
            // Comprobar duplicados en la UI
            const existingKeys = Array.from($body.querySelectorAll('.list-editor-row [data-field-id="key"] input'))
                                        .map(input => input.value.toUpperCase());
            
            if (existingKeys.includes(selectedKey.toUpperCase())) {
                alert(`El bioma "${selectedKey}" ya está en la lista de pesos.`);
                $select.value = ""; // Resetear
                return;
            }
            
            // Añadir la nueva fila
            const newItemData = { key: selectedKey, weight: 1 }; // Default weight 1
            $body.appendChild(createListEditorRow(fieldDefs, newItemData));
            $select.value = ""; // Resetear dropdown
        });
        
        $header.appendChild($select);
        $header.appendChild($addBtn);
    };

    const $listEditor = createListEditor(
        'biome-weights', 
        '', // Sin título
        weightsArray, 
        fieldDefs,
        customAddUIBuilder
    );
    
    const $header = $listEditor.querySelector('.list-editor-header');
    if ($header) {
        $header.classList.remove('list-editor-header'); // Quitar estilos de header
        $header.classList.add('flex', 'gap-2', 'items-center'); // Añadir estilos flex
    }
    
    container.appendChild($listEditor);
}

// --- Crafting Editor ---

export function populateCraftingEditor() {
    const craftingData = getLoadedData().crafting;
    const container = DOM.$craftingEditorContainer;
    
    container.innerHTML = '';
    if (!craftingData || typeof craftingData !== 'object') {
        container.innerHTML = '<p class="text-red-400">crafting_recipes.json no es un objeto válido.</p>';
        return;
    }
    
    for (const tableKey in craftingData) {
        if (!craftingData.hasOwnProperty(tableKey)) continue;
        
        const $tableWrapper = document.createElement('div');
        $tableWrapper.className = 'space-y-4';
        
        const $header = document.createElement('div');
        $header.className = 'flex justify-between items-center gap-3 mb-4 pt-4 border-t border-gray-700';
        $header.innerHTML = `<h3 class="text-lg font-semibold text-gray-300">Mesa: ${tableKey}</h3>`;
        
        const $addBtn = document.createElement('button');
        $addBtn.className = 'json-editor-btn bg-blue-600 hover:bg-blue-700';
        $addBtn.textContent = '+ Añadir Receta';
        $addBtn.addEventListener('click', () => {
            setActiveEditor(`crafting-${tableKey}`);
            setCurrentEditKey(null);
            openModal(null, { itemId: "NUEVO_ITEM_ID", name: "Nueva Receta", quantity: 1, requirements: [] }, DOM.$modalTitle, DOM.$modalFormContent, DOM.$editorModal, 'crafting');
        });
        
        $header.appendChild($addBtn);
        
        const $galleryContainer = document.createElement('div');
        $galleryContainer.id = `gallery-container-crafting-${tableKey}`;
        $galleryContainer.className = 'gallery-container';
        
        $tableWrapper.appendChild($header);
        $tableWrapper.appendChild($galleryContainer);
        container.appendChild($tableWrapper);
        
        refreshCraftingGallery(tableKey);
    }
}

export function refreshCraftingGallery(tableKey) {
    const $galleryContainer = document.getElementById(`gallery-container-crafting-${tableKey}`);
    if (!$galleryContainer) return;
    
    const { crafting: craftingData, items: itemsData } = getLoadedData();
    if (!craftingData || !craftingData[tableKey]) return;
    
    const recipeArray = craftingData[tableKey];
    
    buildGallery(recipeArray, $galleryContainer, (key, definition) => {
        setActiveEditor(`crafting-${tableKey}`);
        setCurrentEditKey(key); // El 'key' aquí es el 'itemId'
        openModal(key, definition, DOM.$modalTitle, DOM.$modalFormContent, DOM.$editorModal, 'crafting');
    }, 'crafting', itemsData); // Pasamos allItemsData
}

// --- Botones "Guardar JSON" ---

async function saveBiomeData() {
    try {
        const loadedData = getLoadedData();
        const handles = getHandles();
        const $weightsListWrapper = DOM.$biomeWeightsList.querySelector('[data-list-id="biome-weights"]');
        
        if ($weightsListWrapper) {
            const weightsArray = reconstructListEditor($weightsListWrapper);
            const newWeightsObject = {};
            for (const item of weightsArray) { if (item.key) { newWeightsObject[item.key.toUpperCase()] = item.weight || 0; } }
            loadedData.biome.BIOME_WEIGHTS = newWeightsObject;
        }
        await saveJsonFile(handles.biomeFileHandle, loadedData.biome);
        alert('biome_definition.json guardado.');
    } catch (err) { alert(`Error: ${err.message}`); }
}

export function initSaveJsonButtons() {
    DOM.$saveTerrainBtn.addEventListener('click', async () => {
        try { await saveJsonFile(getHandles().terrainFileHandle, getLoadedData().terrain); alert('terrain_definition.json guardado.'); } catch (err) { alert(`Error: ${err.message}`); }
    });
    DOM.$saveEntityBtn.addEventListener('click', async () => {
         try { await saveJsonFile(getHandles().entityFileHandle, getLoadedData().entity); alert('entity_definitions.json guardado.'); } catch (err) { alert(`Error: ${err.message}`); }
    });
    DOM.$saveItemsBtn.addEventListener('click', async () => {
         try { await saveJsonFile(getHandles().itemsFileHandle, getLoadedData().items); alert('items.json guardado.'); } catch (err) { alert(`Error: ${err.message}`); }
    });
    DOM.$saveCraftingBtn.addEventListener('click', async () => {
         try { await saveJsonFile(getHandles().craftingFileHandle, getLoadedData().crafting); alert('crafting_recipes.json guardado.'); } catch (err) { alert(`Error: ${err.message}`); }
    });
    
    DOM.$saveBiomeBtn.addEventListener('click', saveBiomeData);

    // --- ¡NUEVO! Listener para añadir mesa de crafteo ---
    DOM.$addNewCraftingTableBtn.addEventListener('click', () => {
        const newTableKey = prompt("Introduce la clave (ID) para la nueva mesa de crafteo (ej: FORJA, COCINA):");
        if (!newTableKey) return;

        const key = newTableKey.trim().toUpperCase();
        if (!key) return;

        const loadedData = getLoadedData();
        if (loadedData.crafting[key]) {
            alert(`Error: La mesa de crafteo "${key}" ya existe.`);
            return;
        }

        // Añadir la nueva mesa (vacía) al objeto en memoria
        loadedData.crafting[key] = [];

        // Refrescar toda la UI de crafteo para mostrar la nueva mesa
        populateCraftingEditor();
        alert(`Mesa "${key}" añadida. No olvides "Guardar Todos los Cambios" para hacerlo permanente.`);
    });
    // --- FIN NUEVO ---
}