import type { SecurityStrategy } from '#application/ports/crawler.port.js';
import { CrawlerEngine, ProxyStrategy, SolverStrategy } from '#application/ports/crawler.port.js';

import type { TopEscortBabesPayload } from './topescortbabes.types.js';
import { DatingPipelineBase } from '../dating-pipeline.base.js';
import { extractProfileDataFromHtml } from './topescortbabes.extractor.js';
import { mapTopEscortBabes } from './topescortbabes.mapper.js';

const COOKIE_SELECTORS = ['#onetrust-accept-btn-handler', '.cc-accept', 'button[class*="accept"]'];

export class TopEscortBabesPipeline extends DatingPipelineBase<TopEscortBabesPayload> {
  readonly identifier = 'topescortbabes';

  canHandle(url: string): boolean {
    return url.includes('topescortbabes.com');
  }

  isProfileUrl(url: string): boolean {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    const escortsIdx = parts.indexOf('escorts');
    if (escortsIdx === -1) return false;
    const slug = parts[escortsIdx + 1];
    // Profile slugs end with _{numericId} (e.g. "Scarlett-Rous_2817245").
    // Filter pages like "latina-ethnic", "black-hair" do not.
    return !!slug && /_\d+$/.test(slug);
  }

  extract(html: string, sourceUrl: string): TopEscortBabesPayload {
    const payload = extractProfileDataFromHtml(html);
    if (!payload) {
      throw new Error(`topescortbabes: no profile data extracted from ${sourceUrl}`);
    }
    return payload;
  }

  map = mapTopEscortBabes;

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }

  protected override getSecurityStrategy(): SecurityStrategy {
    return {
      engine: CrawlerEngine.PATCHRIGHT,
      proxyStrategy: ProxyStrategy.PROXY,
      solverStrategy: SolverStrategy.NONE,
      sessionProfile: 'topescortbabes',
    };
  }
}
