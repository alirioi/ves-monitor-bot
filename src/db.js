import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

const supabase = createClient(config.supabase.url, config.supabase.key);

export default supabase;
