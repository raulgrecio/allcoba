import { describe, expect, it } from 'vitest';
import sharp from 'sharp';

import { initialFilter } from '#infrastructure/adapters/images/pipeline/initial-filter.js';

describe('initialFilter', () => {
  it('aprueba imágenes PNG/JPEG/WebP válidas con dimensiones >= 50px', async () => {
    const buffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();

    const result = await initialFilter(buffer);
    expect(result.isValid).toBe(true);
    expect(result.metadata?.format).toBe('png');
    expect(result.metadata?.width).toBe(100);
  });

  it('rechaza imágenes de formato no soportado (ej. GIF)', async () => {
    const buffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .gif()
      .toBuffer();

    const result = await initialFilter(buffer);
    expect(result.isValid).toBe(false);
    expect(result.rejectReason?.toLowerCase()).toContain('gif');
  });

  it('rechaza imágenes con dimensiones ridículas (< 50px)', async () => {
    const buffer = await sharp({
      create: {
        width: 40,
        height: 100,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();

    const result = await initialFilter(buffer);
    expect(result.isValid).toBe(false);
    expect(result.rejectReason).toContain('Dimensions too small');
  });

  it('rechaza archivos corruptos', async () => {
    const corruptBuffer = Buffer.from('archivo_completamente_roto_no_imagen');
    const result = await initialFilter(corruptBuffer);
    expect(result.isValid).toBe(false);
    expect(result.rejectReason).toContain('Corrupted file');
  });
});
