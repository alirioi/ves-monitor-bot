-- Backup de tablas dolar-bot

CREATE TABLE IF NOT EXISTS public.subscribers (
  chat_id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.bot_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

INSERT INTO public.subscribers (chat_id) VALUES (834558753) ON CONFLICT (chat_id) DO NOTHING;
-- Tasas iniciales actualizadas (Oct 2026) - evita falsa notificación de cambio al primer arranque
INSERT INTO public.bot_config (key, value) VALUES ('last_usd_oficial', '874.7321') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.bot_config (key, value) VALUES ('last_usd_usdt', '1013.970424') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.bot_config (key, value) VALUES ('last_eur_oficial', '979.0788922') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
