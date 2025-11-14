// --- friendlyEditor.js ---
// Lógica para construir y leer el editor "amigable" del modal.
// SEPARADO de ui.js para organizar mejor.
// AHORA incluye los constructores de CADA tipo de editor.

import { createEditorField, readEditorField } from './editor_fields.js';
import { createListEditor, reconstructListEditor } from './editor_list_component.js';

// Constructores específicos
import { buildTerrainEditor, reconstructTerrainJson } from './builders/editor_builder_terrain.js';
import { buildEntityEditor, reconstructEntityJson } from './builders/editor_builder_entity.js';
import { buildBiomeEditor, reconstructBiomeJson } from './builders/editor_builder_biome.js';
import { buildItemEditor, reconstructItemJson } from './builders/editor_builder_item.js';
import { buildCraftingEditor, reconstructCraftingJson } from './builders/editor_builder_crafting.js';


/**
 * Construye el editor amigable (Friendly Editor) dentro del modal.
 * Delega al constructor apropiado según el tipo.
 * @param {object} definition - El objeto de definición.
 * @param {HTMLElement} container - El modal-form-content.
 * @param {'terrain' | 'entity' | 'biome' | 'items' | 'crafting'} galleryType - El tipo de editor.
 */
export function buildFriendlyEditor(definition, container, galleryType) {
    switch (galleryType) {
        case 'terrain':
            buildTerrainEditor(definition, container);
            break;
        case 'entity':
            buildEntityEditor(definition, container);
            break;
        case 'biome':
            buildBiomeEditor(definition, container);
            break;
        case 'items':
            buildItemEditor(definition, container);
            break;
        case 'crafting':
            buildCraftingEditor(definition, container);
            break;
        default:
            container.innerHTML = `<p class="text-red-400">Error: Tipo de editor desconocido: ${galleryType}</p>`;
    }
}


/**
 * Reconstruye el objeto de definición desde el editor amigable.
 * Delega al reconstructor apropiado.
 * @param {HTMLElement} container - El modal-form-content.
 * @param {'terrain' | 'entity' | 'biome' | 'items' | 'crafting'} galleryType - El tipo de editor a leer.
 * @returns {object} El objeto de definición reconstruido.
 */
export function reconstructFriendlyJson(container, galleryType) {
    switch (galleryType) {
        case 'terrain':
            return reconstructTerrainJson(container);
        case 'entity':
            return reconstructEntityJson(container);
        case 'biome':
            return reconstructBiomeJson(container);
        case 'items':
            return reconstructItemJson(container);
        case 'crafting':
            return reconstructCraftingJson(container);
        default:
            console.error(`Error: Tipo de reconstructor desconocido: ${galleryType}`);
            return {};
    }
}