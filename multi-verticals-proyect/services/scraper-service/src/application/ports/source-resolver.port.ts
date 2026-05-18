import type { DatingPipelinePort } from './dating-pipeline.port.js';
import type { SourcePort } from './source.port.js';

/**
 * Union of legacy v1 adapters (`SourcePort`) and v2 dating wrappers
 * (`DatingPipelinePort`). `ScrapeUrlUseCase` / `DiscoverUrlsUseCase` dispatch
 * via `isDatingPipelinePort()` when they need to call extract/map directly.
 */
export type ResolvedSource = SourcePort | DatingPipelinePort;

export interface SourceResolverPort {
  /**
   * Encuentra y devuelve el adaptador adecuado para una URL.
   * Puede cargar el adaptador de forma perezosa si es necesario.
   */
  resolve(url: string): Promise<ResolvedSource>;
}
