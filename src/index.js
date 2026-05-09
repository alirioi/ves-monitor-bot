/**
 * @fileoverview Punto de entrada principal para el bot VES Tasa Monitor.
 * Maneja comandos, acciones de teclado inline, conversiones de divisas,
 * suscripciones y notificaciones automáticas mediante cron.
 */

import { Telegraf, Markup } from 'telegraf';
import { getRates, getEuroRates, getHistoricRate } from './api.js';
import supabase from './db.js';
import { config } from './config.js';
import cron from 'node-cron';
import http from 'http';

/** Instancia principal del bot de Telegram. */
const bot = new Telegraf(config.botToken);

/** 
 * Constantes para las fuentes de tasas.
 * @enum {string}
 */
const SOURCES = {
  OFICIAL: 'oficial',
  PARALELO: 'paralelo'
};

/** 
 * Estado temporal para conversiones e históricos.
 * @type {Object<number, Object>} 
 */
const userStates = {};

/**
 * Función auxiliar para pausar la ejecución (para evitar rate-limits).
 * @param {number} ms - Milisegundos a esperar.
 * @returns {Promise<void>}
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Formatea una cadena de fecha a un formato legible en español de Venezuela.
 * @param {string} dateStr - Cadena de fecha ISO o compatible con Date.
 * @returns {string} Fecha formateada o 'Desconocida'.
 */
const formatDate = (dateStr) => {
  if (!dateStr) return 'Desconocida';
  const date = new Date(dateStr);
  return date.toLocaleString('es-VE', {
    timeZone: 'America/Caracas',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Calcula la diferencia porcentual entre el valor actual y el anterior.
 * @param {number} current - Tasa actual.
 * @param {number} previous - Tasa anterior guardada.
 * @returns {string} Texto formateado con el porcentaje y emoji.
 */
const getDiffText = (current, previous) => {
  if (!previous || previous === 0 || current === previous) return '';
  const diff = ((current - previous) / previous) * 100;
  const emoji = diff > 0 ? '🔺' : '🔻';
  const sign = diff > 0 ? '+' : '';
  return ` ${emoji} ${sign}${diff.toFixed(2)}%`;
};

// --- Manejadores de Comandos ---

/** Manejador del comando /start. */
bot.start((ctx) => {
  ctx.reply('¡Hola! Bienvenido a *VES Tasa Monitor* 🇻🇪\n\nTu asistente para consultar el valor del dólar y euro en tiempo real.\n\nUsa /tasa para ver los precios actuales o /help para ver todos los comandos.', { parse_mode: 'Markdown' });
});

/** Manejador del comando /help. */
bot.help((ctx) => {
  ctx.reply(
    'Comandos disponibles:\n' +
    '/tasa - Ver las tasas actuales\n' +
    '/convertir - Calculadora de divisas\n' +
    '/historico - Consulta histórico por fecha\n' +
    '/suscribir - Recibir alertas cuando la tasa cambie\n' +
    '/desuscribir - Dejar de recibir alertas\n' +
    '/help - Mostrar este mensaje\n\n' +
    '⚠️ Nota: Los datos son informativos y dependen de terceros. No nos hacemos responsables por el uso de esta información.'
  );
});

/** Manejador del comando /tasa. Obtiene y muestra los precios actuales. */
bot.command('tasa', async (ctx) => {
  try {
    const [usdRates, euroRates, { data: configData }] = await Promise.all([
      getRates(),
      getEuroRates(),
      supabase.from('bot_config').select('*')
    ]);

    if (!usdRates) return ctx.reply('Lo siento, no pude obtener las tasas en este momento.');

    // Convertir array de config a un objeto para fácil acceso
    const prev = {};
    configData?.forEach(item => prev[item.key] = parseFloat(item.value));

    const bcv = usdRates.find(r => r.fuente === SOURCES.OFICIAL);
    const paralelo = usdRates.find(r => r.fuente === SOURCES.PARALELO);

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

    const queryTime = new Date();
    message += `\n🕒 *Última consulta:* ${formatDate(queryTime)}`;

    ctx.replyWithMarkdown(message);
  } catch (error) {
    console.error('Command Tasa Error:', error);
    ctx.reply('Ocurrió un error al procesar tu solicitud.');
  }
});

/** Manejador del comando /convertir. Muestra el menú de selección de moneda. */
bot.command('convertir', (ctx) => {
  ctx.reply('🧮 *Calculadora de Divisas*\nSelecciona la moneda que deseas convertir:', {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('💵 Dólar (USD)', 'conv_usd')],
      [Markup.button.callback('💶 Euro (EUR)', 'conv_eur')],
      [Markup.button.callback('💱 Entre USD/EUR', 'conv_cross')]
    ])
  });
});

