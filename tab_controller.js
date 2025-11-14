// --- tab_controller.js ---
// Maneja la lógica de cambio de pestañas.
// ¡CORREGIDO! Ahora incluye la carga dinámica de scripts y la importación de AppState.

import * as DOM from './dom_elements.js';
import { getActiveEditor, setActiveEditor, getHandles } from './app_state.js';
// --- ¡IMPORTACIÓN CORREGIDA/AÑADIDA! ---
// Importamos 'getHandles' directamente y también todo como 'AppState' (aunque 'getHandles' es más limpio)
// Usaremos 'getHandles' que ya importamos.
import * as AppState from './app_state.js'; 

// --- Añadido ---
// Banderas para asegurar que los scripts se carguen solo una vez
let ia3dLoaded = false;
let editor3dLoaded = false;
// --- Fin Añadido ---

const $tabs = {
    terrain: DOM.$tabTerrain,
    entity: DOM.$tabEntity,
    biome: DOM.$tabBiome,
    items: DOM.$tabItems,
    crafting: DOM.$tabCrafting,
    assets: DOM.$tabAssets,
    ia: DOM.$tabIa,
    // --- Añadido ---
    iasvg3d: DOM.$tabIaSvg3d,
    editor3d: DOM.$tabEditor3d,
    // --- Fin Añadido ---
};

const $tabContents = {
    terrain: DOM.$tabContentTerrain,
    entity: DOM.$tabContentEntity,
    biome: DOM.$tabContentBiome,
    items: DOM.$tabContentItems,
    crafting: DOM.$tabContentCrafting,
    assets: DOM.$tabContentAssets,
    ia: DOM.$tabContentIa,
    // --- Añadido ---
    iasvg3d: DOM.$tabContentIaSvg3d,
    editor3d: DOM.$tabContentEditor3d,
    // --- Fin Añadido ---
};

function switchTab(tabName) {
    // No cambiar editor activo si estamos editando un asset
    // --- Modificado ---
    if (getActiveEditor() !== 'assets' || ['assets', 'ia', 'iasvg3d', 'editor3d'].includes(tabName)) {
    // --- Fin Modificado ---
        setActiveEditor(tabName);
    }

    for (const key in $tabContents) {
        // --- Modificado (con comprobación de nulidad) ---
        if ($tabContents[key]) {
            $tabContents[key].classList.add('hidden');
        }
        if ($tabs[key]) {
            $tabs[key].setAttribute('aria-selected', 'false');
        }
        // --- Fin Modificado ---
    }

    if ($tabContents[tabName]) {
        $tabContents[tabName].classList.remove('hidden');
        $tabs[tabName].setAttribute('aria-selected', 'true');
    }

    // --- --- --- --- --- --- --- --- --- --- ---
    // --- ¡INICIO DE LÓGICA AÑADIDA! ---
    // Cargar los módulos dinámicamente al hacer clic por primera vez.
    // --- --- --- --- --- --- --- --- --- --- ---
    if (tabName === 'iasvg3d') {
        if (!ia3dLoaded) {
            ia3dLoaded = true; // Marcar como cargando
            console.log("Cargando módulo ⚡ IA SVG y 3D...");
            import('./generador_main.js')
                .then(module => {
                    // Pasar el contenedor de la pestaña y los handles
                    // ¡NOTA! Necesitamos pasar los handles desde app_state
                    
                    // --- ¡LÍNEA CORREGIDA! ---
                    // Ahora 'AppState.getHandles()' es una llamada válida gracias a la importación.
                    const handles = AppState.getHandles(); 
                    // --- --- --- --- --- --- ---
                    
                    module.initSvgMaker(DOM.$tabContentIaSvg3d, handles);
                })
                .catch(err => {
                    console.error("Error al cargar el módulo SVG Maker:", err);
                    DOM.$tabContentIaSvg3d.innerHTML = `<p class="text-red-400 p-4">Error al cargar el módulo SVG y 3D. ${err.message}</p>`;
                    ia3dLoaded = false; // Permitir reintento
                });
        }
    } else if (tabName === 'editor3d') {
        if (!editor3dLoaded) {
            editor3dLoaded = true; // Marcar como cargando
            console.log("Cargando módulo 📦 Editor 3D...");
            import('./editor3d_main.js')
                .then(() => {
                    // El módulo del editor 3D se auto-inicializa al importarse
                    console.log("Módulo 📦 Editor 3D cargado.");
                })
                .catch(err => {
                    console.error("Error al cargar el módulo del Editor 3D:", err);
                    DOM.$tabContentEditor3d.innerHTML = `<p class="text-red-400 p-4">Error al cargar el Editor 3D. ${err.message}</p>`;
                    editor3dLoaded = false; // Permitir reintento
                });
        }
    }
    // --- --- --- --- --- --- --- --- --- --- ---
    // --- ¡FIN DE LÓGICA AÑADIDA! ---
    // --- --- --- --- --- --- --- --- --- --- ---
}

export function initTabs() {
    for (const key in $tabs) {
        if ($tabs[key]) {
            $tabs[key].addEventListener('click', () => switchTab(key));
        }
    }
}