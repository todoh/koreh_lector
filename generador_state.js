// =================================================================
// ARCHIVO: generador_state.js (NUEVO)
// CONTIENE:
// 1. El estado de la aplicación (variables).
// 2. Funciones "mutadoras" para modificar ese estado de forma segura.
// =================================================================

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// --- ¡NUEVAS IMPORTACIONES! ---
import { saveJsonFile, readFile } from './fsa.js';

// --- Estado ---
export let svgGallery = [];
export let currentSelectedId = null;
export let currentMode = 'none'; // 'none', '2d', '3d'
export let allHandles = null;
export let gltfLoader = new GLTFLoader();

// --- Mutadores de Estado ---

export function setAllHandles(handles) {
    allHandles = handles;
}

export function setCurrentSelectedId(id) {
    currentSelectedId = id;
}

export function setCurrentMode(mode) {
    currentMode = mode;
}

export function getGalleryItem(id) {
    return svgGallery.find(i => i.id === id);
}

export function getSvgGallery() {
    return svgGallery;
}

export function setGallery(newGallery) {
    svgGallery = newGallery;
    autoSaveGalleryState(); // Autoguardar al modificar
}

export function addToGallery(item) {
    svgGallery.push(item);
    autoSaveGalleryState(); // Autoguardar al modificar
}

export function updateGalleryItem(id, updates) {
    const itemIndex = svgGallery.findIndex(item => item.id === id);
    if (itemIndex > -1) {
        svgGallery[itemIndex] = { ...svgGallery[itemIndex], ...updates };
        autoSaveGalleryState(); // Autoguardar al modificar
    }
}

export function deleteGalleryItem(id) {
    svgGallery = svgGallery.filter(i => i.id !== id);
    autoSaveGalleryState(); // Autoguardar al modificar
}

/**
 * ¡NUEVO! Carga la galería desde ia_gallery.json al iniciar.
 */
export async function loadGalleryState() {
    if (!allHandles || !allHandles.iaGalleryHandle) {
        console.warn("loadGalleryState: No iaGalleryHandle found.");
        return;
    }

    try {
        const jsonText = await readFile(allHandles.iaGalleryHandle);
        const items = JSON.parse(jsonText);
        if (Array.isArray(items)) {
            // Importante: Asegurarse de que no tengan isFromFile: true
            svgGallery = items.map(item => ({ ...item, isFromFile: false }));
            console.log(`Galería de IA cargada con ${svgGallery.length} items.`);
        } else {
            svgGallery = [];
        }
    } catch (e) {
        console.warn(`No se pudo cargar ia_gallery.json (puede que sea nuevo): ${e.message}`);
        svgGallery = [];
    }
}

/**
 * ¡NUEVO! Guardado explícito para el botón "Guardar".
 */
export async function saveGalleryState() {
    if (!allHandles || !allHandles.iaGalleryHandle) {
        throw new Error("No se encontró el manejador de ia_gallery.json.");
    }
    // Filtra solo los items generados por la sesión (no los de /SVG o /assets/3d)
    const itemsToSave = svgGallery.filter(item => !item.isFromFile);
    await saveJsonFile(allHandles.iaGalleryHandle, itemsToSave);
}

/**
 * ¡NUEVO! Autoguardado "fire-and-forget" que se llama en las mutaciones.
 */
function autoSaveGalleryState() {
    if (!allHandles || !allHandles.iaGalleryHandle) {
        // No spam logs, puede que el handle no esté listo
        return;
    }
    
    // Lanzar el guardado sin await
    (async () => {
        try {
            const itemsToSave = svgGallery.filter(item => !item.isFromFile);
            await saveJsonFile(allHandles.iaGalleryHandle, itemsToSave);
            console.log("Autoguardado de Galería IA completo.");
        } catch (e) {
            console.error("Error en autoguardado de Galería IA:", e);
        }
    })();
}