/**
 * @fileoverview Utilidad para la generación de imágenes dinámicas (recibos) usando Canvas.
 * Se encarga de cargar plantillas, registrar fuentes y renderizar texto con efectos.
 */

import { createCanvas, loadImage, registerFont } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Registrar fuentes indicando su familia y peso exacto para que Canvas/Pango las reconozca
registerFont(path.join(__dirname, '../../assets/fonts/Montserrat-Bold.ttf'), { family: 'Montserrat', weight: 'bold' });
registerFont(path.join(__dirname, '../../assets/fonts/Montserrat-Medium.ttf'), { family: 'Montserrat', weight: '500' });
registerFont(path.join(__dirname, '../../assets/fonts/Inter_24pt-Bold.ttf'), { family: 'Inter', weight: 'bold' });
registerFont(path.join(__dirname, '../../assets/fonts/Inter_24pt-Regular.ttf'), { family: 'Inter', weight: 'normal' });

/**
 * Genera una imagen de recibo basada en una plantilla limpia y datos dinámicos.
 * Utiliza auto-scaling para el texto y efectos de sombra para legibilidad.
 * 
 * @param {Object} data - Datos para completar el recibo.
 * @param {string} data.sourceAmount - Monto y moneda de origen (ej: "100.00 USD").
 * @param {string} data.targetAmount - Monto y moneda de destino (ej: "4,500.00 VES").
 * @param {string} data.rateUsed - Texto descriptivo de la tasa aplicada.
 * @param {string} data.date - Fecha y hora del recibo formateada.
 * @returns {Promise<Buffer>} Buffer de la imagen PNG generada.
 */
export async function generateReceipt(data) {
  const templatePath = path.join(__dirname, '../../assets/images/plantilla.webp');
  const image = await loadImage(templatePath);

  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');

  // Dibujar la plantilla base
  ctx.drawImage(image, 0, 0);

  const centerX = canvas.width / 2;

  /** Helper para aplicar sombra suave al texto */
  const setShadow = (ctx) => {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 6;
  };

  /** Helper para limpiar sombras */
  const clearShadow = (ctx) => {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  };

  // 1. Monto Origen (Montserrat Medium - Celeste)
  ctx.textAlign = 'center';
  ctx.fillStyle = '#85C6D9';
  ctx.font = '500 115px "Montserrat"';
  setShadow(ctx);
  ctx.fillText(data.sourceAmount, centerX, 740);

  // 2. Monto Destino (Montserrat Bold - Blanco con auto-scaling)
  const maxWidth = canvas.width * 0.88;
  let fontSize = 150;
  ctx.font = `bold ${fontSize}px "Montserrat"`;
  
  // Ajustar tamaño de fuente si el texto es muy largo
  while (ctx.measureText(data.targetAmount).width > maxWidth && fontSize > 60) {
    fontSize -= 5;
    ctx.font = `bold ${fontSize}px "Montserrat"`;
  }
  
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.fillText(data.targetAmount, centerX, 990);

  clearShadow(ctx);

  // 3. Recuadro Informativo (Inter - Texto centrado dinámicamente)
  const line1Y = 1190;
  const line2Y = 1320;

  setShadow(ctx);
  ctx.fillStyle = '#FFFFFF';

  // Línea 1: "Tasa aplicada: [valor]"
  ctx.font = 'bold 50px "Inter"';
  const boldW1 = ctx.measureText('Tasa aplicada: ').width;
  ctx.font = 'normal 50px "Inter"';
  const normalW1 = ctx.measureText(data.rateUsed).width;
  const totalW1 = boldW1 + normalW1;
  const startX1 = centerX - totalW1 / 2;

  ctx.font = 'bold 50px "Inter"';
  ctx.textAlign = 'left';
  ctx.fillText('Tasa aplicada:', startX1, line1Y);
  ctx.font = 'normal 50px "Inter"';
  ctx.fillText(data.rateUsed, startX1 + boldW1, line1Y);

  // Línea 2: "Fecha de consulta: [valor]"
  ctx.font = 'bold 50px "Inter"';
  const boldW2 = ctx.measureText('Fecha de consulta: ').width;
  ctx.font = 'normal 50px "Inter"';
  const normalW2 = ctx.measureText(data.date).width;
  const totalW2 = boldW2 + normalW2;
  const startX2 = centerX - totalW2 / 2;

  ctx.font = 'bold 50px "Inter"';
  ctx.fillText('Fecha de consulta:', startX2, line2Y);
  ctx.font = 'normal 50px "Inter"';
  ctx.fillText(data.date, startX2 + boldW2, line2Y);

  clearShadow(ctx);

  return canvas.toBuffer('image/png');
}
