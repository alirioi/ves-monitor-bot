/**
 * @fileoverview Funciones para interactuar con la API de tasas de cambio (DolarAPI).
 * Proporciona métodos para obtener tasas actuales de dólar, euro y datos históricos.
 */

import { config } from './config.js';

/** URL base de la API obtenida de la configuración. */
const BASE_URL = config.apiUrl;

/**
 * Obtiene las tasas actuales para el dólar estadounidense.
 * @async
 * @returns {Promise<Array|null>} Lista de tasas o null si ocurre un error.
 */
export async function getRates() {
  try {
    const response = await fetch(`${BASE_URL}/dolares`);
    if (!response.ok) throw new Error('Error al obtener las tasas');
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
}

/**
 * Obtiene las tasas actuales para el euro.
 * @async
 * @returns {Promise<Array|null>} Lista de tasas o null si ocurre un error.
 */
export async function getEuroRates() {
  try {
    const response = await fetch(`${BASE_URL}/euros`);
    if (!response.ok) throw new Error('Error al obtener las tasas de euros');
    return await response.json();
  } catch (error) {
    console.error('API Euro Error:', error);
    return null;
  }
}

/**
 * Obtiene la tasa histórica para una fecha y fuente específica.
 * @async
 * @param {string} date - Fecha en formato YYYY-MM-DD.
 * @param {string} [type='dolares'] - Tipo de moneda ('dolares' o 'euros').
 * @param {string} [fuente='oficial'] - Fuente de la tasa ('oficial' o 'paralelo').
 * @returns {Promise<Object|null>} El registro de la tasa para esa fecha o null si no se encuentra.
 */
export async function getHistoricRate(date, type = 'dolares', fuente = 'oficial') {
  // En ve.dolarapi.com, los históricos se obtienen por listas
  // Ejemplo: /v1/historicos/dolares/oficial
  try {
    const response = await fetch(`${BASE_URL}/historicos/${type}/${fuente}`);
    if (!response.ok) return null;
    const history = await response.json();
    // history es un array, buscamos la fecha exacta YYYY-MM-DD
    return history.find(entry => entry.fecha === date);
  } catch (error) {
    console.error('API Historic Error:', error);
    return null;
  }
}
