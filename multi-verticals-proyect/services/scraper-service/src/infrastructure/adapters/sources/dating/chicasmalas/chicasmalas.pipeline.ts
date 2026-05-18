import { DatingPipelineBase } from '../dating-pipeline.base.js';
import { extractChicasmalas } from './chicasmalas.extractor.js';
import { mapChicasmalas } from './chicasmalas.mapper.js';
import type { ChicasmalasPayload } from './chicasmalas.types.js';

const COOKIE_SELECTORS = [
  '.wp-consent-accept-all',
  'button.accept-all',
  '#cookie_action_close_header',
  'a.cli_action_button',
];

const AGE_GATE_SELECTORS = [
  '.adult-banner button',
  '#adult-banner-accept',
  'button:contains("Soy mayor de edad")',
];

export class ChicasmalasPipeline extends DatingPipelineBase<ChicasmalasPayload> {
  readonly identifier = 'chicasmalas';

  canHandle(url: string): boolean {
    return url.includes('chicasmalas.es');
  }

  isProfileUrl(url: string): boolean {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    return parts.length === 3 && parts[0] === 'escorts' && !url.includes('?');
  }

  extract(html: string, sourceUrl: string): ChicasmalasPayload {
    return extractChicasmalas(html, sourceUrl);
  }

  map = mapChicasmalas;

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }

  protected override getAgeGateSelectors(): string[] {
    return AGE_GATE_SELECTORS;
  }

  protected override getNextPageSelector(): string {
    return 'a[rel="next"], .next.page-numbers';
  }
}
