// --- editorcreador/editor3d_controls.js ---
// (Anteriormente 'editor 3d/controls.js')

import * as THREE from 'three';
// --- ¡RUTAS MODIFICADAS! ---
import * as logic from './editor3d_logic.js';
import { refreshAll } from './editor3d_main.js';
import { getCachedAssetUrl } from './assets.js';
import { ferrariModelData, humanoidBoxModelData, humanoidRealModelData } from './editor3d_models.js';
// --- FIN DE MODIFICACIÓN ---

// --- REFERENCIA AL CONTENEDOR GLOBAL ---
let globalModelContainer = null;

// --- ELEMENTOS UI v2.0 ---
export const uiElements = {
    canvas: document.getElementById('main-canvas'),
    loadingOverlay: document.getElementById('loading-overlay'),
    modelSelect: document.getElementById('model-select'),
    partList: document.getElementById('part-list'),
    addPartBtn: document.getElementById('add-part-btn'),
    removePartBtn: document.getElementById('remove-part-btn'),
    propertyEditor: document.getElementById('property-editor'),
    partNameLabel: document.getElementById('part-name-label'),
    partShapeSelect: document.getElementById('part-shape'),
    geometryParamsInputs: document.getElementById('geometry-params-inputs'),
    positionInputs: document.getElementById('position-inputs'),
    rotationInputs: document.getElementById('rotation-inputs'),
    partColorInput: document.getElementById('part-color'),
    // --- MODIFICADO ---
    partTextureInput: document.getElementById('part-texture'), // Ahora es un input[type="hidden"]
    partTexturePreview: document.getElementById('part-texture-preview'),
    partTextureKeyDisplay: document.getElementById('part-texture-key-display'),
    partParentSelect: document.getElementById('part-parent'),
    exportJsonBtn: document.getElementById('export-json-btn'),
    // --- ¡NUEVO! Botón de exportar a galería ---
    exportJsonToGalleryBtn: document.getElementById('export-jsontogallery-btn'),
    // --- FIN NUEVO ---
    importJsonBtn: document.getElementById('import-json-btn'),
    jsonIOArea: document.getElementById('json-io-area'),
    globalControlsPanel: document.getElementById('global-controls-panel'),
    globalPositionInputs: document.getElementById('global-position-inputs'),
    globalRotationInputs: document.getElementById('global-rotation-inputs'),
    globalScaleInputs: document.getElementById('global-scale-inputs'),
    globalMaxHeightInput: document.getElementById('global-max-height'),
    globalApplyHeightBtn: document.getElementById('global-apply-height-btn'),
};

// --- CONFIGURACIÓN DE LISTENERS ---

export function setupUIListeners(modelContainer) {
    globalModelContainer = modelContainer; // Guardar referencia
    
    setupGlobalControlsUI();

    uiElements.modelSelect.addEventListener('change', (e) => loadPreset(e.target.value));
    uiElements.addPartBtn.addEventListener('click', onAddPart);
    uiElements.removePartBtn.addEventListener('click', onRemovePart);
    
    uiElements.partList.addEventListener('click', (e) => {
        if (e.target.dataset.name) {
            selectPartUI(e.target.dataset.name);
        }
    });

    uiElements.partShapeSelect.addEventListener('change', onShapeChange);

    uiElements.propertyEditor.addEventListener('input', (e) => {
        if (e.target.type === 'range') {
            const numInput = document.getElementById(e.target.id.replace('-range', '-num'));
            if(numInput) numInput.value = e.target.value;
            updateSelectedPartFromUI();
        } else if (e.target.type === 'number') {
            const rangeEl = document.getElementById(e.target.id.replace('-num', '-range'));
            if(rangeEl) rangeEl.value = e.target.value;
            updateSelectedPartFromUI();
        } else if (e.target.type === 'color') {
            updateSelectedPartFromUI();
        }
    });
    uiElements.propertyEditor.addEventListener('change', (e) => {
        // --- MODIFICADO ---
        // Ahora el input de textura es 'hidden', por lo que no se dispara 'change'
        // El botón 'open-image-selector' se maneja en main.js
        // y el 'input' oculto se actualiza desde allí.
        // Solo necesitamos 'change' para el 'select'
        if (e.target.tagName === 'SELECT') {
        // --- FIN MODIFICADO ---
            updateSelectedPartFromUI();
        }
    });

    uiElements.globalControlsPanel.addEventListener('input', (e) => {
        if (e.target.type === 'range') {
            const numInput = document.getElementById(e.target.id.replace('-range', '-num'));
            if(numInput) numInput.value = e.target.value;
        } else if (e.target.type === 'number') {
            const rangeEl = document.getElementById(e.target.id.replace('-num', '-range'));
            if(rangeEl) rangeEl.value = e.target.value;
        }
        updateGlobalTransform();
    });
    uiElements.globalApplyHeightBtn.addEventListener('click', onApplyMaxHeight);

    uiElements.exportJsonBtn.addEventListener('click', onExportJson);
    // --- ¡NUEVO! Listener para exportar a galería ---
    uiElements.exportJsonToGalleryBtn.addEventListener('click', onExportJsonToGallery);
    // --- FIN NUEVO ---
    uiElements.importJsonBtn.addEventListener('click', onImportJson);
}

