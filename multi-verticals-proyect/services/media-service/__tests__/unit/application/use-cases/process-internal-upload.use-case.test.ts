import { describe, expect, it, vi } from 'vitest';

import type { ImagePipelinePort } from '#application/ports/image-pipeline.port.js';
import type { ProcessedImageResult } from '#domain/canonical/processed-image-result.js';
import { ProcessInternalUploadUseCase } from '#application/use-cases/process-internal-upload.use-case.js';

describe('ProcessInternalUploadUseCase', () => {
  const mockResult: ProcessedImageResult = {
    id: 'test-id',
    url: 'internal://upload',
    status: 'ok',
    hashes: { sha256: 'sha256-hash', phash: 'phash-hash' },
    metadata: { format: 'webp', width: 100, height: 100, size: 5000 },
    ocrText: '',
    stegoText: '',
    detected: { phones: [], emails: [], urls: [], brands: [] },
    flags: { isNSFWCandidate: false, hasSensitiveData: false, hasText: false },
    adapterAssessment: { hasInjectedInfo: false, injectedInfoTypes: [], injectedInfoDetails: [] },
  };

  it('debería procesar la imagen subida en memoria', async () => {
    const mockPipeline: ImagePipelinePort = {
      process: vi.fn().mockResolvedValue(mockResult),
    };
    const useCase = new ProcessInternalUploadUseCase(mockPipeline);
    const buffer = Buffer.from('raw-image-buffer');

    const result = await useCase.execute({
      imageBuffer: buffer,
      sourceName: 'manual-upload',
    });

    expect(mockPipeline.process).toHaveBeenCalledWith(buffer, 'internal://upload', 'manual-upload');
    expect(result).toEqual(mockResult);
  });
});
