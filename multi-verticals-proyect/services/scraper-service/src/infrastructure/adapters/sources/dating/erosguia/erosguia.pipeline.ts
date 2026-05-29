import * as cheerio from 'cheerio';

import type { ErosguiaPayload } from './erosguia.types.js';
import { DatingPipelineBase } from '../dating-pipeline.base.js';
import { extractErosguia } from './erosguia.extractor.js';
import { mapErosguia } from './erosguia.mapper.js';

const COOKIE_SELECTORS = [
  '#onetrust-accept-btn-handler',
  'button[id*="cookie-accept"]',
  'button[class*="cookie-accept"]',
  '.cookie-consent__button',
];

export class ErosguiaPipeline extends DatingPipelineBase<ErosguiaPayload> {
  readonly identifier = 'erosguia';

  canHandle(url: string): boolean {
    return url.includes('erosguia.com');
  }

  isProfileUrl(url: string): boolean {
    return /\/\d+\.html$/.test(url);
  }

  extract(html: string, sourceUrl: string): ErosguiaPayload {
    return extractErosguia(html, sourceUrl);
  }

  map = mapErosguia;

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }

  override extractNextPageUrl(html: string, baseUrl: string): string | undefined {
    const $ = cheerio.load(html);
    const next = $('a[rel="next"]').attr('href');
    if (next) {
      try {
        return new URL(next, baseUrl).toString();
      } catch {
        /* fall through to query-string pagination */
      }
    }
    const pageMatch = baseUrl.match(/[?&]pagina=(\d+)/);
    if (pageMatch && pageMatch[1]) {
      const p = parseInt(pageMatch[1], 10) + 1;
      return baseUrl.replace(/pagina=\d+/, `pagina=${p}`);
    }
    const sep = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${sep}pagina=2`;
  }
}
