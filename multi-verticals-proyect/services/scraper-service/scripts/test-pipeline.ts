import fs from 'fs';
import path from 'path';

import { HttpMediaAdapter } from '#infrastructure/adapters/images/http-media.adapter.js';

// Directorios de imágenes a procesar
const IMAGES_DIRS = [
  path.resolve(
    '/home/rgr/source/marketplace/multi-verticals-proyect/services/scraper-service/__data/storage/images',
  ),
  path.resolve(
    '/home/rgr/source/marketplace/multi-verticals-proyect/services/scraper-service/__data/#storage/images',
  ),
];
const REPORT_OUTPUT_PATH = path.resolve(
  '/home/rgr/source/marketplace/multi-verticals-proyect/services/scraper-service/scripts/pipeline-report.md',
);

interface ScannedImage {
  filePath: string;
  relativePath: string;
  portal: string;
}

// Escaneo recursivo para buscar imágenes
function scanImages(dir: string, portalName: string = '', baseDir: string = dir): ScannedImage[] {
  const results: ScannedImage[] = [];
  if (!fs.existsSync(dir)) return results;

  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      const currentPortal = portalName || file;
      results.push(...scanImages(filePath, currentPortal, baseDir));
    } else {
      const ext = path.extname(file).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
        results.push({
          filePath,
          relativePath: path.relative(baseDir, filePath),
          portal: portalName,
        });
      }
    }
  }
  return results;
}

