// --- gallery_controller.js ---
// Maneja la actualización de las galerías y los botones "Añadir".

import * as DOM from './dom_elements.js';
import { getLoadedData, setActiveEditor, setCurrentEditKey } from './app_state.js';
import { buildGallery } from './gallery.js';
import { openModal } from './modal.js';

// --- Funciones de Refresh ---

export function refreshTerrainGallery() {
    const data = getLoadedData().terrain;
    buildGallery(data, DOM.$galleryContainerTerrain, (key, definition) => {
        setActiveEditor('terrain');
        setCurrentEditKey(key); 
        openModal(key, definition, DOM.$modalTitle, DOM.$modalFormContent, DOM.$editorModal, 'terrain');
    }, 'terrain');
}

export function refreshEntityGallery() {
    const data = getLoadedData().entity;
    buildGallery(data, DOM.$galleryContainerEntity, (key, definition) => {
        setActiveEditor('entity');
        setCurrentEditKey(key); 
        openModal(key, definition, DOM.$modalTitle, DOM.$modalFormContent, DOM.$editorModal, 'entity');
    }, 'entity');
}

export function refreshBiomeGallery() {
    const data = getLoadedData().biome;
    if (!data) return;
    let dataToShow = data.BIOME_DEFINITIONS || data;
    buildGallery(dataToShow, DOM.$galleryContainerBiome, (key, definition) => {
        setActiveEditor('biome');
        setCurrentEditKey(key); 
        openModal(key, definition, DOM.$modalTitle, DOM.$modalFormContent, DOM.$editorModal, 'biome');
    }, 'biome'); 
}

export function refreshItemsGallery() {
    const data = getLoadedData().items;
    buildGallery(data, DOM.$galleryContainerItems, (key, definition) => {
        setActiveEditor('items');
        setCurrentEditKey(key); 
        openModal(key, definition, DOM.$modalTitle, DOM.$modalFormContent, DOM.$editorModal, 'items');
    }, 'items');
}

export function refreshAllGalleries() {
    refreshTerrainGallery();
    refreshEntityGallery();
    refreshBiomeGallery();
    refreshItemsGallery();
    // La actualización de crafteo es manejada por editor_controllers.js
    // al llamar a populateCraftingEditor()
}

// --- Inicializador de Botones "Añadir" ---

export function initAddNewButtons() {
    DOM.$addNewTerrainItemBtn.addEventListener('click', () => {
        setActiveEditor('terrain');
        setCurrentEditKey(null);
        openModal(null, { name: "Nuevo Terreno", solid: false, key: "NUEVA_CLAVE" }, DOM.$modalTitle, DOM.$modalFormContent, DOM.$editorModal, 'terrain');
    });
    DOM.$addNewEntityItemBtn.addEventListener('click', () => {
        setActiveEditor('entity');
        setCurrentEditKey(null);
        openModal(null, { name: "Nueva Entidad", renderMode: "billboard", components: [] }, DOM.$modalTitle, DOM.$modalFormContent, DOM.$editorModal, 'entity');
    });
    DOM.$addNewBiomeItemBtn.addEventListener('click', () => {
        setActiveEditor('biome');
        setCurrentEditKey(null);
        openModal(null, { baseTile: "GRASS", terrainRules: [], entities: [] }, DOM.$modalTitle, DOM.$modalFormContent, DOM.$editorModal, 'biome');
    });
    DOM.$addNewItemBtn.addEventListener('click', () => {
        setActiveEditor('items');
        setCurrentEditKey(null);
        openModal(null, { name: "Nuevo Item", description: "", imageKey: "", stackable: true, maxStack: 99 }, DOM.$modalTitle, DOM.$modalFormContent, DOM.$editorModal, 'items');
    });
}