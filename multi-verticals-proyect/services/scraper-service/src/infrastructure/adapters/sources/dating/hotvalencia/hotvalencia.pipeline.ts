import type { HotvalenciaPayload } from './hotvalencia.types.js';
import { DatingPipelineBase } from '../dating-pipeline.base.js';
import { extractHotvalencia } from './hotvalencia.extractor.js';
import { mapHotvalencia } from './hotvalencia.mapper.js';

const COOKIE_SELECTORS = [
  '.wp-consent-accept-all',
  'button.accept-all',
  '#cookie_action_close_header',
  '.cli_action_button',
];

export class HotvalenciaPipeline extends DatingPipelineBase<HotvalenciaPayload> {
  readonly identifier = 'hotvalencia';

  canHandle(url: string): boolean {
    return url.includes('hotvalencia.com');
  }

  isProfileUrl(url: string): boolean {
    return (
      url.includes('/putas-valencia/') &&
      new URL(url).pathname.split('/').filter(Boolean).length >= 2
    );
  }

  extract(html: string, sourceUrl: string): HotvalenciaPayload {
    return extractHotvalencia(html, sourceUrl);
  }

  map = mapHotvalencia;

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }

  protected override getNextPageSelector(): string {
    return 'a[rel="next"], .next.page-numbers';
  }
}
