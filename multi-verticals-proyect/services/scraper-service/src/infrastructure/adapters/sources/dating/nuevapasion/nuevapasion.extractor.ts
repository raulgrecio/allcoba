/**
 * nuevapasion extractor — HTML → NuevapasionPayload.
 *
 * Profile URL: /anuncio/{slug}
 * Tech: Bootstrap 5 + PHP (SSR after Playwright bypasses age gate).
 */

import * as cheerio from 'cheerio';

import type { NuevapasionPayload, NuevapasionPhoto } from './nuevapasion.types.js';
import {
  parseNicknameFromTitle,
  parseNuevapasionPhone,
  parseSourceIdFromUrl,
} from './nuevapasion.parsers.js';

export const extractNuevapasion = (html: string, sourceUrl: string): NuevapasionPayload => {
  const $ = cheerio.load(html);

  const sourceId = parseSourceIdFromUrl(sourceUrl);

  const title =
    $('h1').first().text().trim() ||
    $('.ad-title').first().text().trim() ||
    $('.titulo-anuncio').first().text().trim() ||
    '';

  const nickname = parseNicknameFromTitle(title);

  const bio =
    $('.descripcion').first().text().trim() ||
    $('.anuncio-body').first().text().trim() ||
    $('.ad-description').first().text().trim() ||
    undefined;

  const phoneHref = $('a[href^="tel:"]').first().attr('href');
  const phone = parseNuevapasionPhone(phoneHref);

  const waHref = $('a[href*="wa.me"], a[href*="whatsapp"]').first().attr('href');
  const whatsappPhone = parseNuevapasionPhone(
    waHref?.match(/\d{9,}/)?.[0] ? `tel:${waHref.match(/\d{9,}/)?.[0]}` : undefined,
  );

  const photos: NuevapasionPhoto[] = [];
  const addPhoto = (src: string | undefined) => {
    if (src && !photos.some((p) => p.src === src)) photos.push({ src });
  };

  $('.gallery img, .foto img, .swiper-slide img').each((_, el) => {
    addPhoto($(el).attr('src') ?? $(el).attr('data-src') ?? $(el).attr('data-lazy') ?? undefined);
    return;
  });

  // OG image fallback
  if (photos.length === 0) {
    const ogImg = $('meta[property="og:image"]').attr('content');
    if (ogImg) addPhoto(ogImg);
  }

  return {
    sourceId,
    sourceUrl,
    title,
    nickname,
    bio,
    phone,
    whatsappPhone,
    photos,
  };
};
