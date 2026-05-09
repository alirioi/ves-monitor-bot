/**
 * @fileoverview Manejador de mensajes de texto (procesamiento de estados).
 */

import { Composer } from 'telegraf';
import { getRates, getEuroRates } from '../api.js';
import { RateService } from '../services/rateService.js';
import { ConversionService } from '../services/conversionService.js';
import { Formatter } from '../services/formatter.js';

const textHandler = new Composer();

textHandler.on('text', async (ctx) => {
  const state = ctx.session?.state;
  if (!state) return;

  const text = ctx.message.text.trim();

  // Caso 1: Flujo de Conversión
  if (state.type === 'conversion') {
    const cleanText = text.replace(/\.(?=\d{3}(?!\d))/g, '').replace(',', '.');
    const amount = parseFloat(cleanText);
    if (isNaN(amount)) return ctx.reply('❌ Por favor, ingresa un número válido.');

    try {
      const isCross = state.convType.includes('eur') && state.convType.includes('usd');
      let usdRates, euroRates;
      
      if (isCross) {
        [usdRates, euroRates] = await Promise.all([getRates(), getEuroRates()]);
      } else {
        const isUsd = state.convType.includes('usd');
        usdRates = isUsd ? await getRates() : null;
        euroRates = !isUsd ? await getEuroRates() : null;
      }

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

      const message = Formatter.formatConversionResult(
        amount,
        conversion.fromSymbol,
        conversion.toSymbol,
        conversion.usedRate,
        conversion.result,
        state.rateType
      );

      ctx.replyWithMarkdown(message);
    } catch (error) {
      console.error('Conversion Error:', error);
      ctx.reply('❌ Error al realizar la conversión.');
    }
    delete ctx.session.state;
  }

  // Caso 2: Flujo de Consulta Histórica
  else if (state.type === 'historico') {
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return ctx.reply('❌ Formato inválido. Usa DD/MM/YYYY');

    const formattedDate = `${match[3]}-${match[2]}-${match[1]}`;
    ctx.reply('🔍 Buscando...');

    try {
      const { histOficial, histParalelo } = await RateService.getHistoricData(formattedDate);

      if (!histOficial && !histParalelo) return ctx.reply('❌ No hay datos para esa fecha.');

      const message = Formatter.formatHistoricMessage(text, histOficial, histParalelo);
      ctx.replyWithMarkdown(message);
    } catch (error) {
      console.error('Historic Error:', error);
      ctx.reply('❌ Error al consultar el histórico.');
    }
    delete ctx.session.state;
  }
});

export default textHandler;
