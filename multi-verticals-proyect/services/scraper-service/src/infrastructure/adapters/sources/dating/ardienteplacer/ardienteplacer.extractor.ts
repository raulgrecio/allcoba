/**
 * Ardienteplacer extractor — ardienteplacer.com HTML → ArdientePlacerPayload (pure, no I/O).
 *
 * Technology: Bootstrap 3 + PHP SSR.
 * Profile URL: /escort/{category}/{city}/{phone}/{id}
 *
 * sourceId = last URL path segment (numeric ad ID)
 * phone    = 2nd-to-last URL path segment (9-digit Spanish phone)
 * city     = 3rd-to-last URL path segment
 */

import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import {
  extractArdientePlacerWhatsappPhone,
  parseCityFromUrl,
  parseNicknameFromTitle,
  parsePhoneFromUrl,
  parseSourceIdFromUrl,
} from './ardienteplacer.parsers.js';
import type {
  ArdientePlacerParams,
  ArdientePlacerPayload,
  ArdientePlacerPhoto,
} from './ardienteplacer.types.js';

// ============================================================================
// Field extractors
// ============================================================================

const extractTitle = ($: CheerioAPI): string =>
  $('h3#info').first().text().trim() || $('h1').first().text().trim().split(' - ')[0]?.trim() || '';

const extractBio = ($: CheerioAPI): string | undefined => {
  const div = $('div[style*="word-break: break-word"]').first().clone();
  div.find('.toplistingblock').remove();
  const text = div.text().trim();
  return text || undefined;
};

const extractParams = ($: CheerioAPI, url: string): ArdientePlacerParams => {
  const cityFromUrl = parseCityFromUrl(url);

  // City: div.postcatblock → "Mujeres en Madrid (Madrid)"
  let city: string | undefined;
  const postcatText = $('div.postcatblock').first().text().trim();
  if (postcatText) {
    const m = postcatText.match(/en\s+(.+?)(?:\s*\(|$)/i);
    if (m) city = m[1]!.trim();
  }
  city = city || cityFromUrl;

  // Nationality: flag img alt "De España" → "España"
  let nationality: string | undefined;
  const flagAlt = $('img[src*="/images/flags/"]').first().attr('alt');
  if (flagAlt) nationality = flagAlt.replace(/^De\s+/i, '').trim() || undefined;

  // Age + rate: from ul.entry-meta li
  let age: string | undefined;
  let rateRaw: string | undefined;
  $('ul.entry-meta li, ul.listawidget li').each((_, el) => {
    const text = $(el).text().trim();
    if (!age && /^\d+\s+años$/i.test(text)) age = text;
    if (!rateRaw && /\d+\s*€\/(hora|h)\b/i.test(text)) rateRaw = text;
  });

  return {
    ...(age ? { age } : {}),
    ...(nationality ? { nationality } : {}),
    ...(city ? { city } : {}),
    ...(rateRaw ? { rateRaw } : {}),
  };
};

const extractServices = ($: CheerioAPI): string[] => {
  const services: string[] = [];
  $('h5.titulo:contains("Servicios")').nextAll('ul.list-unstyled').first().find('li').each((_, el) => {
    const name = $(el).text().trim();
    if (name) services.push(name);
  });
  // Fallback: h5.titulo ~ ul.list-unstyled
  if (services.length === 0) {
    $('h5.titulo').each((_, h5) => {
      if ($(h5).text().toLowerCase().includes('servicio')) {
        $(h5).next('ul.list-unstyled').find('li').each((_, el) => {
          const name = $(el).text().trim();
          if (name) services.push(name);
        });
      }
    });
  }
  return services;
};

const extractPhone = ($: CheerioAPI, url: string): string | undefined => {
  // Primary: .modal1 .tel b — strip non-digits, take last 9
  let phone: string | undefined;
  $('.modal1 div.tel b, .modal1 .tel b').each((_, el) => {
    if (phone) return;
    const raw = $(el).text().replace(/\D/g, '');
    if (raw.length >= 9) phone = raw.slice(-9);
  });
  if (phone) return phone;
  // Fallback: URL 4th path segment
  return parsePhoneFromUrl(url);
};

const extractWhatsapp = ($: CheerioAPI): { href?: string; phone?: string } => {
  const href =
    $('.modal1 a[href*="wa.me"]').first().attr('href') ??
    $('a[href*="api.whatsapp.com"]').first().attr('href') ??
    $('a[href*="wa.me"]').first().attr('href');
  if (!href) return {};
  return { href, phone: extractArdientePlacerWhatsappPhone(href) };
};

const extractPhotos = ($: CheerioAPI, sourceUrl: string): ArdientePlacerPhoto[] => {
  const photos: ArdientePlacerPhoto[] = [];
  const seen = new Set<string>();

  // Full-size from data-lightbox hrefs: /anuncios/{id}/{id}-{imgid}-g.jpg
  $('a[data-lightbox][href^="/anuncios/"]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (!href || seen.has(href)) return;
    // Skip thumbnails accidentally grabbed as hrefs
    if (href.includes('-m.jpg') || href.includes('-s.jpg')) return;
    seen.add(href);
    const src = new URL(href, sourceUrl).href;
    const alt = $(el).find('img').attr('alt');
    photos.push({ src, ...(alt ? { alt } : {}) });
  });

  return photos;
};

// ============================================================================
// Public API
// ============================================================================

export const extractArdientePlacerFromCheerio = (
  $: CheerioAPI,
  sourceUrl: string,
): ArdientePlacerPayload => {
  const title = extractTitle($);
  const wa = extractWhatsapp($);

  return {
    sourceId: parseSourceIdFromUrl(sourceUrl),
    sourceUrl,
    title,
    nickname: parseNicknameFromTitle(title),
    bio: extractBio($),
    params: extractParams($, sourceUrl),
    services: extractServices($),
    phone: extractPhone($, sourceUrl),
    ...(wa.phone ? { whatsappPhone: wa.phone } : {}),
    ...(wa.href ? { whatsappHref: wa.href } : {}),
    photos: extractPhotos($, sourceUrl),
  };
};

export const extractArdienteplacer = (html: string, sourceUrl: string): ArdientePlacerPayload =>
  extractArdientePlacerFromCheerio(cheerio.load(html), sourceUrl);
