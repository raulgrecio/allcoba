/**
 * GirlsMadrid mapper — thin wrapper around the shared GirlsBCN-like mapper.
 */

import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';
import type { ScrapedProvider } from '#domain/canonical/scraped-provider.js';

import { mapGirlsBcnLike, GIRLSMADRID_SOURCE, type MapperOptions } from '../girlsbcn/girlsbcn.mapper.js';
import type { GirlsBcnPayload } from '../girlsbcn/girlsbcn.types.js';

export { GIRLSMADRID_SOURCE } from '../girlsbcn/girlsbcn.mapper.js';

export const mapGirlsMadrid = (
  payload: GirlsBcnPayload,
  resolver: TaxonomyResolverPort,
  options?: MapperOptions,
): Promise<ScrapedProvider> => mapGirlsBcnLike(payload, GIRLSMADRID_SOURCE, resolver, options);