/** Manejador del comando /suscribir. Registra al usuario en Supabase para alertas. */
bot.command('suscribir', async (ctx) => {
  const chatId = ctx.from.id;
  try {
    const { error } = await supabase.from('subscribers').upsert({ chat_id: chatId });
    if (error) throw error;
    ctx.reply('✅ ¡Te has suscrito con éxito! Te avisaré cuando la tasa oficial del BCV cambie.');
  } catch (error) {
    console.error('Error al suscribir:', error);
    ctx.reply('❌ Ocurrió un error al intentar suscribirte.');
  }
});

/** Manejador del comando /desuscribir. Elimina al usuario de las alertas. */
bot.command('desuscribir', async (ctx) => {
  const chatId = ctx.from.id;
  try {
    const { error } = await supabase.from('subscribers').delete().eq('chat_id', chatId);
    if (error) throw error;
    ctx.reply('🔔 Te has desuscrito. Ya no recibirás notificaciones automáticas.');
  } catch (error) {
    console.error('Error al desuscribir:', error);
    ctx.reply('❌ Ocurrió un error al intentar desuscribirte.');
  }
});

/** Manejador del comando /historico. Inicia el flujo de consulta histórica. */
bot.command('historico', (ctx) => {
  userStates[ctx.from.id] = { type: 'historico' };
  ctx.reply('📅 *Consulta Histórica*\nPor favor, ingresa la fecha (DD/MM/YYYY):', { parse_mode: 'Markdown' });
});

// --- Manejadores de Acciones de Teclado Inline ---

bot.action('conv_usd', (ctx) => {
  ctx.editMessageText('¿Qué tipo de conversión deseas hacer?', {
    ...Markup.inlineKeyboard([
      [Markup.button.callback('USD ➡️ VES', 'usd_to_ves')],
      [Markup.button.callback('VES ➡️ USD', 'ves_to_usd')],
      [Markup.button.callback('⬅️ Volver', 'back_to_main')]
    ])
  });
});

bot.action('conv_eur', (ctx) => {
  ctx.editMessageText('¿Qué tipo de conversión deseas hacer?', {
    ...Markup.inlineKeyboard([
      [Markup.button.callback('EUR ➡️ VES', 'eur_to_ves')],
      [Markup.button.callback('VES ➡️ EUR', 'ves_to_eur')],
      [Markup.button.callback('⬅️ Volver', 'back_to_main')]
    ])
  });
});

bot.action('conv_cross', (ctx) => {
  ctx.editMessageText('¿Qué tipo de conversión deseas hacer?', {
    ...Markup.inlineKeyboard([
      [Markup.button.callback('USD ➡️ EUR', 'usd_to_eur')],
      [Markup.button.callback('EUR ➡️ USD', 'eur_to_usd')],
      [Markup.button.callback('⬅️ Volver', 'back_to_main')]
    ])
  });
});