// --- MANEJADORES de EVENTOS ---

export function loadPreset(presetName) {
    uiElements.modelSelect.value = presetName;
    uiElements.jsonIOArea.value = '';
    
    let dataToLoad = {};
    if (presetName === 'ferrari') {
        dataToLoad = ferrariModelData;
    } else if (presetName === 'humanoid_box') {
        dataToLoad = humanoidBoxModelData;
    } else if (presetName === 'humanoid_real') {
        dataToLoad = humanoidRealModelData;
    }
    
    logic.parseAndLoadJson(dataToLoad);
    refreshAll();
    
    if (globalModelContainer) {
        globalModelContainer.position.set(0, 0, 0);
        globalModelContainer.rotation.set(0, 0, 0);
        globalModelContainer.scale.set(1, 1, 1);
    }
    updateGlobalControlsUIFromModel();
    
    selectPartUI(null);
}

function onAddPart() {
    const newName = logic.addPart();
    refreshAll();
    selectPartUI(newName);
}

function onRemovePart() {
    const nameToRemove = logic.selectedPartName;
    if (!nameToRemove || !logic.getPart(nameToRemove)) return;

    uiElements.partNameLabel.textContent = `¿Seguro? Haz click en 'Eliminar' de nuevo.`;
    uiElements.removePartBtn.onclick = () => {
        logic.removePart(nameToRemove);
        selectPartUI(null);
        refreshAll();
        uiElements.removePartBtn.onclick = onRemovePart;
    };

    setTimeout(() => {
        if (logic.selectedPartName === nameToRemove) {
            uiElements.removePartBtn.onclick = onRemovePart;
            if (logic.getPart(nameToRemove)) {
                uiElements.partNameLabel.textContent = nameToRemove;
            }
        }
    }, 3000);
}

function onShapeChange(e) {
    if (!logic.selectedPartName) return;
    const part = logic.getPart(logic.selectedPartName);
    if (!part) return;

    part.shape = e.target.value;
    part.geoParams = logic.getDefaultGeoParams(part.shape);
    
    refreshAll();
}

function updateSelectedPartFromUI() {
    if (!logic.selectedPartName) return;
    const part = logic.getPart(logic.selectedPartName);
    if (!part) return;

    const params = {};
    const paramInputs = uiElements.geometryParamsInputs.querySelectorAll('input[type="number"]');
    paramInputs.forEach(input => {
        const paramName = input.dataset.id;
        params[paramName] = parseFloat(input.value) || 0;
    });
    part.geoParams = params;
    part.shape = uiElements.partShapeSelect.value;

    part.x = parseFloat(document.getElementById('part-x-num').value) || 0;
    part.y = parseFloat(document.getElementById('part-y-num').value) || 0;
    part.z = parseFloat(document.getElementById('part-z-num').value) || 0;

    part.rx = parseFloat(document.getElementById('part-rx-num').value) || 0;
    part.ry = parseFloat(document.getElementById('part-ry-num').value) || 0;
    part.rz = parseFloat(document.getElementById('part-rz-num').value) || 0;

    part.color = uiElements.partColorInput.value;
    part.texture = uiElements.partTextureInput.value; // Lee del input[type="hidden"]
    part.parent = uiElements.partParentSelect.value;
    
    refreshAll();
}

