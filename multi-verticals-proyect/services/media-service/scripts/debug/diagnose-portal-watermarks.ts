/**
 * script: diagnose-portal-watermarks.ts
 *
 * Propósito:
 * Ejecuta el ImagePipeline completo y reporta en detalle los resultados de
 * diagnóstico para las tres imágenes clave reportadas por el usuario:
 * - erosguia/55383/002.jpg (marca erosguia.com)
 * - escort-advisor/643277805/008.jpg (marca escortadvisor en baja resolución)
 * - eurogirlsescort/891605/004.jpg (logotipo central eurogirlsescort.com con silueta)
 */

import fs from 'fs';
import path from 'path';

import { ImagePipelineAdapter } from '#infrastructure/adapters/images/image-pipeline.adapter.js';

const targets = [
  {
    name: 'ErosGuia 002',
    path: '/home/rgr/source/marketplace/multi-verticals-proyect/services/scraper-service/__data/#storage/images/erosguia/55383/002.jpg',
    portal: 'erosguia',
  },
  {
    name: 'EscortAdvisor 008',
    path: '/home/rgr/source/marketplace/multi-verticals-proyect/services/scraper-service/__data/storage/images/escort-advisor/643277805/008.jpg',
    portal: 'escort-advisor',
  },
  {
    name: 'EuroGirlsEscort 004',
    path: '/home/rgr/source/marketplace/multi-verticals-proyect/services/scraper-service/__data/storage/images/eurogirlsescort/891605/004.jpg',
    portal: 'eurogirlsescort',
  },
];

async function run() {
  console.log('=== DEBUG: DIAGNÓSTICO UNIFICADO DE IMÁGENES CLAVE ===');
  const pipeline = new ImagePipelineAdapter();

  for (const target of targets) {
    console.log(`\n\n=========================================`);
    console.log(`DIAGNÓSTICO: ${target.name}`);
    console.log(`Ruta: ${target.path}`);
    console.log(`=========================================`);

    if (!fs.existsSync(target.path)) {
      console.log('❌ Archivo no encontrado. Omitiendo...');
      continue;
    }

    const buffer = fs.readFileSync(target.path);
    const mockUrl = `https://mock-storage.allcoba.com/${target.portal}/${path.basename(target.path)}`;

    try {
      const result = await pipeline.process(buffer, mockUrl, target.portal);

      console.log(`Status: ${result.status === 'ok' ? '🟢 APROBADA' : '🔴 RECHAZADA'}`);
      console.log(
        `Metadatos: ${result.metadata.width}x${result.metadata.height} | SHA256: ${result.hashes.sha256}`,
      );
      console.log(`Marcas de agua detectadas (Brands):`, result.detected.brands);
      console.log(
        `Heurísticas de Inyección (adapterAssessment):`,
        JSON.stringify(result.adapterAssessment, null, 2),
      );
      console.log(
        `Snippet OCR (primeros 150 caracteres):\n`,
        result.ocrText ? JSON.stringify(result.ocrText.substring(0, 150)) : '*Sin texto extraído*',
      );
    } catch (err) {
      console.error(`❌ Error en el procesamiento del pipeline:`, err);
    }
  }
}

run().catch(console.error);
