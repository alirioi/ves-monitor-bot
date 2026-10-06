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

INSERT INTO public.subscribers (chat_id) VALUES (834558753) ON CONFLICT (chat_id) DO NOTHING;
INSERT INTO public.bot_config (key, value) VALUES ('last_bcv_rate', '499.8608') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.bot_config (key, value) VALUES ('last_usd_paralelo', '710.12375') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.bot_config (key, value) VALUES ('last_usd_oficial', '871.3689') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.bot_config (key, value) VALUES ('last_eur_oficial', '981.17880877') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.bot_config (key, value) VALUES ('last_usd_usdt', '981.709905') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
INSERT INTO public.bot_config (key, value) VALUES ('last_eur_paralelo', '1100.522292') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