function onExportJson() {
    const scale = globalModelContainer ? globalModelContainer.scale : { x: 1, y: 1, z: 1 };
    const output = logic.buildExportJson(scale);
    const jsonString = JSON.stringify(output, null, 4);
    uiElements.jsonIOArea.value = jsonString;
}

// --- --- --- --- --- --- --- --- --- ---
// --- ¡NUEVA FUNCIÓN! ---
// --- --- --- --- --- --- --- --- --- ---
/**
 * Envía el modelo 3D actual a la Galería de IA a través de un evento global.
 */
function onExportJsonToGallery() {
    if (!globalModelContainer) return;
    
    // 1. Obtener los datos del modelo (formato { geometries, materials, positions })
    const scale = globalModelContainer.scale;
    const modelData = logic.buildExportJson(scale);
    
    // 2. Despachar el evento global
    try {
        // El módulo 'generador_main.js' estará escuchando este evento
        window.dispatchEvent(new CustomEvent('save3dModelToIaGallery', { 
            detail: { modelData: modelData } 
        }));
        
        // 3. Mostrar feedback visual en el botón
        const btn = uiElements.exportJsonToGalleryBtn;
        const originalText = btn.textContent;
        btn.textContent = "¡Enviado a Galería!";
        btn.disabled = true;
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 2000);

    } catch (e) {
        console.error("Error al despachar evento 'save3dModelToIaGallery':", e);
        alert("Error al enviar a la galería. Revisa la consola.");
    }
}
// --- --- --- --- --- --- --- --- --- ---
// --- FIN NUEVA FUNCIÓN ---
// --- --- --- --- --- --- --- --- --- ---

function onImportJson() {
    try {
        const json = JSON.parse(uiElements.jsonIOArea.value);
        logic.parseAndLoadJson(json);
        refreshAll();
        
        if (globalModelContainer) {
            globalModelContainer.position.set(0, 0, 0);
            globalModelContainer.rotation.set(0, 0, 0);
            globalModelContainer.scale.set(1, 1, 1);
        }
        updateGlobalControlsUIFromModel();
        
        uiElements.jsonIOArea.value = '';
    } catch (err) {
        console.error("Error al importar JSON:", err);
        uiElements.jsonIOArea.value = `ERROR: JSON no válido.\n\n${err.message}`;
    }
}

function updateGlobalTransform() {
    if (!globalModelContainer) return;

    let posX = parseFloat(document.getElementById('global-x-num').value);
    let posY = parseFloat(document.getElementById('global-y-num').value);
    let posZ = parseFloat(document.getElementById('global-z-num').value);
    posX = isNaN(posX) ? 0 : posX;
    posY = isNaN(posY) ? 0 : posY;
    posZ = isNaN(posZ) ? 0 : posZ;
    globalModelContainer.position.set(posX, posY, posZ);

    let rotX = parseFloat(document.getElementById('global-rx-num').value);
    let rotY = parseFloat(document.getElementById('global-ry-num').value);
    let rotZ = parseFloat(document.getElementById('global-rz-num').value);
    rotX = isNaN(rotX) ? 0 : rotX;
    rotY = isNaN(rotY) ? 0 : rotY;
    rotZ = isNaN(rotZ) ? 0 : rotZ;
    globalModelContainer.rotation.set(
        THREE.MathUtils.degToRad(rotX),
        THREE.MathUtils.degToRad(rotY),
        THREE.MathUtils.degToRad(rotZ)
    );

    let scaleX = parseFloat(document.getElementById('global-sx-num').value);
    let scaleY = parseFloat(document.getElementById('global-sy-num').value);
    let scaleZ = parseFloat(document.getElementById('global-sz-num').value);
    scaleX = isNaN(scaleX) ? 1 : scaleX;
    scaleY = isNaN(scaleY) ? 1 : scaleY;
    scaleZ = isNaN(scaleZ) ? 1 : scaleZ;
    globalModelContainer.scale.set(scaleX, scaleY, scaleZ);
}

