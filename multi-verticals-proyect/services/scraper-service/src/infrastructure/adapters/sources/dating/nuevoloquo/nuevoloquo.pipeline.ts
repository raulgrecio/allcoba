import * as cheerio from 'cheerio';

import type { NuevoloquoPayload } from './nuevoloquo.types.js';
import { DatingPipelineBase } from '../dating-pipeline.base.js';
import { extractNuevoloquo } from './nuevoloquo.extractor.js';
import { mapNuevoloquo } from './nuevoloquo.mapper.js';

const COOKIE_SELECTORS = [
  '.cc-accept-all-btn',
  'button.accept-cookies',
  '[data-cc="accept-all"]',
  'button.btn-accept',
];

const AGE_GATE_SELECTORS = ['#show-more'];

export class NuevoloquoPipeline extends DatingPipelineBase<NuevoloquoPayload> {
  readonly identifier = 'nuevoloquo';

  canHandle(url: string): boolean {
    return /nuevoloquo\.(ch|com|es)/.test(url);
  }

  isProfileUrl(url: string): boolean {
    // Profile: /{categoria}/{ciudad}/{slug}/{id}/  (escort, masaje-erotico, ...)
    return /^\/[^/]+\/[^/]+\/[^/]+\/\d+\/?$/.test(new URL(url).pathname);
  }

  extract(html: string, sourceUrl: string): NuevoloquoPayload {
    return extractNuevoloquo(html, sourceUrl);
  }

  map = mapNuevoloquo;

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }

  protected override getAgeGateSelectors(): string[] {
    return AGE_GATE_SELECTORS;
  }

  override extractNextPageUrl(html: string, baseUrl: string): string | undefined {
    const $ = cheerio.load(html);
    const next = $('a[rel="next"], .page-link[aria-label="Next"], a.next').attr('href');
    if (next) {
      try {
        return new URL(next, baseUrl).toString();
      } catch {
        /* fall through to query-string pagination */
      }
    }
    const pageMatch = baseUrl.match(/[?&]page=(\d+)/);
    const page = pageMatch && pageMatch[1] ? parseInt(pageMatch[1], 10) + 1 : 2;
    const separator = baseUrl.includes('?') ? '&' : '?';
    const base = baseUrl.split('?')[0] ?? baseUrl;
    return `${base}${separator}page=${page}`;
  }
}
