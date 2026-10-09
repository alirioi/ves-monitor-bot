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
  eur: { data: null, lastFetch: 0 },
  colombia: { data: null, lastFetch: 0 },
  argentina: { data: null, lastFetch: 0 }
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
    const response = await fetch(`${BASE_URL}/dolares`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('Error al obtener las tasas');
    const data = await response.json();
    
    cache.usd.data = data;
    cache.usd.lastFetch = now;
    return data;
  } catch (error) {
    console.error('API Error:', error.message);
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
    const response = await fetch(`${BASE_URL}/euros`, { signal: AbortSignal.timeout(5000) });
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
 * Obtiene la tasa histórica para una fecha y fuente específica consultando directamente el endpoint por fecha.
 * @async
 * @param {string} date - Fecha en formato YYYY-MM-DD o YYYY/MM/DD.
 * @param {string} [type='dolares'] - Tipo de moneda ('dolares' o 'euros').
 * @param {string} [fuente='oficial'] - Fuente de la tasa ('oficial' o 'paralelo').
 * @returns {Promise<Object|null>} El registro de la tasa para esa fecha o null si no se encuentra.
 */
export async function getHistoricRate(date, type = 'dolares', fuente = 'oficial') {
  try {
    const datePath = date.replace(/-/g, '/');
    const response = await fetch(`${BASE_URL}/historicos/${type}/${fuente}/${datePath}`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error(`API Historic Error (${type}/${fuente}):`, error.message);
    return null;
  }
}

/**
 * Obtiene las tasas actuales para Colombia (TRM oficial y Mercado) con soporte de caché.
 * @async
 * @returns {Promise<Object|null>} Objeto con trm, compra, venta y mercado o null si ocurre un error.
 */
export async function getColombiaRates() {
  const now = Date.now();
  if (cache.colombia.data && (now - cache.colombia.lastFetch < CACHE_TTL)) {
    return cache.colombia.data;
  }

  try {
    const [trmRes, usdRes] = await Promise.all([
      fetch('https://co.dolarapi.com/v1/trm', { signal: AbortSignal.timeout(5000) }),
      fetch('https://co.dolarapi.com/v1/cotizaciones/usd', { signal: AbortSignal.timeout(5000) })
    ]);

    const trmData = trmRes.ok ? await trmRes.json() : null;
    const usdData = usdRes.ok ? await usdRes.json() : null;

    const data = {
      trm: trmData?.valor || null,
      mercado: usdData?.venta || usdData?.compra || null,
      compra: usdData?.compra || null,
      venta: usdData?.venta || null,
      updatedAt: trmData?.fechaActualizacion || usdData?.fechaActualizacion || new Date().toISOString()
    };

    cache.colombia.data = data;
    cache.colombia.lastFetch = now;
    return data;
  } catch (error) {
    console.error('API Colombia Error:', error.message);
    return null;
  }
}

/**
 * Obtiene las tasas actuales para Argentina (Oficial y Blue) con soporte de caché.
 * @async
 * @returns {Promise<Object|null>} Objeto con oficial y blue (compra/venta) o null si ocurre un error.
 */
export async function getArgentinaRates() {
  const now = Date.now();
  if (cache.argentina.data && (now - cache.argentina.lastFetch < CACHE_TTL)) {
    return cache.argentina.data;
  }

  try {
    const res = await fetch('https://dolarapi.com/v1/dolares', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error('Error al obtener tasas de Argentina');
    const dolares = await res.json();

    const oficial = dolares.find(d => d.casa === 'oficial');
    const blue = dolares.find(d => d.casa === 'blue');

    const data = {
      oficial: oficial?.venta || oficial?.compra || null,
      oficialCompra: oficial?.compra || null,
      oficialVenta: oficial?.venta || null,
      blue: blue?.venta || blue?.compra || null,
      blueCompra: blue?.compra || null,
      blueVenta: blue?.venta || null,
      updatedAt: blue?.fechaActualizacion || oficial?.fechaActualizacion || new Date().toISOString()
    };

    cache.argentina.data = data;
    cache.argentina.lastFetch = now;
    return data;
  } catch (error) {
    console.error('API Argentina Error:', error.message);
    return null;
  }
}
