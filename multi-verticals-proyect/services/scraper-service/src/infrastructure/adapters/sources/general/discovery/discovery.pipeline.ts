import type { DiscoveryPayload } from './discovery.types.js';
import { GeneralPipelineBase } from '../general-pipeline.base.js';
import { extractDiscovery } from './discovery.extractor.js';
import { mapDiscovery } from './discovery.mapper.js';

/**
 * DiscoveryPipeline — catch-all v2 para URLs que no matchean ningún portal
 * registrado en `source.registry.ts`. Produce un ScrapedListing genérico.
 */
export class DiscoveryPipeline extends GeneralPipelineBase<DiscoveryPayload> {
  readonly identifier = 'discovery';

  /** Acepta cualquier URL como último recurso. */
  canHandle(_url: string): boolean {
    return true;
  }

  /** Discovery trata cualquier URL como página individual. */
  isProfileUrl(_url: string): boolean {
    return true;
  }

  extract(html: string, sourceUrl: string): DiscoveryPayload {
    return extractDiscovery(html, sourceUrl);
  }

  map = mapDiscovery;

  /** Descubrimiento manual: no se comprueba robots.txt. */
  override isAllowed(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
