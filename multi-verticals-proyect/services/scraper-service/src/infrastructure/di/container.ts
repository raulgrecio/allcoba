import type { Vertical } from '@allcoba/shared-types';
import { logger } from '@allcoba/kernel';

import type { PersistenceStrategyPort } from '#application/ports/persistence-strategy.port.js';
import type { QueuePort } from '#application/ports/queue.port.js';
import type { ScrapedEntityRepositoryPort } from '#application/ports/scraped-entity-repository.port.js';
import type { ProcessImagesJobPayload } from '#application/use-cases/process-images.use-case.js';
import type { ScraperConfig } from '#application/use-cases/scrape-url.use-case.js';
import type { HasExternalRefs } from '#domain/canonical/external-ref.js';
import type { ScrapedListing } from '#domain/canonical/scraped-listing.js';
import type { ScrapedProperty } from '#domain/canonical/scraped-property.js';
import type { ScrapedVehicle } from '#domain/canonical/scraped-vehicle.js';
import { CrawlerEngine } from '#application/ports/crawler.port.js';
import { DatingPersistenceStrategy } from '#application/strategies/dating-persistence.strategy.js';
import { OverwritePersistenceStrategy } from '#application/strategies/overwrite-persistence.strategy.js';
import { DiscoverUrlsUseCase } from '#application/use-cases/discover-urls.use-case.js';
import { ExtractionStatsUseCase } from '#application/use-cases/extraction-stats.use-case.js';
import { ProcessImagesUseCase } from '#application/use-cases/process-images.use-case.js';
import { ScrapeUrlUseCase } from '#application/use-cases/scrape-url.use-case.js';
import { ConsolidationService } from '#domain/services/canonical/consolidation.service.js';
import { CapsolverAdapter } from '#infrastructure/adapters/captcha/capsolver.adapter.js';
import { DrizzleTaxonomyResolver } from '#infrastructure/adapters/catalog/drizzle-taxonomy-resolver.js';
import { NullTaxonomyResolver } from '#infrastructure/adapters/catalog/null-taxonomy-resolver.js';
import { HttpMediaAdapter } from '#infrastructure/adapters/images/http-media.adapter.js';
import { JsonFileProviderRepository } from '#infrastructure/adapters/persistence/json/json-file-provider.repository.js';
import { JsonFileScrapedImageRepository } from '#infrastructure/adapters/persistence/json/json-file-scraped-image.repository.js';
import { InMemoryScrapedEntityRepository } from '#infrastructure/adapters/persistence/memory/in-memory-scraped-entity.repository.js';
import { DrizzleScrapedEntityRepository } from '#infrastructure/adapters/persistence/postgres/drizzle-scraped-entity.repository.js';
import * as scraperSchema from '#infrastructure/adapters/persistence/postgres/schema/scraper.schema.js';
import { ZyteProxyAdapter } from '#infrastructure/adapters/proxy/zyte-proxy.adapter.js';
import { SourceRegistry } from '#infrastructure/adapters/sources/source.registry.js';
import { LocalStorageAdapter } from '#infrastructure/adapters/storage/local-storage.adapter.js';
import { config as globalConfig } from '#infrastructure/config/env.js';
import { CrawlerDispatcher } from '#infrastructure/crawler/crawler-dispatcher.js';

