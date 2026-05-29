import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';

import { LocalOcrAdapter } from '#infrastructure/adapters/images/local-ocr.adapter.js';

let mockOcrEnabled = false;

// Mock the config module to dynamically control ocrEnabled
vi.mock('#infrastructure/config/env.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('#infrastructure/config/env.js')>();
  return {
    ...original,
    config: new Proxy(original.config, {
      get(target, prop) {
        if (prop === 'ocrEnabled') {
          return mockOcrEnabled;
        }
        return Reflect.get(target, prop);
      },
    }),
  };
});

// Mock tesseract.js before tests run
vi.mock('tesseract.js', () => {
  return {
    default: {
      recognize: vi.fn().mockResolvedValue({
        data: {
          text: 'Tesseract OCR results here',
        },
      }),
    },
  };
});

describe('LocalOcrAdapter', () => {
  let adapter: LocalOcrAdapter;

  beforeEach(() => {
    adapter = new LocalOcrAdapter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('debería usar fallbackBinaryTextSweep si ocrEnabled es false', async () => {
    mockOcrEnabled = false;

    const buffer = Buffer.from('Contenido binario con un email@test.com y mas texto');
    const result = await adapter.extractText(buffer);

    expect(result).toContain('email@test.com');
  });

  it('debería ejecutar el flujo de Tesseract OCR si ocrEnabled es true', async () => {
    mockOcrEnabled = true;

    const buffer = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 0, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();

    const result = await adapter.extractText(buffer);

    expect(result).toContain('Tesseract OCR results here');
  });

  it('debería usar fallbackBinaryTextSweep si Tesseract falla', async () => {
    mockOcrEnabled = true;

    const { default: Tesseract } = await import('tesseract.js');
    vi.mocked(Tesseract.recognize).mockRejectedValue(new Error('Tesseract failed'));

    const buffer = Buffer.from('Contenido binario milanuncios.com');
    const result = await adapter.extractText(buffer);

    expect(result).toContain('milanuncios.com');
  });
});
