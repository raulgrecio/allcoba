/**
 * Unit tests for ScrapeUrlUseCase. All deps mocked.
 * Covers: v2 path (pipeline), v1 legacy path, image processing branches.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ScrapeUrlUseCase } from '#application/use-cases/scrape-url.use-case.js';
import { asConfidence } from '#domain/canonical/confidence.js';

import { buildProvider } from '../../helpers/scraped-provider.builder.js';

// ── factories ─────────────────────────────────────────────────────────────────

const makeRawExtraction = (overrides: Record<string, unknown> = {}) => ({
  source: 'test-source',
  externalId: 'item-1',
  url: 'https://example.com/item/1',
  name: 'Test Provider',
  phones: [] as string[],
  contacts: [],
  location: {},
  imageUrls: [] as string[],
  vertical: 'dating' as const,
  price: undefined,
  currency: undefined,
  attributes: {},
  extractedAt: new Date(),
  metadata: {
    timestamp: new Date().toISOString(),
    durationMs: 100,
    sourceUrl: 'https://example.com/item/1',
    userAgent: 'test-agent',
    statusCode: 200,
  },
  ...overrides,
});

/** v2 pipeline — passes isScrapingPipelinePort guard (has map+extract+identifier+defaultVertical) */
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

/** v1 source — NO map field → fails isScrapingPipelinePort guard */
const makeSource = (overrides: Record<string, unknown> = {}) => ({
  identifier: 'test-source',
  defaultVertical: 'dating' as const,
  isAllowed: vi.fn().mockResolvedValue(true),
  canHandle: vi.fn().mockReturnValue(true),
  isProfileUrl: vi.fn().mockReturnValue(true),
  extractProfileLinks: vi.fn().mockReturnValue([]),
  extractNextPageUrl: vi.fn().mockReturnValue(undefined),
  getCrawlerOptions: vi.fn().mockReturnValue({}),
  fetchHtml: vi.fn().mockResolvedValue({ html: '<html/>' }),
  extract: vi.fn().mockResolvedValue({
    data: makeRawExtraction(),
    html: '<html/>',
    networkResponses: [],
  }),
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

const makeRepository = (candidates: unknown[] = []) => ({
  find: vi.fn().mockResolvedValue(candidates),
  findById: vi.fn().mockResolvedValue(null),
  create: vi.fn().mockResolvedValue(undefined),
  updateById: vi.fn().mockResolvedValue(undefined),
});

const makeConsolidation = (
  action: 'CREATE' | 'MERGE' | 'FLAG_FOR_REVIEW' | 'IGNORE' = 'CREATE',
  target: unknown = null,
) => ({
  consolidate: vi.fn().mockReturnValue({
    action,
    confidence: asConfidence(0.9),
    signals: [],
    target,
  }),
});

const makeImageHasher = () => ({
  generateHash: vi.fn().mockResolvedValue('deadbeef'),
});

const makeStorage = () => ({
  upload: vi.fn().mockResolvedValue('https://r2.example.com/img.jpg'),
  delete: vi.fn(),
});

const makeStrategiesMap = (
  vertical: 'dating' | 'general' | 'real-estate' | 'motor' = 'dating',
  strategy = makeStrategy(),
) => new Map([[vertical, strategy]]) as any;

// ── tests ─────────────────────────────────────────────────────────────────────

describe('ScrapeUrlUseCase — v2 pipeline path', () => {
  it('fetches, extracts, maps and persists', async () => {
    const pipeline = makePipeline();
    const strategy = makeStrategy();
    const crawler = makeCrawler();
    const useCase = new ScrapeUrlUseCase(
      makeSourceResolver(pipeline) as any,
      crawler as any,
      makeTaxonomyResolver() as any,
      makeStrategiesMap('dating', strategy),
      makeRepository() as any,
      makeConsolidation() as any,
      makeImageHasher() as any,
      makeStorage() as any,
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
      makeRepository() as any,
      makeConsolidation() as any,
      makeImageHasher() as any,
      makeStorage() as any,
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
      makeRepository() as any,
      makeConsolidation() as any,
      makeImageHasher() as any,
      makeStorage() as any,
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
      makeStrategiesMap('dating', strategy), // 'general' not registered
      makeRepository() as any,
      makeConsolidation() as any,
      makeImageHasher() as any,
      makeStorage() as any,
    );

    await useCase.execute('https://example.com/profile/1');

    expect(strategy.persist).not.toHaveBeenCalled();
  });
});

describe('ScrapeUrlUseCase — v1 legacy path', () => {
  it('throws when robots.txt blocks', async () => {
    const source = makeSource({ isAllowed: vi.fn().mockResolvedValue(false) });
    const useCase = new ScrapeUrlUseCase(
      makeSourceResolver(source) as any,
      makeCrawler() as any,
      makeTaxonomyResolver() as any,
      new Map() as any,
      makeRepository() as any,
      makeConsolidation() as any,
      makeImageHasher() as any,
      makeStorage() as any,
    );

    await expect(useCase.execute('https://example.com/item/1')).rejects.toThrow(
      'robots.txt blocks',
    );
  });

  it('CREATE: calls repository.create', async () => {
    const source = makeSource();
    const repo = makeRepository([]);
    const useCase = new ScrapeUrlUseCase(
      makeSourceResolver(source) as any,
      makeCrawler() as any,
      makeTaxonomyResolver() as any,
      new Map() as any,
      repo as any,
      makeConsolidation('CREATE') as any,
      makeImageHasher() as any,
      makeStorage() as any,
    );

    await useCase.execute('https://example.com/item/1');

    expect(repo.create).toHaveBeenCalledOnce();
    expect(repo.updateById).not.toHaveBeenCalled();
  });

  it('MERGE: calls repository.updateById, not create', async () => {
    const target = buildProvider();
    const source = makeSource();
    const repo = makeRepository([target]);
    const useCase = new ScrapeUrlUseCase(
      makeSourceResolver(source) as any,
      makeCrawler() as any,
      makeTaxonomyResolver() as any,
      new Map() as any,
      repo as any,
      makeConsolidation('MERGE', target) as any,
      makeImageHasher() as any,
      makeStorage() as any,
    );

    await useCase.execute('https://example.com/item/1');

    expect(repo.updateById).toHaveBeenCalledOnce();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('FLAG_FOR_REVIEW: updateById with verificationStatus=pending_review', async () => {
    const target = buildProvider({ verificationStatus: 'verified' });
    const source = makeSource();
    const repo = makeRepository([target]);
    const useCase = new ScrapeUrlUseCase(
      makeSourceResolver(source) as any,
      makeCrawler() as any,
      makeTaxonomyResolver() as any,
      new Map() as any,
      repo as any,
      makeConsolidation('FLAG_FOR_REVIEW', target) as any,
      makeImageHasher() as any,
      makeStorage() as any,
    );

    await useCase.execute('https://example.com/item/1');

    expect(repo.updateById).toHaveBeenCalledOnce();
    const merged = (repo.updateById as ReturnType<typeof vi.fn>).mock.calls[0]![1] as any;
    expect(merged.verificationStatus).toBe('pending_review');
  });

  it('IGNORE: no repo calls', async () => {
    const source = makeSource();
    const repo = makeRepository();
    const useCase = new ScrapeUrlUseCase(
      makeSourceResolver(source) as any,
      makeCrawler() as any,
      makeTaxonomyResolver() as any,
      new Map() as any,
      repo as any,
      makeConsolidation('IGNORE') as any,
      makeImageHasher() as any,
      makeStorage() as any,
    );

    await useCase.execute('https://example.com/item/1');

    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.updateById).not.toHaveBeenCalled();
  });

  it('normalises phone numbers via asPhoneE164', async () => {
    const source = makeSource();
    (source.extract as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: makeRawExtraction({ phones: ['+34612345678'] }),
      html: '<html/>',
      networkResponses: [],
    });
    const repo = makeRepository([]);
    const consolidation = makeConsolidation('CREATE');
    const useCase = new ScrapeUrlUseCase(
      makeSourceResolver(source) as any,
      makeCrawler() as any,
      makeTaxonomyResolver() as any,
      new Map() as any,
      repo as any,
      consolidation as any,
      makeImageHasher() as any,
      makeStorage() as any,
    );

    await useCase.execute('https://example.com/item/1');

    expect(consolidation.consolidate).toHaveBeenCalledWith(
      expect.objectContaining({ phones: expect.arrayContaining([expect.any(String)]) }),
    );
  });

  it('saveRawHtml: uploads HTML to storage', async () => {
    const source = makeSource();
    const storage = makeStorage();
    const useCase = new ScrapeUrlUseCase(
      makeSourceResolver(source) as any,
      makeCrawler() as any,
      makeTaxonomyResolver() as any,
      new Map() as any,
      makeRepository() as any,
      makeConsolidation('CREATE') as any,
      makeImageHasher() as any,
      storage as any,
      { saveRawHtml: true },
    );

    await useCase.execute('https://example.com/item/1');

    expect(storage.upload).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringContaining('.html'),
      'text/html',
    );
  });

  it('captureNetworkLogs: uploads network response files', async () => {
    const source = makeSource();
    (source.extract as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: makeRawExtraction(),
      html: '<html/>',
      networkResponses: [
        { url: 'https://api.example.com/data', status: 200, body: '{}', contentType: 'application/json' },
      ],
    });
    const storage = makeStorage();
    const useCase = new ScrapeUrlUseCase(
      makeSourceResolver(source) as any,
      makeCrawler() as any,
      makeTaxonomyResolver() as any,
      new Map() as any,
      makeRepository() as any,
      makeConsolidation('CREATE') as any,
      makeImageHasher() as any,
      storage as any,
      { captureNetworkLogs: true },
    );

    await useCase.execute('https://example.com/item/1');

    expect(storage.upload).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringContaining('network/'),
      'application/json',
    );
  });
});

