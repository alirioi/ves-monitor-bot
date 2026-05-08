# 🇻🇪 VES Tasa Monitor - Telegram Bot

**VES Tasa Monitor** es un bot de Telegram robusto y eficiente diseñado para monitorear el mercado cambiario en Venezuela. Proporciona tasas en tiempo real (USD/EUR), permite realizar conversiones precisas, consultar datos históricos y recibir notificaciones automáticas ante cambios en la tasa oficial.

---

## 🚀 Características Principales

- **📊 Tasas en Tiempo Real**: Consulta instantánea del valor del Dólar (BCV, Paralelo, Promedio) y Euro.
- **🧮 Calculadora de Divisas Inteligente**:
    - Conversión entre VES, USD y EUR.
    - Soporta conversiones cruzadas (ej. USD ➡️ EUR).
    - Procesamiento flexible de números (soporta separadores de miles `.` y decimales `,`).
- **📅 Consulta Histórica**: Obtén los valores de cualquier fecha pasada directamente desde el bot.
- **🔔 Notificaciones Automáticas**: Suscríbete para recibir alertas inmediatas cuando el BCV actualice su tasa (monitoreo cada 15 minutos).
- **🔋 Alta Disponibilidad**: Optimizado para ejecutarse en Render con sistema anti-sleep.

---

## 🛠️ Tecnologías Utilizadas

- **Lenguaje**: JavaScript (Node.js)
- **Framework de Bot**: [Telegraf](https://telegraf.js.org/)
- **Base de Datos**: [Supabase](https://supabase.com/) (PostgreSQL)
- **API de Tasas**: [DolarApi.com](https://dolarapi.com/docs/venezuela/)
- **Programación**: `node-cron` para tareas automáticas.
- **Despliegue**: Render.com

---

## ⚙️ Configuración Local

### Requisitos previos
- Node.js (v18+)
- pnpm (`npm install -g pnpm`)

### Instalación
1. Clona el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/ves-tasa-monitor.git
   cd ves-tasa-monitor
   ```

2. Instala las dependencias:
   ```bash
   pnpm install
   ```

3. Configura las variables de entorno:
   Crea un archivo `.env` en la raíz con lo siguiente:
   ```env
   BOT_TOKEN=tu_token_de_telegram
   SUPABASE_URL=tu_url_de_supabase
   SUPABASE_KEY=tu_clave_anon_de_supabase
   PORT=3000
   ```

4. Ejecuta el bot en modo desarrollo:
   ```bash
   pnpm dev
   ```

---

## 📋 Estructura de la Base de Datos (Supabase)

Para el correcto funcionamiento de las suscripciones, crea las siguientes tablas en tu SQL Editor:

```sql
-- Tabla de suscriptores
CREATE TABLE subscribers (
  id BIGSERIAL PRIMARY KEY,
  chat_id BIGINT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de configuración del bot
CREATE TABLE bot_config (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

---

## 🚀 Despliegue en Render

1. Crea un **Web Service** conectado a tu repo.
2. Agrega las variables de entorno en el panel de Render.
3. Build Command: `pnpm install`
4. Start Command: `pnpm start`
5. **Anti-Sleep**: Configura un monitor en [UptimeRobot](https://uptimerobot.com/) que apunte a `https://tu-app.onrender.com/ping` cada 5 minutos.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - mira el archivo [LICENSE](LICENSE) para más detalles.

---

Desarrollado con ❤️ para la comunidad venezolana.
