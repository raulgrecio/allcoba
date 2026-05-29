/**
 * valenciacitas.com — portal clon de madrid69.com (misma plataforma white-label,
 * mismo backend api-prod.valenciacitas.com y mismo HTML Next.js).
 *
 * Reutiliza el extractor y el mapper de madrid69; solo cambia el dominio y el
 * identificador de fuente.
 */

import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';

import type { MapperOptions } from '../madrid69/madrid69.mapper.js';
import type { Madrid69Payload } from '../madrid69/madrid69.types.js';
import { mapMadrid69 } from '../madrid69/madrid69.mapper.js';
import { Madrid69Pipeline } from '../madrid69/madrid69.pipeline.js';

export const VALENCIACITAS_SOURCE = 'valenciacitas';

export class ValenciacitasPipeline extends Madrid69Pipeline {
  override readonly identifier = VALENCIACITAS_SOURCE;

  override canHandle(url: string): boolean {
    return /valenciacitas\.com/.test(url);
  }

  override map = (
    payload: Madrid69Payload,
    resolver: TaxonomyResolverPort,
    options: MapperOptions = {},
  ): Promise<ScrapedProvider> =>
    mapMadrid69(payload, resolver, { ...options, source: VALENCIACITAS_SOURCE });
}
