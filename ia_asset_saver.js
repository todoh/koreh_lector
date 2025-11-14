// --- ia_asset_saver.js ---
// Lógica para guardar la imagen generada en /assets y actualizar
// los archivos .json correspondientes.
// ¡MODIFICADO! Ahora acepta un objeto de definición completo generado por la IA.
// ¡MODIFICADO! Se fuerza el "key" a MAYÚSCULAS y el "filename" a minúsculas.

import { readFile, saveJsonFile } from './fsa.js';

/**
 * Convierte una data URL (base64) a un Blob.
 * @param {string} base64Data - La data URL (ej: "data:image/png;base64,...")
 * @returns {Blob}
 */
async function base64ToBlob(base64Data) {
    const response = await fetch(base64Data);
    const blob = await response.blob();
    return blob;
}

/**
 * Guarda un Blob como un archivo en el directorio de assets.
 * @param {Blob} blob - El blob de la imagen.
 * @param {string} filename - El nombre del archivo (ej: "lava_rock.png").
 * @param {FileSystemDirectoryHandle} assetsDirHandle - Manejador de /assets.
 * @returns {Promise<FileSystemFileHandle>}
 */
async function saveBlobToAssets(blob, filename, assetsDirHandle) {
    try {
        // ¡MODIFICADO! Forzar nombre de archivo a minúsculas
        const finalFilename = filename.toLowerCase();
        const fileHandle = await assetsDirHandle.getFileHandle(finalFilename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        console.log(`Imagen guardada en /assets/${finalFilename}`);
        return fileHandle;
    } catch (err) {
        console.error(`Error al guardar ${filename}: ${err.message}`);
        throw new Error(`No se pudo guardar la imagen en /assets: ${err.message}`);
    }
}

/**
 * ¡MODIFICADO! Guarda un terreno generado.
 * Acepta la definición JSON completa de la IA.
 * @param {string} base64Data - Data URL de la imagen.
 * @param {object} definition - La definición de terreno generada por la IA (incluye key, name, solid).
 * @param {object} handles - Todos los manejadores de archivos.
 * @returns {Promise<object>} La nueva definición de terreno.
 */
export async function saveGeneratedTerrain(base64Data, definition, handles) {
    if (!handles.assetsDirHandle || !handles.terrainFileHandle) {
        throw new Error("Faltan los manejadores de assets o terrain.");
    }
    if (!definition || !definition.key) {
        throw new Error("Definición de terreno inválida generada por la IA.");
    }

    // --- ¡MODIFICACIÓN CLAVE! ---
    // Forzar la clave a MAYÚSCULAS (estándar lógico)
    const keyName = definition.key.toUpperCase();
    definition.key = keyName; // Asegurarse de que el objeto guardado también la tenga
    // Forzar el nombre de archivo a minúsculas (estándar de archivo)
    const filename = `${keyName.toLowerCase()}.png`;
    // --- FIN DE MODIFICACIÓN ---

    const blob = await base64ToBlob(base64Data);
    
    // 1. Guardar imagen (la función interna ya maneja minúsculas)
    await saveBlobToAssets(blob, filename, handles.assetsDirHandle);

    // 2. Actualizar JSON
    const terrainData = JSON.parse(await readFile(handles.terrainFileHandle));
    
    if (terrainData[keyName]) {
        console.warn(`La clave "${keyName}" (MAYÚSCULAS) ya existe en terrain_definitions.json. Se sobrescribirá.`);
    }

    // Usar la definición completa generada por la IA (con la key ya en mayúsculas)
    terrainData[keyName] = definition;

    await saveJsonFile(handles.terrainFileHandle, terrainData);
    console.log(`terrain_definitions.json actualizado con "${keyName}".`);

    return definition;
}

/**
 * ¡MODIFICADO! Guarda una entidad generada.
 * Acepta la definición JSON completa de la IA.
 * @param {string} base64Data - Data URL de la imagen.
 * @param {object} definition - La definición de entidad generada por la IA (incluye key, name, renderMode, components).
 * @param {object} handles - Todos los manejadores de archivos.
 * @returns {Promise<object>} La nueva definición de entidad.
 */
export async function saveGeneratedEntity(base64Data, definition, handles) {
    if (!handles.assetsDirHandle || !handles.entityFileHandle) {
        throw new Error("Faltan los manejadores de assets o entity.");
    }
    if (!definition || !definition.key || !definition.components) {
        throw new Error("Definición de entidad inválida generada por la IA.");
    }

    // --- ¡MODIFICACIÓN CLAVE! ---
    const keyName = definition.key.toUpperCase();
    definition.key = keyName;
    const filename = `${keyName.toLowerCase()}.png`;
    // --- FIN DE MODIFICACIÓN ---
    
    const blob = await base64ToBlob(base64Data);

    // 1. Guardar imagen
    await saveBlobToAssets(blob, filename, handles.assetsDirHandle);

    // 2. Actualizar JSON
    const entityData = JSON.parse(await readFile(handles.entityFileHandle));

    if (entityData[keyName]) {
        console.warn(`La clave "${keyName}" (MAYÚSCULAS) ya existe en entity_definitions.json. Se sobrescribirá.`);
    }

    // ¡Importante! Asegurarse de que el componente Renderable apunte a la clave correcta (MAYÚSCULAS).
    let renderable = definition.components.find(c => c.type === 'Renderable');
    if (renderable) {
        renderable.args[0] = keyName;
    } else {
        definition.components.push({ type: "Renderable", args: [keyName] });
    }

    // Usar la definición completa generada por la IA
    entityData[keyName] = definition;

    await saveJsonFile(handles.entityFileHandle, entityData);
    console.log(`entity_definitions.json actualizado con "${keyName}".`);

    return definition;
}


/**
 * ¡NUEVO! Guarda un item/objeto generado.
 * Acepta la definición JSON completa de la IA.
 * @param {string} base64Data - Data URL de la imagen.
 * @param {object} definition - La definición de item generada por la IA (incluye key, name, imageKey, etc.).
 * @param {object} handles - Todos los manejadores de archivos.
 * @returns {Promise<object>} La nueva definición de item.
 */
export async function saveGeneratedItem(base64Data, definition, handles) {
    if (!handles.assetsDirHandle || !handles.itemsFileHandle) {
        throw new Error("Faltan los manejadores de assets o items.");
    }
     if (!definition || !definition.key) {
        throw new Error("Definición de item inválida generada por la IA.");
    }

    // --- ¡MODIFICACIÓN CLAVE! ---
    const keyName = definition.key.toUpperCase();
    definition.key = keyName;
    const filename = `${keyName.toLowerCase()}.png`;
    // --- FIN DE MODIFICACIÓN ---

    const blob = await base64ToBlob(base64Data);

    // 1. Guardar imagen
    await saveBlobToAssets(blob, filename, handles.assetsDirHandle);

    // 2. Actualizar JSON
    const itemsData = JSON.parse(await readFile(handles.itemsFileHandle));

    if (itemsData[keyName]) {
        console.warn(`La clave "${keyName}" (MAYÚSCULAS) ya existe en items.json. Se sobrescribirá.`);
    }

    // Asegurarse de que 'imageKey' es correcto (MAYÚSCULAS)
    definition.imageKey = keyName;

    // Usar la definición completa generada por la IA
    itemsData[keyName] = definition;

    await saveJsonFile(handles.itemsFileHandle, itemsData);
    console.log(`items.json actualizado con "${keyName}".`);

    return definition;
}