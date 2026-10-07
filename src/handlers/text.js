/**
 * @fileoverview Manejador de mensajes de texto libres (procesamiento de estados y entradas de usuario).
 * Gestiona el flujo paso a paso de la calculadora y la consulta histórica.
 */

import { Composer, Markup } from 'telegraf';
import { getRates, getEuroRates } from '../api.js';
import { formatDate } from '../utils/helpers.js';
import { RateService } from '../services/rateService.js';
import { ConversionService } from '../services/conversionService.js';
import { Formatter } from '../services/formatter.js';

/** Instancia de Composer para mensajes de texto. */
const textHandler = new Composer();

/**
 * Escucha todos los mensajes de texto y actúa según el estado actual de la sesión del usuario.
 */
textHandler.on('text', async (ctx) => {
  const state = ctx.session?.state;
  if (!state) return;

  const text = ctx.message.text.trim();

  // Caso 1: Flujo de Conversión (Calculadora)
  if (state.type === 'conversion') {
    // Limpieza de formato numérico (soporta puntos y comas de mil/decimal)
    const cleanText = text.replace(/\.(?=\d{3}(?!\d))/g, '').replace(',', '.');
    const amount = parseFloat(cleanText);
    if (isNaN(amount)) return ctx.reply('❌ Por favor, ingresa un número válido.');

    try {
      const isCross = state.convType.includes('eur') && state.convType.includes('usd');
      let usdRates, euroRates;
      
      // Obtención de tasas según el tipo de moneda seleccionada
      if (isCross) {
        [usdRates, euroRates] = await Promise.all([getRates(), getEuroRates()]);
      } else {
        const isUsd = state.convType.includes('usd');
        usdRates = isUsd ? await getRates() : null;
        euroRates = !isUsd ? await getEuroRates() : null;
      }

      // Cálculo de la conversión mediante el servicio especializado
      const conversion = ConversionService.convert({
        amount,
        convType: state.convType,
        rateType: state.rateType,
        usdRates,
        euroRates
      });

      if (!conversion) {
        delete ctx.session.state;
        return ctx.reply('❌ No se pudo realizar la conversión. Verifica los datos.');
      }

      // Determinar la etiqueta clara de la tasa (ej: VES/USDT, VES/USD BCV, etc.)
      let rateLabel = '';
      if (state.convType.includes('cross')) {
        rateLabel = `${conversion.toSymbol}/${conversion.fromSymbol}`;
      } else if (state.convType.includes('usd')) {
        rateLabel = state.rateType === 'paralelo' ? 'VES/USDT' : 'VES/USD (BCV)';
      } else if (state.convType.includes('eur')) {
        rateLabel = 'VES/EUR (BCV)';
      } else {
        rateLabel = `VES/${conversion.fromSymbol}`;
      }

      const message = Formatter.formatConversionResult(
        amount,
        conversion.fromSymbol,
        conversion.toSymbol,
        rateLabel,
        conversion.price,
        conversion.result
      );

      // Formatear montos para el recibo garantizando exactamente 2 decimales para VES
      const formatReceiptCurrency = (val, symbol) => {
        return `${val.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
      };

      // Almacenamos los datos en la sesión para el recibo con 2 decimales y etiquetas claras
      ctx.session.receiptData = {
        sourceAmount: formatReceiptCurrency(amount, conversion.fromSymbol),
        targetAmount: formatReceiptCurrency(conversion.result, conversion.toSymbol),
        rateUsed: `${conversion.price.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${rateLabel}`,
        date: formatDate(new Date())
      };

      // Enviamos el resultado con un botón para generar el recibo visual
      ctx.replyWithMarkdown(message, {
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🖼️ Generar Recibo', 'gen_receipt')]
        ])
      });
    } catch (error) {
      console.error('Conversion Error:', error);
      ctx.reply('❌ Error al realizar la conversión.');
    }
    // Limpiamos el estado tras procesar la entrada
    delete ctx.session.state;
  }

  // Caso 2: Flujo de Consulta Histórica
  else if (state.type === 'historico') {
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return ctx.reply('❌ Formato inválido. Usa DD/MM/YYYY');

    const formattedDate = `${match[3]}-${match[2]}-${match[1]}`;
    ctx.reply('🔍 Buscando...');

    try {
      const { histOficial, histUsdt } = await RateService.getHistoricData(formattedDate);

      if (!histOficial && !histUsdt) return ctx.reply('❌ No hay datos para esa fecha.');

      const message = Formatter.formatHistoricMessage(text, histOficial, histUsdt);
      ctx.replyWithMarkdown(message);
    } catch (error) {
      console.error('Historic Error:', error);
      ctx.reply('❌ Error al consultar el histórico.');
    }
    delete ctx.session.state;
  }
});

export default textHandler;
