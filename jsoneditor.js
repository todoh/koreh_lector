// --- jsonEditor.js ---
// Contiene la lógica para construir y leer el árbol de nodos del editor JSON.

/**
 * Construye recursivamente el editor DOM (USADO POR EL MODAL Y BIOMAS)
 * @param {object | Array} data - Los datos (objeto o array) a editar.
 * @param {HTMLElement} container - El elemento DOM donde construir el editor.
 */
export function buildEditor(data, container) {
    if (Array.isArray(data)) {
        container.dataset.type = 'array';
        data.forEach((item, index) => {
            container.appendChild(createNode(index, item, 'array-item'));
        });
        // Botón para añadir item al array
        const $addBtn = createButton('+', 'json-btn-add', () => {
            const newItem = "nuevo_valor"; // Valor por defecto
            // Añadir al DOM
            container.insertBefore(createNode(container.querySelectorAll(':scope > .json-node-wrapper').length, newItem, 'array-item'), $addBtn);
        });
        container.appendChild($addBtn);
    } else if (typeof data === 'object' && data !== null) {
        container.dataset.type = 'object';
        Object.entries(data).forEach(([key, value]) => {
            container.appendChild(createNode(key, value, 'object-property'));
        });
        // Botón para añadir propiedad al objeto
        const $addBtn = createButton('+', 'json-btn-add', () => {
            const newKey = `nueva_prop_${container.querySelectorAll(':scope > .json-node-wrapper').length}`;
            const newValue = "nuevo_valor"; // Valor por defecto
            // Añadir al DOM
            container.insertBefore(createNode(newKey, newValue, 'object-property'), $addBtn);
        });
        container.appendChild($addBtn);
    }
}

/**
 * Crea un nodo (fila) en el editor
 * @param {string | number} key - La clave (o índice) del item.
 * @param {*} value - El valor del item.
 * @param {'array-item' | 'object-property'} type - El tipo de nodo.
 * @returns {HTMLElement} El elemento DOM del nodo.
 */
function createNode(key, value, type) {
    const $nodeWrapper = document.createElement('div');
    $nodeWrapper.className = 'json-node-wrapper py-2 space-y-2';
    $nodeWrapper.dataset.type = type;

    const $header = document.createElement('div');
    $header.className = 'flex items-center gap-2';

    // Botón de Eliminar
    const $delBtn = createButton('-', 'json-btn-del', () => {
        $nodeWrapper.remove();
    });
    $header.appendChild($delBtn);

    // Input para la Clave (o índice)
    const $keyInput = document.createElement('input');
    $keyInput.type = 'text';
    $keyInput.value = key;
    $keyInput.className = 'json-key';
    if (type === 'array-item') {
        $keyInput.disabled = true; // Los índices del array no se editan
        $keyInput.classList.add('w-12', 'text-center');
    } else {
        $keyInput.classList.add('flex-shrink-0');
        $keyInput.dataset.role = 'key';
    }
    $header.appendChild($keyInput);

    // Input para el Valor (o contenedor anidado)
    if (typeof value === 'object' && value !== null) {
        // Valor es Objeto o Array -> Recursión
        const $childContainer = document.createElement('div');
        $childContainer.className = 'json-node';
        $childContainer.dataset.role = 'value';
        buildEditor(value, $childContainer); // Llamada recursiva
        $nodeWrapper.appendChild($header);
        $nodeWrapper.appendChild($childContainer);
    } else {
        // Valor es Primitivo (string, number, boolean)
        let $valueInput;
        if (typeof value === 'boolean') {
            $valueInput = document.createElement('input');
            $valueInput.type = 'checkbox';
            $valueInput.checked = value;
            // Usamos clases de Tailwind directamente ya que están cargadas
            $valueInput.className = 'form-checkbox h-5 w-5 bg-gray-700 border-gray-600 rounded text-blue-500 focus:ring-blue-500';
            $valueInput.dataset.type = 'boolean';
        } else if (typeof value === 'number') {
             $valueInput = document.createElement('input');
             $valueInput.type = 'number';
             $valueInput.value = value;
             $valueInput.className = 'json-value';
             $valueInput.dataset.type = 'number';
        } else {
            // String o null
            $valueInput = document.createElement('textarea');
            $valueInput.value = (value === null || value === undefined) ? "" : value;
            $valueInput.className = 'json-value';
            $valueInput.rows = value && value.toString().length > 70 ? 3 : 1;
            $valueInput.dataset.type = 'string';
        }
        
        $valueInput.dataset.role = 'value';
        $header.appendChild($valueInput);
        $nodeWrapper.appendChild($header);
    }

    return $nodeWrapper;
}

