import type { DatingPipelinePort } from './dating-pipeline.port.js';
import type { AnyPipelinePort } from './scraping-pipeline.port.js';

/**
 * Union de los wrappers v2 de dating (`DatingPipelinePort`) y los pipelines
 * v2 genéricos de real-estate / motor / general (`AnyPipelinePort`).
 * `ScrapeUrlUseCase` / `DiscoverUrlsUseCase` despachan vía
 * `isScrapingPipelinePort()` para llamar extract/map directamente.
 */
export type ResolvedSource = DatingPipelinePort | AnyPipelinePort;

export interface SourceResolverPort {
  /**
   * Encuentra y devuelve el adaptador adecuado para una URL.
   * Puede cargar el adaptador de forma perezosa si es necesario.
   */
  resolve(url: string): Promise<ResolvedSource>;
}
