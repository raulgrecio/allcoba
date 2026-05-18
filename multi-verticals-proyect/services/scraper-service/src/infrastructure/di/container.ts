import type { Vertical } from '@allcoba/shared-types';
import { logger } from '@allcoba/kernel';

import { CrawlerEngine } from '#application/ports/crawler.port.js';
import type { PersistenceStrategyPort } from '#application/ports/persistence-strategy.port.js';
import { DatingPersistenceStrategy } from '#application/strategies/dating-persistence.strategy.js';
import { OverwritePersistenceStrategy } from '#application/strategies/overwrite-persistence.strategy.js';
import { DiscoverUrlsUseCase } from '#application/use-cases/discover-urls.use-case.js';
import type { ScraperConfig } from '#application/use-cases/scrape-url.use-case.js';
import { ScrapeUrlUseCase } from '#application/use-cases/scrape-url.use-case.js';
import type { HasExternalRefs } from '#domain/canonical/external-ref.js';
import type { ScrapedListing } from '#domain/canonical/scraped-listing.js';
import type { ScrapedProperty } from '#domain/canonical/scraped-property.js';
import type { ScrapedVehicle } from '#domain/canonical/scraped-vehicle.js';
import { ConsolidationService } from '#domain/services/canonical/consolidation.service.js';
import { CapsolverAdapter } from '#infrastructure/adapters/captcha/capsolver.adapter.js';
import { NullTaxonomyResolver } from '#infrastructure/adapters/catalog/null-taxonomy-resolver.js';
import { SharpHasherAdapter } from '#infrastructure/adapters/images/sharp-hasher.adapter.js';
import { InMemoryScrapedEntityRepository } from '#infrastructure/adapters/persistence/in-memory-scraped-entity.repository.js';
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

  // ── Vertical-specific scraped-entity repositories ─────────────────────
  // Process-lifetime only. For cross-session persistence, swap with
  // Drizzle implementations of the same ScrapedEntityRepositoryPort.

  const propertyRepo = new InMemoryScrapedEntityRepository<ScrapedProperty>();
  const vehicleRepo = new InMemoryScrapedEntityRepository<ScrapedVehicle>();
  const listingRepo = new InMemoryScrapedEntityRepository<ScrapedListing>();

  // ── Persistence strategies, keyed by vertical ─────────────────────────
  // Adding a new vertical = registering one entry here. The use case
  // dispatches via `pipeline.defaultVertical` and never branches on
  // vertical itself.

  const strategies = new Map<Vertical, PersistenceStrategyPort<HasExternalRefs>>([
    [
      'dating',
      new DatingPersistenceStrategy(
        repository,
        consolidationService,
        imageHasher,
        storage,
        { maxImagesToProcess: config.maxImagesToProcess ?? 20 },
      ) as unknown as PersistenceStrategyPort<HasExternalRefs>,
    ],
    [
      'real-estate',
      new OverwritePersistenceStrategy<ScrapedProperty>(
        propertyRepo,
      ) as unknown as PersistenceStrategyPort<HasExternalRefs>,
    ],
    [
      'motor',
      new OverwritePersistenceStrategy<ScrapedVehicle>(
        vehicleRepo,
      ) as unknown as PersistenceStrategyPort<HasExternalRefs>,
    ],
    [
      'general',
      new OverwritePersistenceStrategy<ScrapedListing>(
        listingRepo,
      ) as unknown as PersistenceStrategyPort<HasExternalRefs>,
    ],
  ]);

  const scrapeUrlUseCase = new ScrapeUrlUseCase(
    sourceResolver,
    crawler,
    taxonomyResolver,
    strategies,
    repository,
    consolidationService,
    imageHasher,
    storage,
    config,
  );

  const discoverUrlsUseCase = new DiscoverUrlsUseCase(
    sourceResolver,
    repository,
    scrapeUrlUseCase,
    crawler,
    propertyRepo,
    vehicleRepo,
    listingRepo,
  );

  return { scrapeUrlUseCase, discoverUrlsUseCase, crawler };
}
