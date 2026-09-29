/**
 * =============================================================================
 * MÓDULO JS: nfcValidator.js
 * =============================================================================
 * Provee funciones puras para validación de datos, formateo y cálculo de costos.
 * Cumple con los requisitos de funciones que reciben parámetros y retornan resultados,
 * estructuras de control (switch / if-else) y manejo de validaciones.
 */

/**
 * Valida los datos requeridos para la emisión de una tarjeta NFC.
 * @param {string} habitacion - Número de la habitación.
 * @param {string} huesped - Nombre del huésped.
 * @param {string} checkin - Fecha de check-in (YYYY-MM-DD).
 * @param {string} checkout - Fecha de check-out (YYYY-MM-DD).
 * @returns {Object} - { valido: boolean, error?: string }
 */
export function validarDatosNFC(habitacion, huesped, checkin, checkout) {
    if (!habitacion || habitacion.trim() === '') {
        return { valido: false, error: 'Debe seleccionar una habitación válida.' };
    }

    if (!huesped || huesped.trim().length < 3) {
        return { valido: false, error: 'El nombre del huésped debe tener al menos 3 caracteres.' };
    }

    if (huesped.trim().length > 50) {
        return { valido: false, error: 'El nombre del huésped no puede superar los 50 caracteres.' };
    }

    if (!checkin || !checkout) {
        return { valido: false, error: 'Las fechas de llegada y salida son obligatorias.' };
    }

    const fechaIn = new Date(checkin);
    const fechaOut = new Date(checkout);

    if (isNaN(fechaIn.getTime()) || isNaN(fechaOut.getTime())) {
        return { valido: false, error: 'Formato de fecha inválido.' };
    }

    if (fechaOut <= fechaIn) {
        return { valido: false, error: 'La fecha de salida debe ser posterior a la fecha de llegada.' };
    }

    return { valido: true };
}

/**
 * Formatea un rango de fechas ISO a formato visual amigable (DD/MM/YYYY al DD/MM/YYYY).
 * @param {string} isoIn - Fecha check-in (YYYY-MM-DD).
 * @param {string} isoOut - Fecha check-out (YYYY-MM-DD).
 * @returns {string} - Cadena formateada.
 */
export function formatearRangoFechas(isoIn, isoOut) {
    if (!isoIn || !isoOut) return 'Fechas no especificadas';
    
    const [y1, m1, d1] = isoIn.split('-');
    const [y2, m2, d2] = isoOut.split('-');
    return `${d1}/${m1}/${y1} al ${d2}/${m2}/${y2}`;
}

/**
 * Calcula el total estimado de una estadía según tipo de habitación y noches.
 * Utiliza estructura de control switch para determinar la tarifa.
 * @param {string} tipoHabitacion - Tipo (Estándar, Doble, Suite, etc.)
 * @param {number} noches - Cantidad de noches.
 * @returns {number} - Monto total en dólares.
 */
export function calcularTarifaEstadia(tipoHabitacion, noches) {
    let tarifaPorNoche = 50.0;
    const nochesValidas = Math.max(1, parseInt(noches, 10) || 1);

    switch (tipoHabitacion) {
        case 'Estándar':
            tarifaPorNoche = 45.0;
            break;
        case 'Doble':
            tarifaPorNoche = 65.0;
            break;
        case 'Junior Suite':
        case 'Suite':
            tarifaPorNoche = 110.0;
            break;
        case 'Master Suite':
            tarifaPorNoche = 180.0;
            break;
        case 'Presidencial':
            tarifaPorNoche = 250.0;
            break;
        default:
            tarifaPorNoche = 50.0;
            break;
    }

    return tarifaPorNoche * nochesValidas;
}
