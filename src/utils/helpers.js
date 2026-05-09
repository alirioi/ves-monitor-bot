/**
 * @fileoverview Funciones de utilidad generales.
 */

/**
 * Función auxiliar para pausar la ejecución.
 * @param {number} ms - Milisegundos a esperar.
 * @returns {Promise<void>}
 */
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Formatea una cadena de fecha a un formato legible en español de Venezuela.
 * @param {string|Date} dateVal - Objeto Date o cadena de fecha.
 * @returns {string} Fecha formateada o 'Desconocida'.
 */
export const formatDate = (dateVal) => {
  if (!dateVal) return 'Desconocida';
  const date = dateVal instanceof Date ? dateVal : new Date(dateVal);
  return date.toLocaleString('es-VE', {
    timeZone: 'America/Caracas',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Calcula la diferencia porcentual entre el valor actual y el anterior.
 * @param {number} current - Tasa actual.
 * @param {number} previous - Tasa anterior guardada.
 * @returns {string} Texto formateado con el porcentaje y emoji.
 */
export const getDiffText = (current, previous) => {
  if (!previous || previous === 0 || current === previous) return '';
  const diff = ((current - previous) / previous) * 100;
  const emoji = diff > 0 ? '🔺' : '🔻';
  const sign = diff > 0 ? '+' : '';
  return ` ${emoji} ${sign}${diff.toFixed(2)}%`;
};
