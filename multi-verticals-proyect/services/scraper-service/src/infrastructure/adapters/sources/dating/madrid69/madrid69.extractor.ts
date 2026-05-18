import * as cheerio from 'cheerio';

import {
  parseSourceIdFromUrl,
  parseCityFromUrl,
  parseNicknameFromTitle,
  parseMadrid69PhoneFromTitle,
  parseMadrid69ApiProfile,
} from './madrid69.parsers.js';
import type { Madrid69Payload } from './madrid69.types.js';

const CDN_PATTERN = /madrid69\.b-cdn\.net\/image\//;

/**
 * Extracts a Madrid69Payload from the Next.js SSR head (metadata tags).
 * The body is empty (CSR), so all data comes from <head> meta/preload tags.
 * Pass `apiJson` (captured via Playwright network interception) to enrich
 * with the full Laravel API profile (age, city, services, etc.).
 */
export function extractMadrid69(html: string, sourceUrl: string, apiJson?: unknown): Madrid69Payload {
  const $ = cheerio.load(html);

  const sourceId = parseSourceIdFromUrl(sourceUrl);
  const cityFromUrl = parseCityFromUrl(sourceUrl);

  const titleText =
    $('title').first().text().trim() ||
    $('meta[property="og:title"]').attr('content')?.trim() ||
    '';

  const bio =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    undefined;

  const nickname = parseNicknameFromTitle(titleText);
  const phone = parseMadrid69PhoneFromTitle(titleText);

  // Collect CDN profile photos from <link rel="preload" as="image"> (deduplicated by path)
  const seen = new Set<string>();
  const photos: Array<{ src: string }> = [];

  $('link[rel="preload"][as="image"]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (!CDN_PATTERN.test(href)) return;
    const key = href.split('?')[0]!;
    if (!seen.has(key)) {
      seen.add(key);
      photos.push({ src: href });
    }
  });

  // Fallback: og:image
  if (photos.length === 0) {
    const og = $('meta[property="og:image"]').attr('content');
    if (og) photos.push({ src: og });
  }

  let payload: Madrid69Payload = {
    sourceId,
    sourceUrl,
    title: titleText || undefined,
    nickname,
    bio,
    phone,
    photos,
    city: cityFromUrl,
    isVerified: false,
    isVip: false,
  };

  if (apiJson != null) {
    const api = parseMadrid69ApiProfile(apiJson);
    payload = {
      ...payload,
      ...api,
      // API photos take priority; fall back to head-extracted photos
      photos: api.photos?.length ? api.photos : payload.photos,
    };
  }

  return payload;
}
