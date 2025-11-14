// --- ui.js ---
// Contiene la lógica para manejar la UI, como la galería, 
// el modal, y el editor de imágenes, ahora con File System Access API.

// --- ¡NUEVO! Definiciones de la UI para componentes ---
const COMPONENT_DEFINITIONS = {
    'Renderable': {
        emoji: '🖼️',
        name: 'Renderable',
        description: 'Hace que la entidad sea visible en el juego.',
        args: [
            { id: 'imageKey', label: 'Image Key', type: 'image_select' }
        ]
    },
    'Collision': {
        emoji: '🧱',
        name: 'Collision',
        description: 'Permite a la entidad bloquear el movimiento y ser sólida.',
        args: [
            { id: 'isSolid', label: 'Solid', type: 'boolean' },
            { id: 'collisionBox', label: 'Collision Box', type: 'collision_box' }
        ]
    },
    'InteractableResource': {
        emoji: '⛏️',
        name: 'Interactable Resource',
        description: 'El jugador puede interactuar para obtener un item.',
        args: [
            { id: 'itemId', label: 'Item ID', type: 'string' }, // Debería ser un item_select a futuro
            { id: 'quantity', label: 'Quantity', type: 'number' },
            { id: 'energyCost', label: 'Energy Cost', type: 'number' }
        ]
    },
    'InteractableDialogue': {
        emoji: '💬',
        name: 'Interactable Dialogue',
        description: 'Muestra un mensaje de diálogo al jugador.',
        args: [
            { id: 'message', label: 'Message', type: 'textarea' }
        ]
    },
    'InteractableMenu': {
        emoji: '📖',
        name: 'Interactable Menu',
        description: 'Abre una interfaz de menú (ej. CRAFTING).',
        args: [
            { id: 'menuId', label: 'Menu ID', type: 'string' }
        ]
    },
    'InteractableLevelChange': {
        emoji: '🪜',
        name: 'Interactable Level Change',
        description: 'Permite al jugador cambiar de nivel Z.',
        args: [
            { id: 'direction', label: 'Direction', type: 'select', options: ['up', 'down'] }
        ]
    },
    'InteractableVehicle': {
        emoji: '🔑',
        name: 'Interactable Vehicle',
        description: 'Permite al jugador montar este vehículo.',
        args: []
    },
    'Vehicle': {
        emoji: '🚗',
        name: 'Vehicle',
        description: 'Define las propiedades de un vehículo.',
        args: [
            { id: 'speed', label: 'Speed', type: 'number' }
        ]
    },
    'Collectible': {
        emoji: '🪙',
        name: 'Collectible',
        description: 'Se recoge automáticamente al caminar sobre él.',
        args: [
            { id: 'itemId', label: 'Item ID', type: 'string' },
            { id: 'quantity', label: 'Quantity', type: 'number' }
        ]
    },
    'Growth': {
        emoji: '🌱',
        name: 'Growth',
        description: 'Se transforma en otra entidad después de un tiempo.',
        args: [
            { id: 'timeToGrowMs', label: 'Time (ms)', type: 'number' },
            { id: 'nextEntityKey', label: 'Next Entity ID', type: 'string' } // Debería ser un entity_select
        ]
    },
    'MovementAI': {
        emoji: '🤖',
        name: 'Movement AI',
        description: 'Permite a la entidad moverse por su cuenta.',
        args: [
            { id: 'pattern', label: 'Pattern', type: 'select', options: ['WANDER'] },
            { id: 'speed', label: 'Speed', type: 'number' }
        ]
    },
    // Añadir más componentes aquí...
};


// Almacenamiento caché para las URLs de las imágenes
const assetUrlCache = new Map();
// ... (loadAndCacheAssetImages y getCachedAssetUrl sin cambios) ...

/**
 * Carga todas las imágenes de /assets y las cachea como Object URLs
 * @param {FileSystemDirectoryHandle} assetsDirHandle
 * @returns {Promise<Map<string, string>>} Un mapa de {filename: objectURL}
 */
