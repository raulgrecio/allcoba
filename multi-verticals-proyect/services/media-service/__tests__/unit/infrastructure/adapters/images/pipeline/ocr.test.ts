import { describe, expect, it } from 'vitest';

import { ocr } from '#infrastructure/adapters/images/pipeline/ocr.js';

describe('ocr pipeline stage', () => {
  it('realiza barrido de texto sobre caracteres legibles del buffer', async () => {
    const buffer = Buffer.from(
      'Cabecera... milanuncios.com ... y mas texto con un email@ejemplo.com ... fin',
    );
    const result = await ocr(buffer);

    expect(result.ocrText).toContain('milanuncios.com');
    expect(result.ocrText).toContain('email@ejemplo.com');
  });

  it('retorna texto vacío si ocurre un error inesperado al procesar la imagen', async () => {
    // Pasar un buffer nulo para causar una excepción en el constructor o el procesamiento
    const result = await ocr(null as any);
    expect(result.ocrText).toBe('');
  });
});
