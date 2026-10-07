/**
 * @fileoverview Tarea programada para verificar cambios en las tasas y notificar.
 */

import cron from 'node-cron';
import { RateService, SOURCES } from '../services/rateService.js';
import { Notificator } from '../services/notificator.js';
import { Formatter } from '../services/formatter.js';

/**
 * Inicializa los cron jobs:
 * 1. Monitoreo cada 15m (7 AM - 10 PM) para alertar cambios en el BCV.
 * 2. Notificación fija a las 7:00 AM Caracas con el reporte general de tasas.
 * 
 * @param {Telegraf} botInstance - Instancia del bot para enviar mensajes.
 */
export const initRateCron = (botInstance) => {
  // 1. Monitoreo de variaciones en la tasa oficial cada 15 minutos
  cron.schedule('*/15 * * * *', async () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Caracas',
      hour: 'numeric',
      hourCycle: 'h23'
    });
    const caracasHour = parseInt(formatter.format(now));

    // Horario de operación (7 AM - 10 PM Caracas)
    if (caracasHour < 7 || caracasHour >= 22) {
      console.log(`[Cron] Fuera de horario de operación en Caracas (Hora actual: ${caracasHour}h).`);
      return;
    }

    console.log(`[Cron] Verificando cambios en la tasa para notificaciones (Hora Caracas: ${caracasHour}h)...`);
    try {
      const { usdRates, euroRates, prev } = await RateService.getAllCurrentData();
      
      const current = {
        last_usd_oficial: usdRates?.find(r => r.fuente === SOURCES.OFICIAL)?.promedio,
        last_usd_usdt: usdRates?.find(r => r.fuente === SOURCES.PARALELO)?.promedio,
        last_eur_oficial: euroRates?.find(r => r.fuente === SOURCES.OFICIAL)?.promedio
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

  // 2. Notificación fija diaria a las 7:00 AM hora de Caracas (0 7 * * *)
  cron.schedule('0 7 * * *', async () => {
    console.log('[Cron 7:00 AM] Enviando reporte matutino diario a los usuarios...');
    try {
      const { usdRates, euroRates, prev } = await RateService.getAllCurrentData();
      if (!usdRates) {
        console.error('[Cron 7:00 AM] No se pudieron obtener las tasas para el reporte.');
        return;
      }
      const message = '☀️ *¡Buenos días!*\nAquí tienes las tasas de hoy:\n\n' + Formatter.formatTasaMessage(usdRates, euroRates, prev);
      await Notificator.notifySubscribers(botInstance, message);
      console.log('[Cron 7:00 AM] Reporte diario enviado con éxito.');
    } catch (error) {
      console.error('[Cron 7:00 AM Error]:', error);
    }
  }, {
    timezone: 'America/Caracas'
  });
};
