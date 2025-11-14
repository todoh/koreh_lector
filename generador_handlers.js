// =================================================================
// ARCHIVO: generador_handlers.js (NUEVO)
// CONTIENE:
// 1. Funciones "controladoras" que responden a eventos (clics, etc.).
// 2. Importa y utiliza módulos de estado, UI y lógica de negocio.
// =================================================================

// --- Importaciones de Lógica de Negocio ---
import * as ApiSistema from './apisistema.js';
import { generarImagenDesdePrompt } from './generador_svggeneracion.js';
import { generarImagenRealistaDesdePrompt } from './generadorrealista.js';
import { mejorarImagenDesdeSVG } from './generador_svgmejora.js';
import { manipulateViewBox } from './generador_svgmanual.js';
import { deleteSelectedElement } from './generador_svginteract.js';
import { generate3DModel, edit3DModel, exportSceneToGLB } from './generador_svga3d.js';
// --- ¡MODIFICADO! Importar saveJsonFile ---
import { readFile, saveJsonFile } from './fsa.js';

// --- Importaciones Internas ---
import { dom } from './generador_doms.js'; // <-- CORREGIDO
import * as state from './generador_state.js';
import * as ui from './generador_ui.js';

/**
 * Inicia la generación de un nuevo SVG y lo añade a la cola.
 */
export function handleGenerate() {
    const fullInput = dom.promptInput.value;
    const selectedModel = dom.modelSelect.value;
    const prompts = fullInput.split('@').map(p => p.trim()).filter(p => p.length > 0);

    if (prompts.length === 0) {
        ui.showStatus("Por favor, ingresa un prompt principal.", true);
        return;
    }
    if (ApiSistema.hasApiKeys() === 0) {
        ui.showStatus("Por favor, ingresa tu API Key en la pestaña 'IA REALISTA'.", true);
        return;
    }

    dom.generateButton.disabled = true;
    dom.generateRealisticButton.disabled = true;
    
    const statusMsg = prompts.length === 1 ? "Añadido 1 item SVG a la cola..." : `Añadidos ${prompts.length} items SVG a la cola...`;
    ui.showStatus(statusMsg, false);
    
    dom.promptInput.value = "";
    dom.generateButton.disabled = false;
    dom.generateRealisticButton.disabled = false;

    const baseTimestamp = Date.now();

    prompts.forEach((prompt, index) => {
        const newItem = {
            id: `${baseTimestamp}-${index}`,
            name: prompt.substring(0, 30) + '...' || 'Nuevo SVG',
            prompt: prompt,
            status: 'pending',
            isRealistic: false
        };
        state.addToGallery(newItem);
    });
    
    ui.renderGallery(getGalleryHandlers()); // Re-renderizar con los items pendientes

    // Iniciar generaciones en segundo plano
    prompts.forEach((prompt, index) => {
        const itemId = `${baseTimestamp}-${index}`;
        (async () => {
            try {
                const result = await generarImagenDesdePrompt(prompt, selectedModel);
                state.updateGalleryItem(itemId, {
                    svgContent: result.svgContent,
                    status: 'completed'
                });
            } catch (error) {
                console.error(`Error en handleGenerate (SVG) for prompt "${prompt}":`, error);
                ui.showStatus(`Error al generar SVG "${prompt.substring(0, 15)}...": ${error.message}`, true);
                state.updateGalleryItem(itemId, { 
                    status: 'error', 
                    name: 'Error de Generación' 
                });
            } finally {
                ui.renderGallery(getGalleryHandlers()); // Re-renderizar al completar/fallar
            }
        })();
    });
}

/**
 * Inicia la generación de una imagen realista (PNG).
 */
export function handleGenerateRealistic() {
    const fullInput = dom.promptInput.value;
    const prompts = fullInput.split('@').map(p => p.trim()).filter(p => p.length > 0);

    if (prompts.length === 0) {
        ui.showStatus("Por favor, ingresa un prompt principal.", true);
        return;
    }
    if (ApiSistema.hasApiKeys() === 0) {
        ui.showStatus("Por favor, ingresa tu API Key en la pestaña 'IA REALISTA'.", true);
        return;
    }

    dom.generateButton.disabled = true;
    dom.generateRealisticButton.disabled = true;
    
    const statusMsg = prompts.length === 1 ? "Añadido 1 item Realista a la cola..." : `Añadidos ${prompts.length} items Realistas a la cola...`;
    ui.showStatus(statusMsg, false);
    
    dom.promptInput.value = "";
    dom.generateButton.disabled = false;
    dom.generateRealisticButton.disabled = false;

    const baseTimestamp = Date.now();

    prompts.forEach((prompt, index) => {
        const newItem = {
            id: `${baseTimestamp}-${index}`,
            name: prompt.substring(0, 30) + '...' || 'Nueva Imagen Realista',
            prompt: prompt,
            status: 'pending',
            isRealistic: true
        };
        state.addToGallery(newItem);
    });
    
    ui.renderGallery(getGalleryHandlers());

    prompts.forEach((prompt, index) => {
        const itemId = `${baseTimestamp}-${index}`;
        (async () => {
            try {
                const pngDataUrl = await generarImagenRealistaDesdePrompt(prompt);
                state.updateGalleryItem(itemId, {
                    svgContent: pngDataUrl,
                    status: 'completed'
                });
            } catch (error) {
                console.error(`Error en handleGenerateRealistic for prompt "${prompt}":`, error);
                ui.showStatus(`Error al generar Realista "${prompt.substring(0, 15)}...": ${error.message}`, true);
                state.updateGalleryItem(itemId, { 
                    status: 'error', 
                    name: 'Error de Generación' 
                });
            } finally {
                ui.renderGallery(getGalleryHandlers());
            }
        })();
    });
}
 
