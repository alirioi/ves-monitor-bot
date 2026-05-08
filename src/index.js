import 'dotenv/config';
import { Telegraf } from 'telegraf';
import { getRates, getEuroRates } from './api.js';

if (!process.env.BOT_TOKEN || process.env.BOT_TOKEN === 'tu_telegram_bot_token_aqui') {
  console.error('❌ Error: El BOT_TOKEN no está configurado en el archivo .env');
  process.exit(1);
}

const bot = new Telegraf(process.env.BOT_TOKEN);

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
    '/convertir - Calculadora de divisas (Próximamente)\n' +
    '/historico - Consulta histórico por fecha (Próximamente)\n' +
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

bot.launch().then(() => {
  console.log('Bot en línea 🚀');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
