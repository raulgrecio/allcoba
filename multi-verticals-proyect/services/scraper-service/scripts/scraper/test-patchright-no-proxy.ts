import { CapsolverAdapter } from '#infrastructure/adapters/captcha/capsolver.adapter.js';
import { ZyteProxyAdapter } from '#infrastructure/adapters/proxy/zyte-proxy.adapter.js';
import { TopEscortBabesAdapter } from '#infrastructure/adapters/sources/dating/topescortbabes.adapter.js';
import { config } from '#infrastructure/config/env.js';
import { CrawlerDispatcher } from '#infrastructure/crawler/crawler-dispatcher.js';

async function run() {
  const url = 'https://www.topescortbabes.com/es/spain/madrid/escorts/marta-perez';
  console.log('\n=== TEST: Patchright SIN PROXY (Invisibilidad Nativa) ===');

  const captchaSolver = new CapsolverAdapter(config.capsolverApiKey || '');
  const proxyProvider = new ZyteProxyAdapter(config.zyteApiKey || '');
  const crawler = new CrawlerDispatcher(captchaSolver, proxyProvider);
  const adapter = new TopEscortBabesAdapter(crawler);

  try {
    console.log(`Intentando acceder a: ${url} ...`);
    const result = await adapter.extract(url, {
      headless: true,
      engine: 'patchright',
      proxyStrategy: 'none',
    });

    console.log('\n✅ ¡ÉXITO! Patchright ha pasado sin proxy.');
    console.log('--- Resultado de Extracción ---');
    console.log(`ID: ${result.data.externalId}`);
    console.log(`Nombre: ${result.data.name}`);
    console.log(`Nick: ${result.data.attributes?.nickname}`);
    console.log(`Fotos: ${result.data.imageUrls.length}`);
    console.log('-------------------------------\n');
  } catch (err: any) {
    console.error(`❌ FALLO: ${err.message}`);
  } finally {
    await crawler.close();
  }
}

run();
