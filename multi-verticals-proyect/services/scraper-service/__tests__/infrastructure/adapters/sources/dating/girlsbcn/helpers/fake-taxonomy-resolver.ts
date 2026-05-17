/**
 * FakeTaxonomyResolver for GirlsBCN / GirlsMadrid tests.
 * Deterministic: returns `<kind>:<slug>` branded ids.
 * Use `misses` to simulate catalog misses.
 */

import {
  asCityId,
  asCountryId,
  asEthnicId,
  asEyeId,
  asHairId,
  asNationalityId,
  asOrientationId,
  type CityId,
  type CountryId,
  type EthnicId,
  type EyeId,
  type HairId,
  type NationalityId,
  type OrientationId,
} from '@allcoba/shared-types';

import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';

export interface FakeResolverConfig {
  misses?: Partial<Record<TaxonomyKind, ReadonlySet<string>>>;
}

type TaxonomyKind =
  | 'city'
  | 'country'
  | 'nationality'
  | 'ethnic'
  | 'hair'
  | 'eye'
  | 'orientation';

export class FakeTaxonomyResolver implements TaxonomyResolverPort {
  constructor(private readonly config: FakeResolverConfig = {}) {}

  private hit(kind: TaxonomyKind, slug: string): boolean {
    return !this.config.misses?.[kind]?.has(slug);
  }

  async resolveCity(slug: string, countryIso2?: string): Promise<CityId | null> {
    if (!this.hit('city', slug)) return null;
    return asCityId(`city:${countryIso2 ?? 'XX'}:${slug}`);
  }

  async resolveCountry(iso2: string): Promise<CountryId | null> {
    if (!this.hit('country', iso2)) return null;
    return asCountryId(`country:${iso2.toUpperCase()}`);
  }

  async resolveNationality(slug: string): Promise<NationalityId | null> {
    if (!this.hit('nationality', slug)) return null;
    return asNationalityId(`nationality:${slug}`);
  }

  async resolveEthnic(slug: string): Promise<EthnicId | null> {
    if (!this.hit('ethnic', slug)) return null;
    return asEthnicId(`ethnic:${slug}`);
  }

  async resolveHair(slug: string): Promise<HairId | null> {
    if (!this.hit('hair', slug)) return null;
    return asHairId(`hair:${slug}`);
  }

  async resolveEye(slug: string): Promise<EyeId | null> {
    if (!this.hit('eye', slug)) return null;
    return asEyeId(`eye:${slug}`);
  }

  async resolveOrientation(slug: string): Promise<OrientationId | null> {
    if (!this.hit('orientation', slug)) return null;
    return asOrientationId(`orientation:${slug}`);
  }
}
