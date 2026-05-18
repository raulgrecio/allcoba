import type { Vertical } from '@allcoba/shared-types';
import { logger } from '@allcoba/kernel';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import { isDatingPipelinePort } from '#application/ports/dating-pipeline.port.js';
import type { ProviderRepositoryPort } from '#application/ports/repository.port.js';
import type {
  ListingRepositoryPort,
  PropertyRepositoryPort,
  VehicleRepositoryPort,
} from '#application/ports/scraped-entity-repository.port.js';
import type { SourceResolverPort } from '#application/ports/source-resolver.port.js';
import type { ExternalRef } from '#domain/canonical/external-ref.js';

import type { ScrapeUrlUseCase } from './scrape-url.use-case.js';

export class DiscoverUrlsUseCase {
  private readonly logger = logger().child({ component: 'DiscoverUrlsUseCase' });

  constructor(
    private readonly sourceResolver: SourceResolverPort,
    private readonly repository: ProviderRepositoryPort,
    private readonly scrapeUrlUseCase: ScrapeUrlUseCase,
    private readonly crawler: CrawlerPort,
    private readonly propertyRepo?: PropertyRepositoryPort,
    private readonly vehicleRepo?: VehicleRepositoryPort,
    private readonly listingRepo?: ListingRepositoryPort,
  ) {}

  async execute(listUrl: string, limit?: number, skip?: number, headless?: boolean): Promise<void> {
    const source = await this.sourceResolver.resolve(listUrl);

    let processedCount = 0;
    let skippedCount = 0;
    let currentUrl: string | undefined = listUrl;
    const processedUrls = new Set<string>();

    this.logger.info(
      { listUrl, limit, skip, source: source.identifier },
      'Starting generic URL discovery',
    );

    while (currentUrl && (!limit || processedCount < limit)) {
      this.logger.info({ url: currentUrl }, 'Extracting list page');

      try {
        const crawlerOptions = isDatingPipelinePort(source)
          ? source.getCrawlerOptions(currentUrl, {
              waitUntil: 'domcontentloaded',
              skipInteractions: true,
              headless,
            })
          : {
              ...source.getCrawlerOptions(currentUrl, { skipInteractions: true }),
              waitUntil: 'domcontentloaded' as const,
              headless,
            };

        const listResult = await this.crawler.fetch(currentUrl, crawlerOptions);

        const profileLinks = source.extractProfileLinks(listResult.html, currentUrl);
        const uniqueLinks = [...new Set(profileLinks)].filter((link) => !processedUrls.has(link));

        if (uniqueLinks.length === 0) {
          this.logger.warn('No more profile links found on this page. Stopping.');
          break;
        }

        this.logger.info({ count: uniqueLinks.length }, 'Links found. Processing sequentially...');

        for (const url of uniqueLinks) {
          if (limit && processedCount >= limit) break;

          if (skip && skippedCount < skip) {
            skippedCount++;
            this.logger.debug(
              { url, progress: `skipped ${skippedCount}/${skip}` },
              'Saltando perfil procesado previamente',
            );
            processedUrls.add(url);
            continue;
          }

          try {
            const slug = new URL(url).pathname.split('/').filter(Boolean).pop() ?? '';
            if (slug) {
              const alreadyPersisted = await this.isAlreadyPersisted(
                source.identifier,
                slug,
                source.defaultVertical,
              );
              if (alreadyPersisted) {
                this.logger.info({ url }, 'Already in DB, skipping');
                processedUrls.add(url);
                continue;
              }
            }

            this.logger.info(
              { url, progress: `${processedCount + 1}/${limit}` },
              'Scraping profile',
            );
            await this.scrapeUrlUseCase.execute(url);
            processedUrls.add(url);
            processedCount++;

            const delay = Math.floor(Math.random() * 3000) + 5000;
            await new Promise((res) => setTimeout(res, delay));
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.error({ url, err: message }, 'Error processing profile');
          }
        }

        currentUrl = source.extractNextPageUrl(listResult.html, currentUrl);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error({ err: message, url: currentUrl }, 'Error processing list page');
        break;
      }
    }

    this.logger.info({ processedCount }, 'URL discovery finished successfully');
  }

  private async isAlreadyPersisted(
    sourceId: string,
    slug: string,
    vertical: Vertical,
  ): Promise<boolean> {
    const ref: ExternalRef = { source: sourceId, sourceId: slug };
    if (vertical === 'real-estate' && this.propertyRepo) {
      return (await this.propertyRepo.findByExternalRef(ref)) !== null;
    }
    if (vertical === 'motor' && this.vehicleRepo) {
      return (await this.vehicleRepo.findByExternalRef(ref)) !== null;
    }
    if (vertical === 'general' && this.listingRepo) {
      return (await this.listingRepo.findByExternalRef(ref)) !== null;
    }
    const existing = await this.repository.find({ externalRef: ref, vertical });
    return existing.length > 0;
  }
}
