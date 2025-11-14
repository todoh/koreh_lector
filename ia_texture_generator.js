// --- ia_texture_generator.js ---
// Lógica para generar texturas seamless (repetibles) usando la API de imagen.
// ¡MODIFICADO! Corregido para usar gemini-2.5-flash-image-preview correctamente.
// ¡MODIFICADO! Añadidas reglas al prompt para evitar el error 'RECITATION'.

import { getCurrentKey, rotateAndGetNextKey, hasApiKeys } from './apisistema.js';

/**
 * Genera una textura seamless (tileable) desde un prompt.
 * @param {string} userPrompt 
 * @returns {Promise<string>} Data URL de la imagen generada.
 */
export async function generarTexturaDesdePrompt(userPrompt) {
    console.log(`[Generador Textura] Iniciando para: "${userPrompt}"`);

    // 1. Crear el prompt específico para texturas
    // ¡MODIFICADO! Añadidas reglas para forzar creatividad y evitar 'RECITATION'.
    const textureApiPrompt = `
        Genera una textura fotorrealista, 512x512, de alta calidad, que sea seamless y tileable (repetible).
        El tema es: "${userPrompt}".
        
        REGLAS IMPORTANTES:
        1.  **SEAMLESS/TILEABLE:** La imagen DEBE ser perfectamente repetible (seamless/tileable). Los bordes izquierdo y derecho deben coincidir, y los bordes superior e inferior deben coincidir.
        2.  **CREATIVA:** No copies una imagen de stock. Genera un patrón único basado en el prompt.
        3.  **SIN BORDES:** No debe haber viñetas, bordes oscuros o marcos.
        4.  **ILUMINACIÓN PLANA:** La iluminación debe ser uniforme, como en un día nublado, para evitar sombras duras que rompan la repetición y asegurar que sea tileable.
        5.  **ENFOCADA:** La textura debe llenar toda la imagen, sin espacios vacíos ni fondo.
    `.trim();

    // 2. Llamar a la API de imagen
    // ¡CAMBIO! Modelo actualizado.
    const model = 'gemini-2.0-flash-preview-image-generation'; 
    const responseData = await callImageApiWithRotation(textureApiPrompt, model);

    // 3. Extraer la data base64
    // ¡CAMBIO! La estructura de respuesta es diferente a 'predict'.
    const imagePart = responseData.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    const base64Data = imagePart?.inlineData?.data;
    if (!base64Data) {
        const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "No se encontró contenido.";
        throw new Error(`La API no devolvió una imagen. Respuesta: ${textResponse}`);
    }

    console.log("[Generador Textura] Imagen base recibida.");

    // 4. Devolver la Data URL final
    return `data:image/png;base64,${base64Data}`;
}

  
/**
 * ¡MODIFICADO!
 * Llama a la API de generación de imágenes (modelo gemini-2.5-flash-image-preview) con rotación de keys.
 * Lógica de reintentos y manejo de errores mejorada.
 */
async function callImageApiWithRotation(prompt, model) {
    if (!hasApiKeys()) {
        throw new Error("No hay API keys configuradas. Ingresa al menos una API Key.");
    }

    const RETRY_CYCLES = 3; 
    const keyCount = hasApiKeys();
    const maxAttempts = (keyCount > 0 ? keyCount : 1) * RETRY_CYCLES;
    
    let lastError = null;
    let currentKey = getCurrentKey();

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const logPrefix = `[Texture API][Intento ${attempt + 1}/${maxAttempts}]`;

        // ¡CAMBIO! Payload adaptado para gemini-2.5-flash (generateContent)
        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            // ¡¡¡CORRECCIÓN AQUÍ!!! Se debe pedir TEXT e IMAGE.
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] }, 
            safetySettings: [
                { "category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE" },
                { "category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE" }
            ]
        };

        try {
            // ¡CAMBIO! Endpoint ahora es 'generateContent'
            const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${currentKey}`;
            
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

            // ¡CAMBIO! Lógica de manejo de respuesta
            if (!response.ok) {
                throw new Error(`Error no relacionado con cuota (${response.status}): ${responseData.error?.message || 'Error desconocido'}`);
            }

            // Comprobar si la respuesta contiene la imagen
            const imagePart = responseData.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (!imagePart || !imagePart.inlineData.data) {
                 // Comprobar si fue bloqueado por seguridad o prompt
                const finishReason = responseData.candidates?.[0]?.finishReason;
                const textResponse = responseData.candidates?.[0]?.content?.parts?.[0]?.text;
                if (finishReason === 'SAFETY' || finishReason === 'RECITATION' || finishReason === 'PROMPT_BLOCKED') {
                     throw new Error(`Generación de imagen bloqueada: ${finishReason}. ${textResponse || ''}`);
                }
                throw new Error(`Respuesta inesperada de la API, sin datos de imagen. ${textResponse || ''}`);
            }
            
            console.log(`${logPrefix} ✅ Petición de textura exitosa.`);
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

    throw new Error(`Todos los intentos de generación de textura fallaron. Último error: ${lastError.message}`);
}