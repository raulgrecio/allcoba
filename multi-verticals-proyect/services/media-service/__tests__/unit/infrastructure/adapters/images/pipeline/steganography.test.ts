import { describe, expect, it } from 'vitest';
import sharp from 'sharp';

import { steganographyAnalysis } from '#infrastructure/adapters/images/pipeline/steganography.js';

describe('steganography', () => {
  it('decodifica cadenas de texto LSB invisibles en el buffer de píxeles crudos', async () => {
    const width = 50;
    const height = 50;
    const channels = 4; // RGBA
    const totalPixels = width * height * channels;
    const rawBuffer = Buffer.alloc(totalPixels);

    // Escribir 'milanuncios\0' en los LSB de los canales.
    // 'milanuncios\0' tiene 12 bytes = 96 bits.
    const message = 'milanuncios\0';
    for (let charIdx = 0; charIdx < message.length; charIdx++) {
      const charCode = message.charCodeAt(charIdx);
      for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
        const bit = (charCode >> bitIdx) & 1;
        const pixelIdx = charIdx * 8 + bitIdx;
        rawBuffer[pixelIdx] = bit;
      }
    }

    const pngBuffer = await sharp(rawBuffer, {
      raw: {
        width,
        height,
        channels,
      },
    })
      .png()
      .toBuffer();

    const result = await steganographyAnalysis(pngBuffer);

    expect(result.stegoText).toBe('milanuncios');
    expect(result.hasStegoText).toBe(true);
  });

  it('retorna cadena vacía si el mensaje reconstruido contiene ruido o no tiene longitud suficiente', async () => {
    const width = 50;
    const height = 50;
    const channels = 4;
    const totalPixels = width * height * channels;
    const rawBuffer = Buffer.alloc(totalPixels);

    // Mensaje demasiado corto 'hola\0' (< 6 caracteres legibles)
    const message = 'hola\0';
    for (let charIdx = 0; charIdx < message.length; charIdx++) {
      const charCode = message.charCodeAt(charIdx);
      for (let bitIdx = 0; bitIdx < 8; bitIdx++) {
        const bit = (charCode >> bitIdx) & 1;
        const pixelIdx = charIdx * 8 + bitIdx;
        rawBuffer[pixelIdx] = bit;
      }
    }

    const pngBuffer = await sharp(rawBuffer, {
      raw: {
        width,
        height,
        channels,
      },
    })
      .png()
      .toBuffer();

    const result = await steganographyAnalysis(pngBuffer);
    expect(result.stegoText).toBe('');
    expect(result.hasStegoText).toBe(false);
  });

  it('retorna vacío de manera segura si ocurre un error inesperado al leer los píxeles', async () => {
    const result = await steganographyAnalysis(Buffer.from('corrupt_binary'));
    expect(result.stegoText).toBe('');
    expect(result.hasStegoText).toBe(false);
  });
});
