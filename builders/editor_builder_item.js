// --- editor_builder_item.js ---
// Lógica para construir y reconstruir el editor de Items.
// ¡ACTUALIZADO para soportar el sistema de Componentes!

import { createEditorField, readEditorField } from '../editor_fields.js';
// Nuevas importaciones para el sistema de componentes
import { COMPONENT_DEFINITIONS } from '../editor_definitions.js';
import { createButton } from '../jsoneditor.js';

export function buildItemEditor(definition, container) {
    // --- Campos base del Item ---
    container.appendChild(createEditorField(
        { id: 'name', label: 'Name', type: 'string' },
        definition.name
    ));
    container.appendChild(createEditorField(
        { id: 'description', label: 'Description', type: 'textarea' },
        definition.description
    ));
    container.appendChild(createEditorField(
        { id: 'imageKey', label: 'Image Key', type: 'image_select' },
        definition.imageKey
    ));
    container.appendChild(createEditorField(
        { id: 'stackable', label: 'Stackable', type: 'boolean' },
        definition.stackable
    ));
    container.appendChild(createEditorField(
        { id: 'maxStack', label: 'Max Stack', type: 'number' },
        definition.maxStack
    ));
    container.appendChild(createEditorField(
        { id: 'buildable_entity', label: 'Buildable Entity Key (Opcional)', type: 'entity_select' },
        definition.buildable_entity
    ));
    container.appendChild(createEditorField(
        { id: 'terraform_tile', label: 'Terraform Tile Key (Opcional)', type: 'terrain_select' },
        definition.terraform_tile
    ));

    // --- INICIO: SECCIÓN DE COMPONENTES (Adaptada de Entity Builder) ---
    const $componentsWrapper = document.createElement('div');
    $componentsWrapper.className = 'components-wrapper';
    $componentsWrapper.innerHTML = `<h3 class="components-header">Components (Propiedades del Item)</h3>`;
    
    const $componentsList = document.createElement('div');
    $componentsList.className = 'space-y-4';
    $componentsList.id = 'item-components-list'; // ID ÚNICO PARA ITEMS
    
    if (definition.components) {
        definition.components.forEach(compData => {
            $componentsList.appendChild(buildComponentCard(compData)); // Usa el helper
        });
    }
    
    $componentsWrapper.appendChild($componentsList);
    $componentsWrapper.appendChild(createAddComponentButton()); // Usa el helper
    container.appendChild($componentsWrapper);
    // --- FIN: SECCIÓN DE COMPONENTES ---
}

export function reconstructItemJson(container) {
    const definition = {};
    
    // --- Reconstrucción de campos base ---
    definition.name = readEditorField(container.querySelector('[data-field-id="name"]'));
    definition.description = readEditorField(container.querySelector('[data-field-id="description"]'));
    definition.imageKey = readEditorField(container.querySelector('[data-field-id="imageKey"]'));
    definition.stackable = readEditorField(container.querySelector('[data-field-id="stackable"]'));
    definition.maxStack = readEditorField(container.querySelector('[data-field-id="maxStack"]'));
    
    const buildable = readEditorField(container.querySelector('[data-field-id="buildable_entity"]'));
    if (buildable) definition.buildable_entity = buildable;
    
    const terraform = readEditorField(container.querySelector('[data-field-id="terraform_tile"]'));
    if (terraform) definition.terraform_tile = terraform;

    // --- INICIO: RECONSTRUCCIÓN DE COMPONENTES (Adaptada de Entity Builder) ---
    definition.components = [];
    // Nota: querySelectorAll('.component-card') funciona bien porque está limitado al 'container' del item.
    const $componentCards = container.querySelectorAll('.component-card'); 
    
    $componentCards.forEach($card => {
        const type = $card.dataset.componentType;
        const isKnown = !!COMPONENT_DEFINITIONS[type];
        const compDef = COMPONENT_DEFINITIONS[type] || { args: [] };
        
        const newComponentData = {
            type: type,
            args: []
        };

        if (compDef.args.length > 0) {
            // Caso 1: Componente conocido CON argumentos
            compDef.args.forEach(argDef => {
                const $field = $card.querySelector(`[data-field-id="${argDef.id}"]`);
                newComponentData.args.push(readEditorField($field));
            });
        } else if (isKnown) {
            // Caso 2: Componente conocido SIN argumentos
            // No hacer nada. 'args' se queda como []
        } else {
            // Caso 3: Componente DESCONOCIDO (edición raw)
            const $field = $card.querySelector(`[data-field-id="args"]`);
            try {
                newComponentData.args = JSON.parse(readEditorField($field));
            } catch (e) {
                 newComponentData.args = [readEditorField($field)];
            }
        }
        
        definition.components.push(newComponentData);
    });
    // --- FIN: RECONSTRUCCIÓN DE COMPONENTES ---

    return definition;
}


