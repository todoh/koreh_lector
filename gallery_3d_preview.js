// --- editorcreador/gallery_3d_preview.js ---
// ¡NUEVO ARCHIVO!
// Contiene la lógica minimalista para renderizar un modelo 3D
// desde un JSON en un canvas de la galería.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { readFile } from './fsa.js';

/**
 * Inicializa una escena de preview de Three.js en un canvas.
 * @param {HTMLCanvasElement} canvas El elemento canvas donde renderizar.
 * @param {FileSystemFileHandle} fileHandle El manejador del archivo .json del modelo.
 */
export async function init3DPreview(canvas, fileHandle) {
    let animationFrameId;

    try {
        // 1. Cargar y parsear el JSON
        const jsonText = await readFile(fileHandle);
        const modelJson = JSON.parse(jsonText);

        // 2. Configuración básica de la escena
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x1f2937); // bg-gray-800

        const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        
        // Usar un contenedor para obtener el tamaño
        const container = canvas.parentElement;
        renderer.setSize(container.clientWidth, 150); // Altura fija

        // 3. Cámara y Controles
        const camera = new THREE.PerspectiveCamera(50, container.clientWidth / 150, 0.1, 1000);
        camera.position.set(50, 50, 50); // Posición inicial
        camera.lookAt(0, 0, 0);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.enableZoom = false; // Desactivar zoom en la galería
        controls.enablePan = false; // Desactivar paneo en la galería

        // 4. Luces
        scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(1, 2, 3);
        scene.add(dirLight);

        // 5. Construir el modelo
        const modelContainer = buildPreviewModel(modelJson);
        scene.add(modelContainer);

        // 6. Centrar y escalar el modelo
        const box = new THREE.Box3().setFromObject(modelContainer);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Escalar
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 40 / maxDim; // Escalar para que quepa en un espacio de ~40 unidades
        modelContainer.scale.set(scale, scale, scale);
        
        // Centrar
        box.setFromObject(modelContainer);
        box.getCenter(center);
        modelContainer.position.sub(center); // Centrar en el origen

        controls.target.copy(modelContainer.position);
        
        // 7. Bucle de render
        function animate() {
            animationFrameId = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        }
        animate();

        // Limpiar al salir (si el elemento se elimina, etc.)
        // Esto es más complejo, por ahora lo dejamos así,
        // pero idealmente se usaría IntersectionObserver para detener el render
        // si el canvas no está visible.

    } catch (err) {
        console.error(`Error al renderizar ${fileHandle.name}: ${err.message}`);
        // Mostrar error en el canvas (requeriría más DOM)
    }
}

/**
 * Construye un THREE.Group a partir de la estructura JSON del modelo.
 * (Versión simplificada de la lógica de editor3d_main.js)
 * @param {object} json - El JSON del modelo parseado.
 * @returns {THREE.Group}
 */
function buildPreviewModel(json) {
    const { geometries = {}, materials = {}, positions = {}, rotations = {} } = json;
    const modelContainer = new THREE.Group();
    const threeObjects = new Map();

    // 1er Pase: Crear todos los Meshes
    for (const partKey in geometries) {
        if (!geometries.hasOwnProperty(partKey)) continue;

        const geoData = geometries[partKey];
        const matData = materials[partKey] || {};
        const posData = positions[partKey] || { x: 0, y: 0, z: 0 };
        const rotData = rotations ? (rotations[partKey] || { x: 0, y: 0, z: 0 }) : { x: 0, y: 0, z: 0 };

        // Geometría
        let geometry;
        const shape = geoData.shape || 'box';
        const params = geoData.geoParams || {};

        try {
            switch (shape) {
                case 'sphere':
                    geometry = new THREE.SphereGeometry(params.radius, params.widthSegments, params.heightSegments);
                    break;
                case 'cylinder':
                    geometry = new THREE.CylinderGeometry(params.radiusTop, params.radiusBottom, params.height, params.radialSegments);
                    break;
                case 'box':
                default:
                    geometry = new THREE.BoxGeometry(params.width, params.height, params.depth);
                    break;
            }
        } catch (e) {
            console.warn(`Error creando geometría para ${partKey}, usando caja por defecto.`);
            geometry = new THREE.BoxGeometry(10, 10, 10);
        }

        // Material (solo color, sin texturas para la preview)
        const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(matData.color || '#ffffff')
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = partKey;
        mesh.position.set(posData.x, posData.y, posData.z);
        mesh.rotation.set(
            THREE.MathUtils.degToRad(rotData.x || 0),
            THREE.MathUtils.degToRad(rotData.y || 0),
            THREE.MathUtils.degToRad(rotData.z || 0)
        );

        threeObjects.set(partKey, mesh);
    }

    // 2do Pase: Anidar los objetos (lógica simplificada sin parenting complejo)
    for (const mesh of threeObjects.values()) {
        modelContainer.add(mesh);
    }

    return modelContainer;
}