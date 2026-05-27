/**
 * Unit tests for ScrapeUrlUseCase. All deps mocked.
 * Pipeline v2 unificado: fetch → extract → map → persist.
 */

import { describe, expect, it, vi } from 'vitest';

import type { Vertical } from '@allcoba/shared-types';

import type { CrawlerPort } from '#application/ports/crawler.port.js';
import type { PersistenceStrategyPort } from '#application/ports/persistence-strategy.port.js';
import type { SourceResolverPort } from '#application/ports/source-resolver.port.js';
import type { StoragePort } from '#application/ports/storage.port.js';
import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';
import type { HasExternalRefs } from '#domain/canonical/external-ref.js';
import { ScrapeUrlUseCase } from '#application/use-cases/scrape-url.use-case.js';

// ── factories ─────────────────────────────────────────────────────────────────

type AnyPersistenceStrategy = PersistenceStrategyPort<HasExternalRefs>;
type FakeCrawler = CrawlerPort & { fetch: ReturnType<typeof vi.fn> };

/** Pipeline v2 — pasa el guard isScrapingPipelinePort (map+extract+identifier+defaultVertical). */
const makePipeline = (
  vertical: 'dating' | 'general' | 'real-estate' | 'motor' = 'dating',
  overrides: Record<string, unknown> = {},
) => ({
  identifier: 'test-pipeline',
  defaultVertical: vertical,
  isAllowed: vi.fn().mockResolvedValue(true),
  getCrawlerOptions: vi.fn().mockReturnValue({}),
  extract: vi.fn().mockReturnValue({ raw: 'payload' }),
  map: vi.fn().mockResolvedValue({ id: 'scraped-1', vertical }),
  canHandle: vi.fn().mockReturnValue(true),
  isProfileUrl: vi.fn().mockReturnValue(true),
  extractProfileLinks: vi.fn().mockReturnValue([]),
  extractNextPageUrl: vi.fn().mockReturnValue(undefined),
  ...overrides,
});

const makeCrawler = (): FakeCrawler =>
  ({
    fetch: vi.fn().mockResolvedValue({ html: '<html/>' }),
    close: vi.fn(),
  }) as unknown as FakeCrawler;

const makeSourceResolver = (source: unknown): SourceResolverPort =>
  ({ resolve: vi.fn().mockResolvedValue(source) }) as unknown as SourceResolverPort;

const makeTaxonomyResolver = (): TaxonomyResolverPort =>
  ({
    resolveCity: vi.fn().mockResolvedValue(null),
    resolveCountry: vi.fn().mockResolvedValue(null),
    resolveNationality: vi.fn().mockResolvedValue(null),
    resolveEthnicity: vi.fn().mockResolvedValue(null),
    resolveHair: vi.fn().mockResolvedValue(null),
    resolveEyes: vi.fn().mockResolvedValue(null),
    resolveOrientation: vi.fn().mockResolvedValue(null),
  }) as unknown as TaxonomyResolverPort;

const makeStrategy = () => ({
  persist: vi.fn().mockResolvedValue({ action: 'CREATE', entityId: 'entity-1' }),
});

const makeStorage = (): StoragePort =>
  ({
    upload: vi.fn().mockResolvedValue('file://test.html'),
    delete: vi.fn(),
    exists: vi.fn().mockResolvedValue(true),
  }) as unknown as StoragePort;

const makeStrategiesMap = (
  vertical: 'dating' | 'general' | 'real-estate' | 'motor' = 'dating',
  strategy = makeStrategy(),
): Map<Vertical, AnyPersistenceStrategy> =>
  new Map([[vertical, strategy as unknown as AnyPersistenceStrategy]]);

// ── tests ─────────────────────────────────────────────────────────────────────

describe('ScrapeUrlUseCase', () => {
  it('fetches, extracts, maps and persists', async () => {
    const pipeline = makePipeline();
    const strategy = makeStrategy();
    const crawler = makeCrawler();
    const useCase = new ScrapeUrlUseCase(
      makeSourceResolver(pipeline),
      crawler,
      makeTaxonomyResolver(),
      makeStrategiesMap('dating', strategy),
      makeStorage(),
    );

    await useCase.execute('https://example.com/profile/1');

    expect(crawler.fetch).toHaveBeenCalledOnce();
    expect(pipeline.extract).toHaveBeenCalledOnce();
    expect(pipeline.map).toHaveBeenCalledOnce();
    expect(strategy.persist).toHaveBeenCalledOnce();
  });

  it('throws when robots.txt blocks', async () => {
    const pipeline = makePipeline('dating', { isAllowed: vi.fn().mockResolvedValue(false) });
    const useCase = new ScrapeUrlUseCase(
      makeSourceResolver(pipeline),
      makeCrawler(),
      makeTaxonomyResolver(),
      makeStrategiesMap(),
      makeStorage(),
    );

    await expect(useCase.execute('https://example.com/profile/1')).rejects.toThrow(
      'robots.txt blocks',
    );
  });

  it('skips robots check when skipRobots=true', async () => {
    const pipeline = makePipeline('dating', { isAllowed: vi.fn().mockResolvedValue(false) });
    const strategy = makeStrategy();
    const useCase = new ScrapeUrlUseCase(
      makeSourceResolver(pipeline),
      makeCrawler(),
      makeTaxonomyResolver(),
      makeStrategiesMap('dating', strategy),
      makeStorage(),
      { skipRobots: true },
    );

    await useCase.execute('https://example.com/profile/1');

    expect(pipeline.isAllowed).not.toHaveBeenCalled();
    expect(strategy.persist).toHaveBeenCalledOnce();
  });

  it('skips persist when no strategy registered for vertical', async () => {
    const pipeline = makePipeline('general');
    const strategy = makeStrategy();
    const useCase = new ScrapeUrlUseCase(
      makeSourceResolver(pipeline),
      makeCrawler(),
      makeTaxonomyResolver(),
      makeStrategiesMap('dating', strategy), // 'general' no registrada
      makeStorage(),
    );

    await useCase.execute('https://example.com/profile/1');

    expect(strategy.persist).not.toHaveBeenCalled();
  });

  it('throws when resolved source is not a v2 pipeline', async () => {
    const notAPipeline = { identifier: 'x', extract: vi.fn() }; // sin map
    const useCase = new ScrapeUrlUseCase(
      makeSourceResolver(notAPipeline),
      makeCrawler(),
      makeTaxonomyResolver(),
      makeStrategiesMap(),
      makeStorage(),
    );

    await expect(useCase.execute('https://example.com/profile/1')).rejects.toThrow(
      'No se resolvió un pipeline v2',
    );
  });
});
