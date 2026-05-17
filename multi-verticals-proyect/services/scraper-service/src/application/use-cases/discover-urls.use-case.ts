import { logger } from '@allcoba/kernel';

import type { ProviderRepositoryPort } from '#application/ports/repository.port.js';
import type { SourceResolverPort } from '#application/ports/source-resolver.port.js';

import type { ScrapeUrlUseCase } from './scrape-url.use-case.js';

export class DiscoverUrlsUseCase {
  private readonly logger = logger().child({ component: 'DiscoverUrlsUseCase' });

  constructor(
    private readonly sourceResolver: SourceResolverPort,
    private readonly repository: ProviderRepositoryPort,
    private readonly scrapeUrlUseCase: ScrapeUrlUseCase,
  ) {}

  async execute(listUrl: string, limit?: number, skip?: number, headless?: boolean): Promise<void> {
    const source = await this.sourceResolver.resolve(listUrl);
    // Ya no usamos el singleton, usamos la instancia inyectada

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
        const listResult = await source.fetchHtml(currentUrl, {
          waitUntil: 'domcontentloaded',
          skipInteractions: true,
          headless: headless,
        });

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
              const existing = await this.repository.find({
                externalRef: { source: source.identifier, sourceId: slug },
                vertical: source.defaultVertical,
              });
              if (existing.length > 0) {
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

            // Respectful delay between 3-8 seconds
            const delay = Math.floor(Math.random() * 3000) + 5000;
            await new Promise((res) => setTimeout(res, delay));
          } catch (err: any) {
            this.logger.error({ url, err: err.message }, 'Error processing profile');
          }
        }

        currentUrl = source.extractNextPageUrl(listResult.html, currentUrl);
      } catch (err: any) {
        this.logger.error({ err: err.message, url: currentUrl }, 'Error processing list page');
        break;
      }
    }

    this.logger.info({ processedCount }, 'URL discovery finished successfully');
  }
}