async function run() {
  console.log(
    '\n\x1b[35m=== PIPELINE DE PROCESAMIENTO DE IMÁGENES: EJECUCIÓN PRUEBA REAL ===\x1b[0m',
  );

  const images: ScannedImage[] = [];
  for (const dir of IMAGES_DIRS) {
    console.log(`Buscando imágenes en: \x1b[36m${dir}\x1b[0m`);
    images.push(...scanImages(dir));
  }
  console.log(`Se encontraron \x1b[32m${images.length}\x1b[0m imágenes para procesar.\n`);

  if (images.length === 0) {
    console.log('No se encontraron imágenes para analizar.');
    return;
  }

  const pipeline = new HttpMediaAdapter();
  const resultsList = [];
  let processedCount = 0;
  let okCount = 0;
  let rejectedCount = 0;
  let hasInjectedCount = 0;
  let hasStegoCount = 0;
  let hasSensitiveCount = 0;

  // Límite de procesamiento para balancear e incluir todos los portales de prueba clave
  const ardienteImages = images.filter((img) => img.portal === 'ardienteplacer');
  const erosImages = images.filter((img) => img.portal === 'erosguia').slice(0, 5);
  const otherImages = images
    .filter((img) => img.portal !== 'ardienteplacer' && img.portal !== 'erosguia')
    .slice(0, 30);
  const selectedImages = [...otherImages, ...ardienteImages, ...erosImages];

  // Forzar inclusión de la imagen específica de erosguia solicitada por el usuario
  const specificErosImage = images.find((img) => img.filePath.includes('erosguia/55383/002.jpg'));
  if (
    specificErosImage &&
    !selectedImages.some((img) => img.filePath === specificErosImage.filePath)
  ) {
    selectedImages.push(specificErosImage);
  }

  for (const img of selectedImages) {
    processedCount++;
    console.log(
      `[\x1b[36m${processedCount}/${selectedImages.length}\x1b[0m] Procesando: \x1b[33m${img.relativePath}\x1b[0m (\x1b[34mPortal: ${img.portal}\x1b[0m)...`,
    );

    try {
      const buffer = fs.readFileSync(img.filePath);
      const urlMock = `mock://${img.portal}/${path.basename(img.filePath)}`;

      const result = await pipeline.process(buffer, urlMock, img.portal);

      resultsList.push({
        portal: img.portal,
        fileName: path.basename(img.filePath),
        relativePath: img.relativePath,
        result,
      });

      if (result.status === 'ok') {
        okCount++;
        const detectStr = [];
        if (result.detected.phones.length > 0)
          detectStr.push(`📞 ${result.detected.phones.join(', ')}`);
        if (result.detected.emails.length > 0)
          detectStr.push(`✉️ ${result.detected.emails.join(', ')}`);
        if (result.detected.urls.length > 0)
          detectStr.push(`🔗 ${result.detected.urls.join(', ')}`);
        if (result.detected.brands.length > 0)
          detectStr.push(`🏷️ Marcas: ${result.detected.brands.join(', ')}`);

        const stegoInfo = result.stegoText ? `🕵️ Stego: "${result.stegoText}"` : '';

        console.log(
          `  \x1b[32m✔ ACEPTADA\x1b[0m | WebP ${result.metadata.width}x${result.metadata.height} | pHash: ${result.metadata.exif?.software ? 'EXIF Soft: ' + result.metadata.exif.software : 'Sin EXIF'}`,
        );
        if (detectStr.length > 0) {
          console.log(`    \x1b[35mDetectado:\x1b[0m ${detectStr.join(' | ')}`);
        }
        if (stegoInfo) {
          console.log(`    \x1b[33m${stegoInfo}\x1b[0m`);
          hasStegoCount++;
        }
        if (result.adapterAssessment.hasInjectedInfo) {
          console.log(
            `    \x1b[31m⚠ Inyección de Portal:\x1b[0m [${result.adapterAssessment.injectedInfoTypes.join(', ')}]`,
          );
          hasInjectedCount++;
        }
        if (result.flags.hasSensitiveData) {
          hasSensitiveCount++;
        }
      } else {
        rejectedCount++;
        console.log(`  \x1b[31m✖ RECHAZADA\x1b[0m | Razón: \x1b[90m${result.rejectReason}\x1b[0m`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  \x1b[31m⚠ ERROR de ejecución:\x1b[0m ${msg}`);
    }
    console.log('----------------------------------------------------');
  }

  // Generar reporte en Markdown
  let markdown = `# Reporte de Análisis Real - Pipeline de Procesamiento de Imágenes\n\n`;
  markdown += `Generado automáticamente tras procesar imágenes reales descargadas de diversos portales en la carpeta \`__data/storage/images\`.\n\n`;
  markdown += `## Resumen Ejecutivo\n\n`;
  markdown += `| Métrica | Cantidad | Porcentaje |\n`;
  markdown += `| --- | --- | --- |\n`;
  markdown += `| **Total Imágenes Analizadas** | ${processedCount} | 100% |\n`;
  markdown += `| **Aceptadas (WebP normalizadas)** | ${okCount} | ${((okCount / processedCount) * 100).toFixed(1)}% |\n`;
  markdown += `| **Rechazadas (Filtro temprano)** | ${rejectedCount} | ${((rejectedCount / processedCount) * 100).toFixed(1)}% |\n`;
  markdown += `| **Con Información Inyectada (Watermarks/Metadatos)** | ${hasInjectedCount} | ${((hasInjectedCount / processedCount) * 100).toFixed(1)}% |\n`;
  markdown += `| **Con Esteganografía Oculta (LSB)** | ${hasStegoCount} | ${((hasStegoCount / processedCount) * 100).toFixed(1)}% |\n`;
  markdown += `| **Con Datos Sensibles (Teléfonos/Emails/GPS)** | ${hasSensitiveCount} | ${((hasSensitiveCount / processedCount) * 100).toFixed(1)}% |\n\n`;

  markdown += `## Resultados Detallados de Inyección por Portal\n\n`;
  markdown += `A continuación se detalla qué marcas de agua visuales o firmas de metadatos invisibles se encontraron en cada portal:\n\n`;
  markdown += `| Portal | Imagen | Estado | Resolución | Inyección Detectada | Detalles |\n`;
  markdown += `| --- | --- | --- | --- | --- | --- |\n`;

  for (const item of resultsList) {
    const res = item.result;
    const injectedStr = res.adapterAssessment.hasInjectedInfo
      ? res.adapterAssessment.injectedInfoTypes.map((t: string) => `\`${t}\``).join(', ')
      : 'Ninguna';
    const detailsStr = res.adapterAssessment.injectedInfoDetails.join('; ') || '-';
    const resolution = res.status === 'ok' ? `${res.metadata.width}x${res.metadata.height}` : '-';

    markdown += `| **${item.portal}** | \`${item.fileName}\` | ${res.status === 'ok' ? '🟢 Aceptada' : '🔴 Rechazada'} | ${resolution} | ${injectedStr} | ${detailsStr} |\n`;
  }

  markdown += `\n\n## Análisis de Esteganografía LSB y OCR\n\n`;
  markdown += `Detalle de las cadenas y textos extraídos de las imágenes aprobadas:\n\n`;
  markdown += `| Portal | Imagen | Texto OCR (Primeras 80 letras) | Esteganografía LSB Oculta | Datos Sensibles |\n`;
  markdown += `| --- | --- | --- | --- | --- |\n`;

  for (const item of resultsList) {
    if (item.result.status !== 'ok') continue;
    const res = item.result;
    const ocrSnippet = res.ocrText
      ? `\`${res.ocrText.substring(0, 80).replace(/\n/g, ' ')}\`...`
      : '*Sin texto visible*';
    const stegoVal = res.stegoText ? `🔒 \`${res.stegoText}\`` : '*Limpio (ruido)*';
    const sensitiveDetails =
      [
        ...res.detected.phones.map((p) => `📞 ${p}`),
        ...res.detected.emails.map((e) => `✉️ ${e}`),
        res.metadata.exif?.gps ? '📍 GPS' : '',
      ]
        .filter(Boolean)
        .join(', ') || 'Ninguno';

    markdown += `| **${item.portal}** | \`${item.fileName}\` | ${ocrSnippet} | ${stegoVal} | ${sensitiveDetails} |\n`;
  }

  fs.writeFileSync(REPORT_OUTPUT_PATH, markdown);

  console.log('\n\x1b[32m✔ Reporte de análisis real completado con éxito!\x1b[0m');
  console.log(`Resultados guardados en Markdown en: \x1b[36m${REPORT_OUTPUT_PATH}\x1b[0m\n`);
}

run().catch((err) => {
  console.error('Error fatal al ejecutar la prueba:', err);
});
