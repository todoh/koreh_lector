// --- editor_builder_biome.js ---
// Lógica para construir y reconstruir el editor de Bioma.

import { createEditorField, readEditorField } from '../editor_fields.js';
import { createListEditor, reconstructListEditor } from '../editor_list_component.js';

export function buildBiomeEditor(definition, container) {
    container.appendChild(createEditorField(
        // --- ¡MODIFICADO! ---
        { id: 'baseTile', label: 'Base Tile Key', type: 'terrain_select' },
        // --- FIN MODIFICADO ---
        definition.baseTile
    ));
    container.appendChild(createListEditor(
        'terrainRules', 'Terrain Rules', definition.terrainRules || [],
        [
            // --- ¡MODIFICADO! ---
            { id: 'tileKey', label: 'Tile Key', type: 'terrain_select' },
            // --- FIN MODIFICADO ---
            { id: 'noise', label: 'Noise Map', type: 'string' },
            { id: 'threshold', label: 'Threshold (0-1)', type: 'number' }
        ]
    ));
    container.appendChild(createListEditor(
        'entities', 'Entities', definition.entities || [],
        [
            { id: 'type', label: 'Type', type: 'string' },
            // --- ¡MODIFICADO! ---
            { id: 'entityKey', label: 'Entity Key', type: 'entity_select' },
            // --- FIN MODIFICADO ---
            { id: 'noise', label: 'Noise Map', type: 'string' },
            { id: 'threshold', label: 'Threshold (0-1)', type: 'number' }
        ]
    ));
}

export function reconstructBiomeJson(container) {
    const definition = {};
    definition.baseTile = readEditorField(container.querySelector('[data-field-id="baseTile"]'));
    definition.terrainRules = reconstructListEditor(
        container.querySelector('[data-list-id="terrainRules"]')
    );
    definition.entities = reconstructListEditor(
        container.querySelector('[data-list-id="entities"]')
    );
    return definition;
}