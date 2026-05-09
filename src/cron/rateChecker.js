/**
 * @fileoverview Tarea programada para verificar cambios en las tasas y notificar.
 */

import cron from 'node-cron';
import { RateService, SOURCES } from '../services/rateService.js';
import { Notificator } from '../services/notificator.js';
import { Formatter } from '../services/formatter.js';

/**
 * Inicializa el cron job.
 * @param {Telegraf} botInstance - Instancia del bot para enviar mensajes.
 */
export const initRateCron = (botInstance) => {
  cron.schedule('*/15 * * * *', async () => {
    const now = new Date();
    const caracasHour = parseInt(now.toLocaleString('en-US', { 
      timeZone: 'America/Caracas', 
      hour: 'numeric', 
      hour12: false 
    }));

    // Horario de operación (7 AM - 10 PM Caracas)
    if (caracasHour < 7 || caracasHour >= 22) return;

    console.log('Verificando cambios en la tasa para notificaciones...');
    try {
      const { usdRates, euroRates, prev } = await RateService.getAllCurrentData();
      
      const current = {
        last_usd_oficial: usdRates?.find(r => r.fuente === SOURCES.OFICIAL)?.promedio,
        last_usd_paralelo: usdRates?.find(r => r.fuente === SOURCES.PARALELO)?.promedio,
        last_eur_oficial: euroRates?.find(r => r.fuente === SOURCES.OFICIAL)?.promedio,
        last_eur_paralelo: euroRates?.find(r => r.fuente === SOURCES.PARALELO)?.promedio
      };

      let bcvChanged = false;

      for (const key in current) {
        const hasChanged = await RateService.updateRateIfChanged(key, current[key], prev[key]);
        if (hasChanged && key === 'last_usd_oficial') bcvChanged = true;
      }

      if (bcvChanged) {
        const newVal = current.last_usd_oficial;
        const oldVal = prev.last_usd_oficial;
        const message = Formatter.formatNotificationMessage(newVal, oldVal);
        await Notificator.notifySubscribers(botInstance, message);
      }
    } catch (error) {
      console.error('Cron Error:', error);
    }
  });
};
