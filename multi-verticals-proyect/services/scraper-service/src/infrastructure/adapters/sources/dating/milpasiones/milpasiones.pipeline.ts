import * as cheerio from 'cheerio';

import type { MilpasionesPayload } from './milpasiones.types.js';
import { DatingPipelineBase } from '../dating-pipeline.base.js';
import { extractMilpasiones } from './milpasiones.extractor.js';
import { mapMilpasiones } from './milpasiones.mapper.js';

const COOKIE_SELECTORS = ['.cookie_advice button', 'button[class*="accept"]', '#accept-cookies'];

export class MilpasionesPipeline extends DatingPipelineBase<MilpasionesPayload> {
  readonly identifier = 'milpasiones';

  canHandle(url: string): boolean {
    return url.includes('milpasiones.com');
  }

  isProfileUrl(url: string): boolean {
    return url.includes('/anuncio/');
  }

  extract(html: string, sourceUrl: string): MilpasionesPayload {
    return extractMilpasiones(html, sourceUrl);
  }

  map = mapMilpasiones;

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }

  override extractNextPageUrl(html: string, baseUrl: string): string | undefined {
    const $ = cheerio.load(html);
    const next = $('link[rel="next"], a[rel="next"]').attr('href');
    if (next) {
      try {
        return new URL(next, baseUrl).toString();
      } catch {
        /* fall through to query-string pagination */
      }
    }
    const pageMatch = baseUrl.match(/[?&]pag=(\d+)/);
    const page = pageMatch && pageMatch[1] ? parseInt(pageMatch[1], 10) + 1 : 2;
    try {
      const urlObj = new URL(baseUrl);
      urlObj.searchParams.set('pag', String(page));
      return urlObj.toString();
    } catch {
      const sep = baseUrl.includes('?') ? '&' : '?';
      return `${baseUrl}${sep}pag=${page}`;
    }
  }
}
