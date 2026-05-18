import type { SecurityStrategy } from '#application/ports/crawler.port.js';
import { CrawlerEngine, ProxyStrategy, SolverStrategy } from '#application/ports/crawler.port.js';

import type { EuroGirlsEscortPayload } from './eurogirlsescort.types.js';
import { DatingPipelineBase } from '../dating-pipeline.base.js';
import { extractEuroGirlsEscort } from './eurogirlsescort.extractor.js';
import { mapEuroGirlsEscort } from './eurogirlsescort.mapper.js';

const AGE_GATE_SELECTORS = ['#js-over18 .js-success'];

export class EuroGirlsEscortPipeline extends DatingPipelineBase<EuroGirlsEscortPayload> {
  readonly identifier = 'eurogirlsescort';

  canHandle(url: string): boolean {
    return url.includes('eurogirlsescort.es') || url.includes('eurogirlsescort.com');
  }

  isProfileUrl(url: string): boolean {
    return url.includes('/escort/') && !url.includes('?list=');
  }

  extract(html: string, _sourceUrl: string): EuroGirlsEscortPayload {
    return extractEuroGirlsEscort(html);
  }

  map = mapEuroGirlsEscort;

  protected override getAgeGateSelectors(): string[] {
    return AGE_GATE_SELECTORS;
  }

  protected override getSecurityStrategy(): SecurityStrategy {
    return {
      engine: CrawlerEngine.PATCHRIGHT,
      proxyStrategy: ProxyStrategy.PROXY,
      solverStrategy: SolverStrategy.SOLVER,
      sessionProfile: 'eurogirlsescort',
    };
  }

  override extractNextPageUrl(_html: string, baseUrl: string): string | undefined {
    const listUrl = new URL(baseUrl);
    const currentPage = parseInt(listUrl.searchParams.get('profile-paginator-page') ?? '1', 10);
    listUrl.searchParams.set('profile-paginator-page', String(currentPage + 1));
    return listUrl.toString();
  }
}
