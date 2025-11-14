// =================================================================
// ARCHIVO: selector_modal.js (NUEVO)
// CONTIENE:
// 1. Lógica para abrir/cerrar y poblar los modales de selección
//    (Imagen, Entidad, Item, Terreno).
// 2. Un listener global (delegación de eventos) para
//    vincular los botones "Seleccionar..." a estos modales.
// =================================================================

import * as AppState from './app_state.js';
import { assetUrlCache, getCachedAssetUrl } from './assets.js';

// --- DOM Cache de los Modales (leídos una vez) ---
const $modals = {
    image: document.getElementById('image-selector-modal'),
    entity: document.getElementById('entity-selector-modal'),
    item: document.getElementById('item-selector-modal'),
    terrain: document.getElementById('terrain-selector-modal'),
};

const $grids = {
    image: document.getElementById('image-selector-grid'),
    entity: document.getElementById('entity-selector-grid'),
    item: document.getElementById('item-selector-grid'),
    terrain: document.getElementById('terrain-selector-grid'),
};

const $filters = {
    image: document.getElementById('image-selector-filter'),
    entity: document.getElementById('entity-selector-filter'),
    item: document.getElementById('item-selector-filter'),
    terrain: document.getElementById('terrain-selector-filter'),
};

// --- Estado ---
let onSelectCallback = null;

// --- Funciones Genéricas ---

function openModal(modal) {
    modal.style.display = 'flex';
    setTimeout(() => modal.style.opacity = '1', 10);
}

function closeModal(modal) {
    modal.style.opacity = '0';
    setTimeout(() => modal.style.display = 'none', 150);
    onSelectCallback = null; // Limpiar callback
}

/**
 * Crea una tarjeta de item para el grid de selección.
 * @param {string} key - La clave del item (ej: "TREE")
 * @param {string} imageUrl - La URL de la imagen (de getCachedAssetUrl)
 * @param {'image' | 'entity' | 'item' | 'terrain'} type - El tipo de selector
 * @param {string} [name=null] - El nombre legible (ej: "Árbol de Roble")
 * @returns {HTMLElement}
 */
function createGridItem(key, imageUrl, type, name = null) {
    const $item = document.createElement('div');
    $item.className = `${type}-selector-item`;
    
    const displayName = name || key;
    const keyDisplay = (name && name !== key) ? `${key}` : (displayName === '(Ninguna)' ? '' : displayName);
    const nameDisplay = (name && name !== key) ? name : (displayName === '(Ninguna)' ? '(Ninguna)' : '');

    const imgUrl = imageUrl || 'https://placehold.co/120x100/1f2937/4b5563?text=?';
    const imgEmptyClass = !imageUrl ? 'selector-item-img-empty' : '';
    const imgEmptyContent = !imageUrl ? (key === '(Ninguna)' ? '❌' : '❓') : '';
    
    const imgTag = imageUrl ? `<img src="${imgUrl}" alt="${displayName}" class="${type}-selector-item-img">` : imgEmptyContent;

    $item.innerHTML = `
        <div class="${type}-selector-item-img ${imgEmptyClass}">
            ${imgTag}
        </div>
        <span class="${type}-selector-item-label" title="${key}">${nameDisplay || keyDisplay}</span>
        ${name && name !== key ? `<span class="${type}-selector-item-label" style="font-size: 10px; color: #9ca3af;" title="${key}">${keyDisplay}</span>` : ''}
    `;
    
    $item.addEventListener('click', () => {
        const selectedKey = key === '(Ninguna)' ? '' : key;
        if (onSelectCallback) {
            onSelectCallback(selectedKey);
        }
        closeModal($modals[type]);
    });
    return $item;
}

// --- Lógica de Poblado de Grids ---

function populateImageGrid() {
    const filter = $filters.image.value.toLowerCase();
    const $grid = $grids.image;
    $grid.innerHTML = '';
    $grid.appendChild(createGridItem("(Ninguna)", null, 'image'));

    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    const uniqueKeys = new Set();
    assetUrlCache.forEach((url, key) => {
        // Mostrar tanto claves base (TREE) como archivos (tree.png)
        if (imageExtensions.some(ext => key.toLowerCase().endsWith(ext))) {
            uniqueKeys.add(key);
        } else if (key === key.toUpperCase()) {
            uniqueKeys.add(key);
        }
    });

    Array.from(uniqueKeys).sort().forEach(key => {
        if (key.toLowerCase().includes(filter)) {
            $grid.appendChild(createGridItem(key, getCachedAssetUrl(key), 'image'));
        }
    });
}

function populateEntityGrid() {
    const filter = $filters.entity.value.toLowerCase();
    const $grid = $grids.entity;
    $grid.innerHTML = '';
    $grid.appendChild(createGridItem("(Ninguna)", null, 'entity'));

    const entities = AppState.getLoadedData().entity;
    Object.keys(entities).sort().forEach(key => {
        const def = entities[key];
        if (key.toLowerCase().includes(filter) || (def.name && def.name.toLowerCase().includes(filter))) {
            const renderComp = def.components?.find(c => c.type === 'Renderable');
            const imgKey = renderComp?.args[0];
            $grid.appendChild(createGridItem(key, getCachedAssetUrl(imgKey), 'entity', def.name));
        }
    });
}

