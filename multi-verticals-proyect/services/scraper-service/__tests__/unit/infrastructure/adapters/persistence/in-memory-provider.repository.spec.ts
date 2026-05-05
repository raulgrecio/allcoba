import { beforeEach, describe, expect, it } from 'vitest';

import { type Provider } from '@scraper/domain/entities/provider.js';
import { Vertical } from '@scraper/domain/entities/vertical';
import { InMemoryProviderRepository } from '@scraper/infrastructure/adapters/persistence/in-memory-provider.repository.js';

describe('Unit: InMemoryProviderRepository', () => {
  let repository: InMemoryProviderRepository;

  beforeEach(() => {
    repository = new InMemoryProviderRepository();
  });

  const mockProvider: Provider = {
    id: 'test-uuid',
    displayName: 'Test Provider',
    price: 1000,
    phones: ['+34600000000'],
    telegram: '@test',
    images: [{ hash: 'hash1', url: 'img1.jpg', originalUrl: 'http://img1.jpg' }],
    externalIds: { fotocasa: 'fc123' },
    vertical: Vertical.REAL_ESTATE,
    verificationStatus: 'unverified' as any,
    signals: [],
    confidenceScore: 1.0,
    lastScrapedAt: new Date(),
    metadata: {} as Record<string, any>,
    attributes: {} as Record<string, any>,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('debería crear y encontrar un proveedor por ID', async () => {
    await repository.create(mockProvider);
    const found = await repository.findById(mockProvider.id);

    expect(found).toBeDefined();
    expect(found?.displayName).toBe(mockProvider.displayName);
  });

  it('debería encontrar por teléfono', async () => {
    await repository.create(mockProvider);
    const results = await repository.find({ phone: '+34600000000' });

    expect(results).toHaveLength(1);
    expect(results[0]!.phones).toContain('+34600000000');
  });

  it('debería encontrar por externalId', async () => {
    await repository.create(mockProvider);
    const results = await repository.find({
      externalId: {
        id: 'fc123',
        source: 'fotocasa',
      },
    });

    expect(results).toHaveLength(1);
    expect(results[0]!.externalIds.fotocasa).toBe('fc123');
  });

  it('debería encontrar por imageHash', async () => {
    await repository.create(mockProvider);
    const results = await repository.find({ imageHash: 'hash1' });

    expect(results).toHaveLength(1);
  });

  it('debería actualizar un proveedor existente', async () => {
    await repository.create(mockProvider);
    await repository.update(mockProvider.id, { price: 2000 });

    const updated = await repository.findById(mockProvider.id);
    expect(updated?.price).toBe(2000);
  });
});
