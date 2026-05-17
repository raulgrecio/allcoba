import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { logger } from '@allcoba/kernel';

import { Vertical } from '#domain/entities/vertical.ts';
import { JsonFileProviderRepository } from '#infrastructure/adapters/persistence/json-file-provider.repository.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const targetUrl = 'https://topescortbabes.com/barcelona/escorts/Lera_4091523';

async function testImageDownload() {
  logger().info('\n=== TEST: Descarga de imágenes (IP Local) ===');

  const repository = new JsonFileProviderRepository();

  // 1. Buscamos cualquier perfil que tenga imágenes para probar
  const providers = await repository.find({ vertical: Vertical.DATING });
  const item = providers.find((p) => (p.metadata as any)?.sourceUrl === targetUrl);

  if (!item) {
    logger().error(
      '❌ No se encontró el perfil de Malena en providers.json. ¿Has corrido el discover antes?',
    );
    return;
  }

  const imageUrls = (item.images as any[]) || [];
  logger().info(`Detectadas ${imageUrls.length} imágenes para ${item.displayName}`);

  // 2. Intentamos descargar las 2 primeras imágenes desde la IP local
  for (const [index, image] of imageUrls.slice(0, 2).entries()) {
    const url = image.originalUrl;
    console.log(`\nDescargando imagen ${index + 1}: ${url}`);

    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Referer: 'https://topescortbabes.com/',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const duration = Date.now() - startTime;

      logger().info(`✅ ¡ÉXITO! Tamaño: ${buffer.length} bytes. Tiempo: ${duration}ms`);

      // Guardamos una copia local para verificar que no sea un HTML de Cloudflare
      const fileName = `test-item-img-${index + 1}.jpg`;
      const filePath = path.join(__dirname, fileName);
      await fs.writeFile(filePath, buffer);
      logger().info(`💾 Imagen guardada en: ${filePath}`);

      // Comprobamos si el contenido parece HTML (indicativo de bloqueo/captcha)
      const head = buffer.toString('utf-8', 0, 100);
      if (head.includes('<html') || head.includes('<!DOCTYPE')) {
        logger().warn(
          '⚠️ ATENCIÓN: El contenido parece HTML. Cloudflare podría haber bloqueado la descarga.',
        );
      }
    } catch (error: any) {
      logger().error(`❌ Error al descargar imagen ${index + 1}: ${error.message}`);
    }
  }
}

testImageDownload().catch(logger().error);
