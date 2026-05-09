/**
 * @fileoverview Servicio para la obtención, consulta y persistencia de tasas de cambio.
 * Centraliza las llamadas a la API y las interacciones con Supabase para datos de tasas.
 */

import { getRates, getEuroRates, getHistoricRate } from '../api.js';
import supabase from '../db.js';

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
    const [usdRates, euroRates, { data: configData }] = await Promise.all([
      getRates(),
      getEuroRates(),
      supabase.from('bot_config').select('*')
    ]);

    const prev = {};
    configData?.forEach(item => prev[item.key] = parseFloat(item.value));

    return { usdRates, euroRates, prev };
  }

  /**
   * Obtiene tasas históricas para una fecha específica desde la API.
   * 
   * @param {string} dateStr - Fecha en formato YYYY-MM-DD.
   * @returns {Promise<Object>} Objeto con histOficial e histParalelo para esa fecha.
   */
  static async getHistoricData(dateStr) {
    const [histOficial, histParalelo] = await Promise.all([
      getHistoricRate(dateStr, 'dolares', SOURCES.OFICIAL),
      getHistoricRate(dateStr, 'dolares', SOURCES.PARALELO)
    ]);
    return { histOficial, histParalelo };
  }

  /**
   * Actualiza el valor de una tasa en la tabla 'bot_config' solo si el nuevo valor es diferente al anterior.
   * 
   * @param {string} key - Clave de la tasa (ej: 'last_usd_oficial').
   * @param {number} newValue - Valor actual de la tasa.
   * @param {number} oldValue - Valor anterior guardado.
   * @returns {Promise<boolean>} True si el valor fue actualizado, False en caso contrario.
   */
  static async updateRateIfChanged(key, newValue, oldValue) {
    if (newValue && newValue !== oldValue) {
      await supabase.from('bot_config').upsert({ key: key, value: newValue.toString() });
      return true;
    }
    return false;
  }
}
