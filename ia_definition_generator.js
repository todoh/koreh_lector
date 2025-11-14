// --- ia_definition_generator.js ---
// NUEVO ARCHIVO
// Llama a la IA de Gemini (modelo de LENGUAJE) para generar una
// definición JSON estructurada para un nuevo asset.

import { getCurrentKey, rotateAndGetNextKey, hasApiKeys } from './apisistema.js';
import { COMPONENT_DEFINITIONS } from './editor_definitions.js';

// --- Esquemas de JSON para la IA ---

// Esquema para Terreno
const TERRAIN_SCHEMA = {
    type: "OBJECT",
    properties: {
        "key": { type: "STRING", description: "Clave única en MAYUSCULAS_CON_GUIONES_BAJOS. Ej: 'HIERBA_ALTA', 'CAMINO_PIEDRA'." },
        "name": { type: "STRING", description: "Nombre descriptivo legible. Ej: 'Hierba Alta y Densa', 'Camino de Piedra Musgoso'." },
        "solid": { type: "BOOLEAN", description: "Si el jugador puede caminar sobre él (false) o colisiona (true)." }
    },
    required: ["key", "name", "solid"]
};

// Esquema para Item/Objeto
const ITEM_SCHEMA = {
    type: "OBJECT",
    properties: {
        "key": { type: "STRING", description: "Clave única en MAYUSCULAS_CON_GUIONES_BAJOS. Ej: 'PICO_HIERRO', 'SEMILLA_MAIZ'." },
        "name": { type: "STRING", description: "Nombre descriptivo legible. Ej: 'Pico de Hierro', 'Semilla de Maíz'." },
        "description": { type: "STRING", description: "Descripción corta para el inventario. Ej: 'Una herramienta para picar roca.'" },
        "imageKey": { type: "STRING", description: "La clave de la imagen a usar (DEBE ser la misma que la 'key' principal)." },
        "stackable": { type: "BOOLEAN", description: "Si se puede apilar en el inventario. Default: true." },
        "maxStack": { type: "NUMBER", description: "Cantidad máxima por stack. Default: 99." },
        "buildable_entity": { type: "STRING", description: "(Opcional) Si este item construye una entidad, poner la 'key' de la entidad aquí. Ej: 'MURO_MADERA'." },
        "terraform_tile": { type: "STRING", description: "(Opcional) Si este item modifica el terreno, poner la 'key' del terreno aquí. Ej: 'TIERRA_ARADA'." }
    },
    required: ["key", "name", "description", "imageKey"]
};

// Esquema para Entidad (el más complejo)
const ENTITY_COMPONENT_TYPES = Object.keys(COMPONENT_DEFINITIONS);

const ENTITY_SCHEMA = {
    type: "OBJECT",
    properties: {
        "key": { type: "STRING", description: "Clave única en MAYUSCULAS_CON_GUIONES_BAJOS. Ej: 'ARBOL_ROBLE', 'TALLO_MAIZ'." },
        "name": { type: "STRING", description: "Nombre descriptivo legible. Ej: 'Árbol de Roble Pequeño', 'Tallo de Maíz'." },
        "renderMode": {
            type: "STRING",
            // --- MODIFICADO ---
            "enum": ["billboard", "cross", "cube", "flat", "3d"], // <-- AÑADIDO '3d'
            description: "Forma de renderizado: 'billboard' (sprite 2D vertical), 'cross' (cruz 2D vertical), 'cube' (cubo 3D), 'flat' (plano 2D horizontal en el suelo, ej. 'charco'), '3d' (modelo 3D completo de /assets/3d)." // <-- DESCRIPCIÓN ACTUALIZADA
            // --- FIN MODIFICADO ---
        },
        "components": {
            type: "ARRAY",
            items: {
                type: "OBJECT",
                properties: {
                    "type": { type: "STRING", "enum": ENTITY_COMPONENT_TYPES, description: "El tipo de componente." },
                    "args": { 
                        type: "ARRAY", 
                        description: "Argumentos para el componente. El formato depende del 'type'. Sigue los ejemplos de COMPONENT_DEFINITIONS.",
                        items: {} // <-- ¡CORRECCIÓN! Añadido "items: {}" para indicar un array de cualquier tipo.
                    }
                },
                required: ["type", "args"]
            },
            description: "Lista de componentes que definen el comportamiento de la entidad. DEBE incluir 'Renderable' para que sea visible."
        }
    },
    required: ["key", "name", "renderMode", "components"]
};

