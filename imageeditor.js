// --- imageEditor.js ---
// Lógica para el editor de imágenes (cargar, redimensionar, guardar).
// ¡MODIFICADO! Se fuerza el guardado a minúsculas.

/**
 * ¡MODIFICADO!
 * Carga una imagen desde un nombre de archivo y devuelve un objeto Image.
 * No interactúa con la UI.
 * @param {FileSystemDirectoryHandle} assetsDirHandle
 * @param {string} filename
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImageFromFile(assetsDirHandle, filename) {
    return new Promise(async (resolve, reject) => {
        let file;
        try {
            // Asumimos que el filename ya viene en minúsculas de la galería
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
                resolve(originalImage); // Devuelve el objeto Image cargado
            };
            originalImage.onerror = () => reject(new Error("No se pudo cargar la imagen."));
            originalImage.src = event.target.result;
        };
        reader.onerror = () => reject(new Error("Error al leer el archivo."));
        reader.readAsDataURL(file);
    });
}

/**
 * ¡MODIFICADO!
 * Redimensiona y guarda una imagen en /assets.
 * Ahora acepta valores directos en lugar de inputs.
 * @param {FileSystemDirectoryHandle} assetsDirHandle
 * @param {HTMLImageElement} originalImage - El objeto Image original.
 * @param {HTMLCanvasElement} $canvas - El canvas para redimensionar.
 * @param {number} width - El nuevo ancho.
 * @param {number} height - El nuevo alto.
 * @param {string} filename - El nombre del archivo de destino.
 * @returns {Promise<string>} El nombre del archivo guardado.
 */
export async function saveImageFile(assetsDirHandle, originalImage, $canvas, width, height, filename) {
    if (!originalImage) {
        throw new Error("No hay imagen original cargada.");
    }
    if (!width || !height || width <= 0 || height <= 0) {
        throw new Error("Por favor, introduce un ancho y alto válidos.");
    }
    if (!filename) {
        throw new Error("Por favor, introduce un nombre de archivo.");
    }
    if (!filename.match(/\.(png|jpg|jpeg|webp)$/i)) {
        filename += '.png'; // Añadir extensión .png por defecto
    }
    
    // --- ¡MODIFICACIÓN CLAVE! ---
    // Forzar el nombre de archivo a minúsculas
    const finalFilename = filename.toLowerCase();
    // --- FIN DE MODIFICACIÓN ---


    // Dibujar en el canvas
    $canvas.width = width;
    $canvas.height = height;
    const ctx = $canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false; // ¡IMPORTANTE para Pixel Art!
    ctx.drawImage(originalImage, 0, 0, width, height);

    // Obtener Blob del canvas (PNG)
    const blob = await new Promise(resolve => $canvas.toBlob(resolve, 'image/png'));

    // Escribir el archivo en la carpeta /assets
    try {
        const fileHandle = await assetsDirHandle.getFileHandle(finalFilename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        return finalFilename; // Devuelve el nombre del archivo guardado (en minúsculas)
    } catch (err) {
        console.error("Error al escribir el archivo de imagen:", err);
        throw new Error(`No se pudo guardar la imagen: ${err.message}`);
    }
}


/**
 * ¡NUEVO!
 * Elimina un archivo de imagen de /assets.
 * @param {FileSystemDirectoryHandle} assetsDirHandle
 * @param {string} filename - El nombre del archivo a eliminar.
 * @returns {Promise<void>}
 */
export async function deleteImageFile(assetsDirHandle, filename) {
     if (!filename) {
        throw new Error("No se proporcionó nombre de archivo para eliminar.");
    }
    try {
        // Asumimos que el filename ya está en minúsculas
        await assetsDirHandle.removeEntry(filename.toLowerCase());
    } catch (err) {
        console.error(`Error al eliminar el archivo ${filename}:`, err);
        // No lanzar un error si el archivo no existía (ignorar 'NotFoundError')
        if (err.name !== 'NotFoundError') {
            throw new Error(`No se pudo eliminar el archivo ${filename}: ${err.message}`);
        }
    }
}