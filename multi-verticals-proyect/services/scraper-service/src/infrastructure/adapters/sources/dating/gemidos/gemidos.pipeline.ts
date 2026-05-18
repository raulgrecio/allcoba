import type { GemidosPayload } from './gemidos.types.js';
import { DatingPipelineBase } from '../dating-pipeline.base.js';
import { extractGemidos } from './gemidos.extractor.js';
import { mapGemidos } from './gemidos.mapper.js';

const COOKIE_SELECTORS = [
  '#onetrust-accept-btn-handler',
  'button[class*="accept"]',
  '.cc-accept',
  '#cn-accept-cookie',
  '.cookie-notice-accept',
  '#cookie-notice-accept',
];

const AGE_GATE_SELECTORS = ['#age-gate-modal button', '.btn-age-gate', 'button:contains("18")'];

export class GemidosPipeline extends DatingPipelineBase<GemidosPayload> {
  readonly identifier = 'gemidos';

  canHandle(url: string): boolean {
    return url.includes('gemidos.tv');
  }

  isProfileUrl(url: string): boolean {
    return url.includes('/anuncio/');
  }

  extract(html: string, sourceUrl: string): GemidosPayload {
    return extractGemidos(html, sourceUrl);
  }

  map = mapGemidos;

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }

  protected override getAgeGateSelectors(): string[] {
    return AGE_GATE_SELECTORS;
  }
}
