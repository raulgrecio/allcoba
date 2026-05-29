import { isDatingPipelinePort } from '#application/ports/dating-pipeline.port.js';
import { CapsolverAdapter } from '#infrastructure/adapters/captcha/capsolver.adapter.js';
import { NullTaxonomyResolver } from '#infrastructure/adapters/catalog/null-taxonomy-resolver.js';
import { ZyteProxyAdapter } from '#infrastructure/adapters/proxy/zyte-proxy.adapter.js';
import { SourceRegistry } from '#infrastructure/adapters/sources/source.registry.js';
import { config } from '#infrastructure/config/env.js';
import { CrawlerDispatcher } from '#infrastructure/crawler/crawler-dispatcher.js';

const URLS = [
  'https://topescortbabes.com/barcelona/escorts/Lera_4091523',
  'https://topescortbabes.com/es/madrid/escorts/Mia_4091401',
];

async function main() {
  if (!config.capsolverApiKey) {
    console.error('❌ Error: CAPSOLVER_API_KEY no encontrada en el entorno.');
    return;
  }

  if (!config.zyteApiKey) {
    console.error('❌ Error: ZYTE_API_KEY no encontrada en el entorno.');
    return;
  }

  const captchaSolver = new CapsolverAdapter(config.capsolverApiKey || '');
  const proxyProvider = new ZyteProxyAdapter(config.zyteApiKey || '');
  const crawler = new CrawlerDispatcher(captchaSolver, proxyProvider);
  const registry = new SourceRegistry(crawler);
  const resolver = new NullTaxonomyResolver();

  console.log('=== TEST: Dos perfiles en el mismo proceso (mismo contexto) ===');
  console.log('>>> Cloudflare debería aparecer como máximo UNA VEZ <<<\n');

  for (const url of URLS) {
    console.log(`\n--- Scraping: ${url} ---`);
    try {
      const pipeline = await registry.resolve(url);
      if (!isDatingPipelinePort(pipeline)) {
        throw new Error(`URL did not resolve to a v2 dating pipeline: ${url}`);
      }

      const crawlerOpts = pipeline.getCrawlerOptions(url, { headless: false, timeout: 90000 });
      const result = await crawler.fetch(url, crawlerOpts);
      const payload = pipeline.extract(result.html, url);
      const scraped = await pipeline.map(payload, resolver);

      console.log(`✅ OK: nickname=${scraped.nickname}, age=${scraped.personalDetails.ageYears}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`❌ Error: ${message}`);
    }
  }

  await crawler.close();
}

main();
