import { CrawlerEngine, ProxyStrategy } from '#application/ports/crawler.port.js';
import { isDatingPipelinePort } from '#application/ports/dating-pipeline.port.js';
import { CapsolverAdapter } from '#infrastructure/adapters/captcha/capsolver.adapter.js';
import { NullTaxonomyResolver } from '#infrastructure/adapters/catalog/null-taxonomy-resolver.js';
import { ZyteProxyAdapter } from '#infrastructure/adapters/proxy/zyte-proxy.adapter.js';
import { SourceRegistry } from '#infrastructure/adapters/sources/source.registry.js';
import { config } from '#infrastructure/config/env.js';
import { CrawlerDispatcher } from '#infrastructure/crawler/crawler-dispatcher.js';

async function run() {
  const url = 'https://www.topescortbabes.com/es/spain/madrid/escorts/marta-perez';
  console.log('\n=== TEST: Patchright SIN PROXY (Invisibilidad Nativa) ===');

  const captchaSolver = new CapsolverAdapter(config.capsolverApiKey || '');
  const proxyProvider = new ZyteProxyAdapter(config.zyteApiKey || '');
  const crawler = new CrawlerDispatcher(captchaSolver, proxyProvider);
  const registry = new SourceRegistry(crawler);

  try {
    console.log(`Intentando acceder a: ${url} ...`);
    const pipeline = await registry.resolve(url);
    if (!isDatingPipelinePort(pipeline)) {
      throw new Error(`URL did not resolve to a v2 dating pipeline: ${url}`);
    }

    const crawlerOpts = pipeline.getCrawlerOptions(url, {
      headless: true,
      engine: CrawlerEngine.PATCHRIGHT,
      proxyStrategy: ProxyStrategy.NONE,
    });
    const fetched = await crawler.fetch(url, crawlerOpts);
    const payload = pipeline.extract(fetched.html, url);
    const scraped = await pipeline.map(payload, new NullTaxonomyResolver());

    console.log('\n✅ ¡ÉXITO! Patchright ha pasado sin proxy.');
    console.log('--- Resultado de Extracción ---');
    console.log(`ID: ${scraped.id}`);
    console.log(`Nick: ${scraped.nickname}`);
    console.log(`Fotos: ${scraped.photos.length}`);
    console.log('-------------------------------\n');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌ FALLO: ${message}`);
  } finally {
    await crawler.close();
  }
}

run();
