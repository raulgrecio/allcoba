import type { Madrid69Payload } from './madrid69.types.js';
import { DatingPipelineBase } from '../dating-pipeline.base.js';
import { extractMadrid69 } from './madrid69.extractor.js';
import { mapMadrid69 } from './madrid69.mapper.js';

export class Madrid69Pipeline extends DatingPipelineBase<Madrid69Payload> {
  readonly identifier = 'madrid69';

  canHandle(url: string): boolean {
    return /madrid69\.com/.test(url);
  }

  isProfileUrl(url: string): boolean {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    return parts[0] === 'citas' && parts.length >= 3;
  }

  extract(html: string, sourceUrl: string): Madrid69Payload {
    return extractMadrid69(html, sourceUrl);
  }

  map = mapMadrid69;

  override extractNextPageUrl(_html: string, _baseUrl: string): string | undefined {
    // CSR Next.js: pagination via API — needs Playwright endpoint interception.
    return undefined;
  }
}
