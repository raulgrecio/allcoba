/**
 * discovery extractor — HTML → DiscoveryPayload.
 *
 * Catch-all: extrae solo los campos presentes en casi cualquier página.
 */

import * as cheerio from 'cheerio';

import { hashUrl } from './discovery.parsers.js';
import type { DiscoveryPayload, DiscoveryPhoto } from './discovery.types.js';

const IMAGE_SELECTORS = [
  'meta[property="og:image"]',
  'article img',
  '.product img',
  'main img',
  '#content img',
];

export function extractDiscovery(html: string, sourceUrl: string): DiscoveryPayload {
  const $ = cheerio.load(html);

  const title =
    $('title').first().text().trim() ||
    $('h1').first().text().trim() ||
    'Sin título';

  const description =
    $('meta[name="description"]').attr('content')?.trim() ||
    $('meta[property="og:description"]').attr('content')?.trim() ||
    undefined;

  const seen = new Set<string>();
  const photos: DiscoveryPhoto[] = [];

  for (const selector of IMAGE_SELECTORS) {
    $(selector).each((_, el) => {
      const raw =
        $(el).attr('content') ?? $(el).attr('src') ?? $(el).attr('data-src') ?? '';
      if (!raw) return;
      try {
        const abs = new URL(raw, sourceUrl).toString();
        if (!seen.has(abs) && /^https?:/.test(abs)) {
          seen.add(abs);
          photos.push({ url: abs });
        }
      } catch {
        /* URL inválida */
      }
    });
  }

  return {
    sourceId: hashUrl(sourceUrl),
    sourceUrl,
    title,
    description,
    photos,
  };
}
