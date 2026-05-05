import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ScrapeUrlUseCase } from '@scraper/application/use-cases/scrape-url.use-case.js';
import { ScrapedProvider } from '@scraper/domain/aggregates/scraped-provider.aggregate.js';
import { Vertical } from '@scraper/domain/entities/vertical.js';
import { ConfidenceScore } from '@scraper/domain/value-objects/confidence-score.vo.js';

const VALID_PHASH = 'abcdef0123456789'; // 16 lowercase hex = valid pHash

describe('Unit: ScrapeUrlUseCase', () => {
  let mockSource: any;
  let mockRepository: any;
  let mockConsolidationService: any;
  let mockImageHasher: any;
  let mockStorage: any;
  let useCase: ScrapeUrlUseCase;

  beforeEach(() => {
    mockSource = {
      identifier: 'test-source',
      canHandle: vi.fn().mockReturnValue(true),
      isAllowed: vi.fn().mockResolvedValue(true),
      extract: vi.fn().mockResolvedValue({
        data: {
          source: 'test-source',
          externalId: '123',
          phones: ['+34600000000'],
          imageUrls: ['http://example.com/img1.jpg'],
          vertical: Vertical.REAL_ESTATE,
          metadata: { timestamp: '', durationMs: 0, sourceUrl: '', userAgent: '', statusCode: 200 },
          attributes: {},
        },
        html: '<html></html>',
      }),
    };

    mockRepository = {
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue(undefined),
      findById: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    };

    mockConsolidationService = {
      consolidate: vi.fn().mockReturnValue({
        action: 'CREATE',
        confidence: ConfidenceScore.high(),
        signals: [],
      }),
    };

    mockImageHasher = {
      generateHash: vi.fn().mockResolvedValue(VALID_PHASH),
    };

    mockStorage = {
      upload: vi.fn().mockResolvedValue('http://storage.com/img1.jpg'),
    };

    global.fetch = vi.fn().mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    });

    useCase = new ScrapeUrlUseCase(
      [mockSource],
      mockRepository,
      mockConsolidationService,
      mockImageHasher,
      mockStorage,
    );
  });

  it('runs full CREATE flow: extract → consolidate → persist', async () => {
    await useCase.execute('https://example.com/property/123');

    expect(mockSource.canHandle).toHaveBeenCalled();
    expect(mockSource.extract).toHaveBeenCalled();
    expect(mockImageHasher.generateHash).toHaveBeenCalled();
    expect(mockConsolidationService.consolidate).toHaveBeenCalled();
    expect(mockRepository.create).toHaveBeenCalledWith(expect.any(ScrapedProvider));
    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it('runs MERGE flow: calls update with merged ScrapedProvider', async () => {
    const existingProvider = ScrapedProvider.create({
      vertical: Vertical.REAL_ESTATE,
      confidenceScore: ConfidenceScore.low(),
    });

    mockConsolidationService.consolidate.mockReturnValue({
      action: 'MERGE',
      target: existingProvider,
      confidence: ConfidenceScore.high(),
      signals: [],
    });

    await useCase.execute('https://example.com/property/123');

    expect(mockRepository.update).toHaveBeenCalledWith(
      existingProvider.id,
      expect.any(ScrapedProvider),
    );
    expect(mockRepository.create).not.toHaveBeenCalled();
  });

  it('does not persist when action is IGNORE', async () => {
    mockConsolidationService.consolidate.mockReturnValue({
      action: 'IGNORE',
      confidence: ConfidenceScore.low(),
      signals: [],
    });

    await useCase.execute('https://example.com/property/123');

    expect(mockRepository.create).not.toHaveBeenCalled();
    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it('throws when no adapter matches the URL', async () => {
    mockSource.canHandle.mockReturnValue(false);

    await expect(useCase.execute('https://unknown.com')).rejects.toThrow('No adapter for');
  });

  it('throws when robots.txt blocks the URL', async () => {
    mockSource.isAllowed.mockResolvedValue(false);

    await expect(useCase.execute('https://example.com/forbidden')).rejects.toThrow(
      'robots.txt blocks',
    );
  });
});
