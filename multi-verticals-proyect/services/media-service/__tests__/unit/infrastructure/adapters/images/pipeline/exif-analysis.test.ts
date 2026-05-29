import { describe, expect, it, vi } from 'vitest';

import { exifAnalysis } from '#infrastructure/adapters/images/pipeline/exif-analysis.js';

// Mock sharp to return custom EXIF metadata
vi.mock('sharp', () => {
  return {
    default: vi.fn().mockReturnValue({
      metadata: vi.fn().mockResolvedValue({
        exif: Buffer.from('Exif\0\0II\x2a\0\x08\0\0\0\0\0\0\0'),
      }),
    }),
  };
});

describe('exifAnalysis', () => {
  it('debería instanciar ExifReader y procesar el exif si la metadata lo contiene', async () => {
    const buffer = Buffer.alloc(10);
    const result = await exifAnalysis(buffer);
    expect(result).toBeDefined(); // El parser logra decodificar una cabecera vacía y retorna un objeto definido
  });
});
