import type { SourcePort } from './source.port.js';

export interface SourceResolverPort {
  /**
   * Encuentra y devuelve el adaptador adecuado para una URL.
   * Puede cargar el adaptador de forma perezosa si es necesario.
   */
  resolve(url: string): Promise<SourcePort>;
}
