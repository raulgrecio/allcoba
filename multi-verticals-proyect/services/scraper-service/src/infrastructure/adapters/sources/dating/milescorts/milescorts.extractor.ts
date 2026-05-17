/**
 * Milescorts extractor — milescorts.es HTML → MilescortsPayload (pure, no I/O).
 *
 * Technology: Bootstrap 3 + PHP SSR.
 * Profile URL: /escorts-y-putas/{city-slug}/{phone}-{slug}-{id}.htm
 *
 * sourceId  = last numeric segment of filename (ad ID)
 * phone     = first 9+ digit segment of filename
 * city      = penultimate URL path segment
 */

import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import {
  citySlugToName,
  extractMilescortsWhatsappPhone,
  parseCitySlugFromUrl,
  parseNicknameFromTitle,
  parsePhoneFromUrl,
  parseSourceIdFromUrl,
} from './milescorts.parsers.js';
import type { MilescortsParams, MilescortsPayload, MilescortsPhoto } from './milescorts.types.js';

// ============================================================================
// Field extractors
// ============================================================================

const extractTitle = ($: CheerioAPI): string =>
  $('h1#anuncio-titular').first().text().trim() || $('h1').first().text().trim();

const extractBio = ($: CheerioAPI): string | undefined => {
  const text = $('section.datos-model p').first().text().trim();
  return text || undefined;
};

const extractParams = ($: CheerioAPI, url: string): MilescortsParams => {
  const citySlug = parseCitySlugFromUrl(url);
  const city = citySlug ? citySlugToName(citySlug) : undefined;

  // Some profiles have structured personal data
  let age: string | undefined;
  let nationality: string | undefined;
  $('ul li').each((_, el) => {
    const text = $(el).text();
    if (/edad/i.test(text)) {
      age = text.replace(/.*Edad:\s*/i, '').trim() || undefined;
    }
    if (/nacionalidad/i.test(text)) {
      nationality = text.replace(/.*Nacionalidad:\s*/i, '').trim() || undefined;
    }
  });

  return {
    ...(age ? { age } : {}),
    ...(nationality ? { nationality } : {}),
    ...(city ? { city } : {}),
  };
};

const extractPhone = ($: CheerioAPI, url: string): string | undefined => {
  // Primary: from URL filename
  const fromUrl = parsePhoneFromUrl(url);
  if (fromUrl) return fromUrl;
  // Fallback: tel: href
  const href = $('a[href^="tel:"]').first().attr('href');
  return href ? href.replace('tel:', '').replace(/\D/g, '') || undefined : undefined;
};

const extractWhatsapp = ($: CheerioAPI): { href?: string; phone?: string } => {
  const href =
    $('a[href*="api.whatsapp.com"]').first().attr('href') ??
    $('a[href*="wa.me"]').first().attr('href');
  if (!href) return {};
  return { href, phone: extractMilescortsWhatsappPhone(href) };
};

const extractIsVerified = ($: CheerioAPI): boolean =>
  $('a.btn-success[href*="fotos-reales"], .label-success:contains("Verificada"), .label-success:contains("verificada")').length > 0;

const extractPhotos = ($: CheerioAPI): MilescortsPhoto[] => {
  const photos: MilescortsPhoto[] = [];
  const seen = new Set<string>();

  $('#fotos-anuncio img').each((_, el) => {
    // Prefer data-original (lazy) over src (placeholder)
    const src =
      $(el).attr('data-original') || $(el).attr('data-src') || $(el).attr('src') || '';
    if (!src || seen.has(src)) return;
    seen.add(src);
    const alt = $(el).attr('alt');
    photos.push({ src, ...(alt ? { alt } : {}) });
  });

  return photos;
};

// ============================================================================
// Public API
// ============================================================================

export const extractMilescortsFromCheerio = (
  $: CheerioAPI,
  sourceUrl: string,
): MilescortsPayload => {
  const title = extractTitle($);
  const wa = extractWhatsapp($);

  return {
    sourceId: parseSourceIdFromUrl(sourceUrl),
    sourceUrl,
    title,
    nickname: parseNicknameFromTitle(title),
    bio: extractBio($),
    params: extractParams($, sourceUrl),
    phone: extractPhone($, sourceUrl),
    ...(wa.phone ? { whatsappPhone: wa.phone } : {}),
    ...(wa.href ? { whatsappHref: wa.href } : {}),
    isVerified: extractIsVerified($),
    photos: extractPhotos($),
  };
};

export const extractMilescorts = (html: string, sourceUrl: string): MilescortsPayload =>
  extractMilescortsFromCheerio(cheerio.load(html), sourceUrl);
