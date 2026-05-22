import { beforeEach, describe, expect, it } from 'vitest';

import type { ExternalRef } from '#domain/canonical/external-ref.js';
import type { ScrapedListing } from '#domain/canonical/scraped-listing.js';
import type { ScrapedProperty } from '#domain/canonical/scraped-property.js';
import type { ScrapedVehicle } from '#domain/canonical/scraped-vehicle.js';
import { InMemoryScrapedEntityRepository } from '#infrastructure/adapters/persistence/in-memory-scraped-entity.repository.js';

const makeRef = (source: string, sourceId: string): ExternalRef => ({ source, sourceId });

const makeProperty = (sourceId: string): ScrapedProperty =>
  ({
    sourceUrl: `https://idealista.com/inmueble/${sourceId}`,
    listingType: 'sale',
    propertyType: 'flat',
    priceAmount: 250000,
    currency: 'EUR',
    externalRefs: [makeRef('idealista', sourceId)],
    confidence: 'medium' as const,
    attributes: {},
    metadata: {},
    lastScrapedAt: new Date().toISOString(),
    photos: [],
  }) as unknown as ScrapedProperty;

const makeVehicle = (sourceId: string): ScrapedVehicle =>
  ({
    make: 'Seat',
    model: 'Ibiza',
    year: 2018,
    kilometers: 50000,
    priceAmount: 12000,
    currency: 'EUR',
    externalRefs: [makeRef('coches-net', sourceId)],
    confidence: 'high' as const,
    attributes: {},
    metadata: {},
    lastScrapedAt: new Date().toISOString(),
    photos: [],
  }) as unknown as ScrapedVehicle;

const makeListing = (sourceId: string): ScrapedListing =>
  ({
    title: 'Item title',
    externalRefs: [makeRef('wallapop', sourceId)],
    confidence: 'high' as const,
    attributes: {},
    metadata: {},
    lastScrapedAt: new Date().toISOString(),
    photos: [],
  }) as unknown as ScrapedListing;

describe('InMemoryScrapedEntityRepository<ScrapedProperty>', () => {
  let repo: InMemoryScrapedEntityRepository<ScrapedProperty>;
  beforeEach(() => {
    repo = new InMemoryScrapedEntityRepository<ScrapedProperty>();
  });

  it('returns null for unknown ref', async () => {
    expect(await repo.findByExternalRef(makeRef('idealista', '999'))).toBeNull();
  });

  it('create + findByExternalRef', async () => {
    const p = makeProperty('123');
    await repo.create(p);
    const found = await repo.findByExternalRef(makeRef('idealista', '123'));
    expect(found).not.toBeNull();
    expect(found?.priceAmount).toBe(250000);
  });

  it('update overwrites stored record', async () => {
    const p = makeProperty('456');
    await repo.create(p);
    const updated = { ...p, priceAmount: 300000 };
    await repo.update(makeRef('idealista', '456'), updated as ScrapedProperty);
    const found = await repo.findByExternalRef(makeRef('idealista', '456'));
    expect(found?.priceAmount).toBe(300000);
  });

  it('create with no externalRefs is a no-op', async () => {
    const p = { ...makeProperty('789'), externalRefs: [] } as unknown as ScrapedProperty;
    await repo.create(p);
    expect(await repo.findByExternalRef(makeRef('idealista', '789'))).toBeNull();
  });
});

describe('InMemoryScrapedEntityRepository<ScrapedVehicle>', () => {
  let repo: InMemoryScrapedEntityRepository<ScrapedVehicle>;
  beforeEach(() => {
    repo = new InMemoryScrapedEntityRepository<ScrapedVehicle>();
  });

  it('returns null for unknown ref', async () => {
    expect(await repo.findByExternalRef(makeRef('coches-net', '999'))).toBeNull();
  });

  it('create + findByExternalRef', async () => {
    const v = makeVehicle('abc123');
    await repo.create(v);
    const found = await repo.findByExternalRef(makeRef('coches-net', 'abc123'));
    expect(found?.make).toBe('Seat');
  });

  it('update overwrites stored record', async () => {
    const v = makeVehicle('def456');
    await repo.create(v);
    const updated = { ...v, kilometers: 60000 };
    await repo.update(makeRef('coches-net', 'def456'), updated as ScrapedVehicle);
    const found = await repo.findByExternalRef(makeRef('coches-net', 'def456'));
    expect(found?.kilometers).toBe(60000);
  });
});

describe('InMemoryScrapedEntityRepository<ScrapedListing>', () => {
  let repo: InMemoryScrapedEntityRepository<ScrapedListing>;
  beforeEach(() => {
    repo = new InMemoryScrapedEntityRepository<ScrapedListing>();
  });

  it('returns null for unknown ref', async () => {
    expect(await repo.findByExternalRef(makeRef('wallapop', '999'))).toBeNull();
  });

  it('create + findByExternalRef', async () => {
    const l = makeListing('xyz789');
    await repo.create(l);
    const found = await repo.findByExternalRef(makeRef('wallapop', 'xyz789'));
    expect(found?.title).toBe('Item title');
  });

  it('update overwrites stored record', async () => {
    const l = makeListing('uvw012');
    await repo.create(l);
    const updated = { ...l, title: 'Updated title' };
    await repo.update(makeRef('wallapop', 'uvw012'), updated as ScrapedListing);
    const found = await repo.findByExternalRef(makeRef('wallapop', 'uvw012'));
    expect(found?.title).toBe('Updated title');
  });
});
