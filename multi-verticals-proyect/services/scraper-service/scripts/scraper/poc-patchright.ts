import { chromium } from 'patchright';

import { CapsolverAdapter } from '#infrastructure/adapters/captcha/capsolver.adapter.js';
import { ZyteProxyAdapter } from '#infrastructure/adapters/proxy/zyte-proxy.adapter.js';
import { TopEscortBabesAdapter } from '#infrastructure/adapters/sources/dating/topescortbabes.adapter.js';
import { config } from '#infrastructure/config/env.js';
import { CrawlerDispatcher } from '#infrastructure/crawler/crawler-dispatcher.js';

async function main() {
  const url = 'https://topescortbabes.com/barcelona/escorts/Lera_4091523';

  console.log('=== PRUEBA DE CONCEPTO: Patchright (Stealth nativo) ===');

  const captchaSolver = new CapsolverAdapter(config.capsolverApiKey || '');
  const proxyProvider = new ZyteProxyAdapter(config.zyteApiKey || '');
  const crawler = new CrawlerDispatcher(captchaSolver, proxyProvider);
  const adapter = new TopEscortBabesAdapter(crawler);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Esperar un poco para ver si salta el challenge
    await new Promise((r) => setTimeout(r, 5000));

    const content = await page.content();
    const isChallenged =
      content.includes('challenges.cloudflare.com') || content.includes('Verify you are human');

    if (isChallenged) {
      console.log('❌ DETECTADO: Cloudflare Turnstile bloqueó el acceso.');
    } else {
      console.log('✅ ÉXITO: Acceso concedido sin challenge aparente.');
      const adapter = new TopEscortBabesAdapter(crawler);
      const result = await adapter.extract(url, { html: content });
      console.log(
        `Datos: ${result.data?.attributes?.nickname}, ${result.data?.attributes?.age} años`,
      );
    }
  } catch (err: any) {
    console.error(`❌ Error durante la navegación: ${err.message}`);
  } finally {
    await browser.close();
  }
}

main();
