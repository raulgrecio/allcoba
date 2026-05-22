/**
 * Unit tests for DiscoverUrlsUseCase. All dependencies mocked with vi.fn().
 * No network, no DB. Exercises: skip logic, already-persisted guard,
 * page iteration, pagination stop when no links.
 */

import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { asProviderId } from '@allcoba/shared-types';

import type { HasExternalRefs } from '#domain/canonical/external-ref.js';
import type { ScrapedListing } from '#domain/canonical/scraped-listing.js';
import { DiscoverUrlsUseCase } from '#application/use-cases/discover-urls.use-case.js';
import { asConfidence } from '#domain/canonical/confidence.js';
import { InMemoryScrapedEntityRepository } from '#infrastructure/adapters/persistence/in-memory-scraped-entity.repository.js';

// ── minimal source stub ───────────────────────────────────────────────────────

const makeSource = (opts: {
  id?: string;
  profileLinks?: string[][];
  nextPages?: (string | undefined)[];
}) => {
  let pageIndex = 0;
  return {
    identifier: opts.id ?? 'test-source',
    defaultVertical: 'general' as const,
    getCrawlerOptions: () => ({}),
    extractProfileLinks: vi.fn(() => {
      const links = opts.profileLinks?.[pageIndex] ?? [];
      pageIndex++;
      return links;
    }),
    extractNextPageUrl: vi.fn((_, _currentUrl: string) => opts.nextPages?.[pageIndex - 1]),
  };
};

// ── mocks ─────────────────────────────────────────────────────────────────────

const makeCrawler = () => ({
  fetch: vi.fn().mockResolvedValue({ html: '<html/>' }),
  close: vi.fn(),
});

const makeSourceResolver = (source: ReturnType<typeof makeSource>) => ({
  resolve: vi.fn().mockResolvedValue(source),
});

const makeScrapeUrlUseCase = () => ({
  execute: vi.fn().mockResolvedValue(undefined),
});

const makeStorage = () => ({
  upload: vi.fn().mockResolvedValue('file:///tmp/x'),
  delete: vi.fn().mockResolvedValue(undefined),
  exists: vi.fn().mockResolvedValue(false),
});

// saveRawHtml off → no listing HTML dump in unit tests
const TEST_CONFIG = { saveRawHtml: false };

// ── entity repos ──────────────────────────────────────────────────────────────

const makeEntityRepos = () => {
  const repo = new InMemoryScrapedEntityRepository<ScrapedListing & HasExternalRefs>();
  return new Map([['general', repo]] as [string, typeof repo][]) as Map<'general', typeof repo>;
};

