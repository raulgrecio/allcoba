import type { CrawlerOptions } from '#application/ports/crawler.port.js';

import type { BluemovePayload } from './bluemove.types.js';
import { DatingPipelineBase } from '../dating-pipeline.base.js';
import { extractBluemove } from './bluemove.extractor.js';
import { mapBluemove } from './bluemove.mapper.js';

const COOKIE_SELECTORS = [
  '#adult-banner-accept',
  'button[class*="accept"]',
  '.adult-banner button',
  '.cookie-consent-accept',
];

const AGE_GATE_SELECTORS = [
  '.adult-banner button',
  '#adult-banner-accept',
  'button:contains("Soy mayor de edad")',
];

export class BluemovePipeline extends DatingPipelineBase<BluemovePayload> {
  readonly identifier = 'bluemove';

  canHandle(url: string): boolean {
    return url.includes('bluemove.es');
  }

  isProfileUrl(url: string): boolean {
    return /#\d+$/.test(url);
  }

  extract(html: string, sourceUrl: string): BluemovePayload {
    return extractBluemove(html, sourceUrl);
  }

  map = mapBluemove;

  override getCrawlerOptions(url: string, options?: Partial<CrawlerOptions>): CrawlerOptions {
    const base = super.getCrawlerOptions(url, options);
    if (!this.isProfileUrl(url)) return base;
    // Perfil = modal JS abierto por el hash #{id}. Esperar a que cargue.
    return {
      ...base,
      waitUntil: 'networkidle',
      onBeforeCapture: async (page) => {
        // Esperar a que el modal cargue el perfil tras abrir el hash #{id}
        await page
          .waitForSelector('escort-modal .em-profile-name', { timeout: 15000 })
          .catch(() => {});
      },
    };
  }

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }

  protected override getAgeGateSelectors(): string[] {
    return AGE_GATE_SELECTORS;
  }
}
