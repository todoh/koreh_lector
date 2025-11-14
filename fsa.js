// --- fsa.js ---
// Contiene la lógica pura de la File System Access API.
// ¡MODIFICADO! Ahora busca recursivamente los archivos.
// ¡MODIFICADO! Ahora crea las carpetas 'SVG' y 'assets/3d'.
// ¡MODIFICADO! Ahora maneja 'ia_gallery.json'.
// --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// ¡MODIFICADO! Ahora crea archivos/carpetas JSON esenciales si no existen.
// --- --- --- --- --- --- --- --- --- --- --- --- --- ---

/**
 * Pide al usuario que seleccione un directorio CUALQUIERA.
 * @returns {Promise<FileSystemDirectoryHandle>} El manejador del directorio seleccionado.
 */
export async function selectProjectRoot() {
    const options = {
        mode: 'readwrite'
    };
    const rootHandle = await window.showDirectoryPicker(options);

    // Verificar permisos
    if (await rootHandle.queryPermission(options) !== 'granted') {
         if (await rootHandle.requestPermission(options) !== 'granted') {
            throw new Error('Permiso denegado para acceder a la carpeta.');
         }
    }
    return rootHandle;
}

/**
 * ¡NUEVO!
 * Escanea recursivamente un directorio buscando los archivos y carpetas del proyecto.
 * Si no los encuentra, los crea con una estructura vacía por defecto.
 * @param {FileSystemDirectoryHandle} rootHandle - El directorio raíz seleccionado por el usuario.
 * @returns {Promise<object>} Un objeto con todos los manejadores (handles) encontrados.
 */
