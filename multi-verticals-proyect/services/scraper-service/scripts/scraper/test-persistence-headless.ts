import path from 'path';
import { chromium } from 'patchright';

import { isDatingPipelinePort } from '#application/ports/dating-pipeline.port.js';
import { CapsolverAdapter } from '#infrastructure/adapters/captcha/capsolver.adapter.js';
import { NullTaxonomyResolver } from '#infrastructure/adapters/catalog/null-taxonomy-resolver.js';
import { ZyteProxyAdapter } from '#infrastructure/adapters/proxy/zyte-proxy.adapter.js';
import { SourceRegistry } from '#infrastructure/adapters/sources/source.registry.js';
import { config } from '#infrastructure/config/env.js';
import { CrawlerDispatcher } from '#infrastructure/crawler/crawler-dispatcher.js';

async function main() {
  const captchaSolver = new CapsolverAdapter(config.capsolverApiKey || '');
  const proxyProvider = new ZyteProxyAdapter(config.zyteApiKey || '');
  const crawler = new CrawlerDispatcher(captchaSolver, proxyProvider);
  const registry = new SourceRegistry(crawler);

  const url = 'https://www.eurogirlsescort.com/';
  const profilePath = path.join(process.cwd(), '__data/profiles/eurogirlsescort');

  console.log('\n=== FASE 2: Prueba de Persistencia (Headless: true) ===');
  console.log(`Usando perfil: ${profilePath}`);

  const context = await chromium.launchPersistentContext(profilePath, {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await context.newPage();

  try {
    console.log(`Navegando a: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    await new Promise((r) => setTimeout(r, 5000));

    const content = await page.content();
    const isChallenged =
      content.includes('challenges.cloudflare.com') || content.includes('Verify you are human');

    if (isChallenged) {
      console.log(
        '❌ FALLO: Incluso con la sesión persistida, Cloudflare pide verificación en modo Headless.',
      );
    } else {
      console.log('✅ ¡ÉXITO! La sesión persistente ha funcionado en modo invisible.');
      const pipeline = await registry.resolve(url);
      if (!isDatingPipelinePort(pipeline)) {
        throw new Error(`URL did not resolve to a v2 dating pipeline: ${url}`);
      }
      const payload = pipeline.extract(content, url);
      const scraped = await pipeline.map(payload, new NullTaxonomyResolver());
      console.log(`Extraído: ${scraped.nickname}, ${scraped.personalDetails.ageYears} años`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Error: ${message}`);
  } finally {
    await context.close();
  }
}

main();
