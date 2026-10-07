/**
 * @fileoverview Cliente de Supabase para la persistencia de datos.
 * Inicializa el cliente utilizando la configuración centralizada.
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { config } from './config.js';

/**
 * Asegura que la clave sea un JWT válido de 3 partes para PostgREST.
 * Si es un dummy key o texto plano, se genera un JWT firmado con el rol 'postgres'.
 */
function getValidPostgrestKey() {
  const key = config.supabase.key;
  if (key && key.split('.').length === 3) {
    return key;
  }
  const secret = process.env.PGRST_JWT_SECRET || 'supersecretjwtsecretthashouldbeatleast32characterlong';
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ role: 'postgres' })).toString('base64url');
  const data = `${header}.${payload}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

const validKey = getValidPostgrestKey();

/**
 * Cliente de Supabase configurado.
 * Se utiliza para interactuar con las tablas 'subscribers' y 'bot_config'.
 */
const supabase = createClient(config.supabase.url, validKey, {
  auth: { persistSession: false },
  realtime: { enabled: false }
});

export default supabase;
