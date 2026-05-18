/**
 * gemidos extractor — HTML → GemidosPayload.
 *
 * Profile URL: /anuncio/{slug}/
 * Tech: Unknown (Cloudflare WAF). Profile pages SSR when bypassed.
 * Phone in .pub-phone span (text, not href).
 * Age/Height/Weight/Measurements via tag badges (.pub-tags-item.number).
 */

import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';

import {
  parseSourceIdFromUrl,
  parseGemidosPhone,
  parseFirstInt,
  parseNicknameFromTitle,
} from './gemidos.parsers.js';
import type { GemidosParams, GemidosPayload, GemidosPhoto } from './gemidos.types.js';

const getTagValue = ($: CheerioAPI, label: string): string | undefined => {
  let value: string | undefined;
  $('.pub-tags-item').each((_, el) => {
    if (value) return;
    const small = $(el).find('small').text().toLowerCase();
    if (small.includes(label.toLowerCase())) {
      // Text node (not the small) contains the value
      value =
        $(el)
          .contents()
          .filter((_, n) => n.type === 'text')
          .text()
          .trim() || undefined;
    }
    return;
  });
  return value;
};

export const extractGemidos = (html: string, sourceUrl: string): GemidosPayload => {
  const $ = cheerio.load(html);

  const sourceId = parseSourceIdFromUrl(sourceUrl);

  const title = $('.pub-title').text().trim() || '';
  const nickname = parseNicknameFromTitle(title);

  const bio = $('.pub-about-full').text().trim() || undefined;

  // Phone is plain text inside .pub-phone span, not a tel: href
  const phoneText = $('.pub-phone span').first().text().trim();
  const phone = parseGemidosPhone(phoneText);

  const photos: GemidosPhoto[] = [];
  $('.pub-picture img, .pub-book-item img, .story img, .cover img').each((_, el) => {
    const src = $(el).attr('src') ?? $(el).attr('data-src') ?? '';
    if (src && !photos.some((p) => p.src === src)) photos.push({ src });
    return;
  });
  if (photos.length === 0) {
    const ogImg = $('meta[property="og:image"]').attr('content');
    if (ogImg) photos.push({ src: ogImg });
  }

  const isVerified = $('.badge-verified, .fa-shield-check').length > 0;

  const services: string[] = [];
  $('.pub-services .pub-tags-item, .pub-tags-item.pub_services').each((_, el) => {
    const name = $(el).text().trim();
    if (name) services.push(name);
    return;
  });

  // Age, height, weight from numeric tags (contain "Años", "CM", "KG" labels)
  const ageTag = $('.pub-tags-item.number').filter((_, el) => {
    return /años/i.test($(el).text());
  }).first().text();

  const heightTag = $('.pub-tags-item.number').filter((_, el) => {
    return /cm/i.test($(el).text());
  }).first().text();

  const weightTag = $('.pub-tags-item.number').filter((_, el) => {
    return /kg/i.test($(el).text());
  }).first().text();

  // Measurements: tag with N-N-N pattern
  let measurements: string | undefined;
  $('.pub-tags-item.number').each((_, el) => {
    if (measurements) return;
    const text = $(el).text().trim();
    if (/\d+-\d+-\d+/.test(text)) measurements = text;
    return;
  });

  const params: GemidosParams = {
    age: parseFirstInt(ageTag),
    heightCm: parseFirstInt(heightTag),
    weightKg: parseFirstInt(weightTag),
    measurements: measurements ?? undefined,
    nationality: getTagValue($, 'Nacionalidad'),
    ethnicity: getTagValue($, 'Piel'),
    services: services.length > 0 ? services : undefined,
  };

  return {
    sourceId,
    sourceUrl,
    title,
    nickname,
    bio,
    phone,
    params,
    photos,
    isVerified,
  };
};
