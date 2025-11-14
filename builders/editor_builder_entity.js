// --- editor_builder_entity.js ---
// Lógica para construir y reconstruir el editor de Entidad.

import { createEditorField, readEditorField } from '../editor_fields.js';
import { COMPONENT_DEFINITIONS } from '../editor_definitions.js';
import { createButton } from '../jsoneditor.js';

export function buildEntityEditor(definition, container) {
    container.appendChild(createEditorField(
        { id: 'name', label: 'Name', type: 'string' },
        definition.name
    ));
    container.appendChild(createEditorField(
        // --- MODIFICADO ---
        { id: 'renderMode', label: 'Render Mode', type: 'select', options: ['billboard', 'cross', 'cube', 'flat', '3d'] },  
        // --- FIN MODIFICADO ---
        definition.renderMode || 'billboard'
    ));
    
    // --- Sección de Componentes ---
    const $componentsWrapper = document.createElement('div');
    $componentsWrapper.className = 'components-wrapper';
    $componentsWrapper.innerHTML = `<h3 class="components-header">Components</h3>`;
    
    const $componentsList = document.createElement('div');
    $componentsList.className = 'space-y-4';
    $componentsList.id = 'components-list'; // ID para reconstruir
    
    if (definition.components) {
        definition.components.forEach(compData => {
            $componentsList.appendChild(buildComponentCard(compData));
        });
    }
    
    $componentsWrapper.appendChild($componentsList);
    $componentsWrapper.appendChild(createAddComponentButton());
    container.appendChild($componentsWrapper);
}

export function reconstructEntityJson(container) {
    const definition = {};
    definition.name = readEditorField(container.querySelector('[data-field-id="name"]'));
    definition.renderMode = readEditorField(container.querySelector('[data-field-id="renderMode"]'));
    
    definition.components = [];
    const $componentCards = container.querySelectorAll('.component-card');
    
    $componentCards.forEach($card => {
        const type = $card.dataset.componentType;
        // --- INICIO DE LA CORRECCIÓN ---
        const isKnown = !!COMPONENT_DEFINITIONS[type]; // 1. Comprobar si el componente es conocido
        const compDef = COMPONENT_DEFINITIONS[type] || { args: [] }; // 2. Obtener def
        // --- FIN DE LA CORRECCIÓN ---
        
        const newComponentData = {
            type: type,
            args: [] // 3. Empezar SIEMPRE con un array vacío
        };

        if (compDef.args.length > 0) {
            // Caso 1: Componente conocido CON argumentos (ej. Collision, Vehicle)
            compDef.args.forEach(argDef => {
                const $field = $card.querySelector(`[data-field-id="${argDef.id}"]`);
                newComponentData.args.push(readEditorField($field));
            });
        } else if (isKnown) {
            // Caso 2: Componente conocido SIN argumentos (ej. InteractableVehicle)
            // No hacer nada. 'newComponentData.args' se queda como [] (array vacío).
        } else {
            // Caso 3: Componente DESCONOCIDO (edición raw)
            const $field = $card.querySelector(`[data-field-id="args"]`);
            try {
                newComponentData.args = JSON.parse(readEditorField($field));
            } catch (e) {
                 newComponentData.args = [readEditorField($field)];
            }
        }
        // --- FIN DE LA CORRECCIÓN DE LÓGICA ---
        
        definition.components.push(newComponentData);
    });
    return definition;
}


// --- Funciones Helper Internas ---

function buildComponentCard(componentData) {
    // --- INICIO DE LA CORRECCIÓN ---
    const isKnown = !!COMPONENT_DEFINITIONS[componentData.type]; // 1. Comprobar si es conocido
    const compDef = COMPONENT_DEFINITIONS[componentData.type] || {
        // 2. Definición de fallback para componentes desconocidos
        emoji: '❓',
        name: componentData.type,
        description: 'Componente desconocido. Editar con precaución.',
        args: []
    };
    // --- FIN DE LA CORRECCIÓN ---

    const $card = document.createElement('div');
    $card.className = 'component-card';
    $card.dataset.componentType = componentData.type;

    // ... (El código del $header no cambia) ...
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
    
    // --- INICIO DE LA CORRECCIÓN DE LÓGICA ---
    if (compDef.args.length > 0) {
        // Caso 1: Componente conocido CON argumentos (ej. Collision, Vehicle)
        compDef.args.forEach((argDef, index) => {
            const argValue = (componentData.args && componentData.args.length > index) ? componentData.args[index] : null;
            $body.appendChild(createEditorField(argDef, argValue));
        });
    } else if (isKnown) {
        // Caso 2: Componente conocido SIN argumentos (ej. InteractableVehicle)
         $body.innerHTML = `<p class="text-sm text-gray-500 italic">Este componente no requiere configuración.</p>`;
    } else {
        // Caso 3: Componente DESCONOCIDO (edición raw)
        $body.innerHTML = `<p class="text-sm text-yellow-400">Editando 'args' como JSON crudo:</p>`;
        $body.appendChild(createEditorField({ id: 'args', label: 'Args (JSON)', type: 'textarea' }, JSON.stringify(componentData.args || [])));
    }
    // --- FIN DE LA CORRECCIÓN DE LÓGICA ---

    $card.appendChild($header);
    $card.appendChild($body);
    return $card;
}
function createAddComponentButton() {
    const $wrapper = document.createElement('div');
    $wrapper.className = 'add-component-wrapper';

    const $select = document.createElement('select');
    $select.className = 'json-value';
    $select.innerHTML = '<option value="">Selecciona un componente...</option>';
    
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
        
        document.getElementById('components-list').appendChild(buildComponentCard(newComponentData));
        $select.value = "";
    });
    
    $wrapper.appendChild($select);
    $wrapper.appendChild($addBtn);
    return $wrapper;
}