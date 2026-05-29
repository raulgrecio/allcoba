import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';

import { ImagePipelineAdapter } from '#infrastructure/adapters/images/image-pipeline.adapter.js';
import { initialFilter } from '#infrastructure/adapters/images/pipeline/initial-filter.js';

vi.mock('#infrastructure/adapters/images/pipeline/initial-filter.js', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('#infrastructure/adapters/images/pipeline/initial-filter.js')
    >();
  return {
    ...actual,
    initialFilter: vi.fn(actual.initialFilter),
  };
});

describe('ImagePipelineAdapter', () => {
  it('orquesta secuencialmente las etapas y entrega el objeto aprobado', async () => {
    const buffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 0, g: 0, b: 255 },
      },
    })
      .png()
      .toBuffer();

    const pipeline = new ImagePipelineAdapter();
    const result = await pipeline.process(buffer, 'https://src.com/foto1.png', 'milescorts');

    expect(result.status).toBe('ok');
    expect(result.hashes.sha256).toHaveLength(64);
    expect(result.metadata.format).toBe('webp');
    expect(result.metadata.width).toBe(100);
    expect(result.normalizedBuffer).toBeDefined();
    expect(result.thumbnailBuffer).toBeDefined();
  });

  it('retorna rechazado si el filtro inicial falla (ej: buffer vacío)', async () => {
    const pipeline = new ImagePipelineAdapter();
    const result = await pipeline.process(Buffer.alloc(0), 'https://src.com/empty.png');

    expect(result.status).toBe('rejected');
    expect(result.rejectReason).toContain('empty');
  });

  it('retorna rechazado si ocurre un error inesperado (ej: buffer nulo)', async () => {
    const pipeline = new ImagePipelineAdapter();

    // Forzar excepción mockeando initialFilter
    vi.mocked(initialFilter).mockRejectedValueOnce(new Error('Unexpected system error'));

    const result = await pipeline.process(Buffer.alloc(0), 'https://src.com/error.png');

    expect(result.status).toBe('rejected');
    expect(result.rejectReason).toContain('Unexpected error: Unexpected system error');
  });
});
