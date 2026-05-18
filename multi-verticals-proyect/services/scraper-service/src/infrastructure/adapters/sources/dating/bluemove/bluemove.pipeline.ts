import type { BluemovePayload } from './bluemove.types.js';
import { DatingPipelineBase } from '../dating-pipeline.base.js';
import { extractBluemove } from './bluemove.extractor.js';
import { mapBluemove } from './bluemove.mapper.js';

const COOKIE_SELECTORS = [
  '#adult-banner-accept',
  'button[class*="accept"]',
  '.adult-banner button',
  '.cookie-consent-accept',
];

const AGE_GATE_SELECTORS = [
  '.adult-banner button',
  '#adult-banner-accept',
  'button:contains("Soy mayor de edad")',
];

export class BluemovePipeline extends DatingPipelineBase<BluemovePayload> {
  readonly identifier = 'bluemove';

  canHandle(url: string): boolean {
    return url.includes('bluemove.es');
  }

  isProfileUrl(url: string): boolean {
    return /#\d+$/.test(url);
  }

  extract(html: string, sourceUrl: string): BluemovePayload {
    return extractBluemove(html, sourceUrl);
  }

  map = mapBluemove;

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }

  protected override getAgeGateSelectors(): string[] {
    return AGE_GATE_SELECTORS;
  }
}
