import sharp from 'sharp';

import { logger } from '@allcoba/kernel';

import type { OcrPort } from '#application/ports/ocr.port.js';
import { config } from '#infrastructure/config/env.js';

export class LocalOcrAdapter implements OcrPort {
  private readonly log = logger().child({ component: 'LocalOcrAdapter' });

  async extractText(buffer: Buffer): Promise<string> {
    const isOcrEnabled = config.ocrEnabled;

    if (isOcrEnabled) {
      try {
        // Carga perezosa dinámica de tesseract.js
        const { default: Tesseract } = await import('tesseract.js');
        this.log.debug('Running pixel-level OCR with dual preprocessed streams');

        // 1. Imagen entera (Grayscale + Agrandado) - Excelente para textos, emails y teléfonos
        const processedBuffer = await sharp(buffer).resize({ width: 1200 }).greyscale().toBuffer();

        // 2. Franja horizontal central (Grayscale + Umbral 115) - Aísla marcas de agua gigantes centrales
        const meta = await sharp(buffer).metadata();
        const w = meta.width || 600;
        const h = meta.height || 1000;
        const cropLeft = Math.floor(w * 0.05);
        const cropWidth = Math.floor(w * 0.9);
        const cropTop = Math.floor(h * 0.38);
        const cropHeight = Math.floor(h * 0.22); // Enfocado en la zona central

        const centralStripBuffer = await sharp(buffer)
          .extract({ left: cropLeft, top: cropTop, width: cropWidth, height: cropHeight })
          .resize({ width: 1200 })
          .greyscale()
          .threshold(115)
          .toBuffer();

        // Procesar en paralelo ambos flujos (Texto General + Marca de Agua Central Binarizada)
        const [res1, res2] = await Promise.all([
          Tesseract.recognize(processedBuffer, 'eng+spa'),
          Tesseract.recognize(centralStripBuffer, 'eng'),
        ]);

        const combinedText = (res1.data.text || '') + '\n' + (res2.data.text || '');
        return combinedText;
      } catch (err) {
        this.log.warn(
          { error: err instanceof Error ? err.message : String(err) },
          'Error loading or running Tesseract.js. Falling back to metadata/binary sweep.',
        );
      }
    }

    // Barrido heurístico ultra rápido del buffer
    return this.fallbackBinaryTextSweep(buffer);
  }

  /**
   * Sweeps printable characters (ASCII 32 to 126) of length >= 6.
   * This is extremely fast, free, and robust enough to discover raw XML strings,
   * EXIF text strings, embedded URLs, or XMP metadata which often hold watermarks.
   */
  private fallbackBinaryTextSweep(buffer: Buffer): string {
    let result = '';
    let current = '';

    for (let i = 0; i < buffer.length; i++) {
      const code = buffer[i]!;
      // Rango de caracteres ASCII imprimibles
      if (code >= 32 && code <= 126) {
        current += String.fromCharCode(code);
      } else {
        if (current.length >= 6) {
          result += current + '\n';
        }
        current = '';
      }
    }

    if (current.length >= 6) {
      result += current;
    }

    // Limitar para evitar strings de tamaño absurdo en memoria
    return result.slice(0, 10000);
  }
}
