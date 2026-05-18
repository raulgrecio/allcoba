/**
 * Loquosex extractor — loquosex.com HTML → LoquosexPayload (pure, no I/O).
 *
 * Technology: PHP SSR (WordPress-like CMS).
 * Profile URL: /{slug}-{phone}.html/ — phone number is both the ID and contact.
 *
 * sourceUrl must be passed in — used to derive sourceId.
 */

import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import {
  extractLoquosexWhatsappPhone,
  normalizeLoquosexPhone,
  parseNicknameFromTitle,
  parseSourceIdFromUrl,
} from './loquosex.parsers.js';
import type {
  LoquosexParams,
  LoquosexPayload,
  LoquosexPhoto,
  LoquosexService,
} from './loquosex.types.js';

// ============================================================================
// Helpers
// ============================================================================

/**
 * Find a characteristics <li> containing a label string and return its text.
 * e.g. label="Edad:" → "Edad: 25 años" → returns "25 años"
 */
const extractCharacteristicField = (
  $: CheerioAPI,
  label: string,
): string | undefined => {
  let result: string | undefined;
  $('ul[class^="caracteristicas-detalle"] li').each((_, el) => {
    const text = $(el).text();
    if (text.includes(label)) {
      result = text.replace(label, '').replace(/\s*-\s*/g, ' ').trim() || undefined;
      return false; // break
    }
    return;
  });
  return result;
};

// ============================================================================
// Field extractors
// ============================================================================

const extractTitle = ($: CheerioAPI): string => {
  return $('article h1').first().text().trim();
};

const extractBio = ($: CheerioAPI): string | undefined => {
  const text = $('.anuntis').first().text().trim();
  return text || undefined;
};

const extractParams = ($: CheerioAPI): LoquosexParams => {
  const ageRaw = extractCharacteristicField($, 'Edad:');
  // Strip leading "Edad:" if present (sometimes full li text)
  const age = ageRaw?.replace(/^Edad:\s*/i, '').trim() || undefined;

  const natRaw = extractCharacteristicField($, 'Nacionalidad:');
  const nationality = natRaw?.replace(/^Nacionalidad:\s*/i, '').trim() || undefined;

  // City: Localidad breadcrumb — use all <a> links inside, take 3rd or last
  let city: string | undefined;
  let zone: string | undefined;
  $('ul[class^="caracteristicas-detalle"] li').each((_, el) => {
    const text = $(el).text();
    if (text.includes('Localidad:')) {
      const links = $(el).find('a');
      city = links.eq(2).text().trim() || links.eq(1).text().trim() || links.eq(0).text().trim() || undefined;
      zone = links.eq(3).text().trim() || undefined;
      return false; // break
    }
    return;
  });

  const catRaw = extractCharacteristicField($, 'Categoría:');
  const category = catRaw ? cheerio.load(catRaw)('a').first().text().trim() || catRaw : undefined;

  const priceRaw = $('.precio-minimo').first().text().trim();
  const priceMin = priceRaw || undefined;

  const isPremium = $('.cabecera-titulo').first().text().toLowerCase().includes('premium');

  return {
    ...(age ? { age } : {}),
    ...(nationality ? { nationality } : {}),
    ...(city ? { city } : {}),
    ...(zone ? { zone } : {}),
    ...(category ? { category } : {}),
    ...(priceMin ? { priceMin } : {}),
    isPremium,
  };
};

const extractServices = ($: CheerioAPI): LoquosexService[] => {
  const services: LoquosexService[] = [];

  const iconLists = $('ul[class^="si-no-"]').toArray();
  const nameLists = $('ul[class^="servicios-"]').toArray();

  iconLists.forEach((iconList, colIdx) => {
    const nameList = nameLists[colIdx];
    if (!nameList) return;

    const icons = $(iconList).find('li img').toArray();
    const names = $(nameList).find('li').toArray();

    icons.forEach((img, i) => {
      const alt = $(img).attr('alt') ?? '';
      const name = names[i] ? $(names[i]).text().trim() : undefined;
      if (!name) return;
      const included = /\sSI$/i.test(alt);
      services.push({ name, included });
    });
  });

  return services;
};

const extractPhone = ($: CheerioAPI): string | undefined => {
  // Primary: .numero-telefono text
  const raw = normalizeLoquosexPhone($('.numero-telefono').first().text().trim());
  if (raw) return raw;
  // Fallback: tel: href
  const href = $('a[href^="tel:"]').first().attr('href');
  return href ? normalizeLoquosexPhone(href.replace('tel:', '').replace('+34', '')) : undefined;
};

const extractWhatsapp = ($: CheerioAPI): { href?: string; phone?: string } => {
  const href =
    $('a[href*="api.whatsapp.com"]').first().attr('href') ??
    $('a[href*="wa.me"]').first().attr('href');
  if (!href) return {};
  return { href, phone: extractLoquosexWhatsappPhone(href) };
};

const extractPhotos = ($: CheerioAPI): LoquosexPhoto[] => {
  const photos: LoquosexPhoto[] = [];
  const seen = new Set<string>();

  // Visible photos only (skip hidden li[id^="productimage"] duplicates)
  $('section.caja-fotos li.photo_list img, section.caja-fotos li.photo_list_multiple img').each(
    (_, el) => {
      // Strip ?v=... query param for deduplication and clean URL
      const rawSrc = $(el).attr('src') ?? '';
      const src = rawSrc.split('?')[0] ?? rawSrc;
      if (!src || seen.has(src)) return;
      seen.add(src);
      const alt = $(el).attr('alt');
      photos.push({ src, ...(alt ? { alt } : {}) });
    },
  );

  return photos;
};

// ============================================================================
// Public API
// ============================================================================

/** Extract from a Cheerio handle. `sourceUrl` must be passed (derivation source). */
export const extractLoquosexFromCheerio = (
  $: CheerioAPI,
  sourceUrl: string,
): LoquosexPayload => {
  const title = extractTitle($);
  const wa = extractWhatsapp($);

  return {
    sourceId: parseSourceIdFromUrl(sourceUrl),
    sourceUrl,
    title,
    nickname: parseNicknameFromTitle(title),
    bio: extractBio($),
    params: extractParams($),
    services: extractServices($),
    phone: extractPhone($),
    ...(wa.phone ? { whatsappPhone: wa.phone } : {}),
    ...(wa.href ? { whatsappHref: wa.href } : {}),
    photos: extractPhotos($),
  };
};

/** Extract from raw HTML string. */
export const extractLoquosex = (html: string, sourceUrl: string): LoquosexPayload => {
  return extractLoquosexFromCheerio(cheerio.load(html), sourceUrl);
};
