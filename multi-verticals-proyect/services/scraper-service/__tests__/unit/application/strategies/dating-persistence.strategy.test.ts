/**
 * Unit tests for DatingPersistenceStrategy.
 * Mocks: repo, imageHasher, storage. Real ConsolidationService.
 */

import { describe, expect, it, vi } from 'vitest';

import { asImageHash } from '@allcoba/shared-types';

import { DatingPersistenceStrategy } from '#application/strategies/dating-persistence.strategy.js';
import { ConsolidationService } from '#domain/services/canonical/consolidation.service.js';

import { buildProvider } from '../../helpers/scraped-provider.builder.js';

const CTX = { source: 'topescortbabes', url: 'https://topescortbabes.com/model/1' };

const makeRepo = (candidates: ReturnType<typeof buildProvider>[] = []) => ({
  find: vi.fn().mockResolvedValue(candidates),
  findById: vi.fn().mockResolvedValue(null),
  findByExternalRef: vi.fn().mockResolvedValue(null),
  create: vi.fn().mockResolvedValue(undefined),
  update: vi.fn().mockResolvedValue(undefined),
  updateById: vi.fn().mockResolvedValue(undefined),
});

const makeImageHasher = () => ({
  generateHash: vi.fn().mockResolvedValue('abc123hash'),
});

const makeStorage = () => ({
  upload: vi.fn().mockResolvedValue('https://r2.example.com/img.jpg'),
  delete: vi.fn(),
});

describe('DatingPersistenceStrategy.persist', () => {
  it('IGNORE when no externalRef', async () => {
    const strategy = new DatingPersistenceStrategy(
      makeRepo() as any,
      new ConsolidationService(),
      makeImageHasher() as any,
      makeStorage() as any,
    );
    const scraped = buildProvider({ externalRefs: [] });
    const result = await strategy.persist(scraped, CTX);
    expect(result.action).toBe('IGNORE');
  });

  it('CREATE on no candidates', async () => {
    const repo = makeRepo([]);
    const strategy = new DatingPersistenceStrategy(
      repo as any,
      new ConsolidationService(),
      makeImageHasher() as any,
      makeStorage() as any,
    );
    const scraped = buildProvider();
    const result = await strategy.persist(scraped, CTX);

    expect(result.action).toBe('CREATE');
    expect(repo.create).toHaveBeenCalledOnce();
  });

  it('MERGE on externalRef match', async () => {
    const REF = { source: 'topescortbabes', sourceId: 'model-1' };
    const existing = buildProvider({ externalRefs: [REF] });
    const repo = makeRepo([existing]);
    const strategy = new DatingPersistenceStrategy(
      repo as any,
      new ConsolidationService(),
      makeImageHasher() as any,
      makeStorage() as any,
    );
    const scraped = buildProvider({ externalRefs: [REF] });
    const result = await strategy.persist(scraped, CTX);

    expect(result.action).toBe('MERGE');
    expect(repo.updateById).toHaveBeenCalledOnce();
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('image dedup — reuses existing stored URL on hash hit', async () => {
    const hash = asImageHash('abc123hash');
    const existing = buildProvider({
      images: [{ hash, storedUrl: 'https://r2.example.com/existing.jpg', originalUrl: 'https://src.com/img.jpg' }],
    });
    const repo = makeRepo([]);
    repo.find.mockResolvedValue([existing]);

    const imageHasher = makeImageHasher();
    const storage = makeStorage();
    const strategy = new DatingPersistenceStrategy(
      repo as any,
      new ConsolidationService(),
      imageHasher as any,
      storage as any,
    );

    global.fetch = vi.fn().mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    }) as any;

    const scraped = buildProvider({
      photos: [{ id: '1', url: 'https://src.com/img.jpg', isPrimary: true, isVerified: false, order: 0 }],
    });
    await strategy.persist(scraped, CTX);

    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('image upload — calls storage when hash is new', async () => {
    const repo = makeRepo([]);
    repo.find.mockResolvedValue([]);
    const storage = makeStorage();
    const strategy = new DatingPersistenceStrategy(
      repo as any,
      new ConsolidationService(),
      makeImageHasher() as any,
      storage as any,
    );

    global.fetch = vi.fn().mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    }) as any;

    const scraped = buildProvider({
      photos: [{ id: '1', url: 'https://src.com/new.jpg', isPrimary: true, isVerified: false, order: 0 }],
    });
    await strategy.persist(scraped, CTX);

    expect(storage.upload).toHaveBeenCalledOnce();
  });

  it('maxImagesToProcess config limits image processing', async () => {
    const repo = makeRepo([]);
    const imageHasher = makeImageHasher();
    const strategy = new DatingPersistenceStrategy(
      repo as any,
      new ConsolidationService(),
      imageHasher as any,
      makeStorage() as any,
      { maxImagesToProcess: 2 },
    );

    global.fetch = vi.fn().mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    }) as any;

    const photos = Array.from({ length: 5 }, (_, i) => ({
      id: String(i),
      url: `https://src.com/img${i}.jpg`,
      isPrimary: i === 0,
      isVerified: false,
      order: i,
    }));
    const scraped = buildProvider({ photos });
    await strategy.persist(scraped, CTX);

    expect(imageHasher.generateHash).toHaveBeenCalledTimes(2);
  });
});
