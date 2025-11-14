// --- fsa.js ---
// Contiene la lógica pura de la File System Access API.
// ¡MODIFICADO! Ahora busca recursivamente los archivos.
// ¡MODIFICADO! Ahora crea las carpetas 'SVG' y 'assets/3d'.
// ¡MODIFICADO! Ahora maneja 'ia_gallery.json'.

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
 * @param {FileSystemDirectoryHandle} rootHandle - El directorio raíz seleccionado por el usuario.
 * @returns {Promise<object>} Un objeto con todos los manejadores (handles) encontrados.
 */
export async function findProjectHandles(rootHandle) {
    
    // Nombres de clave coinciden con main.js (ej. terrainFileHandle, assetsDirHandle)
    const handles = {
        terrainFileHandle: null,
        entityFileHandle: null,
        biomeFileHandle: null,
        itemsFileHandle: null,
        craftingFileHandle: null,
        initialInventoryFileHandle: null,
        iaGalleryHandle: null, // <-- ¡AÑADIDO!
        assetsDirHandle: null,
        svgDirHandle: null, 
        assets3dDirHandle: null, 
        rootDirHandle: rootHandle // Guardamos la raíz que main.js espera
    };

    // Función interna recursiva
    async function scanDirectory(dirHandle) {
        for await (const entry of dirHandle.values()) {
            if (entry.kind === 'file') {
                
                // Nombres PLURALES
                switch (entry.name) {
                    case 'terrain_definitions.json': // Plural
                        if (!handles.terrainFileHandle) handles.terrainFileHandle = entry;
                        break;
                    case 'entity_definitions.json': // Plural
                        if (!handles.entityFileHandle) handles.entityFileHandle = entry;
                        break;
                    case 'biome_definitions.json': // Plural
                        if (!handles.biomeFileHandle) handles.biomeFileHandle = entry;
                        break;
                    case 'items.json':
                        if (!handles.itemsFileHandle) handles.itemsFileHandle = entry;
                        break;
                    case 'crafting_recipes.json': // Plural
                        if (!handles.craftingFileHandle) handles.craftingFileHandle = entry;
                        break;
                    case 'initial_inventory.json':
                        if (!handles.initialInventoryFileHandle) handles.initialInventoryFileHandle = entry;
                        break;
                    case 'ia_gallery.json': // <-- ¡AÑADIDO!
                        if (!handles.iaGalleryHandle) handles.iaGalleryHandle = entry;
                        break;
                }
            } else if (entry.kind === 'directory') {
                if (entry.name === 'assets') {
                    // Si encontramos 'assets', lo guardamos y NO seguimos escaneando dentro
                    if (!handles.assetsDirHandle) handles.assetsDirHandle = entry;
                } else {
                    // Si es otra carpeta, seguimos buscando dentro
                    await scanDirectory(entry);
                }
            }
        }
    }

    // Iniciar el escaneo desde la raíz
    await scanDirectory(rootHandle);

    // --- ¡NUEVA LÓGICA! Crear carpetas SVG y assets/3d ---
    try {
        // Crear /SVG en la raíz
        handles.svgDirHandle = await rootHandle.getDirectoryHandle('SVG', { create: true });
    } catch (e) {
        console.warn("No se pudo crear/acceder a la carpeta SVG.", e.message);
    }
    
    if (handles.assetsDirHandle) {
        try {
            // Crear /assets/3d
            handles.assets3dDirHandle = await handles.assetsDirHandle.getDirectoryHandle('3d', { create: true });
        } catch (e) {
            console.warn("No se pudo crear/acceder a la carpeta assets/3d.", e.message);
        }
    } else {
        console.warn("No se encontró la carpeta 'assets', no se pudo crear 'assets/3d'.");
    }
    // --- FIN DE NUEVA LÓGICA ---


    // Verificar si encontramos todo
    const missing = Object.entries(handles)
        // Ignoramos los nuevos directorios y los que son opcionales/se crean
        .filter(([key, value]) => 
            key !== 'rootDirHandle' && 
            key !== 'initialInventoryFileHandle' &&
            key !== 'iaGalleryHandle' && // <-- ¡AÑADIDO!
            key !== 'svgDirHandle' && 
            key !== 'assets3dDirHandle' && 
            !value
        )
        .map(([key]) => key.replace('Handle', '').replace('File', '').replace('Dir', '')); // Limpiar nombre

    if (missing.length > 0) {
        throw new Error(`No se pudieron encontrar los siguientes archivos/carpetas dentro de la selección: ${missing.join(', ')}`);
    }
    
    // Manejar 'initial_inventory' (lógica existente)
    if (!handles.initialInventoryFileHandle) {
        console.warn("No se encontró 'initial_inventory.json'. Se creará uno nuevo si se guarda desde el editor de inventario.");
        // Crear un manejador "fantasma" que se resolverá al guardar
        handles.initialInventoryFileHandle = {
            _name: 'initial_inventory.json',
            _isPlaceholder: true,
            // Engañar a saveJsonFile para que cree el archivo
            createWritable: async () => {
                const realHandle = await rootHandle.getFileHandle('initial_inventory.json', { create: true });
                handles.initialInventoryFileHandle = realHandle; // Reemplazar el placeholder
                return realHandle.createWritable();
            },
            // Engañar a readFile (aunque no debería ser llamado si es nuevo)
            getFile: async () => {
                try {
                    const realHandle = await rootHandle.getFileHandle('initial_inventory.json', { create: false });
                    handles.initialInventoryFileHandle = realHandle;
                    return realHandle.getFile();
                } catch (e) {
                     // Si no existe, devolver un archivo JSON vacío
                    return new File(['[]'], 'initial_inventory.json', { type: 'application/json' });
                }
            }
         };
    }

    // --- ¡AÑADIDO! Manejar 'ia_gallery.json' ---
    if (!handles.iaGalleryHandle) {
        console.warn("No se encontró 'ia_gallery.json'. Se creará uno nuevo si se guarda desde el editor de IA.");
        handles.iaGalleryHandle = {
            _name: 'ia_gallery.json',
            _isPlaceholder: true,
            createWritable: async () => {
                const realHandle = await rootHandle.getFileHandle('ia_gallery.json', { create: true });
                handles.iaGalleryHandle = realHandle; // Reemplazar el placeholder
                return realHandle.createWritable();
            },
            getFile: async () => {
                try {
                    const realHandle = await rootHandle.getFileHandle('ia_gallery.json', { create: false });
                    handles.iaGalleryHandle = realHandle;
                    return realHandle.getFile();
                } catch (e) {
                     // Si no existe, devolver un archivo JSON vacío
                    return new File(['[]'], 'ia_gallery.json', { type: 'application/json' });
                }
            }
         };
    }

    return handles;
}


/**
 * Lee el contenido de un manejador de archivo como texto.
 * (Sin cambios)
 * @param {FileSystemFileHandle} fileHandle
 * @returns {Promise<string>}
 */
export async function readFile(fileHandle) {
    const file = await fileHandle.getFile(); // Esta línea es la que daba error
    return await file.text();
}

/**
 * Escribe un objeto JSON en un manejador de archivo.
 * (Sin cambios)
 * @param {FileSystemFileHandle} fileHandle 
 * @param {object | Array} dataObject // <-- ¡MODIFICADO! Acepta arrays
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