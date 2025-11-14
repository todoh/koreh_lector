// --- editor_builder_terrain.js ---
// Lógica para construir y reconstruir el editor de Terreno.

import { createEditorField, readEditorField } from '../editor_fields.js';

export function buildTerrainEditor(definition, container) {
    container.appendChild(createEditorField(
        { id: 'name', label: 'Name', type: 'string' },
        definition.name
    ));
    container.appendChild(createEditorField(
        { id: 'solid', label: 'Solid', type: 'boolean' },
        definition.solid
    ));
     container.appendChild(createEditorField(
        { id: 'key', label: 'Key (legacy)', type: 'string' },
        definition.key
    ));
}

export function reconstructTerrainJson(container) {
    const definition = {};
    definition.name = readEditorField(container.querySelector('[data-field-id="name"]'));
    definition.solid = readEditorField(container.querySelector('[data-field-id="solid"]'));
    definition.key = readEditorField(container.querySelector('[data-field-id="key"]'));
    return definition;
}