/**
 * hotvalencia extractor — HTML → HotvalenciaPayload.
 *
 * Profile URL: /putas-valencia/{slug}/
 * Tech: WordPress + Elementor. Listing requires login, profile pages may be public.
 */

import * as cheerio from 'cheerio';

import type { HotvalenciaPayload, HotvalenciaPhoto } from './hotvalencia.types.js';
import {
  parseHotvalenciaPhone,
  parseNicknameFromTitle,
  parseSourceIdFromUrl,
} from './hotvalencia.parsers.js';

export const extractHotvalencia = (html: string, sourceUrl: string): HotvalenciaPayload => {
  const $ = cheerio.load(html);

  const sourceId = parseSourceIdFromUrl(sourceUrl);

  const title =
    $('h1.entry-title').first().text().trim() ||
    $('h1.elementor-heading-title').first().text().trim() ||
    $('h1').first().text().trim() ||
    '';

  const nickname = parseNicknameFromTitle(title);

  const bio =
    $('.elementor-text-editor').first().text().trim() ||
    $('.entry-content p').first().text().trim() ||
    undefined;

  const phoneHref = $('a[href^="tel:"]').first().attr('href');
  const phone = parseHotvalenciaPhone(phoneHref);

  const photos: HotvalenciaPhoto[] = [];
  $('.elementor-image img, .wp-post-image').each((_, el) => {
    const src = $(el).attr('src') ?? $(el).attr('data-src') ?? '';
    if (src && !photos.some((p) => p.src === src)) photos.push({ src });
    return;
  });
  if (photos.length === 0) {
    const ogImg = $('meta[property="og:image"]').attr('content');
    if (ogImg) photos.push({ src: ogImg });
  }

  const hasVideo = $('video').length > 0;

  return {
    sourceId,
    sourceUrl,
    title,
    nickname,
    bio,
    phone,
    photos,
    hasVideo,
  };
};
