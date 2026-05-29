import * as cheerio from 'cheerio';

import type { ArdientePlacerPayload } from './ardienteplacer.types.js';
import { DatingPipelineBase } from '../dating-pipeline.base.js';
import { extractArdienteplacer } from './ardienteplacer.extractor.js';
import { mapArdienteplacer } from './ardienteplacer.mapper.js';

const COOKIE_SELECTORS = [
  '#onetrust-accept-btn-handler',
  'button.accept-cookies',
  '[class*="cookie"] button[class*="accept"]',
];

const AGE_GATE_SELECTORS = [
  'button:contains("Soy mayor")',
  'a:contains("Soy mayor")',
  'button:contains("Tengo más de 18")',
  '.btn-18',
  '#btn-mayores',
  '#acepto-18',
];

const NEXT_PAGE_SELECTOR = 'a[rel="next"], .pagination a.next, a:contains("Siguiente")';

export class ArdienteplacerPipeline extends DatingPipelineBase<ArdientePlacerPayload> {
  readonly identifier = 'ardienteplacer';

  canHandle(url: string): boolean {
    return url.includes('ardienteplacer.com');
  }

  isProfileUrl(url: string): boolean {
    return /\/escort\/[^/]+\/[^/]+\/\d+\/\d+$/.test(url);
  }

  extract(html: string, sourceUrl: string): ArdientePlacerPayload {
    return extractArdienteplacer(html, sourceUrl);
  }

  map = mapArdienteplacer;

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }

  protected override getAgeGateSelectors(): string[] {
    return AGE_GATE_SELECTORS;
  }

  override extractNextPageUrl(html: string, baseUrl: string): string | undefined {
    const $ = cheerio.load(html);
    const next = $(NEXT_PAGE_SELECTOR).attr('href');
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
    return `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}pagina=2`;
  }
}
