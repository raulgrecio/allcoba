import fs from 'fs/promises';
import path from 'path';

import { Command } from 'commander';

import { logger } from '@allcoba/kernel';

import type { ProxyStrategy, SolverStrategy } from '#application/ports/crawler.port.js';
import { ExtractionStatsUseCase } from '#application/use-cases/extraction-stats.use-case.js';
import type { BaselineData } from '#application/use-cases/extraction-stats.use-case.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';

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

  // Subcomando Stats
  program
    .command('stats')
    .description('Fill-rate por portal — detecta regresiones en la extracción')
    .option('--save-baseline', 'Guardar stats actuales como baseline')
    .option('--threshold <pp>', 'Caída mínima (puntos porcentuales) para alertar (default: 20)', '20')
    .option('--source <name>', 'Filtrar por portal')
    .option('--data-dir <path>', 'Directorio de datos (default: __data/storage)', '__data/storage')
    .action(async (options) => {
      const dataDir = path.resolve(process.cwd(), options.dataDir as string);
      const providersFile = path.join(dataDir, 'providers.json');
      const baselineFile = path.join(dataDir, '..', 'extraction-baseline.json');
      const threshold = parseInt(options.threshold as string, 10);

      let providers: ScrapedProvider[] = [];
      try {
        const raw = await fs.readFile(providersFile, 'utf-8');
        const parsed: unknown = JSON.parse(raw);
        providers = (Array.isArray(parsed) ? parsed : Object.values(parsed)) as ScrapedProvider[];
      } catch {
        logger().error({ file: providersFile }, 'No se pudo leer providers.json');
        process.exitCode = 1;
        return;
      }

      let baseline: BaselineData | null = null;
      try {
        const raw = await fs.readFile(baselineFile, 'utf-8');
        baseline = (JSON.parse(raw) as { stats: BaselineData }).stats ?? null;
      } catch { /* sin baseline */ }

      if (options.source) {
        providers = providers.filter((p) => {
          const src = p.externalRefs?.[0]?.source ?? (p.metadata as Record<string, unknown>)?.['source'];
          return src === options.source;
        });
      }

      const uc = new ExtractionStatsUseCase();
      const { sources, regressions } = uc.compute(providers, baseline, threshold);

      const GREEN  = '\x1b[0;32m';
      const RED    = '\x1b[0;31m';
      const YELLOW = '\x1b[1;33m';
      const CYAN   = '\x1b[0;36m';
      const BOLD   = '\x1b[1m';
      const NC     = '\x1b[0m';

      for (const { source, total, fields } of sources) {
        console.log(`\n${BOLD}${CYAN}${source}${NC}  (${total} perfiles)`);
        const baseFields = baseline?.[source] ?? {};
        for (const [fname, stat] of Object.entries(fields)) {
          const { count, rate } = stat;
          const base = baseFields[fname];
          let marker = '';
          if (base !== undefined) {
            const diff = rate - base;
            if (diff <= -threshold) {
              marker = `  ${RED}⚠ baseline ${base}%  REGRESIÓN (${diff > 0 ? '+' : ''}${diff.toFixed(1)}pp)${NC}`;
            } else if (diff < 0) {
              marker = `  ${YELLOW}↓ baseline ${base}% (${diff.toFixed(1)}pp)${NC}`;
            } else if (diff > 0) {
              marker = `  ${GREEN}↑ baseline ${base}%${NC}`;
            }
          }
          const color = rate === 0 ? RED : rate < 50 ? YELLOW : GREEN;
          console.log(`  ${fname.padEnd(12)} ${String(count).padStart(3)}/${String(total).padEnd(3)}  ${color}${rate.toFixed(1).padStart(5)}%${NC}${marker}`);
        }
      }

      if (!baseline) {
        console.log(`\n${YELLOW}Sin baseline — usa --save-baseline para guardar uno.${NC}`);
      } else if (regressions.length > 0) {
        console.log(`\n${RED}⚠ ${regressions.length} regresión(es) detectada(s) (umbral: ${threshold}pp)${NC}`);
      } else {
        console.log(`\n${GREEN}✅ Sin regresiones respecto al baseline (umbral: ${threshold}pp)${NC}`);
      }

      if (options.saveBaseline) {
        const data = { savedAt: new Date().toISOString(), stats: uc.toBaselineData(sources) };
        await fs.writeFile(baselineFile, JSON.stringify(data, null, 2));
        console.log(`${GREEN}Baseline guardado en ${baselineFile}${NC}`);
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
