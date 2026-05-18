/**
 * GirlsBCN extractor — girlsbcn.net HTML → GirlsBcnPayload (pure, no I/O).
 *
 * Template: `h1.css_escort`, `dl.dl-horizontal dt/dd`, `p.foto.css_escort img`,
 * `video.css_escort source`, `p.rango.css_escort img`, `p.telefono a[href^="tel:"]`,
 * `a[href*="wa.me"]`.
 *
 * sourceUrl must be passed in — the HTML has no canonical link tag.
 */

import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import { extractWhatsappPhone, normalizeGBCNPhone } from './girlsbcn.parsers.js';
import type {
  GirlsBcnParams,
  GirlsBcnPayload,
  GirlsBcnPhoto,
  GirlsBcnVideo,
} from './girlsbcn.types.js';

// ============================================================================
// Helpers
// ============================================================================

const deriveSourceId = (sourceUrl: string): string => {
  const pathname = new URL(sourceUrl).pathname;
  const last = pathname.split('/').filter(Boolean).pop() ?? '';
  return last.replace(/\.html?$/, '');
};

const extractDlField = ($: CheerioAPI, label: string): string | undefined => {
  let found = false;
  let result: string | undefined;
  $('dl.dl-horizontal dt, dl.dl-horizontal dd').each((_, el) => {
    const tag = (el as { tagName: string }).tagName.toLowerCase();
    if (tag === 'dt') {
      found = $(el).text().replace(/:$/, '').trim() === label;
    } else if (found && tag === 'dd') {
      result = $(el).text().trim() || undefined;
      found = false;
    }
  });
  return result;
};

const extractDlFieldLanguages = ($: CheerioAPI): string[] => {
  let inIdiomas = false;
  const langs: string[] = [];
  $('dl.dl-horizontal dt, dl.dl-horizontal dd').each((_, el) => {
    const tag = (el as { tagName: string }).tagName.toLowerCase();
    if (tag === 'dt') {
      inIdiomas = $(el).text().replace(/:$/, '').trim() === 'Idiomas';
    } else if (inIdiomas && tag === 'dd') {
      $(el)
        .find('img')
        .each((_, img) => {
          const title = $(img).attr('title');
          if (title) langs.push(title);
        });
      inIdiomas = false;
    }
  });
  return langs;
};

// ============================================================================
// Field extractors
// ============================================================================

const extractNickname = ($: CheerioAPI): string => {
  return $('h1.css_escort').first().text().trim();
};

const extractBio = ($: CheerioAPI): string | undefined => {
  const paragraphs: string[] = [];
  $('p.texto.css_escort').each((_, el) => {
    const text = $(el).text().trim();
    if (text && !text.toLowerCase().startsWith('estoy disponible')) {
      paragraphs.push(text);
    }
  });
  return paragraphs.join(' ').trim() || undefined;
};

const extractParams = ($: CheerioAPI): GirlsBcnParams => {
  const age = extractDlField($, 'Edad');
  const measurements = extractDlField($, 'Medidas');
  const heightCm = extractDlField($, 'Estatura');
  const weightKg = extractDlField($, 'Peso');
  const hairColor = extractDlField($, 'Cabello');
  const eyeColor = extractDlField($, 'Ojos');
  const nationality = extractDlField($, 'Nacionalidad');
  const schedule = extractDlField($, 'Horarios');
  const languages = extractDlFieldLanguages($);

  // City from "Estoy disponible en: Barcelona."
  let city: string | undefined;
  $('p.texto.css_escort').each((_, el) => {
    const text = $(el).text();
    const m = text.match(/disponible en:\s*([^.]+)/i);
    if (m) city = m[1]!.trim();
  });

  // Price range from "perfil-N.png"
  const rangoSrc = $('p.rango.css_escort img').first().attr('src') ?? '';
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
    ...(city ? { city } : {}),
    ...(priceRange !== undefined ? { priceRange } : {}),
  };
};

const extractPhone = ($: CheerioAPI): string | undefined => {
  const href = $('p.telefono a[href^="tel:"], .telefono a[href^="tel:"]').first().attr('href');
  if (href) return normalizeGBCNPhone(href.replace('tel:', ''));

  // Fallback: img alt containing phone pattern (e.g. "663-475-960" or "663475960")
  let phoneFromAlt: string | undefined;
  $('p.foto.css_escort img').each((_, el) => {
    const alt = $(el).attr('alt') ?? '';
    if (/^[\d\s-]{9,13}$/.test(alt)) {
      const digits = alt.replace(/\D/g, '');
      if (digits.length === 9) {
        phoneFromAlt = digits;
        return false; // break
      }
    }
    return;
  });
  return phoneFromAlt;
};

const extractWhatsapp = ($: CheerioAPI): { href?: string; phone?: string } => {
  const href = $('a[href*="wa.me"]').first().attr('href');
  if (!href) return {};
  return { href, phone: extractWhatsappPhone(href) };
};

const extractPhotos = ($: CheerioAPI): GirlsBcnPhoto[] => {
  const photos: GirlsBcnPhoto[] = [];
  const seen = new Set<string>();

  $('p.foto.css_escort img[src], img.foto.css_escort[src]').each((_, el) => {
    const src = $(el).attr('src') ?? '';
    // Filter to real photo CDN URLs, skip tiny icons/flags
    if (!src.includes('gbcnmedia') && !src.includes('media.')) return;
    if (seen.has(src)) return;
    seen.add(src);
    const alt = $(el).attr('alt');
    photos.push({ src, ...(alt ? { alt } : {}) });
  });

  return photos;
};

const extractVideo = ($: CheerioAPI): GirlsBcnVideo | undefined => {
  const src = $('video.css_escort source[src]').first().attr('src');
  if (!src) return undefined;
  const poster = $('video.css_escort').first().attr('poster');
  return { src, ...(poster ? { poster } : {}) };
};

// ============================================================================
// Public API
// ============================================================================

/** Extract from a Cheerio handle. `sourceUrl` must be passed (no canonical link). */
export const extractGirlsBcnFromCheerio = (
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
    video: extractVideo($),
  };
};

/** Extract from raw HTML string. */
export const extractGirlsBcn = (html: string, sourceUrl: string): GirlsBcnPayload => {
  return extractGirlsBcnFromCheerio(cheerio.load(html), sourceUrl);
};
