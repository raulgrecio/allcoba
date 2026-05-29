import type { ParsedExif } from '#domain/canonical/processed-image-result.js';

import {
  BRAND_DICTIONARY,
  EMAIL_REGEX,
  INTERNATIONAL_PHONE_REGEX,
  PHONE_REGEX,
  URL_REGEX,
} from '../../../utils/regex-patterns.js';

export interface LogicDetectionResult {
  readonly detected: {
    readonly phones: string[];
    readonly emails: string[];
    readonly urls: string[];
    readonly brands: string[];
  };
  readonly flags: {
    readonly isNSFWCandidate: boolean;
    readonly hasSensitiveData: boolean;
    readonly hasText: boolean;
  };
  readonly adapterAssessment: {
    readonly hasInjectedInfo: boolean;
    readonly injectedInfoTypes: (
      | 'exif_software'
      | 'exif_copyright'
      | 'ocr_watermark_brand'
      | 'url_matched'
      | 'stego_hidden_brand'
    )[];
    readonly injectedInfoDetails: string[];
  };
}

/**
 * Logic Detector (Etapa 5):
 * Ejecuta expresiones regulares eficientes y búsquedas en diccionario (sin IA costosa).
 *  1. Identifica teléfonos, correos y URLs en todo el texto extraído (OCR + metadatos).
 *  2. Compara el texto e información EXIF con nuestro diccionario de portales conocidos.
 *  3. Genera alertas rápidas de inyección de información de portales externos (invisible en EXIF o visible en píxeles).
 *  4. Activa flags heurísticas sobre contenido NSFW potencial y datos sensibles (GPS, teléfonos).
 */
export async function logicDetector(params: {
  readonly ocrText: string;
  readonly exif?: ParsedExif;
  readonly stegoText?: string;
  readonly sourceName?: string;
}): Promise<LogicDetectionResult> {
  const { ocrText, exif, stegoText } = params;

  // Combinar todas las fuentes de texto disponibles para hacer el barrido regex
  const combinedText = [
    ocrText,
    exif?.software || '',
    exif?.author || '',
    exif?.copyright || '',
    exif?.comments || '',
    stegoText || '',
  ].join('\n');

  // 1. Detección de Teléfonos
  const phonesSet = new Set<string>();
  const phoneMatches = combinedText.match(PHONE_REGEX);
  if (phoneMatches) {
    phoneMatches.forEach((p) => phonesSet.add(p.trim()));
  }

  const intPhoneMatches = combinedText.match(INTERNATIONAL_PHONE_REGEX);
  if (intPhoneMatches) {
    intPhoneMatches.forEach((p) => {
      // Limpiar ruido para validar longitud razonable de teléfono (9 a 15 dígitos)
      const clean = p.replace(/[-.\s()]/g, '');
      if (clean.length >= 9 && clean.length <= 15 && /^\+?\d+$/.test(clean)) {
        phonesSet.add(p.trim());
      }
    });
  }

  // 2. Detección de Emails
  const emailsSet = new Set<string>();
  const emailMatches = combinedText.match(EMAIL_REGEX);
  if (emailMatches) {
    emailMatches.forEach((e) => emailsSet.add(e.trim().toLowerCase()));
  }

  // 3. Detección de URLs
  const urlsSet = new Set<string>();
  const urlMatches = combinedText.match(URL_REGEX);
  if (urlMatches) {
    urlMatches.forEach((u) => urlsSet.add(u.trim()));
  }

  // 4. Detección de Marcas / Portales
  const brandsSet = new Set<string>();
  BRAND_DICTIONARY.forEach((brand) => {
    const match = brand.patterns.some((pattern) => pattern.test(combinedText));
    if (match) {
      brandsSet.add(brand.name);
    }
  });

  // 5. Clasificación y Flags Heurísticas
  const hasText = ocrText.trim().length > 0;

  // Keywords comunes en anuncios/contactos para candidato NSFW rápido
  const nsfwKeywords =
    /\b(escort|dating|sexo|porn|relax|masajes-eroticos|trans|chica-de-compania|maduras|chicas-vigo|contacts|citas|mileroticos|contactos|milescorts)\b/i;
  const isNSFWCandidate = nsfwKeywords.test(combinedText);

  // Datos sensibles: si tiene coordenadas GPS o teléfonos/correos de contacto directo
  const hasGPS = exif?.gps !== undefined;
  const hasSensitiveData = phonesSet.size > 0 || emailsSet.size > 0 || hasGPS;

  // 6. Evaluación de Inyección de Información por el Adaptador / Scraper
  const injectedInfoTypes: LogicDetectionResult['adapterAssessment']['injectedInfoTypes'] = [];
  const injectedInfoDetails: string[] = [];

  // Analizar metadatos EXIF invisibles
  if (exif?.software) {
    const match = BRAND_DICTIONARY.find((b) => b.patterns.some((p) => p.test(exif.software!)));
    if (match) {
      injectedInfoTypes.push('exif_software');
      injectedInfoDetails.push(
        `Firma invisible '${match.name}' detectada en metadato de Software EXIF.`,
      );
    }
  }

  if (exif?.copyright) {
    const match = BRAND_DICTIONARY.find((b) => b.patterns.some((p) => p.test(exif.copyright!)));
    if (match) {
      injectedInfoTypes.push('exif_copyright');
      injectedInfoDetails.push(
        `Firma invisible '${match.name}' detectada en metadato de Copyright EXIF.`,
      );
    }
  }

  // Analizar firmas visuales en OCR (marcas de agua de texto / logos tipográficos)
  if (ocrText.trim().length > 0) {
    BRAND_DICTIONARY.forEach((brand) => {
      const matchInOcr = brand.patterns.some((p) => p.test(ocrText));
      if (matchInOcr) {
        injectedInfoTypes.push('ocr_watermark_brand');
        injectedInfoDetails.push(
          `Firma visible de portal/imagotipo verbal de '${brand.name}' detectado en los píxeles.`,
        );
      }
    });

    if (urlsSet.size > 0) {
      injectedInfoTypes.push('url_matched');
      injectedInfoDetails.push(
        `Marca de agua con URL detectada en los píxeles: ${Array.from(urlsSet).join(', ')}.`,
      );
    }
  }

  // Analizar firmas invisibles esteganográficas (LSB)
  if (stegoText && stegoText.trim().length > 0) {
    BRAND_DICTIONARY.forEach((brand) => {
      const matchInStego = brand.patterns.some((p) => p.test(stegoText));
      if (matchInStego) {
        injectedInfoTypes.push('stego_hidden_brand');
        injectedInfoDetails.push(
          `Firma invisible/oculta (Esteganografía LSB) de '${brand.name}' detectada en los píxeles.`,
        );
      }
    });
  }

  const hasInjectedInfo = injectedInfoTypes.length > 0;

  return {
    detected: {
      phones: Array.from(phonesSet),
      emails: Array.from(emailsSet),
      urls: Array.from(urlsSet),
      brands: Array.from(brandsSet),
    },
    flags: {
      isNSFWCandidate,
      hasSensitiveData,
      hasText,
    },
    adapterAssessment: {
      hasInjectedInfo,
      injectedInfoTypes,
      injectedInfoDetails,
    },
  };
}
