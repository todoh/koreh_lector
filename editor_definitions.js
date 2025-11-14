// --- editor_definitions.js ---
// Almacena definiciones estáticas para la UI del editor.

export const COMPONENT_DEFINITIONS = {
    'Renderable': {
        emoji: '🖼️',
        name: 'Renderable',
        description: 'Hace que la entidad sea visible en el juego.',
        args: [
            { id: 'imageKey', label: 'Image Key', type: 'image_select' }
        ]
    },
    'Collision': {
        emoji: '🧱',
        name: 'Collision',
        description: 'Permite a la entidad bloquear el movimiento y ser sólida.',
        args: [
            { id: 'isSolid', label: 'Solid', type: 'boolean' },
            { id: 'collisionBox', label: 'Collision Box', type: 'collision_box' }
        ]
    },
    'InteractableResource': {
        emoji: '⛏️',
        name: 'Interactable Resource',
        description: 'El jugador puede interactuar para obtener un item.',
        args: [
            { id: 'itemId', label: 'Item ID', type: 'item_select' }, // <-- MODIFICADO (string a item_select)
            { id: 'quantity', label: 'Quantity', type: 'number' },
            { id: 'energyCost', label: 'Energy Cost', type: 'number' }
        ]
    },
    // --- ¡NUEVO COMPONENTE AÑADIDO AQUÍ! ---
    'InteractableFilteredResource': {
        emoji: '🏷️⛏️',
        name: 'Interactable Filtered Resource',
        description: 'Requiere un item con un Tag específico para recolectar.',
        args: [
            { id: 'itemId', label: 'Item ID (Resultado)', type: 'item_select' },
            { id: 'quantity', label: 'Quantity', type: 'number' },
            { id: 'energyCost', label: 'Energy Cost', type: 'number' },
            { id: 'requiredTag', label: 'Tag Requerido', type: 'string', placeholder: 'Ej: TAJO' }
        ]
    },
    // --- FIN DE NUEVO COMPONENTE ---
    'InteractableDialogue': {
        emoji: '💬',
        name: 'Interactable Dialogue',
        description: 'Muestra un mensaje de diálogo al jugador.',
        args: [
            { id: 'message', label: 'Message', type: 'textarea' }
        ]
    },
    'InteractableMenu': {
        emoji: '📖',
        name: 'Interactable Menu',
        description: 'Abre una interfaz de menú (ej. CRAFTING).',
        args: [
            { id: 'menuId', label: 'Menu ID', type: 'string' }
        ]
    },
    'InteractableLevelChange': {
        emoji: '🪜',
        name: 'Interactable Level Change',
        description: 'Permite al jugador cambiar de nivel Z.',
        args: [
            { id: 'direction', label: 'Direction', type: 'select', options: ['up', 'down'] }
        ]
    },
    'InteractableVehicle': {
        emoji: '🔑',
        name: 'Interactable Vehicle',
        description: 'Permite al jugador montar este vehículo.',
        args: []
    },
    'Vehicle': {
        emoji: '🚗',
        name: 'Vehicle',
        description: 'Define las propiedades de un vehículo.',
        args: [
            { id: 'speed', label: 'Speed', type: 'number' }
        ]
    },
    'Collectible': {
        emoji: '🪙',
        name: 'Collectible',
        description: 'Se recoge automáticamente al caminar sobre él.',
        args: [
            { id: 'itemId', label: 'Item ID', type: 'item_select' }, // <-- MODIFICADO (string a item_select)
            { id: 'quantity', label: 'Quantity', type: 'number' }
        ]
    },
    'Growth': {
        emoji: '🌱',
        name: 'Growth',
        description: 'Se transforma en otra entidad después de un tiempo.',
        args: [
            { id: 'timeToGrowMs', label: 'Time (ms)', type: 'number' },
            { id: 'nextEntityKey', label: 'Next Entity ID', type: 'entity_select' } // <-- MODIFICADO (string a entity_select)
        ]
    },
    'MovementAI': {
        emoji: '🤖',
        name: 'Movement AI',
        description: 'Permite a la entidad moverse por su cuenta.',
        args: [
            { id: 'pattern', label: 'Pattern', type: 'select', options: ['WANDER'] },
            { id: 'speed', label: 'Speed', type: 'number' }
        ]
    },// --- INICIO DE NUEVOS COMPONENTES ---
    'Attribute': {
        emoji: '📊',
        name: 'Atributos (Estadísticas)',
        description: 'Define atributos con un valor numérico. (Ej: [{"id":"FUERZA", "value":10}])',
        args: [
            { id: 'attributesJson', label: 'Atributos (formato JSON Array)', type: 'textarea' }
        ]
    },

    'Tag': {
        emoji: '🏷️',
        name: 'Tags (Etiquetas)',
        description: 'Lista de palabras clave, separadas por comas. (Ej: MONSTRUO, NOCTURNO, VOLADOR)',
        args: [
            { id: 'tagsString', label: 'Etiquetas (separadas por coma)', type: 'textarea' }
        ]
    },

    'Vitals': {
        emoji: '❤️',
        name: 'Constantes Vitales',
        description: 'Define las constantes de estado (Vida, Energía).',
        args: [
            { id: 'vidaActual', label: 'Vida Actual', type: 'number' },
            { id: 'vidaMaxima', label: 'Vida Máxima', type: 'number' },
            { id: 'energiaActual', label: 'Energía Actual', type: 'number' },
            { id: 'energiaMaxima', label: 'Energía Máxima', type: 'number' }
        ]
    }
};