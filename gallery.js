// --- gallery.js ---
// Lógica para construir la galería principal de tarjetas.

import { getCachedAssetUrl } from './assets.js';

/**
 * ¡MODIFICADO!
 * Construye la galería de tarjetas, ahora con imágenes.
 * @param {object} data - Los datos JSON cargados (o un array para crafting).
 * @param {HTMLElement} container - El contenedor de la galería.
 * @param {Function} onEditCallback - Callback al pulsar 'Editar'.
 * @param {'terrain' | 'entity' | 'biome' | 'items' | 'crafting'} galleryType - Para saber cómo buscar la imagen.
 * @param {object | null} [allItemsData=null] - (Opcional) El JSON de items.json, necesario para 'crafting'.
 */
export function buildGallery(data, container, onEditCallback, galleryType, allItemsData = null) {
    container.innerHTML = ''; // Limpiar
    
    let entries = [];
    
    if (Array.isArray(data)) {
        // --- ¡NUEVO! Caso para Crafting (Array de recetas) ---
        // La 'key' será el 'itemId' de la receta, o el índice si falta
        entries = data.map((definition, index) => {
            const key = definition.itemId || `receta_${index}`;
            return [key, definition];
        });
    } else if (typeof data === 'object' && data !== null) {
        // Caso para Terrain, Entity, Biome, Items (Objeto de objetos)
        entries = Object.entries(data).filter(([k, v]) => !k.startsWith('//')).sort(([a], [b]) => a.localeCompare(b));
    } else {
        container.innerHTML = '<p class="text-red-400">Error: El JSON debe ser un objeto de objetos o un array.</p>';
        return;
    }

    if (entries.length === 0) {
         container.innerHTML = '<p class="text-gray-500">No se encontraron items en esta sección.</p>';
         return;
    }
    
    for (const [key, definition] of entries) {
        
        // --- ¡LÓGICA DE IMAGEN MODIFICADA! ---
        let imageUrl = null;
        let displayName = definition.name || '(Sin nombre)';

        if (galleryType === 'terrain') {
            imageUrl = getCachedAssetUrl(key);
        } else if (galleryType === 'entity') {
            const renderComp = definition.components?.find(c => c.type === 'Renderable');
            if (renderComp && renderComp.args && renderComp.args[0]) {
                imageUrl = getCachedAssetUrl(renderComp.args[0]);
            }
        } else if (galleryType === 'items') {
            imageUrl = getCachedAssetUrl(definition.imageKey);
        } else if (galleryType === 'crafting') {
            // Para crafting, buscamos la imagen del 'itemId' resultante
            const itemDef = allItemsData ? allItemsData[definition.itemId] : null;
            if (itemDef) {
                imageUrl = getCachedAssetUrl(itemDef.imageKey);
                displayName = itemDef.name; // Usar el nombre del item
            }
        }
        // --- FIN DE LÓGICA DE IMAGEN ---

        container.appendChild(createGalleryCard(key, definition, imageUrl, onEditCallback, displayName));
    }
}

/**
 * ¡MODIFICADO!
 * Crea una tarjeta individual para la galería, ahora con imagen.
 * @param {string} key - La clave del objeto (o el itemId de la receta)
 * @param {object} definition - El objeto de definición
 * @param {string | null} imageUrl - La URL de la imagen
 * @param {Function} onEditCallback - Callback
 * @param {string | null} [displayName=null] - (Opcional) Nombre a mostrar en lugar de definition.name
 */
function createGalleryCard(key, definition, imageUrl, onEditCallback, displayName = null) {
    const $card = document.createElement('div');
    $card.className = 'gallery-card';
    
    const name = displayName || definition.name || '(Sin nombre)';
    const cardKey = key; // La clave/ID real

    const imageHtml = imageUrl 
        ? `<div class="gallery-card-image-wrapper"><img src="${imageUrl}" alt="${name}" class="gallery-card-image"></div>`
        : '<div class="gallery-card-image-wrapper-empty"><span>Sin Imagen</span></div>';

    $card.innerHTML = `
        ${imageHtml} 
        <div class="gallery-card-info">
            <div class="gallery-card-key">${cardKey}</div>
            <div class="gallery-card-name">${name}</div>
        </div>
    `;
    
    // --- ¡CAMBIO! ---
    // Ya no se crea un botón. La tarjeta entera es clickeable.
    $card.style.cursor = 'pointer';
    $card.addEventListener('click', (e) => {
        e.stopPropagation();
        // Pasamos la 'key' real (que puede ser 'itemId' o el índice)
        // y la definición completa.
        onEditCallback(key, definition);
    });
    
    return $card;
}