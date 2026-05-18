import { RealEstatePipelineBase } from '../real-estate-pipeline.base.js';
import { extractFotocasa } from './fotocasa.extractor.js';
import { mapFotocasa } from './fotocasa.mapper.js';
import type { FotocasaPayload } from './fotocasa.types.js';

const COOKIE_SELECTORS = ['#didomi-notice-agree-button'];

export class FotocasaPipeline extends RealEstatePipelineBase<FotocasaPayload> {
  readonly identifier = 'fotocasa';

  canHandle(url: string): boolean {
    return url.includes('fotocasa.es');
  }

  isProfileUrl(url: string): boolean {
    return /\/\d{6,}(?:\/|#|\?|$)/.test(url);
  }

  extract(html: string, sourceUrl: string): FotocasaPayload {
    return extractFotocasa(html, sourceUrl);
  }

  map = mapFotocasa;

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }
}
