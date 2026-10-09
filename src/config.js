/**
 * @fileoverview Configuración centralizada del bot.
 * Maneja la validación de variables de entorno y exporta un objeto de configuración.
 */

import 'dotenv/config';

/**
 * Lista de variables de entorno obligatorias para el funcionamiento del bot.
 * @type {string[]}
 */
const requiredEnvVars = [
  'BOT_TOKEN',
  'DATABASE_URL'
];

/**
 * Valida que todas las variables requeridas existan en el entorno.
 * Si alguna variable falta o tiene el valor por defecto, el proceso termina.
 */
for (const varName of requiredEnvVars) {
  if (!process.env[varName] || process.env[varName] === 'tu_telegram_bot_token_aqui') {
    console.error(`Error crítico: La variable de entorno ${varName} no está configurada.`);
    process.exit(1);
  }
}

/**
 * Objeto de configuración global.
 * @type {Object}
 * @property {string} botToken - Token de acceso para el bot de Telegram.
 * @property {string} databaseUrl - URI de conexión a la base de datos PostgreSQL.
 * @property {number|string} port - Puerto en el que escucha el servidor HTTP de salud.
 * @property {string} apiUrl - URL base de la API de tasas de cambio.
 */
export const config = {
  botToken: process.env.BOT_TOKEN,
  databaseUrl: process.env.DATABASE_URL,
  port: process.env.PORT || 8080,
  apiUrl: 'https://ve.dolarapi.com/v1'
};
