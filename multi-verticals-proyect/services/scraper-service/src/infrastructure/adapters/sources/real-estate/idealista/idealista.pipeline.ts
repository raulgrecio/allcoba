import { RealEstatePipelineBase } from '../real-estate-pipeline.base.js';
import { extractIdealista } from './idealista.extractor.js';
import { mapIdealista } from './idealista.mapper.js';
import type { IdealistaPayload } from './idealista.types.js';

const COOKIE_SELECTORS = ['#didomi-notice-agree-button'];

export class IdealistaPipeline extends RealEstatePipelineBase<IdealistaPayload> {
  readonly identifier = 'idealista';

  canHandle(url: string): boolean {
    return url.includes('idealista.com');
  }

  isProfileUrl(url: string): boolean {
    return /\/inmueble\/\d+/.test(url);
  }

  extract(html: string, sourceUrl: string): IdealistaPayload {
    return extractIdealista(html, sourceUrl);
  }

  map = mapIdealista;

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }
}
