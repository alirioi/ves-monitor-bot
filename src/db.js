/**
 * @fileoverview Cliente de Supabase para la persistencia de datos.
 * Inicializa el cliente utilizando la configuración centralizada.
 */

import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

/**
 * Cliente de Supabase configurado.
 * Se utiliza para interactuar con las tablas 'subscribers' y 'bot_config'.
 */
const supabase = createClient(config.supabase.url, config.supabase.key, {
  auth: { persistSession: false },
  realtime: { enabled: false }
});

export default supabase;
