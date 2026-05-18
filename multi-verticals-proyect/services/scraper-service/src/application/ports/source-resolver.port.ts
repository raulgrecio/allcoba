import type { DatingPipelinePort } from './dating-pipeline.port.js';
import type { AnyPipelinePort } from './scraping-pipeline.port.js';
import type { SourcePort } from './source.port.js';

/**
 * Union of legacy v1 adapters (`SourcePort`), v2 dating wrappers
 * (`DatingPipelinePort`) and the generic v2 pipelines for real-estate /
 * motor / general (`AnyPipelinePort`). `ScrapeUrlUseCase` /
 * `DiscoverUrlsUseCase` dispatch via `isDatingPipelinePort()` and
 * `isScrapingPipelinePort()` to call extract/map directly.
 */
export type ResolvedSource = SourcePort | DatingPipelinePort | AnyPipelinePort;

export interface SourceResolverPort {
  /**
   * Encuentra y devuelve el adaptador adecuado para una URL.
   * Puede cargar el adaptador de forma perezosa si es necesario.
   */
  resolve(url: string): Promise<ResolvedSource>;
}
