import 'dotenv/config';
import { Telegraf, Markup } from 'telegraf';
import { getRates, getEuroRates, getHistoricRate } from './api.js';

if (!process.env.BOT_TOKEN || process.env.BOT_TOKEN === 'tu_telegram_bot_token_aqui') {
  console.error('Error: El BOT_TOKEN no está configurado en el archivo .env');
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

// Estado temporal para conversiones e históricos (En memoria)
const userStates = {};

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

bot.start((ctx) => {
  ctx.reply('¡Hola! Bienvenido a *VES Tasa Monitor* 🇻🇪\n\nTu asistente para consultar el valor del dólar y euro en tiempo real.\n\nUsa /tasa para ver los precios actuales o /help para ver todos los comandos.', { parse_mode: 'Markdown' });
});

bot.help((ctx) => {
  ctx.reply(
    'Comandos disponibles:\n' +
    '/tasa - Ver las tasas actuales\n' +
    '/convertir - Calculadora de divisas\n' +
    '/historico - Consulta histórico por fecha\n' +
    '/help - Mostrar este mensaje'
  );
});

bot.command('tasa', async (ctx) => {
  try {
    const [usdRates, euroRates] = await Promise.all([getRates(), getEuroRates()]);

    if (!usdRates) return ctx.reply('Lo siento, no pude obtener las tasas en este momento.');

    const bcv = usdRates.find(r => r.fuente === 'oficial');
    const paralelo = usdRates.find(r => r.fuente === 'paralelo');

    let message = '📊 *Tasas del Día:*\n\n';

    message += '💵 *Dólar:*\n';
    if (bcv) message += `🏦 *Oficial (BCV):* ${bcv.promedio.toFixed(2)} VES\n`;
    if (paralelo) message += `📈 *Paralelo:* ${paralelo.promedio.toFixed(2)} VES\n`;
    if (bcv && paralelo) {
      const avg = (bcv.promedio + paralelo.promedio) / 2;
      message += `⚖️ *Promedio:* ${avg.toFixed(2)} VES\n`;
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

// Fase 2: Conversor
bot.command('convertir', (ctx) => {
  ctx.reply('🧮 *Calculadora de Divisas*\nSelecciona la moneda que deseas convertir:', {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('💵 Dólar (USD)', 'conv_usd')],
      [Markup.button.callback('💶 Euro (EUR)', 'conv_eur')]
    ])
  });
});

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

bot.action('back_to_main', (ctx) => {
  ctx.editMessageText('🧮 *Calculadora de Divisas*\nSelecciona la moneda que deseas convertir:', {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('💵 Dólar (USD)', 'conv_usd')],
      [Markup.button.callback('💶 Euro (EUR)', 'conv_eur')]
    ])
  });
});

// Fase 3: Histórico
bot.command('historico', (ctx) => {
  userStates[ctx.from.id] = { type: 'historico' };
  ctx.reply('📅 *Consulta Histórica*\nPor favor, ingresa la fecha que deseas consultar en formato *DD/MM/YYYY* (Ejemplo: 01/05/2024):', { parse_mode: 'Markdown' });
});

// Selección de tasa
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

bot.action(/rate:(.+):(.+)/, (ctx) => {
  const rateType = ctx.match[1]; // oficial o paralelo
  const convType = ctx.match[2]; // usd_to_ves, etc
  const userId = ctx.from.id;

  userStates[userId] = { type: 'conversion', rateType, convType };

  const fromLabel = convType.split('_')[0].toUpperCase();
  ctx.reply(`✍️ Por favor, ingresa la cantidad en *${fromLabel}* que deseas convertir:`, { parse_mode: 'Markdown' });
  ctx.answerCbQuery();
});

// Manejador de texto para procesar la cantidad o la fecha
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const state = userStates[userId];

  if (!state) return;

  const text = ctx.message.text.trim();

  // Caso 1: Conversión
  if (state.type === 'conversion') {
    const amount = parseFloat(text.replace(',', '.'));
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

      if (state.convType.endsWith('to_ves')) {
        result = amount * price;
        fromSymbol = isUsd ? 'USD' : 'EUR';
        toSymbol = 'VES';
      } else {
        result = amount / price;
        fromSymbol = 'VES';
        toSymbol = isUsd ? 'USD' : 'EUR';
      }

      ctx.reply(
        `✅ *Resultado de la conversión:*\n\n` +
        `🔹 *Monto:* ${amount.toLocaleString('es-VE')} ${fromSymbol}\n` +
        `🔹 *Tasa:* ${price.toFixed(2)} VES (${state.rateType})\n` +
        `🔸 *Total:* ${result.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${toSymbol}`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Conversion Error:', error);
      ctx.reply('❌ Error al realizar la conversión.');
    }
    delete userStates[userId];
  }

  // Caso 2: Histórico
  else if (state.type === 'historico') {
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = text.match(dateRegex);

    if (!match) return ctx.reply('❌ Formato de fecha inválido. Usa *DD/MM/YYYY* (Ejemplo: 01/05/2024)', { parse_mode: 'Markdown' });

    const [_, day, month, year] = match;
    const formattedDate = `${year}-${month}-${day}`; // Formato API: YYYY-MM-DD

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
      if (histOficial) message += `🏦 *Oficial (BCV):* ${histOficial.promedio.toFixed(2)} VES\n`;
      if (histParalelo) message += `📈 *Paralelo:* ${histParalelo.promedio.toFixed(2)} VES\n`;

      if (histOficial && histParalelo) {
        const avg = (histOficial.promedio + histParalelo.promedio) / 2;
        message += `⚖️ *Promedio:* ${avg.toFixed(2)} VES\n`;
      }

      ctx.replyWithMarkdown(message);
    } catch (error) {
      console.error('Historic Command Error:', error);
      ctx.reply('❌ Ocurrió un error al consultar el histórico.');
    }
    delete userStates[userId];
  }
});

bot.launch().then(() => {
  console.log('Bot en línea');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
