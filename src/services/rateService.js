/**
 * @fileoverview Servicio para la obtención, consulta y persistencia de tasas de cambio.
 * Centraliza las llamadas a la API y las interacciones con PostgreSQL para datos de tasas.
 */

import { getRates, getEuroRates, getHistoricRate } from '../api.js';
import pool from '../db.js';

/** Fuentes de tasas soportadas. */
export const SOURCES = {
  OFICIAL: 'oficial',
  PARALELO: 'paralelo'
};

/**
 * Clase que gestiona la lógica de datos de las tasas.
 */
export class RateService {
  /**
   * Obtiene todas las tasas actuales (USD y EUR) y los valores previos guardados en la base de datos.
   * Útil para mostrar la pantalla principal de tasas y detectar cambios.
   * 
   * @returns {Promise<Object>} Objeto con usdRates, euroRates y el objeto prev con valores históricos.
   */
  static async getAllCurrentData() {
    let configData = null;
    try {
      const res = await pool.query('SELECT key, value FROM public.bot_config');
      configData = res.rows;
    } catch (err) {
      console.error('Aviso BD (bot_config):', err.message);
    }

    const [usdRates, euroRates] = await Promise.all([
      getRates(),
      getEuroRates()
    ]);

    const prev = {};
    configData?.forEach(item => prev[item.key] = parseFloat(item.value));

    return { usdRates, euroRates, prev };
  }

  /**
   * Obtiene tasas históricas para una fecha específica desde la API.
   * 
   * @param {string} dateStr - Fecha en formato YYYY-MM-DD.
   * @returns {Promise<Object>} Objeto con histOficial e histUsdt para esa fecha.
   */
  static async getHistoricData(dateStr) {
    const [histOficial, histUsdt] = await Promise.all([
      getHistoricRate(dateStr, 'dolares', SOURCES.OFICIAL),
      getHistoricRate(dateStr, 'dolares', SOURCES.PARALELO)
    ]);
    return { histOficial, histUsdt };
  }

  /**
   * Actualiza el valor de una tasa en la tabla 'bot_config' solo si el nuevo valor es diferente al anterior.
   * 
   * @param {string} key - Clave de la tasa (ej: 'last_usd_oficial').
   * @param {number} newValue - Valor actual de la tasa.
   * @param {number} oldValue - Valor anterior guardado.
   * @returns {Promise<boolean>} True si el valor fue actualizado y persistido, False en caso contrario.
   */
  static async updateRateIfChanged(key, newValue, oldValue) {
    if (!newValue) return false;

    // Comparar con tolerancia para evitar falsos positivos por precisión float
    const hasChanged = oldValue === undefined || Math.abs(newValue - (oldValue || 0)) > 0.001;
    if (!hasChanged) return false;

    try {
      await pool.query(
        `INSERT INTO public.bot_config (key, value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, newValue.toString()]
      );
      console.log(`[DB] Tasa actualizada: ${key} = ${newValue} (anterior: ${oldValue})`);
      return true;
    } catch (err) {
      console.error(`[DB] Error al actualizar ${key}:`, err.message);
      return false;
    }
  }
}
