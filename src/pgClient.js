/**
 * @fileoverview Cliente de conexión directa a PostgreSQL.
 * Usado para operaciones de escritura (upsert) en bot_config,
 * evitando la capa PostgREST y sus requerimientos de JWT.
 */

import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

const pool = new Pool({
  connectionString: config.databaseUrl,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 5
});

pool.on('error', (err) => {
  console.error('[PG] Error inesperado en el pool de conexiones:', err.message);
});

export default pool;
