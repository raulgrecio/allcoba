import { CrawlerEngine, SolverStrategy } from '#application/ports/crawler.port.js';
import { isDatingPipelinePort } from '#application/ports/dating-pipeline.port.js';
import { CapsolverAdapter } from '#infrastructure/adapters/captcha/capsolver.adapter.js';
import { NullTaxonomyResolver } from '#infrastructure/adapters/catalog/null-taxonomy-resolver.js';
import { ZyteProxyAdapter } from '#infrastructure/adapters/proxy/zyte-proxy.adapter.js';
import { SourceRegistry } from '#infrastructure/adapters/sources/source.registry.js';
import { config } from '#infrastructure/config/env.js';
import { CrawlerDispatcher } from '#infrastructure/crawler/crawler-dispatcher.js';

async function main() {
  const url = 'https://www.topescortbabes.com/es/spain/madrid/escorts/marta-perez';

  console.log('\n=== TEST: CapSolver (Resolución de Captcha con IP Local) ===');

  const captchaSolver = new CapsolverAdapter(config.capsolverApiKey || '');
  const proxyProvider = new ZyteProxyAdapter(config.zyteApiKey || '');
  const crawler = new CrawlerDispatcher(captchaSolver, proxyProvider);
  const registry = new SourceRegistry(crawler);

  try {
    console.log(`Navegando a: ${url}`);
    const pipeline = await registry.resolve(url);
    if (!isDatingPipelinePort(pipeline)) {
      throw new Error(`URL did not resolve to a v2 dating pipeline: ${url}`);
    }

    const crawlerOpts = pipeline.getCrawlerOptions(url, {
      engine: CrawlerEngine.PATCHRIGHT,
      headless: true,
      solverStrategy: SolverStrategy.SOLVER,
    });
    const fetched = await crawler.fetch(url, crawlerOpts);
    const payload = pipeline.extract(fetched.html, url);
    const scraped = await pipeline.map(payload, new NullTaxonomyResolver());

    console.log('✅ ¡ÉXITO! CapSolver ha resuelto el reto.');
    console.log(`Extraído: ${scraped.nickname}`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌ Error crítico: ${message}`);
  } finally {
    await crawler.close();
  }
}

main();
