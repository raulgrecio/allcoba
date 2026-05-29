import { describe, expect, it } from 'vitest';
import sharp from 'sharp';

import { ImagePipelineAdapter } from '#infrastructure/adapters/images/image-pipeline.adapter.js';

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
});
