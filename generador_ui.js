// =================================================================
// ARCHIVO: generador_ui.js (NUEVO)
// CONTIENE:
// 1. Funciones dedicadas a *actualizar* la interfaz de usuario.
// 2. Lógica de renderizado de galería, vista previa, loaders, etc.
// =================================================================

import { dom } from './generador_doms.js'; // <-- CORREGIDO
import * as state from './generador_state.js';
import { init3DViewer, clear3DViewer, renderModel } from './generador_svga3d.js';
import { makeSvgInteractive, deactivateSvgInteraction } from './generador_svginteract.js';
import { init3DPreview } from './gallery_3d_preview.js';

// --- Funciones de UI ---

export function showLoader(isLoading, text = "Procesando...") {
    if (isLoading) {
        dom.loader.querySelector('p').textContent = text;
        dom.loader.classList.remove('hidden');
    } else {
        dom.loader.classList.add('hidden');
    }
}

export function showStatus(message, isError = false) {
    dom.statusMessage.textContent = message;
    dom.statusMessage.className = isError ? 'status-message status-error' : 'status-message status-success';
    
    setTimeout(() => {
        if (dom.statusMessage.textContent === message) {
            dom.statusMessage.textContent = "";
        }
    }, 3000);
}

export function showResultInPreview(item) {
    const { svgContent, prompt, id } = item;
    
    clearPreviewArea();
    state.setCurrentMode('2d');
    state.setCurrentSelectedId(id);

    if (svgContent.startsWith('data:image/png')) {
        const img = document.createElement('img');
        img.src = svgContent;
        img.alt = item.name;
        dom.previewArea.appendChild(img);

        dom.actionsSection.classList.remove('hidden');
        dom.downloadSvgButton.textContent = "Descargar PNG";
        
        dom.copySvgButton.classList.add('hidden');
        dom.deleteShapeButton.classList.add('hidden');
        dom.svgCodeWrapper.classList.add('hidden');
        dom.manualControls.classList.add('hidden');
        dom.controls3DSection.classList.add('hidden');

    } else {
        let svgElement;
        try {
            const doc = new DOMParser().parseFromString(svgContent, "image/svg+xml");
            svgElement = doc.documentElement;
            if (svgElement.tagName === 'parsererror' || !svgElement) {
                throw new Error('Error al parsear el SVG.');
            }
        } catch (e) {
            console.error("Error parseando SVG:", e);
            showStatus("Error: El SVG está corrupto.", true);
            dom.previewArea.innerHTML = "<p>Error: SVG corrupto.</p>";
            return;
        }

        dom.previewArea.appendChild(svgElement);
        makeSvgInteractive(svgElement, (updatedSvgString) => {
            if (!item.isFromFile) {
                state.updateGalleryItem(state.currentSelectedId, { svgContent: updatedSvgString });
            }
            dom.svgCode.textContent = updatedSvgString;
        });

        dom.svgCode.textContent = svgContent;
        dom.actionsSection.classList.remove('hidden');
        dom.svgCodeWrapper.classList.remove('hidden');
        dom.manualControls.classList.remove('hidden');
        
        dom.downloadSvgButton.textContent = "Descargar SVG";
        dom.copySvgButton.classList.remove('hidden');
        dom.deleteShapeButton.classList.remove('hidden');
        
        dom.controls3DSection.classList.remove('hidden');
        dom.prompt3D.value = "";
        dom.copy3DModelButton.classList.add('hidden');
        dom.download3DModelButton.classList.add('hidden');
        dom.exportPlaneliteButton.classList.add('hidden');
    }

    highlightGalleryItem(id);
}

export async function show3DModelInPreview(item) {
    const { model3d, id, name } = item;

    clearPreviewArea();
    state.setCurrentMode('3d');
    state.setCurrentSelectedId(id);

    try {
        init3DViewer(dom.previewArea);
        
        if (model3d && model3d.data) {
            await renderModel(model3d.data);
            dom.prompt3D.value = model3d.prompt || "";
        } else {
            throw new Error("El item no contiene datos de modelo 3D válidos.");
        }
    } catch (e) {
        console.error("Error al inicializar o renderizar el visor 3D:", e);
        showStatus("Error al mostrar el modelo 3D.", true);
        dom.previewArea.innerHTML = "<p>Error al mostrar el modelo 3D.</p>";
        return;
    }
    
    dom.controls3DSection.classList.remove('hidden');
    dom.copy3DModelButton.classList.remove('hidden'); 
    dom.download3DModelButton.classList.remove('hidden'); 
    dom.exportPlaneliteButton.classList.remove('hidden');
    
    if (item.model3d && !item.model3d.sceneDescription) {
        dom.edit3DButton.disabled = true;
        dom.prompt3D.placeholder = "No se puede editar este modelo (falta descripción de escena).";
    } else {
        dom.edit3DButton.disabled = false;
        dom.prompt3D.placeholder = "Ej: Hazlo grueso y de color rojo metálico";
    }
    
    dom.actionsSection.classList.add('hidden');
    dom.svgCodeWrapper.classList.add('hidden');
    dom.manualControls.classList.add('hidden');
    
    highlightGalleryItem(id);
}

