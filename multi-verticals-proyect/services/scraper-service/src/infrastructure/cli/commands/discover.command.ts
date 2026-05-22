import type { Command } from 'commander';

import { logger } from '@allcoba/kernel';

import type { ProxyStrategy, SolverStrategy } from '#application/ports/crawler.port.js';
import { createScraperServices } from '#infrastructure/di/container.js';

import type { CrawlerLifecycle } from '../crawler-lifecycle.js';

/** Registra el subcomando `discover` — descubrimiento masivo desde un listado. */
export function registerDiscoverCommand(program: Command, lifecycle: CrawlerLifecycle): void {
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
        const config = {
          maxImagesToProcess: options.maxImages ? parseInt(options.maxImages, 10) : 20,
          saveRawHtml: !!options.debug || !!options.saveHtml,
          saveDebugSnapshots: !!options.debug,
          captureNetworkLogs: !!options.network,
          manualPause: !!options.pause,
          headless: !!options.headless,
          skipInteractions: true,
          skipRobots: !!options.skipRobots,
          blockImages: !!options.blockImages,
          proxyStrategy: options.proxyStrategy as ProxyStrategy,
          solverStrategy: options.solverStrategy as SolverStrategy,
        };

        const limitNumber = options.limit ? parseInt(options.limit, 10) : undefined;
        const skipNumber = options.skip ? parseInt(options.skip, 10) : undefined;

        const { discoverUrlsUseCase, crawler } = await createScraperServices(config);
        lifecycle.track(crawler);

        logger().info(
          { url: options.url, limit: limitNumber, skip: skipNumber, config },
          'Iniciando descubrimiento masivo',
        );
        await discoverUrlsUseCase.execute(options.url, limitNumber, skipNumber, config.headless);
        logger().info('Descubrimiento completado con éxito');
        await lifecycle.shutdown();
      } catch (err) {
        logger().error(
          { err: err instanceof Error ? err.message : String(err) },
          'Error fatal en discover',
        );
        process.exitCode = 1;
      }
    });
}