bot.action('back_to_main', (ctx) => {
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
 * @param {Context} ctx - Contexto de Telegraf.
 * @param {string} type - Tipo de conversión (ej: 'usd_to_ves').
 * @param {string} currency - Etiqueta de moneda para el botón de volver.
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

bot.action('usd_to_eur', (ctx) => {
  const convType = 'usd_to_eur';
  userStates[ctx.from.id] = { type: 'conversion', rateType: SOURCES.OFICIAL, convType };
  ctx.reply('✍️ Ingresa la cantidad en *USD* que deseas convertir a *EUR*:', { parse_mode: 'Markdown' });
  ctx.answerCbQuery();
});

bot.action('eur_to_usd', (ctx) => {
  const convType = 'eur_to_usd';
  userStates[ctx.from.id] = { type: 'conversion', rateType: SOURCES.OFICIAL, convType };
  ctx.reply('✍️ Ingresa la cantidad en *EUR* que deseas convertir a *USD*:', { parse_mode: 'Markdown' });
  ctx.answerCbQuery();
});

bot.action('back_to_main', (ctx) => {

  const rateType = ctx.match[1];
  const convType = ctx.match[2];
  userStates[ctx.from.id] = { type: 'conversion', rateType, convType };
  const fromLabel = convType.split('_')[0].toUpperCase();
  ctx.reply(`✍️ Ingresa la cantidad en *${fromLabel}*:`, { parse_mode: 'Markdown' });
  ctx.answerCbQuery();
});

// --- Procesamiento de Mensajes ---

bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const state = userStates[userId];
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

      // Selección de tasas base (origen)
      const sourceRates = state.convType.startsWith('usd') ? usdRates : (state.convType.startsWith('eur') ? euroRates : (usdRates || euroRates));
      const rateData = sourceRates.find(r => r.fuente === state.rateType);

      if (!rateData) {
        delete userStates[userId];
        return ctx.reply('❌ No se pudo obtener la tasa seleccionada.');
      }

      const price = rateData.promedio; // Precio de la moneda origen en VES
      let result, fromSymbol, toSymbol, usedRate;

      if (state.convType.endsWith('to_ves')) {
        result = amount * price;
        fromSymbol = state.convType.startsWith('usd') ? 'USD' : 'EUR';
        toSymbol = 'VES';
        usedRate = `${price.toFixed(4)} VES/${fromSymbol}`;
      } else if (state.convType.startsWith('ves')) {
        result = amount / price;
        fromSymbol = 'VES';
        toSymbol = state.convType.endsWith('usd') ? 'USD' : 'EUR';
        usedRate = `${(1 / price).toFixed(6)} ${toSymbol}/VES`;
      } else {
        // Conversión cruzada USD <-> EUR
        const targetRates = state.convType.endsWith('eur') ? euroRates : usdRates;
        const targetRateData = targetRates.find(r => r.fuente === state.rateType);
        if (!targetRateData) throw new Error('Target rate not found');
        
        const targetPrice = targetRateData.promedio; // Precio de la moneda destino en VES
        
        // result = (monto origen * precio origen VES) / precio destino VES
        result = (amount * price) / targetPrice;
        fromSymbol = state.convType.startsWith('usd') ? 'USD' : 'EUR';
        toSymbol = state.convType.endsWith('eur') ? 'EUR' : 'USD';
        usedRate = `${(price / targetPrice).toFixed(6)} ${toSymbol}/${fromSymbol}`;
      }

      ctx.reply(
        `✅ *Resultado:*\n\n` +
        `🔹 *Monto:* ${amount.toLocaleString('es-VE')} ${fromSymbol}\n` +
        `🔹 *Tasa:* ${state.rateType.toUpperCase()}\n` +
        `🔸 *Valor:* ${usedRate}\n` +
        `🔸 *Total:* ${result.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${toSymbol}`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Conversion Error:', error);
      ctx.reply('❌ Error al realizar la conversión.');
    }
    delete userStates[userId];
  }

  // Caso 2: Flujo de Consulta Histórica
  else if (state.type === 'historico') {
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return ctx.reply('❌ Formato inválido. Usa DD/MM/YYYY');

    const formattedDate = `${match[3]}-${match[2]}-${match[1]}`;

    ctx.reply('🔍 Buscando...');

    try {
      const [histOficial, histParalelo] = await Promise.all([
        getHistoricRate(formattedDate, 'dolares', SOURCES.OFICIAL),
        getHistoricRate(formattedDate, 'dolares', SOURCES.PARALELO)
      ]);

      if (!histOficial && !histParalelo) return ctx.reply('❌ No hay datos para esa fecha.');

      let message = `📊 *Tasas (${text}):*\n\n`;
      if (histOficial) message += `🏦 *BCV:* ${histOficial.promedio} VES\n`;
      if (histParalelo) message += `📈 *Paralelo:* ${histParalelo.promedio.toFixed(2)} VES\n`;
      ctx.replyWithMarkdown(message);
    } catch (error) {
      console.error('Historic Error:', error);
      ctx.reply('❌ Error al consultar el histórico.');
    }
    delete userStates[userId];
  }
});