/**
 * Maneja el click en un item de la galería.
 */
export async function handleGalleryItemClick(item) {
    if (item.status === 'pending') return;
    if (state.currentSelectedId === item.id) return;

    if (item.isFromFile) {
        if (item.is3DFile) {
            try {
                const jsonText = await readFile(item.fileHandle);
                const modelData = JSON.parse(jsonText);
                
                const previewItem = {
                    id: item.id,
                    name: item.name,
                    model3d: {
                        data: modelData,
                        prompt: "Cargado desde archivo. No se puede editar con IA.",
                        sceneDescription: null, 
                        sourceSvgId: null
                    }
                };
                await ui.show3DModelInPreview(previewItem);
                
                dom.prompt3D.value = "";
                dom.prompt3D.placeholder = "No se puede editar un modelo cargado desde archivo.";
                dom.edit3DButton.disabled = true;

            } catch (e) {
                console.error("Error al cargar el modelo 3D desde el archivo:", e);
                ui.showStatus(`Error al cargar ${item.name}: ${e.message}`, true);
            }
        } else if (item.svgContent) {
            ui.showResultInPreview(item);
            dom.prompt3D.value = "";
            dom.prompt3D.placeholder = "Genere un SVG en esta pestaña para habilitar la creación 3D.";
            dom.generate3DButton.disabled = true;
        }
    } else {
        // --- ESTA ES LA LÓGICA QUE AHORA FUNCIONARÁ PARA LOS ITEMS GUARDADOS ---
        if (item.svgContent) {
            ui.showResultInPreview(item);
            dom.generate3DButton.disabled = false;
            dom.prompt3D.placeholder = "Ej: Hazlo grueso y de color rojo metálico";
        } else if (item.model3d) {
            await ui.show3DModelInPreview(item);
            // --- ¡CORRECCIÓN! Comprobar si model3d.sceneDescription existe ---
            dom.edit3DButton.disabled = !item.model3d.sceneDescription;
            if (dom.edit3DButton.disabled) {
                dom.prompt3D.placeholder = "No se puede editar este modelo (falta descripción de escena o es de Editor 3D).";
            } else {
                 dom.prompt3D.placeholder = "Ej: Hazlo grueso y de color rojo metálico";
            }
        }
    }
}

/**
 * Maneja el click en el botón 'Editar' de un item de la galería.
 */
export function handleGalleryEditClick(item) {
    if (item.status !== 'completed' || item.isFromFile) return;

    if (state.currentSelectedId !== item.id) {
        handleGalleryItemClick(item);
    }
    
    dom.modalItemName.value = item.name;
    dom.modalImprovePrompt.value = ""; 
    
    if (item.svgContent && !item.svgContent.startsWith('data:image/png')) {
        dom.modalImproveSection.style.display = 'block';
        dom.modalImproveConfirm.style.display = 'block';
    } else {
        dom.modalImproveSection.style.display = 'none';
        dom.modalImproveConfirm.style.display = 'none';
    }

    dom.improveModal.classList.remove('hidden');
    
    ui.hideDeleteConfirmation();
}

/**
 * Maneja el click en el botón 'Eliminar' de un item de la galería.
 */
export function handleGalleryDeleteClick(item) {
    if (!item || !item.id || item.isFromFile) return;

    // --- ¡MODIFICACIÓN! No usar confirm() ---
    // En su lugar, abrimos el modal en modo "eliminar"
    
    if (state.currentSelectedId !== item.id) {
        handleGalleryItemClick(item);
    }
    
    dom.modalItemName.value = item.name;
    dom.modalImproveSection.style.display = 'none';
    dom.modalImproveConfirm.style.display = 'none';
    
    dom.improveModal.classList.remove('hidden');
    ui.showDeleteConfirmation(); // Mostrar la confirmación de borrado
    
    // --- Lógica de borrado movida a handleDelete() ---
}

/**
 * Maneja el click en el botón de "Mejorar" dentro del modal (SOLO 2D SVG).
 */
