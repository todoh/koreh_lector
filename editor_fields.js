// --- editor_fields.js ---
// Contiene la lógica para CREAR y LEER widgets de UI individuales
// (inputs, selects, textareas, etc.)

import { assetUrlCache, getCachedAssetUrl } from './assets.js'; // ¡NUEVA IMPORTACIÓN!

/**
 * Crea el DOM para un solo campo de editor (ej. un input de string, un checkbox, etc.)
 * @param {object} argDef - La definición del campo, ej. { id: 'name', label: 'Name', type: 'string' }
 * @param {*} value - El valor actual para ese campo.
 * @returns {HTMLElement}
 */
export function createEditorField(argDef, value) {
    const $field = document.createElement('div');
    $field.className = 'editor-field';
    // Guardar ID para reconstrucción
    $field.dataset.fieldId = argDef.id;
    $field.dataset.fieldType = argDef.type; 
    $field.dataset.fieldLabel = argDef.label; // Guardar label para referencia

    const $label = document.createElement('label');
    $label.className = 'editor-field-label';
    $label.textContent = argDef.label;
    $label.htmlFor = `field-${argDef.id}`;
    
    let $input;

    switch (argDef.type) {
        case 'boolean':
            $input = document.createElement('input');
            $input.type = 'checkbox';
            $input.checked = !!value;
            $input.id = `field-${argDef.id}`;
            $input.className = 'form-checkbox h-6 w-6 bg-gray-700 border-gray-600 rounded text-blue-500 focus:ring-blue-500';
            $field.classList.add('flex-row', 'items-center', 'gap-4'); // Estilo especial para checkbox
            $field.appendChild($input); // El input va ANTES que el label
            $field.appendChild($label);
            break;
            
        case 'number':
            $input = document.createElement('input');
            $input.type = 'number';
            $input.step = (argDef.id === 'threshold') ? 0.01 : 1; // Decimales para threshold
            $input.value = (value === null || value === undefined) ? 0 : value;
            $input.id = `field-${argDef.id}`;
            $input.className = 'json-value';
            $field.appendChild($label);
            $field.appendChild($input);
            break;

        case 'textarea':
            $input = document.createElement('textarea');
            $input.value = (value === null || value === undefined) ? "" : value;
            $input.id = `field-${argDef.id}`;
            $input.className = 'json-value';
            $input.rows = 3;
            $field.appendChild($label);
            $field.appendChild($input);
            break;
            
        case 'select':
            $input = document.createElement('select');
            $input.id = `field-${argDef.id}`;
            $input.className = 'json-value';
            (argDef.options || []).forEach(opt => {
                $input.innerHTML += `<option value="${opt}">${opt}</option>`;
            });
            $input.value = value;
            $field.appendChild($label);
            $field.appendChild($input);
            break;

        // --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
        // --- ¡NUEVO! Tipos de Selector (image, entity, item, terrain) ---
        // --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
        case 'image_select':
        case 'entity_select':
        case 'item_select':
        case 'terrain_select':
            // 1. Determinar el tipo para los data-attributes y clases
            const typeKey = argDef.type.split('_')[0]; // 'image', 'entity', 'item', 'terrain'
            
            // 2. Crear el 'falso' input clickeable
            $input = document.createElement('div');
            $input.className = `${typeKey}-selector-input`; // ej: 'entity-selector-input'

            // 3. Obtener la URL de la imagen
            // Para 'item' y 'entity', la URL se basa en su clave de imagen, no en la clave de la entidad/item en sí.
            // PERO, getCachedAssetUrl(value) es lo suficientemente inteligente para mapear 'TREE' a 'tree.png'
            const imageUrl = getCachedAssetUrl(value) || 'https://placehold.co/40x40/1f2937/4b5563?text=?';
            const displayKey = value || '(Ninguna)';

            $input.innerHTML = `
                <img src="${imageUrl}" alt="Preview" class="${typeKey}-selector-preview">
                <span class="${typeKey}-selector-key-display">${displayKey}</span>
                <button type="button" class="${typeKey}-selector-button" data-action="open-${typeKey}-selector">
                    Seleccionar...
                </button>
            `;
            
            // 4. Crear el input OCULTO que guarda el valor real
            const $hiddenInput = document.createElement('input');
            $hiddenInput.type = 'hidden';
            $hiddenInput.id = `field-${argDef.id}`;
            $hiddenInput.value = value || "";

            // 5. Añadir todo al field
            $field.appendChild($label);
            $field.appendChild($input);
            $field.appendChild($hiddenInput); // ¡Importante!
            break;
            
        case 'collision_box':
            $input = createCollisionBoxEditor(value); // Devuelve un div, no un input
            $input.id = `field-${argDef.id}`;
            $field.appendChild($label);
            $field.appendChild($input);
            break;

        case 'string':
        default:
            $input = document.createElement('input');
            $input.type = 'text';
            $input.value = (value === null || value === undefined) ? "" : value;
            $input.id = `field-${argDef.id}`;
            $input.className = 'json-value';
            $field.appendChild($label);
            $field.appendChild($input);
            break;
    }

    return $field;
}

/**
 * Crea el sub-editor para un 'collision_box'. (Función interna)
 * @param {object | null} value - El objeto de collisionBox, ej. { width: 40, ... }
 * @returns {HTMLElement}
 */
function createCollisionBoxEditor(value) {
    const box = value || { width: 0, height: 0, offsetY: 0 }; // Default
    
    const $wrapper = document.createElement('div');
    $wrapper.className = 'collision-box-editor';
    
    $wrapper.appendChild(createEditorField(
        { id: 'width', label: 'Width', type: 'number' }, box.width
    ));
    $wrapper.appendChild(createEditorField(
        { id: 'height', label: 'Height', type: 'number' }, box.height
    ));
    $wrapper.appendChild(createEditorField(
        { id: 'offsetY', label: 'Offset Y', type: 'number' }, box.offsetY
    ));
    
    return $wrapper;
}


/**
 * Lee el valor de un solo campo del editor.
 * @param {HTMLElement} $field - El div.editor-field
 * @returns {*} El valor leído.
 */
export function readEditorField($field) {
    if (!$field) return null;
    
    const type = $field.dataset.fieldType;
    
    // --- ¡MODIFICADO! ---
    // Manejar todos los tipos de selector
    if (type === 'image_select' || type === 'entity_select' || type === 'item_select' || type === 'terrain_select') {
        // Leemos el valor del input oculto
        const $hiddenInput = $field.querySelector('input[type="hidden"]');
        return $hiddenInput ? $hiddenInput.value : null;
    }
    // --- FIN DE MODIFICACIÓN ---
    
    const $input = $field.querySelector('input, select, textarea');
    
    switch (type) {
        case 'boolean':
            return $input.checked;
        case 'number':
            return parseFloat($input.value) || 0;
        case 'collision_box':
            const w = readEditorField($field.querySelector('[data-field-id="width"]'));
            const h = readEditorField($field.querySelector('[data-field-id="height"]'));
            const o = readEditorField($field.querySelector('[data-field-id="offsetY"]'));
            return { width: w, height: h, offsetY: o };
        case 'string':
        case 'textarea':
        case 'select':
        default:
            return $input.value;
    }
}