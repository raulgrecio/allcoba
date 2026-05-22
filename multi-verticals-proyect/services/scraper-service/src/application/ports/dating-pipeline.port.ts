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
 * Notas de diseño:
 *   - `extract` es **puro** (recibe html, sin IO de crawler) → testeable con
 *     fixtures. El llamador (`ScrapeUrlUseCase`) es dueño del fetch del crawler.
 *   - La salida es un `ScrapedProvider` completo producido por `map`.
 *   - `map` recibe un `TaxonomyResolverPort` inyectado para resolver slugs de
 *     ciudad / nacionalidad / pelo a ids branded sin que el adaptador conozca
 *     el catálogo.
 *
 * Las demás verticales (motor / real-estate / general) usan el contrato
 * genérico `ScrapingPipelinePort` (`scraping-pipeline.port.ts`).
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
   * `networkResponses` (cuando el adaptador pide captureNetwork) permite a
   * portales CSR/API enriquecer el payload con el JSON de su API interna.
   */
  extract(
    html: string,
    sourceUrl: string,
    networkResponses?: ReadonlyArray<{ url: string; body: string }>,
  ): Payload;

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
 * Type guard — identifica instancias de `DatingPipelinePort` en el union
 * de retorno de `SourceRegistry.resolve` (mapean a `ScrapedProvider`).
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
