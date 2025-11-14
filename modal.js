// --- modal.js ---
// Lógica para abrir, cerrar y guardar el modal de edición.

import { buildFriendlyEditor, reconstructFriendlyJson } from './friendlyeditor.js';
// --- ¡NUEVAS IMPORTACIONES! ---
import { createEditorField, readEditorField } from './editor_fields.js';
import { getCachedAssetUrl } from './assets.js';

/**
 * ¡MODIFICADO!
 * Abre y puebla el modal de edición.
 * @param {string | null} key - La clave del item a editar, o null si es nuevo.
 * @param {object} definition - La definición del objeto.
 * @param {HTMLElement} $modalTitle - El elemento del título del modal.
 * @param {HTMLElement} $modalFormContent - El contenedor del formulario del modal.
 * @param {HTMLElement} $editorModal - El elemento del modal.
 * @param {'terrain' | 'entity' | 'biome' | 'items' | 'crafting' | 'assets'} galleryType - El tipo de editor a construir.
 */
export function openModal(key, definition, $modalTitle, $modalFormContent, $editorModal, galleryType) {
    
    $modalFormContent.innerHTML = ''; // Limpiar formulario

    // --- ¡NUEVO! Editor de Assets ---
    if (galleryType === 'assets') {
        $modalTitle.textContent = `Editar Asset: ${key}`;
        buildAssetEditor(definition, $modalFormContent);
    } 
    // --- Editor de JSON (existente) ---
    else {
        let keyInputHtml;
        let effectiveKey = key;
        
        if (galleryType === 'crafting') {
            effectiveKey = definition.itemId || null; 
            if (!effectiveKey && !key) { // Creando nueva receta
                effectiveKey = "NUEVA_RECETA_ID";
            } else if (!effectiveKey && key) { // Editando (fallback)
                effectiveKey = key;
            }
        }

        if (key) { // 'key' no es nulo si estamos editando
            $modalTitle.textContent = `Editar "${effectiveKey}"`;
            keyInputHtml = `
                <div class="editor-field">
                    <label class="editor-field-label" for="modal-item-key">Clave (ID)</label>
                    <input type="text" id="modal-item-key" value="${effectiveKey}" disabled class="json-value bg-gray-600 text-gray-400 cursor-not-allowed">
                </div>
            `;
            if (galleryType === 'crafting') keyInputHtml = '';

        } else {
            // Creando nuevo item
            $modalTitle.textContent = 'Añadir Nuevo Item';
            keyInputHtml = `
                <div class="editor-field">
                    <label class="editor-field-label" for="modal-item-key">Clave (ID)</label>
                    <input type="text" id="modal-item-key" value="NUEVA_CLAVE" class="json-value bg-yellow-200 text-black font-bold">
                </div>
            `;
            if (galleryType === 'crafting') {
                $modalTitle.textContent = 'Añadir Nueva Receta';
                keyInputHtml = '';
            }
        }
        $modalFormContent.insertAdjacentHTML('beforeend', keyInputHtml);
        buildFriendlyEditor(definition, $modalFormContent, galleryType);
    }
    
    // Mostrar modal
    $editorModal.style.display = 'flex';
    setTimeout(() => $editorModal.style.opacity = '1', 10);
}

/**
 * Cierra el modal de edición
 */
export function closeModal($editorModal) {
    $editorModal.style.opacity = '0';
    setTimeout(() => $editorModal.style.display = 'none', 150);
}

/**
 * ¡MODIFICADO!
 * Maneja la lógica de guardar desde el modal.
 * @param {string} currentEditKey - La clave original del item.
 * @param {HTMLElement} $modalFormContent - El contenedor del formulario.
 * @param {object | Array} loadedJsonData - El objeto JSON o ARRAY (para crafting).
 * @param {'terrain' | 'entity' | 'biome' | 'items' | 'crafting' | 'assets'} galleryType - El tipo de editor a leer.
 */
