/**
 * @fileoverview Cliente de base de datos PostgreSQL.
 * Gestiona el pool de conexiones directas a PostgreSQL para la persistencia del bot.
 */

import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: config.databaseUrl,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 10
});

pool.on('error', (err) => {
  console.error('[DB] Error inesperado en el pool de PostgreSQL:', err.message);
});

export default pool;
