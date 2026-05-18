import { chromium } from 'patchright';

import { isDatingPipelinePort } from '#application/ports/dating-pipeline.port.js';
import { CapsolverAdapter } from '#infrastructure/adapters/captcha/capsolver.adapter.js';
import { NullTaxonomyResolver } from '#infrastructure/adapters/catalog/null-taxonomy-resolver.js';
import { ZyteProxyAdapter } from '#infrastructure/adapters/proxy/zyte-proxy.adapter.js';
import { SourceRegistry } from '#infrastructure/adapters/sources/source.registry.js';
import { config } from '#infrastructure/config/env.js';
import { CrawlerDispatcher } from '#infrastructure/crawler/crawler-dispatcher.js';

async function main() {
  const url = 'https://topescortbabes.com/barcelona/escorts/Lera_4091523';

  console.log('=== PRUEBA DE CONCEPTO: Patchright (Stealth nativo) ===');

  const captchaSolver = new CapsolverAdapter(config.capsolverApiKey || '');
  const proxyProvider = new ZyteProxyAdapter(config.zyteApiKey || '');
  const crawler = new CrawlerDispatcher(captchaSolver, proxyProvider);
  const registry = new SourceRegistry(crawler);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    await new Promise((r) => setTimeout(r, 5000));

    const content = await page.content();
    const isChallenged =
      content.includes('challenges.cloudflare.com') || content.includes('Verify you are human');

    if (isChallenged) {
      console.log('❌ DETECTADO: Cloudflare Turnstile bloqueó el acceso.');
    } else {
      console.log('✅ ÉXITO: Acceso concedido sin challenge aparente.');
      const pipeline = await registry.resolve(url);
      if (!isDatingPipelinePort(pipeline)) {
        throw new Error(`URL did not resolve to a v2 dating pipeline: ${url}`);
      }
      const payload = pipeline.extract(content, url);
      const scraped = await pipeline.map(payload, new NullTaxonomyResolver());
      console.log(`Datos: ${scraped.nickname}, ${scraped.personalDetails.ageYears} años`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`❌ Error durante la navegación: ${message}`);
  } finally {
    await browser.close();
  }
}

main();
