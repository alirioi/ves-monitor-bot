/**
 * @fileoverview Servicio para formatear los mensajes del bot.
 */

import { formatDate, getDiffText } from '../utils/helpers.js';
import { SOURCES } from './rateService.js';

export class Formatter {
  static formatTasaMessage(usdRates, euroRates, prev) {
    const bcv = usdRates?.find(r => r.fuente === SOURCES.OFICIAL);
    const paralelo = usdRates?.find(r => r.fuente === SOURCES.PARALELO);

    let message = '📊 *Tasas del Día:*\n\n';

    message += '💵 *Dólar:*\n';
    if (bcv) {
      const diff = getDiffText(bcv.promedio, prev.last_usd_oficial);
      message += `🏦 *Oficial (BCV):* ${bcv.promedio}${diff} VES\n`;
    }
    if (paralelo) {
      const diff = getDiffText(paralelo.promedio, prev.last_usd_paralelo);
      message += `📈 *Paralelo:* ${paralelo.promedio.toFixed(2)}${diff} VES\n`;
    }
    
    if (bcv && paralelo) {
      const avg = (bcv.promedio + paralelo.promedio) / 2;
      message += `⚖️ *Promedio:* ${avg.toFixed(2)} VES\n`;
    }

    if (euroRates) {
      const euroBcv = euroRates.find(r => r.fuente === SOURCES.OFICIAL);
      const euroParalelo = euroRates.find(r => r.fuente === SOURCES.PARALELO);

      message += '\n💶 *Euro:*\n';
      if (euroBcv) {
        const diff = getDiffText(euroBcv.promedio, prev.last_eur_oficial);
        message += `🏦 *Oficial (BCV):* ${euroBcv.promedio}${diff} VES\n`;
      }
      if (euroParalelo) {
        const diff = getDiffText(euroParalelo.promedio, prev.last_eur_paralelo);
        message += `📈 *Paralelo:* ${euroParalelo.promedio.toFixed(2)}${diff} VES\n`;
      }
    }

    message += `\n🕒 *Última consulta:* ${formatDate(new Date())}`;
    return message;
  }

  static formatHistoricMessage(dateLabel, histOficial, histParalelo) {
    let message = `📊 *Tasas (${dateLabel}):*\n\n`;
    if (histOficial) message += `🏦 *BCV:* ${histOficial.promedio} VES\n`;
    if (histParalelo) message += `📈 *Paralelo:* ${histParalelo.promedio.toFixed(2)} VES\n`;
    return message;
  }

  static formatNotificationMessage(newValue, oldValue) {
    const diff = getDiffText(newValue, oldValue);
    return `🔔 *¡Cambio detectado en la tasa BCV!*\n\n` +
           `🏦 *Nuevo valor:* ${newValue}${diff} VES\n` +
           `🕒 *Detectado:* ${formatDate(new Date())}`;
  }

  static formatConversionResult(amount, fromSymbol, toSymbol, usedRate, result, rateType) {
    return `✅ *Resultado:*\n\n` +
           `🔹 *Monto:* ${amount.toLocaleString('es-VE')} ${fromSymbol}\n` +
           `🔹 *Tasa:* ${rateType.toUpperCase()}\n` +
           `🔸 *Valor:* ${usedRate}\n` +
           `🔸 *Total:* ${result.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${toSymbol}`;
  }
}