function onApplyMaxHeight() {
    if (!globalModelContainer) return;
    
    const targetHeight = parseFloat(uiElements.globalMaxHeightInput.value);
    if (isNaN(targetHeight) || targetHeight <= 0) {
        console.warn("Altura objetivo no válida:", targetHeight);
        return;
    }
    
    globalModelContainer.updateWorldMatrix(true, false);
    const box = new THREE.Box3().setFromObject(globalModelContainer);

    if (box.isEmpty()) {
        console.warn("La altura actual del modelo es 0 o inválida (modelo vacío), no se puede reescalar.");
        return;
    }
    
    const size = box.getSize(new THREE.Vector3());
    const currentHeight = size.y;
    
    if (!isFinite(currentHeight) || currentHeight <= 0) {
        console.warn("La altura actual del modelo es 0 o inválida, no se puede reescalar.");
        return;
    }
    
    const scaleFactor = targetHeight / currentHeight;
    globalModelContainer.scale.multiplyScalar(scaleFactor);
    
    updateGlobalControlsUIFromModel();
}

function setupGlobalControlsUI() {
    uiElements.globalPositionInputs.innerHTML = 
        createSliderInput('global', 'x', 'X', 0, -100, 100, 0.5) +
        createSliderInput('global', 'y', 'Y', 0, -100, 100, 0.5) +
        createSliderInput('global', 'z', 'Z', 0, -100, 100, 0.5);
    uiElements.globalRotationInputs.innerHTML = 
        createSliderInput('global', 'rx', 'RX', 0, -360, 360, 1) +
        createSliderInput('global', 'ry', 'RY', 0, -360, 360, 1) +
        createSliderInput('global', 'rz', 'RZ', 0, -360, 360, 1);
    uiElements.globalScaleInputs.innerHTML = 
        createSliderInput('global', 'sx', 'SX', 1, 0, 10, 0.01) +
        createSliderInput('global', 'sy', 'SY', 1, 0, 10, 0.01) +
        createSliderInput('global', 'sz', 'SZ', 1, 0, 10, 0.01);
}

function updateGlobalControlsUIFromModel() {
    if (!globalModelContainer) return;
    
    const pos = globalModelContainer.position;
    const rot = globalModelContainer.rotation;
    const scale = globalModelContainer.scale;

    ['x', 'y', 'z'].forEach(axis => {
        document.getElementById(`global-${axis}-num`).value = pos[axis];
        document.getElementById(`global-${axis}-range`).value = pos[axis];
    });
    ['rx', 'ry', 'rz'].forEach(axis => {
        const axisKey = axis.charAt(0);
        const deg = THREE.MathUtils.radToDeg(rot[axisKey]);
        document.getElementById(`global-${axis}-num`).value = deg;
        document.getElementById(`global-${axis}-range`).value = deg;
    });
    ['sx', 'sy', 'sz'].forEach(axis => {
        const axisKey = axis.charAt(0);
        document.getElementById(`global-${axis}-num`).value = scale[axisKey];
        document.getElementById(`global-${axis}-range`).value = scale[axisKey];
    });
}

// --- FUNCIONES DE ACTUALIZACIÓN DE UI (Partes) ---

export function updatePartListUI() {
    uiElements.partList.innerHTML = '';
    if (logic.modelData.size === 0) {
        uiElements.partList.innerHTML = '<div class="p-3 text-center text-gray-400 text-sm">No hay partes</div>';
        return;
    }
    
    const sortedParts = Array.from(logic.modelData.keys()).sort();
    
    for (const name of sortedParts) {
        const part = logic.getPart(name);
        if (!part) continue;

        const el = document.createElement('div');
        el.dataset.name = name;
        el.className = `p-2 cursor-pointer hover:bg-blue-600 rounded-md text-sm truncate ${name === logic.selectedPartName ? 'selected' : ''}`;
        
        let indent = 0;
        let currentPart = part;
        while (currentPart && currentPart.parent !== 'SCENE' && logic.modelData.has(currentPart.parent) && indent < 10) {
            indent++;
            currentPart = logic.getPart(currentPart.parent);
        }
        el.style.paddingLeft = `${0.5 + indent * 0.75}rem`;
        el.textContent = name;
        uiElements.partList.appendChild(el);
    }
}

export function selectPartUI(name) {
    logic.setSelectedPartName(name);
    
    Array.from(uiElements.partList.children).forEach(el => {
        el.classList.toggle('selected', el.dataset.name === name);
    });

    if (name && logic.getPart(name)) {
        uiElements.propertyEditor.style.display = 'block';
        updatePropertyEditorUI();
    } else {
        uiElements.propertyEditor.style.display = 'none';
    }
}

