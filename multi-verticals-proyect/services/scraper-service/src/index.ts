import { Command } from 'commander';

import { logger } from '@allcoba/kernel';

import type { ProxyStrategy, SolverStrategy } from '#application/ports/crawler.port.js';

import { createScraperServices } from './infrastructure/di/container.js';

let activeCrawler: { close(): Promise<void> } | undefined;

async function shutdown() {
  if (activeCrawler) {
    logger().info('Cerrando navegadores...');
    await activeCrawler.close().catch(() => {});
    activeCrawler = undefined;
  }
}

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());

async function main() {
  logger().info('Iniciando scraper-service...');

  const program = new Command();

  program.name('scraper').description('Herramientas de scraping multi-vertical').version('1.0.0');

  // Subcomando Scrape
  program
    .command('scrape')
    .description('Extraer un perfil individual')
    .requiredOption('-u, --url <url>', 'URL del perfil a extraer')
    .option('--max-images <number>', 'Límite de imágenes (default: 20)')
    .option('--debug', 'Guardar HTML crudo y snapshots de depuración')
    .option('--network', 'Capturar respuestas de red (JSON)')
    .option('--pause', 'Mantener ventana abierta al finalizar (solo si no es headless)')
    .option('--headless', 'Ejecutar en modo silencioso (sin ventana)', true)
    .option('--no-headless', 'Desactivar modo silencioso (mostrar ventana)')
    .option('--skip-robots', 'Ignorar reglas de robots.txt', false)
    .option('--block-images', 'Bloquea la descarga de imágenes para ahorrar ancho de banda')
    .option('--save-html', 'Guardar HTML crudo de cada perfil (sin snapshots de debug)', false)
    .option('--proxy-strategy <strategy>', 'Estrategia de proxy (none, rotating, zyte)', 'zyte')
    .option('--solver-strategy <strategy>', 'Estrategia de captcha (none, auto)', 'auto')
    .action(async (options) => {
      try {
        const {
          url,
          maxImages,
          debug,
          network,
          pause,
          headless,
          skipRobots,
          saveHtml,
          blockImages,
          proxyStrategy,
          solverStrategy,
        } = options;

        const config = {
          maxImagesToProcess: maxImages ? parseInt(maxImages, 10) : 20,
          saveRawHtml: !!debug || !!saveHtml,
          saveDebugSnapshots: !!debug,
          captureNetworkLogs: !!network,
          manualPause: !!pause,
          headless: !!headless,
          skipRobots: !!skipRobots,
          blockImages: !!blockImages,
          proxyStrategy: proxyStrategy as ProxyStrategy,
          solverStrategy: solverStrategy as SolverStrategy,
        };

        const { scrapeUrlUseCase, crawler } = await createScraperServices(config);
        activeCrawler = crawler;

        logger().info({ url, config }, 'Procesando perfil individual');
        await scrapeUrlUseCase.execute(url);
        logger().info('Extracción completada con éxito');
        await shutdown();
      } catch (err: any) {
        logger().error({ err: err.message }, 'Error fatal en scrape');
        process.exitCode = 1;
      }
    });

  // Subcomando Discover
  program
    .command('discover')
    .description('Descubrimiento masivo a partir de un listado')
    .requiredOption('-u, --url <url>', 'URL del listado')
    .option('-l, --limit <number>', 'Límite de perfiles a procesar')
    .option('-s, --skip <number>', 'Saltar N primeros perfiles')
    .option('--max-images <number>', 'Límite de imágenes (default: 20)')
    .option('--debug', 'Guardar HTML crudo y snapshots de depuración')
    .option('--network', 'Capturar respuestas de red (JSON)')
    .option('--pause', 'Mantener ventana abierta al finalizar cada perfil')
    .option('--headless', 'Ejecutar en modo silencioso (sin ventana)', true)
    .option('--no-headless', 'Desactivar modo silencioso (mostrar ventana)')
    .option('--skip-robots', 'Ignorar reglas de robots.txt', false)
    .option('--block-images', 'Bloquea la descarga de imágenes a nivel de red')
    .option('--save-html', 'Guardar HTML crudo de cada perfil (sin snapshots de debug)', false)
    .option('--proxy-strategy <strategy>', 'Estrategia de proxy (none, rotating, zyte)', 'zyte')
    .option('--solver-strategy <strategy>', 'Estrategia de captcha (none, auto)', 'auto')
    .action(async (options) => {
      try {
        const {
          url,
          limit,
          skip,
          maxImages,
          debug,
          network,
          pause,
          headless,
          skipRobots,
          saveHtml,
          blockImages,
          proxyStrategy,
          solverStrategy,
        } = options;

        const config = {
          maxImagesToProcess: maxImages ? parseInt(maxImages, 10) : 20,
          saveRawHtml: !!debug || !!saveHtml,
          saveDebugSnapshots: !!debug,
          captureNetworkLogs: !!network,
          manualPause: !!pause,
          headless: !!headless,
          skipInteractions: true,
          skipRobots: !!skipRobots,
          blockImages: !!blockImages,
          proxyStrategy: proxyStrategy as any,
          solverStrategy: solverStrategy as any,
        };

        const limitNumber = limit ? parseInt(limit, 10) : undefined;
        const skipNumber = skip ? parseInt(skip, 10) : undefined;

        const { discoverUrlsUseCase, crawler } = await createScraperServices(config);
        activeCrawler = crawler;

        logger().info(
          { url, limit: limitNumber, skip: skipNumber, config },
          'Iniciando descubrimiento masivo',
        );
        await discoverUrlsUseCase.execute(url, limitNumber, skipNumber, config.headless);
        logger().info('Descubrimiento completado con éxito');
        await shutdown();
      } catch (err: any) {
        logger().error({ err: err.message }, 'Error fatal en discover');
        process.exitCode = 1;
      }
    });

  await program.parseAsync(process.argv);
}

main().catch((error) => {
  logger().error(
    {
      msg: error.message,
      stack: error.stack,
      name: error.name,
    },
    'Error fatal en el servicio',
  );
  process.exit(1);
});
