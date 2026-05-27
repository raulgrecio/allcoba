/**
 * Integration test — generic DrizzleScrapedEntityRepository<T> against a real
 * PG via testcontainers. Covers the 3 non-dating verticals: a Property goes
 * into scraped_real_estate, a Vehicle into scraped_motor, a Listing into
 * scraped_general. Validates: create / findByExternalRef / update round-trip
 * with the canonical entity surviving the JSONB roundtrip in `data`.
 */

import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { asProviderId } from '@allcoba/shared-types';

import type { ScrapedListing } from '#domain/canonical/scraped-listing.js';
import type { ScrapedProperty } from '#domain/canonical/scraped-property.js';
import type { ScrapedVehicle } from '#domain/canonical/scraped-vehicle.js';
import { asConfidence } from '#domain/canonical/confidence.js';
import { DrizzleScrapedEntityRepository } from '#infrastructure/adapters/persistence/postgres/drizzle-scraped-entity.repository.js';
import * as schema from '#infrastructure/adapters/persistence/postgres/schema/scraper.schema.js';

import type { TestDb } from '../../../../helpers/test-db.js';
import { setupTestDb, truncateAll } from '../../../../helpers/test-db.js';

const NOW = '2026-05-17T12:00:00.000Z';

let env: TestDb;

beforeAll(async () => {
  env = await setupTestDb();
}, 60_000);

afterAll(async () => {
  await env.cleanup();
}, 60_000);

beforeEach(async () => {
  await truncateAll(env.db);
});

const makeProperty = (sourceId: string): ScrapedProperty => ({
  id: asProviderId(randomUUID()),
  vertical: 'real-estate',
  listingType: 'sale',
  title: 'Piso luminoso en Malasaña',
  priceAmount: 350_000,
  currency: 'EUR',
  features: {},
  photos: [],
  externalRefs: [{ source: 'idealista', sourceId }],
  confidence: asConfidence(0.9),
  attributes: { surface: 75 },
  metadata: {},
  lastScrapedAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
});

const makeVehicle = (sourceId: string): ScrapedVehicle => ({
  id: asProviderId(randomUUID()),
  vertical: 'motor',
  title: 'BMW Serie 1 118d',
  priceAmount: 18_500,
  currency: 'EUR',
  make: 'BMW',
  model: '118d',
  year: 2020,
  photos: [],
  externalRefs: [{ source: 'coches-net', sourceId }],
  confidence: asConfidence(0.95),
  attributes: { kms: 45_000 },
  metadata: {},
  lastScrapedAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
});

const makeListing = (sourceId: string): ScrapedListing => ({
  id: asProviderId(randomUUID()),
  vertical: 'general',
  title: 'Cortacésped eléctrico',
  priceAmount: 120,
  currency: 'EUR',
  categoryPath: ['Hogar', 'Jardín', 'Cortacésped'],
  photos: [],
  externalRefs: [{ source: 'wallapop', sourceId }],
  confidence: asConfidence(0.8),
  attributes: {},
  metadata: {},
  lastScrapedAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
});

describe('DrizzleScrapedEntityRepository<ScrapedProperty>', () => {
  it('create + findByExternalRef + update roundtrip', async () => {
    const repo = new DrizzleScrapedEntityRepository<ScrapedProperty>(
      env.db,
      schema.realEstateProviders,
    );
    const property = makeProperty('idealista-001');

    await repo.create(property);

    const found = await repo.findByExternalRef({ source: 'idealista', sourceId: 'idealista-001' });
    expect(found).not.toBeNull();
    expect(found?.title).toBe('Piso luminoso en Malasaña');
    expect(found?.priceAmount).toBe(350_000);

    const updated: ScrapedProperty = { ...property, priceAmount: 320_000 };
    await repo.update({ source: 'idealista', sourceId: 'idealista-001' }, updated);

    const got = await repo.findByExternalRef({ source: 'idealista', sourceId: 'idealista-001' });
    expect(got?.priceAmount).toBe(320_000);
  });

  it('findByExternalRef returns null when unknown', async () => {
    const repo = new DrizzleScrapedEntityRepository<ScrapedProperty>(
      env.db,
      schema.realEstateProviders,
    );
    expect(await repo.findByExternalRef({ source: 'idealista', sourceId: 'missing' })).toBeNull();
  });
});

describe('DrizzleScrapedEntityRepository<ScrapedVehicle>', () => {
  it('persists into scraped_motor and reads back', async () => {
    const repo = new DrizzleScrapedEntityRepository<ScrapedVehicle>(env.db, schema.motorProviders);
    const vehicle = makeVehicle('coches-net-42');

    await repo.create(vehicle);
    const got = await repo.findByExternalRef({ source: 'coches-net', sourceId: 'coches-net-42' });

    expect(got?.make).toBe('BMW');
    expect(got?.model).toBe('118d');
    expect(got?.year).toBe(2020);
  });
});

describe('DrizzleScrapedEntityRepository<ScrapedListing>', () => {
  it('persists into scraped_general and reads back', async () => {
    const repo = new DrizzleScrapedEntityRepository<ScrapedListing>(
      env.db,
      schema.generalProviders,
    );
    const listing = makeListing('wallapop-99');

    await repo.create(listing);
    const got = await repo.findByExternalRef({ source: 'wallapop', sourceId: 'wallapop-99' });

    expect(got?.title).toBe('Cortacésped eléctrico');
    expect(got?.categoryPath).toEqual(['Hogar', 'Jardín', 'Cortacésped']);
  });
});

describe('vertical isolation', () => {
  it('property repo does not return vehicle rows', async () => {
    const propertyRepo = new DrizzleScrapedEntityRepository<ScrapedProperty>(
      env.db,
      schema.realEstateProviders,
    );
    const vehicleRepo = new DrizzleScrapedEntityRepository<ScrapedVehicle>(
      env.db,
      schema.motorProviders,
    );

    await vehicleRepo.create(makeVehicle('shared-ref'));

    expect(
      await propertyRepo.findByExternalRef({ source: 'coches-net', sourceId: 'shared-ref' }),
    ).toBeNull();
  });
});
