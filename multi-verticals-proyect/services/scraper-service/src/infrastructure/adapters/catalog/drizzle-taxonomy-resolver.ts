/**
 * DrizzleTaxonomyResolver — production implementation of TaxonomyResolverPort.
 *
 * Resolves source slugs to branded catalog ids via SQL lookups against the
 * `catalog.*` tables. Results are cached in-process (Map per kind) since
 * catalog data is seeded once and never mutated at runtime.
 *
 * City resolution: `(slug, countryIso2)` → joined lookup first; falls back
 * to slug-only when countryIso2 is absent. Country is identified by iso2.
 *
 * All other kinds (nationality, ethnic, hair, eye, orientation) resolve by
 * exact slug match. Returns null on miss — mapper falls back to undefined
 * branded id.
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { and, eq } from 'drizzle-orm';

import type {
  CityId,
  CountryId,
  EthnicId,
  EyeId,
  HairId,
  NationalityId,
  OrientationId,
} from '@allcoba/shared-types';
import {
  asCityId,
  asCountryId,
  asEthnicId,
  asEyeId,
  asHairId,
  asNationalityId,
  asOrientationId,
} from '@allcoba/shared-types';

import type { TaxonomyResolverPort } from '#application/ports/taxonomy-resolver.port.js';
import * as cat from '#infrastructure/adapters/persistence/schema/catalog.schema.js';

export class DrizzleTaxonomyResolver implements TaxonomyResolverPort {
  private readonly cityCache = new Map<string, CityId | null>();
  private readonly countryCache = new Map<string, CountryId | null>();
  private readonly nationalityCache = new Map<string, NationalityId | null>();
  private readonly ethnicCache = new Map<string, EthnicId | null>();
  private readonly hairCache = new Map<string, HairId | null>();
  private readonly eyeCache = new Map<string, EyeId | null>();
  private readonly orientationCache = new Map<string, OrientationId | null>();

  constructor(private readonly db: PostgresJsDatabase<Record<string, never>>) {}

  async resolveCity(slug: string, countryIso2?: string): Promise<CityId | null> {
    const key = countryIso2 ? `${countryIso2}:${slug}` : slug;
    if (this.cityCache.has(key)) return this.cityCache.get(key)!;

    let row: { id: string } | undefined;

    if (countryIso2) {
      const [r] = await this.db
        .select({ id: cat.cities.id })
        .from(cat.cities)
        .innerJoin(cat.countries, eq(cat.cities.countryId, cat.countries.id))
        .where(and(eq(cat.cities.slug, slug), eq(cat.countries.iso2, countryIso2.toUpperCase())))
        .limit(1);
      row = r;
    }

    if (!row) {
      const [r] = await this.db
        .select({ id: cat.cities.id })
        .from(cat.cities)
        .where(eq(cat.cities.slug, slug))
        .limit(1);
      row = r;
    }

    const result = row ? asCityId(row.id) : null;
    this.cityCache.set(key, result);
    return result;
  }

  async resolveCountry(iso2: string): Promise<CountryId | null> {
    const key = iso2.toUpperCase();
    if (this.countryCache.has(key)) return this.countryCache.get(key)!;

    const [row] = await this.db
      .select({ id: cat.countries.id })
      .from(cat.countries)
      .where(eq(cat.countries.iso2, key))
      .limit(1);

    const result = row ? asCountryId(row.id) : null;
    this.countryCache.set(key, result);
    return result;
  }

  async resolveNationality(slug: string): Promise<NationalityId | null> {
    if (this.nationalityCache.has(slug)) return this.nationalityCache.get(slug)!;

    const [row] = await this.db
      .select({ id: cat.nationalities.id })
      .from(cat.nationalities)
      .where(eq(cat.nationalities.slug, slug))
      .limit(1);

    const result = row ? asNationalityId(row.id) : null;
    this.nationalityCache.set(slug, result);
    return result;
  }

  async resolveEthnic(slug: string): Promise<EthnicId | null> {
    if (this.ethnicCache.has(slug)) return this.ethnicCache.get(slug)!;

    const [row] = await this.db
      .select({ id: cat.ethnics.id })
      .from(cat.ethnics)
      .where(eq(cat.ethnics.slug, slug))
      .limit(1);

    const result = row ? asEthnicId(row.id) : null;
    this.ethnicCache.set(slug, result);
    return result;
  }

  async resolveHair(slug: string): Promise<HairId | null> {
    if (this.hairCache.has(slug)) return this.hairCache.get(slug)!;

    const [row] = await this.db
      .select({ id: cat.hairs.id })
      .from(cat.hairs)
      .where(eq(cat.hairs.slug, slug))
      .limit(1);

    const result = row ? asHairId(row.id) : null;
    this.hairCache.set(slug, result);
    return result;
  }

  async resolveEye(slug: string): Promise<EyeId | null> {
    if (this.eyeCache.has(slug)) return this.eyeCache.get(slug)!;

    const [row] = await this.db
      .select({ id: cat.eyes.id })
      .from(cat.eyes)
      .where(eq(cat.eyes.slug, slug))
      .limit(1);

    const result = row ? asEyeId(row.id) : null;
    this.eyeCache.set(slug, result);
    return result;
  }

  async resolveOrientation(slug: string): Promise<OrientationId | null> {
    if (this.orientationCache.has(slug)) return this.orientationCache.get(slug)!;

    const [row] = await this.db
      .select({ id: cat.orientations.id })
      .from(cat.orientations)
      .where(eq(cat.orientations.slug, slug))
      .limit(1);

    const result = row ? asOrientationId(row.id) : null;
    this.orientationCache.set(slug, result);
    return result;
  }
}
