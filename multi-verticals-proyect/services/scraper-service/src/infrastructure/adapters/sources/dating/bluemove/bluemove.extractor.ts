/**
 * bluemove extractor — HTML → BluemovePayload.
 *
 * Profile URL: /{city}/escorts/#{numericId}
 * Tech: Astro SSR + JS modal. El perfil completo se renderiza dentro del
 * elemento `<escort-modal>` cuando el hash #{id} abre el modal; el crawler
 * espera a que cargue antes de capturar el HTML.
 * Estructura del modal: clases `em-*`.
 */

import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';

import {
  parseSourceIdFromUrl,
  parseCityFromUrl,
  parseBluemovePhone,
  parseBluemoveWhatsapp,
  parseTelegramHandle,
  parseInstagramHandle,
  parseFirstInt,
  parseBoolNotNo,
  stripProvince,
} from './bluemove.parsers.js';
import type { BluemoveParams, BluemovePayload, BluemovePhoto } from './bluemove.types.js';

// data-feature de em-service-chip clasificados
const LOCATION_FEATURES = new Set(['hotel', 'a-domicilio', 'apartamento', 'desplazamientos']);
const PAYMENT_FEATURES = new Set(['cartao-credito', 'tarjeta-credito', 'bizum', 'paypal']);

/** Lee el valor de una fila `em-stat-row` por su etiqueta (case-insensitive). */
const statValue = ($: CheerioAPI, labels: string[]): string | undefined => {
  const wanted = labels.map((l) => l.toLowerCase());
  let value: string | undefined;
  $('escort-modal .em-stat-row').each((_, el) => {
    if (value) return;
    const label = $(el).find('.em-stat-label').text().trim().toLowerCase();
    if (wanted.includes(label)) {
      value = $(el).find('.em-stat-value').text().trim() || undefined;
    }
  });
  return value;
};

const extractPhotos = ($: CheerioAPI): BluemovePhoto[] => {
  const photos: BluemovePhoto[] = [];
  const seen = new Set<string>();
  $('escort-modal .em-photo-tile img').each((_, el) => {
    const src = $(el).attr('src') ?? $(el).attr('data-src');
    if (src && !seen.has(src)) {
      seen.add(src);
      photos.push({ src });
    }
  });
  if (photos.length === 0) {
    const ogImg = $('meta[property="og:image"]').attr('content');
    if (ogImg) photos.push({ src: ogImg });
  }
  return photos;
};

export const extractBluemove = (html: string, sourceUrl: string): BluemovePayload => {
  const $ = cheerio.load(html);

  const sourceId = parseSourceIdFromUrl(sourceUrl);

  const nickname = $('escort-modal .em-profile-name').first().text().trim() || undefined;
  const quote = $('escort-modal .em-profile-quote').first().text().trim() || undefined;
  const title = quote || nickname || '';

  const bio = $('escort-modal .em-desc-text').first().text().trim() || undefined;

  const phone =
    parseBluemovePhone($('escort-modal .em-profile-phone').first().attr('href')) ??
    parseBluemovePhone($('escort-modal .em-cta-call').first().attr('href'));

  const whatsappPhone = parseBluemoveWhatsapp(
    $('escort-modal .em-cta-whatsapp').first().attr('href'),
  );

  const telegram = parseTelegramHandle($('escort-modal .em-cta-telegram').first().attr('href'));

  const instagram = parseInstagramHandle(
    $('escort-modal a[href*="instagram.com"]').first().attr('href'),
  );

  // em-profile-highlight: "Portuguesa · 28 anos"
  const highlight = $('escort-modal .em-profile-highlight').first().text().trim();
  const highlightAge = parseFirstInt(highlight);
  const highlightNationality = highlight.split('·')[0]?.trim() || undefined;

  // Servicios + "Otra información" (chips con data-feature)
  const services: string[] = [];
  const paymentMethods: string[] = [];
  const serviceLocations: string[] = [];
  $('escort-modal .em-service-chip').each((_, el) => {
    const name = $(el).text().trim();
    if (!name) return;
    const feature = $(el).attr('data-feature');
    if (!feature) {
      services.push(name);
    } else if (LOCATION_FEATURES.has(feature)) {
      serviceLocations.push(name);
    } else if (PAYMENT_FEATURES.has(feature)) {
      paymentMethods.push(name);
    }
  });

  const langRaw = statValue($, ['Idiomas']);
  const languages = langRaw
    ? langRaw.split(',').map((l) => l.trim()).filter(Boolean)
    : undefined;

  const city =
    stripProvince(statValue($, ['Ciudad'])) ?? parseCityFromUrl(sourceUrl);

  const params: BluemoveParams = {
    age: parseFirstInt(statValue($, ['Edad'])) ?? highlightAge,
    heightCm: parseFirstInt(statValue($, ['Altura', 'Estatura'])),
    weightKg: parseFirstInt(statValue($, ['Peso'])),
    hairColor: statValue($, ['Color de pelo', 'Cabello', 'Pelo']),
    eyeColor: statValue($, ['Color de ojos', 'Ojos']),
    breastSize: statValue($, ['Pecho']),
    pubicHair: statValue($, ['Pubis']),
    nationality: statValue($, ['Nacionalidad']) ?? highlightNationality,
    languages,
    tattoos: parseBoolNotNo(statValue($, ['Tatuajes'])),
    piercings: parseBoolNotNo(statValue($, ['Piercings'])),
    city,
    zone: statValue($, ['Áreas', 'Areas', 'Zona']),
    services: services.length > 0 ? services : undefined,
    paymentMethods: paymentMethods.length > 0 ? paymentMethods : undefined,
    serviceLocations: serviceLocations.length > 0 ? serviceLocations : undefined,
  };

  // Verificada: ficha-reliability con identity/selfie verificados
  let isVerified = false;
  const breakdownRaw = $('escort-modal ficha-reliability').first().attr('data-breakdown');
  if (breakdownRaw) {
    try {
      const b = JSON.parse(breakdownRaw) as Record<string, number>;
      isVerified = (b.identity_verified ?? 0) > 0 || (b.selfie_verified ?? 0) > 0;
    } catch {
      /* breakdown no parseable */
    }
  }

  return {
    sourceId,
    sourceUrl,
    title,
    nickname,
    bio,
    phone,
    whatsappPhone,
    telegram,
    instagram,
    params,
    photos: extractPhotos($),
    isVerified,
  };
};
