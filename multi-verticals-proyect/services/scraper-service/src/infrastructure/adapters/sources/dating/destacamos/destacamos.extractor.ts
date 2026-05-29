/**
 * Destacamos extractor — destacamos.net HTML → DestacamosPayload (pure, no I/O).
 *
 * Technology: PHP SSR.
 * Profile URL: /{id}-{slug}.html
 *
 * sourceId = /{id}- from URL
 * phone    = #detallesimportantes a[href^="tel:"]
 * details  = #details div > span label + strong value
 * photos   = #gallery a.fimage href (full-size)
 */

import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type { DestacamosParams, DestacamosPayload, DestacamosPhoto } from './destacamos.types.js';
import {
  extractDestacamosWhatsappPhone,
  parseDestacamosLanguages,
  parseSourceIdFromUrl,
} from './destacamos.parsers.js';

// ============================================================================
// Helpers
// ============================================================================

const extractDetailField = ($: CheerioAPI, label: string): string | undefined => {
  let result: string | undefined;
  $('#details > div').each((_, el) => {
    if (result) return;
    const spanText = $(el).find('> span').first().text().trim();
    if (spanText === label) {
      result = $(el).find('strong').text().trim() || undefined;
    }
  });
  return result;
};

// ============================================================================
// Field extractors
// ============================================================================

const extractTitle = ($: CheerioAPI): string =>
  $('h1.hh1').first().text().trim() || $('h1').first().text().trim();

const extractBio = ($: CheerioAPI): string | undefined => {
  const text = $('#description p').first().text().trim();
  return text || undefined;
};

const extractParams = ($: CheerioAPI): DestacamosParams => {
  const ageRaw = extractDetailField($, 'Edad');
  const nationality = extractDetailField($, 'Nacionalidad');
  const city = extractDetailField($, 'Ciudad');
  const zone = extractDetailField($, 'Zona');
  const postalCode = extractDetailField($, 'Código postal');
  const heightRaw = extractDetailField($, 'Altura');
  const hairColor = extractDetailField($, 'Color de pelo');
  const languagesRaw = extractDetailField($, 'Idiomas');
  const schedule = extractDetailField($, 'Horario');

  return {
    ...(ageRaw ? { age: ageRaw } : {}),
    ...(nationality ? { nationality } : {}),
    ...(city ? { city } : {}),
    ...(zone ? { zone } : {}),
    ...(postalCode ? { postalCode } : {}),
    ...(heightRaw ? { heightRaw } : {}),
    ...(hairColor ? { hairColor } : {}),
    ...(languagesRaw ? { languages: parseDestacamosLanguages(languagesRaw) } : {}),
    ...(schedule ? { schedule } : {}),
  };
};

const extractPhone = ($: CheerioAPI): string | undefined => {
  const href = $('#detallesimportantes a[href^="tel:"]').first().attr('href');
  return href ? href.replace('tel:', '').replace(/\D/g, '') || undefined : undefined;
};

const extractWhatsapp = ($: CheerioAPI): { href?: string; phone?: string } => {
  const href =
    $('#detallesimportantes a[href*="wa.me"]').first().attr('href') ??
    $('a[href*="api.whatsapp.com"]').first().attr('href') ??
    $('a[href*="wa.me"]').first().attr('href');
  if (!href) return {};
  return { href, phone: extractDestacamosWhatsappPhone(href) };
};

const extractIsPremium = ($: CheerioAPI): boolean => $('.premiumdet').length > 0;

const extractPhotos = ($: CheerioAPI): DestacamosPhoto[] => {
  const photos: DestacamosPhoto[] = [];
  const seen = new Set<string>();

  $('#gallery a.fimage').each((_, el) => {
    const src = $(el).attr('href')?.trim() ?? '';
    if (!src || seen.has(src)) return;
    seen.add(src);
    const alt = $(el).find('img').attr('alt');
    photos.push({ src, ...(alt ? { alt } : {}) });
  });

  return photos;
};

// ============================================================================
// Public API
// ============================================================================

export const extractDestacamosFromCheerio = (
  $: CheerioAPI,
  sourceUrl: string,
): DestacamosPayload => {
  const title = extractTitle($);
  const wa = extractWhatsapp($);

  return {
    sourceId: parseSourceIdFromUrl(sourceUrl),
    sourceUrl,
    title,
    nickname: title, // h1.hh1 is the name directly
    bio: extractBio($),
    params: extractParams($),
    phone: extractPhone($),
    ...(wa.phone ? { whatsappPhone: wa.phone } : {}),
    ...(wa.href ? { whatsappHref: wa.href } : {}),
    isPremium: extractIsPremium($),
    photos: extractPhotos($),
  };
};

export const extractDestacamos = (html: string, sourceUrl: string): DestacamosPayload =>
  extractDestacamosFromCheerio(cheerio.load(html), sourceUrl);