export function handleModalSave(currentEditKey, $modalFormContent, loadedJsonData, galleryType) {
    
    // --- ¡NUEVO! Guardado de Assets ---
    if (galleryType === 'assets') {
        const data = reconstructAssetJson($modalFormContent);
        data.oldFilename = currentEditKey; // Añadir la clave original
        return data;
    }
    
    // --- Guardado de JSON (existente) ---
    const newDefinition = reconstructFriendlyJson($modalFormContent, galleryType);

    if (galleryType === 'crafting') {
        const newKey = newDefinition.itemId; 
        if (!newKey) {
            alert("El 'itemId' de la receta no puede estar vacío.");
            return null;
        }

        if (currentEditKey) { // Editando
            const oldIndex = loadedJsonData.findIndex(r => r.itemId === currentEditKey || r.itemId === (currentEditKey.split('_')[1]));
            if (oldIndex !== -1) {
                loadedJsonData[oldIndex] = newDefinition; // Reemplazar
            } else {
                 loadedJsonData.push(newDefinition); // Añadir (fallback)
            }
        } else { // Creando
            loadedJsonData.push(newDefinition); // Añadir al final del array
        }
        return { newKey, newDefinition, oldKey: currentEditKey };

    } else {
        const $keyInput = $modalFormContent.querySelector('#modal-item-key');
        const newKey = $keyInput.value.trim().toUpperCase(); // Forzar mayúsculas
        if (!newKey) {
            alert("La Clave (ID) no puede estar vacía.");
            return null;
        }

        if (currentEditKey && currentEditKey !== newKey) {
            delete loadedJsonData[currentEditKey]; // Borrar la antigua
        }
        
        loadedJsonData[newKey] = newDefinition; // Añadir/actualizar la nueva

        return { newKey, newDefinition, oldKey: currentEditKey };
    }
}


// --- --- --- --- --- --- --- --- --- --- ---
// --- ¡NUEVAS FUNCIONES PARA EL EDITOR DE ASSETS! ---
// --- --- --- --- --- --- --- --- --- --- ---

/**
 * Construye el editor específico para imágenes en el modal.
 * @param {object} definition - El objeto con { filename, width, height, url }
 * @param {HTMLElement} container - El modal-form-content.
 */
function buildAssetEditor(definition, container) {
    // 1. Vista previa de la imagen
    const $previewWrapper = document.createElement('div');
    $previewWrapper.className = 'w-full bg-gray-900 p-4 rounded-md border border-gray-700 flex items-center justify-center min-h-[200px] mb-4';
    $previewWrapper.innerHTML = `
        <img id="modal-image-preview" src="${definition.url}" alt="${definition.filename}" class="max-w-full max-h-[250px] object-contain rounded-md" style="image-rendering: pixelated;">
    `;
    container.appendChild($previewWrapper);

    // 2. Campo de Nombre
    container.appendChild(createEditorField(
        { id: 'filename', label: 'Nombre del Archivo', type: 'string' },
        definition.filename
    ));

    // 3. Contenedor para dimensiones
    const $dimsWrapper = document.createElement('div');
    $dimsWrapper.className = 'grid grid-cols-2 gap-4';
    
    const $widthField = createEditorField(
        { id: 'width', label: 'Ancho (px)', type: 'number' },
        definition.width
    );
    const $heightField = createEditorField(
        { id: 'height', label: 'Alto (px)', type: 'number' },
        definition.height
    );
    
    $dimsWrapper.appendChild($widthField);
    $dimsWrapper.appendChild($heightField);
    container.appendChild($dimsWrapper);
    
    // 4. Checkbox de Aspect Ratio
    const $aspectField = createEditorField(
        { id: 'aspectRatio', label: 'Mantener Proporciones', type: 'boolean' },
        true // Marcado por defecto
    );
    container.appendChild($aspectField);

    // --- Lógica de Aspect Ratio ---
    const $widthInput = $widthField.querySelector('input');
    const $heightInput = $heightField.querySelector('input');
    const $aspectInput = $aspectField.querySelector('input');
    const originalRatio = definition.width / definition.height;

    $widthInput.addEventListener('input', () => {
        if ($aspectInput.checked) {
            const newWidth = parseFloat($widthInput.value) || 0;
            $heightInput.value = Math.round(newWidth / originalRatio);
        }
    });

    $heightInput.addEventListener('input', () => {
        if ($aspectInput.checked) {
            const newHeight = parseFloat($heightInput.value) || 0;
            $widthInput.value = Math.round(newHeight * originalRatio);
        }
    });
}

/**
 * Lee los valores del editor de assets en el modal.
 * @param {HTMLElement} container - El modal-form-content.
 * @returns {object} - { newFilename, newWidth, newHeight }
 */
function reconstructAssetJson(container) {
    const newFilename = readEditorField(container.querySelector('[data-field-id="filename"]'));
    const newWidth = readEditorField(container.querySelector('[data-field-id="width"]'));
    const newHeight = readEditorField(container.querySelector('[data-field-id="height"]'));
    
    return { newFilename, newWidth, newHeight };
}