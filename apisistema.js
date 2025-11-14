// --- apisistema.js ---
// Gestiona el almacenamiento y la rotación de las API keys de Gemini.
// Requerido por generadorrealista.js y los nuevos módulos de IA.

const STORAGE_KEY = 'geminiApiKeys';
let keys = [];
let currentIndex = 0;

/**
 * Carga las keys desde localStorage.
 */
function loadKeys() {
    try {
        const storedKeys = localStorage.getItem(STORAGE_KEY);
        if (storedKeys) {
            keys = JSON.parse(storedKeys);
        } else {
            keys = [];
        }
        currentIndex = 0; // Resetear el índice al cargar
    } catch (e) {
        console.error("Error cargando API keys:", e);
        keys = [];
    }
}

/**
 * Guarda las keys en localStorage.
 */
function saveKeys() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    } catch (e) {
        console.error("Error guardando API keys:", e);
    }
}

/**
 * Añade una nueva API key si no existe.
 * @param {string} key 
 */
export function addApiKey(key) {
    loadKeys();
    if (key && !keys.includes(key)) {
        keys.push(key);
        saveKeys();
        console.log("API key añadida.");
    }
}

/**
 * Devuelve la cantidad de keys disponibles.
 * @returns {number}
 */
export function hasApiKeys() {
    loadKeys();
    return keys.length;
}

/**
 * Obtiene la key actual en el índice.
 * @returns {string | null}
 */
export function getCurrentKey() {
    loadKeys();
    if (keys.length === 0) {
        return null;
    }
    return keys[currentIndex];
}

/**
 * Avanza al siguiente índice y devuelve la nueva key.
 * @returns {string | null}
 */
export function rotateAndGetNextKey() {
    if (keys.length === 0) {
        return null;
    }
    currentIndex = (currentIndex + 1) % keys.length;
    console.log(`Rotando API key. Nuevo índice: ${currentIndex}`);
    return keys[currentIndex];
}

/**
 * Devuelve todas las keys (usado por la UI para mostrar).
 * @returns {string[]}
 */
export function getAllKeys() {
    loadKeys();
    return keys;
}

/**
 * Elimina una key de la lista.
 * @param {string} keyToRemove 
 */
export function removeApiKey(keyToRemove) {
    loadKeys();
    keys = keys.filter(k => k !== keyToRemove);
    saveKeys();
    console.log("API key eliminada.");
}