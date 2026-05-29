import { describe, expect, it } from 'vitest';
import sharp from 'sharp';

import { ExifReader } from '#infrastructure/adapters/images/exif-reader.js';
import { ImagePipelineAdapter } from '#infrastructure/adapters/images/image-pipeline.adapter.js';
import { initialFilter } from '#infrastructure/adapters/images/pipeline/initial-filter.js';
import { logicDetector } from '#infrastructure/adapters/images/pipeline/logic-detector.js';
import { normalize } from '#infrastructure/adapters/images/pipeline/normalization.js';
import { ocr } from '#infrastructure/adapters/images/pipeline/ocr.js';

describe('ImagePipeline - Stage 1: Filtro Inicial', () => {
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

describe('ImagePipeline - Stage 2: Normalización', () => {
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

describe('ExifReader (Nativo Binario) y Stage 3: Análisis EXIF', () => {
  it('decodifica e ignora adecuadamente bloques vacíos u offsets fuera de rango', async () => {
    const parser = new ExifReader();
    const result = await parser.parse(Buffer.alloc(10));
    expect(result).toBeUndefined();
  });

  it('decodifica cabeceras TIFF en buffers EXIF de prueba', async () => {
    // Generar un buffer EXIF simple estructurado en Little Endian (II) para simular tags EXIF
    const exifBuffer = Buffer.alloc(100);
    exifBuffer.write('Exif\0\0', 0); // Omitir cabecera Exif
    exifBuffer.write('II', 6); // Little Endian
    exifBuffer.writeUInt16LE(0x002a, 8); // Magic number TIFF
    exifBuffer.writeUInt32LE(8, 10); // Offset a IFD0 (8 bytes desde tiffHeader en offset 6 = offset 14 en exifBuffer)

    // IFD0: 2 tags (Software, Artist)
    exifBuffer.writeUInt16LE(2, 14); // count of fields

    // Tag 1: 0x0131 (Software), Type 2 (ASCII), count 11, Offset 44
    exifBuffer.writeUInt16LE(0x0131, 16);
    exifBuffer.writeUInt16LE(2, 18);
    exifBuffer.writeUInt32LE(11, 20);
    exifBuffer.writeUInt32LE(44, 24);

    // Tag 2: 0x013b (Artist), Type 2 (ASCII), count 9, Offset 56
    exifBuffer.writeUInt16LE(0x013b, 28);
    exifBuffer.writeUInt16LE(2, 30);
    exifBuffer.writeUInt32LE(9, 32);
    exifBuffer.writeUInt32LE(56, 36);

    // Offset a siguiente IFD = 0 (4 bytes)
    exifBuffer.writeUInt32LE(0, 40);

    // Contenidos ASCII de los offsets (relativos al tiffOffset 6)
    exifBuffer.write('MilAnuncios\0', 50); // Software en offset 6+44 = 50
    exifBuffer.write('John Doe\0', 62); // Artist en offset 6+56 = 62

    const parser = new ExifReader();
    const parsed = await parser.parse(exifBuffer);

    expect(parsed).toBeDefined();
    expect(parsed?.software).toBe('MilAnuncios');
    expect(parsed?.author).toBe('John Doe');
  });
});

describe('ImagePipeline - Stage 3b: Esteganografía LSB', () => {
  it('decodifica cadenas de texto LSB invisibles en el buffer de píxeles crudos', async () => {
    // Generar un canvas de 50x50 para pasar el filtro mínimo de dimensión
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
        // Inyectamos el bit en el LSB de este color
        rawBuffer[pixelIdx] = bit;
      }
    }

    // Crear un PNG buffer usando sharp a partir de los datos crudos
    const pngBuffer = await sharp(rawBuffer, {
      raw: {
        width,
        height,
        channels,
      },
    })
      .png()
      .toBuffer();

    const pipeline = new ImagePipelineAdapter();
    const result = await pipeline.process(pngBuffer, 'https://src.com/stego.png');

    expect(result.status).toBe('ok');
    expect(result.stegoText).toBe('milanuncios');
    expect(result.detected.brands).toContain('MilAnuncios');
    expect(result.adapterAssessment.hasInjectedInfo).toBe(true);
    expect(result.adapterAssessment.injectedInfoTypes).toContain('stego_hidden_brand');
  });
});

describe('ImagePipeline - Stage 4: OCR', () => {
  it('realiza barrido de texto sobre caracteres legibles del buffer', async () => {
    // Generar un buffer que contenga palabras legibles en binario
    const buffer = Buffer.from(
      'Cabecera... milanuncios.com ... y mas texto con un email@ejemplo.com ... fin',
    );
    const result = await ocr(buffer);

    expect(result.ocrText).toContain('milanuncios.com');
    expect(result.ocrText).toContain('email@ejemplo.com');
  });
});

describe('ImagePipeline - Stage 5: Logic Detector e Inyección', () => {
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

describe('ImagePipeline - Orquestador Completo', () => {
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