export function clearPreview() {
    clearPreviewArea();
    state.setCurrentSelectedId(null);
    state.setCurrentMode('none');
    
    dom.container.querySelectorAll('.gallery-item.selected').forEach(el => el.classList.remove('selected'));
}

export function clearPreviewArea() {
    deactivateSvgInteraction();
    
    if (dom.previewArea) {
        clear3DViewer(dom.previewArea);
        dom.previewArea.innerHTML = "";
    }
    
    dom.actionsSection?.classList.add('hidden');
    dom.svgCodeWrapper?.classList.add('hidden');
    dom.manualControls?.classList.add('hidden');
    dom.controls3DSection?.classList.add('hidden');
    
    if (dom.svgCode) {
        dom.svgCode.textContent = "...";
    }
}

export function highlightGalleryItem(id) {
    dom.galleryGrid.querySelectorAll('.gallery-item.selected').forEach(el => el.classList.remove('selected'));
    const itemEl = dom.galleryGrid.querySelector(`.gallery-item[data-id="${id}"]`);
    if (itemEl) {
        itemEl.classList.add('selected');
    }
}

export async function renderGallery(handlers) {
    if (!dom.galleryGrid) return;
    dom.galleryGrid.innerHTML = ""; 
    
    let itemsRendered = 0;
    const currentHandles = state.allHandles;
    const currentSvgGallery = state.svgGallery;

    // --- 1. Renderizar items de la sesión (svgGallery) ---
    const sortedSessionItems = [...currentSvgGallery].sort((a, b) => parseInt(b.id) - parseInt(a.id));

    sortedSessionItems.forEach(item => {
        const itemEl = createGalleryCard(item, handlers);
        dom.galleryGrid.appendChild(itemEl);
        itemsRendered++;
    });

    // --- 2. Renderizar archivos de /SVG ---
    if (currentHandles && currentHandles.svgDirHandle) {
        try {
            for await (const entry of currentHandles.svgDirHandle.values()) {
                if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.svg')) {
                    const file = await entry.getFile();
                    const svgText = await file.text();
                    
                    const fileItem = {
                        id: `file-svg-${entry.name}`,
                        name: entry.name,
                        svgContent: svgText,
                        isFromFile: true,
                        fileHandle: entry
                    };
                    const itemEl = createGalleryCard(fileItem, handlers);
                    dom.galleryGrid.appendChild(itemEl);
                    itemsRendered++;
                }
            }
        } catch (e) {
            console.warn("Error al leer la carpeta /SVG", e);
        }
    }

    // --- 3. Renderizar archivos de /assets/3d ---
    const modelPreviewsToInit = [];
    if (currentHandles && currentHandles.assets3dDirHandle) {
        try {
            for await (const entry of currentHandles.assets3dDirHandle.values()) {
                if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.json')) {
                    const fileItem = {
                        id: `file-3d-${entry.name}`,
                        name: entry.name,
                        is3DFile: true,
                        isFromFile: true,
                        fileHandle: entry
                    };
                    const { itemEl, canvas } = createGalleryCard(fileItem, handlers);
                    dom.galleryGrid.appendChild(itemEl);
                    if (canvas) {
                        modelPreviewsToInit.push({ canvas, handle: entry });
                    }
                    itemsRendered++;
                }
            }
        } catch (e) {
            console.warn("Error al leer la carpeta /assets/3d", e);
        }
    }

    // --- 4. Mensaje de Galería Vacía ---
    if (itemsRendered === 0) {
        dom.galleryGrid.innerHTML = "<p>Tu galería está vacía. ¡Genera un dibujo o añade archivos a /SVG y /assets/3d!</p>";
    }
    
    // --- 5. Inicializar previews 3D ---
    if (modelPreviewsToInit.length > 0) {
        function initNextPreview(index) {
            if (index >= modelPreviewsToInit.length) return;
            const { canvas, handle } = modelPreviewsToInit[index];
            requestAnimationFrame(() => {
                try {
                    init3DPreview(canvas, handle);
                } catch (e) {
                    console.error(`Error al renderizar preview 3D: ${handle.name}`, e);
                }
                initNextPreview(index + 1);
            });
        }
        initNextPreview(0);
    }
}

