# ⴾ VES Tasa Monitor - Telegram Bot

[**Español**](#español) | [**English**](#english)

---

<a name="español"></a>
# Español 🇪🇸

**VES Tasa Monitor** es un bot de Telegram robusto y eficiente diseñado para monitorear el mercado cambiario en Venezuela. Proporciona tasas en tiempo real (USD/EUR), permite realizar conversiones precisas, generar recibos visuales, consultar datos históricos y recibir notificaciones automáticas ante cambios en la tasa oficial. Además, incluye herramientas complementarias para consultar y convertir divisas de **Colombia (COP)** y **Argentina (ARS)** frente al USD.

📢 **Prueba el bot en vivo:** [t.me/ves_monitor_bot](https://t.me/ves_monitor_bot)

## 🚀 Características Principales

- **📊 Tasas en Tiempo Real (Venezuela)**: Consulta instantánea del valor del Dólar (BCV, USDT Binance) y Euro BCV con cálculo de brecha cambiaria (`/tasa`).
- **🌎 Tasas Internacionales Complementarias**:
    - **🇨🇴 Colombia (`/colombia`)**: Consulta de TRM (Oficial) y Dólar Mercado (Compra y Venta).
    - **🇦🇷 Argentina (`/argentina`)**: Consulta de Dólar Oficial y Dólar Blue (Compra y Venta).
- **🧮 Calculadora de Divisas Multimoneda (`/convertir`)**:
    - Conversión entre VES, USD y EUR con soporte de tasas oficiales y USDT.
    - Soporte para conversión entre Peso Colombiano (COP ↔ USD) con TRM Oficial o Mercado.
    - Soporte para conversión entre Peso Argentino (ARS ↔ USD) con Dólar Oficial o Blue.
    - Conversiones cruzadas (ej. USD ➡️ EUR).
    - Procesamiento flexible de números (soporta separadores de miles `.` y decimales `,`).
- **🖼️ Generación de Recibos Visuales**: Crea imágenes profesionales (PNG) con el resultado de tus conversiones para compartir fácilmente.
- **📅 Consulta Histórica**: Obtén los valores del Dólar BCV, USDT y Euro BCV de cualquier fecha pasada directamente desde el bot (`/historico`).
- **🔔 Notificaciones Automáticas (Exclusivas Venezuela)**: Reporte matutino diario a las 7:00 AM (Caracas) y alertas en tiempo real cuando el BCV actualice su tasa oficial.
- **🏗️ Arquitectura Modular**: Código desacoplado (Handlers, Services, Cron, Utils) para alta escalabilidad y fácil mantenimiento.
- **🔋 Homelab Self-Hosted**: Optimizado para ejecución en Docker Compose con PostgreSQL 15 nativo (bajo consumo de recursos).

## 🛠️ Tecnologías Utilizadas

- **Lenguaje**: JavaScript (Node.js 22)
- **Framework de Bot**: [Telegraf](https://telegraf.js.org/)
- **Base de Datos**: PostgreSQL 15 (Conexión directa vía pool nativo `pg`)
- **Generación de Imágenes**: [Skia-Canvas](https://www.npmjs.com/package/skia-canvas) (Alto rendimiento y compatibilidad)
- **API de Tasas**: [Dolar API](https://github.com/enzonotario/esjs-dolar-api)
- **Programación**: `node-cron` para tareas automáticas.

## 📂 Estructura del Proyecto

El proyecto sigue una arquitectura limpia y modular:

```text
src/
├── cron/       # Tareas programadas (monitoreo de cambios y reporte 7:00 AM Venezuela)
├── handlers/   # Manejadores de eventos de Telegram (comandos, acciones, texto)
├── services/   # Lógica de negocio (conversiones, formateo, notificaciones, tasas)
├── utils/      # Utilidades (ayudantes de fecha, generador de imágenes)
├── api.js      # Cliente para la API externa de tasas (VE, CO, AR)
├── config.js   # Gestión centralizada de configuración
├── db.js       # Cliente y pool de conexiones PostgreSQL (pg)
└── index.js    # Punto de entrada y configuración del bot
```

## ⚙️ Despliegue con Docker Compose (Homelab)

1. Clona el repositorio:
   ```bash
   git clone https://github.com/alirioi/ves-monitor-bot.git
   cd ves-monitor-bot
   ```
2. Configura tu archivo `.env`:
   ```env
   BOT_TOKEN=tu_token_de_telegram
   POSTGRES_PASSWORD=tu_password_seguro
   DATABASE_URL=postgres://postgres:tu_password_seguro@postgres:5432/postgres
   PORT=8080
   ```
3. Inicia los servicios:
   ```bash
   docker compose up -d --build
   ```

## 📋 Estructura de la Base de Datos (PostgreSQL)

```sql
-- Tabla para suscriptores de alertas y reporte diario de Venezuela
CREATE TABLE IF NOT EXISTS public.subscribers (
  chat_id BIGINT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla para configuración y estados del bot (tasas previas)
CREATE TABLE IF NOT EXISTS public.bot_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🙏 Agradecimientos

Este proyecto utiliza la excelente [Dolar API](https://github.com/enzonotario/esjs-dolar-api) desarrollada por [Enzo Notario](https://github.com/enzonotario).

## ⚖️ Descargo de Responsabilidad (Disclaimer)

Este bot es una herramienta meramente **informativa**. Los datos mostrados son obtenidos de fuentes de terceros. El desarrollador no garantiza la exactitud o actualidad de la información y **no se hace responsable** por decisiones financieras o pérdidas derivadas del uso de esta herramienta.

---

<a name="english"></a>
# English 🇺🇸

**VES Tasa Monitor** is a robust and efficient Telegram bot designed to monitor the exchange market in Venezuela. It provides real-time rates (USD/EUR), accurate currency conversions, visual receipt generation, historical data lookups, and automated notifications for official rate changes. It also includes complementary features to query and convert rates for **Colombia (COP)** and **Argentina (ARS)** to USD.

📢 **Try the bot live:** [t.me/ves_monitor_bot](https://t.me/ves_monitor_bot)

## 🚀 Key Features

- **📊 Real-Time Rates (Venezuela)**: Instant lookup for Dollar (BCV, USDT Binance) and Euro rates with exchange spread calculations (`/tasa`).
- **🌎 Complementary Regional Rates**:
    - **🇨🇴 Colombia (`/colombia`)**: Official TRM and Market Dollar rates (Buy & Sell).
    - **🇦🇷 Argentina (`/argentina`)**: Official Dollar and Blue Dollar rates (Buy & Sell).
- **🧮 Multi-Currency Calculator (`/convertir`)**:
    - Conversion between VES, USD, and EUR with support for official and USDT rates.
    - Conversion for Colombian Peso (COP ↔ USD) using Official TRM or Market rate.
    - Conversion for Argentine Peso (ARS ↔ USD) using Official or Blue rate.
    - Cross-conversions (e.g., USD ➡️ EUR).
    - Flexible number processing (supports `.` thousands separators and `,` decimals).
- **🖼️ Visual Receipt Generation**: Create professional PNG images with your conversion results for easy sharing.
- **📅 Historical Lookup**: Get past values for BCV Dollar, USDT, and BCV Euro directly from the bot (`/historico`).
- **🔔 Automated Notifications (Venezuela Only)**: Daily morning report at 7:00 AM (Caracas) and real-time alerts when BCV updates official rates.
- **🏗️ Modular Architecture**: Clean decoupled architecture (Handlers, Services, Cron, Utils) for high maintainability.
- **🔋 Homelab Self-Hosted**: Optimized for Docker Compose with native PostgreSQL 15.

## 🛠️ Built With

- **Language**: JavaScript (Node.js 22)
- **Bot Framework**: [Telegraf](https://telegraf.js.org/)
- **Database**: PostgreSQL 15 (Direct pool connection via `pg`)
- **Image Generation**: [Skia-Canvas](https://www.npmjs.com/package/skia-canvas)
- **Rates API**: [Dolar API](https://github.com/enzonotario/esjs-dolar-api)
- **Scheduling**: `node-cron` for automated tasks.

## 📄 License

MIT License - [LICENSE](LICENSE)

Desarrollado con ❤️ para la comunidad venezolana. / Developed with ❤️ for the Venezuelan community.
