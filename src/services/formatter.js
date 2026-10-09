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
   * Genera el mensaje para el comando /tasa con el formato de Reporte Monitor Venezuela.
   * 
   * @param {Array} usdRates - Tasas de dólar obtenidas de la API.
   * @param {Array} euroRates - Tasas de euro obtenidas de la API.
   * @param {Object} prev - Valores previos guardados en DB para calcular variaciones.
   * @returns {string} Mensaje formateado en Markdown.
   */
  static formatTasaMessage(usdRates, euroRates, prev = {}) {
    const bcv = usdRates?.find(r => r.fuente === SOURCES.OFICIAL);
    const usdt = usdRates?.find(r => r.fuente === SOURCES.PARALELO);
    const euroBcv = euroRates?.find(r => r.fuente === SOURCES.OFICIAL);

    const now = new Date();

    // Formatear Fecha: "Miércoles, 7 de oct. de 2026"
    const rawDate = now.toLocaleDateString('es-VE', {
      timeZone: 'America/Caracas',
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const formattedDate = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

    // Formatear Hora: "05:58 p. m."
    const formattedTime = now.toLocaleTimeString('es-VE', {
      timeZone: 'America/Caracas',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    const formatCurrency = (val) => {
      if (val === null || val === undefined || isNaN(val)) return '0,00';
      return val.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    let message = `📊 *Reporte VES Tasa Monitor*\n`;
    message += `🗓️ ${formattedDate}\n`;
    message += `⏱️ Actualizado: ${formattedTime}\n\n`;

    if (bcv?.promedio) {
      message += `🇺🇸 *Dólar BCV:* Bs. ${formatCurrency(bcv.promedio)}\n`;
    }

    if (usdt?.promedio) {
      message += `🟡 *USDT Binance:* Bs. ${formatCurrency(usdt.promedio)}\n`;
    }

    if (euroBcv?.promedio) {
      message += `🇪🇺 *Euro BCV:* Bs. ${formatCurrency(euroBcv.promedio)}\n`;
    }

    if (bcv?.promedio && usdt?.promedio) {
      const diffBs = usdt.promedio - bcv.promedio;
      const diffPct = ((diffBs / bcv.promedio) * 100).toFixed(2);
      message += `\n⚖️ *Brecha:* Bs. ${formatCurrency(diffBs)} (${diffPct}%)`;
    }

    return message;
  }

  /**
   * Formatea la respuesta para una consulta histórica.
   * 
   * @param {string} dateLabel - Fecha formateada DD/MM/YYYY.
   * @param {Object} histOficial - Tasa Dólar oficial de esa fecha.
   * @param {Object} histUsdt - Tasa USDT de esa fecha.
   * @param {Object} [histEuro] - Tasa Euro oficial de esa fecha.
   * @returns {string} Mensaje formateado.
   */
  static formatHistoricMessage(dateLabel, histOficial, histUsdt, histEuro = null) {
    const formatCurrency = (val) => {
      if (val === null || val === undefined || isNaN(val)) return '0,00';
      return val.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    let message = `📊 *Tasas Históricas (${dateLabel})*\n\n`;
    if (histOficial?.promedio) message += `🇺🇸 *Dólar BCV:* Bs. ${formatCurrency(histOficial.promedio)}\n`;
    if (histUsdt?.promedio) message += `🟡 *USDT Binance:* Bs. ${formatCurrency(histUsdt.promedio)}\n`;
    if (histEuro?.promedio) message += `🇪🇺 *Euro BCV:* Bs. ${formatCurrency(histEuro.promedio)}\n`;
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
   * @param {string} rateLabel - Etiqueta de la tasa (ej: 'VES/USDT', 'VES/USD BCV').
   * @param {number} ratePrice - Valor numérico de la tasa.
   * @param {number} result - Resultado calculado.
   * @returns {string} Mensaje del resultado de la calculadora.
   */
  static formatConversionResult(amount, fromSymbol, toSymbol, rateLabel, ratePrice, result) {
    const formatNumber = (num, decimals = 2) => {
      if (num === null || num === undefined || isNaN(num)) return '0,00';
      return num.toLocaleString('es-VE', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    };

    const fromDecimals = fromSymbol === 'VES' ? 2 : 2;
    const toDecimals = toSymbol === 'VES' ? 2 : 2;

    return `✅ *Resultado:*\n\n` +
           `🔹 *Monto:* ${formatNumber(amount, fromDecimals)} ${fromSymbol}\n` +
           `🔹 *Tasa:* ${formatNumber(ratePrice, 2)} ${rateLabel}\n` +
           `🔸 *Total:* ${formatNumber(result, toDecimals)} ${toSymbol}`;
  }

  /**
   * Formatea el mensaje de tasas para Colombia.
   * 
   * @param {Object} rates - Objeto con trm, compra, venta y mercado.
   * @returns {string} Mensaje formateado en Markdown.
   */
  static formatColombiaRates(rates) {
    const formatNumber = (num) => {
      if (num === null || num === undefined || isNaN(num)) return '0,00';
      return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const now = new Date();
    const rawDate = now.toLocaleDateString('es-VE', {
      timeZone: 'America/Bogota',
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const formattedDate = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

    let msg = `🇨🇴 *Tasas de Cambio — Colombia*\n`;
    msg += `🗓️ ${formattedDate}\n\n`;

    if (rates?.trm) {
      msg += `🏛️ *TRM (Oficial):* $ ${formatNumber(rates.trm)} COP\n`;
    }
    if (rates?.venta) {
      msg += `💵 *Dólar Mercado (Venta):* $ ${formatNumber(rates.venta)} COP\n`;
    }
    if (rates?.compra) {
      msg += `💵 *Dólar Mercado (Compra):* $ ${formatNumber(rates.compra)} COP\n`;
    }

    return msg;
  }

  /**
   * Formatea el mensaje de tasas para Argentina.
   * 
   * @param {Object} rates - Objeto con oficial, blue (compra/venta).
   * @returns {string} Mensaje formateado en Markdown.
   */
  static formatArgentinaRates(rates) {
    const formatNumber = (num) => {
      if (num === null || num === undefined || isNaN(num)) return '0,00';
      return num.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const now = new Date();
    const rawDate = now.toLocaleDateString('es-VE', {
      timeZone: 'America/Argentina/Buenos_Aires',
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    const formattedDate = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);

    let msg = `🇦🇷 *Tasas de Cambio — Argentina*\n`;
    msg += `🗓️ ${formattedDate}\n\n`;

    if (rates?.oficialVenta || rates?.oficial) {
      msg += `🏛️ *Dólar Oficial (Venta):* $ ${formatNumber(rates.oficialVenta || rates.oficial)} ARS\n`;
    }
    if (rates?.oficialCompra) {
      msg += `🏛️ *Dólar Oficial (Compra):* $ ${formatNumber(rates.oficialCompra)} ARS\n\n`;
    } else {
      msg += `\n`;
    }

    if (rates?.blueVenta || rates?.blue) {
      msg += `💵 *Dólar Blue (Venta):* $ ${formatNumber(rates.blueVenta || rates.blue)} ARS\n`;
    }
    if (rates?.blueCompra) {
      msg += `💵 *Dólar Blue (Compra):* $ ${formatNumber(rates.blueCompra)} ARS\n`;
    }

    return msg;
  }
}
