/**
 * Unit tests for DiscoverUrlsUseCase. All dependencies mocked with vi.fn().
 * No network, no DB. Exercises: skip logic, already-persisted guard,
 * page iteration, pagination stop when no links.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DiscoverUrlsUseCase } from '#application/use-cases/discover-urls.use-case.js';
import { InMemoryScrapedEntityRepository } from '#infrastructure/adapters/persistence/in-memory-scraped-entity.repository.js';
import { asConfidence } from '#domain/canonical/confidence.js';
import type { ScrapedListing } from '#domain/canonical/scraped-listing.js';
import type { HasExternalRefs } from '#domain/canonical/external-ref.js';

import { asProviderId } from '@allcoba/shared-types';
import { randomUUID } from 'node:crypto';

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
    extractNextPageUrl: vi.fn((_, currentUrl: string) => opts.nextPages?.[pageIndex - 1]),
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

// ── entity repos ──────────────────────────────────────────────────────────────

const makeEntityRepos = () => {
  const repo = new InMemoryScrapedEntityRepository<ScrapedListing & HasExternalRefs>();
  return new Map([['general', repo]] as [string, typeof repo][]) as Map<
    'general',
    typeof repo
  >;
};

describe('DiscoverUrlsUseCase', () => {
  beforeEach(() => {
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => { fn(); return 0 as any; });
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
    );

    await useCase.execute('https://example.com/list');

    expect(scraper.execute).not.toHaveBeenCalled();
  });

  it('follows pagination to next page', async () => {
    const source = makeSource({
      profileLinks: [
        ['https://example.com/item/a'],
        ['https://example.com/item/b'],
      ],
      nextPages: ['https://example.com/list?page=2', undefined],
    });
    const scraper = makeScrapeUrlUseCase();
    const useCase = new DiscoverUrlsUseCase(
      makeSourceResolver(source) as any,
      scraper as any,
      makeCrawler() as any,
      makeEntityRepos() as any,
    );

    await useCase.execute('https://example.com/list', 10);

    expect(scraper.execute).toHaveBeenCalledTimes(2);
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
    );

    await useCase.execute('https://example.com/list', 10);

    expect(scraper.execute).toHaveBeenCalledTimes(2);
  });
});