export function updatePropertyEditorUI() {
    if (!logic.selectedPartName || !logic.getPart(logic.selectedPartName)) {
        uiElements.propertyEditor.style.display = 'none';
        return;
    }

    const part = logic.getPart(logic.selectedPartName);
    uiElements.partNameLabel.textContent = part.name;
    
    uiElements.partShapeSelect.value = part.shape;

    const params = part.geoParams || {};
    let geoHtml = '';
    switch (part.shape) {
        case 'sphere':
            geoHtml = createSliderInput('part', 'radius', 'Radius', params.radius || 5, 0.1, 50, 0.1) +
                      createSliderInput('part', 'widthSegments', 'W. Segs', params.widthSegments || 32, 3, 64, 1) +
                      createSliderInput('part', 'heightSegments', 'H. Segs', params.heightSegments || 16, 2, 32, 1);
            uiElements.geometryParamsInputs.className = 'grid grid-cols-3 gap-2';
            break;
        case 'cylinder':
            geoHtml = createSliderInput('part', 'radiusTop', 'R. Top', params.radiusTop || 5, 0.1, 50, 0.1) +
                      createSliderInput('part', 'radiusBottom', 'R. Bottom', params.radiusBottom || 5, 0.1, 50, 0.1) +
                      createSliderInput('part', 'height', 'Height', params.height || 10, 0.1, 100, 0.1) +
                      createSliderInput('part', 'radialSegments', 'R. Segs', params.radialSegments || 32, 3, 64, 1);
            uiElements.geometryParamsInputs.className = 'grid grid-cols-2 gap-2';
            break;
        case 'box':
        default:
            geoHtml = createSliderInput('part', 'width', 'Width', params.width || 10, 0.1, 100, 0.1) +
                      createSliderInput('part', 'height', 'Height', params.height || 10, 0.1, 100, 0.1) +
                      createSliderInput('part', 'depth', 'Depth', params.depth || 10, 0.1, 100, 0.1);
            uiElements.geometryParamsInputs.className = 'grid grid-cols-3 gap-2';
            break;
    }
    uiElements.geometryParamsInputs.innerHTML = geoHtml;

    uiElements.positionInputs.innerHTML = createSliderInput('part', 'x', 'X', part.x, -100, 100, 0.5) +
                                 createSliderInput('part', 'y', 'Y', part.y, -100, 100, 0.5) +
                                 createSliderInput('part', 'z', 'Z', part.z, -100, 100, 0.5);
    uiElements.rotationInputs.innerHTML = createSliderInput('part', 'rx', 'RX', part.rx, -360, 360, 1) +
                                 createSliderInput('part', 'ry', 'RY', part.ry, -360, 360, 1) +
                                 createSliderInput('part', 'rz', 'RZ', part.rz, -360, 360, 1);
    
    uiElements.partColorInput.value = part.color || '#ffffff';
    
    // --- MODIFICADO para actualizar la UI del selector de imágenes ---
    const textureKey = part.texture || '';
    uiElements.partTextureInput.value = textureKey;
    uiElements.partTextureKeyDisplay.textContent = textureKey || '(Ninguna)';
    uiElements.partTexturePreview.src = getCachedAssetUrl(textureKey) || 'https://placehold.co/40x40/1f2937/4b5563?text=?';
    // --- FIN DE MODIFICACIÓN ---
    
    uiElements.partParentSelect.innerHTML = '<option value="SCENE">SCENE (Raíz)</option>';
    for (const name of logic.modelData.keys()) {
        if (name === logic.selectedPartName) continue;
        const selected = (name === part.parent) ? 'selected' : '';
        uiElements.partParentSelect.innerHTML += `<option value="${name}" ${selected}>${name}</option>`;
    }
}

function createSliderInput(prefix, id, label, value, min, max, step) {
    const safeValue = value || 0;
    return `
        <div class="space-y-1">
            <div class="flex justify-between items-center">
                <label for="${prefix}-${id}-range" class="text-xs font-medium">${label}</label>
                <input type="number" id="${prefix}-${id}-num" data-id="${id}" value="${safeValue}" step="${step}" 
                       class="w-16 bg-gray-600 border border-gray-500 rounded px-1 py-0 text-xs text-right">
            </div>
            <input type="range" id="${prefix}-${id}-range" data-id="${id}" value="${safeValue}" min="${min}" max="${max}" step="${step}"
                   class="w-full">
        </div>
    `;
}