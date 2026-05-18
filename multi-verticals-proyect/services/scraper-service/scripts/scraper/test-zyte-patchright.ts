import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CrawlerEngine, ProxyStrategy, SolverStrategy } from '#application/ports/crawler.port.js';
import { isDatingPipelinePort } from '#application/ports/dating-pipeline.port.js';
import { CapsolverAdapter } from '#infrastructure/adapters/captcha/capsolver.adapter.js';
import { NullTaxonomyResolver } from '#infrastructure/adapters/catalog/null-taxonomy-resolver.js';
import { ZyteProxyAdapter } from '#infrastructure/adapters/proxy/zyte-proxy.adapter.js';
import { SourceRegistry } from '#infrastructure/adapters/sources/source.registry.js';
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
  const registry = new SourceRegistry(crawler);
  const resolver = new NullTaxonomyResolver();

  try {
    for (const url of urls) {
      console.log(`Navegando vía Zyte a: ${url}`);

      const pipeline = await registry.resolve(url);
      if (!isDatingPipelinePort(pipeline)) {
        throw new Error(`URL did not resolve to a v2 dating pipeline: ${url}`);
      }

      const crawlerOpts = pipeline.getCrawlerOptions(url, {
        proxyStrategy: ProxyStrategy.PROXY,
        solverStrategy: SolverStrategy.NONE,
        sessionProfile: undefined,
        headless: true,
        blockImages: true,
      });
      const fetched = await crawler.fetch(url, crawlerOpts);

      const slug = url.split('/').filter(Boolean).pop();
      const snapshotPath = path.join(__dirname, `snapshot-zyte-patchright-${slug}.html`);
      await fs.writeFile(snapshotPath, fetched.html || '', 'utf-8');

      const payload = pipeline.extract(fetched.html, url);
      const scraped = await pipeline.map(payload, resolver);

      console.log('✅ ¡ÉXITO! Hemos extraído los datos correctamente.');
      console.log(`Datos extraídos: ${scraped.nickname}`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌ Fallo en el test: ${message}`);
  } finally {
    await crawler.close();
  }
}

main();
