import { wpRestLinks } from '../../_shared/tech/index.js';
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
    // Profile: /anuncios/{slug}/
    return /^\/anuncios\/[^/]+\/?$/.test(new URL(url).pathname);
  }

  /**
   * chicasmalas es WordPress. El descubrimiento usa la REST API
   * (`/wp-json/wp/v2/ficha-escort`) en vez de scrapear el listado HTML:
   * el crawler devuelve el JSON dentro de un <pre>.
   */
  override extractProfileLinks(html: string): string[] {
    return wpRestLinks(html);
  }

  /** REST: sin anchor rel=next; la paginación se controla con el límite. */
  override extractNextPageUrl(): string | undefined {
    return undefined;
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
