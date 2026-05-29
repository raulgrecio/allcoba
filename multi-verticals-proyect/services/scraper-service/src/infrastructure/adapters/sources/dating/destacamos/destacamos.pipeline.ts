import type { DestacamosPayload } from './destacamos.types.js';
import { DatingPipelineBase } from '../dating-pipeline.base.js';
import { extractDestacamos } from './destacamos.extractor.js';
import { mapDestacamos } from './destacamos.mapper.js';

const AGE_GATE_SELECTORS = [
  'a[onclick*="esconderMsgVerificacion"]',
  'a[role="button"]:contains("Aceptar")',
];

export class DestacamosPipeline extends DatingPipelineBase<DestacamosPayload> {
  readonly identifier = 'destacamos';

  canHandle(url: string): boolean {
    return url.includes('destacamos.net') || url.includes('destacamos.com');
  }

  isProfileUrl(url: string): boolean {
    return url.includes('details.html');
  }

  extract(html: string, sourceUrl: string): DestacamosPayload {
    return extractDestacamos(html, sourceUrl);
  }

  map = mapDestacamos;

  protected override getAgeGateSelectors(): string[] {
    return AGE_GATE_SELECTORS;
  }

  protected override getNextPageSelector(): string {
    return 'div.paginator a[rel="next"]';
  }
}
