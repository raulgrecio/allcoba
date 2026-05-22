/**
 * DatingPipelineBase — shared scaffolding for the 20 v2 dating wrappers.
 *
 * Each concrete wrapper sets identifier + URL routing + (optionally) overrides
 * the cookies / age-gate / security strategy / next-page selector. Discovery
 * (`extractProfileLinks`) and pagination (`extractNextPageUrl`) live here with
 * sensible defaults.
 *
 * The pure `extract(html, url)` and `map(payload, resolver, opts)` functions
 * are owned by each adapter's `<source>.extractor.ts` / `<source>.mapper.ts`
 * — the wrapper just forwards to them.
 */

import * as cheerio from 'cheerio';

import type { CrawlerOptions, SecurityStrategy } from '#application/ports/crawler.port.js';
import type {
  DatingPipelineMapOptions,
  DatingPipelinePort,
} from '#application/ports/dating-pipeline.port.js';
import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';
import { CrawlerEngine, ProxyStrategy, SolverStrategy } from '#application/ports/crawler.port.js';
import { RobotsChecker } from '#infrastructure/crawler/robots-checker.js';

export abstract class DatingPipelineBase<Payload> implements DatingPipelinePort<Payload> {
  abstract readonly identifier: string;
  readonly defaultVertical = 'dating' as const;

  protected readonly robotsChecker = new RobotsChecker();

  abstract canHandle(url: string): boolean;
  abstract isProfileUrl(url: string): boolean;
  abstract extract(html: string, sourceUrl: string): Payload;
  abstract map(
    payload: Payload,
    resolver: TaxonomyResolverPort,
    options?: DatingPipelineMapOptions,
  ): Promise<ScrapedProvider>;

  isAllowed(url: string): Promise<boolean> {
    return this.robotsChecker.isAllowed(url);
  }

  getCrawlerOptions(_url: string, options?: Partial<CrawlerOptions>): CrawlerOptions {
    return {
      ...this.getSecurityStrategy(),
      cookieSelectors: this.getCookieSelectors(),
      ageGateSelectors: this.getAgeGateSelectors(),
      ...options,
    };
  }

  /** Default: every `<a href>` whose absolute form passes canHandle + isProfileUrl. */
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
        /* skip invalid hrefs */
      }
    });
    return [...links];
  }

  /** Default: rel=next anchor. Override `getNextPageSelector` to customise. */
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

  protected getAgeGateSelectors(): string[] {
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
