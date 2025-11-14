// --- inventory_modal.js ---
// Lógica para el modal de edición del inventario inicial

import { readFile, saveJsonFile } from './fsa.js';
import { getCachedAssetUrl } from './assets.js';
import { showStatus } from './utils.js';

// --- Estado del Módulo ---
let allHandles = null;
let allItemsData = null; // Contenido de items.json
let allItemDefs = []; // Array filtrado y ordenado de items.json
let currentInventory = []; // Array de 30 slots
let $statusElement = null;

// --- Elementos del DOM ---
let $modal, $grid, $availableItems, $filterInput, $saveBtn, $cancelBtn1, $cancelBtn2;

/**
 * Inicializa el módulo, cachea los datos y añade el listener al botón principal.
 * @param {object} handles - Todos los manejadores de archivos (de fsa.js)
 * @param {object} itemsData - El contenido parseado de items.json
 */
export function initInventoryModal(handles, itemsData) {
    allHandles = handles;
    allItemsData = itemsData;
    $statusElement = document.getElementById('folder-status');

    // Filtrar y ordenar las definiciones de items una sola vez
    allItemDefs = Object.entries(allItemsData)
        .map(([key, def]) => ({ ...def, key })) // Añadir la key al objeto
        .sort((a, b) => a.name.localeCompare(b.name));

    // Cachear elementos del DOM del modal
    $modal = document.getElementById('inventory-editor-modal');
    $grid = document.getElementById('inventory-editor-grid');
    $availableItems = document.getElementById('inventory-available-items');
    $filterInput = document.getElementById('inventory-item-filter');
    $saveBtn = document.getElementById('inventory-editor-save-btn');
    $cancelBtn1 = document.getElementById('inventory-editor-cancel-btn');
    $cancelBtn2 = document.getElementById('inventory-editor-cancel-btn-2');

    // Listener para el botón principal que abre el modal
    const $openBtn = document.getElementById('inventory-editor-btn');
    if ($openBtn) {
        $openBtn.addEventListener('click', openInventoryModal);
        $openBtn.classList.remove('hidden'); // Mostrar el botón
    }

    // Listeners internos del modal
    $saveBtn.addEventListener('click', saveInventory);
    $cancelBtn1.addEventListener('click', closeInventoryModal);
    $cancelBtn2.addEventListener('click', closeInventoryModal);
    $filterInput.addEventListener('input', () => renderAvailableItems(allItemDefs));
    $modal.addEventListener('click', (e) => {
        if (e.target === $modal) closeInventoryModal();
    });
}

/**
 * Abre el modal y carga los datos.
 */
async function openInventoryModal() {
    if (!allHandles || !allHandles.initialInventoryFileHandle) {
        showStatus($statusElement, "Error: El manejador de 'initial_inventory.json' no se encontró. ¿Se ha añadido a fsa.js?", "error");
        return;
    }

    try {
        // Cargar el inventario actual
        const inventoryJson = await readFile(allHandles.initialInventoryFileHandle);
        currentInventory = JSON.parse(inventoryJson);

        // Asegurarse de que tiene 30 slots
        if (!Array.isArray(currentInventory)) currentInventory = [];
        const requiredSlots = 30;
        if (currentInventory.length < requiredSlots) {
            currentInventory.push(...new Array(requiredSlots - currentInventory.length).fill(null));
        } else if (currentInventory.length > requiredSlots) {
            currentInventory = currentInventory.slice(0, requiredSlots);
        }

        // Renderizar
        renderAvailableItems(allItemDefs);
        renderInventoryGrid();

        // Mostrar modal
        $modal.style.display = 'flex';
        setTimeout(() => $modal.style.opacity = '1', 10);

    } catch (err) {
        console.error("Error al abrir el editor de inventario:", err);
        showStatus($statusElement, `Error al leer initial_inventory.json: ${err.message}`, "error");
    }
}

/**
 * Cierra el modal.
 */
function closeInventoryModal() {
    $modal.style.opacity = '0';
    setTimeout(() => $modal.style.display = 'none', 150);
}

/**
 * Guarda los cambios en initial_inventory.json.
 */
async function saveInventory() {
    $saveBtn.disabled = true;
    $saveBtn.textContent = 'Guardando...';

    try {
        // 'currentInventory' ya está actualizado por las interacciones del grid
        await saveJsonFile(allHandles.initialInventoryFileHandle, currentInventory);
        showStatus($statusElement, "Inventario inicial guardado con éxito.", "success");
        closeInventoryModal();
    } catch (err) {
        console.error("Error al guardar el inventario:", err);
        showStatus($statusElement, `Error al guardar: ${err.message}`, "error");
    } finally {
        $saveBtn.disabled = false;
        $saveBtn.textContent = 'Guardar Inventario';
    }
}

