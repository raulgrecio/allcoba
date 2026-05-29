/**
 * mislios extractor — HTML → MisliosPayload.
 *
 * Profile URL: /escorts/{ciudad}/{slug}-{id}/
 * Tech: WordPress + mislios custom plugin (SSR).
 * Listing is AJAX-rendered but individual profiles are SSR.
 */

import * as cheerio from 'cheerio';

import type { MisliosPayload, MisliosPhoto } from './mislios.types.js';
import {
  parseMisliosPhone,
  parseNicknameFromTitle,
  parseSourceIdFromUrl,
} from './mislios.parsers.js';

export const extractMislios = (html: string, sourceUrl: string): MisliosPayload => {
  const $ = cheerio.load(html);

  const sourceId = parseSourceIdFromUrl(sourceUrl);

  const title = $('h1').first().text().trim() || $('.msl-profile-name').first().text().trim() || '';

  const nickname = parseNicknameFromTitle(title);

  const bio =
    $('.msl-profile-desc').first().text().trim() ||
    $('.profile-text').first().text().trim() ||
    undefined;

  const phoneHref = $('a[href^="tel:"]').first().attr('href');
  const phone = parseMisliosPhone(phoneHref);

  const photos: MisliosPhoto[] = [];
  $('.msl-gallery img').each((_, el) => {
    const src = $(el).attr('src') ?? $(el).attr('data-src') ?? '';
    if (src && !photos.some((p) => p.src === src)) photos.push({ src });
    return;
  });

  // OG image fallback
  if (photos.length === 0) {
    const ogImg = $('meta[property="og:image"]').attr('content');
    if (ogImg) photos.push({ src: ogImg });
  }

  return {
    sourceId,
    sourceUrl,
    title,
    nickname,
    bio,
    phone,
    photos,
  };
};
