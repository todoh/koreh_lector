// --- ia_generator_ui.js ---
// Construye la UI y maneja la lógica de la pestaña "Generación IA".
// ¡MODIFICADO! Implementa una "Cola de Generación" real que no bloquea la UI.
// ¡MODIFICADO! onSaveApiKey ahora acepta listas separadas por comas.

import * as ApiSistema from './apisistema.js';
import { generarImagenRealistaDesdePrompt } from './generadorrealista.js';
import { generarTexturaDesdePrompt } from './ia_texture_generator.js';
import { generarDefinicion } from './ia_definition_generator.js';
import * as IaAssetSaver from './ia_asset_saver.js';

let $container;
let $apiKeyInput;
let $apiKeyList;
let $apiKeySaveBtn;
let $promptInput;
let $genTypeTerrain;
let $genTypeEntity;
let $genTypeItem;
let $generateBtn;
// ¡MODIFICADO! El loader principal ya no se usa para bloquear
// let $previewLoader; 
// let $previewLoaderText;
let $queueContainer;
let $queuePlaceholder;

let allHandles = {};
let onAssetSavedCallback = () => {};
// ¡MODIFICADO! La cola ahora almacena "trabajos" (jobs) con estado
let generationQueue = []; // Esta es la cola de trabajos

/**
 * Construye la UI del generador de IA y la inyecta en el contenedor.
 * @param {HTMLElement} container - El div#ia-generator-container.
 * @param {object} handles - Todos los manejadores de archivos (assets, terrain, etc.)
 * @param {Function} onSavedCallback - Callback a ejecutar cuando se guarda un asset.
 */
