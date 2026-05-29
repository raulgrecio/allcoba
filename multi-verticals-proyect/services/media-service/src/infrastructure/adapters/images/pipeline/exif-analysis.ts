import sharp from 'sharp';

import type { ParsedExif } from '#domain/canonical/processed-image-result.js';

import { ExifReader } from '../exif-reader.js';

/**
 * EXIF Analysis (Etapa 3):
 * Extrae la metadata binaria EXIF embebida en la imagen utilizando la lectura nativa de Sharp,
 * y la decodifica mediante nuestro decodificador nativo ExifReader.
 */
export async function exifAnalysis(buffer: Buffer): Promise<ParsedExif | undefined> {
  try {
    const metadata = await sharp(buffer).metadata();

    if (!metadata.exif) {
      return undefined;
    }

    const reader = new ExifReader();
    return await reader.parse(metadata.exif);
  } catch (error) {
    // Fallar de forma silenciosa para que EXIF corrupto no detenga el pipeline entero
    return undefined;
  }
}
