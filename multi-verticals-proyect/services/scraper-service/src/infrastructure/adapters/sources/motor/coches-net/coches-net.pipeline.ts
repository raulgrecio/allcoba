import { MotorPipelineBase } from '../motor-pipeline.base.js';
import { extractCochesNet } from './coches-net.extractor.js';
import { mapCochesNet } from './coches-net.mapper.js';
import type { CochesNetPayload } from './coches-net.types.js';

const COOKIE_SELECTORS = ['#didomi-notice-agree-button', 'button[id*="cookie"]'];

export class CochesNetPipeline extends MotorPipelineBase<CochesNetPayload> {
  readonly identifier = 'coches-net';

  canHandle(url: string): boolean {
    return url.includes('coches.net');
  }

  isProfileUrl(url: string): boolean {
    return /-\d{6,}-[a-z0-9]+\.aspx$/i.test(url);
  }

  extract(html: string, sourceUrl: string): CochesNetPayload {
    return extractCochesNet(html, sourceUrl);
  }

  map = mapCochesNet;

  protected override getCookieSelectors(): string[] {
    return COOKIE_SELECTORS;
  }
}
