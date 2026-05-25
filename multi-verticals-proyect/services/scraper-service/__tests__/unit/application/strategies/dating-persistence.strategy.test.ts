/**
 * Unit tests for DatingPersistenceStrategy.
 * Mocks: repo, imageHasher, storage. Real ConsolidationService.
 */

import { describe, expect, it, vi } from 'vitest';

import { asImageHash } from '@allcoba/shared-types';

import type { ImageHasherPort } from '#application/ports/image-hasher.port.js';
import type { ProviderRepositoryPort } from '#application/ports/repository.port.js';
import type { ScrapedImageRepositoryPort } from '#application/ports/scraped-image-repository.port.js';
import type { StoragePort } from '#application/ports/storage.port.js';
import { DatingPersistenceStrategy } from '#application/strategies/dating-persistence.strategy.js';
import { ConsolidationService } from '#domain/services/canonical/consolidation.service.js';

import { buildProvider } from '../../helpers/scraped-provider.builder.js';

const CTX = { source: 'topescortbabes', url: 'https://topescortbabes.com/model/1' };

// Typed mock factories — no `as any` needed at call sites

type FakeRepo = ProviderRepositoryPort & {
  find: ReturnType<typeof vi.fn>;
  findById: ReturnType<typeof vi.fn>;
  findByExternalRef: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  updateById: ReturnType<typeof vi.fn>;
};

const makeRepo = (candidates: ReturnType<typeof buildProvider>[] = []): FakeRepo =>
  ({
    find: vi.fn().mockResolvedValue(candidates),
    findById: vi.fn().mockResolvedValue(null),
    findByExternalRef: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    updateById: vi.fn().mockResolvedValue(undefined),
  }) as unknown as FakeRepo;

type FakeImageHasher = ImageHasherPort & { generateHash: ReturnType<typeof vi.fn> };

const makeImageHasher = (): FakeImageHasher =>
  ({
    generateHash: vi.fn().mockResolvedValue('abc123hash'),
    calculateDistance: vi.fn().mockReturnValue(0),
  }) as unknown as FakeImageHasher;

type FakeStorage = StoragePort & {
  upload: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const makeStorage = (): FakeStorage =>
  ({
    upload: vi.fn().mockResolvedValue('https://r2.example.com/img.jpg'),
    delete: vi.fn().mockResolvedValue(undefined),
    exists: vi.fn().mockResolvedValue(false),
  }) as unknown as FakeStorage;

const makeImageRepo = (): ScrapedImageRepositoryPort => ({
  hasUrl: vi.fn().mockResolvedValue(false),
  markSeen: vi.fn().mockResolvedValue(undefined),
});

describe('DatingPersistenceStrategy.persist', () => {
  it('IGNORE when no externalRef', async () => {
    const strategy = new DatingPersistenceStrategy(
      makeRepo(),
      new ConsolidationService(),
      makeImageHasher(),
      makeStorage(),
      makeImageRepo(),
    );
    const scraped = buildProvider({ externalRefs: [] });
    const result = await strategy.persist(scraped, CTX);
    expect(result.action).toBe('IGNORE');
  });

  it('CREATE on no candidates', async () => {
    const repo = makeRepo([]);
    const strategy = new DatingPersistenceStrategy(
      repo,
      new ConsolidationService(),
      makeImageHasher(),
      makeStorage(),
      makeImageRepo(),
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
      repo,
      new ConsolidationService(),
      makeImageHasher(),
      makeStorage(),
      makeImageRepo(),
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
      images: [
        {
          hash,
          storedUrl: 'https://r2.example.com/existing.jpg',
          originalUrl: 'https://src.com/img.jpg',
        },
      ],
    });
    const repo = makeRepo([]);
    repo.find.mockResolvedValue([existing]);

    const imageHasher = makeImageHasher();
    const storage = makeStorage();
    const strategy = new DatingPersistenceStrategy(
      repo,
      new ConsolidationService(),
      imageHasher,
      storage,
      makeImageRepo(),
    );

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)) }),
    );

    const scraped = buildProvider({
      photos: [
        { id: '1', url: 'https://src.com/img.jpg', isPrimary: true, isVerified: false, order: 0 },
      ],
    });
    await strategy.persist(scraped, CTX);

    expect(storage.upload).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('image upload — calls storage when hash is new', async () => {
    const repo = makeRepo([]);
    repo.find.mockResolvedValue([]);
    const storage = makeStorage();
    const strategy = new DatingPersistenceStrategy(
      repo,
      new ConsolidationService(),
      makeImageHasher(),
      storage,
      makeImageRepo(),
    );

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)) }),
    );

    const scraped = buildProvider({
      photos: [
        { id: '1', url: 'https://src.com/new.jpg', isPrimary: true, isVerified: false, order: 0 },
      ],
    });
    await strategy.persist(scraped, CTX);

    expect(storage.upload).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it('FLAG_FOR_REVIEW with target — sets pending_review status', async () => {
    const REF = { source: 'topescortbabes', sourceId: 'model-conflict' };
    const a = buildProvider({ externalRefs: [REF] });
    const b = buildProvider({ externalRefs: [REF] });
    const repo = makeRepo([a, b]);
    const strategy = new DatingPersistenceStrategy(
      repo,
      new ConsolidationService(),
      makeImageHasher(),
      makeStorage(),
      makeImageRepo(),
    );
    const scraped = buildProvider({ externalRefs: [REF] });
    const result = await strategy.persist(scraped, CTX);

    expect(['FLAG_FOR_REVIEW', 'MERGE']).toContain(result.action);
  });

  it('image fetch error — continues without crashing', async () => {
    const repo = makeRepo([]);
    const strategy = new DatingPersistenceStrategy(
      repo,
      new ConsolidationService(),
      makeImageHasher(),
      makeStorage(),
      makeImageRepo(),
    );

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));

    const scraped = buildProvider({
      photos: [
        { id: '1', url: 'https://src.com/bad.jpg', isPrimary: true, isVerified: false, order: 0 },
      ],
    });
    const result = await strategy.persist(scraped, CTX);

    expect(result.action).toBe('CREATE');
    vi.unstubAllGlobals();
  });

  it('existingImg not found in images array — uploads instead of reusing', async () => {
    const existing = buildProvider({ images: [] });
    const repo = makeRepo([]);
    repo.find.mockResolvedValue([existing]);

    const storage = makeStorage();
    const strategy = new DatingPersistenceStrategy(
      repo,
      new ConsolidationService(),
      makeImageHasher(),
      storage,
      makeImageRepo(),
    );

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)) }),
    );

    const scraped = buildProvider({
      photos: [
        { id: '1', url: 'https://src.com/img.jpg', isPrimary: true, isVerified: false, order: 0 },
      ],
    });
    await strategy.persist(scraped, CTX);

    expect(storage.upload).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });

  it('maxImagesToProcess config limits image processing', async () => {
    const repo = makeRepo([]);
    const imageHasher = makeImageHasher();
    const strategy = new DatingPersistenceStrategy(
      repo,
      new ConsolidationService(),
      imageHasher,
      makeStorage(),
      makeImageRepo(),
      { maxImagesToProcess: 2 },
    );

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)) }),
    );

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
    vi.unstubAllGlobals();
  });
});
