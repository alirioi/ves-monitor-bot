/**
 * @fileoverview Punto de entrada principal para el bot VES Tasa Monitor.
 * Orquestador central que inicializa el bot, carga los middlewares de sesión,
 * registra los manejadores de eventos y lanza el servidor HTTP para Render.
 */

import { Telegraf, session } from 'telegraf';
import http from 'http';
import { config } from './config.js';
import commands from './handlers/commands.js';
import actions from './handlers/actions.js';
import textHandler from './handlers/text.js';
import { initRateCron } from './cron/rateChecker.js';

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

// Registro de los componentes modulares del bot
bot.use(commands);
bot.use(actions);
bot.use(textHandler);

// Inicialización de la tarea programada (cron) para monitoreo de tasas
initRateCron(bot);

// Lanzamiento del bot con manejo de errores
bot.launch()
  .then(() => console.log('🚀 Bot VES Tasa Monitor en línea'))
  .catch((err) => console.error('Error crítico al iniciar el bot:', err));

// Configuración de apagado elegante (Graceful Shutdown)
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

/**
 * Servidor HTTP minimalista.
 * Necesario para que plataformas como Render detecten que el servicio está activo (Health Check).
 */
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('VES Tasa Monitor is running');
});

server.listen(config.port, () => {
  console.log(`📡 Servidor de salud escuchando en el puerto ${config.port}`);
});

export { bot };
