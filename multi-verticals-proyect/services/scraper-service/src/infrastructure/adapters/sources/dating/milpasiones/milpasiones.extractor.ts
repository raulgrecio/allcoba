/**
 * Milpasiones extractor — milpasiones.com HTML → MilpasionesPayload (pure, no I/O).
 *
 * Technology: PHP custom. Body is JS-rendered; head (meta tags) is SSR.
 * Profile URL: /anuncio/{phone}-{slug}_{id}/
 *
 * All meaningful data comes from <head> meta tags:
 *   - og:title, og:description, og:image (multiple)
 *   - geo.placename for city
 *
 * sourceId = _(\d+) from URL
 * phone    = first 9+ digit segment from /anuncio/ path
 */

import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import {
  parseNicknameFromTitle,
  parsePhoneFromUrl,
  parseSourceIdFromUrl,
} from './milpasiones.parsers.js';
import type { MilpasionesParams, MilpasionesPayload, MilpasionesPhoto } from './milpasiones.types.js';

// ============================================================================
// Field extractors (all from <head> meta tags)
// ============================================================================

const extractTitle = ($: CheerioAPI): string => {
  return (
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('title').first().text().split(' - ')[0]?.trim() ||
    ''
  );
};

const extractBio = ($: CheerioAPI): string | undefined => {
  const content = $('meta[property="og:description"]').attr('content')?.trim();
  return content || undefined;
};

const extractParams = ($: CheerioAPI): MilpasionesParams => {
  const city = $('meta[name="geo.placename"]').attr('content')?.trim() || undefined;
  return { ...(city ? { city } : {}) };
};

const extractPhotos = ($: CheerioAPI): MilpasionesPhoto[] => {
  const photos: MilpasionesPhoto[] = [];
  const seen = new Set<string>();

  $('meta[property="og:image"]').each((_, el) => {
    const src = $(el).attr('content')?.trim() ?? '';
    if (!src || seen.has(src)) return;
    seen.add(src);
    photos.push({ src });
  });

  return photos;
};

// ============================================================================
// Public API
// ============================================================================

export const extractMilpasionesFromCheerio = (
  $: CheerioAPI,
  sourceUrl: string,
): MilpasionesPayload => {
  const title = extractTitle($);

  return {
    sourceId: parseSourceIdFromUrl(sourceUrl),
    sourceUrl,
    title,
    nickname: parseNicknameFromTitle(title),
    bio: extractBio($),
    params: extractParams($),
    phone: parsePhoneFromUrl(sourceUrl),
    photos: extractPhotos($),
  };
};

export const extractMilpasiones = (html: string, sourceUrl: string): MilpasionesPayload =>
  extractMilpasionesFromCheerio(cheerio.load(html), sourceUrl);