function populateItemGrid() {
    const filter = $filters.item.value.toLowerCase();
    const $grid = $grids.item;
    $grid.innerHTML = '';
    $grid.appendChild(createGridItem("(Ninguna)", null, 'item'));

    const items = AppState.getLoadedData().items;
    Object.keys(items).sort().forEach(key => {
        const def = items[key];
        if (key.toLowerCase().includes(filter) || (def.name && def.name.toLowerCase().includes(filter))) {
            $grid.appendChild(createGridItem(key, getCachedAssetUrl(def.imageKey), 'item', def.name));
        }
    });
}

function populateTerrainGrid() {
    const filter = $filters.terrain.value.toLowerCase();
    const $grid = $grids.terrain;
    $grid.innerHTML = '';
    $grid.appendChild(createGridItem("(Ninguna)", null, 'terrain'));

    const terrains = AppState.getLoadedData().terrain;
    Object.keys(terrains).sort().forEach(key => {
        const def = terrains[key];
        if (key.toLowerCase().includes(filter) || (def.name && def.name.toLowerCase().includes(filter))) {
            $grid.appendChild(createGridItem(key, getCachedAssetUrl(key), 'terrain', def.name));
        }
    });
}

// --- Inicialización y Delegación de Eventos ---

export function initSelectorModals() {
    // 1. Listeners de Filtros y Botones de Cierre
    $filters.image.addEventListener('input', populateImageGrid);
    document.getElementById('image-selector-close-btn').addEventListener('click', () => closeModal($modals.image));
    document.getElementById('image-selector-cancel-btn').addEventListener('click', () => closeModal($modals.image));
    
    $filters.entity.addEventListener('input', populateEntityGrid);
    document.getElementById('entity-selector-close-btn').addEventListener('click', () => closeModal($modals.entity));
    document.getElementById('entity-selector-cancel-btn').addEventListener('click', () => closeModal($modals.entity));
    
    $filters.item.addEventListener('input', populateItemGrid);
    document.getElementById('item-selector-close-btn').addEventListener('click', () => closeModal($modals.item));
    document.getElementById('item-selector-cancel-btn').addEventListener('click', () => closeModal($modals.item));
    
    $filters.terrain.addEventListener('input', populateTerrainGrid);
    document.getElementById('terrain-selector-close-btn').addEventListener('click', () => closeModal($modals.terrain));
    document.getElementById('terrain-selector-cancel-btn').addEventListener('click', () => closeModal($modals.terrain));

    // 2. Listener de Delegación de Eventos (La magia)
    document.body.addEventListener('click', (e) => {
        const button = e.target.closest('[data-action^="open-"]');
        if (!button) return;

        const action = button.dataset.action;
        
        // --- Caso Especial: Editor 3D ---
        if (button.id === 'part-texture-select-btn') {
            const $input3d = document.getElementById('part-texture');
            const $display3d = document.getElementById('part-texture-key-display');
            const $preview3d = document.getElementById('part-texture-preview');

            if (!$input3d || !$display3d || !$preview3d) return;

            onSelectCallback = (selectedKey) => {
                $input3d.value = selectedKey;
                $display3d.textContent = selectedKey || '(Ninguna)';
                $preview3d.src = getCachedAssetUrl(selectedKey) || 'https://placehold.co/40x40/1f2937/4b5563?text=?';
                // Disparar evento para que editor3d_controls se entere
                $input3d.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            };
            
            populateImageGrid();
            openModal($modals.image);
            return;
        }

        // --- Caso General: Modales del Editor ---
        const fieldWrapper = button.closest('.editor-field');
        if (!fieldWrapper) return;

        const $hiddenInput = fieldWrapper.querySelector('input[type="hidden"]');
        const $keyDisplay = fieldWrapper.querySelector('.image-selector-key-display, .entity-selector-key-display, .item-selector-key-display, .terrain-selector-key-display');
        const $previewImg = fieldWrapper.querySelector('.image-selector-preview, .entity-selector-preview, .item-selector-preview, .terrain-selector-preview');

        if (!$hiddenInput || !$keyDisplay || !$previewImg) return;

        // Definir el callback que actualiza el campo correcto
        onSelectCallback = (selectedKey) => {
            $hiddenInput.value = selectedKey;
            $keyDisplay.textContent = selectedKey || '(Ninguna)';
            
            let imageUrl = null;
            if (action === 'open-image-selector' || action === 'open-terrain-selector') {
                imageUrl = getCachedAssetUrl(selectedKey);
            } else if (action === 'open-entity-selector') {
                const def = AppState.getLoadedData().entity[selectedKey];
                const renderComp = def?.components?.find(c => c.type === 'Renderable');
                imageUrl = getCachedAssetUrl(renderComp?.args[0]);
            } else if (action === 'open-item-selector') {
                const def = AppState.getLoadedData().items[selectedKey];
                imageUrl = getCachedAssetUrl(def?.imageKey);
            }
            $previewImg.src = imageUrl || 'https://placehold.co/40x40/1f2937/4b5563?text=?';
        };

        // Abrir el modal correspondiente
        switch (action) {
            case 'open-image-selector':
                populateImageGrid();
                openModal($modals.image);
                break;
            case 'open-entity-selector':
                populateEntityGrid();
                openModal($modals.entity);
                break;
            case 'open-item-selector':
                populateItemGrid();
                openModal($modals.item);
                break;
            case 'open-terrain-selector':
                populateTerrainGrid();
                openModal($modals.terrain);
                break;
        }
    });
}