import { config } from './config.js';

const BASE_URL = config.apiUrl;

export async function getRates() {
  try {
    const response = await fetch(`${BASE_URL}/dolares`);
    if (!response.ok) throw new Error('Error al obtener las tasas');
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    return null;
  }
}

export async function getEuroRates() {
  try {
    const response = await fetch(`${BASE_URL}/euros`);
    if (!response.ok) throw new Error('Error al obtener las tasas de euros');
    return await response.json();
  } catch (error) {
    console.error('API Euro Error:', error);
    return null;
  }
}

export async function getHistoricRate(date, type = 'dolares', fuente = 'oficial') {
  // En ve.dolarapi.com, los históricos se obtienen por listas
  // Ejemplo: /v1/historicos/dolares/oficial
  try {
    const response = await fetch(`${BASE_URL}/historicos/${type}/${fuente}`);
    if (!response.ok) return null;
    const history = await response.json();
    // history es un array, buscamos la fecha exacta YYYY-MM-DD
    return history.find(entry => entry.fecha === date);
  } catch (error) {
    console.error('API Historic Error:', error);
    return null;
  }
}