describe('DiscoverUrlsUseCase', () => {
  beforeEach(() => {
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      fn();
      return 0 as any;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('scrapes all links on single page', async () => {
    const source = makeSource({
      profileLinks: [['https://example.com/item/a', 'https://example.com/item/b']],
      nextPages: [undefined],
    });
    const crawler = makeCrawler();
    const scraper = makeScrapeUrlUseCase();
    const useCase = new DiscoverUrlsUseCase(
      makeSourceResolver(source) as any,
      scraper as any,
      crawler as any,
      makeEntityRepos() as any,
      makeStorage() as any,
      TEST_CONFIG as any,
    );

    await useCase.execute('https://example.com/list', 10);

    expect(scraper.execute).toHaveBeenCalledTimes(2);
    expect(scraper.execute).toHaveBeenCalledWith('https://example.com/item/a');
    expect(scraper.execute).toHaveBeenCalledWith('https://example.com/item/b');
  });

  it('respects limit parameter', async () => {
    const links = Array.from({ length: 10 }, (_, i) => `https://example.com/item/${i}`);
    const source = makeSource({ profileLinks: [links], nextPages: [undefined] });
    const scraper = makeScrapeUrlUseCase();
    const useCase = new DiscoverUrlsUseCase(
      makeSourceResolver(source) as any,
      scraper as any,
      makeCrawler() as any,
      makeEntityRepos() as any,
      makeStorage() as any,
      TEST_CONFIG as any,
    );

    await useCase.execute('https://example.com/list', 3);

    expect(scraper.execute).toHaveBeenCalledTimes(3);
  });

  it('skips already-persisted URLs', async () => {
    const repo = new InMemoryScrapedEntityRepository<ScrapedListing>();
    await repo.create({
      id: asProviderId(randomUUID()),
      vertical: 'general',
      title: 'Existing',
      categoryPath: [],
      photos: [],
      externalRefs: [{ source: 'test-source', sourceId: 'item-exists' }],
      confidence: asConfidence(0.8),
      attributes: {},
      metadata: {},
      lastScrapedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const source = makeSource({
      profileLinks: [['https://example.com/item/item-exists', 'https://example.com/item/new']],
      nextPages: [undefined],
    });
    const scraper = makeScrapeUrlUseCase();
    const entityRepos = new Map([['general', repo]]) as any;

    const useCase = new DiscoverUrlsUseCase(
      makeSourceResolver(source) as any,
      scraper as any,
      makeCrawler() as any,
      entityRepos,
      makeStorage() as any,
      TEST_CONFIG as any,
    );

    await useCase.execute('https://example.com/list', 10);

    expect(scraper.execute).toHaveBeenCalledTimes(1);
    expect(scraper.execute).toHaveBeenCalledWith('https://example.com/item/new');
  });

  it('stops when no profile links found on page', async () => {
    const source = makeSource({ profileLinks: [[]], nextPages: [undefined] });
    const scraper = makeScrapeUrlUseCase();
    const useCase = new DiscoverUrlsUseCase(
      makeSourceResolver(source) as any,
      scraper as any,
      makeCrawler() as any,
      makeEntityRepos() as any,
      makeStorage() as any,
      TEST_CONFIG as any,
    );

    await useCase.execute('https://example.com/list');

    expect(scraper.execute).not.toHaveBeenCalled();
  });

  it('follows pagination to next page', async () => {
    const source = makeSource({
      profileLinks: [['https://example.com/item/a'], ['https://example.com/item/b']],
      nextPages: ['https://example.com/list?page=2', undefined],
    });
    const scraper = makeScrapeUrlUseCase();
    const useCase = new DiscoverUrlsUseCase(
      makeSourceResolver(source) as any,
      scraper as any,
      makeCrawler() as any,
      makeEntityRepos() as any,
      makeStorage() as any,
      TEST_CONFIG as any,
    );

    await useCase.execute('https://example.com/list', 10);

    expect(scraper.execute).toHaveBeenCalledTimes(2);
  });

  it('respects skip parameter — skips first N profiles', async () => {
    const source = makeSource({
      profileLinks: [
        [
          'https://example.com/item/skip1',
          'https://example.com/item/skip2',
          'https://example.com/item/actual',
        ],
      ],
      nextPages: [undefined],
    });
    const scraper = makeScrapeUrlUseCase();
    const useCase = new DiscoverUrlsUseCase(
      makeSourceResolver(source) as any,
      scraper as any,
      makeCrawler() as any,
      makeEntityRepos() as any,
      makeStorage() as any,
      TEST_CONFIG as any,
    );

    await useCase.execute('https://example.com/list', 10, 2);

    expect(scraper.execute).toHaveBeenCalledTimes(1);
    expect(scraper.execute).toHaveBeenCalledWith('https://example.com/item/actual');
  });

  it('handles unknown vertical — repo missing, no crash', async () => {
    const source = makeSource({
      profileLinks: [['https://example.com/item/unknown-vertical']],
      nextPages: [undefined],
    });
    // Use a source with a vertical that has no repo in entityRepos
    Object.assign(source, { defaultVertical: 'real-estate' });
    const scraper = makeScrapeUrlUseCase();
    const useCase = new DiscoverUrlsUseCase(
      makeSourceResolver(source) as any,
      scraper as any,
      makeCrawler() as any,
      makeEntityRepos() as any, // only has 'general'
      makeStorage() as any,
      TEST_CONFIG as any,
    );

    await expect(useCase.execute('https://example.com/list', 10)).resolves.not.toThrow();
    expect(scraper.execute).toHaveBeenCalledOnce();
  });

  it('breaks on list page fetch error', async () => {
    const source = makeSource({ profileLinks: [[]], nextPages: [] });
    const crawler = makeCrawler();
    crawler.fetch.mockRejectedValueOnce(new Error('fetch failed'));
    const scraper = makeScrapeUrlUseCase();
    const useCase = new DiscoverUrlsUseCase(
      makeSourceResolver(source) as any,
      scraper as any,
      crawler as any,
      makeEntityRepos() as any,
      makeStorage() as any,
      TEST_CONFIG as any,
    );

    await expect(useCase.execute('https://example.com/list')).resolves.not.toThrow();
    expect(scraper.execute).not.toHaveBeenCalled();
  });

  it('isDatingPipelinePort truthy path — uses dating getCrawlerOptions', async () => {
    const datingSource = {
      ...makeSource({
        profileLinks: [['https://example.com/item/a']],
        nextPages: [undefined],
      }),
      map: vi.fn(),
      extract: vi.fn(),
    };
    const scraper = makeScrapeUrlUseCase();
    const useCase = new DiscoverUrlsUseCase(
      makeSourceResolver(datingSource as any) as any,
      scraper as any,
      makeCrawler() as any,
      makeEntityRepos() as any,
      makeStorage() as any,
      TEST_CONFIG as any,
    );

    await useCase.execute('https://example.com/list', 1);

    expect(scraper.execute).toHaveBeenCalledOnce();
  });

  it('continues after individual profile error', async () => {
    const source = makeSource({
      profileLinks: [['https://example.com/item/bad', 'https://example.com/item/good']],
      nextPages: [undefined],
    });
    const scraper = makeScrapeUrlUseCase();
    scraper.execute
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValueOnce(undefined);

    const useCase = new DiscoverUrlsUseCase(
      makeSourceResolver(source) as any,
      scraper as any,
      makeCrawler() as any,
      makeEntityRepos() as any,
      makeStorage() as any,
      TEST_CONFIG as any,
    );

    await useCase.execute('https://example.com/list', 10);

    expect(scraper.execute).toHaveBeenCalledTimes(2);
  });
});