// --- Fin de Esquemas ---

/**
 * Genera una definición JSON estructurada desde un prompt de usuario.
 * @param {string} userPrompt - La descripción del usuario.
 * @param {'terrain' | 'entity' | 'item'} type - El tipo de asset a generar.
 * @returns {Promise<object>} La definición JSON generada por la IA.
 */
export async function generarDefinicion(userPrompt, type) {
    console.log(`[Generador Definición] Iniciando para: "${userPrompt}" (Tipo: ${type})`);

    const { systemPrompt, schema } = getPromptAndSchema(userPrompt, type);

    const payload = {
        contents: [{ parts: [{ text: userPrompt }] }],
        systemInstruction: {
            parts: [{ text: systemPrompt }]
        },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: schema
        }
    };

    const model = 'gemini-2.5-flash'; // <-- ¡CORRECCIÓN! Modelo actualizado
    const responseData = await callTextApiWithRotation(payload, model);

    const textPart = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textPart) {
        throw new Error("La API no devolvió una definición de texto.");
    }

    try {
        const jsonDefinition = JSON.parse(textPart);
        console.log("[Generador Definición] Definición JSON recibida y parseada:", jsonDefinition);

        // --- Validación y Corrección ---
        if (type === 'entity') {
            // Asegurarse de que 'Renderable' exista y use la key correcta
            let renderable = jsonDefinition.components.find(c => c.type === 'Renderable');
            if (!renderable) {
                renderable = { type: "Renderable", args: [jsonDefinition.key] };
                jsonDefinition.components.push(renderable);
            } else {
                renderable.args = [jsonDefinition.key]; // Forzar la key correcta
            }
        } else if (type === 'item') {
            // Asegurarse de que 'imageKey' use la key correcta
            jsonDefinition.imageKey = jsonDefinition.key;
        }

        return jsonDefinition;

    } catch (e) {
        console.error("Error al parsear JSON de la IA:", e, textPart);
        throw new Error("La IA devolvió un JSON inválido.");
    }
}

/**
 * Selecciona el prompt de sistema y el esquema JSON correctos.
 */
