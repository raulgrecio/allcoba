/**
 * TaxonomyResolverPort — looks up canonical catalog ids from source-provided
 * slugs or free-text labels.
 *
 * The mapper extracts strings like `"venezuelan"` or `"latin"` from the source
 * payload but Profile v2 stores branded ids (`NationalityId`, `EthnicId`, …)
 * that point to the catalog tables in PG. This port decouples the mapper from
 * the catalog: tests inject a fake that returns deterministic ids per slug.
 *
 * Implementations:
 *   - DrizzleTaxonomyResolver (prod) — selects from catalog tables.
 *   - InMemoryTaxonomyResolver / FakeTaxonomyResolver — tests.
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

export interface TaxonomyResolverPort {
  resolveCity(slug: string, countryIso2?: string): Promise<CityId | null>;
  resolveCountry(iso2: string): Promise<CountryId | null>;
  resolveNationality(slug: string): Promise<NationalityId | null>;
  resolveEthnic(slug: string): Promise<EthnicId | null>;
  resolveHair(slug: string): Promise<HairId | null>;
  resolveEye(slug: string): Promise<EyeId | null>;
  resolveOrientation(slug: string): Promise<OrientationId | null>;
}