export async function loadAndCacheAssetImages(assetsDirHandle) {
    assetUrlCache.clear();
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    
    for await (const entry of assetsDirHandle.values()) {
        if (entry.kind === 'file' && imageExtensions.some(ext => entry.name.toLowerCase().endsWith(ext))) {
            try {
                const file = await entry.getFile();
                const url = URL.createObjectURL(file);
                // Cachear por nombre.png (mayúsculas y minúsculas)
                assetUrlCache.set(entry.name.toUpperCase(), url); 
                assetUrlCache.set(entry.name, url); 
            } catch (e) {
                console.warn(`No se pudo cargar la imagen ${entry.name}: ${e.message}`);
            }
        }
    }
    
    // --- ¡NUEVO! Cachear por clave de entidad/terreno ---
    // Esto nos permite buscar 'TREE' y encontrar 'tree.png'
    const keysToMap = Array.from(assetUrlCache.keys());
    for (const key of keysToMap) {
        if (imageExtensions.some(ext => key.toLowerCase().endsWith(ext))) {
            const baseKey = key.split('.')[0].toUpperCase(); // 'tree.png' -> 'TREE'
            if (!assetUrlCache.has(baseKey)) {
                assetUrlCache.set(baseKey, assetUrlCache.get(key));
            }
        }
    }

    return assetUrlCache;
}

/**
 * Obtiene una URL de imagen cacheada.
 * @param {string} key - Puede ser 'TREE' o 'tree.png'
 * @returns {string | null}
 */
export function getCachedAssetUrl(key) {
    if (!key) return null;
    // Busca la clave tal cual (ej. 'tree.png') o en mayúsculas (ej. 'TREE')
    return assetUrlCache.get(key) || assetUrlCache.get(key.toUpperCase()) || null;
}


// --- NUEVAS FUNCIONES DE FILE SYSTEM ACCESS API ---
// ... (selectProjectRoot, readFile, saveJsonFile, listAssetImages, showStatus sin cambios) ...
export async function selectProjectRoot() {
    // Opciones para solicitar permisos de lectura y escritura
    const options = {
        mode: 'readwrite' 
    };
    // Pedir al usuario que seleccione un directorio
    const rootHandle = await window.showDirectoryPicker(options);

    // Verificar permisos (puede volver a pedir confirmación)
    if (await rootHandle.queryPermission(options) !== 'granted') {
         if (await rootHandle.requestPermission(options) !== 'granted') {
            throw new Error('Permiso denegado para acceder a la carpeta.');
         }
    }

    // Obtener manejadores para los archivos y carpetas necesarios
    try {
        const terrainHandle = await rootHandle.getFileHandle('terrain_definitions.json', { create: false });
        const entityHandle = await rootHandle.getFileHandle('entity_definitions.json', { create: false });
        const biomeHandle = await rootHandle.getFileHandle('biome_definitions.json', { create: false }); // ¡NUEVO!
        const assetsHandle = await rootHandle.getDirectoryHandle('assets', { create: false });

        return { rootHandle, terrainHandle, entityHandle, assetsHandle, biomeHandle }; // ¡NUEVO!
    } catch (err) {
        console.error("Error al obtener manejadores:", err);
        throw new Error(`No se pudo encontrar un archivo/carpeta esencial. ¿Estás seguro de que esta es la carpeta raíz del proyecto? (Falta: ${err.name} ${err.message})`);
    }
}

/**
 * Lee el contenido de un manejador de archivo como texto.
 * @param {FileSystemFileHandle} fileHandle
 * @returns {Promise<string>}
 */
export async function readFile(fileHandle) {
    const file = await fileHandle.getFile();
    return await file.text();
}

/**
 * Escribe un objeto JSON en un manejador de archivo.
 * @param {FileSystemFileHandle} fileHandle 
 * @param {object} dataObject 
 */
export async function saveJsonFile(fileHandle, dataObject) {
    const content = JSON.stringify(dataObject, null, 2);
    // Crear un stream de escritura
    const writable = await fileHandle.createWritable();
    // Escribir el contenido
    await writable.write(content);
    // Cerrar el archivo y guardar los cambios
    await writable.close();
}

