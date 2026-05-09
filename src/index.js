/**
 * @fileoverview Punto de entrada principal para el bot VES Tasa Monitor.
 * Refactorizado para mayor modularidad y escalabilidad.
 */

import { Telegraf, session } from 'telegraf';
import http from 'http';
import { config } from './config.js';
import commands from './handlers/commands.js';
import actions from './handlers/actions.js';
import textHandler from './handlers/text.js';
import { initRateCron } from './cron/rateChecker.js';

const bot = new Telegraf(config.botToken);

// Middleware de sesión persistente (en memoria por ahora, modular)
bot.use(session());

bot.use((ctx, next) => {
  ctx.session ??= {};
  return next();
});

// Cargar Handlers
bot.use(commands);
bot.use(actions);
bot.use(textHandler);

// Iniciar Cron
initRateCron(bot);

bot.launch()
  .then(() => console.log('🚀 Bot en línea'))
  .catch(err => console.error('Error bot:', err));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('VES Tasa Monitor is running');
});

server.listen(config.port, () => console.log(`📡 Puerto ${config.port}`));

export { bot };
