// --- editor_builder_crafting.js ---
// Lógica para construir y reconstruir el editor de Recetas (Crafting).

import { createEditorField, readEditorField } from '../editor_fields.js';
import { createListEditor, reconstructListEditor } from '../editor_list_component.js';

export function buildCraftingEditor(definition, container) {
    container.appendChild(createEditorField(
        // --- ¡MODIFICADO! ---
        { id: 'itemId', label: 'Item ID (Resultado)', type: 'item_select' },
        // --- FIN MODIFICADO ---
        definition.itemId
    ));
     container.appendChild(createEditorField(
        { id: 'name', label: 'Name (Legacy/Display)', type: 'string' },
        definition.name
    ));
    container.appendChild(createEditorField(
        { id: 'quantity', label: 'Quantity (Resultado)', type: 'number' },
        definition.quantity || 1
    ));
    container.appendChild(createListEditor(
        'requirements',
        'Requirements',
        definition.requirements || [],
        [
            // --- ¡MODIFICADO! ---
            { id: 'itemId', label: 'Item ID', type: 'item_select' },
            // --- FIN MODIFICADO ---
            { id: 'quantity', label: 'Quantity', type: 'number' }
        ]
    ));
}

export function reconstructCraftingJson(container) {
    const definition = {};
    definition.itemId = readEditorField(container.querySelector('[data-field-id="itemId"]'));
    definition.name = readEditorField(container.querySelector('[data-field-id="name"]'));
    const qty = readEditorField(container.querySelector('[data-field-id="quantity"]'));
    if (qty > 1) definition.quantity = qty;
    
    definition.requirements = reconstructListEditor(
        container.querySelector('[data-list-id="requirements"]')
    );
    return definition;
}