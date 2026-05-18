import type { EscortAdvisorPayload } from './escort-advisor.types.js';
import { DatingPipelineBase } from '../dating-pipeline.base.js';
import { extractEscortAdvisor } from './escort-advisor.extractor.js';
import { mapEscortAdvisor } from './escort-advisor.mapper.js';

const COOKIE_SELECTORS = [
  '#onetrust-accept-btn-handler',
  '.cc-accept-btn',
  '[data-testid="accept-cookies"]',
  'button[class*="accept"]',
  '#confirm_button',
];

const AGE_GATE_SELECTORS = [
  '#age-gate-modal .btn-primary',
  'button:contains("Acceder")',
  'button:contains("ENTRAR")',
  '.age-gate button',
];

export class EscortAdvisorPipeline extends DatingPipelineBase<EscortAdvisorPayload> {
  readonly identifier = 'escort-advisor';

  canHandle(url: string): boolean {
    return url.includes('escort-advisor.xxx');
  }

  isProfileUrl(url: string): boolean {
    const path = new URL(url).pathname;
    return path.startsWith('/escorts/') && path.split('/').filter(Boolean).length >= 4;
  }

  extract(html: string, sourceUrl: string): EscortAdvisorPayload {
    return extractEscortAdvisor(html, sourceUrl);
  }

  map = mapEscortAdvisor;

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }

  protected override getAgeGateSelectors(): string[] {
    return AGE_GATE_SELECTORS;
  }

  protected override getNextPageSelector(): string {
    return 'a[rel="next"], a.next-page, [aria-label="Next"]';
  }
}