/**
 * Helper para crear botones
 * @param {string} text - Texto del botón.
 * @param {string} className - Clase CSS (ej. 'json-btn-add').
  * @param {Function} onClick - Callback del clic.
 * @returns {HTMLElement} El elemento botón.
 */
export function createButton(text, className, onClick) {
    const $btn = document.createElement('button');
    $btn.type = 'button';
    $btn.textContent = text;
    $btn.className = `json-btn ${className}`;
    $btn.addEventListener('click', onClick);
    return $btn;
}

/**
 * Reconstruye el objeto JSON desde el DOM del editor (USADO POR EL MODAL Y BIOMAS)
 * @param {HTMLElement} container - El contenedor del formulario en el modal.
 * @returns {object} El objeto JSON reconstruido.
 */
export function reconstructJson(container) {
    // Buscar el nodo raíz de datos (objeto o array) DENTRO del contenedor del modal
    // Se salta el input de la clave que añadimos manualmente.
    const rootNodes = container.querySelectorAll(':scope > [data-type="object"], :scope > [data-type="array"]');
    if (rootNodes.length === 0) {
        // No hay un objeto o array anidado, es un objeto simple de pares clave/valor
        const obj = {};
        const nodes = container.querySelectorAll(':scope > .json-node-wrapper');
        nodes.forEach(node => {
            const keyNode = node.querySelector('[data-role="key"]');
            const valueNode = node.querySelector('[data-role="value"]');
            if (keyNode && valueNode) {
                // No incluir la clave especial del modal
                if (keyNode.id === 'modal-item-key') return; 
                
                const key = keyNode.value;
                obj[key] = parseValueNode(valueNode);
            }
        });
        return obj;
    }
    // Si encontramos un nodo raíz (debería ser solo uno), lo parseamos
    return parseValueNode(rootNodes[0]); // Empezar a parsear desde el nodo raíz
}

/**
 * Parsea el valor de un nodo (ya sea primitivo o anidado)
 * @param {HTMLElement} valueNode - El elemento DOM que contiene el valor.
 * @returns {*} El valor parseado.
 */
function parseValueNode(valueNode) {
    if (valueNode.matches('.json-node')) {
        // Es un contenedor anidado (objeto o array)
        const type = valueNode.dataset.type;

        if (type === 'array') {
            const arr = [];
            const nodes = valueNode.querySelectorAll(':scope > .json-node-wrapper');
            nodes.forEach(node => {
                const childValueNode = node.querySelector('[data-role="value"]');
                arr.push(parseValueNode(childValueNode));
            });
            return arr;

        } else if (type === 'object') {
            const obj = {};
            const nodes = valueNode.querySelectorAll(':scope > .json-node-wrapper');
            nodes.forEach(node => {
                const keyNode = node.querySelector('[data-role="key"]');
                const childValueNode = node.querySelector('[data-role="value"]');
                if (keyNode && childValueNode) {
                    // No incluir la clave especial del modal
                    if (keyNode.id === 'modal-item-key') return; 
                    
                    const key = keyNode.value;
                    obj[key] = parseValueNode(childValueNode);
                }
            });
            return obj;
        }
    }
    
    // Es un input primitivo
    const type = valueNode.dataset.type;
    if (type === 'boolean') {
        return valueNode.checked;
    }
    if (type === 'number') {
        return parseFloat(valueNode.value) || 0;
    }
    // String o textarea
    return valueNode.value;
}