// --- Notificaciones Automáticas (Cron Job) ---

/**
 * Tarea programada: Verifica cambios en la tasa oficial cada 15 minutos.
 * Si detecta un cambio, actualiza la base de datos y notifica a todos los suscriptores.
 * Respeta un horario de descanso (7 AM - 10 PM Caracas).
 */
cron.schedule('*/15 * * * *', async () => {
  const now = new Date();
  const caracasHour = parseInt(now.toLocaleString('en-US', { 
    timeZone: 'America/Caracas', 
    hour: 'numeric', 
    hour12: false 
  }));

  if (caracasHour < 7 || caracasHour >= 22) {
    return;
  }

  console.log('Verificando cambios en la tasa para notificaciones...');
  try {
    const [usdRates, euroRates] = await Promise.all([getRates(), getEuroRates()]);
    
    // Tasas actuales mapeadas a las llaves de bot_config
    const current = {
      last_usd_oficial: usdRates?.find(r => r.fuente === SOURCES.OFICIAL)?.promedio,
      last_usd_paralelo: usdRates?.find(r => r.fuente === SOURCES.PARALELO)?.promedio,
      last_eur_oficial: euroRates?.find(r => r.fuente === SOURCES.OFICIAL)?.promedio,
      last_eur_paralelo: euroRates?.find(r => r.fuente === SOURCES.PARALELO)?.promedio
    };

    // Obtener valores previos de la base de datos
    const { data: configData } = await supabase.from('bot_config').select('*');
    const prev = {};
    configData?.forEach(item => prev[item.key] = parseFloat(item.value));

    let bcvChanged = false;

    // Verificar y actualizar cada tasa en la base de datos
    for (const key in current) {
      const val = current[key];
      if (val && val !== prev[key]) {
        console.log(`Cambio detectado en ${key}: ${prev[key]} -> ${val}`);
        await supabase.from('bot_config').upsert({ key: key, value: val.toString() });
        
        // Marcamos si el cambio fue en el Dólar Oficial para notificar
        if (key === 'last_usd_oficial') bcvChanged = true;
      }
    }

    // Notificar solo si cambió el BCV
    if (bcvChanged) {
      const bcv = usdRates.find(r => r.fuente === SOURCES.OFICIAL);
      const { data: subscribers } = await supabase.from('subscribers').select('chat_id');
      
      if (subscribers?.length > 0) {
        const diff = getDiffText(bcv.promedio, prev.last_usd_oficial);
        const message = `🔔 *¡Cambio detectado en la tasa BCV!*\n\n` +
                        `🏦 *Nuevo valor:* ${bcv.promedio}${diff} VES\n` +
                        `🕒 *Detectado:* ${formatDate(new Date())}`;
        
        for (const sub of subscribers) {
          try {
            await bot.telegram.sendMessage(sub.chat_id, message, { parse_mode: 'Markdown' });
            await delay(50);
          } catch (err) {
            console.error(`Error enviando a ${sub.chat_id}:`, err.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('Cron Error:', error);
  }
});

bot.launch().then(() => console.log('Bot en línea'));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

/**
 * Servidor HTTP minimalista para mantener el servicio activo en Render.
 */
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end(req.url === '/ping' ? 'pong' : 'VES Tasa Monitor is running');
});

server.listen(config.port, () => console.log(`Servidor escuchando en el puerto ${config.port}`));
