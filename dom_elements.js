// --- dom_elements.js ---
// Exporta referencias cacheadas a elementos clave del DOM.

// Raíz
export const $selectRootBtn = document.getElementById('select-root-btn');
export const $folderStatus = document.getElementById('folder-status');
export const $mainEditorContainer = document.getElementById('main-editor-container');

// Pestañas JSON
export const $tabTerrain = document.getElementById('tab-terrain');
export const $tabEntity = document.getElementById('tab-entity');
export const $tabBiome = document.getElementById('tab-biome'); 
export const $tabItems = document.getElementById('tab-items');
export const $tabCrafting = document.getElementById('tab-crafting');
export const $tabAssets = document.getElementById('tab-assets');
export const $tabIa = document.getElementById('tab-ia');
// --- Añadido ---
export const $tabIaSvg3d = document.getElementById('tab-ia3d');
export const $tabEditor3d = document.getElementById('tab-editor3d');
// --- Fin Añadido ---

// Contenido de Pestañas
export const $tabContentTerrain = document.getElementById('tab-content-terrain');
export const $tabContentEntity = document.getElementById('tab-content-entity');
export const $tabContentBiome = document.getElementById('tab-content-biome'); 
export const $tabContentItems = document.getElementById('tab-content-items');
export const $tabContentCrafting = document.getElementById('tab-content-crafting');
export const $tabContentAssets = document.getElementById('tab-content-assets');
export const $tabContentIa = document.getElementById('tab-content-ia');
export const $iaGeneratorContainer = document.getElementById('ia-generator-container');
// --- Añadido ---
 export const $tabContentIaSvg3d = document.getElementById('tab-content-ia3d');
export const $tabContentEditor3d = document.getElementById('tab-content-editor3d');
// --- Fin Añadido ---

// Contenedores de Galería
export const $galleryContainerTerrain = document.getElementById('gallery-container-terrain');
export const $galleryContainerEntity = document.getElementById('gallery-container-entity');
export const $galleryContainerBiome = document.getElementById('gallery-container-biome'); 
export const $galleryContainerItems = document.getElementById('gallery-container-items');

// Editores Especiales
export const $biomeWeightsList = document.getElementById('biome-weights-list');
export const $craftingEditorContainer = document.getElementById('crafting-editor-container');

// Botones "Añadir"
export const $addNewTerrainItemBtn = document.getElementById('add-new-terrain-item-btn');
export const $addNewEntityItemBtn = document.getElementById('add-new-entity-item-btn');
export const $addNewBiomeItemBtn = document.getElementById('add-new-biome-item-btn');
export const $addNewItemBtn = document.getElementById('add-new-item-btn');

// Botones "Guardar"
export const $saveTerrainBtn = document.getElementById('save-terrain-btn');
export const $saveEntityBtn = document.getElementById('save-entity-btn');
export const $saveBiomeBtn = document.getElementById('save-biome-btn'); 
export const $saveItemsBtn = document.getElementById('save-items-btn');
export const $saveCraftingBtn = document.getElementById('save-crafting-btn');
// --- ¡NUEVO! Botón Añadir Mesa Crafteo ---
export const $addNewCraftingTableBtn = document.getElementById('add-new-crafting-table-btn');

// Modal
export const $editorModal = document.getElementById('editor-modal');
export const $modalTitle = document.getElementById('modal-title');
export const $modalFormContent = document.getElementById('modal-form-content');
export const $modalSaveBtn = document.getElementById('modal-save-btn');
export const $modalCancelBtn = document.getElementById('modal-cancel-btn');
export const $modalCancelBtn2 = document.getElementById('modal-cancel-btn-2');

// Assets
export const $uploadNewAssetBtn = document.getElementById('upload-new-asset-btn');
export const $canvas = document.getElementById('resize-canvas');
export const $assetGridContainer = document.getElementById('asset-grid-container');

// --- ¡NUEVO! Sub-pestañas de Galería ---
export const $assetTabBtnPng = document.getElementById('asset-tab-btn-png');
export const $assetTabBtnSvg = document.getElementById('asset-tab-btn-svg');
export const $assetTabBtn3d = document.getElementById('asset-tab-btn-3d');

export const $assetTabContentPng = document.getElementById('asset-tab-content-png');
export const $assetTabContentSvg = document.getElementById('asset-tab-content-svg');
export const $assetTabContent3d = document.getElementById('asset-tab-content-3d');

export const $svgGridContainer = document.getElementById('svg-grid-container');
export const $3dGridContainer = document.getElementById('3d-grid-container');
// --- FIN NUEVO ---