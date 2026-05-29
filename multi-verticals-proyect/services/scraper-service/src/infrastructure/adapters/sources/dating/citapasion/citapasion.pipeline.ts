import type { CitapasionPayload } from './citapasion.types.js';
import { DatingPipelineBase } from '../dating-pipeline.base.js';
import { extractCitapasion } from './citapasion.extractor.js';
import { mapCitapasion } from './citapasion.mapper.js';

const COOKIE_SELECTORS = ['button#aceptar', 'button[class*="accept"]', '#accept-cookies'];

const AGE_GATE_SELECTORS = ['a#aceptar', 'a.acc-aceptar-18'];

export class CitapasionPipeline extends DatingPipelineBase<CitapasionPayload> {
  readonly identifier = 'citapasion';

  canHandle(url: string): boolean {
    return url.includes('citapasion.com');
  }

  isProfileUrl(url: string): boolean {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    return (
      parts.length === 2 &&
      parts[0] === 'escorts' &&
      !!parts[1] &&
      /^\d+$/.test(parts[1]) &&
      !url.includes('?')
    );
  }

  extract(html: string, sourceUrl: string): CitapasionPayload {
    return extractCitapasion(html, sourceUrl);
  }

  map = mapCitapasion;

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }

  protected override getAgeGateSelectors(): string[] {
    return AGE_GATE_SELECTORS;
  }
}
