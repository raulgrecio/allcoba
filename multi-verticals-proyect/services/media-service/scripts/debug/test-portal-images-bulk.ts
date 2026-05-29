/**
 * script: test-portal-images-bulk.ts
 *
 * Propósito:
 * Realiza un barrido masivo sobre carpetas enteras de portales reales
 * (erosguia, escort-advisor, eurogirlsescort) para evaluar cuántas de sus imágenes
 * son correctamente identificadas y marcadas con marcas de agua del portal.
 *
 * Permite validar la fiabilidad de las expresiones de distorsión OCR a gran escala.
 */

import fs from 'fs';
import path from 'path';

import { ImagePipelineAdapter } from '#infrastructure/adapters/images/image-pipeline.adapter.js';

const directories = [
  {
    portal: 'erosguia',
    path: '/home/rgr/source/marketplace/multi-verticals-proyect/services/scraper-service/__data/#storage/images/erosguia/55383',
  },
  {
    portal: 'escort-advisor',
    path: '/home/rgr/source/marketplace/multi-verticals-proyect/services/scraper-service/__data/storage/images/escort-advisor/643277805',
  },
  {
    portal: 'eurogirlsescort',
    path: '/home/rgr/source/marketplace/multi-verticals-proyect/services/scraper-service/__data/storage/images/eurogirlsescort/891605',
  },
];

async function run() {
  console.log('=== DEBUG: BARRIDO MASIVO POR PORTAL ===');
  const pipeline = new ImagePipelineAdapter();

  for (const dir of directories) {
    console.log(`\n\n--------------------------------------------`);
    console.log(`BARRIDO EN CARPETA: ${dir.path} (${dir.portal})`);
    console.log(`--------------------------------------------`);

    if (!fs.existsSync(dir.path)) {
      console.log('❌ Carpeta no encontrada. Omitiendo...');
      continue;
    }

    const files = fs
      .readdirSync(dir.path)
      .filter((f) => f.endsWith('.jpg'))
      .sort();
    let total = 0;
    let identified = 0;

    for (const file of files) {
      total++;
      const filePath = path.join(dir.path, file);
      const buffer = fs.readFileSync(filePath);
      const mockUrl = `https://mock-storage.allcoba.com/${dir.portal}/${file}`;

      try {
        const result = await pipeline.process(buffer, mockUrl, dir.portal);
        const hasBrandMatch = result.detected.brands.length > 0;

        if (hasBrandMatch) {
          identified++;
        }

        console.log(
          `  [${file}] -> Brands: ${JSON.stringify(result.detected.brands)} ${hasBrandMatch ? '🟢 MATCH' : '⚪'}`,
        );
      } catch (err) {
        console.error(`  [${file}] -> ❌ Error:`, err);
      }
    }

    console.log(
      `\nResumen [${dir.portal}]: Detectadas ${identified}/${total} imágenes (${((identified / total) * 100).toFixed(1)}% de éxito).`,
    );
  }
}

run().catch(console.error);
