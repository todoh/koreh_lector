// --- editorcreador/editor3d_logic.js ---
// (Anteriormente 'editor 3d/logic.js')

// --- ¡RUTA MODIFICADA! ---
import { PartData } from './editor3d_models.js';
// --- FIN DE MODIFICACIÓN ---

// --- ESTADO DEL EDITOR ---
export let modelData = new Map(); // Map<string, PartData>
export let threeObjects = new Map(); // Map<string, THREE.Group>
export let selectedPartName = null;
export let partCounter = 1;

// --- MUTADORES DE ESTADO ---
export function setSelectedPartName(name) {
    selectedPartName = name;
}

export function setPartCounter(count) {
    partCounter = count;
}

export function getPart(name) {
    return modelData.get(name);
}

// --- LÓGICA DE MANEJO DE DATOS ---

export function parseAndLoadJson(json) {
    clearEditorState();
    const { geometries = {}, materials = {}, positions = {}, rotations = {}, parenting = {} } = json;

    const partNames = Object.keys(geometries);
    if (partNames.length === 0) {
        partCounter = 1;
        return;
    }

    for (const name of partNames) {
        const geo = geometries[name] || {};
        const mat = materials[name] || {};
        const pos = positions[name] || {};
        const rot = rotations[name] || {};

        const shape = geo.shape || 'box';
        let geoParams = geo.geoParams;

        if (!geoParams) {
            geoParams = {
                width: geo.width || 10,
                height: geo.height || 10,
                depth: geo.depth || 10
            };
        }

         const part = new PartData(name, {
            shape: shape,
            geoParams: geoParams,
            x: pos.x || 0, y: pos.y || 0, z: pos.z || 0,
            rx: rot.x || 0, ry: rot.y || 0, rz: rot.z || 0,
            color: mat.color,
            texture: mat.texture,
            parent: parenting[name] || 'SCENE'
        });
        modelData.set(name, part);
    }
    
    partCounter = partNames.length + 1;
}

export function clearEditorState() {
    modelData.clear();
    threeObjects.clear();
    selectedPartName = null;
    partCounter = 1;
}

export function addPart() {
    let newName = `part_${partCounter}`;
    while (modelData.has(newName)) {
        partCounter++;
        newName = `part_${partCounter}`;
    }
    partCounter++;
    
    const newPart = new PartData(newName);
    modelData.set(newName, newPart);
    return newName;
}

export function getDefaultGeoParams(shape) {
    switch (shape) {
        case 'sphere':
            return { radius: 5, widthSegments: 32, heightSegments: 16 };
        case 'cylinder':
            return { radiusTop: 5, radiusBottom: 5, height: 10, radialSegments: 32 };
        case 'box':
        default:
            return { width: 10, height: 10, depth: 10 };
    }
}

export function removePart(nameToRemove) {
    if (!modelData.has(nameToRemove)) return;

    const parentOfRemoved = modelData.get(nameToRemove).parent;
    modelData.forEach(part => {
        if (part.parent === nameToRemove) {
            part.parent = parentOfRemoved;
        }
    });

    modelData.delete(nameToRemove);
}

 
export function buildExportJson(globalScale = { x: 1, y: 1, z: 1 }) {
    const output = {
        geometries: {},
        materials: {},
        positions: {},
    };

    const scaleFactor = globalScale.x;

    for (const [name, part] of modelData) {
        
        const scaledGeoParams = { ...part.geoParams };
        if (scaledGeoParams.hasOwnProperty('width')) scaledGeoParams.width *= scaleFactor;
        if (scaledGeoParams.hasOwnProperty('height')) scaledGeoParams.height *= scaleFactor;
        if (scaledGeoParams.hasOwnProperty('depth')) scaledGeoParams.depth *= scaleFactor;
        if (scaledGeoParams.hasOwnProperty('radius')) scaledGeoParams.radius *= scaleFactor;
        if (scaledGeoParams.hasOwnProperty('radiusTop')) scaledGeoParams.radiusTop *= scaleFactor;
        if (scaledGeoParams.hasOwnProperty('radiusBottom')) scaledGeoParams.radiusBottom *= scaleFactor;

        const scaledPos = {
            x: part.x * scaleFactor,
            y: part.y * scaleFactor,
            z: part.z * scaleFactor
        };

        output.geometries[name] = {
            shape: part.shape,
            geoParams: scaledGeoParams
        };
        
        output.materials[name] = { 
            color: part.color,
            texture: part.texture
        };
        
        output.positions[name] = scaledPos;
    }
    return output;
}