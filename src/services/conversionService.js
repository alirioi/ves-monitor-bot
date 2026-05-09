/**
 * @fileoverview Servicio para realizar los cálculos de conversión de divisas.
 * Encapsula la lógica de negocio de los cálculos entre USD, EUR y VES.
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
   * @param {string} params.convType - Tipo de conversión (ej: 'usd_to_ves', 'ves_to_eur').
   * @param {string} params.rateType - Fuente de la tasa ('oficial' o 'paralelo').
   * @param {Array} params.usdRates - Lista de tasas actuales para el dólar.
   * @param {Array} params.euroRates - Lista de tasas actuales para el euro.
   * @returns {Object|null} Objeto con los resultados de la conversión o null si hay error.
   */
  static convert({ amount, convType, rateType, usdRates, euroRates }) {
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

