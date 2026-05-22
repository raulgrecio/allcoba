import type { MundosexanuncioPayload } from './mundosexanuncio.types.js';
import { DatingPipelineBase } from '../dating-pipeline.base.js';
import { extractMundosexanuncio } from './mundosexanuncio.extractor.js';
import { mapMundosexanuncio } from './mundosexanuncio.mapper.js';

const COOKIE_SELECTORS = ['button.accept-cookies', '#cookie-accept', '[data-cc="accept-all"]'];

const AGE_GATE_SELECTORS = ['button:contains("Acceder")', '.age-gate button'];

export class MundosexanuncioPipeline extends DatingPipelineBase<MundosexanuncioPayload> {
  readonly identifier = 'mundosexanuncio';

  canHandle(url: string): boolean {
    return url.includes('mundosexanuncio.com');
  }

  isProfileUrl(url: string): boolean {
    // Profile: /contactos-mujeres/{slug}-{id}
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    return parts.length === 2 && parts[0] === 'contactos-mujeres' && /-\d+$/.test(parts[1]!);
  }

  extract(html: string, sourceUrl: string): MundosexanuncioPayload {
    return extractMundosexanuncio(html, sourceUrl);
  }

  map = mapMundosexanuncio;

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }

  protected override getAgeGateSelectors(): string[] {
    return AGE_GATE_SELECTORS;
  }
}
