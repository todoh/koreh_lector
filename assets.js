// --- assets.js ---
// Lógica para cargar, cachear y mostrar assets del juego.

// --- ¡NUEVAS IMPORTACIONES! ---
import { readFile } from './fsa.js';
import { init3DPreview } from './gallery_3d_preview.js';
import { getHandles } from './app_state.js'; // Necesario para acceder a los handles de SVG/3D
import * as DOM from './dom_elements.js'; // Necesario para los contenedores

// Almacenamiento caché para las las URLs de las imágenes y sus datos (File)
export const assetUrlCache = new Map();
export const assetFileCache = new Map(); // ¡NUEVO!

/**
 * Carga todas las imágenes de /assets y las cachea como Object URLs
 * @param {FileSystemDirectoryHandle} assetsDirHandle
 * @returns {Promise<Map<string, string>>} Un mapa de {filename: objectURL}
 */
export async function loadAndCacheAssetImages(assetsDirHandle) {
    // Limpiar cachés antiguos
    assetUrlCache.forEach(url => URL.revokeObjectURL(url));
    assetUrlCache.clear();
    assetFileCache.clear();
    
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp'];
    
    for await (const entry of assetsDirHandle.values()) {
        if (entry.kind === 'file' && imageExtensions.some(ext => entry.name.toLowerCase().endsWith(ext))) {
            try {
                const file = await entry.getFile();
                const url = URL.createObjectURL(file);
                // Cachear por nombre.png (mayúsculas y minúsculas)
                assetUrlCache.set(entry.name, url); // 'tree.png'
                assetFileCache.set(entry.name, file); // ¡NUEVO! Cachear el objeto File

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
                // No necesitamos cachear el File aquí, solo la URL de acceso rápido
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
    return assetUrlCache.get(key) || assetUrlCache.get(key.toUpperCase()) || assetUrlCache.get(key.toLowerCase()) || null;
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
* ¡MODIFICADO!
* Rellena la cuadrícula de assets en la parte inferior.
* @param {HTMLElement} $gridContainer
* @param {Function} onAssetClick - Callback a ejecutar al hacer clic en un item.
*/
export function populateAssetGrid($gridContainer, onAssetClick) {
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
        $wrapper.style.cursor = 'pointer'; // ¡NUEVO!

        $wrapper.innerHTML = `
            <img src="${url}" alt="${key}" class="asset-grid-image">
            <span class="asset-grid-label">${key}</span>
        `;
        
        // --- ¡NUEVO! Event listener ---
        $wrapper.addEventListener('click', () => {
            onAssetClick(key);
        });
        
        $gridContainer.appendChild($wrapper);
    }
}

// --- ¡NUEVAS FUNCIONES! ---

/**
 * Rellena la cuadrícula de assets SVG desde /SVG
 */
export async function populateSvgGrid() {
    const $gridContainer = DOM.$svgGridContainer;
    const handles = getHandles();
    if (!handles.svgDirHandle) {
        $gridContainer.innerHTML = '<p class="text-gray-500">No se encontró la carpeta /SVG.</p>';
        return;
    }

    $gridContainer.innerHTML = '';
    let count = 0;
    try {
        for await (const entry of handles.svgDirHandle.values()) {
            if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.svg')) {
                const file = await entry.getFile();
                const svgText = await file.text();
                // Usar un blob + URL.createObjectURL es más seguro que data:uri para SVGs
                const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
                const svgUrl = URL.createObjectURL(svgBlob);

                const $wrapper = document.createElement('div');
                $wrapper.className = 'svg-preview-card';
                $wrapper.innerHTML = `
                    <div class="svg-preview-wrapper">
                        <img src="${svgUrl}" alt="${entry.name}" style="width: 100%; height: 100%; object-fit: contain;">
                    </div>
                    <span class="svg-preview-label">${entry.name}</span>
                `;
                $gridContainer.appendChild($wrapper);
                
                // NOTA: Deberíamos revocar la URL del blob, pero lo dejamos por simplicidad
                // ya que solo se carga una vez.
                // URL.revokeObjectURL(svgUrl); 
                
                count++;
            }
        }
    } catch (e) {
        console.error("Error al leer /SVG:", e);
        $gridContainer.innerHTML = `<p class="text-red-400">Error al leer /SVG: ${e.message}</p>`;
    }

    if (count === 0 && !$gridContainer.innerHTML) {
        $gridContainer.innerHTML = '<p class="text-gray-500">No se encontraron archivos .svg en la carpeta /SVG.</p>';
    }
}

/**
 * Rellena la cuadrícula de assets 3D desde /assets/3d
 */
export async function populate3dGrid() {
    const $gridContainer = DOM.$3dGridContainer;
    const handles = getHandles();
    if (!handles.assets3dDirHandle) {
        $gridContainer.innerHTML = '<p class="text-gray-500">No se encontró la carpeta /assets/3d.</p>';
        return;
    }

    $gridContainer.innerHTML = '';
    let count = 0;
    const previewsToInit = [];

    try {
        for await (const entry of handles.assets3dDirHandle.values()) {
            // Solo buscar .json, ignorar .meta
            if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.json')) {
                const canvasId = `preview-3d-${entry.name.replace(/[^a-z0-9]/gi, '-')}`;
                const $wrapper = document.createElement('div');
                $wrapper.className = 'model-3d-preview-card';
                $wrapper.innerHTML = `
                    <canvas id="${canvasId}" class="model-3d-preview-canvas"></canvas>
                    <span class="model-3d-preview-label">${entry.name}</span>
                `;
                $gridContainer.appendChild($wrapper);
                const canvas = $wrapper.querySelector(`#${canvasId}`);
                previewsToInit.push({ canvas, handle: entry });
                count++;
            }
        }
    } catch (e) {
        console.error("Error al leer /assets/3d:", e);
        $gridContainer.innerHTML = `<p class="text-red-400">Error al leer /assets/3d: ${e.message}</p>`;
    }

    if (count === 0 && !$gridContainer.innerHTML) {
        $gridContainer.innerHTML = '<p class="text-gray-500">No se encontraron archivos .json en la carpeta /assets/3d.</p>';
    }

    // Inicializar los visores 3D uno por uno para no sobrecargar
    for (const { canvas, handle } of previewsToInit) {
        try {
            // Usamos requestAnimationFrame para asegurar que el canvas esté en el DOM
            await new Promise(resolve => requestAnimationFrame(resolve));
            await init3DPreview(canvas, handle);
        } catch (err) {
            console.error(`Error al inicializar preview 3D para ${handle.name}:`, err);
            // Mostrar un error en el canvas específico
            const errorDiv = document.createElement('div');
            errorDiv.className = 'model-3d-preview-canvas';
            errorDiv.innerHTML = 'Error al cargar';
            errorDiv.style.cssText = 'display: flex; align-items: center; justify-content: center; color: #ef4444; font-size: 10px; padding: 4px; text-align: center;';
            canvas.replaceWith(errorDiv);
        }
    }
}