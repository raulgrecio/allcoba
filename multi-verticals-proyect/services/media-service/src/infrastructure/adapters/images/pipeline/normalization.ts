import { createHash } from 'crypto';
import sharp from 'sharp';

export interface NormalizationResult {
  readonly normalizedBuffer: Buffer;
  readonly thumbnailBuffer: Buffer;
  readonly sha256: string;
  readonly phash: string;
  readonly format: string;
  readonly width: number;
  readonly height: number;
  readonly size: number;
}

/**
 * Normalización (Etapa 2):
 *  1. Convierte el buffer filtrado a formato WebP estándar para máximo ahorro de espacio en R2.
 *  2. Genera un thumbnail cuadrado (150x150) optimizado para previsualizaciones rápidas.
 *  3. Calcula el hash SHA256 unívoco del buffer normalizado.
 *  4. Calcula el hash perceptual (pHash) de 64 bits para deduplicación robusta.
 */
export async function normalize(buffer: Buffer): Promise<NormalizationResult> {
  // 1. Convertir imagen a WebP estándar (calidad balanceada de 80)
  const normalizedBuffer = await sharp(buffer).webp({ quality: 80 }).toBuffer();

  const metadata = await sharp(normalizedBuffer).metadata();
  const width = metadata.width || 0;
  const height = metadata.height || 0;
  const size = normalizedBuffer.length;

  // 2. Generar miniatura cuadrada (150x150 en modo cover para evitar distorsiones)
  const thumbnailBuffer = await sharp(normalizedBuffer)
    .resize(150, 150, { fit: 'cover' })
    .webp({ quality: 70 })
    .toBuffer();

  // 3. Calcular SHA256
  const sha256 = createHash('sha256').update(normalizedBuffer).digest('hex');

  // 4. Calcular pHash perceptual
  const phash = await calculatePHash(normalizedBuffer);

  return {
    normalizedBuffer,
    thumbnailBuffer,
    sha256,
    phash,
    format: 'webp',
    width,
    height,
    size,
  };
}

/** Genera un hash perceptual de 64 bits (pHash) en base 16 hexadecimal */
async function calculatePHash(buffer: Buffer): Promise<string> {
  const { data } = await sharp(buffer)
    .greyscale()
    .resize(8, 8, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i]!;
  }
  const avg = sum / data.length;

  let binary = '';
  for (let i = 0; i < data.length; i++) {
    binary += data[i]! >= avg ? '1' : '0';
  }

  let hex = '';
  for (let i = 0; i < binary.length; i += 4) {
    hex += parseInt(binary.substring(i, i + 4), 2).toString(16);
  }

  return hex;
}
