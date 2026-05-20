/**
 * ScrapingPipelinePort — generic v2 contract across all verticals.
 *
 *   ScrapingPipelinePort<TPayload, TScraped>
 *
 * Pure pipeline shared by every adapter that follows the
 * `types → parsers → extractor → mapper → pipeline` pattern. Each
 * vertical defines an alias that narrows the output:
 *
 *   DatingPipelinePort       = ScrapingPipelinePort<unknown, ScrapedProvider>
 *   RealEstatePipelinePort   = ScrapingPipelinePort<unknown, ScrapedProperty>
 *   MotorPipelinePort        = ScrapingPipelinePort<unknown, ScrapedVehicle>
 *   GeneralPipelinePort      = ScrapingPipelinePort<unknown, ScrapedListing>
 *
 * The use case resolves the source via `SourceRegistry`, dispatches on the
 * `defaultVertical` literal (or `isScrapingPipelinePort` guard) and calls
 * the appropriate persistence path.
 */

import type { Vertical } from '@allcoba/shared-types';

import type { CrawlerOptions } from './crawler.port.js';
import type { TaxonomyResolverPort } from './taxonomy-resolver.port.js';
import type { ScrapedListing } from '#domain/canonical/scraped-listing.js';
import type { ScrapedProperty } from '#domain/canonical/scraped-property.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';
import type { ScrapedVehicle } from '#domain/canonical/scraped-vehicle.js';

export interface PipelineMapOptions {
  readonly now?: Date;
  readonly contentLocale?: string;
}

export interface ScrapingPipelinePort<TPayload = unknown, TScraped = unknown> {
  readonly identifier: string;
  readonly defaultVertical: Vertical;

  canHandle(url: string): boolean;
  isProfileUrl(url: string): boolean;
  isAllowed(url: string): Promise<boolean>;

  getCrawlerOptions(url: string, options?: Partial<CrawlerOptions>): CrawlerOptions;

  extract(
    html: string,
    sourceUrl: string,
    networkResponses?: ReadonlyArray<{ url: string; body: string }>,
  ): TPayload;
  map(
    payload: TPayload,
    resolver: TaxonomyResolverPort,
    options?: PipelineMapOptions,
  ): Promise<TScraped>;

  extractProfileLinks(html: string, baseUrl: string): string[];
  extractNextPageUrl(html: string, baseUrl: string): string | undefined;
}

export type RealEstatePipelinePort = ScrapingPipelinePort<unknown, ScrapedProperty>;
export type MotorPipelinePort = ScrapingPipelinePort<unknown, ScrapedVehicle>;
export type GeneralPipelinePort = ScrapingPipelinePort<unknown, ScrapedListing>;
export type DatingPipelinePortGeneric = ScrapingPipelinePort<unknown, ScrapedProvider>;

export type AnyPipelinePort =
  | DatingPipelinePortGeneric
  | RealEstatePipelinePort
  | MotorPipelinePort
  | GeneralPipelinePort;

/**
 * Type guard — any v2 wrapper that follows the ScrapingPipelinePort shape.
 * Use this when the use case needs to dispatch on vertical via
 * `source.defaultVertical` instead of the dating-only `isDatingPipelinePort`.
 */
export function isScrapingPipelinePort(source: unknown): source is AnyPipelinePort {
  return (
    typeof source === 'object' &&
    source !== null &&
    'map' in source &&
    typeof (source as { map: unknown }).map === 'function' &&
    'extract' in source &&
    typeof (source as { extract: unknown }).extract === 'function' &&
    'identifier' in source &&
    'defaultVertical' in source
  );
}