export function buildIaGeneratorUI(container, handles, onSavedCallback) {
    $container = container;
    allHandles = handles;
    onAssetSavedCallback = onSavedCallback;

    $container.innerHTML = `
        <div class="space-y-6">
            <div>
                <h3 class="text-lg font-semibold text-gray-300 mb-2">API Keys de Gemini</h3>
                <div class="ia-api-key-wrapper">
                    <input type="password" id="ia-api-key-input" placeholder="Pega tu API key aquí (o varias separadas por coma)..." class="json-value">
                    <button type="button" id="ia-api-key-save-btn" class="json-editor-btn bg-blue-600 hover:bg-blue-700">Añadir</button>
                </div>
                <div id="ia-api-key-list" class="mt-2 space-y-1"></div>
                <p class="text-xs text-gray-500 mt-1">Las keys se guardan localmente en tu navegador. Se rotarán automáticamente si una excede la cuota.</p>
            </div>

            <div class="pt-6 border-t border-gray-700 space-y-4">
                <h3 class="text-lg font-semibold text-gray-300">Generar Nuevo Asset</h3>
                
                <div class="editor-field">
                    <label class="editor-field-label">1. Elige el tipo de asset</label>
                    <div class="ia-radio-group">
                        <input type="radio" id="gen-type-terrain" name="gen-type" value="terrain" class="ia-radio-input" checked>
                        <label for="gen-type-terrain" class="ia-radio-label">
                            <span class="text-xl">🟫</span>
                            <div>Terreno (Textura 512x512)</div>
                        </label>
                        
                        <input type="radio" id="gen-type-entity" name="gen-type" value="entity" class="ia-radio-input">
                        <label for="gen-type-entity" class="ia-radio-label">
                            <span class="text-xl">🧍</span>
                            <div>Entidad (Elemento 3D/Sprite)</div>
                        </label>

                        <input type="radio" id="gen-type-item" name="gen-type" value="item" class="ia-radio-input">
                        <label for="gen-type-item" class="ia-radio-label">
                            <span class="text-xl">📦</span>
                            <div>Item / Objeto (Icono/Sprite)</div>
                        </label>
                    </div>
                </div>

                <div class="editor-field">
                    <label class="editor-field-label" for="ia-prompt-input">2. Describe lo que quieres crear</label>
                    <textarea id="ia-prompt-input" rows="3" class="json-value" placeholder="Ej: Un árbol de roble que da madera y bloquea el paso."></textarea>
                    <p class="text-xs text-gray-500 mt-1">La IA inferirá las propiedades (solidez, componentes, etc.) desde este prompt.</p>
                </div>

                <button type="button" id="ia-generate-btn" class="json-editor-btn w-full bg-green-600 hover:bg-green-700 text-lg">
                    ⚡ Generar y Añadir a la Cola
                </button>

                <div class="pt-6 border-t border-gray-700">
                    <h3 class="text-lg font-semibold text-gray-300 mb-2">Cola de Generación (Más nuevo primero)</h3>
                    <div id="ia-generation-queue" class="space-y-4">
                        <div id="ia-queue-placeholder" class="ia-preview-placeholder">
                            <span class="text-4xl">✨</span>
                            <p>Los assets generados aparecerán aquí.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Cachear elementos del DOM
    $apiKeyInput = $container.querySelector('#ia-api-key-input');
    $apiKeyList = $container.querySelector('#ia-api-key-list');
    $apiKeySaveBtn = $container.querySelector('#ia-api-key-save-btn');
    $promptInput = $container.querySelector('#ia-prompt-input');
    $genTypeTerrain = $container.querySelector('#gen-type-terrain');
    $genTypeEntity = $container.querySelector('#gen-type-entity');
    $genTypeItem = $container.querySelector('#gen-type-item');
    $generateBtn = $container.querySelector('#ia-generate-btn');
    
    // (Eliminados $previewLoader y $previewLoaderText)

    $queueContainer = $container.querySelector('#ia-generation-queue');
    $queuePlaceholder = $container.querySelector('#ia-queue-placeholder'); 
    
    // Añadir Listeners
    $apiKeySaveBtn.addEventListener('click', onSaveApiKey);
    $generateBtn.addEventListener('click', onGenerate); // Esta función ya no es async
    
    $promptInput.addEventListener('input', () => {
        // Ya no se auto-sugiere la key
    });

    // Cargar y mostrar keys existentes
    refreshApiKeyList();
}

/**
 * Actualiza la lista de API keys guardadas en la UI. (Sin cambios)
 */
function refreshApiKeyList() {
    const keys = ApiSistema.getAllKeys();
    $apiKeyList.innerHTML = '';
    if (keys.length === 0) {
        $apiKeyList.innerHTML = '<p class="text-xs text-yellow-400">No hay API keys guardadas.</p>';
    } else {
        keys.forEach(key => {
            const $keyItem = document.createElement('div');
            $keyItem.className = 'flex justify-between items-center bg-gray-700 px-2 py-1 rounded';
            $keyItem.innerHTML = `<span class="font-mono text-xs text-gray-400">${key.substring(0, 4)}...${key.substring(key.length - 4)}</span>`;
            
            const $delBtn = document.createElement('button');
            $delBtn.textContent = '×';
            $delBtn.className = 'json-btn json-btn-del w-4 h-4 text-xs';
            $delBtn.onclick = () => {
                ApiSistema.removeApiKey(key);
                refreshApiKeyList();
            };
            $keyItem.appendChild($delBtn);
            $apiKeyList.appendChild($keyItem);
        });
    }
}

/**
 * ¡MODIFICADO!
 * Maneja el clic en "Añadir" key.
 * Ahora divide el string por comas.
 */
function onSaveApiKey() {
    const inputValue = $apiKeyInput.value.trim();
    if (!inputValue) return; // No hacer nada si está vacío

    // Dividir el string por comas
    const potentialKeys = inputValue.split(',');
    let keysAddedCount = 0;

    for (const potentialKey of potentialKeys) {
        const key = potentialKey.trim(); // Limpiar espacios en blanco
        if (key) {
            // addApiKey (de apisistema.js) ya se encarga de evitar duplicados
            ApiSistema.addApiKey(key);
            keysAddedCount++;
        }
    }

    if (keysAddedCount > 0) {
        $apiKeyInput.value = ''; // Limpiar el input solo si se añadió algo
        refreshApiKeyList(); // Actualizar la lista
    }
}

/**
 * ¡REESCRITO! Maneja el clic en "Generar".
 * Ahora es una función RÁPIDA que añade un "trabajo" a la cola
 * y llama a un worker asíncrono.
 */
function onGenerate() {
    const promptValue = $promptInput.value.trim();
    let type = 'terrain'; // Default
    if ($genTypeEntity.checked) type = 'entity';
    if ($genTypeItem.checked) type = 'item';

    if (!promptValue) {
        alert("Por favor, introduce una descripción (prompt).");
        return;
    }
    if (ApiSistema.hasApiKeys() === 0) {
        alert("Por favor, añade al menos una API key de Gemini.");
        return;
    }

    // ¡Acción inmediata!
    $promptInput.value = ''; // Limpiar para el siguiente prompt

    // 1. Crear el objeto de "trabajo" (job)
    const job = {
        id: 'job-' + Date.now() + Math.random().toString(36).substring(2, 9),
        prompt: promptValue,
        type: type,
        status: 'pending', // 'pending', 'completed', 'failed'
        data: null,      // Almacenará { type, base64Data, prompt, definition }
        error: null      // Almacenará el mensaje de error
    };

    // 2. Añadirlo a la cola
    generationQueue.unshift(job);
    
    // 3. Refrescar la UI (mostrará el placeholder con spinner)
    refreshGenerationQueueUI();

    // 4. Iniciar el trabajo en segundo plano (¡sin await!)
    processGenerationJob(job);
}

/**
 * (¡NUEVA FUNCIÓN!)
 * El "worker" que realiza la generación asíncrona.
 * Actualiza el objeto "job" y refresca la UI al terminar.
 * @param {object} job - El objeto de trabajo de la cola.
 */
async function processGenerationJob(job) {
    try {
        // --- PASO 1: Generar Definición JSON ---
        const $jobCard = document.getElementById(job.id);
        const $statusText = $jobCard?.querySelector('.ia-queue-card-status-text');
        if ($statusText) $statusText.textContent = 'Paso 1/2: Generando definición...';

        const definition = await generarDefinicion(job.prompt, job.type);
        if (!definition || !definition.key) {
            throw new Error("La IA no devolvió una definición o 'key' válida.");
        }
        
        // --- PASO 2: Generar Imagen ---
        if ($statusText) $statusText.textContent = 'Paso 2/2: Generando imagen...';
        
        let base64Data;
        const imagePrompt = `${definition.name}, ${job.type === 'terrain' ? 'textura seamless' : 'sprite 2D fondo transparente'}`;

        if (job.type === 'terrain') {
            base64Data = await generarTexturaDesdePrompt(imagePrompt);
        } else { // 'entity' o 'item'
            base64Data = await generarImagenRealistaDesdePrompt(imagePrompt);
        }

        // --- ÉXITO ---
        job.status = 'completed';
        job.data = { type: job.type, base64Data, prompt: job.prompt, definition };

    } catch (err) {
        console.error("Error en la generación IA (worker):", err);
        // --- FALLO ---
        job.status = 'failed';
        job.error = err.message;
    } finally {
        // --- ACTUALIZAR UI ---
        // Refrescar toda la cola. Esto reemplazará el placeholder
        // con la tarjeta de "completado" o "fallido".
        refreshGenerationQueueUI();
    }
}


/**
 * Borra y reconstruye la UI de la cola de generación
 * basado en el array `generationQueue`.
 */
function refreshGenerationQueueUI() {
    if (!$queueContainer) return;

    if (generationQueue.length === 0) {
        $queueContainer.innerHTML = `
            <div id="ia-queue-placeholder" class="ia-preview-placeholder">
                <span class="text-4xl">✨</span>
                <p>Los assets generados aparecerán aquí.</p>
            </div>`;
        $queuePlaceholder = $container.querySelector('#ia-queue-placeholder');
        return;
    }

    $queueContainer.innerHTML = ''; // Limpiar
    generationQueue.forEach((job, index) => {
        // Pasamos el índice para poder eliminarlo
        const $card = createQueueCard(job, index); 
        $queueContainer.appendChild($card);
    });
}

/**
 * (¡MODIFICADO!)
 * Crea el HTML para una tarjeta individual en la cola,
 * AHORA basado en el estado del "job".
 * @param {object} job - El objeto de trabajo.
 * @param {number} index - El índice del item en el array `generationQueue`.
 * @returns {HTMLElement}
 */
function createQueueCard(job, index) {
    const $card = document.createElement('div');
    // Asignar ID para que el worker pueda encontrarlo
    $card.id = job.id; 
    
    // Usamos el prompt original como tooltip
    const safePrompt = job.prompt.replace(/"/g, '&quot;');
    const discardButtonHtml = `<button type="button" class="json-editor-btn bg-red-600 hover:bg-red-700" data-action="discard">Descartar</button>`;

    switch (job.status) {
        case 'pending':
            $card.className = 'ia-queue-card ia-queue-card-pending';
            $card.innerHTML = `
                <div class="ia-queue-card-preview">
                    <div class="ia-loader-spinner-small"></div>
                </div>
                <div class="ia-queue-card-info">
                    <div class="ia-queue-card-name">Generando...</div>
                    <p class="ia-queue-card-status-text" title="${safePrompt}">Paso 1/2: Iniciando...</p>
                </div>
                <div class="ia-queue-card-actions">
                    ${discardButtonHtml}
                </div>
            `;
            break;
        
        case 'failed':
            $card.className = 'ia-queue-card ia-queue-card-failed';
            $card.innerHTML = `
                <div class="ia-queue-card-preview">
                    <span class="text-4xl">❌</span>
                </div>
                <div class="ia-queue-card-info">
                    <div class="ia-queue-card-name">Error al generar</div>
                    <p class="ia-queue-card-error" title="${job.error}">${job.error}</p>
                </div>
                <div class="ia-queue-card-actions">
                    ${discardButtonHtml}
                </div>
            `;
            break;
        
        case 'completed':
        default:
            const item = job.data; // El objeto de datos final
            $card.className = 'ia-queue-card';
            $card.innerHTML = `
                <div class="ia-queue-card-preview ${item.type === 'terrain' ? 'ia-preview-img-texture' : ''}">
                    <img src="${item.base64Data}" alt="${item.definition.name}">
                </div>
                <div class="ia-queue-card-info">
                    <div class="ia-queue-card-name">${item.definition.name}</div>
                    <div class="ia-queue-card-key">${item.definition.key}</div>
                    <p class="ia-queue-card-prompt" title="${safePrompt}">${item.prompt}</p>
                </div>
                <div class="ia-queue-card-actions">
                    <button type="button" class="json-editor-btn bg-green-600 hover:bg-green-700" data-action="save">Guardar</button>
                    ${discardButtonHtml}
                </div>
            `;
            
            // Listener de Guardar (solo existe en 'completed')
            const $saveButton = $card.querySelector('[data-action="save"]');
            $saveButton.addEventListener('click', () => {
                onSaveQueueItem(item, $saveButton, job); // Pasamos el 'job' para poder quitarlo
            });
            break;
    }

    // Listener de Descartar (común a todos los estados)
    $card.querySelector('[data-action="discard"]').addEventListener('click', () => {
        generationQueue.splice(index, 1); // Eliminar este item del array
        refreshGenerationQueueUI(); // Refrescar la lista
    });

    return $card;
}

/**
 * (¡MODIFICADO!)
 * Maneja el clic en "Guardar" para un item específico de la cola.
 * Ahora también recibe el "job" para poder eliminarlo de la cola.
 * @param {object} item - El item a guardar (job.data).
 * @param {HTMLElement} $saveButton - El botón que fue presionado.
 * @param {object} job - El "job" padre, para eliminarlo de la cola.
 */
async function onSaveQueueItem(item, $saveButton, job) {
    const { type, base64Data, definition } = item;
    const keyName = definition.key;
    
    if (!keyName) {
        alert("Error: La definición generada no tiene KEY.");
        return;
    }

    $saveButton.disabled = true;
    $saveButton.textContent = 'Guardando...';

    try {
        let newDefinition = {};

        if (type === 'terrain') {
            newDefinition = await IaAssetSaver.saveGeneratedTerrain(base64Data, definition, allHandles);
        } else if (type === 'entity') {
            newDefinition = await IaAssetSaver.saveGeneratedEntity(base64Data, definition, allHandles);
        } else if (type === 'item') {
            newDefinition = await IaAssetSaver.saveGeneratedItem(base64Data, definition, allHandles);
        }

       // alert(`¡Éxito! Se ha guardado "${keyName}" y actualizado el .json correspondiente.`);

        // ¡Éxito! Quitar de la cola
        const itemIndex = generationQueue.indexOf(job); // Encontrar el índice del job
        if (itemIndex > -1) {
            generationQueue.splice(itemIndex, 1);
        }
        refreshGenerationQueueUI(); // Refrescar la lista

        // Ejecutar el callback para refrescar las galerías en main.js
        onAssetSavedCallback(type);

    } catch (err) {
        console.error("Error al guardar el asset IA:", err);
        alert(`Error al guardar: ${err.message}`);
        // Rehabilitar botón si falla
        $saveButton.disabled = false;
        $saveButton.textContent = 'Guardar';
    }
}