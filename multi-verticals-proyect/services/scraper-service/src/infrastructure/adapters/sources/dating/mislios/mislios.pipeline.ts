import type { MisliosPayload } from './mislios.types.js';
import { DatingPipelineBase } from '../dating-pipeline.base.js';
import { extractMislios } from './mislios.extractor.js';
import { mapMislios } from './mislios.mapper.js';

const COOKIE_SELECTORS = ['.msl-cookie-accept', 'button[class*="accept"]', '#accept-all-cookies'];

export class MisliosPipeline extends DatingPipelineBase<MisliosPayload> {
  readonly identifier = 'mislios';

  canHandle(url: string): boolean {
    return url.includes('mislios.com');
  }

  isProfileUrl(url: string): boolean {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    return parts.length >= 2 && parts[0] === 'anuncios';
  }

  extract(html: string, sourceUrl: string): MisliosPayload {
    return extractMislios(html, sourceUrl);
  }

  map = mapMislios;

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }
}
