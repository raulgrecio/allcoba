import * as cheerio from 'cheerio';

import type { CrawlerOptions, SecurityStrategy } from '#application/ports/crawler.port.js';
import type {
  MotorPipelinePort,
  PipelineMapOptions,
} from '#application/ports/scraping-pipeline.port.js';
import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';
import type { ScrapedVehicle } from '#domain/canonical/scraped-vehicle.js';
import { CrawlerEngine, ProxyStrategy, SolverStrategy } from '#application/ports/crawler.port.js';
import { RobotsChecker } from '#infrastructure/crawler/robots-checker.js';

export abstract class MotorPipelineBase<Payload> implements MotorPipelinePort {
  abstract readonly identifier: string;
  readonly defaultVertical = 'motor' as const;

  protected readonly robotsChecker = new RobotsChecker();

  abstract canHandle(url: string): boolean;
  abstract isProfileUrl(url: string): boolean;
  abstract extract(html: string, sourceUrl: string): Payload;
  abstract map(
    payload: Payload,
    resolver: TaxonomyResolverPort,
    options?: PipelineMapOptions,
  ): Promise<ScrapedVehicle>;

  isAllowed(url: string): Promise<boolean> {
    return this.robotsChecker.isAllowed(url);
  }

  getCrawlerOptions(_url: string, options?: Partial<CrawlerOptions>): CrawlerOptions {
    return {
      ...this.getSecurityStrategy(),
      cookieSelectors: this.getCookieSelectors(),
      ...options,
    };
  }

  extractProfileLinks(html: string, baseUrl: string): string[] {
    const $ = cheerio.load(html);
    const links = new Set<string>();
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href) return;
      try {
        const abs = new URL(href, baseUrl).toString();
        if (this.canHandle(abs) && this.isProfileUrl(abs)) links.add(abs);
      } catch {
        /* */
      }
    });
    return [...links];
  }

  extractNextPageUrl(html: string, baseUrl: string): string | undefined {
    const $ = cheerio.load(html);
    const next = $(this.getNextPageSelector()).first().attr('href');
    if (!next) return undefined;
    try {
      return new URL(next, baseUrl).toString();
    } catch {
      return undefined;
    }
  }

  protected getCookieSelectors(): string[] {
    return [];
  }

  protected getSecurityStrategy(): SecurityStrategy {
    return {
      proxyStrategy: ProxyStrategy.NONE,
      solverStrategy: SolverStrategy.NONE,
      engine: CrawlerEngine.PATCHRIGHT,
    };
  }

  protected getNextPageSelector(): string {
    return 'a[rel="next"]';
  }
}
