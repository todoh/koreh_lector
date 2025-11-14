// --- editor_list_component.js ---
// Contiene la lógica para el componente reutilizable de "Editor de Listas"
// (usado en biomas, recetas, etc.)

import { createButton } from './jsoneditor.js';
import { createEditorField, readEditorField } from './editor_fields.js';

/**
 * ¡NUEVO! Exportada.
 * Crea el DOM para una sola fila en un editor de lista.
 * @param {Array<object>} fieldDefs - Las definiciones de campos para la fila.
 * @param {object | null} itemData - Los datos para esta fila (o null para defaults).
 * @returns {HTMLElement}
 */
export function createListEditorRow(fieldDefs, itemData) {
    const $row = document.createElement('div');
    $row.className = 'list-editor-row';
    
    const defaultData = itemData || {};
    
    fieldDefs.forEach(fieldDef => {
        // Usar valor de itemData si existe, sino usar default por tipo
        const value = defaultData[fieldDef.id] !== undefined 
            ? defaultData[fieldDef.id] 
            : (fieldDef.type === 'number' ? 0 : '');
            
        // --- ¡MODIFICADO! ---
        // Asignar un ID único al campo basado en el fieldId y un timestamp
        // para evitar colisiones de 'htmlFor' en el DOM.
        const uniqueFieldDef = { 
            ...fieldDef, 
            id: `${fieldDef.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
        };
        // Guardamos el ID original en un data-attribute para la reconstrucción
        const $field = createEditorField(uniqueFieldDef, value);
        $field.dataset.originalFieldId = fieldDef.id;
        // --- FIN MODIFICADO ---

        $row.appendChild($field);
    });
    
    $row.appendChild(createButton('×', 'json-btn-del', () => $row.remove()));
    return $row;
}


/**
 * ¡MODIFICADO!
 * Crea un editor de lista gráfico (para terrainFrequency o entitySpawns).
 * @param {string} id - El ID de datos (ej. 'terrainFrequency')
 * @param {string} title - El título (ej. 'Frecuencia de Terreno')
 * @param {Array<object>} data - El array de datos (ej. [{ key: "GRASS", weight: 10 }])
 * @param {Array<object>} fieldDefs - Las definiciones de campos para cada fila (ej. [{ id: "key", ... }])
 * @param {Function | null} [customAddUIBuilder=null] - (Opcional) Función para construir una UI de "Añadir" personalizada.
 * @returns {HTMLElement}
 */
export function createListEditor(id, title, data, fieldDefs, customAddUIBuilder = null) {
    const $wrapper = document.createElement('div');
    $wrapper.className = 'list-editor-wrapper';
    $wrapper.dataset.listId = id; // Para reconstrucción
    
    const $header = document.createElement('div');
    $header.className = 'list-editor-header';
    $header.innerHTML = `<span class="list-editor-title">${title}</span>`;
    
    const $body = document.createElement('div');
    $body.className = 'list-editor-body';

    // Poblar filas existentes usando la nueva función exportada
    if (data) {
        data.forEach(item => {
            $body.appendChild(createListEditorRow(fieldDefs, item));
        });
    }

    // --- ¡LÓGICA MODIFICADA! ---
    if (customAddUIBuilder) {
        // El constructor custom se encarga de añadir su UI al header
        // Le pasamos el header, el body (para añadir filas) y las fieldDefs
        customAddUIBuilder($header, $body, fieldDefs);
    } else {
        // Comportamiento por defecto: Botón simple de Añadir Fila
        const $addBtn = createButton('+', 'json-btn-add', () => {
            // 'null' para itemData usará los valores por defecto
            $body.appendChild(createListEditorRow(fieldDefs, null)); 
        });
        $header.appendChild($addBtn);
    }
    
    $wrapper.appendChild($header);
    $wrapper.appendChild($body);
    
    return $wrapper;
}

/**
 * Reconstruye un array de datos desde un editor de lista.
 * @param {HTMLElement} $listWrapper - El .list-editor-wrapper
 * @returns {Array<object>}
 */
export function reconstructListEditor($listWrapper) {
    if (!$listWrapper) return [];
    
    const data = [];
    const $rows = $listWrapper.querySelectorAll('.list-editor-row');
    
    $rows.forEach($row => {
        const item = {};
        const $fields = $row.querySelectorAll('.editor-field');
        $fields.forEach($field => {
            // --- ¡MODIFICADO! ---
            // Leer el ID original del data-attribute
            const fieldId = $field.dataset.originalFieldId || $field.dataset.fieldId; 
            // --- FIN MODIFICADO ---
            if (fieldId) {
                item[fieldId] = readEditorField($field);
            }
        });
        if (Object.keys(item).length > 0) {
            data.push(item);
        }
    });
    
    return data;
}