/**
 * Rellena un <select> con los archivos de imagen de /assets.
 * @param {FileSystemDirectoryHandle} assetsDirHandle (¡Ya no se usa, pero se mantiene por firma)
 * @param {HTMLSelectElement} $selectElement 
 */
export async function listAssetImages(assetsDirHandle, $selectElement) {
    $selectElement.innerHTML = '<option value="">Selecciona una imagen de \'assets\'...</option>'; // Limpiar
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    
    // ¡MODIFICADO! Iterar sobre el caché
    for (const [key, url] of assetUrlCache.entries()) {
        // Solo añadir los que son nombres de archivo reales
        if (imageExtensions.some(ext => key.toLowerCase().endsWith(ext))) {
            const $option = document.createElement('option');
            $option.value = key;
            $option.textContent = key;
            $selectElement.appendChild($option);
        }
    }
}

/**
 * Muestra un mensaje de estado
 * @param {HTMLElement} $statusElement
 * @param {string} message
 * @param {'success' | 'error'} type
 */
export function showStatus($statusElement, message, type = 'success') {
    $statusElement.textContent = message;
    if (type === 'success') {
        $statusElement.classList.remove('text-red-500');
        $statusElement.classList.add('text-green-500');
    } else {
        $statusElement.classList.remove('text-green-500');
        $statusElement.classList.add('text-red-500');
    }
}

// --- FUNCIONES DE GALERÍA Y MODAL (MODIFICADAS) ---

/**
 * ¡MODIFICADO!
 * Construye la galería de tarjetas, ahora con imágenes.
 * @param {object} data - Los datos JSON cargados.
 * @param {HTMLElement} container - El contenedor de la galería.
 * @param {Function} onEditCallback - Callback al pulsar 'Editar'.
 * @param {'terrain' | 'entity'} galleryType - Para saber cómo buscar la imagen.
 */
export function buildGallery(data, container, onEditCallback, galleryType) {
    container.innerHTML = ''; // Limpiar
    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        // Excepción para Biome (que NO debería llamar a esta función)
        if (galleryType === 'terrain' || galleryType === 'entity') {
            container.innerHTML = '<p class="text-red-400">Error: El JSON debe ser un objeto de objetos (como entity_definitions.json).</p>';
        }
        return;
    }
    // Filtrar comentarios si existen
    const sortedKeys = Object.keys(data).filter(k => !k.startsWith('//')).sort();
    
    if (sortedKeys.length === 0) {
         container.innerHTML = '<p class="text-gray-500">No se encontraron items en este archivo.</p>';
         return;
    }
    
    for (const key of sortedKeys) {
        const definition = data[key];
        
        // --- ¡NUEVA LÓGICA DE IMAGEN! ---
        let imageUrl = null;
        if (galleryType === 'terrain') {
            // Para terreno, la clave principal es la clave de imagen
            imageUrl = getCachedAssetUrl(key);
        } else if (galleryType === 'entity') {
            // Para entidad, buscar componente Renderable
            const renderComp = definition.components?.find(c => c.type === 'Renderable');
            if (renderComp && renderComp.args && renderComp.args[0]) {
                imageUrl = getCachedAssetUrl(renderComp.args[0]);
            }
        }
        // --- FIN DE LÓGICA DE IMAGEN ---

        container.appendChild(createGalleryCard(key, definition, imageUrl, onEditCallback));
    }
}

/**
 * ¡MODIFICADO!
 * Crea una tarjeta individual para la galería, ahora con imagen.
 */
function createGalleryCard(key, definition, imageUrl, onEditCallback) {
    const $card = document.createElement('div');
    $card.className = 'gallery-card';
    
    const name = definition.name || '(Sin nombre)';

    // --- ¡NUEVO! Bloque de Imagen ---
    const imageHtml = imageUrl 
        ? `<div class="gallery-card-image-wrapper"><img src="${imageUrl}" alt="${name}" class="gallery-card-image"></div>`
        : '<div class="gallery-card-image-wrapper-empty"><span>Sin Imagen</span></div>';
    // --- FIN DE BLOQUE ---

    $card.innerHTML = `
        ${imageHtml} 
        <div class="gallery-card-info">
            <div class="gallery-card-key">${key}</div>
            <div class="gallery-card-name">${name}</div>
        </div>
    `;
    
    const $editBtn = document.createElement('button');
    $editBtn.type = 'button';
    $editBtn.textContent = 'Editar';
    $editBtn.className = 'gallery-card-btn';
    $editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        onEditCallback(key, definition);
    });
    
    $card.appendChild($editBtn);
    return $card;
}

