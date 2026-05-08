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
 * Estado temporal para conversiones e históricos.
 * Almacena información por ID de usuario para procesos multi-paso.
 * @type {Object<number, Object>} 
 */
const userStates = {};

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
    '/help - Mostrar este mensaje'
  );
});

/** Manejador del comando /tasa. Obtiene y muestra los precios actuales. */
bot.command('tasa', async (ctx) => {
  try {
    const [usdRates, euroRates] = await Promise.all([getRates(), getEuroRates()]);

    if (!usdRates) return ctx.reply('Lo siento, no pude obtener las tasas en este momento.');

    const bcv = usdRates.find(r => r.fuente === 'oficial');
    const paralelo = usdRates.find(r => r.fuente === 'paralelo');

    let message = '📊 *Tasas del Día:*\n\n';

    message += '💵 *Dólar:*\n';
    if (bcv) message += `🏦 *Oficial (BCV):* ${bcv.promedio} VES\n`;
    if (paralelo) message += `📈 *Paralelo:* ${paralelo.promedio} VES\n`;
    if (bcv && paralelo) {
      const avg = (bcv.promedio + paralelo.promedio) / 2;
      message += `⚖️ *Promedio:* ${avg} VES\n`;
    }

    if (euroRates) {
      const euroBcv = euroRates.find(r => r.fuente === 'oficial');
      const euroParalelo = euroRates.find(r => r.fuente === 'paralelo');

      message += '\n💶 *Euro:*\n';
      if (euroBcv) message += `🏦 *Oficial (BCV):* ${euroBcv.promedio.toFixed(2)} VES\n`;
      if (euroParalelo) message += `📈 *Paralelo:* ${euroParalelo.promedio.toFixed(2)} VES\n`;
      if (euroBcv && euroParalelo) {
        const euroAvg = (euroBcv.promedio + euroParalelo.promedio) / 2;
        message += `⚖️ *Promedio:* ${euroAvg.toFixed(2)} VES\n`;
      }
    }

    const updateTime = bcv ? bcv.fechaActualizacion : new Date();
    message += `\n🕒 *Actualizado:* ${formatDate(updateTime)}`;

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
    const { error } = await supabase
      .from('subscribers')
      .upsert({ chat_id: chatId });

    if (error) throw error;

    ctx.reply('✅ ¡Te has suscrito con éxito! Te avisaré cuando la tasa oficial del BCV cambie (especialmente a las 9am y 1pm).');
  } catch (error) {
    console.error('Error al suscribir:', error);
    ctx.reply('❌ Ocurrió un error al intentar suscribirte. Intenta de nuevo más tarde.');
  }
});

