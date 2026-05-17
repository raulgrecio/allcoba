import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CrawlerEngine, ProxyStrategy, SolverStrategy } from '#application/ports/crawler.port.ts';
import { CapsolverAdapter } from '#infrastructure/adapters/captcha/capsolver.adapter.js';
import { ZyteProxyAdapter } from '#infrastructure/adapters/proxy/zyte-proxy.adapter.js';
import { TopEscortBabesAdapter } from '#infrastructure/adapters/sources/dating/topescortbabes.adapter.js';
import { config } from '#infrastructure/config/env.js';
import { CrawlerDispatcher } from '#infrastructure/crawler/crawler-dispatcher.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const urls = [
  'https://topescortbabes.com/es/barcelona/escorts/Lera_4091523',
  'https://topescortbabes.com/es/madrid/escorts/Mady_3109832',
  'https://topescortbabes.com/es/barcelona/escorts/Scarlett-Rous_2817245',
];

async function main() {
  if (!config.zyteApiKey) {
    console.error('❌ Error: ZYTE_API_KEY no encontrada en el entorno.');
    return;
  }

  if (!config.capsolverApiKey) {
    console.error('❌ Error: CAPSOLVER_API_KEY no encontrada en el entorno.');
    return;
  }

  console.log('\n=== TEST: Patchright + Zyte (Configuración Unificada) ===');

  const captchaSolver = new CapsolverAdapter(config.capsolverApiKey || '');
  const proxyProvider = new ZyteProxyAdapter(config.zyteApiKey || '');
  const crawler = new CrawlerDispatcher(captchaSolver, proxyProvider, CrawlerEngine.PATCHRIGHT);
  const adapter = new TopEscortBabesAdapter(crawler);

  try {
    for (const url of urls) {
      console.log(`Navegando vía Zyte a: ${url}`);

      const result = await adapter.extract(url, {
        proxyStrategy: ProxyStrategy.PROXY,
        solverStrategy: SolverStrategy.NONE,
        sessionProfile: undefined,
        headless: true,
        blockImages: true,
      });

      const slug = url.split('/').filter(Boolean).pop();
      const snapshotPath = path.join(__dirname, `snapshot-zyte-patchright-${slug}.html`);
      await fs.writeFile(snapshotPath, result?.html || '', 'utf-8');

      console.log('✅ ¡ÉXITO! Hemos extraído los datos correctamente.');
      console.log(
        `Datos extraídos: ${result.data.name}, Nick: ${result.data.attributes?.nickname}`,
      );
    }
  } catch (err: any) {
    console.error(`❌ Fallo en el test: ${err.message}`);
  } finally {
    await crawler.close();
  }
}

main();
