import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JsonFileProviderRepository } from '@/infrastructure/adapters/persistence/json-file-provider.repository.js';
import fs from 'fs/promises';

vi.mock('fs/promises');

describe('Unit: JsonFileProviderRepository', () => {
  let repository: JsonFileProviderRepository;
  const fileName = 'test-providers.json';

  beforeEach(() => {
    vi.resetAllMocks();
    repository = new JsonFileProviderRepository({ fileName });
  });

  const mockProvider: any = {
    id: 'uuid-1',
    displayName: 'JSON Provider',
    phones: ['+34600000000'],
    externalIds: { 'fotocasa': 'fc123' },
    images: [{ hash: 'h1' }],
    vertical: 'real-estate'
  };

  it('debería manejar errores de lectura retornando mapa vacío', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'));
    const found = await repository.findById('any');
    expect(found).toBeNull();
  });

  it('debería buscar proveedores por diferentes criterios', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify([mockProvider]));
    
    const byPhone = await repository.find({ phone: '+34600000000' });
    expect(byPhone).toHaveLength(1);

    const byVertical = await repository.find({ vertical: 'real-estate' });
    expect(byVertical).toHaveLength(1);

    const byExternalId = await repository.find({ externalId: { source: 'fotocasa', id: 'fc123' } });
    expect(byExternalId).toHaveLength(1);

    const byImage = await repository.find({ imageHash: 'h1' });
    expect(byImage).toHaveLength(1);
  });

  it('debería crear un proveedor y guardarlo', async () => {
    vi.mocked(fs.readFile).mockResolvedValue('[]');
    await repository.create(mockProvider);
    expect(fs.writeFile).toHaveBeenCalled();
  });

  it('debería actualizar un proveedor existente', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify([mockProvider]));
    await repository.update('uuid-1', { displayName: 'Updated' });
    expect(fs.writeFile).toHaveBeenCalled();
  });
});
