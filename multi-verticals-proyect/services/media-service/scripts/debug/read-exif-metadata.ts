/**
 * script: read-exif-metadata.ts
 *
 * Propósito:
 * Lee de forma binaria e inspecciona las cabeceras EXIF de una imagen
 * para determinar si existen metadatos de Software, Copyright, Autor o GPS inyectados.
 */

import fs from 'fs';
import sharp from 'sharp';

const FILE_PATH =
  '/home/rgr/source/marketplace/multi-verticals-proyect/services/scraper-service/__data/storage/images/escort-advisor/643277805/008.jpg';

async function run() {
  console.log(`=== DEBUG: LECTURA DE METADATOS EXIF NATIVOS ===`);
  console.log(`Analizando: ${FILE_PATH}`);

  if (!fs.existsSync(FILE_PATH)) {
    console.error('El archivo no existe.');
    return;
  }

  const buf = fs.readFileSync(FILE_PATH);
  const metadata = await sharp(buf).metadata();
  console.log('Resolución:', `${metadata.width}x${metadata.height}`);
  console.log('Formato:', metadata.format);
  console.log('¿Contiene cabecera EXIF?:', !!metadata.exif);

  if (metadata.exif) {
    const rawString = metadata.exif.toString('ascii').replace(/[^\x20-\x7E]/g, '.');
    console.log('Contenido EXIF ASCII (Redactado):\n', rawString);
  } else {
    console.log('No contiene metadatos EXIF.');
  }
}

run().catch(console.error);