/**
* Rellena la cuadrícula de assets en la parte inferior.
* @param {HTMLElement} $gridContainer
*/
export function populateAssetGrid($gridContainer) {
    $gridContainer.innerHTML = '';
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    
    // Ordenar alfabéticamente
    const sortedAssets = Array.from(assetUrlCache.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    for (const [key, url] of sortedAssets) {
        // Solo mostrar archivos de imagen reales
        if (!imageExtensions.some(ext => key.toLowerCase().endsWith(ext))) {
            continue;
        }

        const $wrapper = document.createElement('div');
        $wrapper.className = 'asset-grid-item';
        $wrapper.title = key; // Tooltip con el nombre

        $wrapper.innerHTML = `
            <img src="${url}" alt="${key}" class="asset-grid-image">
            <span class="asset-grid-label">${key}</span>
        `;
        $gridContainer.appendChild($wrapper);
    }
}


/**
 * ¡MODIFICADO!
 * Abre y puebla el modal de edición con la nueva UI amigable.
 * @param {string | null} key - La clave del item a editar, o null si es nuevo.
 * @param {object} definition - La definición del objeto.
 * @param {HTMLElement} $modalTitle - El elemento del título del modal.
 * @param {HTMLElement} $modalFormContent - El contenedor del formulario del modal.
 * @param {HTMLElement} $editorModal - El elemento del modal.
 * @param {'terrain' | 'entity'} galleryType - El tipo de editor a construir.
 */
export function openModal(key, definition, $modalTitle, $modalFormContent, $editorModal, galleryType) {
    // Esta función solo debe ser llamada para 'terrain' o 'entity'
    if (galleryType === 'biome') {
        console.error("openModal no debe usarse para biomas.");
        return;
    }
    
    $modalFormContent.innerHTML = ''; // Limpiar formulario

    let keyInputHtml;

    if (key) {
        // Editando item existente
        $modalTitle.textContent = `Editar "${key}"`;
        keyInputHtml = `
            <div class="editor-field">
                <label class="editor-field-label" for="modal-item-key">Clave (ID)</label>
                <input type="text" id="modal-item-key" value="${key}" disabled class="json-value bg-gray-600 text-gray-400 cursor-not-allowed">
            </div>
        `;
    } else {
        // Creando nuevo item
        $modalTitle.textContent = 'Añadir Nuevo Item';
        keyInputHtml = `
            <div class="editor-field">
                <label class="editor-field-label" for="modal-item-key">Clave (ID)</label>
                <input type="text" id="modal-item-key" value="NUEVA_CLAVE" class="json-value bg-yellow-200 text-black font-bold">
            </div>
        `;
    }
    
    $modalFormContent.insertAdjacentHTML('beforeend', keyInputHtml);

    // --- ¡NUEVA LÓGICA! Construir editor amigable ---
    buildFriendlyEditor(definition, $modalFormContent, galleryType);
    
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
 * Maneja la lógica de guardar desde el modal (solo actualiza el objeto en memoria).
 * @param {string} currentEditKey - La clave original del item.
 * @param {HTMLElement} $modalFormContent - El contenedor del formulario.
 * @param {object} loadedJsonData - El objeto JSON (ej. loadedTerrainData).
 * @param {'terrain' | 'entity'} galleryType - El tipo de editor a leer.
 */
export function handleModalSave(currentEditKey, $modalFormContent, loadedJsonData, galleryType) {
    // Esta función solo debe ser llamada para 'terrain' o 'entity'
    if (galleryType === 'biome') {
        console.error("handleModalSave no debe usarse para biomas.");
        return null;
    }
    
    const $keyInput = $modalFormContent.querySelector('#modal-item-key');
    const newKey = $keyInput.value.trim().toUpperCase(); // Forzar mayúsculas para claves
    if (!newKey) {
        alert("La Clave (ID) no puede estar vacía.");
        return null;
    }

    // --- ¡NUEVA LÓGICA! Reconstruir desde UI amigable ---
    const newDefinition = reconstructFriendlyJson($modalFormContent, galleryType);

    // Si la clave cambió (solo al crear uno nuevo)
    if (currentEditKey && currentEditKey !== newKey) {
        delete loadedJsonData[currentEditKey]; // Borrar la antigua
    }
    
    loadedJsonData[newKey] = newDefinition; // Añadir/actualizar la nueva

    return { newKey, newDefinition, oldKey: currentEditKey };
}


// --- LÓGICA DEL EDITOR DE IMÁGENES (Sin cambios) ---
export function loadImageFromFile(assetsDirHandle, filename, $previewImg, $widthInput, $heightInput, $filenameInput, $imageEditorContainer) {
    return new Promise(async (resolve, reject) => {
        let file;
        try {
            const fileHandle = await assetsDirHandle.getFileHandle(filename);
            file = await fileHandle.getFile();
        } catch (err) {
            reject(new Error(`No se pudo leer el archivo ${filename} desde /assets.`));
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const originalImage = new Image();
            originalImage.onload = () => {
                $previewImg.src = originalImage.src;
                $widthInput.value = originalImage.naturalWidth;
                $heightInput.value = originalImage.naturalHeight;
                $filenameInput.value = file.name;
                $imageEditorContainer.classList.remove('hidden');
                resolve(originalImage);
            };
            originalImage.onerror = () => reject(new Error("No se pudo cargar la imagen."));
            originalImage.src = event.target.result;
        };
        reader.onerror = () => reject(new Error("Error al leer el archivo."));
        reader.readAsDataURL(file);
    });
}
export async function saveImageFile(assetsDirHandle, originalImage, $canvas, $widthInput, $heightInput, $filenameInput) {
    if (!originalImage) {
        throw new Error("No hay imagen original cargada.");
    }

    const width = parseInt($widthInput.value, 10);
    const height = parseInt($heightInput.value, 10);
    let filename = $filenameInput.value.trim();

    if (!width || !height || width <= 0 || height <= 0) {
        throw new Error("Por favor, introduce un ancho y alto válidos.");
    }
    if (!filename) {
        throw new Error("Por favor, introduce un nombre de archivo.");
    }
    if (!filename.match(/\.(png|jpg|jpeg|webp)$/i)) {
        filename += '.png'; // Añadir extensión .png por defecto
    }

    // Dibujar en el canvas
    $canvas.width = width;
    $canvas.height = height;
    const ctx = $canvas.getContext('2d');
    ctx.drawImage(originalImage, 0, 0, width, height);

    // Obtener Blob del canvas (PNG)
    const blob = await new Promise(resolve => $canvas.toBlob(resolve, 'image/png'));

    // Escribir el archivo en la carpeta /assets
    try {
        const fileHandle = await assetsDirHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return filename; // Devuelve el nombre del archivo guardado
    } catch (err) {
        console.error("Error al escribir el archivo de imagen:", err);
        throw new Error(`No se pudo guardar la imagen: ${err.message}`);
    }
}


// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// --- ¡NUEVAS FUNCIONES INTERNAS PARA EL EDITOR AMIGABLE! ---
// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

/**
 * Construye el editor amigable (Friendly Editor) dentro del modal.
 * @param {object} definition - El objeto de definición (terreno o entidad).
 * @param {HTMLElement} container - El modal-form-content.
 * @param {'terrain' | 'entity'} galleryType - El tipo de editor.
 */
function buildFriendlyEditor(definition, container, galleryType) {
    if (galleryType === 'terrain') {
        // --- Editor de Terreno ---
        container.appendChild(createEditorField(
            { id: 'name', label: 'Name', type: 'string' },
            definition.name
        ));
        container.appendChild(createEditorField(
            { id: 'solid', label: 'Solid', type: 'boolean' },
            definition.solid
        ));
        // ... (añadir más campos de terreno si es necesario, ej. 'key')
         container.appendChild(createEditorField(
            { id: 'key', label: 'Key (legacy)', type: 'string' },
            definition.key
        ));

    } else if (galleryType === 'entity') {
        // --- Editor de Entidad ---
        container.appendChild(createEditorField(
            { id: 'name', label: 'Name', type: 'string' },
            definition.name
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
        
        // --- Botón de Añadir Componente ---
        $componentsWrapper.appendChild(createAddComponentButton());
        
        container.appendChild($componentsWrapper);
    }
}

/**
 * Crea la tarjeta visual para un solo componente.
 * @param {object} componentData - ej. { type: "Collision", args: [true, {...}] }
 * @returns {HTMLElement}
 */
function buildComponentCard(componentData) {
    const compDef = COMPONENT_DEFINITIONS[componentData.type] || {
        emoji: '❓',
        name: componentData.type,
        description: 'Componente desconocido. Editar con precaución.',
        args: []
    };

    const $card = document.createElement('div');
    $card.className = 'component-card';
    $card.dataset.componentType = componentData.type; // Guardar el tipo

    // Header
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
    $header.appendChild($delBtn);
    
    // Body (Argumentos)
    const $body = document.createElement('div');
    $body.className = 'component-card-body';
    
    if (compDef.args.length > 0) {
        compDef.args.forEach((argDef, index) => {
            const argValue = (componentData.args && componentData.args.length > index) ? componentData.args[index] : null;
            $body.appendChild(createEditorField(argDef, argValue));
        });
    } else if (compDef.name !== componentData.type) {
         // Componente conocido pero sin args (ej. InteractableVehicle)
         $body.innerHTML = `<p class="text-sm text-gray-500 italic">Este componente no requiere configuración.</p>`;
    } else {
        // Componente desconocido
        $body.innerHTML = `<p class="text-sm text-yellow-400">Editando 'args' como JSON crudo:</p>`;
        $body.appendChild(createEditorField({ id: 'args', label: 'Args (JSON)', type: 'textarea' }, JSON.stringify(componentData.args || [])));
    }

    $card.appendChild($header);
    $card.appendChild($body);
    return $card;
}

/**
 * Crea el DOM para un solo campo de editor (ej. un input de string, un checkbox, etc.)
 * @param {object} argDef - La definición del campo, ej. { id: 'name', label: 'Name', type: 'string' }
 * @param {*} value - El valor actual para ese campo.
 * @returns {HTMLElement}
 */
function createEditorField(argDef, value) {
    const $field = document.createElement('div');
    $field.className = 'editor-field';
    // Guardar ID para reconstrucción
    $field.dataset.fieldId = argDef.id;
    $field.dataset.fieldType = argDef.type; 

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
            argDef.options.forEach(opt => {
                $input.innerHTML += `<option value="${opt}">${opt}</option>`;
            });
            $input.value = value;
            $field.appendChild($label);
            $field.appendChild($input);
            break;

        case 'image_select':
            $input = document.createElement('select');
            $input.id = `field-${argDef.id}`;
            $input.className = 'json-value';
            // Poblar con imágenes cacheadas
            $input.innerHTML = '<option value="">(Ninguna)</option>';
            
            // Crear un Set para claves únicas (ej. 'TREE')
            const uniqueKeys = new Set();
            assetUrlCache.forEach((url, key) => {
                 // Solo mostrar claves base (ej. 'TREE') o pngs
                if (key.endsWith('.png') || key === key.toUpperCase()) {
                     const cleanKey = key.split('.')[0].toUpperCase();
                     uniqueKeys.add(cleanKey);
                }
            });
            
            // Ordenar y añadir al select
            Array.from(uniqueKeys).sort().forEach(cleanKey => {
                 $input.innerHTML += `<option value="${cleanKey}">${cleanKey}</option>`;
            });

            $input.value = value;
            $field.appendChild($label);
            $field.appendChild($input);
            break;
            
        case 'collision_box':
            // Este es un tipo complejo, creamos un sub-editor
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
 * Crea el sub-editor para un 'collision_box'.
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
 * Crea el botón y el <select> para añadir un nuevo componente.
 * @returns {HTMLElement}
 */
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
        // Crear data de componente por defecto
        const newComponentData = {
            type: type,
            args: compDef.args.map(argDef => {
                // Valor por defecto basado en el tipo
                switch (argDef.type) {
                    case 'boolean': return false;
                    case 'number': return 0;
                    case 'collision_box': return { width: 40, height: 20, offsetY: 20 };
                    case 'select': return argDef.options[0];
                    default: return "";
                }
            })
        };
        
        // Añadir la nueva tarjeta al DOM
        document.getElementById('components-list').appendChild(buildComponentCard(newComponentData));
        $select.value = ""; // Resetear select
    });
    
    $wrapper.appendChild($select);
    $wrapper.appendChild($addBtn);
    return $wrapper;
}

/**
 * Helper para crear botones (copiado de jsoneditor.js ya que no lo importamos)
 */
function createButton(text, className, onClick) {
    const $btn = document.createElement('button');
    $btn.type = 'button';
    $btn.textContent = text;
    $btn.className = `json-btn ${className}`;
    $btn.addEventListener('click', onClick);
    return $btn;
}


// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// --- ¡NUEVAS FUNCIONES INTERNAS PARA RECONSTRUIR EL JSON! ---
// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

/**
 * Reconstruye el objeto de definición desde el editor amigable.
 * @param {HTMLElement} container - El modal-form-content.
 * @param {'terrain' | 'entity'} galleryType - El tipo de editor a leer.
 * @returns {object} El objeto de definición reconstruido.
 */
function reconstructFriendlyJson(container, galleryType) {
    const definition = {};

    if (galleryType === 'terrain') {
        // --- Reconstruir Terreno ---
        definition.name = readEditorField(container.querySelector('[data-field-id="name"]'));
        definition.solid = readEditorField(container.querySelector('[data-field-id="solid"]'));
        definition.key = readEditorField(container.querySelector('[data-field-id="key"]'));

    } else if (galleryType === 'entity') {
        // --- Reconstruir Entidad ---
        definition.name = readEditorField(container.querySelector('[data-field-id="name"]'));
        
        definition.components = [];
        const $componentCards = container.querySelectorAll('.component-card');
        
        $componentCards.forEach($card => {
            const type = $card.dataset.componentType;
            const compDef = COMPONENT_DEFINITIONS[type] || { args: [] };
            
            const newComponentData = {
                type: type,
                args: []
            };

            if (compDef.args.length > 0) {
                // Componente conocido con args
                compDef.args.forEach(argDef => {
                    const $field = $card.querySelector(`[data-field-id="${argDef.id}"]`);
                    newComponentData.args.push(readEditorField($field));
                });
            } else if (compDef.name !== type) {
                // Componente desconocido
                const $field = $card.querySelector(`[data-field-id="args"]`);
                try {
                    // Intentar parsear como JSON, si falla, guardar como string
                    newComponentData.args = JSON.parse(readEditorField($field));
                } catch (e) {
                     newComponentData.args = [readEditorField($field)]; // Fallback a array con string
                }
            }
            // (Si es conocido y sin args, args: [] ya es correcto)
            
            definition.components.push(newComponentData);
        });
    }
    
    return definition;
}

/**
 * Lee el valor de un solo campo del editor.
 * @param {HTMLElement} $field - El div.editor-field
 * @returns {*} El valor leído.
 */
function readEditorField($field) {
    if (!$field) return null;
    
    const type = $field.dataset.fieldType;
    const $input = $field.querySelector('input, select, textarea');
    
    switch (type) {
        case 'boolean':
            return $input.checked;
        case 'number':
            return parseFloat($input.value) || 0;
        case 'collision_box':
            // Es un contenedor, leer sub-campos
            const w = readEditorField($field.querySelector('[data-field-id="width"]'));
            const h = readEditorField($field.querySelector('[data-field-id="height"]'));
            const o = readEditorField($field.querySelector('[data-field-id="offsetY"]'));
            return { width: w, height: h, offsetY: o };
        case 'string':
        case 'textarea':
        case 'select':
        case 'image_select':
        default:
            return $input.value;
    }
}