export function handleImprove() {
    const improvePrompt = dom.modalImprovePrompt.value;
    const newName = dom.modalItemName.value;
    const selectedModel = dom.modelSelect.value;
    
    const itemIdToImprove = state.currentSelectedId;
    const originalItem = state.getGalleryItem(itemIdToImprove);

    if (!originalItem || !originalItem.svgContent || originalItem.svgContent.startsWith('data:image/png') || originalItem.isFromFile) {
        ui.showStatus("Error: No se encontró el item SVG seleccionado para mejorar.", true);
        return;
    }

    if (!improvePrompt) {
        state.updateGalleryItem(itemIdToImprove, { name: newName });
        ui.renderGallery(getGalleryHandlers());
        ui.showStatus("Nombre actualizado.", false);
        dom.improveModal.classList.add('hidden');
        return;
    }

    ui.showStatus("Mejora añadida a la cola...", false);
    dom.improveModal.classList.add('hidden');
    
    const originalSvgContent = originalItem.svgContent;

    state.updateGalleryItem(itemIdToImprove, {
        name: newName,
        prompt: improvePrompt,
        status: 'pending'
    });
    
    ui.renderGallery(getGalleryHandlers());

    if (state.currentSelectedId === itemIdToImprove) {
        ui.clearPreview();
    }

    (async () => {
        try {
            const result = await mejorarImagenDesdeSVG(originalSvgContent, improvePrompt, selectedModel);
            state.updateGalleryItem(itemIdToImprove, {
                svgContent: result.svgContent,
                status: 'completed'
            });
        } catch (error) {
            console.error("Error en handleImprove (background):", error);
            ui.showStatus(`Error al mejorar: ${error.message}`, true);
            state.updateGalleryItem(itemIdToImprove, { 
                status: 'error',
                name: newName || originalItem.name
            });
        } finally {
            ui.renderGallery(getGalleryHandlers());
        }
    })();
}

/**
 * Duplica el item seleccionado actualmente.
 */
export function handleDuplicate() {
    if (!state.currentSelectedId) return;

    const originalItem = state.getGalleryItem(state.currentSelectedId);
    if (!originalItem || originalItem.isFromFile) {
        ui.showStatus("Error: No se encontró el item (o no se pueden duplicar archivos).", true);
        return;
    }

    const newItem = {
        ...originalItem,
        id: Date.now().toString(),
        name: originalItem.name + " (Copia)"
    };

    state.addToGallery(newItem);
    ui.renderGallery(getGalleryHandlers());
    ui.showStatus("Item duplicado con éxito.", false);
    dom.improveModal.classList.add('hidden');
}

/**
 * Elimina permanentemente el item seleccionado desde el modal.
 */
export function handleDelete() {
    const item = state.getGalleryItem(state.currentSelectedId);
    if (item && !item.isFromFile) {
        state.deleteGalleryItem(state.currentSelectedId);
        ui.renderGallery(getGalleryHandlers());
        ui.showStatus("Item eliminado permanentemente.", false);
        dom.improveModal.classList.add('hidden');
        ui.hideDeleteConfirmation();
        ui.clearPreview();
    }
}

/**
 * Maneja la carga de un archivo JSON de galería.
 */
export function handleGalleryUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.type !== 'application/json') {
        ui.showStatus("Error: El archivo debe ser de tipo JSON.", true);
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const uploadedItems = JSON.parse(e.target.result);
            if (!Array.isArray(uploadedItems)) throw new Error("El JSON no es un array válido.");

            const existingIds = new Set(state.svgGallery.map(item => item.id));
            let addedCount = 0;

            uploadedItems.forEach(item => {
                if (item && item.id && item.name && (item.svgContent || item.model3d)) { 
                    if (!existingIds.has(item.id)) {
                        // --- ¡MODIFICADO! Asegurarse de que no se marquen como de archivo ---
                        item.isFromFile = false; 
                        state.addToGallery(item); // No re-renderiza
                        existingIds.add(item.id);
                        addedCount++;
                    }
                }
            });

            if (addedCount > 0) {
                state.autoSaveGalleryState(); // <-- MODIFICADO: Llama al autoguardado
                ui.renderGallery(getGalleryHandlers());
                ui.showStatus(`Se añadieron ${addedCount} nuevos items a la galería.`, false);
            } else {
                ui.showStatus("No se añadieron nuevos items (posiblemente ya existían).", false);
            }
        } catch (error) {
            console.error("Error al cargar JSON:", error);
            ui.showStatus(`Error al leer el JSON: ${error.message}`, true);
        } finally {
            event.target.value = null;
        }
    };
    reader.onerror = () => {
        ui.showStatus("Error al leer el archivo.", true);
        event.target.value = null;
    };
    reader.readAsText(file);
}

/**
 * Maneja el guardado de solo el nombre desde el modal.
 */
export function handleRenameSave() {
    const newName = dom.modalItemName.value;
    if (!newName) {
        ui.showStatus("El nombre no puede estar vacío.", true);
        return;
    }
    const item = state.getGalleryItem(state.currentSelectedId);
    if (item && !item.isFromFile) {
        state.updateGalleryItem(state.currentSelectedId, { name: newName });
        ui.renderGallery(getGalleryHandlers());
        ui.showStatus("Nombre actualizado.", false);
        dom.improveModal.classList.add('hidden');
    }
}

