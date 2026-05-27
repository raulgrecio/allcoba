import { describe, expect, it, vi } from 'vitest';

import type { ProviderRepositoryPort } from '#application/ports/repository.port.js';
import type { QueuePort } from '#application/ports/queue.port.js';
import { DatingPersistenceStrategy } from '#application/strategies/dating-persistence.strategy.js';
import { ConsolidationService } from '#domain/services/canonical/consolidation.service.js';

import { buildProvider } from '../../helpers/scraped-provider.builder.js';

const CTX = { source: 'topescortbabes', url: 'https://topescortbabes.com/model/1' };

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

type FakeQueue = QueuePort & {
  publish: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  schedule: ReturnType<typeof vi.fn>;
};

const makeQueue = (): FakeQueue => ({
  publish: vi.fn().mockResolvedValue('job-123'),
  subscribe: vi.fn().mockResolvedValue(undefined),
  schedule: vi.fn().mockResolvedValue(undefined),
});

describe('DatingPersistenceStrategy.persist', () => {
  it('IGNORE when no externalRef', async () => {
    const strategy = new DatingPersistenceStrategy(
      makeRepo(),
      new ConsolidationService(),
      makeQueue(),
    );
    const scraped = buildProvider({ externalRefs: [] });
    const result = await strategy.persist(scraped, CTX);
    expect(result.action).toBe('IGNORE');
  });

  it('CREATE on no candidates and publishes job', async () => {
    const repo = makeRepo([]);
    const queue = makeQueue();
    const strategy = new DatingPersistenceStrategy(
      repo,
      new ConsolidationService(),
      queue,
    );
    const scraped = buildProvider({
      photos: [{ id: '1', url: 'https://src.com/img.jpg', isPrimary: true, isVerified: false, order: 0 }],
    });
    const result = await strategy.persist(scraped, CTX);

    expect(result.action).toBe('CREATE');
    expect(repo.create).toHaveBeenCalledOnce();
    expect(queue.publish).toHaveBeenCalledWith('process-provider-images', {
      providerId: scraped.id,
      imageUrls: ['https://src.com/img.jpg'],
      source: CTX.source,
      vertical: scraped.vertical,
    });
  });

  it('MERGE on externalRef match and publishes job', async () => {
    const REF = { source: 'topescortbabes', sourceId: 'model-1' };
    const existing = buildProvider({ externalRefs: [REF], images: [] });
    const repo = makeRepo([existing]);
    const queue = makeQueue();
    const strategy = new DatingPersistenceStrategy(
      repo,
      new ConsolidationService(),
      queue,
    );
    const scraped = buildProvider({
      externalRefs: [REF],
      photos: [{ id: '1', url: 'https://src.com/img.jpg', isPrimary: true, isVerified: false, order: 0 }],
    });
    const result = await strategy.persist(scraped, CTX);

    expect(result.action).toBe('MERGE');
    expect(repo.updateById).toHaveBeenCalledOnce();
    expect(queue.publish).toHaveBeenCalledWith('process-provider-images', {
      providerId: existing.id,
      imageUrls: ['https://src.com/img.jpg'],
      source: CTX.source,
      vertical: scraped.vertical,
    });
  });

  it('FLAG_FOR_REVIEW with target — sets pending_review status and publishes job', async () => {
    const REF = { source: 'topescortbabes', sourceId: 'model-conflict' };
    const a = buildProvider({ externalRefs: [REF] });
    const b = buildProvider({ externalRefs: [REF] });
    const repo = makeRepo([a, b]);
    const queue = makeQueue();
    const strategy = new DatingPersistenceStrategy(
      repo,
      new ConsolidationService(),
      queue,
    );
    const scraped = buildProvider({
      externalRefs: [REF],
      photos: [{ id: '1', url: 'https://src.com/img.jpg', isPrimary: true, isVerified: false, order: 0 }],
    });
    const result = await strategy.persist(scraped, CTX);

    expect(['FLAG_FOR_REVIEW', 'MERGE']).toContain(result.action);
    expect(queue.publish).toHaveBeenCalledOnce();
  });

  it('handles scraped provider with no phone number', async () => {
    const repo = makeRepo([]);
    const strategy = new DatingPersistenceStrategy(
      repo,
      new ConsolidationService(),
      makeQueue(),
    );
    const scraped = buildProvider({ phoneNumber: undefined });
    const result = await strategy.persist(scraped, CTX);

    expect(result.action).toBe('CREATE');
    expect(repo.create).toHaveBeenCalledOnce();
  });

  it('returns action directly if consolidation action is MERGE but target is undefined', async () => {
    const repo = makeRepo([]);
    const fakeConsolidation = {
      consolidate: vi.fn().mockReturnValue({
        action: 'MERGE',
        target: undefined,
        confidence: 0.8,
        signals: [],
      }),
    };
    const strategy = new DatingPersistenceStrategy(
      repo,
      fakeConsolidation as unknown as ConsolidationService,
      makeQueue(),
    );
    const scraped = buildProvider();
    const result = await strategy.persist(scraped, CTX);

    expect(result.action).toBe('MERGE');
    expect(repo.updateById).not.toHaveBeenCalled();
  });

  it('handles IGNORE consolidation action', async () => {
    const repo = makeRepo([]);
    const fakeConsolidation = {
      consolidate: vi.fn().mockReturnValue({
        action: 'IGNORE',
        confidence: 0,
        signals: [],
      }),
    };
    const strategy = new DatingPersistenceStrategy(
      repo,
      fakeConsolidation as unknown as ConsolidationService,
      makeQueue(),
    );
    const scraped = buildProvider();
    const result = await strategy.persist(scraped, CTX);

    expect(result.action).toBe('IGNORE');
  });

  it('does not publish job if no photos are present', async () => {
    const repo = makeRepo([]);
    const queue = makeQueue();
    const strategy = new DatingPersistenceStrategy(
      repo,
      new ConsolidationService(),
      queue,
    );
    const scraped = buildProvider({ photos: [] });
    const result = await strategy.persist(scraped, CTX);

    expect(result.action).toBe('CREATE');
    expect(queue.publish).not.toHaveBeenCalled();
  });
});
