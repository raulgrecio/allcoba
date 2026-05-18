/**
 * Chicasmalas extractor — Playwright-rendered Elementor HTML → ChicasmalasPayload.
 *
 * The static HTML has no profile data (Elementor JS-rendered).
 * Input must be the fully-rendered HTML captured by Playwright after clicking
 * the age gate and cookie consent buttons.
 */

import * as cheerio from 'cheerio';

import {
  parseSourceIdFromUrl,
  parsePhoneFromSlug,
  parseCityFromSlug,
  parseNicknameFromMetaTitle,
  parseChicasmalasPhone,
  parseChicasmalasWhatsapp,
  parseCityFromMapsUrl,
} from './chicasmalas.parsers.js';
import type { ChicasmalasPayload } from './chicasmalas.types.js';

export function extractChicasmalas(html: string, sourceUrl: string): ChicasmalasPayload {
  const $ = cheerio.load(html);

  const sourceId = parseSourceIdFromUrl(sourceUrl);
  const phoneFromSlug = parsePhoneFromSlug(sourceId);
  const cityFromSlug = parseCityFromSlug(sourceId);

  const metaTitle =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('title').first().text().trim() ||
    '';

  const nickname = parseNicknameFromMetaTitle(metaTitle);

  // Bio from Elementor JetSmarts tabs content (primary) or first h2 in text col
  const bio =
    $('.jkit-tabs .tab-description, .tab-content .tab-description').first().text().trim() ||
    undefined;

  // Phone from body tel: links
  let phone: string | undefined;
  $('a[href^="tel:"], a[href^="tel://"]').each((_, el) => {
    if (phone) return;
    const parsed = parseChicasmalasPhone($(el).attr('href') ?? '');
    if (parsed) phone = parsed;
  });
  phone = phone ?? phoneFromSlug;

  // WhatsApp
  let whatsappPhone: string | undefined;
  const waHref =
    $('a[href*="api.whatsapp.com"]').first().attr('href') ||
    $('a[href*="wa.me"]').first().attr('href');
  if (waHref) whatsappPhone = parseChicasmalasWhatsapp(waHref);

  // Gallery: Elementor lightbox links (full-size JPEG)
  const photos: Array<{ src: string }> = [];
  $('a.e-gallery-item[href*="/wp-content/uploads/"]').each((_, el) => {
    const href = $(el).attr('href');
    if (href) photos.push({ src: href });
  });

  // Fallback: Elementor widget images
  if (photos.length === 0) {
    $('.elementor-widget-image img').each((_, el) => {
      const src =
        $(el).attr('data-lzl-src') || $(el).attr('data-src') || $(el).attr('src') || '';
      if (src.includes('/wp-content/uploads/') && !src.startsWith('data:')) {
        photos.push({ src });
      }
    });
  }

  // Fallback: og:image
  if (photos.length === 0) {
    const og = $('meta[property="og:image"]').attr('content');
    if (og) photos.push({ src: og });
  }

  // City: Google Maps iframe q param → first word (city name)
  let city: string | undefined;
  const mapsSrc = $('iframe[data-src*="maps.google.com"]').attr('data-src');
  if (mapsSrc) city = parseCityFromMapsUrl(mapsSrc);
  city = city ?? cityFromSlug;

  return {
    sourceId,
    sourceUrl,
    title: metaTitle || undefined,
    nickname,
    bio,
    phone,
    whatsappPhone,
    photos,
    city,
    isVerified: false,
  };
}
