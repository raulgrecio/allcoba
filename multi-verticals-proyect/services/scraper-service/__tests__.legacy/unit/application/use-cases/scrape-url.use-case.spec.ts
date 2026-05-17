import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ImageHash, unwrap } from '@allcoba/legacy-domain';

import { ScrapeUrlUseCase } from '#application/use-cases/scrape-url.use-case.js';
import { ScrapedProvider } from '#domain/aggregates/scraped-provider.aggregate.js';
import { Vertical } from '#domain/entities/vertical.js';
import { ConfidenceScore } from '#domain/value-objects/confidence-score.vo.js';

const VALID_PHASH = 'abcdef0123456789'; // 16 lowercase hex = valid pHash

describe('Unit: ScrapeUrlUseCase', () => {
  let mockSource: any;
  let mockSourceResolver: any;
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
          location: { country: 'ES' },
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

    mockSourceResolver = { resolve: vi.fn().mockResolvedValue(mockSource) };

    useCase = new ScrapeUrlUseCase(
      mockSourceResolver,
      mockRepository,
      mockConsolidationService,
      mockImageHasher,
      mockStorage,
    );
  });

  it('runs full CREATE flow: extract → consolidate → persist', async () => {
    await useCase.execute('https://example.com/property/123');

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
    mockSourceResolver.resolve.mockRejectedValue(new Error('No adapter for https://unknown.com'));

    await expect(useCase.execute('https://unknown.com')).rejects.toThrow('No adapter for');
  });

  it('throws when robots.txt blocks the URL', async () => {
    mockSource.isAllowed.mockResolvedValue(false);

    await expect(useCase.execute('https://example.com/forbidden')).rejects.toThrow(
      'robots.txt blocks',
    );
  });

  it('logs debug when email is invalid', async () => {
    mockSource.extract.mockResolvedValue({
      data: {
        source: 'test-source',
        externalId: '123',
        phones: ['+34600000000'],
        imageUrls: [],
        vertical: Vertical.REAL_ESTATE,
        email: 'invalid-email',
        location: { country: 'ES' },
        metadata: { timestamp: '', durationMs: 0, sourceUrl: '', userAgent: '', statusCode: 200 },
        attributes: {},
      },
      html: '<html></html>',
    });
    const loggerSpy = vi.spyOn(useCase['logger'], 'debug');

    await useCase.execute('https://example.com/property/123');

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.objectContaining({ raw: 'invalid-email' }),
      'Skipping invalid email',
    );
  });

  it('reuses existing image if hash already exists in repository', async () => {
    const existingProvider = ScrapedProvider.create({
      vertical: Vertical.REAL_ESTATE,
      confidenceScore: ConfidenceScore.high(),
      images: [
        {
          hash: unwrap(ImageHash.create(VALID_PHASH)),
          storedUrl: 'http://already-stored.com/img.jpg',
          originalUrl: 'http://old.com/img.jpg',
        },
      ],
    });

    mockRepository.find.mockResolvedValueOnce([existingProvider]); // First call for processing images

    await useCase.execute('https://example.com/property/123');

    expect(mockStorage.upload).not.toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringContaining('.jpg'),
      'image/jpeg',
    );
  });

  it('handles image processing errors gracefully', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const loggerSpy = vi.spyOn(useCase['logger'], 'error');

    await useCase.execute('https://example.com/property/123');

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(Error) }),
      'Error processing image',
    );
  });

  it('saves debug snapshots when configured', async () => {
    const debugUseCase = new ScrapeUrlUseCase(
      mockSourceResolver,
      mockRepository,
      mockConsolidationService,
      mockImageHasher,
      mockStorage,
      { saveRawHtml: true, saveDebugSnapshots: true },
    );

    mockSource.extract.mockImplementation(async (url: string, opts: any) => {
      await opts.onSnapshot('<html>stage1</html>', 'initial');
      return {
        data: {
          source: 'test-source',
          externalId: '123',
          phones: [],
          imageUrls: [],
          vertical: Vertical.REAL_ESTATE,
          location: { country: 'ES' },
          metadata: { timestamp: '', durationMs: 0, sourceUrl: '', userAgent: '', statusCode: 200 },
          attributes: {},
        },
        html: '<html>final</html>',
      };
    });

    await debugUseCase.execute('https://example.com/p1');

    expect(mockStorage.upload).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringContaining('test-source_p1_'),
      'text/html',
    );
    expect(mockStorage.upload).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringContaining('_initial_debug.html'),
      'text/html',
    );
    expect(mockStorage.upload).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.stringContaining('test-source_123.html'),
      'text/html',
    );
  });
});
