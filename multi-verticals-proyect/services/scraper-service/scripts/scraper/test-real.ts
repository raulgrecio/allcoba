import { CapsolverAdapter } from '#infrastructure/adapters/captcha/capsolver.adapter.js';
import { ZyteProxyAdapter } from '#infrastructure/adapters/proxy/zyte-proxy.adapter.js';
import { TopEscortBabesAdapter } from '#infrastructure/adapters/sources/dating/topescortbabes.adapter.js';
import { config } from '#infrastructure/config/env.js';
import { CrawlerDispatcher } from '#infrastructure/crawler/crawler-dispatcher.js';

// Dos perfiles distintos del mismo dominio para probar reutilización de contexto
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
  const adapter = new TopEscortBabesAdapter(crawler);

  console.log('=== TEST: Dos perfiles en el mismo proceso (mismo contexto) ===');
  console.log('>>> Cloudflare debería aparecer como máximo UNA VEZ <<<\n');

  for (const url of URLS) {
    console.log(`\n--- Scraping: ${url} ---`);
    try {
      const result = await crawler.fetch(url, { headless: false, timeout: 90000 });
      const extraction = await adapter.extract(url, { html: result.html });
      const attrs = extraction.data?.attributes;
      console.log(`✅ OK: nickname=${attrs?.nickname}, age=${attrs?.age}`);
    } catch (err: any) {
      console.error(`❌ Error: ${err.message}`);
    }
  }

  await crawler.close();
}

main();