// --- Funciones de Renderizado ---

/**
 * Dibuja la lista de items disponibles en la columna derecha.
 * @param {Array} items - El array de definiciones de items (allItemDefs)
 */
function renderAvailableItems(items) {
    const filterText = $filterInput.value.toLowerCase();
    
    $availableItems.innerHTML = '';
    
    items
        .filter(def => def.name.toLowerCase().includes(filterText) || def.key.toLowerCase().includes(filterText))
        .forEach(itemDef => {
            const $item = document.createElement('div');
            $item.className = 'inv-editor-item-available';
            $item.dataset.itemId = itemDef.key;
            
            const imageUrl = getCachedAssetUrl(itemDef.imageKey);
            
            $item.innerHTML = `
                <img src="${imageUrl || 'https://placehold.co/32x32/1f2937/4b5563?text=?'}" alt="${itemDef.name}" class="w-8 h-8 object-contain" style="image-rendering: pixelated;">
                <span class="truncate">${itemDef.name}</span>
            `;

            // Event Listener para añadir al grid
            $item.addEventListener('click', () => {
                const firstEmptySlot = currentInventory.findIndex(slot => slot === null);
                if (firstEmptySlot !== -1) {
                    currentInventory[firstEmptySlot] = {
                        itemId: itemDef.key,
                        quantity: 1
                    };
                    renderInventoryGrid(); // Re-renderizar el grid
                } else {
                    showStatus($statusElement, "Inventario lleno. No se pueden añadir más items.", "error");
                }
            });

            $availableItems.appendChild($item);
        });
}

/**
 * Dibuja los 30 slots del inventario en la columna izquierda.
 */
function renderInventoryGrid() {
    $grid.innerHTML = '';
    
    currentInventory.forEach((slot, index) => {
        const $slotDiv = document.createElement('div');
        $slotDiv.className = 'inv-editor-slot';
        $slotDiv.dataset.index = index;

        if (slot && slot.itemId) {
            // Slot LLENO
            const itemDef = allItemsData[slot.itemId];
            if (itemDef) {
                const imageUrl = getCachedAssetUrl(itemDef.imageKey);
                $slotDiv.innerHTML = `
                    <img src="${imageUrl || 'https://placehold.co/64x64/1f2937/4b5563?text=?'}" alt="${itemDef.name}" class="inv-editor-slot-img" title="${itemDef.name}">
                    <span class="inv-editor-slot-qty">${slot.quantity}</span>
                `;
                $slotDiv.classList.add('filled');
            } else {
                // Item ID no válido
                $slotDiv.innerHTML = `<span class="text-red-500 text-xs p-1">ERROR:<br>${slot.itemId}</span>`;
            }
        } else {
            // Slot VACÍO
            $slotDiv.innerHTML = `<span class="text-3xl text-gray-700">${index}</span>`;
        }

        // Event Listener para editar/eliminar
        $slotDiv.addEventListener('click', () => {
            handleSlotClick(index);
        });
        
        $grid.appendChild($slotDiv);
    });
}

/**
 * Maneja el clic en un slot del grid (editar/eliminar).
 * @param {number} index - El índice (0-29) del slot clickeado.
 */
function handleSlotClick(index) {
    const slot = currentInventory[index];
    if (!slot) return; // No hacer nada si el slot está vacío

    const itemDef = allItemsData[slot.itemId];
    const oldQuantity = slot.quantity;

    // Usar prompt para una edición rápida
    const newQuantityStr = prompt(`Editando: ${itemDef.name}\nIntroduce la nueva cantidad (o 0 para eliminar):`, oldQuantity);

    if (newQuantityStr === null) {
        return; // El usuario canceló
    }

    const newQuantity = parseInt(newQuantityStr, 10);

    if (isNaN(newQuantity) || newQuantity < 0) {
        alert("Cantidad no válida. Debe ser un número positivo.");
        return;
    }

    if (newQuantity === 0) {
        // Eliminar item
        currentInventory[index] = null;
    } else {
        // Actualizar cantidad
        const maxStack = itemDef.maxStack || 99;
        currentInventory[index].quantity = Math.min(newQuantity, maxStack); // Respetar maxStack
    }

    // Re-renderizar el grid para mostrar el cambio
    renderInventoryGrid();
}