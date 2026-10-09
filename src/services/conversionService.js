/**
 * @fileoverview Servicio para realizar los cálculos de conversión de divisas.
 * Encapsula la lógica de negocio de los cálculos entre USD, EUR, VES, COP y ARS.
 */

/**
 * Clase encargada de los cálculos de conversión.
 */
export class ConversionService {
  /**
   * Calcula la conversión entre diferentes monedas basándose en las tasas proporcionadas.
   * 
   * @param {Object} params - Parámetros de la conversión.
   * @param {number} params.amount - Cantidad a convertir.
   * @param {string} params.convType - Tipo de conversión (ej: 'usd_to_ves', 'cop_to_usd', 'ars_to_usd').
   * @param {string} params.rateType - Fuente de la tasa ('oficial', 'paralelo', 'trm', 'mercado', 'blue').
   * @param {Array} [params.usdRates] - Lista de tasas actuales para el dólar venezolano.
   * @param {Array} [params.euroRates] - Lista de tasas actuales para el euro venezolano.
   * @param {Object} [params.copRates] - Tasas de Colombia (trm, mercado).
   * @param {Object} [params.arsRates] - Tasas de Argentina (oficial, blue).
   * @returns {Object|null} Objeto con los resultados de la conversión o null si hay error.
   */
  static convert({ amount, convType, rateType, usdRates, euroRates, copRates, arsRates }) {
    // 1. Conversiones de Peso Colombiano (COP ↔ USD)
    if (convType.includes('cop')) {
      const price = rateType === 'trm' ? copRates?.trm : copRates?.mercado;
      if (!price) return null;

      let result, fromSymbol, toSymbol, rateLabel;
      if (convType === 'usd_to_cop') {
        result = amount * price;
        fromSymbol = 'USD';
        toSymbol = 'COP';
      } else {
        result = amount / price;
        fromSymbol = 'COP';
        toSymbol = 'USD';
      }
      rateLabel = rateType === 'trm' ? 'COP/USD (TRM Oficial)' : 'COP/USD (Mercado)';
      return { result, fromSymbol, toSymbol, price, rateLabel };
    }

    // 2. Conversiones de Peso Argentino (ARS ↔ USD)
    if (convType.includes('ars')) {
      const price = rateType === 'blue' ? arsRates?.blue : arsRates?.oficial;
      if (!price) return null;

      let result, fromSymbol, toSymbol, rateLabel;
      if (convType === 'usd_to_ars') {
        result = amount * price;
        fromSymbol = 'USD';
        toSymbol = 'ARS';
      } else {
        result = amount / price;
        fromSymbol = 'ARS';
        toSymbol = 'USD';
      }
      rateLabel = rateType === 'blue' ? 'ARS/USD (Blue)' : 'ARS/USD (Oficial)';
      return { result, fromSymbol, toSymbol, price, rateLabel };
    }

    // 3. Conversiones estándar de Venezuela (VES, USD, EUR)
    const isUsd = convType.includes('usd');
    const sourceRates = convType.startsWith('usd') ? usdRates : (convType.startsWith('eur') ? euroRates : (usdRates || euroRates));
    const rateData = sourceRates?.find(r => r.fuente === rateType);

    if (!rateData) return null;

    const price = rateData.promedio;
    let result, fromSymbol, toSymbol, usedRate;

    if (convType.endsWith('to_ves')) {
      result = amount * price;
      fromSymbol = convType.startsWith('usd') ? 'USD' : 'EUR';
      toSymbol = 'VES';
      usedRate = `${price.toFixed(4)} VES/${fromSymbol}`;
    } else if (convType.startsWith('ves')) {
      result = amount / price;
      fromSymbol = 'VES';
      toSymbol = convType.endsWith('usd') ? 'USD' : 'EUR';
      usedRate = `${(1 / price).toFixed(6)} ${toSymbol}/VES`;
    } else {
      // Conversión cruzada USD <-> EUR
      const targetRates = convType.endsWith('eur') ? euroRates : usdRates;
      const targetRateData = targetRates.find(r => r.fuente === rateType);
      if (!targetRateData) return null;

      const targetPrice = targetRateData.promedio;
      result = (amount * price) / targetPrice;
      fromSymbol = convType.startsWith('usd') ? 'USD' : 'EUR';
      toSymbol = convType.endsWith('eur') ? 'EUR' : 'USD';
      usedRate = `${(price / targetPrice).toFixed(6)} ${toSymbol}/${fromSymbol}`;
    }

    return { result, fromSymbol, toSymbol, usedRate, price };
  }
}
