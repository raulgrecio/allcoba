import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { logger } from '@allcoba/kernel';

import { JsonFileProviderRepository } from '#infrastructure/adapters/persistence/json-file-provider.repository.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const targetUrl = 'https://topescortbabes.com/barcelona/escorts/Lera_4091523';

async function testImageDownload() {
  logger().info('\n=== TEST: Descarga de imágenes (IP Local) ===');

  const repository = new JsonFileProviderRepository();

  const providers = await repository.find({ vertical: 'dating' });
  const item = providers.find(
    (p) => (p.metadata as Record<string, unknown>)?.sourceUrl === targetUrl,
  );

  if (!item) {
    logger().error('No se encontró el perfil. ¿Has corrido el discover antes?');
    return;
  }

  const imageUrls = item.images ?? [];
  logger().info(`Detectadas ${imageUrls.length} imágenes para ${item.nickname}`);

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

      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);

      const buffer = Buffer.from(await response.arrayBuffer());
      logger().info(`OK ${buffer.length} bytes in ${Date.now() - startTime}ms`);

      const fileName = `test-item-img-${index + 1}.jpg`;
      await fs.writeFile(path.join(__dirname, fileName), buffer);

      const head = buffer.toString('utf-8', 0, 100);
      if (head.includes('<html') || head.includes('<!DOCTYPE')) {
        logger().warn('Content looks like HTML — Cloudflare may have blocked the download.');
      }
    } catch (error: unknown) {
      logger().error(
        `Error downloading image ${index + 1}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

testImageDownload().catch(logger().error);
