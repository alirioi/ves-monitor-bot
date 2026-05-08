# ⴾ VES Tasa Monitor - Telegram Bot

[**Español**](#español) | [**English**](#english)

---

<a name="español"></a>
# Español 🇪🇸

**VES Tasa Monitor** es un bot de Telegram robusto y eficiente diseñado para monitorear el mercado cambiario en Venezuela. Proporciona tasas en tiempo real (USD/EUR), permite realizar conversiones precisas, consultar datos históricos y recibir notificaciones automáticas ante cambios en la tasa oficial.

📢 **Prueba el bot en vivo:** [t.me/ves_monitor_bot](https://t.me/ves_monitor_bot)

## 🚀 Características Principales

- **📊 Tasas en Tiempo Real**: Consulta instantánea del valor del Dólar (BCV, Paralelo, Promedio) y Euro.
- **🧮 Calculadora de Divisas Inteligente**:
    - Conversión entre VES, USD y EUR.
    - Soporta conversiones cruzadas (ej. USD ➡️ EUR).
    - Procesamiento flexible de números (soporta separadores de miles `.` y decimales `,`).
- **📅 Consulta Histórica**: Obtén los valores de cualquier fecha pasada directamente desde el bot.
- **🔔 Notificaciones Automáticas**: Suscríbete para recibir alertas inmediatas cuando el BCV actualice su tasa.
- **🔋 Alta Disponibilidad**: Optimizado para ejecutarse en Render con sistema anti-sleep y protección de rate-limit.

## 🛠️ Tecnologías Utilizadas

- **Lenguaje**: JavaScript (Node.js)
- **Framework de Bot**: [Telegraf](https://telegraf.js.org/)
- **Base de Datos**: [Supabase](https://supabase.com/) (PostgreSQL)
- **API de Tasas**: [Dolar API](https://github.com/enzonotario/esjs-dolar-api)
- **Programación**: `node-cron` para tareas automáticas.
- **Despliegue**: Render.com

## ⚙️ Configuración Local

### Instalación
1. Clona el repositorio:
   ```bash
   git clone https://github.com/tu-usuario/ves-tasa-monitor.git
   cd ves-tasa-monitor
   ```
2. Instala las dependencias: `pnpm install`
3. Configura las variables de entorno en un archivo `.env`:
   ```env
   BOT_TOKEN=tu_token_de_telegram
   SUPABASE_URL=tu_url_de_supabase
   SUPABASE_KEY=tu_clave_anon_de_supabase
   PORT=3000
   ```
4. Ejecuta el bot: `pnpm dev`

## 📋 Estructura de la Base de Datos (Supabase)

```sql
CREATE TABLE subscribers (
  id BIGSERIAL PRIMARY KEY,
  chat_id BIGINT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bot_config (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

## 🙏 Agradecimientos

Este proyecto utiliza la excelente [Dolar API](https://github.com/enzonotario/esjs-dolar-api) desarrollada por [Enzo Notario](https://github.com/enzonotario).

## ⚖️ Descargo de Responsabilidad (Disclaimer)

Este bot es una herramienta meramente **informativa**. Los datos mostrados son obtenidos de fuentes de terceros. El desarrollador no garantiza la exactitud o actualidad de la información y **no se hace responsable** por decisiones financieras o pérdidas derivadas del uso de esta herramienta.

---

<a name="english"></a>
# English 🇺🇸

**VES Tasa Monitor** is a robust and efficient Telegram bot designed to monitor the exchange market in Venezuela. It provides real-time rates (USD/EUR), accurate currency conversions, historical data lookups, and automated notifications for official rate changes.

📢 **Try the bot live:** [t.me/ves_monitor_bot](https://t.me/ves_monitor_bot)

## 🚀 Key Features

- **📊 Real-Time Rates**: Instant lookup for Dollar (BCV, Parallel, Average) and Euro rates.
- **🧮 Smart Currency Calculator**:
    - Conversion between VES, USD, and EUR.
    - Supports cross-conversions (e.g., USD ➡️ EUR).
    - Flexible number processing (supports `.` thousands separators and `,` decimals).
- **📅 Historical Lookup**: Get values for any past date directly from the bot.
- **🔔 Automated Notifications**: Subscribe to receive immediate alerts when the BCV updates its rate.
- **🔋 High Availability**: Optimized for Render with anti-sleep system and rate-limit protection.

## 🛠️ Built With

- **Language**: JavaScript (Node.js)
- **Bot Framework**: [Telegraf](https://telegraf.js.org/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Rates API**: [Dolar API](https://github.com/enzonotario/esjs-dolar-api)
- **Scheduling**: `node-cron` for automated tasks.
- **Deployment**: Render.com

## ⚙️ Local Setup

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/ves-tasa-monitor.git
   cd ves-tasa-monitor
   ```
2. Install dependencies: `pnpm install`
3. Configure environment variables in a `.env` file:
   ```env
   BOT_TOKEN=your_telegram_token
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_anon_key
   PORT=3000
   ```
4. Run the bot: `pnpm dev`

## 📋 Database Schema (Supabase)

```sql
CREATE TABLE subscribers (
  id BIGSERIAL PRIMARY KEY,
  chat_id BIGINT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE bot_config (
  key TEXT PRIMARY KEY,
  value TEXT
);
```

## 🙏 Acknowledgments

This project uses the excellent [Dolar API](https://github.com/enzonotario/esjs-dolar-api) developed by [Enzo Notario](https://github.com/enzonotario).

## ⚖️ Disclaimer

This bot is a purely **informational** tool. The data displayed is obtained from third-party sources. The developer does not guarantee the accuracy or timeliness of the information and **is not responsible** for financial decisions or losses resulting from the use of this tool.

---

## 📄 Licencia / License

MIT License - [LICENSE](LICENSE)

Desarrollado con ❤️ para la comunidad venezolana. / Developed with ❤️ for the Venezuelan community.
