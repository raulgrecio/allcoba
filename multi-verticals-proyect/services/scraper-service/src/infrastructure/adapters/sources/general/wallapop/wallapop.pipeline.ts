import type { WallapopPayload } from './wallapop.types.js';
import { GeneralPipelineBase } from '../general-pipeline.base.js';
import { extractWallapop } from './wallapop.extractor.js';
import { mapWallapop } from './wallapop.mapper.js';

const COOKIE_SELECTORS = ['.cmpboxbtnyes', '#onetrust-accept-btn-handler'];

export class WallapopPipeline extends GeneralPipelineBase<WallapopPayload> {
  readonly identifier = 'wallapop';

  canHandle(url: string): boolean {
    return url.includes('wallapop.com');
  }

  isProfileUrl(url: string): boolean {
    return /\/item\/[a-z0-9-]+/i.test(url);
  }

  extract(html: string, sourceUrl: string): WallapopPayload {
    return extractWallapop(html, sourceUrl);
  }

  map = mapWallapop;

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }
}
