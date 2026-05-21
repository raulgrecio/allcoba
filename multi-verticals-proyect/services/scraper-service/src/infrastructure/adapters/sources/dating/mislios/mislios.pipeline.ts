import type { CrawlerOptions } from '#application/ports/crawler.port.js';

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
    // Profile: /anuncios/{slug}/
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    return parts.length === 2 && parts[0] === 'anuncios';
  }

  extract(html: string, sourceUrl: string): MisliosPayload {
    return extractMislios(html, sourceUrl);
  }

  map = mapMislios;

  override getCrawlerOptions(url: string, options?: Partial<CrawlerOptions>): CrawlerOptions {
    const isProfile = this.isProfileUrl(url);
    return {
      ...super.getCrawlerOptions(url, options),
      waitUntil: 'networkidle',
      onBeforeCapture: isProfile
        ? undefined
        : async (page) => {
            await page
              .waitForSelector('a[href*="/anuncios/"]', { timeout: 15000 })
              .catch(() => {});
          },
    };
  }

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }
}
