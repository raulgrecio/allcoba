import { describe, expect, it } from 'vitest';

import { logicDetector } from '#infrastructure/adapters/images/pipeline/logic-detector.js';

describe('logicDetector', () => {
  it('detecta teléfonos españoles, emails, URLs y marcas', async () => {
    const ocrText = 'Hola, mi teléfono es +34 600 11 22 33 y mi email es info@wallapop.com';
    const result = await logicDetector({ ocrText });

    expect(result.detected.phones).toContain('+34 600 11 22 33');
    expect(result.detected.emails).toContain('info@wallapop.com');
    expect(result.detected.brands).toContain('Wallapop');
    expect(result.flags.hasSensitiveData).toBe(true);
    expect(result.flags.hasText).toBe(true);
  });

  it('evalúa inyección de marcas en EXIF Software y Copyright', async () => {
    const exif = {
      software: 'Idealista Editor v1',
      copyright: 'Copyright Idealista S.A.',
    };

    const result = await logicDetector({ ocrText: 'casa bonita en venta', exif });

    expect(result.adapterAssessment.hasInjectedInfo).toBe(true);
    expect(result.adapterAssessment.injectedInfoTypes).toContain('exif_software');
    expect(result.adapterAssessment.injectedInfoTypes).toContain('exif_copyright');
    expect(result.adapterAssessment.injectedInfoDetails[0]).toContain('Idealista');
  });

  it('evalúa inyecciones de URLs en los píxeles (OCR)', async () => {
    const ocrText = 'Visita idealista.com para ver la oferta';
    const result = await logicDetector({ ocrText });

    expect(result.adapterAssessment.hasInjectedInfo).toBe(true);
    expect(result.adapterAssessment.injectedInfoTypes).toContain('ocr_watermark_brand');
    expect(result.adapterAssessment.injectedInfoTypes).toContain('url_matched');
  });
});
