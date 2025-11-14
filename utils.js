// --- utils.js ---
// Pequeñas funciones de utilidad.

/**
 * Muestra un mensaje de estado
 * @param {HTMLElement} $statusElement
 * @param {string} message
 * @param {'success' | 'error'} type
 */
export function showStatus($statusElement, message, type = 'success') {
    $statusElement.textContent = message;
    if (type === 'success') {
        $statusElement.classList.remove('text-red-500');
        $statusElement.classList.add('text-green-500');
    } else {
        $statusElement.classList.remove('text-green-500');
        $statusElement.classList.add('text-red-500');
    }
}