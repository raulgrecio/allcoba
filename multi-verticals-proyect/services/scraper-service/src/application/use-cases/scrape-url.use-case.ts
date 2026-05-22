import type { Vertical } from '@allcoba/shared-types';
import { logger } from '@allcoba/kernel';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import { ProxyStrategy, SolverStrategy } from '#application/ports/crawler.port.js';
import type { PersistenceStrategyPort } from '#application/ports/persistence-strategy.port.js';
import {
  isScrapingPipelinePort,
  type AnyPipelinePort,
} from '#application/ports/scraping-pipeline.port.js';
import type { SourceResolverPort } from '#application/ports/source-resolver.port.js';
import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';
import type { HasExternalRefs } from '#domain/canonical/external-ref.js';

export interface ScraperConfig {
  headless?: boolean;
  maxImagesToProcess?: number;
  saveDebugSnapshots?: boolean;
  saveRawHtml?: boolean;
  skipInteractions?: boolean;
  captureNetworkLogs?: boolean;
  manualPause?: boolean;
  skipRobots?: boolean;
  blockImages?: boolean;
  proxyStrategy?: ProxyStrategy;
  solverStrategy?: SolverStrategy;
}

const DEFAULT_CONFIG: ScraperConfig = {
  maxImagesToProcess: 20,
  saveRawHtml: false,
  saveDebugSnapshots: false,
  skipInteractions: false,
  captureNetworkLogs: false,
  skipRobots: false,
  proxyStrategy: ProxyStrategy.NONE,
  solverStrategy: SolverStrategy.NONE,
};

/**
 * Type-erased view of a vertical persistence strategy used by the
 * dispatcher map. The use case looks up by `pipeline.defaultVertical`
 * and the strategy registered for that vertical accepts the concrete
 * scraped type produced by the matching pipeline; the cast is
 * type-erased at the map boundary but logically safe by construction
 * (see `container.ts`).
 */
type AnyPersistenceStrategy = PersistenceStrategyPort<HasExternalRefs>;

/**
 * ScrapeUrlUseCase — scrapea una URL individual.
 *
 * Pipeline v2 unificado para todas las verticales: el SourceRegistry resuelve
 * el pipeline (o el catch-all DiscoveryPipeline), se crawlea la URL, el
 * pipeline transforma HTML → entidad canónica y la estrategia registrada para
 * su vertical la persiste. El caso de uso no ramifica por vertical.
 */
export class ScrapeUrlUseCase {
  private readonly log = logger().child({ component: 'ScrapeUrlUseCase' });

  constructor(
    private readonly sourceResolver: SourceResolverPort,
    private readonly crawler: CrawlerPort,
    private readonly taxonomyResolver: TaxonomyResolverPort,
    private readonly strategies: Map<Vertical, AnyPersistenceStrategy>,
    private readonly config: ScraperConfig = DEFAULT_CONFIG,
  ) {}

  async execute(url: string): Promise<void> {
    const source = await this.sourceResolver.resolve(url);
    if (!isScrapingPipelinePort(source)) {
      throw new Error(`No se resolvió un pipeline v2 para: ${url}`);
    }
    await this.scrape(source, url);
  }

  private async scrape(pipeline: AnyPipelinePort, url: string): Promise<void> {
    if (!this.config.skipRobots && !(await pipeline.isAllowed(url))) {
      throw new Error(`robots.txt blocks: ${url}`);
    }

    const crawlerOptions = pipeline.getCrawlerOptions(url, {
      headless: this.config.headless,
      skipInteractions: this.config.skipInteractions,
      captureNetwork: this.config.captureNetworkLogs,
      manualPause: this.config.manualPause,
      blockImages: this.config.blockImages,
      proxyStrategy: this.config.proxyStrategy,
      solverStrategy: this.config.solverStrategy,
    });

    const result = await this.crawler.fetch(url, crawlerOptions);
    const payload = pipeline.extract(result.html, url, result.networkResponses);
    const scraped = await pipeline.map(payload, this.taxonomyResolver);

    const strategy = this.strategies.get(pipeline.defaultVertical);
    if (!strategy) {
      this.log.warn(
        { source: pipeline.identifier, vertical: pipeline.defaultVertical },
        'No persistence strategy registered for vertical — skip persist',
      );
      return;
    }

    const outcome = await strategy.persist(scraped, {
      source: pipeline.identifier,
      url,
    });

    this.log.info(
      {
        source: pipeline.identifier,
        vertical: pipeline.defaultVertical,
        action: outcome.action,
        entityId: outcome.entityId,
      },
      'Scrape complete',
    );
  }
}
