/**
 * @fileoverview Manejadores de comandos del bot (Comandos /start, /help, /tasa, etc.).
 * Utiliza Composer para modularizar la lógica de comandos.
 */

import { Composer, Markup } from 'telegraf';
import { RateService } from '../services/rateService.js';
import { Formatter } from '../services/formatter.js';
import { getColombiaRates, getArgentinaRates } from '../api.js';
import pool from '../db.js';

/** Instancia de Composer para agrupar comandos. */
const commands = new Composer();

/** 
 * Manejador del comando /start. 
 * Envía el mensaje de bienvenida inicial y registra al usuario para las notificaciones matutinas.
 */
commands.start(async (ctx) => {
  const chatId = ctx.from.id;
  try {
    await pool.query(
      `INSERT INTO public.subscribers (chat_id) VALUES ($1) ON CONFLICT (chat_id) DO NOTHING`,
      [chatId]
    );
  } catch (err) {
    console.error('Error registrando suscriptor en /start:', err.message);
  }

  ctx.reply('¡Hola! Bienvenido a *VES Tasa Monitor* 🇻🇪\n\nTu asistente para consultar el valor del dólar y euro en tiempo real.\n\nRecibirás el reporte de tasas todos los días a las 7:00 AM (Caracas).\n\nUsa /tasa para ver los precios actuales o /help para ver todos los comandos.', { parse_mode: 'Markdown' });
});

/** 
 * Manejador del comando /help. 
 * Muestra la lista de comandos disponibles y notas legales.
 */
commands.help((ctx) => {
  ctx.reply(
    '📖 *Comandos disponibles:*\n\n' +
    '🇻🇪 *Venezuela:*\n' +
    '/tasa - Ver tasas actuales (BCV, USDT, Euro)\n' +
    '/historico - Consulta de tasas por fecha (DD/MM/YYYY)\n\n' +
    '🌎 *Internacional:*\n' +
    '/colombia - Tasas de Colombia (TRM Oficial y Mercado)\n' +
    '/argentina - Tasas de Argentina (Oficial y Blue)\n\n' +
    '🧮 *Herramientas:*\n' +
    '/convertir - Calculadora de divisas (VES, USD, EUR, COP, ARS)\n' +
    '/help - Mostrar este mensaje de ayuda\n\n' +
    '📢 *Notificaciones:* Las alertas de cambio y el reporte matutino (7:00 AM) son automáticas y exclusivas para Venezuela 🇻🇪.\n\n' +
    '⚠️ *Nota:* Los datos son informativos y dependen de terceros. No nos hacemos responsables por el uso de esta información.',
    { parse_mode: 'Markdown' }
  );
});

/** 
 * Manejador del comando /tasa. 
 * Obtiene tasas actuales y las envía formateadas.
 */
commands.command('tasa', async (ctx) => {
  try {
    const { usdRates, euroRates, prev } = await RateService.getAllCurrentData();
    if (!usdRates) return ctx.reply('Lo siento, no pude obtener las tasas en este momento.');

    const message = Formatter.formatTasaMessage(usdRates, euroRates, prev);
    ctx.replyWithMarkdown(message);
  } catch (error) {
    console.error('Command Tasa Error:', error);
    ctx.reply('Ocurrió un error al procesar tu solicitud.');
  }
});

/** 
 * Manejador del comando /colombia. 
 * Muestra las tasas de cambio de Colombia frente al dólar (TRM Oficial y Mercado).
 */
commands.command('colombia', async (ctx) => {
  try {
    const rates = await getColombiaRates();
    if (!rates) return ctx.reply('❌ No se pudieron obtener las tasas de Colombia en este momento.');

    const message = Formatter.formatColombiaRates(rates);
    ctx.replyWithMarkdown(message, {
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🧮 Convertir COP ↔ USD', 'conv_cop')]
      ])
    });
  } catch (error) {
    console.error('Command Colombia Error:', error);
    ctx.reply('Ocurrió un error al procesar tu solicitud.');
  }
});

/** 
 * Manejador del comando /argentina. 
 * Muestra las tasas de cambio de Argentina frente al dólar (Oficial y Blue).
 */
commands.command('argentina', async (ctx) => {
  try {
    const rates = await getArgentinaRates();
    if (!rates) return ctx.reply('❌ No se pudieron obtener las tasas de Argentina en este momento.');

    const message = Formatter.formatArgentinaRates(rates);
    ctx.replyWithMarkdown(message, {
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🧮 Convertir ARS ↔ USD', 'conv_ars')]
      ])
    });
  } catch (error) {
    console.error('Command Argentina Error:', error);
    ctx.reply('Ocurrió un error al procesar tu solicitud.');
  }
});

/** 
 * Manejador del comando /convertir. 
 * Inicia el flujo de la calculadora con un teclado inline con soporte para VES, COP y ARS.
 */
commands.command('convertir', (ctx) => {
  ctx.reply('🧮 *Calculadora de Divisas*\nSelecciona la moneda que deseas convertir:', {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('💵 Dólar (USD / VES)', 'conv_usd')],
      [Markup.button.callback('💶 Euro (EUR / VES)', 'conv_eur')],
      [Markup.button.callback('💱 Entre USD / EUR', 'conv_cross')],
      [Markup.button.callback('🇨🇴 Peso Colombiano (COP ↔ USD)', 'conv_cop')],
      [Markup.button.callback('🇦🇷 Peso Argentino (ARS ↔ USD)', 'conv_ars')]
    ])
  });
});

/** 
 * Manejador del comando /historico. 
 * Inicia el flujo de consulta por fecha configurando el estado de sesión.
 */
commands.command('historico', (ctx) => {
  ctx.session.state = { type: 'historico' };
  ctx.reply('📅 *Consulta Histórica*\nPor favor, ingresa la fecha (DD/MM/YYYY):', { parse_mode: 'Markdown' });
});

export default commands;
