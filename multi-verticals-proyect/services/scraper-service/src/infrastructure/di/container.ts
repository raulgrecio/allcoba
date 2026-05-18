import { logger } from '@allcoba/kernel';

import type { ScraperConfig } from '#application/use-cases/scrape-url.use-case.js';
import { CrawlerEngine } from '#application/ports/crawler.port.js';
import { DiscoverUrlsUseCase } from '#application/use-cases/discover-urls.use-case.js';
import { ScrapeUrlUseCase } from '#application/use-cases/scrape-url.use-case.js';
import { ConsolidationService } from '#domain/services/canonical/consolidation.service.js';
import { CapsolverAdapter } from '#infrastructure/adapters/captcha/capsolver.adapter.js';
import { NullTaxonomyResolver } from '#infrastructure/adapters/catalog/null-taxonomy-resolver.js';
import { SharpHasherAdapter } from '#infrastructure/adapters/images/sharp-hasher.adapter.js';
import { JsonFileProviderRepository } from '#infrastructure/adapters/persistence/json-file-provider.repository.js';
import { ZyteProxyAdapter } from '#infrastructure/adapters/proxy/zyte-proxy.adapter.js';
import { SourceRegistry } from '#infrastructure/adapters/sources/source.registry.js';
import { LocalStorageAdapter } from '#infrastructure/adapters/storage/local-storage.adapter.js';
import { config as globalConfig } from '#infrastructure/config/env.js';
import { CrawlerDispatcher } from '#infrastructure/crawler/crawler-dispatcher.js';

async function ensureDatabaseReady(repository: any): Promise<void> {
  if (repository.constructor.name === 'PostgresProviderRepository') {
    try {
      const { checkConnection } = await import('#infrastructure/adapters/persistence/db-client.js');
      await checkConnection();
    } catch (err) {
      // Aquí es donde el orquestador decide qué hacer con el fallo
      process.exit(1);
    }
  } else {
    logger().info('Using JSON Repository, skipping DB health check');
  }
}

export async function createScraperServices(config: ScraperConfig) {
  // Por defecto usamos JSON. Solo usamos Postgres si está configurado explícitamente
  let repository;
 
  if (globalConfig.scraperStorage === 'postgres' && globalConfig.databaseUrl) {
    const { PostgresProviderRepository } = await import(
      '#infrastructure/adapters/persistence/postgres-provider.repository.js'
    );
    repository = new PostgresProviderRepository();
  } else {
    repository = new JsonFileProviderRepository();
  }
 
  await ensureDatabaseReady(repository);

  const consolidationService = new ConsolidationService();
  const imageHasher = new SharpHasherAdapter();
  const storage = new LocalStorageAdapter();

  const captchaSolver = new CapsolverAdapter(globalConfig.capsolverApiKey || '');
  const proxyProvider = new ZyteProxyAdapter(globalConfig.zyteApiKey || '');

  // Inyectamos el dispatcher con los proveedores abstraídos y el motor elegido
  const crawler = new CrawlerDispatcher(
    captchaSolver,
    proxyProvider,
    globalConfig.crawlerEngine as CrawlerEngine,
    globalConfig.crawlerMaxConcurrent,
  );
  const sourceResolver = new SourceRegistry(crawler);
  const taxonomyResolver = new NullTaxonomyResolver();

  const scrapeUrlUseCase = new ScrapeUrlUseCase(
    sourceResolver,
    repository,
    consolidationService,
    imageHasher,
    storage,
    crawler,
    taxonomyResolver,
    config,
  );

  const discoverUrlsUseCase = new DiscoverUrlsUseCase(
    sourceResolver,
    repository,
    scrapeUrlUseCase,
    crawler,
  );

  return { scrapeUrlUseCase, discoverUrlsUseCase, crawler };
}
