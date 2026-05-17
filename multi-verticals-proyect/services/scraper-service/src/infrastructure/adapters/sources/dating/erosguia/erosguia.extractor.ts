/**
 * Erosguia extractor — erosguia.com HTML → ErosguiaPayload (pure, no I/O).
 *
 * Technology: Laravel + Alpine.js + Tailwind v4 (SSR).
 * The page has two identical data-position panels (desktop=hidden, responsive=visible).
 * All field extraction is scoped to [data-position="responsive"] to avoid duplicates.
 * Photos and contact links live outside both panels in .ficha-row-img / .ficha-imagenes.
 *
 * sourceUrl must be passed in — extractor reads it to derive sourceId.
 */

import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import {
  extractErosguiaWhatsappPhone,
  parseErosguiaLanguages,
  parseErosguiaPhoneFromTitle,
} from './erosguia.parsers.js';
import type { ErosguiaParams, ErosguiaPayload, ErosguiaPhoto } from './erosguia.types.js';

// ============================================================================
// Helpers
// ============================================================================

const deriveSourceId = (sourceUrl: string): string => {
  const pathname = new URL(sourceUrl).pathname;
  const m = pathname.match(/\/(\d+)\.html$/);
  return m ? m[1]! : pathname.split('/').filter(Boolean).pop()?.replace(/\.html?$/, '') ?? '';
};

/**
 * Extract a field value from the responsive panel's ficha-info grid.
 * Each grid item has: [div.font-semibold (label), div (value)].
 * Returns sibling div text for the matching label.
 */
const extractFichaField = ($: CheerioAPI, label: string): string | undefined => {
  const panel = $('[data-position="responsive"] .ficha-info .grid').first();
  let result: string | undefined;
  panel.children('div').each((_, el) => {
    const labelEl = $(el).find('.font-semibold').first();
    if (labelEl.text().trim() === label) {
      result = $(el).children('div').not('.font-semibold').first().text().trim() || undefined;
      return false; // break
    }
  });
  return result;
};

// ============================================================================
// Field extractors
// ============================================================================

const extractNickname = ($: CheerioAPI): string => {
  return $('h1.title-ad span').first().text().trim();
};

const extractBio = ($: CheerioAPI): string | undefined => {
  const text = $('[data-position="responsive"] .ficha-about [x-ref="content"]')
    .first()
    .text()
    .trim();
  return text || undefined;
};

const extractParams = ($: CheerioAPI): ErosguiaParams => {
  const city = extractFichaField($, 'Ciudad');
  const nationality = extractFichaField($, 'Nacionalidad');
  const age = extractFichaField($, 'Edad');
  const heightCm = extractFichaField($, 'Estatura');
  const langsRaw = extractFichaField($, 'Idiomas');
  const languages = parseErosguiaLanguages(langsRaw);

  return {
    ...(city ? { city } : {}),
    ...(nationality ? { nationality } : {}),
    ...(age ? { age } : {}),
    ...(heightCm ? { heightCm } : {}),
    languages,
  };
};

const extractServices = ($: CheerioAPI): string[] => {
  const services: string[] = [];
  const seen = new Set<string>();
  $('[data-position="responsive"] .ficha-services > div').each((_, el) => {
    const name = $(el).text().trim();
    if (name && !seen.has(name)) {
      seen.add(name);
      services.push(name);
    }
  });
  return services;
};

const extractPhone = ($: CheerioAPI): string | undefined => {
  const title = $('title').text();
  return parseErosguiaPhoneFromTitle(title);
};

const extractWhatsapp = ($: CheerioAPI): { href?: string; phone?: string } => {
  const href = $('a[href*="wa.me"]').first().attr('href');
  if (!href) return {};
  return { href, phone: extractErosguiaWhatsappPhone(href) };
};

const extractTelegramHref = ($: CheerioAPI): string | undefined => {
  return $('a[href^="https://t.me"]').first().attr('href');
};

const extractPhotos = ($: CheerioAPI): ErosguiaPhoto[] => {
  const photos: ErosguiaPhoto[] = [];
  const seen = new Set<string>();

  const addPhoto = (src: string | undefined, alt: string | undefined): void => {
    if (!src || !src.includes('eros.bz') || seen.has(src)) return;
    seen.add(src);
    photos.push({ src, ...(alt ? { alt } : {}) });
  };

  // Cover photo from ficha-row-img (outside both data-position panels)
  const coverEl = $('.ficha-row-img img[src*="eros.bz"]').first();
  addPhoto(coverEl.attr('src'), coverEl.attr('alt'));

  // Gallery photos from ficha-imagenes (outside both data-position panels)
  $('.ficha-imagenes .ficha-imagen img[src*="eros.bz"]').each((_, el) => {
    addPhoto($(el).attr('src'), $(el).attr('alt'));
  });

  return photos;
};

// ============================================================================
// Public API
// ============================================================================

/** Extract from a Cheerio handle. `sourceUrl` must be passed (no canonical link). */
export const extractErosguiaFromCheerio = ($: CheerioAPI, sourceUrl: string): ErosguiaPayload => {
  const wa = extractWhatsapp($);
  return {
    sourceId: deriveSourceId(sourceUrl),
    sourceUrl,
    nickname: extractNickname($),
    bio: extractBio($),
    params: extractParams($),
    services: extractServices($),
    phone: extractPhone($),
    ...(wa.phone ? { whatsappPhone: wa.phone } : {}),
    ...(wa.href ? { whatsappHref: wa.href } : {}),
    telegramHref: extractTelegramHref($),
    photos: extractPhotos($),
  };
};

/** Extract from raw HTML string. */
export const extractErosguia = (html: string, sourceUrl: string): ErosguiaPayload => {
  return extractErosguiaFromCheerio(cheerio.load(html), sourceUrl);
};
