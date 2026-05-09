/**
 * @fileoverview Servicio para el envío de notificaciones masivas a los suscriptores.
 * Maneja el envío por lotes y respeta los límites de velocidad de Telegram.
 */

import { delay } from '../utils/helpers.js';
import supabase from '../db.js';

/**
 * Clase para gestionar el envío de notificaciones.
 */
export class Notificator {
  /**
   * Envía un mensaje a todos los usuarios registrados en la tabla 'subscribers'.
   * 
   * @param {Object} botInstance - Instancia de Telegraf para enviar los mensajes.
   * @param {string} message - El mensaje formateado a enviar.
   * @returns {Promise<void>}
   */
  static async notifySubscribers(botInstance, message) {
    const { data: subscribers } = await supabase.from('subscribers').select('chat_id');
    
    if (!subscribers || subscribers.length === 0) return;

    for (const sub of subscribers) {
      try {
        await botInstance.telegram.sendMessage(sub.chat_id, message, { parse_mode: 'Markdown' });
        await delay(50); // Pausa de 50ms entre mensajes para evitar errores 429 (Too Many Requests)
      } catch (err) {
        console.error(`Error enviando a ${sub.chat_id}:`, err.message);
      }
    }
  }
}
