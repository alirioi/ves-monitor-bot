import 'dotenv/config';

const requiredEnvVars = [
  'BOT_TOKEN',
  'SUPABASE_URL',
  'SUPABASE_KEY'
];

// Validar que todas las variables requeridas existan
for (const varName of requiredEnvVars) {
  if (!process.env[varName] || process.env[varName] === 'tu_telegram_bot_token_aqui') {
    console.error(`Error crítico: La variable de entorno ${varName} no está configurada.`);
    process.exit(1);
  }
}

export const config = {
  botToken: process.env.BOT_TOKEN,
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
  },
  port: process.env.PORT || 3000,
  apiUrl: 'https://ve.dolarapi.com/v1'
};
