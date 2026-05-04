import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryProviderRepository } from '@/infrastructure/adapters/persistence/in-memory-provider.repository.js';
import { Provider } from '@/domain/entities/provider.js';

describe('Unit: InMemoryProviderRepository', () => {
  let repository: InMemoryProviderRepository;

  beforeEach(() => {
    repository = new InMemoryProviderRepository();
  });

  const mockProvider: any = {
    id: 'uuid-1',
    displayName: 'Test Provider',
    phones: ['+34600000000'],
    telegram: '@test',
    images: [{ hash: 'hash1', url: 'img1.jpg' }],
    externalIds: { 'fotocasa': 'fc123' }
  };

  it('debería crear y encontrar un proveedor por ID', async () => {
    await repository.create(mockProvider);
    const found = await repository.findById('uuid-1');
    expect(found).toEqual(mockProvider);
  });

  it('debería encontrar proveedores por criterios (teléfono)', async () => {
    await repository.create(mockProvider);
    const results = await repository.find({ phone: '+34600000000' });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('uuid-1');
  });

  it('debería encontrar proveedores por criterios (externalId)', async () => {
    await repository.create(mockProvider);
    const results = await repository.find({ externalId: { source: 'fotocasa', id: 'fc123' } });
    expect(results).toHaveLength(1);
  });

  it('debería encontrar proveedores por criterios (imageHash)', async () => {
    await repository.create(mockProvider);
    const results = await repository.find({ imageHash: 'hash1' });
    expect(results).toHaveLength(1);
  });

  it('debería actualizar un proveedor existente', async () => {
    await repository.create(mockProvider);
    await repository.update('uuid-1', { displayName: 'Updated Name' });
    const found = await repository.findById('uuid-1');
    expect(found?.displayName).toBe('Updated Name');
    expect(found?.updatedAt).toBeDefined();
  });

  it('debería retornar null si no encuentra por ID', async () => {
    const found = await repository.findById('non-existent');
    expect(found).toBeNull();
  });
});
