/**
 * @fileoverview Funciones para interactuar con la API de tasas de cambio (DolarAPI).
 * Incluye un mecanismo de caché simple para optimizar el rendimiento y reducir la carga.
 */

import { config } from './config.js';

/** URL base de la API obtenida de la configuración. */
const BASE_URL = config.apiUrl;

/** 
 * Caché en memoria para evitar peticiones redundantes.
 * @type {Object}
 */
const cache = {
  usd: { data: null, lastFetch: 0 },
  eur: { data: null, lastFetch: 0 }
};

/** Tiempo de vida de la caché (1 minuto). */
const CACHE_TTL = 60 * 1000;

/**
 * Obtiene las tasas actuales para el dólar estadounidense con soporte de caché.
 * @async
 * @returns {Promise<Array|null>} Lista de tasas o null si ocurre un error.
 */
export async function getRates() {
  const now = Date.now();
  if (cache.usd.data && (now - cache.usd.lastFetch < CACHE_TTL)) {
    return cache.usd.data;
  }

  try {
    const response = await fetch(`${BASE_URL}/dolares`);
    if (!response.ok) throw new Error('Error al obtener las tasas');
    const data = await response.json();
    
    cache.usd.data = data;
    cache.usd.lastFetch = now;
    return data;
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
}

/**
 * Obtiene las tasas actuales para el euro con soporte de caché.
 * @async
 * @returns {Promise<Array|null>} Lista de tasas o null si ocurre un error.
 */
export async function getEuroRates() {
  const now = Date.now();
  if (cache.eur.data && (now - cache.eur.lastFetch < CACHE_TTL)) {
    return cache.eur.data;
  }

  try {
    const response = await fetch(`${BASE_URL}/euros`);
    if (!response.ok) throw new Error('Error al obtener las tasas de euros');
    const data = await response.json();

    cache.eur.data = data;
    cache.eur.lastFetch = now;
    return data;
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
  try {
    const response = await fetch(`${BASE_URL}/historicos/${type}/${fuente}`);
    if (!response.ok) return null;
    const history = await response.json();
    return history.find(entry => entry.fecha === date);
  } catch (error) {
    console.error('API Historic Error:', error);
    return null;
  }
}
