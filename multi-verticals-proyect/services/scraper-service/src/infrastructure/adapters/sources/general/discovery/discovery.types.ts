/**
 * Discovery payload — datos genéricos extraídos por el catch-all.
 *
 * El adaptador discovery acepta cualquier URL como último recurso, así que
 * solo extrae lo que existe en (casi) toda página: título, descripción y
 * algunas imágenes destacadas.
 */

export interface DiscoveryPhoto {
  readonly url: string;
}

export interface DiscoveryPayload {
  /** Hash estable derivado de la URL. */
  readonly sourceId: string;
  readonly sourceUrl: string;
  readonly title: string;
  readonly description?: string;
  readonly photos: readonly DiscoveryPhoto[];
}
