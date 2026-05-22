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
    // Profile: /escorts/{ciudad}/{slug}-{numericId}/ — last segment ends with -NNN
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    return parts.length === 3 && parts[0] === 'escorts' && /\-\d+$/.test(parts[2] ?? '');
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
            await page.waitForSelector('a[href*="/escorts/"]', { timeout: 15000 }).catch(() => {});
          },
    };
  }

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }
}
