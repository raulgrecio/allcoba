import type { Command } from 'commander';

import { logger } from '@allcoba/kernel';

import type { ProxyStrategy, SolverStrategy } from '#application/ports/crawler.port.js';
import { createScraperServices } from '#infrastructure/di/container.js';

import type { CrawlerLifecycle } from '../crawler-lifecycle.js';

/** Registra el subcomando `scrape` — extracción de un perfil individual. */
export function registerScrapeCommand(program: Command, lifecycle: CrawlerLifecycle): void {
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
        const config = {
          maxImagesToProcess: options.maxImages ? parseInt(options.maxImages, 10) : 20,
          saveRawHtml: !!options.debug || !!options.saveHtml,
          saveDebugSnapshots: !!options.debug,
          captureNetworkLogs: !!options.network,
          manualPause: !!options.pause,
          headless: !!options.headless,
          skipRobots: !!options.skipRobots,
          blockImages: !!options.blockImages,
          proxyStrategy: options.proxyStrategy as ProxyStrategy,
          solverStrategy: options.solverStrategy as SolverStrategy,
        };

        const { scrapeUrlUseCase, crawler } = await createScraperServices(config);
        lifecycle.track(crawler);

        logger().info({ url: options.url, config }, 'Procesando perfil individual');
        await scrapeUrlUseCase.execute(options.url);
        logger().info('Extracción completada con éxito');
        await lifecycle.shutdown();
      } catch (err) {
        logger().error(
          { err: err instanceof Error ? err.message : String(err) },
          'Error fatal en scrape',
        );
        process.exitCode = 1;
      }
    });
}
