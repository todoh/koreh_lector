// --- app_state.js ---
// Almacena el estado global de la aplicación.

const state = {
    allHandles: {
        rootDirHandle: null,
        assetsDirHandle: null,
        terrainFileHandle: null,
        entityFileHandle: null,
        biomeFileHandle: null, 
        itemsFileHandle: null,
        craftingFileHandle: null,
    },
    loadedData: {
        terrain: null,
        entity: null,
        biome: null,
        items: null,
        crafting: null,
    },
    currentEditKey: null,
    activeJsonEditor: 'terrain',
    originalImage: null,
};

export function getHandles() { return state.allHandles; }
export function setHandles(handles) { state.allHandles = handles; }

export function getLoadedData() { return state.loadedData; }
export function getSpecificLoadedData(type) { return state.loadedData[type]; }
export function setLoadedData(type, data) { state.loadedData[type] = data; }

export function getCurrentEditKey() { return state.currentEditKey; }
export function setCurrentEditKey(key) { state.currentEditKey = key; }

export function getActiveEditor() { return state.activeJsonEditor; }
export function setActiveEditor(editor) { state.activeJsonEditor = editor; }

export function getOriginalImage() { return state.originalImage; }
export function setOriginalImage(image) { state.originalImage = image; }