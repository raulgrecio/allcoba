import type { GirlsBcnPayload } from '../girlsbcn/girlsbcn.types.js';
import { DatingPipelineBase } from '../dating-pipeline.base.js';
import { extractGirlsMadrid } from './girlsmadrid.extractor.js';
import { mapGirlsMadrid } from './girlsmadrid.mapper.js';

const COOKIE_SELECTORS = [
  '#onetrust-accept-btn-handler',
  'button[class*="accept"]',
  '.cc-accept',
  '#cn-accept-cookie',
  '.cookie-notice-accept',
  '#cookie-notice-accept',
];

const AGE_GATE_SELECTORS = [
  '#modal-aviso button',
  'a:contains("ENTRAR")',
  'button:contains("Aceptar")',
];

export class GirlsmadridPipeline extends DatingPipelineBase<GirlsBcnPayload> {
  readonly identifier = 'girlsmadrid';

  canHandle(url: string): boolean {
    return url.includes('girlsmadrid.com');
  }

  isProfileUrl(url: string): boolean {
    return /\/escort\/[^/]+\.html/.test(url);
  }

  extract(html: string, sourceUrl: string): GirlsBcnPayload {
    return extractGirlsMadrid(html, sourceUrl);
  }

  map = mapGirlsMadrid;

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }

  protected override getAgeGateSelectors(): string[] {
    return AGE_GATE_SELECTORS;
  }

  protected override getNextPageSelector(): string {
    return 'a[rel="next"], .pagination a.next';
  }
}