describe('ScrapeUrlUseCase — processImages', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    }) as any;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reuses stored URL when hash already exists in repo', async () => {
    const existingImg = {
      hash: 'deadbeef',
      storedUrl: 'https://r2.example.com/existing.jpg',
      originalUrl: 'https://src.com/img.jpg',
    };
    const repo = makeRepository();
    (repo.find as ReturnType<typeof vi.fn>).mockResolvedValue([
      { images: [existingImg] },
    ]);

    const storage = makeStorage();
    const source = makeSource();
    (source.extract as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: makeRawExtraction({ imageUrls: ['https://src.com/img.jpg'] }),
      html: '<html/>',
      networkResponses: [],
    });

    const useCase = new ScrapeUrlUseCase(
      makeSourceResolver(source) as any,
      makeCrawler() as any,
      makeTaxonomyResolver() as any,
      new Map() as any,
      repo as any,
      makeConsolidation('CREATE') as any,
      makeImageHasher() as any,
      storage as any,
    );

    await useCase.execute('https://example.com/item/1');

    expect(storage.upload).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.stringContaining('images/'),
      'image/jpeg',
    );
  });

  it('uploads image when hash is new', async () => {
    const repo = makeRepository();
    (repo.find as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const storage = makeStorage();
    const source = makeSource();
    (source.extract as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: makeRawExtraction({ imageUrls: ['https://src.com/new.jpg'] }),
      html: '<html/>',
      networkResponses: [],
    });

    const useCase = new ScrapeUrlUseCase(
      makeSourceResolver(source) as any,
      makeCrawler() as any,
      makeTaxonomyResolver() as any,
      new Map() as any,
      repo as any,
      makeConsolidation('CREATE') as any,
      makeImageHasher() as any,
      storage as any,
    );

    await useCase.execute('https://example.com/item/1');

    expect(storage.upload).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringContaining('images/'),
      'image/jpeg',
    );
  });

  it('skips failed images and continues processing', async () => {
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue({
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      }) as any;

    const repo = makeRepository();
    (repo.find as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const storage = makeStorage();
    const source = makeSource();
    (source.extract as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: makeRawExtraction({
        imageUrls: ['https://bad.com/fail.jpg', 'https://good.com/ok.jpg'],
      }),
      html: '<html/>',
      networkResponses: [],
    });

    const useCase = new ScrapeUrlUseCase(
      makeSourceResolver(source) as any,
      makeCrawler() as any,
      makeTaxonomyResolver() as any,
      new Map() as any,
      repo as any,
      makeConsolidation('CREATE') as any,
      makeImageHasher() as any,
      storage as any,
    );

    await expect(useCase.execute('https://example.com/item/1')).resolves.toBeUndefined();
    expect(storage.upload).toHaveBeenCalledTimes(1); // only ok.jpg
  });

  it('respects maxImagesToProcess config', async () => {
    const repo = makeRepository();
    (repo.find as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const imageHasher = makeImageHasher();
    const source = makeSource();
    (source.extract as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: makeRawExtraction({
        imageUrls: Array.from({ length: 5 }, (_, i) => `https://src.com/img${i}.jpg`),
      }),
      html: '<html/>',
      networkResponses: [],
    });

    const useCase = new ScrapeUrlUseCase(
      makeSourceResolver(source) as any,
      makeCrawler() as any,
      makeTaxonomyResolver() as any,
      new Map() as any,
      repo as any,
      makeConsolidation('CREATE') as any,
      imageHasher as any,
      makeStorage() as any,
      { maxImagesToProcess: 2 },
    );

    await useCase.execute('https://example.com/item/1');

    expect(imageHasher.generateHash).toHaveBeenCalledTimes(2);
  });
});