function getPromptAndSchema(userPrompt, type) {
    let systemPrompt = `Eres un asistente de diseño de juegos experto. El usuario te pedirá crear un asset.
Tu trabajo es generar SOLAMENTE un objeto JSON que defina las propiedades de ese asset, basado en el prompt del usuario.
Debes rellenar todos los campos requeridos del esquema JSON.
Usa la descripción del usuario para inferir los parámetros.

DEFINICIONES DE COMPONENTES DE ENTIDAD (para referencia):
${JSON.stringify(COMPONENT_DEFINITIONS, null, 2)}
`;
    let schema;

    switch (type) {
        case 'terrain':
            systemPrompt += `
REGLAS PARA TERRENO:
- 'key': Clave única, MAYUSCULAS_CON_GUIONES_BAJOS.
- 'name': Nombre descriptivo basado en el prompt.
- 'solid': Infiere si el jugador debería colisionar (true) o caminar sobre él (false). Ej: 'lava' es true, 'hierba' es false, 'agua' es true.
`;
            schema = TERRAIN_SCHEMA;
            break;

        case 'item':
            systemPrompt += `
REGLAS PARA ITEM/OBJETO:
- 'key': Clave única, MAYUSCULAS_CON_GUIONES_BAJOS.
- 'name': Nombre descriptivo.
- 'description': Descripción corta para inventario.
- 'imageKey': DEBE SER LA MISMA que la 'key'.
- 'stackable'/'maxStack': Usa valores por defecto (true, 99) a menos que el prompt sugiera lo contrario (ej. 'una espada' -> false, 1).
- 'buildable_entity' / 'terraform_tile': Si el prompt sugiere que el item se usa para construir (ej. 'un muro de madera', 'semillas de maiz'), rellena el campo apropiado con una KEY_ENTIDAD o KEY_TERRENO inventada si es necesario. Ej: prompt 'muro de madera' -> buildable_entity: 'MURO_MADERA'.
`;
            schema = ITEM_SCHEMA;
            break;

        case 'entity':
        default:
            systemPrompt += `
REGLAS PARA ENTIDAD:
- 'key': Clave única, MAYUSCULAS_CON_GUIONES_BAJOS.
- 'name': Nombre descriptivo.
- 'renderMode': Infiere la forma. 'billboard' (sprite 2D vertical), 'cross' (cruz 2D vertical), 'cube' (cubo 3D), 'flat' (plano 2D horizontal en el suelo, ej. 'charco'), '3d' (modelo 3D completo). // <-- AÑADIDO '3d'
- 'components': DEBE contener al menos un componente 'Renderable'. Los 'args' de 'Renderable' DEBEN ser un array con UN string: la 'key' principal (ej: ["ARBOL_ROBLE"]).
- Infiere otros componentes:
  - Si el prompt dice "sólido", "bloquea", "muro": añade 'Collision' con 'isSolid' en true.
  - Si el prompt dice "crece", "se transforma", "tarda 2 minutos en...": añade 'Growth'. 'timeToGrowMs' (ej: 120000 para 2 min) y 'nextEntityKey' (inventa una key, ej. 'ARBOL_ADULTO').
  - Si el prompt dice "da madera", "se puede picar", "suelta item": añade 'InteractableResource'. 'itemId' (inventa una key, ej. 'MADERA'), 'quantity', 'energyCost'.
  - Si el prompt dice "habla", "dice mensaje": añade 'InteractableDialogue'.
  - Si el prompt dice "se mueve", "camina": añade 'MovementAI'.
`;
            schema = ENTITY_SCHEMA;
            break;
    }
    return { systemPrompt, schema };
}


/**
 * Llama a la API de generación de TEXTO (modelo gemini-2.5-flash) con rotación de keys.
 */
async function callTextApiWithRotation(payload, model) {
    if (!hasApiKeys()) {
        throw new Error("No hay API keys configuradas. Ingresa al menos una API Key.");
    }

    const RETRY_CYCLES = 3;
    const keyCount = hasApiKeys();
    const maxAttempts = (keyCount > 0 ? keyCount : 1) * RETRY_CYCLES;

    let lastError = null;
    let currentKey = getCurrentKey();

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const logPrefix = `[Definición API][Intento ${attempt + 1}/${maxAttempts}]`;
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`;

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.status === 429) {
                console.warn(`${logPrefix} La clave ha excedido la cuota. Rotando...`);
                lastError = new Error("Cuota excedida.");
                currentKey = rotateAndGetNextKey();
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }

            const responseData = await response.json();

            if (!response.ok) {
                throw new Error(`Error no relacionado con cuota (${response.status}): ${responseData.error?.message || 'Error desconocido'}`);
            }

            if (!responseData.candidates || !responseData.candidates[0].content) {
                 // Comprobar si fue bloqueado por seguridad
                if (responseData.candidates?.[0]?.finishReason === 'SAFETY') {
                    throw new Error("La generación de la definición fue bloqueada por razones de seguridad.");
                }
                throw new Error("Respuesta inesperada de la API, sin 'candidates' o 'content'.");
            }

            console.log(`${logPrefix} ✅ Definición JSON recibida.`);
            return responseData; // ¡Éxito!

        } catch (error) {
            lastError = error;
            console.error(`${logPrefix} El intento falló:`, error);

            // Si es un error de cuota, rota la clave y continúa
            if (error.message.includes("Cuota excedida")) {
                currentKey = rotateAndGetNextKey();
                await new Promise(resolve => setTimeout(resolve, 1000));
                continue;
            }
            
            // Si es otro error (ej. API, seguridad, JSON inválido), no reintentes indefinidamente
            throw lastError; 
        }
    }

    throw new Error(`Todos los intentos de generación de definición fallaron. Último error: ${lastError.message}`);
}