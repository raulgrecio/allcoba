import { logger } from '@allcoba/kernel';

import { createScraperServices } from '#infrastructure/di/container.js';

async function main() {
  const log = logger().child({ script: 'test-full-scrape' });

  // URL de NuevoLoquo para la prueba
  const url =
    'https://www.nuevoloquo.ch/masaje-erotico/madrid/masajista-espanola-por-aqui-llamame-no-lo-dudes/629971/';

  log.info({ url }, 'Starting full scrape test with NuevoLoquo');

  // Inicializamos servicios con configuración por defecto (headless: true)
  const services = await createScraperServices({
    headless: true,
    saveRawHtml: false,
    skipRobots: true,
  });

  const useCase = services.scrapeUrlUseCase;

  try {
    await useCase.execute(url);
    log.info('Scrape and persistence completed successfully');
    process.exit(0);
  } catch (error) {
    log.error({ error }, 'Failed to complete full scrape');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
