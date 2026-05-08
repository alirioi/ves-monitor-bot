import { Telegraf, Markup } from 'telegraf';
import { getRates, getEuroRates, getHistoricRate } from './api.js';
import supabase from './db.js';
import { config } from './config.js';
import cron from 'node-cron';
import http from 'http';

const bot = new Telegraf(config.botToken);

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
    '/suscribir - Recibir alertas cuando la tasa cambie\n' +
    '/desuscribir - Dejar de recibir alertas\n' +
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
      if (euroBcv) message += `🏦 *Oficial (BCV):* ${euroBcv.promedio} VES\n`;
      if (euroParalelo) message += `📈 *Paralelo:* ${euroParalelo.promedio} VES\n`;
      if (euroBcv && euroParalelo) {
        const euroAvg = (euroBcv.promedio + euroParalelo.promedio) / 2;
        message += `⚖️ *Promedio:* ${euroAvg} VES\n`;
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
      [Markup.button.callback('💶 Euro (EUR)', 'conv_eur')],
      [Markup.button.callback('💱 Entre USD/EUR', 'conv_cross')]
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

// Fase 4: Suscripciones y Notificaciones
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

// Manejador de texto para procesar la cantidad o la fecha
bot.on('text', async (ctx) => {
  const userId = ctx.from.id;
  const state = userStates[userId];

  if (!state) return;

  const text = ctx.message.text.trim();

  // Caso 1: Conversión
  if (state.type === 'conversion') {
    // Limpiar el número: 
    // 1. Eliminar puntos que actúan como separadores de miles (ej: 80.000 -> 80000)
    // 2. Cambiar la coma decimal por punto (ej: 10,5 -> 10.5)
    const cleanText = text
      .replace(/\.(?=\d{3}(?!\d))/g, '') // Quita puntos si seguidos de 3 dígitos (miles)
      .replace(',', '.');               // Cambia coma por punto (decimal)
    
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
        // Conversión cruzada USD <-> EUR
        const otherRates = state.convType.startsWith('usd') ? await getEuroRates() : await getRates();
        const otherRateData = otherRates.find(r => r.fuente === state.rateType);
        
        if (!otherRateData) {
          delete userStates[userId];
          return ctx.reply(`❌ No se pudo obtener la tasa comparativa para "${state.rateType}".`);
        }

        const otherPrice = otherRateData.promedio;
        
        if (state.convType === 'usd_to_eur') {
          // amount USD -> amount * price VES -> (amount * price) / otherPrice EUR
          result = (amount * price) / otherPrice;
          fromSymbol = 'USD';
          toSymbol = 'EUR';
        } else {
          // amount EUR -> amount * price VES -> (amount * price) / otherPrice USD
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

// Lógica de Notificaciones Automáticas (Cron Job)
// Se ejecuta cada 15 minutos para verificar cambios
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

        // Enviar a todos (con un pequeño delay para evitar spam/bloqueo de Telegram)
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

bot.launch().then(() => {
  console.log('Bot en línea');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Fase 5: Servidor HTTP para Anti-Sleep (Render)
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
