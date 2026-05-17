import path from 'path';
import { chromium } from 'patchright';

import { CapsolverAdapter } from '#infrastructure/adapters/captcha/capsolver.adapter.js';
import { ZyteProxyAdapter } from '#infrastructure/adapters/proxy/zyte-proxy.adapter.js';
import { EuroGirlsEscortAdapter } from '#infrastructure/adapters/sources/dating/eurogirlsescort.adapter.js';
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

  // Lanzamos el navegador con el contexto persistente que creamos antes
  const context = await chromium.launchPersistentContext(profilePath, {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await context.newPage();

  try {
    console.log(`Navegando a: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Esperamos un poco para ver si nos reconoce
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
      const adapter = new EuroGirlsEscortAdapter(crawler);
      const result = await adapter.extract(url, { html: content });
      console.log(
        `Extraído: ${result.data?.attributes?.nickname}, ${result.data?.attributes?.age} años`,
      );
    }
  } catch (err: any) {
    console.error(`Error: ${err.message}`);
  } finally {
    await context.close();
  }
}

main();