/**
 * Copia el SVG seleccionado al portapapeles.
 */
export function handleCopySvg() {
    let item = state.getGalleryItem(state.currentSelectedId);
    
    if (!item && state.currentMode === '2d') {
        const svgEl = dom.previewArea.querySelector('svg');
        if (svgEl) item = { svgContent: svgEl.outerHTML };
    }
    
    if (state.currentMode !== '2d' || !item || !item.svgContent || item.svgContent.startsWith('data:image/png')) {
        ui.showStatus("No hay código SVG para copiar (solo 2D SVG).", true);
        return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = item.svgContent;
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        ui.showStatus("¡SVG copiado al portapapeles!", false);
        const originalText = dom.copySvgButton.textContent;
        dom.copySvgButton.textContent = "¡Copiado!";
        setTimeout(() => { dom.copySvgButton.textContent = originalText; }, 2000);
    } catch (err) {
        console.error('Error al copiar SVG:', err);
        ui.showStatus("Error al copiar. Revisa la consola.", true);
    }
    document.body.removeChild(textarea);
}

/**
 * Copia el modelo 3D (GLTF JSON) seleccionado al portapapeles.
 */
export async function handleCopy3DModel() {
    let item = state.getGalleryItem(state.currentSelectedId);

    if (!item && state.currentMode === '3d' && state.allHandles) {
        const fileItemEl = dom.galleryGrid.querySelector(`.gallery-item[data-id="${state.currentSelectedId}"]`);
        const fileItem = fileItemEl?._galleryItem;
        if (fileItem && fileItem.is3DFile) {
            try {
                const jsonText = await readFile(fileItem.fileHandle);
                item = { model3d: { data: JSON.parse(jsonText) } };
            } catch (e) {
                 ui.showStatus("Error al leer el archivo 3D para copiar.", true);
                 return;
            }
        }
    }
    
    if (state.currentMode !== '3d' || !item || !item.model3d || !item.model3d.data) {
        ui.showStatus("No hay datos de modelo 3D para copiar.", true);
        return;
    }

    try {
        const modelString = JSON.stringify(item.model3d.data, null, 2); 
        const textarea = document.createElement('textarea');
        textarea.value = modelString;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        ui.showStatus("¡GLTF JSON copiado al portapapeles!", false);
        document.body.removeChild(textarea);
        
        const originalText = dom.copy3DModelButton.textContent;
        dom.copy3DModelButton.textContent = "¡Copiado!";
        dom.copy3DModelButton.disabled = true;
        setTimeout(() => {
            dom.copy3DModelButton.textContent = originalText;
            dom.copy3DModelButton.disabled = false;
        }, 2000);
    } catch (err) {
        console.error('Error al copiar GLTF JSON:', err);
        ui.showStatus("Error al copiar. Revisa la consola.", true);
    }
}

/**
 * Descarga la galería de SESIÓN (no de archivos) como un archivo JSON.
 */
