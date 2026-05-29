import { LocalOcrAdapter } from '../local-ocr.adapter.js';

export interface OcrResult {
  readonly ocrText: string;
}

/**
 * OCR (Etapa 4):
 * Extrae texto visible de los píxeles o de los metadatos empotrados de la imagen normalizada
 * utilizando nuestro LocalOcrAdapter (perezoso/modular).
 */
export async function ocr(buffer: Buffer): Promise<OcrResult> {
  try {
    const adapter = new LocalOcrAdapter();
    const ocrText = await adapter.extractText(buffer);
    return { ocrText };
  } catch (error) {
    // Si falla, retornar vacío y continuar
    return { ocrText: '' };
  }
}