/**
 * Crea el DOM para una tarjeta de galería.
 * @param {object} item - El objeto de item
 * @param {object} handlers - Objeto con { handleGalleryItemClick, handleGalleryEditClick, handleGalleryDeleteClick }
 * @returns {HTMLElement | {itemEl: HTMLElement, canvas: HTMLCanvasElement}}
 */
function createGalleryCard(item, handlers) {
    const itemEl = document.createElement('div');
    itemEl.className = 'gallery-item';
    itemEl.dataset.id = item.id;
    itemEl.tabIndex = 0;
    
    if (item.id === state.currentSelectedId) {
        itemEl.classList.add('selected');
    }

    // Lógica de renderizado de la tarjeta...
    if (item.status === 'pending') {
        itemEl.classList.add('status-pending');
        itemEl.innerHTML = `
            <div class="gallery-item-status">
                <div class="spinner-small"></div>
                <span>Generando...</span>
            </div>
            <img src="https://placehold.co/100x100/f3f4f6/d1d5db?text=..." alt="Generando">
            <p class="gallery-item-name">${item.name}</p>
        `;
    } else if (item.status === 'error') {
        itemEl.classList.add('status-error');
        itemEl.innerHTML = `
            <div class="gallery-item-status">
                <span>Error</span>
            </div>
            <img src="https://placehold.co/100x100/fecaca/dc2626?text=Error" alt="Error de generación">
            <p class="gallery-item-name">${item.name}</p>
        `;
    } else if (item.svgContent) { 
        let imageTag;
        if (item.svgContent.startsWith('data:image/png')) {
            imageTag = `<img src="${item.svgContent}" alt="${item.name}">`;
        } else {
            const svgDataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(item.svgContent);
            imageTag = `<img src="${svgDataUrl}" alt="${item.name}">`;
        }
        
        const actionsHTML = !item.isFromFile ? `
            <div class="gallery-item-actions">
                <button class="gallery-item-btn edit" data-action="edit" title="Editar">✏️</button>
                <button class="gallery-item-btn delete" data-action="delete" title="Eliminar">❌</button>
            </div>` : '';
        
        itemEl.innerHTML = `${actionsHTML}${imageTag}<p class="gallery-item-name">${item.name}</p>`;
    } else if (item.model3d) { 
        const placeholder = `https://placehold.co/100x100/374151/e5e7eb?text=3D`;
        const actionsHTML = !item.isFromFile ? `
            <div class="gallery-item-actions">
                <button class="gallery-item-btn edit" data-action="edit" title="Editar">✏️</button>
                <button class="gallery-item-btn delete" data-action="delete" title="Eliminar">❌</button>
            </div>` : '';
            
        itemEl.innerHTML = `${actionsHTML}<img src="${placeholder}" alt="${item.name}"><p class="gallery-item-name">${item.name}</p>`;
        itemEl.classList.add('item-3d');
    } else if (item.is3DFile) {
        const canvasId = `canvas-preview-${item.id}`;
        itemEl.innerHTML = `
            <div class="model-3d-preview-canvas-wrapper" style="height: 100px; background: #1f2937; border-bottom: 1px solid #4b5563;">
                <canvas id="${canvasId}" class="model-3d-preview-canvas" style="height: 100px !important; width: 100%;"></canvas>
            </div>
            <p class="gallery-item-name">${item.name}</p>
        `;
        itemEl.classList.add('item-3d');
        
        const canvas = itemEl.querySelector(`#${canvasId}`);
        itemEl._galleryItem = item; 
        itemEl.addEventListener('click', (e) => handlers.handleGalleryItemClick(itemEl._galleryItem));
        return { itemEl, canvas };
    }

    // Adjuntar el item y el listener
    itemEl._galleryItem = item;
    itemEl.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        const galleryItem = itemEl._galleryItem;
        
        if (action === 'edit') {
            handlers.handleGalleryEditClick(galleryItem);
        } else if (action === 'delete') {
            handlers.handleGalleryDeleteClick(galleryItem);
        } else if (galleryItem.status === 'completed' || galleryItem.isFromFile) {
            handlers.handleGalleryItemClick(galleryItem);
        }
    });
    
    return itemEl;
}

export function showDeleteConfirmation() {
    dom.modalImproveConfirm.parentElement.style.display = 'none';
    dom.modalDeleteConfirm.classList.remove('hidden');
}

export function hideDeleteConfirmation() {
    dom.modalImproveConfirm.parentElement.style.display = 'flex';
    dom.modalDeleteConfirm.classList.add('hidden');
}