export function handleDownloadGallery() {
    // Filtra solo los items de sesión (no los de /SVG o /assets/3d)
    const galleryToDownload = state.svgGallery.filter(item => !item.isFromFile && item.status === 'completed');
    if (galleryToDownload.length === 0) {
        ui.showStatus("No hay nada en la galería (de sesión) para descargar.", true);
        return;
    }

    const jsonString = JSON.stringify(galleryToDownload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `copia_galeria_ia_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    ui.showStatus("Descargando copia de la galería de sesión.", false);
}

// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// --- ¡SECCIÓN MODIFICADA! ---
// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---

/**
 * ¡NUEVO! Helper para guardar un string de texto en un handle.
 * (Necesario porque saveJsonFile añade formato JSON)
 */
async function saveTextFile(fileHandle, content) {
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
}

/**
 * ¡MODIFICADO! Guarda la galería de sesión en ia_gallery.json Y
 * exporta los archivos SVG/3D individuales a las carpetas /SVG y /assets/3d.
 */
export async function handleSaveGalleryToProject() {
    ui.showStatus("Guardando galería en ia_gallery.json...", false);
    dom.saveGalleryButton.disabled = true;
    
    let svgCount = 0;
    let modelCount = 0;
    
    try {
        // --- PASO 1: Guardar la "base de datos" ia_gallery.json (lógica existente) ---
        await state.saveGalleryState();
        ui.showStatus("Base de datos ia_gallery.json guardada. Exportando archivos...", false);

        // --- PASO 2: Exportar archivos individuales ---
        const gallery = state.getSvgGallery();
        const itemsToExport = gallery.filter(item => !item.isFromFile && item.status === 'completed');
        
        const { svgDirHandle, assets3dDirHandle } = state.allHandles;
        if (!svgDirHandle || !assets3dDirHandle) {
            throw new Error("No se encontraron las carpetas /SVG o /assets/3d.");
        }

        for (const item of itemsToExport) {
            const baseName = (item.name || item.id)
                .replace(/[^a-z0-9]/gi, '_')
                .toLowerCase()
                .replace(/_\(3d\)|_3d/g, '') // Limpiar nombres
                .substring(0, 50); // Limitar longitud

            if (item.svgContent && !item.isRealistic) {
                // --- Guardar SVG y su metadata ---
                const svgFileName = `${baseName}.svg`;
                const metaFileName = `${baseName}.svg.json`;
                
                const svgFileHandle = await svgDirHandle.getFileHandle(svgFileName, { create: true });
                await saveTextFile(svgFileHandle, item.svgContent);
                
                const metaData = {
                    id: item.id,
                    name: item.name,
                    prompt: item.prompt,
                    source: 'ia_gallery'
                };
                await saveJsonFile(await svgDirHandle.getFileHandle(metaFileName, { create: true }), metaData);
                svgCount++;

            } else if (item.model3d) {
                // --- Guardar Modelo 3D (GLTF) y su metadata ---
                // --- ¡CORRECCIÓN! El modelo de Editor 3D es .json, no GLTF ---
                const modelFileName = `${baseName}_3d.json`;
                const metaFileName = `${baseName}_3d.json.meta`; // Usar .meta para no confundir

                // Guardar el JSON (que es item.model3d.data)
                await saveJsonFile(await assets3dDirHandle.getFileHandle(modelFileName, { create: true }), item.model3d.data);
                
                const metaData = {
                    id: item.id,
                    name: item.name,
                    prompt: item.model3d.prompt,
                    sourceSvgId: item.model3d.sourceSvgId,
                    sceneDescription: item.model3d.sceneDescription, // Guardar la escena para edición
                    source: 'ia_gallery'
                };
                await saveJsonFile(await assets3dDirHandle.getFileHandle(metaFileName, { create: true }), metaData);
                modelCount++;
            }
            // (Ignoramos los PNG realistas por ahora ya que no tienen un destino claro)
        }

        // --- ¡INICIO DE MODIFICACIÓN! ---
        // Despachar eventos globales para notificar a main.js que recargue las galerías
        if (svgCount > 0) {
            window.dispatchEvent(new CustomEvent('ia-gallery-file-saved', { detail: { type: 'svg' } }));
        }
        if (modelCount > 0) {
            window.dispatchEvent(new CustomEvent('ia-gallery-file-saved', { detail: { type: '3d' } }));
        }
        
        ui.showStatus(`¡Éxito! Galería guardada y ${svgCount} SVGs, ${modelCount} Modelos exportados.`, "success");

        // --- ¡FIN DE MODIFICACIÓN! ---

    } catch (e) {
        console.error("Error al guardar la galería en el proyecto:", e);
        ui.showStatus(`Error al guardar: ${e.message}`, true);
    } finally {
        dom.saveGalleryButton.disabled = false;
    }
}
// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---
// --- FIN DE LA SECCIÓN MODIFICADA ---
// --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ---


/**
 * Descarga el SVG o PNG seleccionado como un archivo.
 */
export function handleDownloadSvg() {
    let item = state.getGalleryItem(state.currentSelectedId);
    
    if (!item && state.currentMode === '2d') {
        const svgEl = dom.previewArea.querySelector('svg');
        if (svgEl) {
            item = { svgContent: svgEl.outerHTML, name: state.currentSelectedId.replace('file-svg-','') };
        }
    }
    
    if (state.currentMode !== '2d' || !item || !item.svgContent) {
        ui.showStatus("No hay nada seleccionado para descargar.", true);
        return;
    }

    try {
        const a = document.createElement('a');
        const fileNameBase = (item.name || 'dibujo').replace(/[^a-z0-9]/gi, '_').toLowerCase().replace('.svg','');

        if (item.svgContent.startsWith('data:image/png')) {
            a.href = item.svgContent;
            a.download = `${fileNameBase}.png`;
        } else {
            const blob = new Blob([item.svgContent], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            a.href = url;
            a.download = `${fileNameBase}.svg`;
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        ui.showStatus("Descarga iniciada.", false);
    } catch (err) {
        console.error('Error al descargar:', err);
        ui.showStatus("Error al descargar. Revisa la consola.", true);
    }
}

/**
 * Descarga el modelo 3D (GLB) actual como un archivo.
 */
export async function handleDownload3DModel() {
    let item = state.getGalleryItem(state.currentSelectedId);
    let fileName = (item?.name || 'modelo_3d').replace(/[^a-z0-9]/gi, '_').toLowerCase().replace('.json','');

    if (!item && state.currentMode === '3d' && state.allHandles) {
        const fileItemEl = dom.galleryGrid.querySelector(`.gallery-item[data-id="${state.currentSelectedId}"]`);
        const fileItem = fileItemEl?._galleryItem;
        if (fileItem && fileItem.is3DFile) {
            fileName = fileItem.name.replace('.json','');
        }
    }
    
    // --- ¡CORRECCIÓN! Faltaba 'currentLoadedModel' ---
    // Esta función necesita acceso al 'currentLoadedModel' de generador_svga3d.js
    // Lo importaremos, aunque rompe ligeramente la modularidad.
    // Una mejor solución sería pasarlo o guardarlo en state.js.
    
    // --- Solución Temporal: Asumir que exportSceneToGLB() sabe qué exportar ---
    if (state.currentMode !== '3d') {
        ui.showStatus("No hay un modelo 3D activo para descargar.", true);
        return;
    }

    ui.showStatus("Preparando descarga GLB...", false);
    dom.download3DModelButton.disabled = true;

    try {
        const glbData = await exportSceneToGLB(); 
        const blob = new Blob([glbData], { type: 'model/gltf-binary' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.download = `${fileName}.glb`;
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        ui.showStatus("Modelo 3D (.glb) descargado.", false);
    } catch (err) {
        console.error('Error al descargar GLB:', err);
        ui.showStatus("Error al descargar el GLB. Revisa la consola.", true);
    } finally {
        dom.download3DModelButton.disabled = false;
    }
}

/**
 * Convierte el objeto 'sceneDescription' de la IA al formato JSON simple "PLANELITE".
 */
function convertAiParamsToPlanelite(sceneDesc) {
    const planelite = { geometries: {}, materials: {}, positions: {} };
    let unnamedCounter = 1;

    // --- ¡CORRECCIÓN! Manejar el formato { objects: [...] } ---
    const objects = sceneDesc.objects || [];
    if (objects.length === 0 && sceneDesc.geometries) {
        // Ya está en formato planelite (probablemente de Editor 3D)
        return sceneDesc;
    }

    for (const obj of objects) {
        const name = obj.name || `parte_${unnamedCounter++}`;
        const geoParams = { ...obj.geometry };
        const scale = obj.scale || { x: 1, y: 1, z: 1 };

        if (obj.type === 'box') {
            if (geoParams.hasOwnProperty('width')) geoParams.width *= scale.x;
            if (geoParams.hasOwnProperty('height')) geoParams.height *= scale.y;
            if (geoParams.hasOwnProperty('depth')) geoParams.depth *= scale.z;
        } else if (obj.type === 'cylinder' || obj.type === 'cone') {
            const radialScale = Math.max(scale.x, scale.z);
            if (geoParams.hasOwnProperty('radius')) geoParams.radius *= radialScale;
            if (geoParams.hasOwnProperty('radiusTop')) geoParams.radiusTop *= radialScale;
            if (geoParams.hasOwnProperty('radiusBottom')) geoParams.radiusBottom *= radialScale;
            if (geoParams.hasOwnProperty('height')) geoParams.height *= scale.y;
        } else if (obj.type === 'sphere') {
            const avgScale = Math.max(scale.x, scale.y, scale.z);
            if (geoParams.hasOwnProperty('radius')) geoParams.radius *= avgScale;
        }
        
        planelite.geometries[name] = { shape: obj.type, geoParams: geoParams };
        planelite.materials[name] = { color: obj.material.color || '#FFFFFF' };
        planelite.positions[name] = { ...obj.position };
    }
    return planelite;
}

/**
 * Maneja la exportación del modelo 3D actual al formato JSON "PLANELITE".
 */
export async function handleExportPlanelite() {
    let item = state.getGalleryItem(state.currentSelectedId);
    let fileName = (item?.name || 'modelo_3d').replace(/[^a-z0-9]/gi, '_').toLowerCase().replace('.json','');
    let sceneDesc = null;

    if (item && item.model3d) {
        // Es un item de la galería (IA o Editor 3D)
        sceneDesc = item.model3d.sceneDescription || item.model3d.data;
    } else if (state.currentMode === '3d' && state.allHandles) {
        // Es un archivo de la galería
        const fileItemEl = dom.galleryGrid.querySelector(`.gallery-item[data-id="${state.currentSelectedId}"]`);
        const fileItem = fileItemEl?._galleryItem;
        if (fileItem && fileItem.is3DFile) {
            fileName = fileItem.name.replace('.json','');
            try {
                const jsonText = await readFile(fileItem.fileHandle);
                sceneDesc = JSON.parse(jsonText); // Asumir que el archivo es el 'data'
            } catch (e) {
                 ui.showStatus("Error al leer el archivo 3D para exportar.", true);
                 return;
            }
        }
    }

    if (state.currentMode !== '3d' || !sceneDesc) {
        ui.showStatus("No hay un modelo 3D activo para exportar.", true);
        return;
    }
    
    // --- ¡CORRECCIÓN! ---
    // 'sceneDesc' puede ser { objects: [...] } (de IA) o { geometries: ... } (de Editor 3D)
    // convertAiParamsToPlanelite ahora maneja ambos casos.
    if (!sceneDesc.objects && !sceneDesc.geometries) {
        ui.showStatus("Error: El JSON del modelo 3D no tiene el formato esperado ('objects' o 'geometries').", true);
        return;
    }

    try {
        const planeliteJson = convertAiParamsToPlanelite(sceneDesc);
        const jsonString = JSON.stringify(planeliteJson, null, 4);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}_planelite.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        ui.showStatus("JSON PLANELITE descargado.", false);
    } catch (err) {
        console.error('Error al exportar JSON PLANELITE:', err);
        ui.showStatus("Error al convertir a JSON PLANELITE. Revisa la consola.", true);
    }
}

/**
 * Maneja el click en el botón "Eliminar Forma" (SOLO 2D SVG).
 */
export function handleDeleteShape() {
    const item = state.getGalleryItem(state.currentSelectedId);
    if (state.currentMode !== '2d' || !item || item.svgContent.startsWith('data:image/png') || item.isFromFile) {
        ui.showStatus("Esta acción solo está disponible en el modo de edición de SVG 2D (de sesión).", true);
        return;
    }
    
    if (deleteSelectedElement()) { // Esta función llama al callback de actualización
        ui.showStatus("Forma eliminada.", false);
    } else {
        ui.showStatus("No hay ninguna forma 2D seleccionada.", true);
    }
}

/**
 * Inicia la generación de un modelo 3D desde el SVG actual.
 */
export function handleGenerate3D() {
    const svgItem = state.getGalleryItem(state.currentSelectedId);
    const prompt = dom.prompt3D.value;
    const selectedModel = dom.modelSelect.value;
    
    if (!selectedModel) {
        ui.showStatus("Error: No hay ningún modelo de IA seleccionado.", true);
        return;
    }
    if (state.currentMode !== '2d' || !svgItem || (svgItem.svgContent && svgItem.svgContent.startsWith('data:image/png')) || svgItem.isFromFile) {
        ui.showStatus("Por favor, selecciona un dibujo SVG 2D generado en esta sesión.", true);
        return;
    }
    if (!prompt) {
        ui.showStatus("Por favor, ingresa un prompt 3D (Ej: 'hazlo de metal rojo').", true);
        return;
    }

    [dom.generate3DButton, dom.edit3DButton, dom.copy3DModelButton, dom.download3DModelButton, dom.exportPlaneliteButton].forEach(btn => btn.disabled = true);
    ui.showStatus("Añadido a la cola de generación 3D...", false);

    const newItem = {
        id: Date.now().toString(),
        name: svgItem.name + " (3D)",
        status: 'pending',
        _sourceSvgContent: svgItem.svgContent, // Temporal
        _prompt3D: prompt,
        _model: selectedModel,
        _sourceSvgId: svgItem.id
    };

    state.addToGallery(newItem);
    ui.renderGallery(getGalleryHandlers());
    dom.prompt3D.value = "";
    [dom.generate3DButton, dom.edit3DButton, dom.copy3DModelButton, dom.download3DModelButton, dom.exportPlaneliteButton].forEach(btn => btn.disabled = false);

    (async () => {
        try {
            const result = await generate3DModel(newItem._sourceSvgContent, newItem._prompt3D, newItem._model);
            state.updateGalleryItem(newItem.id, {
                status: 'completed',
                model3d: {
                    data: result.gltfJson,
                    sceneDescription: result.sceneDescription,
                    prompt: newItem._prompt3D,
                    sourceSvgId: newItem._sourceSvgId
                },
                _sourceSvgContent: undefined, _prompt3D: undefined, _model: undefined
            });
        } catch (error) {
            console.error("Error en handleGenerate3D (background):", error);
            ui.showStatus(`Error al generar 3D: ${error.message}`, true);
            state.updateGalleryItem(newItem.id, { 
                status: 'error', name: 'Error 3D',
                _sourceSvgContent: undefined, _prompt3D: undefined, _model: undefined 
            });
        } finally {
            ui.renderGallery(getGalleryHandlers());
        }
    })();
}

/**
 * Inicia la edición de un modelo 3D.
 */
export function handleEdit3D() {
    const item = state.getGalleryItem(state.currentSelectedId);
    const prompt = dom.prompt3D.value;
    const selectedModel = dom.modelSelect.value;

    if (!selectedModel) {
        ui.showStatus("Error: No hay ningún modelo de IA seleccionado.", true);
        return;
    }
    if (state.currentMode !== '3d' || !item || !item.model3d || item.isFromFile) {
        ui.showStatus("Por favor, selecciona un modelo 3D (de sesión) para editar.", true);
        return;
    }
    if (!prompt) {
        ui.showStatus("Por favor, ingresa un prompt 3D para la edición.", true);
        return;
    }
    
    const originalSceneDescription = item.model3d.sceneDescription;
    if (!originalSceneDescription) {
        ui.showStatus("Error: Este modelo 3D no se puede editar (falta descripción de escena).", true);
        return;
    }
    
    const sourceSvgId = item.model3d.sourceSvgId;
    const sourceSvgItem = state.getGalleryItem(sourceSvgId);
    if (!sourceSvgItem || !sourceSvgItem.svgContent || sourceSvgItem.svgContent.startsWith('data:image/png')) {
        ui.showStatus("Error: No se encontró el SVG 2D original. No se puede editar.", true);
        return;
    }
    const sourceSvgContent = sourceSvgItem.svgContent;

    [dom.generate3DButton, dom.edit3DButton, dom.copy3DModelButton, dom.download3DModelButton, dom.exportPlaneliteButton].forEach(btn => btn.disabled = true);
    ui.showStatus("Añadido a la cola de edición 3D...", false);

    const originalName = item.name;
    const originalModelData = item.model3d;

    state.updateGalleryItem(item.id, {
        name: item.name.replace(" (3D)", "") + " (Editando...)",
        status: 'pending'
    });
    
    if (state.currentSelectedId === item.id) {
        ui.clearPreview();
    }
    ui.renderGallery(getGalleryHandlers());
    [dom.generate3DButton, dom.edit3DButton, dom.copy3DModelButton, dom.download3DModelButton, dom.exportPlaneliteButton].forEach(btn => btn.disabled = false);

    (async () => {
        try {
            const newModelResult = await edit3DModel(originalSceneDescription, sourceSvgContent, prompt, selectedModel);
            state.updateGalleryItem(item.id, {
                name: originalName.replace(" (3D)", "") + " (3D Editado)",
                status: 'completed',
                model3d: { ...originalModelData, data: newModelResult.gltfJson, sceneDescription: newModelResult.sceneDescription, prompt: prompt }
            });
        } catch (error) {
            console.error("Error en handleEdit3D (background):", error);
            ui.showStatus(`Error al editar 3D: ${error.message}`, true);
            state.updateGalleryItem(item.id, { name: originalName, status: 'completed', model3d: originalModelData });
        } finally {
            ui.renderGallery(getGalleryHandlers());
        }
    })();
}

/**
 * Aplica la manipulación manual del viewBox (Pan/Zoom 2D).
 */
export function handleManualControls(action) {
    if (state.currentMode !== '2d' || !state.currentSelectedId) return;

    let item = state.getGalleryItem(state.currentSelectedId);
    if (!item) {
        const fileItemEl = dom.galleryGrid.querySelector(`.gallery-item[data-id="${state.currentSelectedId}"]`);
        const fileItem = fileItemEl?._galleryItem;
        if (fileItem && fileItem.svgContent) {
            item = fileItem;
        }
    }

    if (!item || !item.svgContent || item.svgContent.startsWith('data:image/png')) return;

    const newSvgContent = manipulateViewBox(item.svgContent, action);
    item.svgContent = newSvgContent;
    if (!item.isFromFile) {
        state.updateGalleryItem(state.currentSelectedId, { svgContent: newSvgContent });
    }
    
    ui.showResultInPreview(item);
}

// --- --- --- --- --- --- --- --- --- ---
// --- ¡NUEVA FUNCIÓN! ---
// --- --- --- --- --- --- --- --- --- ---
/**
 * Maneja el evento 'save3dModelToIaGallery' disparado desde el Editor 3D.
 * @param {CustomEvent} event 
 */
export async function handleSave3DModelFromEditor(event) {
    const { modelData } = event.detail;
    if (!modelData) {
        console.error("Evento 'save3dModelToIaGallery' recibido sin 'modelData'.");
        return;
    }

    // 1. Pedir un nombre al usuario
    const name = prompt("Introduce un nombre para este modelo en la galería:", "Mi Modelo 3D");
    if (!name) {
        ui.showStatus("Guardado cancelado.", true);
        return;
    }

    // 2. Crear el objeto para la galería de IA
    //    Este modelo usa el formato { geometries, materials, positions }
    //    NO es un GLTF, y no tiene 'sceneDescription', por lo que no será editable por la IA.
    const newItem = {
        id: Date.now().toString(),
        name: name,
        status: 'completed',
        isFromFile: false, // Es un item de sesión
        model3d: {
            data: modelData, // El JSON simple del Editor 3D
            sceneDescription: null, // No se puede editar con IA
            prompt: "Guardado desde Editor 3D",
            sourceSvgId: null
        },
        svgContent: null
    };

    // 3. Añadir al estado y refrescar la UI
    state.addToGallery(newItem); // Esto auto-guarda en ia_gallery.json
    ui.renderGallery(getGalleryHandlers());
    ui.showStatus(`¡Modelo '${name}' guardado en la galería!`, false);
}
// --- --- --- --- --- --- --- --- --- ---
// --- FIN NUEVA FUNCIÓN ---
// --- --- --- --- --- --- --- --- --- ---


/**
 * Devuelve un objeto con las funciones de handler
 * que la galería necesita para los clics.
 * @returns {object}
 */
export function getGalleryHandlers() {
    return {
        handleGalleryItemClick,
        handleGalleryEditClick,
        handleGalleryDeleteClick
    };
}