import type { NuevapasionPayload } from './nuevapasion.types.js';
import { DatingPipelineBase } from '../dating-pipeline.base.js';
import { extractNuevapasion } from './nuevapasion.extractor.js';
import { mapNuevapasion } from './nuevapasion.mapper.js';

const COOKIE_SELECTORS = ['#cookieButton', 'button.btn-accept-all', '[data-cc="accept-all"]'];

const AGE_GATE_SELECTORS = ['#edadPopup button.btn-primary'];

export class NuevapasionPipeline extends DatingPipelineBase<NuevapasionPayload> {
  readonly identifier = 'nuevapasion';

  canHandle(url: string): boolean {
    return url.includes('nuevapasion.com');
  }

  isProfileUrl(url: string): boolean {
    return url.includes('/anuncio/');
  }

  extract(html: string, sourceUrl: string): NuevapasionPayload {
    return extractNuevapasion(html, sourceUrl);
  }

  map = mapNuevapasion;

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }

  protected override getAgeGateSelectors(): string[] {
    return AGE_GATE_SELECTORS;
  }

  protected override getNextPageSelector(): string {
    return 'a[rel="next"], a.next-page';
  }
}
