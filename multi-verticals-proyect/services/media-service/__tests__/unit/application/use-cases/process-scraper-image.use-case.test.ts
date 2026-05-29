import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ImagePipelinePort } from '#application/ports/image-pipeline.port.js';
import type { ProcessedImageResult } from '#domain/canonical/processed-image-result.js';
import { ProcessScraperImageUseCase } from '#application/use-cases/process-scraper-image.use-case.js';

describe('ProcessScraperImageUseCase', () => {
  const mockResult: ProcessedImageResult = {
    id: 'test-id',
    url: 'https://test.com/image.jpg',
    status: 'ok',
    hashes: { sha256: 'sha256-hash', phash: 'phash-hash' },
    metadata: { format: 'webp', width: 100, height: 100, size: 5000 },
    ocrText: '',
    stegoText: '',
    detected: { phones: [], emails: [], urls: [], brands: [] },
    flags: { isNSFWCandidate: false, hasSensitiveData: false, hasText: false },
    adapterAssessment: { hasInjectedInfo: false, injectedInfoTypes: [], injectedInfoDetails: [] },
  };

  let mockPipeline: ImagePipelinePort;
  let useCase: ProcessScraperImageUseCase;

  beforeEach(() => {
    mockPipeline = {
      process: vi.fn().mockResolvedValue(mockResult),
    };
    useCase = new ProcessScraperImageUseCase(mockPipeline);
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('debería descargar la imagen externa y procesarla con éxito', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(10)),
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    const result = await useCase.execute({
      imageUrl: 'https://test.com/image.jpg',
      sourceName: 'erosguia',
    });

    expect(fetch).toHaveBeenCalledWith('https://test.com/image.jpg');
    expect(mockPipeline.process).toHaveBeenCalledWith(
      expect.any(Buffer),
      'https://test.com/image.jpg',
      'erosguia',
    );
    expect(result).toEqual(mockResult);
  });

  it('debería rechazar si la descarga de la URL falla (HTTP != 200)', async () => {
    const mockResponse = {
      ok: false,
      status: 404,
    };
    vi.mocked(fetch).mockResolvedValue(mockResponse as any);

    const result = await useCase.execute({
      imageUrl: 'https://test.com/nonexistent.jpg',
    });

    expect(fetch).toHaveBeenCalledWith('https://test.com/nonexistent.jpg');
    expect(mockPipeline.process).not.toHaveBeenCalled();
    expect(result.status).toBe('rejected');
    expect(result.rejectReason).toContain('HTTP status: 404');
  });

  it('debería rechazar si ocurre un error inesperado al descargar', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

    const result = await useCase.execute({
      imageUrl: 'https://test.com/error.jpg',
    });

    expect(result.status).toBe('rejected');
    expect(result.rejectReason).toContain('Unexpected error: Network error');
  });
});
