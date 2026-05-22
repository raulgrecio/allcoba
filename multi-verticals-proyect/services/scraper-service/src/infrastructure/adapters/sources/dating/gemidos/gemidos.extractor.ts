/**
 * gemidos extractor — HTML → GemidosPayload.
 *
 * Profile URL: /anuncio/{slug}/
 * Tech: Unknown (Cloudflare WAF). Profile pages SSR when bypassed.
 * Phone in .pub-phone span (text, not href).
 * Age/Height/Weight/Measurements via tag badges (.pub-tags-item.number).
 */

import type { CheerioAPI } from 'cheerio';
import * as cheerio from 'cheerio';

import type {
  GemidosParams,
  GemidosPayload,
  GemidosPhoto,
  GemidosService,
} from './gemidos.types.js';
import {
  parseFirstInt,
  parseGemidosPhone,
  parseNicknameFromTitle,
  parseSourceIdFromUrl,
} from './gemidos.parsers.js';

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

  // WhatsApp via data-whatsapp-phone on .pub-menu button (plain number, includes country prefix)
  const whatsapp =
    $('button[data-trigger="Whatsapp.send"]').attr('data-whatsapp-phone')?.trim() || undefined;

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

  // Cada clase CSS mapea a una categoría funcional
  const CLASS_CATEGORY: Record<string, GemidosService['category']> = {
    pub_services: 'services',
    pub_services_oral: 'oral',
    pub_services_fantasy: 'fantasy',
    pub_services_massage: 'massage',
    pub_services_online: 'online',
    pub_services_extra: 'extra',
  };

  const services: GemidosService[] = [];
  $('.pub-services .pub-tags-item').each((_, el) => {
    const label = $(el).text().trim();
    const slug = $(el).attr('href') ?? '';
    // Skip icon artifacts: empty labels, single-char labels, or slugs with trailing dash
    if (!label || label.length <= 1 || slug.endsWith('-')) return;
    const classList = ($(el).attr('class') ?? '').split(/\s+/);
    const categoryClass = classList.find((c) => CLASS_CATEGORY[c]);
    const category: GemidosService['category'] = categoryClass
      ? CLASS_CATEGORY[categoryClass]!
      : 'services';
    services.push({ slug, label, category });
    return;
  });

  // Ubicación: tags de tipo de encuentro
  const locationTags: string[] = [];
  $('.pub-location-tag').each((_, el) => {
    const tag = $(el).text().trim();
    if (tag) locationTags.push(tag);
    return;
  });

  // Dirección libre ("Me encuentro en <strong>…</strong>")
  let address: string | undefined;
  $('.pub-map-label strong').each((_, el) => {
    const text = $(el).text().trim();
    if (text) {
      address = text;
      return false; // break
    }
    return;
  });

  // Age, height, weight from numeric tags (contain "Años", "CM", "KG" labels)
  const ageTag = $('.pub-tags-item.number')
    .filter((_, el) => {
      return /años/i.test($(el).text());
    })
    .first()
    .text();

  const heightTag = $('.pub-tags-item.number')
    .filter((_, el) => {
      return /cm/i.test($(el).text());
    })
    .first()
    .text();

  const weightTag = $('.pub-tags-item.number')
    .filter((_, el) => {
      return /kg/i.test($(el).text());
    })
    .first()
    .text();

  // Measurements: tag with N-N-N pattern
  let measurements: string | undefined;
  $('.pub-tags-item.number').each((_, el) => {
    if (measurements) return;
    const text = $(el).text().trim();
    if (/\d+-\d+-\d+/.test(text)) measurements = text;
    return;
  });

  // Working hours (.pub-hours-time): "FULL TIME" or schedule text
  const workingHours = $('.pub-hours-time').first().text().trim() || undefined;

  const params: GemidosParams = {
    age: parseFirstInt(ageTag),
    heightCm: parseFirstInt(heightTag),
    weightKg: parseFirstInt(weightTag),
    measurements: measurements ?? undefined,
    nationality: getTagValue($, 'Nacionalidad'),
    ethnicity: getTagValue($, 'Piel'),
    services: services.length > 0 ? services : undefined,
    locationTags: locationTags.length > 0 ? locationTags : undefined,
    address,
    workingHours,
  };

  return {
    sourceId,
    sourceUrl,
    title,
    nickname,
    bio,
    phone,
    whatsapp,
    params,
    photos,
    isVerified,
  };
};
