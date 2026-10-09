/**
 * @fileoverview Punto de entrada principal para el bot VES Tasa Monitor.
 * Orquestador central que inicializa el bot, carga los middlewares de sesión,
 * registra los manejadores de eventos y lanza el servidor HTTP para monitoreo de salud.
 */

import { Telegraf, session } from 'telegraf';
import http from 'http';
import { config } from './config.js';
import commands from './handlers/commands.js';
import actions from './handlers/actions.js';
import textHandler from './handlers/text.js';
import { initRateCron } from './cron/rateChecker.js';
import pool from './db.js';

/** Instancia principal del bot de Telegram. */
const bot = new Telegraf(config.botToken);

// Middleware de sesión (persistente durante el tiempo de ejecución)
// Permite almacenar el estado de la calculadora y los datos del recibo
bot.use(session());

/**
 * Middleware para asegurar que ctx.session siempre sea un objeto.
 */
bot.use((ctx, next) => {
  ctx.session ??= {};
  return next();
});

/**
 * Middleware global de auto-registro.
 * Registra silenciosamente a cualquier usuario que interactúe con el bot
 * en la tabla 'subscribers'. Captura usuarios que nunca recibieron su
 * registro inicial por errores en la DB.
 */
bot.use(async (ctx, next) => {
  const chatId = ctx.from?.id;
  if (chatId) {
    pool.query(
      `INSERT INTO public.subscribers (chat_id) VALUES ($1) ON CONFLICT (chat_id) DO NOTHING`,
      [chatId]
    ).catch(err => console.error('[Auto-registro] Error:', err.message));
  }
  return next();
});

// Registro de los componentes modulares del bot
bot.use(commands);
bot.use(actions);
bot.use(textHandler);

// Inicialización de la tarea programada (cron) para monitoreo de tasas
initRateCron(bot);

// Comandos oficiales para el menú interactivo de Telegram
const botCommands = [
  { command: 'tasa', description: '📊 Tasas de cambio' },
  { command: 'convertir', description: '🧮 Calculadora de divisas' },
  { command: 'colombia', description: '🇨🇴 Tasas de Colombia' },
  { command: 'argentina', description: '🇦🇷 Tasas de Argentina' },
  { command: 'historico', description: '📅 Consulta histórica' },
  { command: 'help', description: 'ℹ️ Ayuda' }
];

// Sincronización de comandos y lanzamiento del bot
async function startBot() {
  try {
    await bot.telegram.setMyCommands(botCommands);
    console.log('📋 Comandos del menú sincronizados con éxito en Telegram');
  } catch (err) {
    console.error('Aviso: no se pudieron sincronizar los comandos en Telegram:', err.message);
  }

  bot.launch({ dropPendingUpdates: true }, () => {
    console.log('🚀 Bot VES Tasa Monitor en línea');
  }).catch((err) => {
    console.error('Error crítico al iniciar el bot:', err);
  });
}

startBot();

// Configuración de apagado elegante (Graceful Shutdown)
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

/**
 * Servidor HTTP minimalista.
 * Necesario para comprobación de estado (Health Check) en contenedores y monitoreo del homelab.
 */
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('VES Tasa Monitor is running');
});

server.listen(config.port, () => {
  console.log(`📡 Servidor de salud escuchando en el puerto ${config.port}`);
});

export { bot };
