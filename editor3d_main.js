// --- editorcreador/editor3d_main.js ---
// (Anteriormente 'editor 3d/main.js')

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// --- ¡RUTAS MODIFICADAS! ---
import * as logic from './editor3d_logic.js';
import { getCachedAssetUrl } from './assets.js';
import { setupUIListeners, updatePartListUI, updatePropertyEditorUI, selectPartUI, uiElements, loadPreset } from './editor3d_controls.js';
// --- FIN DE MODIFICACIÓN ---

// --- VARIABLES GLOBALES DE THREE.JS ---
let scene, camera, renderer, controls, modelContainer, selectionBox;
const textureLoader = new THREE.TextureLoader();
// ¡NUEVO! Raycaster para la selección por clic
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// --- INICIALIZACIÓN ---
function init() {
    // Escena
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x2d3748); // gray-800
    modelContainer = new THREE.Group();
    scene.add(modelContainer);

    // Helpers
    const gridHelper = new THREE.GridHelper(200, 20, 0x4a5568, 0x4a5568); // gray-600
    scene.add(gridHelper);
    const axesHelper = new THREE.AxesHelper(25);
    scene.add(axesHelper);

    // Luz
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(50, 100, 75);
    scene.add(dirLight);

    // Cámara
    camera = new THREE.PerspectiveCamera(50, uiElements.canvas.clientWidth / uiElements.canvas.clientHeight, 0.1, 2000);
    camera.position.set(80, 80, 80);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: uiElements.canvas, antialias: true });
    renderer.setSize(uiElements.canvas.clientWidth, uiElements.canvas.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Controles
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.target.set(0, 20, 0);
    controls.update();

    // Caja de selección
    selectionBox = new THREE.BoxHelper(new THREE.Mesh(new THREE.BoxGeometry(1,1,1)), 0x00ffff); // Cyan
    selectionBox.visible = false;
    scene.add(selectionBox);

    // Listeners
    window.addEventListener('resize', onResize);
    // ¡NUEVO! Listener para el clic en el canvas
    uiElements.canvas.addEventListener('mousedown', onCanvasMouseDown);
    onResize(); // Ajustar tamaño inicial

    // Configurar UI y cargar modelo inicial
    setupUIListeners(modelContainer);
    loadPreset('new');

    // Bucle de render
    animate();
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function onResize() {
    const container = uiElements.canvas.parentElement;
    if (!container) return;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// --- ORQUESTACIÓN ---

/**
 * Refresca toda la UI y la escena 3D basado en 'modelData'.
 */
export function refreshAll() {
    buildModelFromData();
    updatePartListUI();
    
    if (logic.selectedPartName && logic.getPart(logic.selectedPartName)) {
        updatePropertyEditorUI();
        highlightSelectedPart();
    } else {
        // Deseleccionar si la parte ya no existe
        selectPartUI(null);
    }
}

/**
 * Reconstruye la escena 3D completa a partir de 'modelData'.
 */
async function buildModelFromData() {
    modelContainer.clear(); 
    logic.threeObjects.clear();
    selectionBox.visible = false;
    
    const texturePromises = [];
    const partsToBuild = new Map(logic.modelData); // Copia para iterar

    // 1er Pase: Crear todos los objetos (Grupos y Meshes)
    for (const [name, part] of partsToBuild) {
        const partGroup = new THREE.Group();
        partGroup.name = name;
        partGroup.position.set(part.x, part.y, part.z);
        partGroup.rotation.set(
            THREE.MathUtils.degToRad(part.rx),
            THREE.MathUtils.degToRad(part.ry),
            THREE.MathUtils.degToRad(part.rz)
        );
        
        let geometry;
        const params = part.geoParams || {};
        
        try {
            switch (part.shape) {
                case 'sphere':
                    geometry = new THREE.SphereGeometry(
                        params.radius || 5,
                        Math.max(3, Math.floor(params.widthSegments || 32)),
                        Math.max(2, Math.floor(params.heightSegments || 16))
                    );
                    break;
                case 'cylinder':
                    geometry = new THREE.CylinderGeometry(
                        params.radiusTop || 5,
                        params.radiusBottom || 5,
                        params.height || 10,
                        Math.max(3, Math.floor(params.radialSegments || 32))
                    );
                    break;
                case 'box':
                default:
                    geometry = new THREE.BoxGeometry(
                        params.width || 10,
                        params.height || 10,
                        params.depth || 10
                    );
                    break;
            }
        } catch (err) {
            console.warn(`Error creating geometry for ${name}, using default box.`, err);
            geometry = new THREE.BoxGeometry(10, 10, 10);
        }

        const material = new THREE.MeshStandardMaterial({
            color: part.color || '#ffffff',
            transparent: true,
            opacity: 1,
        });

        // --- MANEJO DE TEXTURAS MODIFICADO ---
        // Ahora 'part.texture' es una clave de asset (ej. "MI_TEXTURA")
        if (part.texture) {
            const textureKey = part.texture.trim();
            const texturePath = getCachedAssetUrl(textureKey); // Usar el cache de assets

            if (texturePath) {
                const promise = new Promise((resolve) => {
                    textureLoader.load(
                        texturePath, // Esto es una URL de blob: (ej. blob:http://...)
                        (texture) => {
                            texture.colorSpace = THREE.SRGBColorSpace;
                            material.map = texture;
                            material.color.set(0xffffff); // Poner blanco para ver textura
                            material.needsUpdate = true;
                            resolve(true);
                        },
                        undefined,
                        (err) => {
                            console.warn(`No se pudo cargar la textura desde el cache: ${textureKey}`, err);
                            resolve(false);
                        }
                    );
                });
                texturePromises.push(promise);
            } else {
                console.warn(`Textura no encontrada en el cache de assets: ${textureKey}`);
            }
        }
        // --- FIN DE MODIFICACIÓN DE TEXTURAS ---

        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = `${name}_mesh`;
        partGroup.add(mesh);
        
        logic.threeObjects.set(name, partGroup);
    }

    if (texturePromises.length > 0) {
        uiElements.loadingOverlay.style.display = 'flex';
        await Promise.allSettled(texturePromises);
        uiElements.loadingOverlay.style.display = 'none';
    }

    // 2do Pase: Anidar los objetos
    for (const [name, part] of partsToBuild) {
        const partGroup = logic.threeObjects.get(name);
        const parentGroup = logic.threeObjects.get(part.parent);
        
        if (parentGroup) {
            parentGroup.add(partGroup);
        } else {
            modelContainer.add(partGroup);
        }
    }
}

/**
 * Resalta la parte seleccionada en la escena 3D.
 */
function highlightSelectedPart() {
    if (!logic.selectedPartName) {
        selectionBox.visible = false;
        return;
    }
    
    const partGroup = logic.threeObjects.get(logic.selectedPartName);
    if (partGroup) {
        const mesh = partGroup.getObjectByProperty('isMesh', true); 
        if (mesh) {
            mesh.updateWorldMatrix(true, false);
            selectionBox.setFromObject(mesh);
            selectionBox.visible = true;
        }
    } else {
        selectionBox.visible = false;
    }
}

// --- ¡NUEVA FUNCIÓN! ---
/**
 * Maneja el clic del ratón en el canvas para seleccionar partes.
 * @param {MouseEvent} event 
 */
function onCanvasMouseDown(event) {
    // Solo reaccionar al clic izquierdo (0)
    if (event.button !== 0) return;

    // 1. Calcular coordenadas normalizadas del ratón (-1 a +1)
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // 2. Actualizar el raycaster
    raycaster.setFromCamera(mouse, camera);

    // 3. Comprobar intersecciones con el modelo
    // El 'true' es para recursividad (importante)
    const intersects = raycaster.intersectObjects(modelContainer.children, true);

    if (intersects.length > 0) {
        // 4. Encontrar la parte seleccionada
        let selectedObject = intersects[0].object;
        
        // El raycaster golpea un Mesh. Necesitamos subir por el árbol
        // hasta encontrar el Grupo de la parte (el que está en logic.threeObjects)
        let partGroup = null;
        while (selectedObject && selectedObject !== scene) {
            // Comprobamos si el nombre de este objeto padre es una de nuestras partes
            if (logic.threeObjects.has(selectedObject.name)) {
                partGroup = selectedObject;
                break;
            }
            selectedObject = selectedObject.parent;
        }

        if (partGroup) {
            // ¡Encontrado! Seleccionar esta parte en la UI
            // Esto actualizará la lista, el editor de propiedades y el resaltado.
            selectPartUI(partGroup.name);
        } else {
            // Golpeó algo, pero no era una parte reconocida
            selectPartUI(null); // Deseleccionar
        }
    } else {
        // No golpeó nada
        selectPartUI(null); // Deseleccionar
    }
}


// --- INICIAR APP ---
// Esta inicialización ocurre cuando main.js (el principal) lo importa.
init();