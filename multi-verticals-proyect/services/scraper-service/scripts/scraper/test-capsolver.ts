import { SolverStrategy } from '#application/ports/crawler.port.js';
import { CapsolverAdapter } from '#infrastructure/adapters/captcha/capsolver.adapter.js';
import { ZyteProxyAdapter } from '#infrastructure/adapters/proxy/zyte-proxy.adapter.js';
import { TopEscortBabesAdapter } from '#infrastructure/adapters/sources/dating/topescortbabes.adapter.js';
import { config } from '#infrastructure/config/env.js';
import { CrawlerDispatcher } from '#infrastructure/crawler/crawler-dispatcher.js';

async function main() {
  const url = 'https://www.topescortbabes.com/es/spain/madrid/escorts/marta-perez';

  console.log('\n=== TEST: CapSolver (Resolución de Captcha con IP Local) ===');

  const captchaSolver = new CapsolverAdapter(config.capsolverApiKey || '');
  const proxyProvider = new ZyteProxyAdapter(config.zyteApiKey || '');
  const crawler = new CrawlerDispatcher(captchaSolver, proxyProvider);
  const adapter = new TopEscortBabesAdapter(crawler);

  try {
    console.log(`Navegando a: ${url}`);
    // El adaptador ahora acepta CrawlerOptions directamente
    const result = await adapter.extract(url, {
      engine: 'patchright',
      headless: true,
      solverStrategy: SolverStrategy.SOLVER,
    });

    if (result.data) {
      console.log('✅ ¡ÉXITO! CapSolver ha resuelto el reto.');
      console.log(`Extraído: ${result.data?.attributes?.nickname}`);
    }
  } catch (err: any) {
    console.error(`❌ Error crítico: ${err.message}`);
  } finally {
    await crawler.close();
  }
}

main();
