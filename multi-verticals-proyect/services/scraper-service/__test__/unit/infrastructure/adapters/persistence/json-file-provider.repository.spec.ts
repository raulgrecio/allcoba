import fs from 'fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Provider } from '@scraper/domain/entities/provider.js';
import { JsonFileProviderRepository } from '@scraper/infrastructure/adapters/persistence/json-file-provider.repository.js';

vi.mock('fs/promises');

describe('Unit: JsonFileProviderRepository', () => {
  let repository: JsonFileProviderRepository;
  const fileName = 'test-providers.json';

  beforeEach(() => {
    vi.resetAllMocks();
    repository = new JsonFileProviderRepository({ fileName });
  });

  const mockProvider: Provider = {
    id: 'uuid-1',
    displayName: 'JSON Provider',
    price: 1000,
    phones: ['+34600000000'],
    externalIds: { fotocasa: 'fc123' },
    images: [{ hash: 'h1', url: 'img.jpg', originalUrl: 'http://img.jpg' }],
    vertical: 'real-estate' as any,
    verificationStatus: 'unverified' as any,
    signals: [],
    confidenceScore: 1,
    lastScrapedAt: new Date(),
    metadata: {} as any,
    attributes: {} as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('debería manejar errores de lectura retornando mapa vacío', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
    const found = await repository.findById('any');
    expect(found).toBeNull();
  });

  it('debería guardar y cargar proveedores desde archivo', async () => {
    // Simular que el archivo tiene un proveedor
    const mockFileContent = JSON.stringify([mockProvider]);
    vi.mocked(fs.readFile).mockResolvedValue(mockFileContent);

    const found = await repository.findById('uuid-1');

    expect(found).toBeDefined();
    expect(found?.displayName).toBe('JSON Provider');
  });

  it('debería persistir cambios al crear un proveedor', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('[]');
    vi.mocked(fs.writeFile).mockResolvedValue();

    await repository.create(mockProvider);

    expect(fs.writeFile).toHaveBeenCalled();
    const callArgs = vi.mocked(fs.writeFile).mock.calls[0];
    const savedData = JSON.parse(callArgs![1] as string);
    expect(savedData).toHaveLength(1);
    expect(savedData[0].id).toBe('uuid-1');
  });
});
