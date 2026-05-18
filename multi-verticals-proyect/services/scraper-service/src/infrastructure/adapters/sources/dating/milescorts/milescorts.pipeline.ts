import type { MilescortsPayload } from './milescorts.types.js';
import { DatingPipelineBase } from '../dating-pipeline.base.js';
import { extractMilescorts } from './milescorts.extractor.js';
import { mapMilescorts } from './milescorts.mapper.js';

const COOKIE_SELECTORS = ['#cn-accept-cookie', '.cookie-notice-accept', '#cookie-notice-accept'];

const AGE_GATE_SELECTORS = ['a.btn-success:contains("ENTRAR")', 'button:contains("ACEPTAR")'];

export class MilescortsPipeline extends DatingPipelineBase<MilescortsPayload> {
  readonly identifier = 'milescorts';

  canHandle(url: string): boolean {
    return url.includes('milescorts.es');
  }

  isProfileUrl(url: string): boolean {
    return url.endsWith('.htm') && url.includes('/escorts-y-putas/');
  }

  extract(html: string, sourceUrl: string): MilescortsPayload {
    return extractMilescorts(html, sourceUrl);
  }

  map = mapMilescorts;

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }

  protected override getAgeGateSelectors(): string[] {
    return AGE_GATE_SELECTORS;
  }

  protected override getNextPageSelector(): string {
    return 'a[rel="next"], .pagination li.next a';
  }
}
