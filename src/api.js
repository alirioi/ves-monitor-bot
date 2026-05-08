const BASE_URL = 'https://ve.dolarapi.com/v1';

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

export async function getHistoricRate(date) {
  // El endpoint histórico en ve.dolarapi.com
  try {
    const response = await fetch(`${BASE_URL}/dolares/historico/${date}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('API Historic Error:', error);
    return null;
  }
}
