/**
 * @fileoverview Servicio para la obtención y gestión de tasas.
 */

import { getRates, getEuroRates, getHistoricRate } from '../api.js';
import supabase from '../db.js';

export const SOURCES = {
  OFICIAL: 'oficial',
  PARALELO: 'paralelo'
};

export class RateService {
  /**
   * Obtiene todas las tasas actuales (USD y EUR) y la configuración previa.
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
   * Obtiene tasas históricas para una fecha.
   */
  static async getHistoricData(dateStr) {
    const [histOficial, histParalelo] = await Promise.all([
      getHistoricRate(dateStr, 'dolares', SOURCES.OFICIAL),
      getHistoricRate(dateStr, 'dolares', SOURCES.PARALELO)
    ]);
    return { histOficial, histParalelo };
  }

  /**
   * Actualiza una tasa en la base de datos si ha cambiado.
   */
  static async updateRateIfChanged(key, newValue, oldValue) {
    if (newValue && newValue !== oldValue) {
      await supabase.from('bot_config').upsert({ key: key, value: newValue.toString() });
      return true;
    }
    return false;
  }
}