// --- Funciones Helper Internas (Copiadas de Entity Builder) ---
// Estas funciones construyen las "tarjetas" de componentes para la UI.

function buildComponentCard(componentData) {
    const isKnown = !!COMPONENT_DEFINITIONS[componentData.type];
    const compDef = COMPONENT_DEFINITIONS[componentData.type] || {
        emoji: '❓',
        name: componentData.type,
        description: 'Componente desconocido. Editar con precaución.',
        args: []
    };

    const $card = document.createElement('div');
    $card.className = 'component-card';
    $card.dataset.componentType = componentData.type;

    const $header = document.createElement('div');
    $header.className = 'component-card-header';
    $header.innerHTML = `
        <span class="text-2xl">${compDef.emoji}</span>
        <div class="flex-grow">
            <h4 class="font-bold text-cyan-300">${compDef.name}</h4>
            <p class="text-sm text-gray-400">${compDef.description}</p>
        </div>
    `;
    const $delBtn = createButton('×', 'json-btn-del', () => $card.remove());
    $delBtn.classList.add('text-lg');
    $header.appendChild($delBtn);
    
    const $body = document.createElement('div');
    $body.className = 'component-card-body';
    
    if (compDef.args.length > 0) {
        // Caso 1: Conocido CON argumentos
        compDef.args.forEach((argDef, index) => {
            const argValue = (componentData.args && componentData.args.length > index) ? componentData.args[index] : null;
            $body.appendChild(createEditorField(argDef, argValue));
        });
    } else if (isKnown) {
        // Caso 2: Conocido SIN argumentos
         $body.innerHTML = `<p class="text-sm text-gray-500 italic">Este componente no requiere configuración.</p>`;
    } else {
        // Caso 3: Desconocido (edición raw)
        $body.innerHTML = `<p class="text-sm text-yellow-400">Editando 'args' como JSON crudo:</p>`;
        $body.appendChild(createEditorField({ id: 'args', label: 'Args (JSON)', type: 'textarea' }, JSON.stringify(componentData.args || [])));
    }

    $card.appendChild($header);
    $card.appendChild($body);
    return $card;
}

function createAddComponentButton() {
    const $wrapper = document.createElement('div');
    $wrapper.className = 'add-component-wrapper';

    const $select = document.createElement('select');
    $select.className = 'json-value';
    $select.innerHTML = '<option value="">Añadir propiedad (componente)...</option>';
    
    Object.keys(COMPONENT_DEFINITIONS).sort().forEach(type => {
        const compDef = COMPONENT_DEFINITIONS[type];
        $select.innerHTML += `<option value="${type}">${compDef.emoji} ${compDef.name}</option>`;
    });

    const $addBtn = createButton('+', 'json-btn-add', () => {
        const type = $select.value;
        if (!type) return;
        
        const compDef = COMPONENT_DEFINITIONS[type];
        const newComponentData = {
            type: type,
            args: compDef.args.map(argDef => {
                switch (argDef.type) {
                    case 'boolean': return false;
                    case 'number': return 0;
                    case 'collision_box': return { width: 40, height: 20, offsetY: 20 };
                    case 'select': return argDef.options[0];
                    default: return "";
                }
            })
        };
        
        // --- ¡MODIFICACIÓN CLAVE! ---
        // Nos aseguramos de añadirlo a la lista de componentes del ITEM.
        document.getElementById('item-components-list').appendChild(buildComponentCard(newComponentData));
        // --- FIN MODIFICACIÓN ---
        
        $select.value = "";
    });
    
    $wrapper.appendChild($select);
    $wrapper.appendChild($addBtn);
    return $wrapper;
}