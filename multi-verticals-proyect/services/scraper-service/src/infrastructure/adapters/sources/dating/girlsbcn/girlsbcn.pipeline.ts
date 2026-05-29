import type { GirlsBcnPayload } from './girlsbcn.types.js';
import { DatingPipelineBase } from '../dating-pipeline.base.js';
import { extractGirlsBcn } from './girlsbcn.extractor.js';
import { mapGirlsBcn } from './girlsbcn.mapper.js';

const COOKIE_SELECTORS = [
  '#onetrust-accept-btn-handler',
  '.cc-btn.save',
  'button.accept-all',
  '#accept-cookies',
  '.ok-cookies',
];

const AGE_GATE_SELECTORS = [
  '.aviso a:contains("legal")',
  '#modal-aviso button',
  'a:contains("ENTRAR")',
  'button:contains("Aceptar")',
];

export class GirlsBcnPipeline extends DatingPipelineBase<GirlsBcnPayload> {
  readonly identifier = 'girlsbcn';

  canHandle(url: string): boolean {
    return url.includes('girlsbcn.net') || url.includes('girlsbcn.com');
  }

  isProfileUrl(url: string): boolean {
    return /\/escort\/[^/]+\.html/.test(url);
  }

  extract(html: string, sourceUrl: string): GirlsBcnPayload {
    return extractGirlsBcn(html, sourceUrl);
  }

  map = mapGirlsBcn;

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }

  protected override getAgeGateSelectors(): string[] {
    return AGE_GATE_SELECTORS;
  }

  protected override getNextPageSelector(): string {
    return 'a[rel="next"], a.nextpostslink, .pagination a.next';
  }
}
