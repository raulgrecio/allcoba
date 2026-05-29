import { createHash } from 'crypto';

import type { ImagePipelinePort } from '#application/ports/image-pipeline.port.js';
import type { ProcessedImageResult } from '#domain/canonical/processed-image-result.js';

import { exifAnalysis } from './pipeline/exif-analysis.js';
import { initialFilter } from './pipeline/initial-filter.js';
import { logicDetector } from './pipeline/logic-detector.js';
import { normalize } from './pipeline/normalization.js';
import { ocr } from './pipeline/ocr.js';
import { steganographyAnalysis } from './pipeline/steganography.js';

export class ImagePipelineAdapter implements ImagePipelinePort {
  /**
   * Orquesta las 5 etapas del procesamiento:
   *  1. Filtro Crítico (Etapa 1): Rechaza imágenes corruptas/pequeñas/GIFs/animaciones inmediatamente.
   *  2. Normalización (Etapa 2): Convierte a WebP optimizado, genera miniaturas, saca SHA256 y pHash.
   *  3. Análisis EXIF (Etapa 3): Lee cabeceras TIFF nativas para GPS y metadatos invisibles.
   *  4. OCR (Etapa 4): Extrae marcas de agua textuales y cadenas legibles.
   *  5. Detector Lógico (Etapa 5): Heurísticas regex para datos sensibles e inyecciones de marca.
   */
  async process(buffer: Buffer, url: string, sourceName?: string): Promise<ProcessedImageResult> {
    // Generar un ID hash determinista corto para identificar el trabajo de procesamiento
    const id = createHash('sha256')
      .update(url + String(Math.random()))
      .digest('hex')
      .substring(0, 16);

    try {
      // 1. FILTRO INICIAL (CRÍTICO)
      const filterResult = await initialFilter(buffer);
      if (!filterResult.isValid) {
        return {
          id,
          url,
          status: 'rejected',
          rejectReason: filterResult.rejectReason || 'MIME/Format screening failed',
          hashes: { sha256: '', phash: '' },
          metadata: { format: '', width: 0, height: 0, size: buffer.length },
          ocrText: '',
          stegoText: '',
          detected: { phones: [], emails: [], urls: [], brands: [] },
          flags: { isNSFWCandidate: false, hasSensitiveData: false, hasText: false },
          adapterAssessment: {
            hasInjectedInfo: false,
            injectedInfoTypes: [],
            injectedInfoDetails: [],
          },
        };
      }

      // 2. NORMALIZACIÓN
      const normResult = await normalize(buffer);

      // 3. EXIF ANALYSIS
      const exifResult = await exifAnalysis(buffer);

      // 3b. STEGANOGRAPHY ANALYSIS
      const stegoResult = await steganographyAnalysis(buffer);

      // 4. OCR
      const ocrResult = await ocr(normResult.normalizedBuffer);

      // 5. DETECTOR LÓGICO Y EVALUACIÓN DEL ADAPTADOR
      const logicResult = await logicDetector({
        ocrText: ocrResult.ocrText,
        exif: exifResult,
        stegoText: stegoResult.stegoText,
        sourceName,
      });

      // 6. ESTRUCTURA DE SALIDA FINAL
      return {
        id,
        url,
        status: 'ok',
        hashes: {
          sha256: normResult.sha256,
          phash: normResult.phash,
        },
        metadata: {
          format: normResult.format,
          width: normResult.width,
          height: normResult.height,
          size: normResult.size,
          exif: exifResult,
        },
        ocrText: ocrResult.ocrText,
        stegoText: stegoResult.stegoText,
        detected: logicResult.detected,
        flags: logicResult.flags,
        adapterAssessment: logicResult.adapterAssessment,
        normalizedBuffer: normResult.normalizedBuffer,
        thumbnailBuffer: normResult.thumbnailBuffer,
      };
    } catch (error) {
      return {
        id,
        url,
        status: 'rejected',
        rejectReason: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        hashes: { sha256: '', phash: '' },
        metadata: { format: '', width: 0, height: 0, size: buffer.length },
        ocrText: '',
        stegoText: '',
        detected: { phones: [], emails: [], urls: [], brands: [] },
        flags: { isNSFWCandidate: false, hasSensitiveData: false, hasText: false },
        adapterAssessment: {
          hasInjectedInfo: false,
          injectedInfoTypes: [],
          injectedInfoDetails: [],
        },
      };
    }
  }
}
