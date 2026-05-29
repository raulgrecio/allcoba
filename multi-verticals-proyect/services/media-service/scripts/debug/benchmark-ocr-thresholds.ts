/**
 * script: benchmark-ocr-thresholds.ts
 *
 * Propósito:
 * Evalúa y compara cómo se lee el texto de una marca de agua tras aplicar
 * escala de grises y binarización por umbral (Thresholding) a diferentes niveles.
 *
 * Permite encontrar el nivel óptimo de contraste (ej. 100, 115, 140) para separar
 * marcas de agua complejas (como las de EuroGirlsEscort o ErosGuia) de sus fondos.
 */

import fs from 'fs';
import sharp from 'sharp';

const EROS_FILE =
  '/home/rgr/source/marketplace/multi-verticals-proyect/services/scraper-service/__data/#storage/images/erosguia/55383/002.jpg';
const ESCORT_FILE =
  '/home/rgr/source/marketplace/multi-verticals-proyect/services/scraper-service/__data/storage/images/escort-advisor/643277805/008.jpg';

async function testThreshold(th: number) {
  const { default: Tesseract } = await import('tesseract.js');
  console.log(`\n--- BENCHMARK UMBRAL: ${th} ---`);

  // 1. Erosguia (Resolución media)
  const bufEros = fs.readFileSync(EROS_FILE);
  const metaE = await sharp(bufEros).metadata();
  const cropE = {
    left: Math.floor((metaE.width || 590) * 0.05),
    top: Math.floor((metaE.height || 880) * 0.38),
    width: Math.floor((metaE.width || 590) * 0.9),
    height: Math.floor((metaE.height || 880) * 0.22),
  };
  const processedE = await sharp(bufEros)
    .extract(cropE)
    .resize(1200, Math.floor(cropE.height * (1200 / cropE.width)))
    .greyscale()
    .threshold(th)
    .toBuffer();

  const resE = await Tesseract.recognize(processedE, 'eng');
  console.log('Erosguia OCR:', JSON.stringify(resE.data.text.trim()));

  // 2. Escort Advisor (Resolución muy baja)
  const bufEscort = fs.readFileSync(ESCORT_FILE);
  const metaEsc = await sharp(bufEscort).metadata();
  const cropEsc = {
    left: Math.floor((metaEsc.width || 201) * 0.05),
    top: Math.floor((metaEsc.height || 268) * 0.38),
    width: Math.floor((metaEsc.width || 201) * 0.9),
    height: Math.floor((metaEsc.height || 268) * 0.22),
  };
  const processedEsc = await sharp(bufEscort)
    .extract(cropEsc)
    .resize(1200, Math.floor(cropEsc.height * (1200 / cropEsc.width)))
    .greyscale()
    .threshold(th)
    .toBuffer();

  const resEsc = await Tesseract.recognize(processedEsc, 'eng');
  console.log('EscortAdvisor OCR:', JSON.stringify(resEsc.data.text.trim()));
}

async function run() {
  await testThreshold(115);
  await testThreshold(140);
  await testThreshold(145);
}

run().catch(console.error);
