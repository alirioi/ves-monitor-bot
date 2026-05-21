/**
 * @fileoverview Servicio para formatear los mensajes del bot utilizando Markdown.
 * Centraliza el diseño de los mensajes para mantener consistencia visual.
 */

import { formatDate, getDiffText } from '../utils/helpers.js';
import { SOURCES } from './rateService.js';

/**
 * Clase encargada de generar el texto formateado de las respuestas.
 */
export class Formatter {
  /**
   * Genera el mensaje para el comando /tasa con la información de USD, EUR y variaciones.
   * 
   * @param {Array} usdRates - Tasas de dólar obtenidas de la API.
   * @param {Array} euroRates - Tasas de euro obtenidas de la API.
   * @param {Object} prev - Valores previos guardados en DB para calcular variaciones.
   * @returns {string} Mensaje formateado en Markdown.
   */
  static formatTasaMessage(usdRates, euroRates, prev) {
    const bcv = usdRates?.find(r => r.fuente === SOURCES.OFICIAL);
    const usdt = usdRates?.find(r => r.fuente === SOURCES.PARALELO);

    let message = '📊 *Tasas del Día:*\n\n';

    message += '💵 *Dólar:*\n';
    if (bcv) {
      const diff = getDiffText(bcv.promedio, prev.last_usd_oficial);
      message += `🏦 *Oficial (BCV):* ${bcv.promedio}${diff} VES\n`;
    }
    if (usdt) {
      const prevUsdt = prev.last_usd_usdt || prev.last_usd_paralelo;
      const diff = getDiffText(usdt.promedio, prevUsdt);
      message += `📈 *USDT:* ${usdt.promedio.toFixed(2)}${diff} VES\n`;
    }
    
    if (bcv && usdt) {
      const avg = (bcv.promedio + usdt.promedio) / 2;
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

  /**
   * Formatea la respuesta para una consulta histórica.
   * 
   * @param {string} dateLabel - Fecha formateada DD/MM/YYYY.
   * @param {Object} histOficial - Tasa oficial de esa fecha.
   * @param {Object} histUsdt - Tasa USDT de esa fecha.
   * @returns {string} Mensaje formateado.
   */
  static formatHistoricMessage(dateLabel, histOficial, histUsdt) {
    let message = `📊 *Tasas (${dateLabel}):*\n\n`;
    if (histOficial) message += `🏦 *BCV:* ${histOficial.promedio} VES\n`;
    if (histUsdt) message += `📈 *USDT:* ${histUsdt.promedio.toFixed(2)} VES\n`;
    return message;
  }

  /**
   * Genera el mensaje de notificación automática cuando detecta un cambio.
   * 
   * @param {number} newValue - Tasa nueva.
   * @param {number} oldValue - Tasa anterior.
   * @returns {string} Mensaje de alerta formateado.
   */
  static formatNotificationMessage(newValue, oldValue) {
    const diff = getDiffText(newValue, oldValue);
    return `🔔 *¡Cambio detectado en la tasa BCV!*\n\n` +
           `🏦 *Nuevo valor:* ${newValue}${diff} VES\n` +
           `🕒 *Detectado:* ${formatDate(new Date())}`;
  }

  /**
   * Formatea el resultado de una conversión monetaria.
   * 
   * @param {number} amount - Cantidad original.
   * @param {string} fromSymbol - Símbolo de moneda origen.
   * @param {string} toSymbol - Símbolo de moneda destino.
   * @param {string} usedRate - Texto de la tasa utilizada.
   * @param {number} result - Resultado calculado.
   * @param {string} rateType - Fuente utilizada (BCV/Paralelo).
   * @returns {string} Mensaje del resultado de la calculadora.
   */
  static formatConversionResult(amount, fromSymbol, toSymbol, usedRate, result, rateType) {
    return `✅ *Resultado:*\n\n` +
           `🔹 *Monto:* ${amount.toLocaleString('es-VE')} ${fromSymbol}\n` +
           `🔹 *Tasa:* ${rateType.toUpperCase()}\n` +
           `🔸 *Valor:* ${usedRate}\n` +
           `🔸 *Total:* ${result.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${toSymbol}`;
  }
}
