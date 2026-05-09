/**
 * @fileoverview Manejadores de acciones de botones inline (Callback Queries).
 * Gestiona la navegación de la calculadora y la generación de imágenes.
 */

import { Composer, Markup } from 'telegraf';
import { SOURCES } from '../services/rateService.js';
import { generateReceipt } from '../utils/imageGenerator.js';

/** Instancia de Composer para acciones de botones. */
const actions = new Composer();

/** Acción: Menú de selección para Dólar. */
actions.action('conv_usd', (ctx) => {
  ctx.editMessageText('¿Qué tipo de conversión deseas hacer?', {
    ...Markup.inlineKeyboard([
      [Markup.button.callback('USD ➡️ VES', 'usd_to_ves')],
      [Markup.button.callback('VES ➡️ USD', 'ves_to_usd')],
      [Markup.button.callback('⬅️ Volver', 'back_to_main')]
    ])
  });
});

/** Acción: Menú de selección para Euro. */
actions.action('conv_eur', (ctx) => {
  ctx.editMessageText('¿Qué tipo de conversión deseas hacer?', {
    ...Markup.inlineKeyboard([
      [Markup.button.callback('EUR ➡️ VES', 'eur_to_ves')],
      [Markup.button.callback('VES ➡️ EUR', 'ves_to_eur')],
      [Markup.button.callback('⬅️ Volver', 'back_to_main')]
    ])
  });
});

/** Acción: Menú de selección para conversión cruzada USD/EUR. */
actions.action('conv_cross', (ctx) => {
  ctx.editMessageText('¿Qué tipo de conversión deseas hacer?', {
    ...Markup.inlineKeyboard([
      [Markup.button.callback('USD ➡️ EUR', 'usd_to_eur')],
      [Markup.button.callback('EUR ➡️ USD', 'eur_to_usd')],
      [Markup.button.callback('⬅️ Volver', 'back_to_main')]
    ])
  });
});

/** Acción: Volver al menú principal de la calculadora. */
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
 * Función auxiliar para preguntar la tasa a utilizar tras elegir el tipo de conversión.
 * 
 * @param {Object} ctx - Contexto de Telegraf.
 * @param {string} type - Tipo de conversión (ej: 'usd_to_ves').
 * @param {string} currency - Moneda para el botón de volver.
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

// Registro de manejadores dinámicos para los botones de moneda
actions.action(/^(usd_to_ves|ves_to_usd)$/, (ctx) => askForAmount(ctx, ctx.match[1], 'USD'));
actions.action(/^(eur_to_ves|ves_to_eur)$/, (ctx) => askForAmount(ctx, ctx.match[1], 'EUR'));

/**
 * Manejador para la selección final de tasa.
 * Establece el estado de conversión y pide el monto al usuario.
 */
actions.action(/^rate:(.+):(.+)$/, (ctx) => {
  const rateType = ctx.match[1];
  const convType = ctx.match[2];
  ctx.session.state = { type: 'conversion', rateType, convType };
  const fromLabel = convType.split('_')[0].toUpperCase();
  ctx.reply(`✍️ Ingresa la cantidad en *${fromLabel}*:`, { parse_mode: 'Markdown' });
  ctx.answerCbQuery();
});

/** Acciones directas para conversiones cruzadas (usan BCV por defecto). */
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

/**
 * Acción: Generar Recibo.
 * Toma los datos almacenados en la sesión y genera una imagen dinámica.
 */
actions.action('gen_receipt', async (ctx) => {
  const data = ctx.session?.receiptData;
  if (!data) {
    return ctx.reply('❌ No se encontraron datos para generar el recibo. Realiza una nueva conversión.');
  }

  try {
    await ctx.answerCbQuery('Generando recibo...');
    await ctx.replyWithChatAction('upload_photo');
    
    const buffer = await generateReceipt(data);
    
    await ctx.replyWithPhoto({ source: buffer }, {
      caption: `✅ *Recibo generado con éxito*\nGenerado por @${ctx.botInfo.username.replace(/_/g, '\\_')}`,
      parse_mode: 'Markdown'
    });
  } catch (error) {
    console.error('Receipt Generation Error:', error);
    ctx.reply('❌ Error al generar la imagen del recibo.');
  }
});

export default actions;
