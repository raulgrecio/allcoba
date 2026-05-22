/**
 * Unit tests for ScrapeUrlUseCase. All deps mocked.
 * Pipeline v2 unificado: fetch → extract → map → persist.
 */

import { describe, expect, it, vi } from 'vitest';

import { ScrapeUrlUseCase } from '#application/use-cases/scrape-url.use-case.js';

// ── factories ─────────────────────────────────────────────────────────────────

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

const makeCrawler = () => ({
  fetch: vi.fn().mockResolvedValue({ html: '<html/>' }),
  close: vi.fn(),
});

const makeSourceResolver = (source: unknown) => ({
  resolve: vi.fn().mockResolvedValue(source),
});

const makeTaxonomyResolver = () => ({
  resolveCity: vi.fn().mockResolvedValue(null),
  resolveCountry: vi.fn().mockResolvedValue(null),
  resolveNationality: vi.fn().mockResolvedValue(null),
  resolveEthnicity: vi.fn().mockResolvedValue(null),
  resolveHair: vi.fn().mockResolvedValue(null),
  resolveEyes: vi.fn().mockResolvedValue(null),
  resolveOrientation: vi.fn().mockResolvedValue(null),
});

const makeStrategy = () => ({
  persist: vi.fn().mockResolvedValue({ action: 'CREATE', entityId: 'entity-1' }),
});

const makeStrategiesMap = (
  vertical: 'dating' | 'general' | 'real-estate' | 'motor' = 'dating',
  strategy = makeStrategy(),
) => new Map([[vertical, strategy]]) as any;

// ── tests ─────────────────────────────────────────────────────────────────────

describe('ScrapeUrlUseCase', () => {
  it('fetches, extracts, maps and persists', async () => {
    const pipeline = makePipeline();
    const strategy = makeStrategy();
    const crawler = makeCrawler();
    const useCase = new ScrapeUrlUseCase(
      makeSourceResolver(pipeline) as any,
      crawler as any,
      makeTaxonomyResolver() as any,
      makeStrategiesMap('dating', strategy),
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
      makeSourceResolver(pipeline) as any,
      makeCrawler() as any,
      makeTaxonomyResolver() as any,
      makeStrategiesMap(),
    );

    await expect(useCase.execute('https://example.com/profile/1')).rejects.toThrow(
      'robots.txt blocks',
    );
  });

  it('skips robots check when skipRobots=true', async () => {
    const pipeline = makePipeline('dating', { isAllowed: vi.fn().mockResolvedValue(false) });
    const strategy = makeStrategy();
    const useCase = new ScrapeUrlUseCase(
      makeSourceResolver(pipeline) as any,
      makeCrawler() as any,
      makeTaxonomyResolver() as any,
      makeStrategiesMap('dating', strategy),
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
      makeSourceResolver(pipeline) as any,
      makeCrawler() as any,
      makeTaxonomyResolver() as any,
      makeStrategiesMap('dating', strategy), // 'general' no registrada
    );

    await useCase.execute('https://example.com/profile/1');

    expect(strategy.persist).not.toHaveBeenCalled();
  });

  it('throws when resolved source is not a v2 pipeline', async () => {
    const notAPipeline = { identifier: 'x', extract: vi.fn() }; // sin map
    const useCase = new ScrapeUrlUseCase(
      makeSourceResolver(notAPipeline) as any,
      makeCrawler() as any,
      makeTaxonomyResolver() as any,
      makeStrategiesMap(),
    );

    await expect(useCase.execute('https://example.com/profile/1')).rejects.toThrow(
      'No se resolvió un pipeline v2',
    );
  });
});
