import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ScrapeUrlUseCase } from '@/application/use-cases/scrape-url.use-case.js';
import { Vertical } from '@/domain/entities/vertical.js';

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
          metadata: {},
          attributes: {}
        },
        html: '<html></html>'
      })
    };

    mockRepository = {
      find: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({}),
      findById: vi.fn(),
      update: vi.fn()
    };

    mockConsolidationService = {
      consolidate: vi.fn().mockReturnValue({
        action: 'CREATE',
        mergedData: { displayName: 'Test Property' },
        newSignals: [],
        confidenceScore: 1.0
      })
    };

    mockImageHasher = {
      generateHash: vi.fn().mockResolvedValue('fake-hash')
    };

    mockStorage = {
      upload: vi.fn().mockResolvedValue('http://storage.com/img1.jpg')
    };

    // Mock fetch global
    global.fetch = vi.fn().mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
    });

    useCase = new ScrapeUrlUseCase(
      [mockSource],
      mockRepository,
      mockConsolidationService,
      mockImageHasher,
      mockStorage
    );
  });

  it('debería ejecutar el flujo completo de scraping con éxito', async () => {
    const url = 'https://example.com/property/123';

    await useCase.execute(url);

    expect(mockSource.canHandle).toHaveBeenCalledWith(url);
    expect(mockSource.extract).toHaveBeenCalledWith(url, expect.any(Object));
    expect(mockImageHasher.generateHash).toHaveBeenCalled();
    expect(mockStorage.upload).toHaveBeenCalled(); // Para el HTML y la imagen
    expect(mockConsolidationService.consolidate).toHaveBeenCalled();
    expect(mockRepository.create).toHaveBeenCalled();
  });

  it('debería ejecutar el flujo de MERGE cuando hay una coincidencia alta', async () => {
    mockConsolidationService.consolidate.mockReturnValue({
      action: 'MERGE',
      targetProviderId: 'existing-uuid',
      mergedData: { phones: ['+34600000000'] },
      newSignals: [],
      confidenceScore: 0.98
    });

    mockRepository.findById.mockResolvedValue({ id: 'existing-uuid', images: [] });

    await useCase.execute('https://example.com/property/123');

    expect(mockRepository.findById).toHaveBeenCalledWith('existing-uuid');
    expect(mockRepository.update).toHaveBeenCalled();
  });

  it('debería ejecutar el flujo de IGNORE cuando la confianza es baja', async () => {
    mockConsolidationService.consolidate.mockReturnValue({
      action: 'IGNORE',
      confidenceScore: 0.1,
      newSignals: [],
      mergedData: {}
    });

    await useCase.execute('https://example.com/property/123');

    expect(mockRepository.create).not.toHaveBeenCalled();
    expect(mockRepository.update).not.toHaveBeenCalled();
  });

  it('debería lanzar error si no hay adaptador para la URL', async () => {
    mockSource.canHandle.mockReturnValue(false);

    await expect(useCase.execute('https://unknown.com'))
      .rejects.toThrow('No se encontró un adaptador');
  });

  it('debería lanzar error si robots.txt lo prohíbe', async () => {
    mockSource.isAllowed.mockResolvedValue(false);

    await expect(useCase.execute('https://example.com/forbidden'))
      .rejects.toThrow('restringido por robots.txt');
  });
});
