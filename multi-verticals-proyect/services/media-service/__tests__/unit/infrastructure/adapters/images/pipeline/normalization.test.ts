import { describe, expect, it } from 'vitest';
import sharp from 'sharp';

import { normalize } from '#infrastructure/adapters/images/pipeline/normalization.js';

describe('normalization', () => {
  it('convierte a WebP, genera miniatura, calcula SHA256 y pHash', async () => {
    const buffer = await sharp({
      create: {
        width: 200,
        height: 150,
        channels: 3,
        background: { r: 0, g: 255, b: 0 },
      },
    })
      .jpeg()
      .toBuffer();

    const result = await normalize(buffer);
    expect(result.format).toBe('webp');
    expect(result.width).toBe(200);
    expect(result.height).toBe(150);
    expect(result.sha256).toHaveLength(64);
    expect(result.phash).toHaveLength(16); // 64 bits en hexadecimal = 16 caracteres

    const thumbMeta = await sharp(result.thumbnailBuffer).metadata();
    expect(thumbMeta.width).toBe(150);
    expect(thumbMeta.height).toBe(150);
  });
});
