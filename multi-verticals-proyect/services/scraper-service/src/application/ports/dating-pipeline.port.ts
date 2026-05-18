/**
 * DatingPipelinePort — v2 contract for dating-vertical adapters.
 *
 * Mirrors the four-file extractor/parsers/mapper/types pattern used in
 * src/infrastructure/adapters/sources/dating/<source>/. Each adapter exposes:
 *
 *   - `canHandle(url)`           — URL routing
 *   - `getCrawlerOptions(...)`   — Playwright / Cheerio strategy (cookies, age gate, …)
 *   - `extract(html, url)`       — pure parse: HTML → source-specific Payload
 *   - `map(payload, resolver)`   — pure map: Payload → ScrapedProvider (rich canonical)
 *   - `extractProfileLinks(...)` — discovery for listing pages
 *   - `extractNextPageUrl(...)`  — pagination
 *   - `isProfileUrl(url)`        — detail vs. listing classifier
 *   - `isAllowed(url)`           — robots.txt check
 *
 * Differences vs. legacy v1 `SourcePort`:
 *   - `extract` is **pure** (takes html, no crawler IO) → trivially unit-testable
 *     against fixtures. The caller (`ScrapeUrlUseCase`) owns the crawler fetch.
 *   - Output is a full `ScrapedProvider` produced by `map`, not the lossy flat
 *     `RawExtraction` shape. The use case stops needing `buildMinimalScrapedProvider`.
 *   - `map` takes a `TaxonomyResolverPort` injection so city / nationality / hair
 *     slugs resolve to branded ids without each adapter knowing the catalog.
 *
 * Other verticals (motor / real-estate / general) keep using v1 `SourcePort`
 * until their own v2 ports are introduced (`RealEstatePipelinePort`, etc.).
 */

import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';

import type { CrawlerOptions } from './crawler.port.js';
import type { TaxonomyResolverPort } from './taxonomy-resolver.port.js';

export interface DatingPipelineMapOptions {
  readonly now?: Date;
  readonly contentLocale?: string;
}

export interface DatingPipelinePort<Payload = unknown> {
  /** Stable source slug (`'topescortbabes' | 'erosguia' | …`). */
  readonly identifier: string;

  /** Always `'dating'` for this port. */
  readonly defaultVertical: 'dating';

  /** URL routing. */
  canHandle(url: string): boolean;

  /** Detail page vs. listing page classifier. */
  isProfileUrl(url: string): boolean;

  /** Robots.txt gate. */
  isAllowed(url: string): Promise<boolean>;

  /** Source-specific crawler config (cookies, age gate, security strategy). */
  getCrawlerOptions(url: string, options?: Partial<CrawlerOptions>): CrawlerOptions;

  /**
   * Pure extraction: HTML → adapter Payload. No IO, no crawling.
   * The use case owns `crawler.fetch(...)` and passes the resulting html here.
   */
  extract(html: string, sourceUrl: string): Payload;

  /**
   * Pure mapping: Payload → ScrapedProvider. Resolves catalog slugs via the
   * injected `TaxonomyResolverPort`. The returned ScrapedProvider is the rich
   * canonical shape; the use case can persist it directly without a lossy
   * intermediate.
   */
  map(
    payload: Payload,
    resolver: TaxonomyResolverPort,
    options?: DatingPipelineMapOptions,
  ): Promise<ScrapedProvider>;

  /** Listing → profile URLs (discovery). */
  extractProfileLinks(html: string, baseUrl: string): string[];

  /** Listing → next-page URL (pagination). Undefined when the page is the last. */
  extractNextPageUrl(html: string, baseUrl: string): string | undefined;
}

/**
 * Type guard — distinguishes v2 `DatingPipelinePort` instances from legacy
 * `SourcePort` adapters in `SourceRegistry.resolve`'s union return type. v2
 * pipelines expose a `map(payload, resolver, …)` method that v1 adapters do not.
 */
export function isDatingPipelinePort(source: unknown): source is DatingPipelinePort {
  return (
    typeof source === 'object' &&
    source !== null &&
    'map' in source &&
    typeof (source as { map: unknown }).map === 'function' &&
    'extract' in source &&
    typeof (source as { extract: unknown }).extract === 'function' &&
    'identifier' in source
  );
}