/** Manejador del comando /desuscribir. Elimina al usuario de las alertas. */
bot.command('desuscribir', async (ctx) => {
  const chatId = ctx.from.id;
  
  try {
    const { error } = await supabase
      .from('subscribers')
      .delete()
      .eq('chat_id', chatId);

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
  ctx.reply('📅 *Consulta Histórica*\nPor favor, ingresa la fecha que deseas consultar en formato *DD/MM/YYYY* (Ejemplo: 01/05/2024):', { parse_mode: 'Markdown' });
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

bot.action('conv_cross', (ctx) => {
  ctx.editMessageText('¿Qué tipo de conversión deseas hacer?', {
    ...Markup.inlineKeyboard([
      [Markup.button.callback('USD ➡️ EUR', 'usd_to_eur')],
      [Markup.button.callback('EUR ➡️ USD', 'eur_to_usd')],
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
      [Markup.button.callback('🏦 Oficial (BCV)', `rate:oficial:${type}`)],
      [Markup.button.callback('📈 Paralelo', `rate:paralelo:${type}`)],
      [Markup.button.callback('⬅️ Volver', `conv_${currency.toLowerCase()}`)]
    ])
  });
};

bot.action(['usd_to_ves', 'ves_to_usd'], (ctx) => askForAmount(ctx, ctx.match[0], 'USD'));
bot.action(['eur_to_ves', 'ves_to_eur'], (ctx) => askForAmount(ctx, ctx.match[0], 'EUR'));
bot.action(['usd_to_eur', 'eur_to_usd'], (ctx) => askForAmount(ctx, ctx.match[0], 'Cross'));

bot.action(/rate:(.+):(.+)/, (ctx) => {
  const rateType = ctx.match[1]; // oficial o paralelo
  const convType = ctx.match[2]; // usd_to_ves, etc
  const userId = ctx.from.id;

  userStates[userId] = { type: 'conversion', rateType, convType };

  const fromLabel = convType.split('_')[0].toUpperCase();
  ctx.reply(`✍️ Por favor, ingresa la cantidad en *${fromLabel}* que deseas convertir:`, { parse_mode: 'Markdown' });
  ctx.answerCbQuery();
});

// --- Manejador de Mensajes de Texto ---

bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const state = userStates[userId];

  if (!state) return;

  const text = ctx.message.text.trim();

  // Caso 1: Flujo de Conversión
  if (state.type === 'conversion') {
    const cleanText = text
      .replace(/\.(?=\d{3}(?!\d))/g, '')
      .replace(',', '.');
    
    const amount = parseFloat(cleanText);
    if (isNaN(amount)) return ctx.reply('❌ Por favor, ingresa un número válido.');

    try {
      const isUsd = state.convType.includes('usd');
      const rates = isUsd ? await getRates() : await getEuroRates();

      if (!rates) {
        delete userStates[userId];
        return ctx.reply('❌ No se pudo conectar con la API de tasas.');
      }

      const rateData = rates.find(r => r.fuente === state.rateType);

      if (!rateData) {
        delete userStates[userId];
        return ctx.reply(`❌ No se pudo obtener la tasa "${state.rateType}". Intenta de nuevo.`);
      }

      const price = rateData.promedio;
      let result, fromSymbol, toSymbol;

      if (state.convType === 'usd_to_ves' || state.convType === 'eur_to_ves') {
        result = amount * price;
        fromSymbol = isUsd ? 'USD' : 'EUR';
        toSymbol = 'VES';
      } else if (state.convType === 'ves_to_usd' || state.convType === 'ves_to_eur') {
        result = amount / price;
        fromSymbol = 'VES';
        toSymbol = isUsd ? 'USD' : 'EUR';
      } else {
        const otherRates = state.convType.startsWith('usd') ? await getEuroRates() : await getRates();
        const otherRateData = otherRates.find(r => r.fuente === state.rateType);
        
        if (!otherRateData) {
          delete userStates[userId];
          return ctx.reply(`❌ No se pudo obtener la tasa comparativa para "${state.rateType}".`);
        }

        const otherPrice = otherRateData.promedio;
        
        if (state.convType === 'usd_to_eur') {
          result = (amount * price) / otherPrice;
          fromSymbol = 'USD';
          toSymbol = 'EUR';
        } else {
          result = (amount * price) / otherPrice;
          fromSymbol = 'EUR';
          toSymbol = 'USD';
        }
      }

      ctx.reply(
        `✅ *Resultado de la conversión:*\n\n` +
        `🔹 *Monto:* ${amount.toLocaleString('es-VE')} ${fromSymbol}\n` +
        `🔹 *Tasa:* ${state.rateType.toUpperCase()}\n` +
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
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = text.match(dateRegex);

    if (!match) return ctx.reply('❌ Formato de fecha inválido. Usa *DD/MM/YYYY* (Ejemplo: 01/05/2024)', { parse_mode: 'Markdown' });

    const [_, day, month, year] = match;
    const formattedDate = `${year}-${month}-${day}`;

    ctx.reply('🔍 Buscando datos históricos...');

    try {
      const [histOficial, histParalelo] = await Promise.all([
        getHistoricRate(formattedDate, 'dolares', 'oficial'),
        getHistoricRate(formattedDate, 'dolares', 'paralelo')
      ]);

      if (!histOficial && !histParalelo) {
        return ctx.reply(`❌ No se encontraron datos para la fecha ${text}. Recuerda que los fines de semana y feriados pueden no tener registros. Tambien puede ser que la fecha que ingresaste sea muy antigua. Intenta con otra fecha.`);
      }

      let message = `📊 *Tasas Históricas (${text}):*\n\n`;
      if (histOficial) message += `🏦 *Oficial (BCV):* ${histOficial.promedio} VES\n`;
      if (histParalelo) message += `📈 *Paralelo:* ${histParalelo.promedio} VES\n`;

      if (histOficial && histParalelo) {
        const avg = (histOficial.promedio + histParalelo.promedio) / 2;
        message += `⚖️ *Promedio:* ${avg} VES\n`;
      }

      ctx.replyWithMarkdown(message);
    } catch (error) {
      console.error('Historic Command Error:', error);
      ctx.reply('❌ Ocurrió un error al consultar el histórico.');
    }
    delete userStates[userId];
  }
});

// --- Lógica de Notificaciones Automáticas (Cron Job) ---

/**
 * Tarea programada: Verifica cambios en la tasa oficial cada 15 minutos.
 * Si detecta un cambio, actualiza la base de datos y notifica a todos los suscriptores.
 */
cron.schedule('*/15 * * * *', async () => {
  console.log('Verificando cambios en la tasa para notificaciones...');
  
  try {
    const rates = await getRates();
    if (!rates) return;

    const bcv = rates.find(r => r.fuente === 'oficial');
    if (!bcv) return;

    // Obtener la última tasa guardada de Supabase
    const { data: configData } = await supabase
      .from('bot_config')
      .select('value')
      .eq('key', 'last_bcv_rate')
      .single();

    const lastRate = configData ? parseFloat(configData.value) : 0;

    // Si la tasa cambió
    if (bcv.promedio !== lastRate) {
      console.log(`¡Cambio detectado! ${lastRate} -> ${bcv.promedio}. Notificando...`);

      // Guardar la nueva tasa
      await supabase
        .from('bot_config')
        .upsert({ key: 'last_bcv_rate', value: bcv.promedio.toString() });

      // Obtener todos los suscriptores
      const { data: subscribers } = await supabase
        .from('subscribers')
        .select('chat_id');

      if (subscribers && subscribers.length > 0) {
        const message = `🔔 *¡Atención! La tasa oficial ha cambiado*\n\n` +
                        `🏦 *Nuevo valor (BCV):* ${bcv.promedio} VES\n` +
                        `🕒 *Actualizado:* ${formatDate(bcv.fechaActualizacion)}\n\n` +
                        `Usa /tasa para ver el detalle completo.`;

        for (const sub of subscribers) {
          try {
            await bot.telegram.sendMessage(sub.chat_id, message, { parse_mode: 'Markdown' });
          } catch (err) {
            console.error(`Error enviando a ${sub.chat_id}:`, err.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error en el cron de notificaciones:', error);
  }
});

// Lanzamiento del bot
bot.launch().then(() => {
  console.log('Bot en línea');
});

// Manejo de parada suave
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// --- Servidor HTTP para Anti-Sleep (Render) ---

/**
 * Servidor HTTP minimalista para mantener el servicio activo en Render
 * respondiendo a pings en la ruta /ping.
 */
const server = http.createServer((req, res) => {
  if (req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('pong');
    return;
  }
  
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('VES Tasa Monitor is running');
});

server.listen(config.port, () => {
  console.log(`Servidor HTTP escuchando en el puerto ${config.port} (para pings anti-sleep)`);
});
