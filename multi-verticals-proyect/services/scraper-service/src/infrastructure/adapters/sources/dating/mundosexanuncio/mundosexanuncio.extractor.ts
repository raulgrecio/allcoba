/**
 * mundosexanuncio extractor — HTML → MundosexanuncioPayload.
 *
 * Profile URL: /contactos-mujeres/{slug}-{id}
 * Tech: PHP SSR. El anuncio principal vive en `section .main`; los datos de
 * contacto y ciudad en `.details` (atributos data-*). Texto libre — la edad
 * solo aparece embebida en el bio.
 */

import * as cheerio from 'cheerio';

import type { MundosexanuncioPayload, MundosexanuncioPhoto } from './mundosexanuncio.types.js';
import {
  parseAgeFromText,
  parseMundoPhone,
  parseMundoWhatsapp,
  parseSourceIdFromUrl,
} from './mundosexanuncio.parsers.js';

export const extractMundosexanuncio = (html: string, sourceUrl: string): MundosexanuncioPayload => {
  const $ = cheerio.load(html);

  const sourceId = parseSourceIdFromUrl(sourceUrl);

  const title = $('section .main .title').first().text().trim();

  // nickname: primer token tras quitar emojis/símbolos iniciales
  const cleanTitle = title.replace(/^[^\p{L}\p{N}]+/u, '').trim();
  const nickname =
    cleanTitle
      .split(/\s+/)[0]
      ?.replace(/[,;:]+$/, '')
      .trim() || undefined;

  const bio = $('section .main .a_content').first().text().trim() || undefined;

  const details = $('.details').first();
  const city = details.attr('data-city')?.trim() || undefined;
  const zone =
    $('.details .addr').first().text().trim() ||
    $('.zona')
      .first()
      .text()
      .trim()
      .replace(/\s*\(.*?\)/, '')
      .trim() ||
    undefined;

  const phone = parseMundoPhone($('.fa_tel a[href^="tel:"]').first().attr('href'));
  const whatsappPhone = parseMundoWhatsapp($('a[href*="api.whatsapp.com"]').first().attr('href'));

  const age = parseAgeFromText(bio);

  const photos: MundosexanuncioPhoto[] = [];
  const seen = new Set<string>();
  $('#images img, .masonry img').each((_, el) => {
    const src = $(el).attr('data-src') ?? $(el).attr('src') ?? '';
    if (src && src.startsWith('http') && !seen.has(src)) {
      seen.add(src);
      photos.push({ src });
    }
  });

  return {
    sourceId,
    sourceUrl,
    title,
    nickname,
    bio,
    phone,
    whatsappPhone,
    city,
    zone,
    age,
    photos,
  };
};