async function ensureDatabaseReady(repository: object): Promise<void> {
  if (repository.constructor.name === 'PostgresProviderRepository') {
    try {
      const { checkConnection } =
        await import('#infrastructure/adapters/persistence/postgres/db-client.js');
      await checkConnection();
    } catch {
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
    const { PostgresProviderRepository } =
      await import('#infrastructure/adapters/persistence/postgres/postgres-provider.repository.js');
    repository = new PostgresProviderRepository();
  } else {
    repository = new JsonFileProviderRepository();
  }

  await ensureDatabaseReady(repository);

  const consolidationService = new ConsolidationService();
  const storage = new LocalStorageAdapter();

  let imageRepo;
  if (globalConfig.scraperStorage === 'postgres' && globalConfig.databaseUrl) {
    const { DrizzleScrapedImageRepository } =
      await import('#infrastructure/adapters/persistence/postgres/drizzle-scraped-image.repository.js');
    const { db } = await import('#infrastructure/adapters/persistence/postgres/db-client.js');
    imageRepo = new DrizzleScrapedImageRepository(db as never);
  } else {
    imageRepo = new JsonFileScrapedImageRepository();
  }

  let queue: QueuePort;
  if (globalConfig.scraperStorage === 'postgres' && globalConfig.databaseUrl) {
    const { PgBossQueueAdapter } =
      await import('#infrastructure/adapters/queue/pg-boss.adapter.js');
    const pgQueue = new PgBossQueueAdapter(globalConfig.databaseUrl);
    await pgQueue.start();
    queue = pgQueue;
  } else {
    const { InMemoryQueueAdapter } =
      await import('#infrastructure/adapters/queue/in-memory-queue.adapter.js');
    queue = new InMemoryQueueAdapter();
  }

  const imagePipeline = new HttpMediaAdapter();

  const processImagesUseCase = new ProcessImagesUseCase(
    repository,
    storage,
    imageRepo,
    imagePipeline,
    {
      maxImagesToProcess: config.maxImagesToProcess ?? 20,
    },
  );

  await queue.subscribe<ProcessImagesJobPayload>('process-provider-images', async (payload) => {
    await processImagesUseCase.execute(payload);
  });

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

  const taxonomyResolver =
    globalConfig.scraperStorage === 'postgres' && globalConfig.databaseUrl
      ? new DrizzleTaxonomyResolver(
          (await import('#infrastructure/adapters/persistence/postgres/db-client.js')).db as never,
        )
      : new NullTaxonomyResolver();

  // ── Vertical-specific scraped-entity repositories ─────────────────────
  // Drizzle-backed when scraperStorage=postgres; in-memory otherwise.
  // Each Drizzle instance binds to its vertical's table (one table per vertical).

  let propertyRepo: ScrapedEntityRepositoryPort<ScrapedProperty>;
  let vehicleRepo: ScrapedEntityRepositoryPort<ScrapedVehicle>;
  let listingRepo: ScrapedEntityRepositoryPort<ScrapedListing>;

  if (globalConfig.scraperStorage === 'postgres' && globalConfig.databaseUrl) {
    const { db } = await import('#infrastructure/adapters/persistence/postgres/db-client.js');
    propertyRepo = new DrizzleScrapedEntityRepository<ScrapedProperty>(
      db,
      scraperSchema.realEstateProviders,
    );
    vehicleRepo = new DrizzleScrapedEntityRepository<ScrapedVehicle>(
      db,
      scraperSchema.motorProviders,
    );
    listingRepo = new DrizzleScrapedEntityRepository<ScrapedListing>(
      db,
      scraperSchema.generalProviders,
    );
  } else {
    propertyRepo = new InMemoryScrapedEntityRepository<ScrapedProperty>();
    vehicleRepo = new InMemoryScrapedEntityRepository<ScrapedVehicle>();
    listingRepo = new InMemoryScrapedEntityRepository<ScrapedListing>();
  }

  // ── Persistence strategies, keyed by vertical ─────────────────────────
  // Adding a new vertical = registering one entry here. The use case
  // dispatches via `pipeline.defaultVertical` and never branches on
  // vertical itself.

  const strategies = new Map<Vertical, PersistenceStrategyPort<HasExternalRefs>>([
    [
      'dating',
      new DatingPersistenceStrategy(repository, consolidationService, queue, {
        maxImagesToProcess: config.maxImagesToProcess ?? 20,
      }) as unknown as PersistenceStrategyPort<HasExternalRefs>,
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

  // ── Entity repositories, keyed by vertical ────────────────────────────
  // Used by DiscoverUrlsUseCase to skip URLs already persisted. Same
  // dispatch pattern as `strategies`: registration over branching.

  const entityRepos = new Map<Vertical, ScrapedEntityRepositoryPort<HasExternalRefs>>([
    ['dating', repository as unknown as ScrapedEntityRepositoryPort<HasExternalRefs>],
    ['real-estate', propertyRepo as unknown as ScrapedEntityRepositoryPort<HasExternalRefs>],
    ['motor', vehicleRepo as unknown as ScrapedEntityRepositoryPort<HasExternalRefs>],
    ['general', listingRepo as unknown as ScrapedEntityRepositoryPort<HasExternalRefs>],
  ]);

  const scrapeUrlUseCase = new ScrapeUrlUseCase(
    sourceResolver,
    crawler,
    taxonomyResolver,
    strategies,
    storage,
    config,
  );

  const discoverUrlsUseCase = new DiscoverUrlsUseCase(
    sourceResolver,
    scrapeUrlUseCase,
    crawler,
    entityRepos,
    storage,
    config,
  );

  const statsUseCase = new ExtractionStatsUseCase(repository);

  return { scrapeUrlUseCase, discoverUrlsUseCase, statsUseCase, crawler };
}
