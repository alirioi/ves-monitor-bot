/**
 * @fileoverview Servicio para el envío de notificaciones masivas.
 */

import { delay } from '../utils/helpers.js';
import supabase from '../db.js';

export class Notificator {
  /**
   * Envía un mensaje a todos los suscriptores.
   */
  static async notifySubscribers(botInstance, message) {
    const { data: subscribers } = await supabase.from('subscribers').select('chat_id');
    
    if (!subscribers || subscribers.length === 0) return;

    for (const sub of subscribers) {
      try {
        await botInstance.telegram.sendMessage(sub.chat_id, message, { parse_mode: 'Markdown' });
        await delay(50);
      } catch (err) {
        console.error(`Error enviando a ${sub.chat_id}:`, err.message);
      }
    }
  }
}
