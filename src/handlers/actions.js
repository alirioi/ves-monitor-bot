/**
 * @fileoverview Manejadores de acciones de teclado inline.
 */

import { Composer, Markup } from 'telegraf';
import { SOURCES } from '../services/rateService.js';

const actions = new Composer();

actions.action('conv_usd', (ctx) => {
  ctx.editMessageText('¿Qué tipo de conversión deseas hacer?', {
    ...Markup.inlineKeyboard([
      [Markup.button.callback('USD ➡️ VES', 'usd_to_ves')],
      [Markup.button.callback('VES ➡️ USD', 'ves_to_usd')],
      [Markup.button.callback('⬅️ Volver', 'back_to_main')]
    ])
  });
});

actions.action('conv_eur', (ctx) => {
  ctx.editMessageText('¿Qué tipo de conversión deseas hacer?', {
    ...Markup.inlineKeyboard([
      [Markup.button.callback('EUR ➡️ VES', 'eur_to_ves')],
      [Markup.button.callback('VES ➡️ EUR', 'ves_to_eur')],
      [Markup.button.callback('⬅️ Volver', 'back_to_main')]
    ])
  });
});

actions.action('conv_cross', (ctx) => {
  ctx.editMessageText('¿Qué tipo de conversión deseas hacer?', {
    ...Markup.inlineKeyboard([
      [Markup.button.callback('USD ➡️ EUR', 'usd_to_eur')],
      [Markup.button.callback('EUR ➡️ USD', 'eur_to_usd')],
      [Markup.button.callback('⬅️ Volver', 'back_to_main')]
    ])
  });
});

actions.action('back_to_main', (ctx) => {
  ctx.editMessageText('🧮 *Calculadora de Divisas*\nSelecciona la moneda que deseas convertir:', {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('💵 Dólar (USD)', 'conv_usd')],
      [Markup.button.callback('💶 Euro (EUR)', 'conv_eur')],
      [Markup.button.callback('💱 Entre USD/EUR', 'conv_cross')]
    ])
  });
});

/**
 * Auxiliar para preguntar la cantidad tras seleccionar tipo de tasa.
 */
const askForAmount = (ctx, type, currency) => {
  ctx.editMessageText('¿Qué tasa deseas utilizar?', {
    ...Markup.inlineKeyboard([
      [Markup.button.callback('🏦 Oficial (BCV)', `rate:${SOURCES.OFICIAL}:${type}`)],
      [Markup.button.callback('📈 Paralelo', `rate:${SOURCES.PARALELO}:${type}`)],
      [Markup.button.callback('⬅️ Volver', `conv_${currency.toLowerCase()}`)]
    ])
  });
};

actions.action(/^(usd_to_ves|ves_to_usd)$/, (ctx) => askForAmount(ctx, ctx.match[1], 'USD'));
actions.action(/^(eur_to_ves|ves_to_eur)$/, (ctx) => askForAmount(ctx, ctx.match[1], 'EUR'));

actions.action(/^rate:(.+):(.+)$/, (ctx) => {
  const rateType = ctx.match[1];
  const convType = ctx.match[2];
  ctx.session.state = { type: 'conversion', rateType, convType };
  const fromLabel = convType.split('_')[0].toUpperCase();
  ctx.reply(`✍️ Ingresa la cantidad en *${fromLabel}*:`, { parse_mode: 'Markdown' });
  ctx.answerCbQuery();
});

actions.action('usd_to_eur', (ctx) => {
  ctx.session.state = { type: 'conversion', rateType: SOURCES.OFICIAL, convType: 'usd_to_eur' };
  ctx.reply('✍️ Ingresa la cantidad en *USD* que deseas convertir a *EUR*:', { parse_mode: 'Markdown' });
  ctx.answerCbQuery();
});

actions.action('eur_to_usd', (ctx) => {
  ctx.session.state = { type: 'conversion', rateType: SOURCES.OFICIAL, convType: 'eur_to_usd' };
  ctx.reply('✍️ Ingresa la cantidad en *EUR* que deseas convertir a *USD*:', { parse_mode: 'Markdown' });
  ctx.answerCbQuery();
});

export default actions;
