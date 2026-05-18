/**
 * NullTaxonomyResolver — placeholder taxonomy adapter.
 *
 * Always returns `null` so mappers fall back to undefined branded ids
 * (baseCity, nationality, hair…). This is the minimum viable resolver
 * that keeps the v2 dating pipeline working in production until a real
 * `DrizzleTaxonomyResolver` is wired against the catalog tables.
 *
 * Use in development / staging when the catalog isn't seeded yet. Replace
 * in production by an adapter that actually queries `catalog_*` tables.
 */

import type {
  CityId,
  CountryId,
  EthnicId,
  EyeId,
  HairId,
  NationalityId,
  OrientationId,
} from '@allcoba/shared-types';

import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';

export class NullTaxonomyResolver implements TaxonomyResolverPort {
  resolveCity(_slug: string, _countryIso2?: string): Promise<CityId | null> {
    return Promise.resolve(null);
  }
  resolveCountry(_iso2: string): Promise<CountryId | null> {
    return Promise.resolve(null);
  }
  resolveNationality(_slug: string): Promise<NationalityId | null> {
    return Promise.resolve(null);
  }
  resolveEthnic(_slug: string): Promise<EthnicId | null> {
    return Promise.resolve(null);
  }
  resolveHair(_slug: string): Promise<HairId | null> {
    return Promise.resolve(null);
  }
  resolveEye(_slug: string): Promise<EyeId | null> {
    return Promise.resolve(null);
  }
  resolveOrientation(_slug: string): Promise<OrientationId | null> {
    return Promise.resolve(null);
  }
}
