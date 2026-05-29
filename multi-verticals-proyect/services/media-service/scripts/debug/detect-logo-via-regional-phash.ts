/**
 * script: detect-logo-via-regional-phash.ts
 *
 * Propósito:
 * Demuestra cómo realizar la detección de marcas de agua gráficas y logotipos
 * semitransparentes que no contienen texto mediante Hash Perceptual Regional (Regional pHash).
 *
 * Funcionamiento:
 * 1. Recorta una sub-región fija de la imagen (donde se ubica habitualmente el logotipo).
 * 2. Reduce la sub-región a 8x8 píxeles en escala de grises y calcula su firma de bits (pHash).
 * 3. Compara las firmas de dos imágenes distintas usando la Distancia de Hamming.
 * 4. Si la distancia es muy baja (<= 12), confirma la coincidencia de logotipo visual sin usar OCR.
 */

import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// Función para calcular el hash perceptual de un buffer de sub-imagen recortada
async function calculateRegionalHash(
  buffer: Buffer,
  area: { left: number; top: number; width: number; height: number },
): Promise<string> {
  const cropped = await sharp(buffer)
    .extract(area)
    .greyscale()
    .resize(8, 8, { fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const data = cropped.data;
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

// Función para calcular la distancia de Hamming
function getHammingDistance(hash1: string, hash2: string): number {
  const h1 = parseInt(hash1, 16).toString(2).padStart(64, '0');
  const h2 = parseInt(hash2, 16).toString(2).padStart(64, '0');

  let distance = 0;
  for (let i = 0; i < h1.length; i++) {
    if (h1[i] !== h2[i]) {
      distance++;
    }
  }
  return distance;
}

async function run() {
  console.log('=== DEBUG: DETECCIÓN GRÁFICA DE LOGOTIPOS (REGIONAL pHASH) ===');

  const img1Path =
    '/home/rgr/source/marketplace/multi-verticals-proyect/services/scraper-service/__data/#storage/images/erosguia/55383/002.jpg';
  const img2Path =
    '/home/rgr/source/marketplace/multi-verticals-proyect/services/scraper-service/__data/#storage/images/erosguia/55383/004.jpg';

  if (!fs.existsSync(img1Path) || !fs.existsSync(img2Path)) {
    console.log('Error: No se encontraron las imágenes de prueba.');
    return;
  }

  const buf1 = fs.readFileSync(img1Path);
  const buf2 = fs.readFileSync(img2Path);

  const meta1 = await sharp(buf1).metadata();
  const meta2 = await sharp(buf2).metadata();

  // Definir la región central (donde está el logotipo de erosguia)
  const area1 = {
    left: Math.floor((meta1.width || 590) * 0.3),
    top: Math.floor((meta1.height || 880) * 0.4),
    width: Math.floor((meta1.width || 590) * 0.4),
    height: Math.floor((meta1.height || 880) * 0.2),
  };

  const area2 = {
    left: Math.floor((meta2.width || 590) * 0.3),
    top: Math.floor((meta2.height || 880) * 0.4),
    width: Math.floor((meta2.width || 590) * 0.4),
    height: Math.floor((meta2.height || 880) * 0.2),
  };

  const hash1 = await calculateRegionalHash(buf1, area1);
  const hash2 = await calculateRegionalHash(buf2, area2);
  const distance = getHammingDistance(hash1, hash2);

  console.log(`\nImagen 1: ${path.basename(img1Path)} | Hash Central: ${hash1}`);
  console.log(`Imagen 2: ${path.basename(img2Path)} | Hash Central: ${hash2}`);
  console.log(`Distancia de Hamming: ${distance} bits de diferencia.`);

  if (distance <= 12) {
    console.log('🎯 LOGOTIPO DETECTADO: Coincidencia visual de alta probabilidad.');
  } else {
    console.log('❌ LOGOTIPO NO DETECTADO: Las sub-regiones difieren visualmente.');
  }
}

run().catch(console.error);
