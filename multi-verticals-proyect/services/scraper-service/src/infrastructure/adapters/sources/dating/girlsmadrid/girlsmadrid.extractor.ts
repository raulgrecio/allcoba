/**
 * GirlsMadrid extractor — girlsmadrid.com HTML → GirlsBcnPayload (pure, no I/O).
 *
 * Different template from GirlsBCN but same payload shape.
 * Template: `.heading h1`, `ul.meta-post li label/span`,
 *           `.foto.media-box .media-box-image img`, `div.telefono a[href^="tel:"]`,
 *           `a[href*="wa.me"]`, `.widget h4:contains("tarifas") ~ img`.
 *
 * City is hardcoded to "Madrid" — not present in HTML.
 * sourceUrl must be passed in (no canonical link tag).
 */

import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type { GirlsBcnParams, GirlsBcnPayload, GirlsBcnPhoto } from '../girlsbcn/girlsbcn.types.js';
import { extractWhatsappPhone, normalizeGBCNPhone } from '../girlsbcn/girlsbcn.parsers.js';

// ============================================================================
// Helpers
// ============================================================================

const deriveSourceId = (sourceUrl: string): string => {
  const pathname = new URL(sourceUrl).pathname;
  const last = pathname.split('/').filter(Boolean).pop() ?? '';
  return last.replace(/\.html?$/, '');
};

const extractMetaField = ($: CheerioAPI, labelText: string): string | undefined => {
  let result: string | undefined;
  $('ul.meta-post li').each((_, el) => {
    const label = $(el).find('label').text().trim().toLowerCase().replace(/:$/, '');
    if (label === labelText.toLowerCase()) {
      result = $(el).find('span').text().trim() || undefined;
      return false;
    }
    return;
  });
  return result;
};

const extractMetaLanguages = ($: CheerioAPI): string[] => {
  const langs: string[] = [];
  $('ul.meta-post li').each((_, el) => {
    const label = $(el).find('label').text().trim().toLowerCase().replace(/:$/, '');
    if (label === 'idiomas') {
      $(el)
        .find('span img')
        .each((_, img) => {
          const title = $(img).attr('title');
          if (title) langs.push(title);
        });
      return false;
    }
    return;
  });
  return langs;
};

// ============================================================================
// Field extractors
// ============================================================================

const extractNickname = ($: CheerioAPI): string => {
  const raw = $('.heading h1').first().text().trim();
  // GirlsMadrid titles are ALL-CAPS — convert to title case
  return raw.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
};

const extractBio = ($: CheerioAPI): string | undefined => {
  // Bio is under the "mi presentación" widget h4
  const h4 = $('.folio-detail .widget h4').filter((_, el) => /presentaci/i.test($(el).text()));
  const text = h4.next('p').text().trim();
  return text || undefined;
};

const extractParams = ($: CheerioAPI): GirlsBcnParams => {
  const age = extractMetaField($, 'edad');
  const measurements = extractMetaField($, 'medidas');
  const heightCm = extractMetaField($, 'estatura');
  const weightKg = extractMetaField($, 'peso');
  const hairColor = extractMetaField($, 'cabello');
  const eyeColor = extractMetaField($, 'ojos');
  const nationality = extractMetaField($, 'nacionalidad');
  const schedule = extractMetaField($, 'horarios');
  const languages = extractMetaLanguages($);

  // Meeting places from .tags li
  const meetingPlaces: string[] = [];
  $('.widget .tags li').each((_, el) => {
    const text = $(el).text().trim();
    if (text) meetingPlaces.push(text);
  });

  // Price range from "Mi rango de tarifas" widget img
  const rangoSrc =
    $('.widget')
      .filter((_, el) => /tarifas/i.test($(el).find('h4').text()))
      .find('img')
      .first()
      .attr('src') ?? '';
  const rangoM = rangoSrc.match(/perfil-(\d)\.png/);
  const priceRange = rangoM ? parseInt(rangoM[1]!, 10) : undefined;

  return {
    ...(age ? { age } : {}),
    ...(measurements ? { measurements } : {}),
    ...(heightCm ? { heightCm } : {}),
    ...(weightKg ? { weightKg } : {}),
    ...(hairColor ? { hairColor } : {}),
    ...(eyeColor ? { eyeColor } : {}),
    ...(nationality ? { nationality } : {}),
    languages,
    ...(schedule ? { schedule } : {}),
    city: 'Madrid',
    meetingPlaces: meetingPlaces.length ? meetingPlaces : undefined,
    ...(priceRange !== undefined ? { priceRange } : {}),
  };
};

const extractPhone = ($: CheerioAPI): string | undefined => {
  const href = $('div.telefono a[href^="tel:"], .telefono a[href^="tel:"]').first().attr('href');
  if (href) return normalizeGBCNPhone(href.replace('tel:', ''));
  return undefined;
};

const extractWhatsapp = ($: CheerioAPI): { href?: string; phone?: string } => {
  const href = $('a[href*="wa.me"]').first().attr('href');
  if (!href) return {};
  return { href, phone: extractWhatsappPhone(href) };
};

const extractPhotos = ($: CheerioAPI): GirlsBcnPhoto[] => {
  const photos: GirlsBcnPhoto[] = [];
  const seen = new Set<string>();

  // Visible photos in .foto.media-box (lazy loaded — prefer data-src then src)
  $('.foto.media-box .media-box-image img, .foto.media-box-hidden img').each((_, el) => {
    const src = $(el).attr('data-src') ?? $(el).attr('src') ?? '';
    if (!src || src.startsWith('data:') || seen.has(src)) return;
    seen.add(src);
    const alt = $(el).attr('alt');
    photos.push({ src, ...(alt ? { alt } : {}) });
  });

  return photos;
};

// ============================================================================
// Public API
// ============================================================================

export const extractGirlsMadridFromCheerio = (
  $: CheerioAPI,
  sourceUrl: string,
): GirlsBcnPayload => {
  const wa = extractWhatsapp($);
  return {
    sourceId: deriveSourceId(sourceUrl),
    sourceUrl,
    nickname: extractNickname($),
    bio: extractBio($),
    params: extractParams($),
    phone: extractPhone($),
    ...(wa.phone ? { whatsappPhone: wa.phone } : {}),
    ...(wa.href ? { whatsappHref: wa.href } : {}),
    photos: extractPhotos($),
    video: undefined,
  };
};

export const extractGirlsMadrid = (html: string, sourceUrl: string): GirlsBcnPayload => {
  return extractGirlsMadridFromCheerio(cheerio.load(html), sourceUrl);
};
