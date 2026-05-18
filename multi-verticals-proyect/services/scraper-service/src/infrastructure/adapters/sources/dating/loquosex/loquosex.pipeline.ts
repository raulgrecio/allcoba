import type { LoquosexPayload } from './loquosex.types.js';
import { DatingPipelineBase } from '../dating-pipeline.base.js';
import { extractLoquosex } from './loquosex.extractor.js';
import { mapLoquosex } from './loquosex.mapper.js';

const COOKIE_SELECTORS = ['#cn-accept-cookie', '.cookie-notice-accept', '#cookie-notice-accept'];

export class LoquosexPipeline extends DatingPipelineBase<LoquosexPayload> {
  readonly identifier = 'loquosex';

  canHandle(url: string): boolean {
    return url.includes('loquosex.com');
  }

  isProfileUrl(url: string): boolean {
    return url.includes('.html') && !url.includes('/page/');
  }

  extract(html: string, sourceUrl: string): LoquosexPayload {
    return extractLoquosex(html, sourceUrl);
  }

  map = mapLoquosex;

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }

  protected override getNextPageSelector(): string {
    return 'a.nextpostslink';
  }
}