export async function findProjectHandles(rootHandle) {
    
    const handles = {
        terrainFileHandle: null,
        entityFileHandle: null,
        biomeFileHandle: null,
        itemsFileHandle: null,
        craftingFileHandle: null,
        initialInventoryFileHandle: null,
        iaGalleryHandle: null,
        assetsDirHandle: null,
        svgDirHandle: null, 
        assets3dDirHandle: null, 
        rootDirHandle: rootHandle
    };

    // Función interna recursiva
    async function scanDirectory(dirHandle) {
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
                switch (entry.name) {
                    case 'terrain_definitions.json':
                        if (!handles.terrainFileHandle) handles.terrainFileHandle = entry;
                        break;
                    case 'entity_definitions.json':
                        if (!handles.entityFileHandle) handles.entityFileHandle = entry;
                        break;
                    case 'biome_definitions.json':
                        if (!handles.biomeFileHandle) handles.biomeFileHandle = entry;
                        break;
                    case 'items.json':
                        if (!handles.itemsFileHandle) handles.itemsFileHandle = entry;
                        break;
                    case 'crafting_recipes.json':
                        if (!handles.craftingFileHandle) handles.craftingFileHandle = entry;
                        break;
                    case 'initial_inventory.json':
                        if (!handles.initialInventoryFileHandle) handles.initialInventoryFileHandle = entry;
                        break;
                    case 'ia_gallery.json':
                        if (!handles.iaGalleryHandle) handles.iaGalleryHandle = entry;
                        break;
                }
            } else if (entry.kind === 'directory') {
                if (entry.name === 'assets') {
                    if (!handles.assetsDirHandle) handles.assetsDirHandle = entry;
                } else {
                    await scanDirectory(entry);
                }
            }
        }
    }

    // Iniciar el escaneo desde la raíz
    await scanDirectory(rootHandle);

    // --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
    // --- ¡INICIO DE MODIFICACIÓN! ---
    // --- Lógica para crear archivos y carpetas faltantes ---
    // --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
    
    // --- 1. Definir Contenidos por Defecto ---
    const defaultStructures = {
        terrain_definitions: {},
        entity_definitions: {},
        biome_definitions: { "BIOME_WEIGHTS": {}, "BIOME_DEFINITIONS": {} },
        items: {},
        crafting_recipes: { "CARPENTRY": [], "COOKING": [], "ALCHEMY": [], "STUDY": [] },
        initial_inventory: Array(30).fill(null), // Basado en initial_inventory.json
        ia_gallery: []
    };

    // --- 2. Asegurar Archivos JSON ---
    const requiredFiles = [
        { key: 'terrainFileHandle', name: 'terrain_definitions.json', content: defaultStructures.terrain_definitions },
        { key: 'entityFileHandle', name: 'entity_definitions.json', content: defaultStructures.entity_definitions },
        { key: 'biomeFileHandle', name: 'biome_definitions.json', content: defaultStructures.biome_definitions },
        { key: 'itemsFileHandle', name: 'items.json', content: defaultStructures.items },
        { key: 'craftingFileHandle', name: 'crafting_recipes.json', content: defaultStructures.crafting_recipes },
        { key: 'initialInventoryFileHandle', name: 'initial_inventory.json', content: defaultStructures.initial_inventory },
        { key: 'iaGalleryHandle', name: 'ia_gallery.json', content: defaultStructures.ia_gallery }
    ];

    for (const file of requiredFiles) {
        if (!handles[file.key]) { // Si el handle es null (no se encontró)
            console.warn(`No se encontró '${file.name}'. Creando archivo vacío...`);
            try {
                const newHandle = await rootHandle.getFileHandle(file.name, { create: true });
                await saveJsonFile(newHandle, file.content); // Escribir el contenido por defecto
                handles[file.key] = newHandle; // Asignar el nuevo handle
            } catch (e) {
                console.error(`Error al crear el archivo por defecto '${file.name}':`, e);
                // Si falla aquí, el check de 'missing' más adelante lo capturará.
            }
        }
    }

    // --- 3. Asegurar Directorios ---
    // 'assets'
    if (!handles.assetsDirHandle) {
        console.warn("No se encontró la carpeta 'assets'. Creando...");
        try {
            handles.assetsDirHandle = await rootHandle.getDirectoryHandle('assets', { create: true });
        } catch (e) {
             console.error("Error fatal: No se pudo crear la carpeta 'assets'.", e);
        }
    }

    // '/SVG'
    try {
        handles.svgDirHandle = await rootHandle.getDirectoryHandle('SVG', { create: true });
    } catch (e) {
        console.warn("No se pudo crear/acceder a la carpeta SVG.", e.message);
    }
    
    // 'assets/3d' (depende de 'assets')
    if (handles.assetsDirHandle) {
        try {
            handles.assets3dDirHandle = await handles.assetsDirHandle.getDirectoryHandle('3d', { create: true });
        } catch (e) {
            console.warn("No se pudo crear/acceder a la carpeta assets/3d.", e.message);
        }
    } else {
        console.warn("No se encontró la carpeta 'assets', no se pudo crear 'assets/3d'.");
    }

    // --- 4. Verificación Final ---
    // Verificar si encontramos todo (modificado)
    const missing = Object.entries(handles)
        // Solo fallar si los archivos/carpetas *críticos* siguen faltando después de intentar crearlos
        .filter(([key, value]) => 
            key !== 'rootDirHandle' && 
            key !== 'svgDirHandle' &&  // Se crea
            key !== 'assets3dDirHandle' && // Se crea
            !value // Si sigue siendo null
        )
        .map(([key]) => key.replace('Handle', '').replace('File', '').replace('Dir', ''));

    if (missing.length > 0) {
        // Si algo sigue faltando, es un error grave (ej. permisos de escritura)
        throw new Error(`No se pudieron encontrar O CREAR los siguientes archivos/carpetas: ${missing.join(', ')}`);
    }
    
    // --- 5. Lógica de Placeholders eliminada ---
    // La lógica de "placeholder" para initial_inventory e ia_gallery ya no es necesaria
    // porque ahora se crean activamente en el bucle 'requiredFiles'.

    // --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
    // --- FIN DE MODIFICACIÓN ---
    // --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

    return handles;
}


/**
 * Lee el contenido de un manejador de archivo como texto.
 * (Sin cambios)
 * @param {FileSystemFileHandle} fileHandle
 * @returns {Promise<string>}
 */
export async function readFile(fileHandle) {
    const file = await fileHandle.getFile(); 
    return await file.text();
}

/**
 * Escribe un objeto JSON en un manejador de archivo.
 * (Sin cambios)
 * @param {FileSystemFileHandle} fileHandle 
 * @param {object | Array} dataObject 
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